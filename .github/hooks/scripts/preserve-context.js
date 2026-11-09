#!/usr/bin/env node
/**
 * PreCompact hook: re-asserts the hard constraints that matter most to preserve across a context
 * compaction, so they aren't silently dropped and don't need to be rediscovered from scratch.
 */
const message = [
  "Preserve before compacting: never commit real secrets (.vscode/mcp.json must only use",
  '"${input:...}" placeholders); destructive git ops (push --force, reset --hard, --no-verify)',
  "require explicit user confirmation; ticket work must match an exact EPMCDMETST-<digits> heading",
  "in the relevant doc before editing, not a substring match."
].join(" ");

process.stdout.write(JSON.stringify({ continue: true, systemMessage: message }));
