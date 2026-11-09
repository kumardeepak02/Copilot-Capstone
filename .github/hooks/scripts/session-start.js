#!/usr/bin/env node
/**
 * SessionStart hook: injects the repo's known build/test quirks up front so agents don't burn
 * tokens rediscovering them (PowerShell npx is blocked; jest patterns need forward slashes; a
 * full `tsc --build` is required before docsync-cli/extension tests can resolve docsync-core).
 */
const message = [
  "Repo build/test notes (avoid rediscovering):",
  '- PowerShell blocks `npx`. Use: cmd /c "node node_modules\\jest\\bin\\jest.js --colors=false" and',
  '  cmd /c "node node_modules\\typescript\\bin\\tsc --build"',
  "- Jest test path patterns need forward slashes, e.g. packages/stays-currency (not backslashes).",
  "- Run a full `tsc --build` (not a single package) before testing docsync-cli/docsync-vscode-extension,",
  "  since they import \"docsync-core\" and need its dist/ output to exist first.",
  "- EPMCDMETST-* ticket sections live in requirements.md / architecture.md / design-review.md / impl-plan.md /",
  "  code-review.md; match exact headings, not substrings."
].join("\n");

process.stdout.write(JSON.stringify({ continue: true, systemMessage: message }));
