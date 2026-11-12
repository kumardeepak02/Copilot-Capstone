import { randomUUID } from "node:crypto";
import { AppError, identifier, isOperation, permitted, validPrincipal } from "./security.js";
import { roles } from "./ports.js";
import type { ArchivePublisher, AuditEvent, BackupKeyProvider, IdentityProvider, Job, Operation, PdfProcessor, Principal, Store } from "./ports.js";
import { decryptSnapshot, encryptSnapshot } from "./backup.js";

export interface CommandResult {
  job?: Job;
  pages?: number;
  events?: AuditEvent[];
  archive?: Buffer;
  artifactId?: string;
  code?: string;
}
type Input = Record<string, unknown>;
export interface Dependencies {
  store: Store;
  identity: IdentityProvider;
  processor?: PdfProcessor;
  keys?: BackupKeyProvider;
  archives?: ArchivePublisher;
  now?: () => number;
}
export class JobService {
  private readonly dependencies: Dependencies;
  private readonly now: () => number;
  constructor(dependencies: Dependencies) {
    this.dependencies = dependencies;
    this.now = dependencies.now ?? Date.now;
    try {
      dependencies.store.transaction(() => dependencies.store.audit({
        eventId: randomUUID(), occurredAt: this.now(), actorId: "local-worker", actorType: "system",
        operation: "startupRecovery", targetRef: "-", outcome: "success",
        correlationId: randomUUID(), reason: "OK",
      }));
    } catch {
      throw new AppError("AUDIT_UNAVAILABLE");
    }
  }
  private event(actor: Principal | null, operation: AuditEvent["operation"], target: string, correlationId: string,
    outcome: AuditEvent["outcome"] = "success", reason = "OK"): void {
    const workerEvent = operation === "workerClaimed" || operation === "workerReclaimed" || operation === "checkpointCommitted";
    this.dependencies.store.audit({
      eventId: randomUUID(), occurredAt: this.now(), actorId: workerEvent ? "local-worker" : actor?.id ?? "anonymous",
      actorType: workerEvent ? "system" : actor ? "user" : "anonymous",
      operation, targetRef: target, outcome, correlationId, reason,
    });
  }
  private recorded<T>(work: () => T, correlationId: string): T {
    try {
      return this.dependencies.store.transaction(work);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("AUDIT_UNAVAILABLE", correlationId);
    }
  }
  async execute(operation: string, raw: unknown = {}): Promise<CommandResult> {
    const correlationId = randomUUID();
    const { store, identity } = this.dependencies;
    let actor: Principal | null = null;
    const safeOperation = isOperation(operation) ? operation : "unknown";
    let target = "-";
    try {
      try {
        actor = await identity.authenticate();
      } catch {
        throw new AppError("INTEGRATION_UNAVAILABLE", correlationId);
      }
      if (!validPrincipal(actor, this.now())) {
        actor = null;
        throw new AppError("UNAUTHENTICATED", correlationId);
      }
      const managedRole = store.configuration(`role:${actor.id}`);
      if (managedRole !== undefined) {
        const role = roles.find(candidate => candidate === managedRole);
        if (!role) throw new AppError("FORBIDDEN", correlationId);
        actor = { ...actor, role };
        if (!validPrincipal(actor, this.now())) throw new AppError("UNAUTHENTICATED", correlationId);
      }
      if (!isOperation(operation)) throw new AppError("FORBIDDEN", correlationId);
      const input = this.validate(operation, raw, correlationId);
      const id = typeof input.id === "string" ? input.id : undefined;
      const job = id ? store.get(id) : undefined;
      if (job) target = job.id;
      if (!permitted(actor, operation, job?.owner)) throw new AppError("FORBIDDEN", correlationId);
      if (id && !job) throw new AppError("NOT_FOUND", correlationId);
      return await this.perform(operation, input, actor, job, correlationId);
    } catch (error) {
      const safe = error instanceof AppError ? error : new AppError("STORAGE_UNAVAILABLE", correlationId);
      // An audit failure cannot be turned into a successful operation or a normal denial.
      if (safe.code !== "AUDIT_UNAVAILABLE") {
        try {
          store.transaction(() => this.event(actor, safeOperation, target, correlationId,
            safe.code === "FORBIDDEN" || safe.code === "UNAUTHENTICATED" ? "denied" : "failure", safe.code));
        } catch {
          throw new AppError("AUDIT_UNAVAILABLE", correlationId);
        }
      }
      throw new AppError(safe.code, correlationId);
    }
  }
  private validate(operation: Operation, raw: unknown, correlationId: string): Input {
    const fail = (): never => { throw new AppError("INVALID_INPUT", correlationId); };
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fail();
    const input = raw as Input;
    const allowed: Record<Operation, string[]> = {
      submitJob: ["inputRef"], readOwnJob: ["id"], readAnyJob: ["id"],
      resumeJob: ["id", "password", "challengeId"], cancelJob: ["id"],
      readAudit: [], manageRoles: ["actorId", "role"], createBackup: [],
      restoreBackup: ["archive"], readDiagnostics: ["id"],
    };
    if (Object.keys(input).some(key => !allowed[operation].includes(key))) return fail();
    if (["readOwnJob", "readAnyJob", "resumeJob", "cancelJob", "readDiagnostics"].includes(operation) &&
      !identifier(input.id)) return fail();
    if (operation === "submitJob" && input.inputRef !== "fixture-plain" && input.inputRef !== "fixture-encrypted") return fail();
    if (operation === "manageRoles" && (!identifier(input.actorId) || !roles.some(role => role === input.role))) return fail();
    if ("password" in input && (typeof input.password !== "string" || input.password.length < 1 || input.password.length > 1024)) return fail();
    if ("challengeId" in input && !identifier(input.challengeId)) return fail();
    if (operation === "restoreBackup" && (!Buffer.isBuffer(input.archive) || input.archive.length > 16 * 1024 * 1024)) return fail();
    return input;
  }
  private async perform(operation: Operation, input: Input, actor: Principal, job: Job | undefined,
    correlationId: string): Promise<CommandResult> {
    const { store } = this.dependencies;
    const target = job?.id ?? "-";
    switch (operation) {
      case "submitJob": {
        const created: Job = {
          id: randomUUID(), owner: actor.id, inputRef: String(input.inputRef), state: "READY",
          version: 0, attempts: 0, passwordAttempts: 0, nextRun: 0,
          leaseUntil: 0, leaseToken: "", challengeId: "", code: "READY",
        };
        store.transaction(() => { store.insert(created); this.event(actor, operation, created.id, correlationId); });
        return { job: created };
      }
      case "readOwnJob":
      case "readAnyJob":
        return this.recorded(() => {
          const pages = store.output(target);
          if (job!.state === "COMPLETED" && pages === undefined) throw new AppError("STORAGE_UNAVAILABLE", correlationId);
          this.event(actor, operation, target, correlationId);
          return { job: job!, ...(pages !== undefined ? { pages } : {}) };
        }, correlationId);
      case "readDiagnostics":
        this.recorded(() => this.event(actor, operation, target, correlationId), correlationId);
        return { code: job!.code };
      case "readAudit": {
        return this.recorded(() => {
          this.event(actor, operation, "-", correlationId);
          return { events: store.events() };
        }, correlationId);
      }
      case "cancelJob": {
        const updated = this.change(job!, { state: "CANCELLED", code: "CANCELLED", leaseToken: "", leaseUntil: 0 });
        store.transaction(() => {
          if (job!.state === "COMPLETED" || job!.state === "FAILED") throw new AppError("CONFLICT", correlationId);
          store.save(updated, job!.version);
          this.event(actor, operation, target, correlationId);
        });
        return { job: updated };
      }
      case "manageRoles":
        store.transaction(() => {
          store.configure(`role:${String(input.actorId)}`, String(input.role));
          this.event(actor, operation, String(input.actorId), correlationId);
        });
        return { code: "POLICY_UPDATED" };
      case "resumeJob":
        return this.run(job!, input, actor, correlationId);
      case "createBackup": {
        const keys = this.dependencies.keys;
        const archives = this.dependencies.archives;
        if (!keys || !archives) throw new AppError("INTEGRATION_UNAVAILABLE", correlationId);
        const key = await keys.key();
        const snapshot = store.transaction(() => store.snapshot());
        const archive = encryptSnapshot(snapshot, key);
        decryptSnapshot(archive, key);
        const artifactId = archives.publish(archive, () => {
          this.recorded(() => this.event(actor, "backupPrepared", "-", correlationId), correlationId);
        });
        this.recorded(() => this.event(actor, operation, "-", correlationId), correlationId);
        return { archive, artifactId };
      }
      case "restoreBackup": {
        const keys = this.dependencies.keys;
        if (!keys) throw new AppError("INTEGRATION_UNAVAILABLE", correlationId);
        const snapshot = decryptSnapshot(input.archive as Buffer, await keys.key());
        store.transaction(() => {
          if (store.snapshot().jobs.some(item => item.state === "RUNNING" && item.leaseUntil > this.now())) {
            throw new AppError("CONFLICT", correlationId);
          }
          snapshot.jobs = snapshot.jobs.map(item => item.state === "RUNNING"
            ? this.change(item, { state: "READY", leaseToken: "", leaseUntil: 0, code: "RECOVERED" }) : item);
          store.restore(snapshot);
          this.event(actor, operation, "-", correlationId);
        });
        return { code: "RESTORED" };
      }
    }
  }
  private change(job: Job, patch: Partial<Job>): Job {
    return { ...job, ...patch, version: job.version + 1 };
  }
  private async run(job: Job, input: Input, actor: Principal, correlationId: string): Promise<CommandResult> {
    const { store, processor } = this.dependencies;
    if (job.state === "COMPLETED") {
      return this.recorded(() => {
        const pages = store.output(job.id);
        if (pages === undefined) throw new AppError("STORAGE_UNAVAILABLE", correlationId);
        this.event(actor, "resumeJob", job.id, correlationId, "success", "STORED_OUTCOME");
        return { job, pages };
      }, correlationId);
    }
    if (!processor) throw new AppError("INTEGRATION_UNAVAILABLE", correlationId);
    if (job.state === "FAILED" || job.state === "CANCELLED" ||
      job.nextRun > this.now() || job.state === "RUNNING" && job.leaseUntil > this.now()) {
      throw new AppError("CONFLICT", correlationId);
    }
    if (job.state !== "AWAITING_PASSWORD" && job.attempts >= 4) {
      const exhausted = this.change(job, {
        state: "FAILED", code: "RETRIES_EXHAUSTED", leaseToken: "", leaseUntil: 0, nextRun: 0,
      });
      store.transaction(() => {
        store.save(exhausted, job.version);
        this.event(actor, "checkpointCommitted", job.id, correlationId, "success", exhausted.code);
      });
      return { job: exhausted };
    }
    const password = typeof input.password === "string" ? input.password : undefined;
    if (job.state === "AWAITING_PASSWORD" && password === undefined) {
      this.recorded(() => this.event(actor, "passwordPromptCancelled", job.id, correlationId), correlationId);
      return { job };
    }
    if (job.state === "AWAITING_PASSWORD" && input.challengeId !== job.challengeId ||
      job.state !== "AWAITING_PASSWORD" && password !== undefined) throw new AppError("CONFLICT", correlationId);
    const claimed = this.change(job, {
      state: "RUNNING", leaseToken: randomUUID(), leaseUntil: this.now() + 30_000, code: "RUNNING",
      attempts: job.attempts + (job.state === "AWAITING_PASSWORD" ? 0 : 1),
      nextRun: 0,
    });
    store.transaction(() => {
      store.save(claimed, job.version);
      this.event(actor, "resumeJob", job.id, correlationId);
      this.event(actor, job.state === "RUNNING" ? "workerReclaimed" : "workerClaimed", job.id, correlationId);
    });
    let result;
    try {
      result = await processor.process(job.inputRef, password);
    } catch {
      // Adapter exceptions are permanent, redacted failures, not automatically retryable errors.
      result = { kind: "failed" } as const;
    }
    return store.transaction(() => {
      const current = store.get(job.id);
      if (!current || current.version !== claimed.version || current.leaseToken !== claimed.leaseToken ||
        current.leaseUntil <= this.now()) throw new AppError("CONFLICT", correlationId);
      let updated = this.change(claimed, { leaseToken: "", leaseUntil: 0, nextRun: 0 });
      switch (result.kind) {
        case "processed":
          if (!Number.isSafeInteger(result.pages) || result.pages < 1 || result.pages > 10000) {
            throw new AppError("INVALID_INPUT", correlationId);
          }
          updated = { ...updated, state: "COMPLETED", challengeId: "", code: "PROCESSED" };
          store.publish(job.id, result.pages);
          break;
        case "passwordRequired":
          updated = { ...updated, state: "AWAITING_PASSWORD", challengeId: randomUUID(), code: "PASSWORD_REQUIRED" };
          break;
        case "invalidPassword": {
          const invalid = claimed.passwordAttempts + (password === undefined ? 0 : 1);
          updated = {
            ...updated, passwordAttempts: invalid, challengeId: randomUUID(),
            state: invalid >= 3 ? "FAILED" : "AWAITING_PASSWORD",
            code: invalid >= 3 ? "PDF_PASSWORD_ATTEMPTS_EXHAUSTED" : "INVALID_PASSWORD",
          };
          break;
        }
        case "transient": {
          const attempts = claimed.attempts;
          updated = { ...updated, attempts, state: attempts >= 4 ? "FAILED" : "READY",
            code: attempts >= 4 ? "RETRIES_EXHAUSTED" : "RETRY_SCHEDULED",
            nextRun: attempts >= 4 ? 0 : this.now() + 1000 * 2 ** (attempts - 1) };
          break;
        }
        case "failed":
          updated = { ...updated, state: "FAILED", code: "PDF_PROCESSING_FAILED" };
          break;
        default:
          updated = { ...updated, state: "FAILED", code: "PDF_PROCESSING_FAILED" };
      }
      store.save(updated, claimed.version);
      this.event(actor, "checkpointCommitted", job.id, correlationId, "success", updated.code);
      return { job: updated, ...(result.kind === "processed" ? { pages: result.pages } : {}) };
    });
  }
}
