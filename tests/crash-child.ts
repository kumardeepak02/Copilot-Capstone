import { readFileSync } from "node:fs";
import { JobService } from "../packages/core/src/jobs.js";
import { SqliteStore } from "../packages/adapters/src/sqlite.js";
import { principal, testKey } from "./helpers.js";

const [path, mode, point, value, clock] = process.argv.slice(2);
if (!path || !mode || !point || !value) throw new Error("Missing crash-test arguments");
let armed = false;
const store = new SqliteStore(path, boundary => {
  if (armed && boundary === point) process.exit(73);
});
const service = new JobService({
  store,
  identity: { async authenticate() { return principal(); } },
  keys: { async key() { return testKey; } },
  now: () => clock ? Number(clock) : 1_000_000,
  processor: { async process() {
    armed = true;
    return mode === "challenge" ? { kind: "passwordRequired" } : { kind: "processed", pages: 7 };
  } },
});
if (mode === "complete" || mode === "challenge") {
  await service.execute("resumeJob", { id: value });
} else if (mode === "restore") {
  armed = true;
  await service.execute("restoreBackup", { archive: readFileSync(value) });
} else {
  throw new Error("Unknown crash-test mode");
}
throw new Error("Crash boundary did not terminate the child");
