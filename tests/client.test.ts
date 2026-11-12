import assert from "node:assert/strict";
import { test } from "node:test";
import { JobService } from "../packages/core/src/jobs.js";
import { resumeWithPrompt } from "../packages/vscode-extension/src/client.js";
import { fixture, principal, sentinel, submit } from "./helpers.js";

test("client cancels without an attempt, re-prompts after restart, and forwards one password only", async context => {
  const { service, dependencies, store } = fixture(context, { dependencies: { processor: {
    async process(_input, password) { return password === sentinel ? { kind: "processed", pages: 1 } : { kind: "passwordRequired" }; },
  } } });
  const job = await submit(service, "fixture-encrypted");
  await service.execute("resumeJob", { id: job.id });
  const displayed: string[] = [];
  await resumeWithPrompt(service, job.id, {
    async password() { return undefined; },
    show(code) { displayed.push(code); },
  });
  assert.equal(store.get(job.id)?.passwordAttempts, 0);
  const restarted = new JobService(dependencies);
  let prompts = 0;
  await resumeWithPrompt(restarted, job.id, {
    async password() { prompts++; return sentinel; },
    show(code) { displayed.push(code); },
  });
  assert.equal(prompts, 1);
  assert.deepEqual(displayed, ["PASSWORD_REQUIRED", "PROCESSED"]);
  assert.equal(JSON.stringify(store.snapshot()).includes(sentinel), false);
});

test("client authorization is checked before any credential prompt or status disclosure", async context => {
  const { service, dependencies } = fixture(context);
  const job = await submit(service);
  const unauthorized = new JobService({
    ...dependencies, identity: { async authenticate() { return principal("End User"); } },
  });
  let prompts = 0;
  let displays = 0;
  await assert.rejects(resumeWithPrompt(unauthorized, job.id, {
    async password() { prompts++; return sentinel; },
    show() { displays++; },
  }), { code: "FORBIDDEN" });
  assert.equal(prompts, 0);
  assert.equal(displays, 0);
});
