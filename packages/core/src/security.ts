import { randomUUID } from "node:crypto";
import { operations, roles } from "./ports.js";
import type { Operation, Principal } from "./ports.js";

const messages = {
  UNAUTHENTICATED: "Authentication is required.",
  FORBIDDEN: "Operation is not permitted.",
  INVALID_INPUT: "Input is invalid.",
  NOT_FOUND: "Job is unavailable.",
  CONFLICT: "Job state has changed.",
  AUDIT_UNAVAILABLE: "Required audit recording is unavailable.",
  STORAGE_UNAVAILABLE: "Local storage is unavailable.",
  INTEGRATION_UNAVAILABLE: "A required integration is not configured.",
  BACKUP_INVALID: "Backup could not be verified.",
} as const;
export type ErrorCode = keyof typeof messages;
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(messages, value);
}
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly correlationId: string;
  constructor(code: ErrorCode, correlationId: string = randomUUID()) {
    super(messages[code]);
    this.name = "AppError";
    this.code = code;
    this.correlationId = correlationId;
  }
}
export function publicError(error: unknown): { code: ErrorCode; message: string; correlationId: string } {
  const safe = error instanceof AppError ? error : new AppError("STORAGE_UNAVAILABLE");
  return { code: safe.code, message: safe.message, correlationId: safe.correlationId };
}
export function isOperation(value: string): value is Operation {
  return operations.some(operation => operation === value);
}
export function validPrincipal(value: unknown, now: number): value is Principal {
  if (typeof value !== "object" || value === null) return false;
  const principal = value as Record<string, unknown>;
  return identifier(principal.id) && roles.some(role => role === principal.role) &&
    typeof principal.expiresAt === "number" && Number.isFinite(principal.expiresAt) && principal.expiresAt > now &&
    (principal.role !== "Administrator" && principal.role !== "Operator" || principal.mfa === true);
}
export function identifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}
export function permitted(value: unknown, operation: string, owner?: string): boolean {
  if (typeof value !== "object" || value === null) return false;
  const principal = value as Record<string, unknown>;
  if (!identifier(principal.id) || !roles.some(role => role === principal.role) || !isOperation(operation)) return false;
  if (principal.role === "Administrator") return true;
  switch (operation) {
    case "submitJob": return principal.role === "Operator" || principal.role === "End User";
    case "readOwnJob": return (principal.role === "Operator" || principal.role === "End User") && principal.id === owner;
    case "cancelJob": return principal.role === "Operator" || principal.role === "End User" && principal.id === owner;
    case "readAnyJob":
    case "resumeJob":
    case "readDiagnostics": return principal.role === "Operator";
    case "readAudit": return principal.role === "Auditor";
    default: return false;
  }
}
