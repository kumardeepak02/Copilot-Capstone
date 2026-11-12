import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JobService } from "../packages/core/src/jobs.js";
import { decryptSnapshot } from "../packages/core/src/backup.js";
import { fixture, sentinel, submit, testKey } from "./helpers.js";

test("output, idempotency, checkpoint, and success audit roll back together on failure", async context => {
  let failAudit = false;
  const { service, store } = fixture(context, {
    boundary(point) { if (point === "audit" && failAudit) throw new Error("synthetic audit failure"); },
    dependencies: { processor: { async process() { failAudit = true; return { kind: "processed", pages: 2 }; } } },
  });
  const job = await submit(service);
  await assert.rejects(service.execute("resumeJob", { id: job.id }), { code: "AUDIT_UNAVAILABLE" });
  assert.equal(store.get(job.id)?.state, "RUNNING");
  assert.equal(store.output(job.id), undefined);
  assert.equal(store.snapshot().outcomes.length, 0);
  assert.equal(store.events().filter(event => event.operation === "checkpointCommitted").length, 0);
});

test("committed retries return the unique stored outcome without invoking the processor again", async context => {
  let calls = 0;
  const { service, store } = fixture(context, { dependencies: { processor: {
    async process() { calls++; return { kind: "processed", pages: 3 }; },
  } } });
  const job = await submit(service);
  assert.equal((await service.execute("resumeJob", { id: job.id })).pages, 3);
  assert.equal((await service.execute("resumeJob", { id: job.id })).pages, 3);
  assert.equal(calls, 1);
  assert.equal(store.snapshot().outputs.length, 1);
  assert.equal(store.snapshot().outcomes.length, 1);
  assert.equal(store.events().filter(event => event.operation === "checkpointCommitted").length, 1);
});

test("transient failures have exactly three persisted delayed retries, including service restart", async context => {
  let now = 1000;
  let calls = 0;
  const { service, dependencies, store } = fixture(context, { dependencies: {
    now: () => now,
    processor: { async process() { calls++; return { kind: "transient" }; } },
  } });
  const job = await submit(service);
  let running = service;
  for (const delay of [1000, 2000, 4000, 0]) {
    const result = await running.execute("resumeJob", { id: job.id });
    assert.ok(result.job);
    assert.equal(result.job.nextRun, delay === 0 ? 0 : now + delay);
    if (delay) {
      await assert.rejects(running.execute("resumeJob", { id: job.id }), { code: "CONFLICT" });
      now += delay;
      running = new JobService(dependencies);
    }
  }
  assert.equal(calls, 4);
  assert.equal(store.get(job.id)?.state, "FAILED");
  assert.equal(store.get(job.id)?.code, "RETRIES_EXHAUSTED");
  await assert.rejects(running.execute("resumeJob", { id: job.id }), { code: "CONFLICT" });
});

test("an expired lease can be reclaimed and the stale worker cannot commit", async context => {
  let now = 1000;
  let complete: ((value: { kind: "processed"; pages: number }) => void) | undefined;
  let started: (() => void) | undefined;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const { service, dependencies, store } = fixture(context, { dependencies: {
    now: () => now,
    processor: { process() {
      started?.();
      return new Promise(resolve => { complete = resolve; });
    } },
  } });
  const job = await submit(service);
  const stale = service.execute("resumeJob", { id: job.id });
  const rejected = assert.rejects(stale, { code: "CONFLICT" });
  await ready;
  const replacement = new JobService({ ...dependencies, processor: {
    async process() { return { kind: "processed", pages: 5 }; },
  } });
  await assert.rejects(replacement.execute("resumeJob", { id: job.id }), { code: "CONFLICT" });
  now += 30001;
  assert.equal((await replacement.execute("resumeJob", { id: job.id })).pages, 5);
  complete?.({ kind: "processed", pages: 9 });
  await rejected;
  assert.equal(store.output(job.id), 5);
});

test("password challenge survives restart; cancellation consumes zero and three invalid entries terminate", async context => {
  const { service, store, path, dependencies } = fixture(context, { dependencies: {
    processor: { async process(_input, password) {
      return password === undefined ? { kind: "passwordRequired" } : { kind: "invalidPassword" };
    } },
  } });
  const job = await submit(service, "fixture-encrypted");
  await service.execute("resumeJob", { id: job.id });
  const restarted = new JobService(dependencies);
  await restarted.execute("resumeJob", { id: job.id });
  assert.equal(store.get(job.id)?.passwordAttempts, 0);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await restarted.execute("resumeJob", {
      id: job.id, password: sentinel, challengeId: store.get(job.id)?.challengeId,
    });
    assert.equal(result.job?.passwordAttempts, attempt);
  }
  assert.equal(store.get(job.id)?.code, "PDF_PASSWORD_ATTEMPTS_EXHAUSTED");
  await assert.rejects(restarted.execute("resumeJob", {
    id: job.id, password: sentinel, challengeId: store.get(job.id)?.challengeId,
  }), { code: "CONFLICT" });
  const backup = await restarted.execute("createBackup");
  assert.ok(backup.archive);
  assert.equal(JSON.stringify(decryptSnapshot(backup.archive, testKey)).includes(sentinel), false);
  assert.equal(backup.archive.includes(Buffer.from(sentinel)), false);
  assert.equal(readFileSync(path).includes(Buffer.from(sentinel)), false);
  assert.equal(readFileSync(`${path}-wal`).includes(Buffer.from(sentinel)), false);
  assert.equal(JSON.stringify(store.snapshot()).includes(sentinel), false);
});

test("a password is used for one attempt only; adapter exceptions never escape or auto-retry", async context => {
  let seenPassword: string | undefined;
  const { service, store } = fixture(context, { dependencies: {
    processor: { async process(_input, password) {
      seenPassword = password;
      if (password === undefined) return { kind: "passwordRequired" };
      throw new Error(sentinel);
    } },
  } });
  const job = await submit(service, "fixture-encrypted");
  await service.execute("resumeJob", { id: job.id });
  const result = await service.execute("resumeJob", {
    id: job.id, password: sentinel, challengeId: store.get(job.id)?.challengeId,
  });
  assert.equal(seenPassword, sentinel);
  assert.equal(result.job?.state, "FAILED");
  assert.equal(result.job?.attempts, 1);
  assert.equal(JSON.stringify(result).includes(sentinel), false);
  assert.equal(JSON.stringify(store.events()).includes(sentinel), false);
});

test("unconfigured PDF and key integrations fail closed", async context => {
  const { store, dependencies } = fixture(context);
  const { processor: _processor, keys: _keys, archives: _archives, ...withoutIntegrations } = dependencies;
  const service = new JobService(withoutIntegrations);
  const job = await submit(service);
  await assert.rejects(service.execute("resumeJob", { id: job.id }), { code: "INTEGRATION_UNAVAILABLE" });
  await assert.rejects(service.execute("createBackup"), { code: "INTEGRATION_UNAVAILABLE" });
  assert.equal(store.get(job.id)?.state, "READY");
});
