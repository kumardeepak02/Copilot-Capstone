export const roles = ["Administrator", "Operator", "End User", "Auditor"] as const;
export type Role = typeof roles[number];
export const operations = [
  "submitJob", "readOwnJob", "readAnyJob", "resumeJob",
  "cancelJob", "readAudit", "manageRoles", "createBackup", "restoreBackup", "readDiagnostics",
] as const;
export type Operation = typeof operations[number];
export interface Principal {
  id: string;
  role: Role;
  expiresAt: number;
  mfa: boolean;
}
export interface IdentityProvider {
  authenticate(): Promise<Principal | null>;
}
export type JobState = "READY" | "RUNNING" | "AWAITING_PASSWORD" | "COMPLETED" | "FAILED" | "CANCELLED";
export const jobCodes = [
  "READY", "RUNNING", "CANCELLED", "PROCESSED", "PASSWORD_REQUIRED", "INVALID_PASSWORD",
  "PDF_PASSWORD_ATTEMPTS_EXHAUSTED", "RETRIES_EXHAUSTED", "RETRY_SCHEDULED",
  "PDF_PROCESSING_FAILED", "RECOVERED",
] as const;
export interface Job {
  id: string;
  owner: string;
  inputRef: string;
  state: JobState;
  version: number;
  attempts: number;
  passwordAttempts: number;
  nextRun: number;
  leaseUntil: number;
  leaseToken: string;
  challengeId: string;
  code: typeof jobCodes[number];
}
export type PdfResult =
  | { kind: "processed"; pages: number }
  | { kind: "passwordRequired" }
  | { kind: "invalidPassword" }
  | { kind: "transient" }
  | { kind: "failed" };
export interface PdfProcessor {
  process(inputRef: string, password?: string): Promise<PdfResult>;
}
export interface BackupKeyProvider {
  key(): Promise<Uint8Array>;
}
export interface ArchivePublisher {
  publish(archive: Buffer, prepared: () => void): string;
}
export interface AuditEvent {
  eventId: string;
  occurredAt: number;
  actorId: string;
  actorType: "user" | "anonymous" | "system";
  operation: Operation | "unknown" | "startupRecovery" | "backupPrepared" |
    "workerClaimed" | "workerReclaimed" | "checkpointCommitted" | "passwordPromptCancelled";
  targetRef: string;
  outcome: "success" | "denied" | "failure";
  correlationId: string;
  reason: string;
}
export interface Snapshot {
  schema: 1;
  jobs: Job[];
  outputs: { jobId: string; pages: number }[];
  outcomes: { jobId: string; stepId: "processPdf"; inputVersion: 1; pages: number }[];
  config: { key: string; value: string }[];
  audit: AuditEvent[];
}
export interface Store {
  transaction<T>(work: () => T): T;
  get(id: string): Job | undefined;
  insert(job: Job): void;
  save(job: Job, expectedVersion: number): void;
  output(jobId: string): number | undefined;
  publish(jobId: string, pages: number): void;
  audit(event: AuditEvent): void;
  events(): AuditEvent[];
  configure(key: string, value: string): void;
  configuration(key: string): string | undefined;
  snapshot(): Snapshot;
  restore(snapshot: Snapshot): void;
}
