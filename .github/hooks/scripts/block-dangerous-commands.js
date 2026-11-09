#!/usr/bin/env node
/**
 * PreToolUse hook: deterministically requires human confirmation for destructive/hard-to-reverse
 * commands (rm -rf, git push --force without --force-with-lease, git reset --hard, --no-verify,
 * force branch delete) instead of relying only on model discipline each turn.
 */
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const payload = raw; // search the whole raw payload; exact field layout isn't guaranteed

  const dangerousPatterns = [
    { pattern: /\brm\s+-rf\s+\/(?!\S)/i, reason: "rm -rf on a root/absolute path" },
    { pattern: /git\s+push\s+(?:[^\n]*\s)?--force(?!-with-lease)/i, reason: "git push --force (prefer --force-with-lease)" },
    { pattern: /git\s+reset\s+--hard/i, reason: "git reset --hard discards local changes" },
    { pattern: /--no-verify/i, reason: "--no-verify bypasses commit/push hooks" },
    { pattern: /git\s+branch\s+-D\b/i, reason: "force branch delete" }
  ];

  const hit = dangerousPatterns.find((d) => d.pattern.test(payload));

  if (hit) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: `Destructive/hard-to-reverse action detected (${hit.reason}); confirm with the user first.`
        }
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
