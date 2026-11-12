import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { JobService } from "../packages/core/src/jobs.js";
import { SqliteStore } from "../packages/adapters/src/sqlite.js";
import { fixture, sentinel, submit } from "./helpers.js";

function crash(path: string, mode: string, point: string, value: string, clock = 1_000_000): void {
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("./crash-child.js", import.meta.url)), path, mode, point, value, String(clock),
  ], { encoding: "utf8", timeout: 15000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 73, result.stderr);
  assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
}
test("repeated process death cannot reset the durable four-attempt execution budget", async context => {
  let now = 1_000_000;
  const { service, path, store } = fixture(context, { dependencies: { now: () => now } });
  const job = await submit(service);
  for (let attempt = 1; attempt <= 4; attempt++) {
    crash(path, "complete", "beforeCommit", job.id, now);
    assert.equal(store.get(job.id)?.attempts, attempt);
    assert.equal(store.output(job.id), undefined);
    now += 30_001;
  }
  const exhausted = await service.execute("resumeJob", { id: job.id });
  assert.equal(exhausted.job?.code, "RETRIES_EXHAUSTED");
  assert.equal(exhausted.job?.attempts, 4);
  assert.equal(store.snapshot().outputs.length, 0);
});
test("password-required checkpoint persists across process death and a new database connection", async context => {
  const { service, dependencies, path } = fixture(context);
  const job = await submit(service, "fixture-encrypted");
  crash(path, "challenge", "afterCommit", job.id);
  const reopened = new SqliteStore(path);
  try {
    assert.equal(reopened.get(job.id)?.state, "AWAITING_PASSWORD");
    assert.ok(reopened.get(job.id)?.challengeId);
    const restarted = new JobService({ ...dependencies, store: reopened });
    const cancelled = await restarted.execute("resumeJob", { id: job.id });
    assert.equal(cancelled.job?.passwordAttempts, 0);
    assert.equal(cancelled.job?.state, "AWAITING_PASSWORD");
  } finally {
    reopened.close();
  }
});
for (const point of ["beforeCommit", "afterCommit"]) {
  test(`process death ${point} yields an atomic checkpoint and one recoverable output`, async context => {
    let now = 1000;
    const { service, path, store, dependencies } = fixture(context, { dependencies: { now: () => now } });
    const job = await submit(service);
    crash(path, "complete", point, job.id);
    const reopened = new SqliteStore(path);
    try {
      assert.equal(reopened.output(job.id), point === "afterCommit" ? 7 : undefined);
      assert.equal(reopened.snapshot().outcomes.length, point === "afterCommit" ? 1 : 0);
      assert.equal(reopened.events().filter(event => event.operation === "checkpointCommitted").length, point === "afterCommit" ? 1 : 0);
      now = 1_030_001;
      const restarted = new JobService({ ...dependencies, store: reopened });
      const result = await restarted.execute("resumeJob", { id: job.id });
      assert.equal(result.pages, point === "afterCommit" ? 7 : 2);
      assert.equal(store.snapshot().outputs.length, 1);
      assert.equal(store.snapshot().outcomes.length, 1);
      assert.equal(store.events().filter(event => event.operation === "checkpointCommitted").length, 1);
    } finally {
      reopened.close();
    }
  });

  test(`process death ${point} restores either all prior or all snapshot state`, async context => {
    const { service, path, directory, store } = fixture(context);
    const original = await submit(service);
    await service.execute("resumeJob", { id: original.id });
    const backup = await service.execute("createBackup");
    assert.ok(backup.archive);
    const archivePath = join(directory, "crash-input.backup");
    writeFileSync(archivePath, backup.archive);
    const later = await submit(service);
    const beforeAudit = store.events().map(event => event.eventId);
    crash(path, "restore", point, archivePath);
    const reopened = new SqliteStore(path);
    try {
      assert.ok(reopened.get(original.id));
      assert.equal(reopened.output(original.id), 2);
      assert.equal(reopened.get(later.id) === undefined, point === "afterCommit");
      assert.deepEqual(reopened.events().slice(0, beforeAudit.length).map(event => event.eventId), beforeAudit);
      assert.equal(reopened.events().filter(event => event.operation === "restoreBackup").length, point === "afterCommit" ? 1 : 0);
    } finally {
      reopened.close();
    }
  });
}
