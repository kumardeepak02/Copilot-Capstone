import { DatabaseSync } from "node:sqlite";
import { AppError } from "../../core/src/security.js";
import type { AuditEvent, Job, Snapshot, Store } from "../../core/src/ports.js";

export type Boundary = "beforeCommit" | "afterCommit" | "audit";
export class SqliteStore implements Store {
  private readonly db: DatabaseSync;
  private readonly boundary: ((point: Boundary) => void) | undefined;
  constructor(path: string, boundary?: (point: Boundary) => void) {
    this.db = new DatabaseSync(path);
    this.boundary = boundary;
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outputs (jobId TEXT PRIMARY KEY REFERENCES jobs(id), pages INTEGER NOT NULL CHECK(pages > 0));
      CREATE TABLE IF NOT EXISTS outcomes (
        jobId TEXT REFERENCES jobs(id), stepId TEXT NOT NULL, inputVersion INTEGER NOT NULL,
        pages INTEGER NOT NULL CHECK(pages > 0), PRIMARY KEY(jobId, stepId, inputVersion)
      );
      CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (eventId TEXT PRIMARY KEY, data TEXT NOT NULL);
    `);
  }
  close(): void { this.db.close(); }
  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    let committed = false;
    try {
      const value = work();
      this.boundary?.("beforeCommit");
      this.db.exec("COMMIT");
      committed = true;
      this.boundary?.("afterCommit");
      return value;
    } finally {
      if (!committed) this.db.exec("ROLLBACK");
    }
  }
  get(id: string): Job | undefined {
    const row = this.db.prepare("SELECT data FROM jobs WHERE id = ?").get(id);
    return row ? JSON.parse(String(row.data)) as Job : undefined;
  }
  insert(job: Job): void {
    this.db.prepare("INSERT INTO jobs VALUES (?, ?, ?)").run(job.id, job.version, JSON.stringify(job));
  }
  save(job: Job, expectedVersion: number): void {
    const result = this.db.prepare("UPDATE jobs SET version = ?, data = ? WHERE id = ? AND version = ?")
      .run(job.version, JSON.stringify(job), job.id, expectedVersion);
    if (result.changes !== 1) throw new AppError("CONFLICT");
  }
  output(jobId: string): number | undefined {
    const row = this.db.prepare("SELECT pages FROM outputs WHERE jobId = ?").get(jobId);
    return row ? Number(row.pages) : undefined;
  }
  publish(jobId: string, pages: number): void {
    this.db.prepare("INSERT INTO outcomes VALUES (?, 'processPdf', 1, ?)").run(jobId, pages);
    this.db.prepare("INSERT INTO outputs VALUES (?, ?)").run(jobId, pages);
  }
  audit(event: AuditEvent): void {
    try {
      this.boundary?.("audit");
      this.db.prepare("INSERT INTO audit VALUES (?, ?)").run(event.eventId, JSON.stringify(event));
    } catch {
      throw new AppError("AUDIT_UNAVAILABLE", event.correlationId);
    }
  }
  events(): AuditEvent[] {
    return this.db.prepare("SELECT data FROM audit ORDER BY rowid").all()
      .map(row => JSON.parse(String(row.data)) as AuditEvent);
  }
  configure(key: string, value: string): void {
    this.db.prepare("INSERT INTO config VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
  }
  configuration(key: string): string | undefined {
    const row = this.db.prepare("SELECT value FROM config WHERE key = ?").get(key);
    return row ? String(row.value) : undefined;
  }
  snapshot(): Snapshot {
    return {
      schema: 1,
      jobs: this.db.prepare("SELECT data FROM jobs ORDER BY id").all().map(row => JSON.parse(String(row.data)) as Job),
      outputs: this.db.prepare("SELECT jobId, pages FROM outputs ORDER BY jobId").all()
        .map(row => ({ jobId: String(row.jobId), pages: Number(row.pages) })),
      outcomes: this.db.prepare("SELECT jobId, pages FROM outcomes ORDER BY jobId").all()
        .map(row => ({ jobId: String(row.jobId), stepId: "processPdf", inputVersion: 1, pages: Number(row.pages) })),
      config: this.db.prepare("SELECT key, value FROM config ORDER BY key").all()
        .map(row => ({ key: String(row.key), value: String(row.value) })),
      audit: this.events(),
    };
  }
  restore(snapshot: Snapshot): void {
    this.db.exec("DELETE FROM outcomes; DELETE FROM outputs; DELETE FROM jobs; DELETE FROM config;");
    for (const job of snapshot.jobs) this.insert(job);
    for (const output of snapshot.outputs) this.publish(output.jobId, output.pages);
    for (const entry of snapshot.config) this.configure(entry.key, entry.value);
  }
}
