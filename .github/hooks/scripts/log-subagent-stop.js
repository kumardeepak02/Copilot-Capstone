#!/usr/bin/env node
/**
 * SubagentStop hook: lightweight, append-only local log of which subagent ran for which ticket,
 * so a later session/orchestrator run can see prior stage history without re-reading full chat
 * transcripts.
 */
const fs = require("fs");
const path = require("path");

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const parsed = JSON.parse(raw);
    const agentName = parsed.agentName ?? parsed.name ?? "unknown-agent";
    const ticketMatch = /\bEPMCDMETST-\d+\b/.exec(JSON.stringify(parsed));
    const ticket = ticketMatch ? ticketMatch[0] : "unknown-ticket";
    const line = `${new Date().toISOString()}\t${ticket}\t${agentName}\n`;
    const logPath = path.join(__dirname, "..", "subagent-run.log");
    fs.appendFileSync(logPath, line);
  } catch {
    // best-effort logging only; never fail the subagent's actual result over this
  }
  process.stdout.write(JSON.stringify({ continue: true }));
});
