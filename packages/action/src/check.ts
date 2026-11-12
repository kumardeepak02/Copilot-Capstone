import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
if (Number(process.versions.node.split(".")[0]) !== 24) {
  throw new Error("This test action requires Node 24.");
}
// npm's JS entry avoids cmd.exe argument interpolation on Windows.
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this entry point through npm run ci:check.");
const result = spawnSync(process.execPath, [npm, "run", "check"], {
  cwd: root, stdio: "inherit", env: process.env,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
