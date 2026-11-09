#!/usr/bin/env node
/**
 * SubagentStart hook: for the ticket-scoped SDLC agents, deterministically checks the subagent's
 * input for a valid EPMCDMETST-<digits> ticket so the subagent doesn't have to spend a turn
 * re-deriving/asking for the format when it's simply missing or mistyped.
 */
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let agentName = "";
  let input = raw;
  try {
    const parsed = JSON.parse(raw);
    agentName = parsed.agentName ?? parsed.name ?? "";
    input = parsed.prompt ?? parsed.input ?? raw;
  } catch {
    // fall back to raw text if stdin isn't the expected JSON shape
  }

  const ticketScopedAgents = [
    "JIRA Requirements Analyst",
    "System Architecture Designer",
    "Architecture Design Reviewer",
    "Implementation Planner",
    "Implementation Agent",
    "Code Review Agent",
    "Verification Agent",
    "Pull Request Agent"
  ];

  if (ticketScopedAgents.includes(agentName) && !/\bEPMCDMETST-\d+\b/.test(input)) {
    process.stdout.write(
      JSON.stringify({
        systemMessage: `"${agentName}" expects a valid EPMCDMETST-<digits> ticket number in its input; none was found — ask the user for one before proceeding.`,
        continue: true
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
