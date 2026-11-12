import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError, identifier, isErrorCode } from "./security.js";
import { jobCodes, operations, roles } from "./ports.js";
import type { AuditEvent, Job, Snapshot } from "./ports.js";

const header = Buffer.from("CAP1");
const maxBytes = 16 * 1024 * 1024;
function keyBuffer(key: Uint8Array): Buffer {
  if (key.length !== 32) throw new AppError("INTEGRATION_UNAVAILABLE");
  return Buffer.from(key);
}
export function encryptSnapshot(snapshot: Snapshot, key: Uint8Array): Buffer {
  validateSnapshot(snapshot);
  const plaintext = Buffer.from(JSON.stringify(snapshot));
  if (plaintext.length > maxBytes - 32) throw new AppError("BACKUP_INVALID");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer(key), iv);
  cipher.setAAD(header);
  try {
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([header, iv, cipher.getAuthTag(), ciphertext]);
  } finally {
    plaintext.fill(0);
  }
}
export function decryptSnapshot(archive: Buffer, key: Uint8Array): Snapshot {
  const material = keyBuffer(key);
  let plaintext: Buffer | undefined;
  try {
    if (archive.length < 32 || archive.length > maxBytes || !archive.subarray(0, 4).equals(header)) {
      throw new AppError("BACKUP_INVALID");
    }
    const decipher = createDecipheriv("aes-256-gcm", material, archive.subarray(4, 16));
    decipher.setAAD(header);
    decipher.setAuthTag(archive.subarray(16, 32));
    plaintext = Buffer.concat([decipher.update(archive.subarray(32)), decipher.final()]);
    const parsed: unknown = JSON.parse(plaintext.toString("utf8"));
    validateSnapshot(parsed);
    return parsed;
  } catch {
    throw new AppError("BACKUP_INVALID");
  } finally {
    plaintext?.fill(0);
    material.fill(0);
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function integer(value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}
function jobValid(value: unknown): value is Job {
  if (!record(value) || !exact(value, [
    "id", "owner", "inputRef", "state", "version", "attempts", "passwordAttempts",
    "nextRun", "leaseUntil", "leaseToken", "challengeId", "code",
  ])) return false;
  return identifier(value.id) && identifier(value.owner) &&
    (value.inputRef === "fixture-plain" || value.inputRef === "fixture-encrypted") &&
    ["READY", "RUNNING", "AWAITING_PASSWORD", "COMPLETED", "FAILED", "CANCELLED"].includes(String(value.state)) &&
    integer(value.version) && integer(value.attempts, 4) && integer(value.passwordAttempts, 3) &&
    integer(value.nextRun) && integer(value.leaseUntil) &&
    (value.leaseToken === "" || identifier(value.leaseToken)) &&
    (value.challengeId === "" || identifier(value.challengeId)) &&
    jobCodes.some(code => code === value.code) &&
    (value.state !== "RUNNING" || value.leaseToken !== "" && value.leaseUntil > 0) &&
    (value.state === "RUNNING" || value.leaseToken === "" && value.leaseUntil === 0) &&
    (value.state !== "AWAITING_PASSWORD" || value.challengeId !== "" && value.passwordAttempts !== 3) &&
    (value.state !== "COMPLETED" || value.code === "PROCESSED") &&
    (value.state === "READY" || value.nextRun === 0);
}
function auditValid(value: unknown): value is AuditEvent {
  return record(value) && exact(value, [
    "eventId", "occurredAt", "actorId", "actorType", "operation", "targetRef", "outcome", "correlationId", "reason",
  ]) && identifier(value.eventId) && integer(value.occurredAt) &&
    identifier(value.actorId) && ["user", "anonymous", "system"].includes(String(value.actorType)) &&
    [...operations, "unknown", "startupRecovery", "backupPrepared", "workerClaimed",
      "workerReclaimed", "checkpointCommitted", "passwordPromptCancelled"].some(operation => operation === value.operation) &&
    (value.targetRef === "-" || identifier(value.targetRef)) &&
    ["success", "denied", "failure"].includes(String(value.outcome)) &&
    identifier(value.correlationId) &&
    (value.reason === "OK" || value.reason === "STORED_OUTCOME" ||
      isErrorCode(value.reason) || jobCodes.some(code => code === value.reason));
}
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  const invalid = (): never => { throw new AppError("BACKUP_INVALID"); };
  if (!record(value) || !exact(value, ["schema", "jobs", "outputs", "outcomes", "config", "audit"]) ||
    value.schema !== 1 || !Array.isArray(value.jobs) || !Array.isArray(value.outputs) ||
    !Array.isArray(value.outcomes) || !Array.isArray(value.config) || !Array.isArray(value.audit)) return invalid();
  if (value.jobs.length > 10000 || value.audit.length > 50000 ||
    !value.jobs.every(jobValid) || !value.audit.every(auditValid)) return invalid();
  const jobs = new Map<string, Job>(value.jobs.map(job => [job.id, job]));
  if (jobs.size !== value.jobs.length) return invalid();
  const outputs = new Map<string, number>();
  for (const output of value.outputs) {
    if (!record(output) || !exact(output, ["jobId", "pages"]) || !identifier(output.jobId) ||
      !integer(output.pages, 10000) || output.pages === 0 || outputs.has(output.jobId) ||
      jobs.get(output.jobId)?.state !== "COMPLETED") return invalid();
    outputs.set(output.jobId, output.pages);
  }
  const outcomes = new Set<string>();
  for (const outcome of value.outcomes) {
    if (!record(outcome) || !exact(outcome, ["jobId", "stepId", "inputVersion", "pages"]) ||
      !identifier(outcome.jobId) || outcome.stepId !== "processPdf" || outcome.inputVersion !== 1 ||
      outputs.get(outcome.jobId) !== outcome.pages || outcomes.has(outcome.jobId)) return invalid();
    outcomes.add(outcome.jobId);
  }
  if (outputs.size !== outcomes.size || [...jobs.values()].some(job =>
    job.state === "COMPLETED" && !outputs.has(job.id))) return invalid();
  const configKeys = new Set<string>();
  for (const entry of value.config) {
    if (!record(entry) || !exact(entry, ["key", "value"]) ||
      typeof entry.key !== "string" || !entry.key.startsWith("role:") || !identifier(entry.key.slice(5)) ||
      !roles.some(role => role === entry.value) || configKeys.has(entry.key)) return invalid();
    configKeys.add(entry.key);
  }
  if (new Set(value.audit.map(event => event.eventId)).size !== value.audit.length) return invalid();
}
