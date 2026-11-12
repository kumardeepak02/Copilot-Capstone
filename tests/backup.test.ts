import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { JobService } from "../packages/core/src/jobs.js";
import { decryptSnapshot } from "../packages/core/src/backup.js";
import { fixture, submit, testKey } from "./helpers.js";

function authenticatedArchive(value: unknown): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", testKey, iv);
  cipher.setAAD(Buffer.from("CAP1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([Buffer.from("CAP1"), iv, cipher.getAuthTag(), encrypted]);
}
test("encrypted archive round trip restores outcomes and policy while preserving active audit", async context => {
  const { service, store, directory } = fixture(context);
  const original = await submit(service);
  await service.execute("resumeJob", { id: original.id });
  await service.execute("manageRoles", { actorId: "test-reader", role: "Auditor" });
  const backup = await service.execute("createBackup");
  assert.ok(backup.archive);
  assert.ok(backup.artifactId);
  assert.deepEqual(readFileSync(join(directory, backup.artifactId)), backup.archive);
  assert.equal(readdirSync(directory).some(name => name.endsWith(".staged")), false);
  const changed = await submit(service);
  await service.execute("manageRoles", { actorId: "test-reader", role: "End User" });
  const activeIds = store.events().map(event => event.eventId);
  await service.execute("restoreBackup", { archive: backup.archive });
  assert.equal(store.get(changed.id), undefined);
  assert.equal(store.output(original.id), 2);
  assert.equal(store.configuration("role:test-reader"), "Auditor");
  assert.deepEqual(store.events().slice(0, activeIds.length).map(event => event.eventId), activeIds);
  assert.equal(store.events().filter(event => event.operation === "restoreBackup").length, 1);
  assert.deepEqual(store.snapshot().outcomes, decryptSnapshot(backup.archive, testKey).outcomes);
});

test("wrong key, malformed key, tampering, and invalid authenticated schema leave jobs unchanged", async context => {
  const { service, store, dependencies } = fixture(context);
  const job = await submit(service);
  const backup = await service.execute("createBackup");
  assert.ok(backup.archive);
  const tampered = Buffer.from(backup.archive);
  tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 1;
  const wrong = new JobService({ ...dependencies, keys: { async key() { return Buffer.alloc(32, 99); } } });
  await assert.rejects(wrong.execute("restoreBackup", { archive: backup.archive }), { code: "BACKUP_INVALID" });
  const missing = new JobService({ ...dependencies, keys: { async key() { return Buffer.alloc(0); } } });
  await assert.rejects(missing.execute("restoreBackup", { archive: backup.archive }), { code: "INTEGRATION_UNAVAILABLE" });
  await assert.rejects(service.execute("restoreBackup", { archive: tampered }), { code: "BACKUP_INVALID" });
  const invalidSchema = authenticatedArchive({ schema: 2, jobs: [] });
  await assert.rejects(service.execute("restoreBackup", { archive: invalidSchema }), { code: "BACKUP_INVALID" });
  assert.equal(store.get(job.id)?.state, "READY");
  assert.equal(store.snapshot().jobs.length, 1);
});

test("authenticated but inconsistent output/idempotency state is rejected before restore", async context => {
  const { service, store } = fixture(context);
  const job = await submit(service);
  await service.execute("resumeJob", { id: job.id });
  const snapshot = store.snapshot();
  const invalid = authenticatedArchive({
    ...snapshot,
    outcomes: [{ jobId: job.id, stepId: "processPdf", inputVersion: 1, pages: 99 }],
  });
  await assert.rejects(service.execute("restoreBackup", { archive: invalid }), { code: "BACKUP_INVALID" });
  assert.deepEqual(store.snapshot().jobs, snapshot.jobs);
  assert.deepEqual(store.snapshot().outputs, snapshot.outputs);
  assert.deepEqual(store.snapshot().outcomes, snapshot.outcomes);
});

test("backup preparation and completion audit failures never advertise success", async context => {
  let auditCount = 0;
  let failAt = Infinity;
  const { service, directory } = fixture(context, { boundary(point) {
    if (point === "audit" && ++auditCount === failAt) throw new Error("injected audit failure");
  } });
  failAt = auditCount + 1;
  await assert.rejects(service.execute("createBackup"), { code: "AUDIT_UNAVAILABLE" });
  assert.equal(readdirSync(directory).filter(name => name.endsWith(".backup")).length, 0);
  assert.equal(readdirSync(directory).filter(name => name.endsWith(".staged")).length, 1);
  failAt = auditCount + 2;
  await assert.rejects(service.execute("createBackup"), { code: "AUDIT_UNAVAILABLE" });
  assert.equal(readdirSync(directory).filter(name => name.endsWith(".backup")).length, 1);
});

test("restore audit failure rolls back imported state and configuration", async context => {
  let failAudit = false;
  const { service, store } = fixture(context, { boundary(point) {
    if (point === "audit" && failAudit) throw new Error("injected audit failure");
  } });
  const original = await submit(service);
  const backup = await service.execute("createBackup");
  const later = await submit(service);
  await service.execute("manageRoles", { actorId: "test-reader", role: "Auditor" });
  const audit = store.events();
  failAudit = true;
  await assert.rejects(service.execute("restoreBackup", { archive: backup.archive }), { code: "AUDIT_UNAVAILABLE" });
  assert.ok(store.get(original.id));
  assert.ok(store.get(later.id));
  assert.equal(store.configuration("role:test-reader"), "Auditor");
  assert.deepEqual(store.events(), audit);
});

test("restore rejects a live worker, then recovers expired work without reviving its lease", async context => {
  let now = 1000;
  let release: (() => void) | undefined;
  let started: (() => void) | undefined;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const { service, store } = fixture(context, { dependencies: {
    now: () => now,
    processor: { async process() {
      started?.();
      await new Promise<void>(resolve => { release = resolve; });
      return { kind: "processed", pages: 2 };
    } },
  } });
  const job = await submit(service);
  const pending = service.execute("resumeJob", { id: job.id });
  const rejected = assert.rejects(pending, { code: "CONFLICT" });
  await ready;
  const backup = await service.execute("createBackup");
  await assert.rejects(service.execute("restoreBackup", { archive: backup.archive }), { code: "CONFLICT" });
  now += 30001;
  await service.execute("restoreBackup", { archive: backup.archive });
  assert.equal(store.get(job.id)?.state, "READY");
  assert.equal(store.get(job.id)?.leaseToken, "");
  release?.();
  await rejected;
});
