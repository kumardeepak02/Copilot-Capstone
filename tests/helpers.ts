import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { JobService } from "../packages/core/src/jobs.js";
import { SqliteStore } from "../packages/adapters/src/sqlite.js";
import { FileArchives } from "../packages/adapters/src/backup.js";
import type { Boundary } from "../packages/adapters/src/sqlite.js";
import type { Dependencies } from "../packages/core/src/jobs.js";
import type { Job, Principal, Role } from "../packages/core/src/ports.js";

export const sentinel = "synthetic-only-password-SENTINEL";
export const testKey = Buffer.alloc(32, 17);
export function principal(role: Role = "Administrator", id = "test-admin"): Principal {
  return { id, role, mfa: true, expiresAt: Number.MAX_SAFE_INTEGER };
}
export function fixture(context: TestContext, options: {
  boundary?: (point: Boundary) => void;
  dependencies?: Partial<Omit<Dependencies, "store">>;
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "capstone-test-"));
  const path = join(directory, "state.db");
  const store = new SqliteStore(path, options.boundary);
  const dependencies: Dependencies = {
    store,
    identity: { async authenticate() { return principal(); } },
    processor: { async process() { return { kind: "processed", pages: 2 }; } },
    keys: { async key() { return testKey; } },
    archives: new FileArchives(directory),
    ...options.dependencies,
  };
  const service = new JobService(dependencies);
  context.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { directory, path, store, service, dependencies };
}
export async function submit(service: JobService, inputRef = "fixture-plain"): Promise<Job> {
  const result = await service.execute("submitJob", { inputRef });
  if (!result.job) throw new Error("Test submission returned no job");
  return result.job;
}
