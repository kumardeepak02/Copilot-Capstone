#!/usr/bin/env node
/**
 * Stop hook: a cheap, deterministic end-of-session reminder if there are uncommitted changes, so
 * work isn't silently left stranded without the user noticing.
 */
const { execSync } = require("child_process");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..", "..");
let statusOutput = "";
try {
  statusOutput = execSync("git status --short", { cwd: repoRoot, encoding: "utf8", timeout: 5000 });
} catch {
  // not a git repo, git unavailable, or timed out — nothing to report
}

const systemMessage = statusOutput.trim()
  ? `Uncommitted changes remain at session end:\n${statusOutput.trim()}`
  : undefined;

process.stdout.write(JSON.stringify({ continue: true, ...(systemMessage ? { systemMessage } : {}) }));
