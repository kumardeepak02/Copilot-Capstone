import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError, permitted, publicError, validPrincipal } from "../packages/core/src/security.js";
import { operations, roles } from "../packages/core/src/ports.js";
import { JobService } from "../packages/core/src/jobs.js";
import type { Role } from "../packages/core/src/ports.js";
import { fixture, principal, sentinel, submit } from "./helpers.js";

test("complete operation matrix permits only the proposed role and owner combinations", () => {
  const allowed: Record<Role, readonly string[]> = {
    Administrator: operations,
    Operator: ["submitJob", "readOwnJob", "readAnyJob", "resumeJob", "cancelJob", "readDiagnostics"],
    "End User": ["submitJob", "readOwnJob", "cancelJob"],
    Auditor: ["readAudit"],
  };
  for (const role of roles) {
    for (const operation of operations) {
      assert.equal(permitted(principal(role, "owner"), operation, "owner"), allowed[role].includes(operation), `${role}/${operation}`);
      const ownOnly = operation === "readOwnJob" && role !== "Administrator" ||
        operation === "cancelJob" && role === "End User";
      assert.equal(permitted(principal(role, "other"), operation, "owner"),
        allowed[role].includes(operation) && !ownOnly, `${role}/${operation}/other-owner`);
    }
    assert.equal(permitted(principal(role), "arbitrary-operation"), false);
  }
  const unknown: unknown = JSON.parse('{"id":"owner","role":"unknown","expiresAt":99999999999999,"mfa":true}');
  assert.equal(permitted(unknown, "submitJob"), false);
  assert.equal(validPrincipal(unknown, 0), false);
});

test("missing, expired, non-MFA privileged, and unverifiable identities fail closed and are audited", async context => {
  const { store, dependencies } = fixture(context);
  for (const identity of [
    { async authenticate() { return null; } },
    { async authenticate() { return { ...principal(), expiresAt: 0 }; } },
    { async authenticate() { return { ...principal(), mfa: false }; } },
    { async authenticate(): Promise<null> { throw new Error(sentinel); } },
  ]) {
    const service = new JobService({ ...dependencies, identity });
    await assert.rejects(service.execute("submitJob", { inputRef: "fixture-plain" }), AppError);
  }
  assert.equal(store.snapshot().jobs.length, 0);
  assert.equal(store.events().filter(event => event.operation === "submitJob").length, 4);
  assert.equal(JSON.stringify(store.events()).includes(sentinel), false);
  assert.equal(JSON.stringify(publicError(new Error(sentinel))).includes(sentinel), false);
});

test("malformed, excessive, unknown, client-role, and SQL payloads are rejected without storing submitted data", async context => {
  const { service, store } = fixture(context);
  for (const input of [
    null, [], { inputRef: "x".repeat(100000) }, { inputRef: "'; DROP TABLE jobs; --" },
    { inputRef: "fixture-plain", role: "Administrator" }, { inputRef: sentinel },
  ]) {
    await assert.rejects(service.execute("submitJob", input), { code: "INVALID_INPUT" });
  }
  await assert.rejects(service.execute(sentinel), { code: "FORBIDDEN" });
  await assert.rejects(service.execute("readAnyJob", { id: sentinel }), { code: "NOT_FOUND" });
  assert.equal(store.snapshot().jobs.length, 0);
  assert.equal(JSON.stringify(store.snapshot()).includes(sentinel), false);
});

test("ownership is enforced at the service boundary and local role changes are atomic", async context => {
  const { service, dependencies, store } = fixture(context);
  const job = await submit(service);
  const endUser = new JobService({ ...dependencies, identity: { async authenticate() { return principal("End User", "other"); } } });
  await assert.rejects(endUser.execute("readOwnJob", { id: job.id }), { code: "FORBIDDEN" });
  await assert.rejects(endUser.execute("cancelJob", { id: job.id }), { code: "FORBIDDEN" });
  await assert.rejects(endUser.execute("manageRoles", { actorId: "other", role: "Administrator" }), { code: "FORBIDDEN" });
  await service.execute("manageRoles", { actorId: "other", role: "Auditor" });
  assert.ok((await endUser.execute("readAudit")).events);
  await assert.rejects(endUser.execute("submitJob", { inputRef: "fixture-plain" }), { code: "FORBIDDEN" });
  assert.equal(store.get(job.id)?.state, "READY");
});

test("required audit failure rolls back mutations and prevents read or denial responses", async context => {
  let failAudit = false;
  const { service, store } = fixture(context, { boundary(point) {
    if (point === "audit" && failAudit) throw new Error(sentinel);
  } });
  const job = await submit(service);
  failAudit = true;
  await assert.rejects(service.execute("cancelJob", { id: job.id }), { code: "AUDIT_UNAVAILABLE" });
  await assert.rejects(service.execute("submitJob", { inputRef: "fixture-plain" }), { code: "AUDIT_UNAVAILABLE" });
  await assert.rejects(service.execute("manageRoles", { actorId: "other", role: "Administrator" }), { code: "AUDIT_UNAVAILABLE" });
  await assert.rejects(service.execute("readAnyJob", { id: job.id }), { code: "AUDIT_UNAVAILABLE" });
  await assert.rejects(service.execute("unknown"), { code: "AUDIT_UNAVAILABLE" });
  assert.equal(store.get(job.id)?.state, "READY");
  assert.equal(store.snapshot().jobs.length, 1);
  assert.equal(store.configuration("role:other"), undefined);
});

test("audit transaction commit failure is safe even when the event append itself succeeded", async context => {
  let failCommit = false;
  let failOnce = false;
  const { service, dependencies, store } = fixture(context, { boundary(point) {
    if (point === "beforeCommit" && (failCommit || failOnce)) {
      failOnce = false;
      throw new Error(sentinel);
    }
  } });
  const job = await submit(service);
  const auditBefore = store.events();
  failOnce = true;
  await assert.rejects(service.execute("readAnyJob", { id: job.id }), { code: "AUDIT_UNAVAILABLE" });
  failCommit = true;
  await assert.rejects(service.execute("readAnyJob", { id: job.id }), { code: "AUDIT_UNAVAILABLE" });
  await assert.rejects(service.execute("cancelJob", { id: job.id }), { code: "AUDIT_UNAVAILABLE" });
  assert.throws(() => new JobService(dependencies), { code: "AUDIT_UNAVAILABLE" });
  assert.equal(store.get(job.id)?.state, "READY");
  assert.deepEqual(store.events(), auditBefore);
});
