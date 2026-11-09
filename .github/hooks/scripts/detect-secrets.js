#!/usr/bin/env node
/**
 * PostToolUse hook: catches real-secret-shaped strings written by a tool call before they can be
 * committed (this repo had a real incident: plaintext Jira/Confluence tokens pasted into
 * .vscode/mcp.json). Flags the shapes, not the word "token"/"secret" alone, to avoid false
 * positives on legitimate code like redactSecrets.ts's own pattern *definitions*.
 */
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const payload = raw;

  const secretPatterns = [
    /gh[pousr]_[A-Za-z0-9]{36,}/, // GitHub token
    /AKIA[0-9A-Z]{16}/, // AWS access key
    /ATATT3[A-Za-z0-9_-]{100,}/, // Atlassian API token
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/ // PEM private key block
  ];

  const hit = secretPatterns.some((p) => p.test(payload));

  if (hit) {
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason:
          "A real-secret-shaped string (token/key) was detected in this write. Use an env var or an mcp.json " +
          '"${input:...}" placeholder instead, and tell the user to rotate the value if it was already pasted in chat.'
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
