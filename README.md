# DocSync-Bot

AI-assisted documentation sync for code changes — detects when a pull request's code changes make existing
documentation (docstrings, README/Markdown, OpenAPI specs, Confluence pages) stale, and proposes AI-generated
fixes for human review.

> Built as a GitHub Copilot Agentic SDLC capstone exercise. See [requirements.md](./requirements.md),
> [architecture.md](./architecture.md), [design-review.md](./design-review.md), [impl-plan.md](./impl-plan.md),
> and [code-review.md](./code-review.md) for the full design/process trail.

## How it works

```
GitHub PR (opened/synced)  ──▶  docsync-cli check  ──▶  PR comment + check status
VS Code command            ──▶  docsync-core (in-process)  ──▶  Output channel + webview diff
```

1. **Detect** — diffs the base/head git revisions and extracts changed function/class signatures
   (TypeScript/JavaScript via `ts-morph`, Python via regex).
2. **Link** — maps each changed symbol to its documentation: JSDoc/docstrings (same file), Markdown sections
   (`<!-- docsync:ref <symbolId> -->`), OpenAPI operations (`x-docsync-ref` vendor extension), or Confluence pages
   (explicit mapping in `docsync.config.json`).
3. **Detect drift** — flags mismatched parameters/return types (high), undocumented new symbols (medium), or
   significant body changes with stable signatures (low).
4. **Suggest** — an LLM (GitHub Models/Copilot inference API) proposes corrected documentation; falls back to
   detection-only output when no provider is configured.
5. **Report** — a Markdown report is posted as a PR comment (CLI/Action) or rendered in a VS Code webview
   (extension). Nothing is ever applied automatically — every suggestion requires explicit human acceptance.

## Packages

| Package | Purpose |
|---|---|
| [`packages/docsync-core`](./packages/docsync-core) | Diff analysis, doc-type adapters, drift detection, LLM suggestion engine, public `checkRepo()` API. |
| [`packages/docsync-cli`](./packages/docsync-cli) | `docsync-cli check --base <ref> --head <ref>` — used by the GitHub Action. |
| [`packages/docsync-vscode-extension`](./packages/docsync-vscode-extension) | Thin VS Code command (`DocSync: Check Current Branch`) for on-demand checks. |

## Setup

```powershell
npm install
npm run build        # compiles all 3 workspace packages
npm test             # runs the full jest suite (75 tests)
```

Copy `.env.example` to `.env` and fill in values as needed:

- `GITHUB_MODELS_TOKEN` — enables real AI-generated suggestions. Without it, DocSync-Bot still detects drift but
  skips suggestion generation (detection-only mode).
- `CONFLUENCE_BASE_URL` / `CONFLUENCE_EMAIL` / `CONFLUENCE_API_TOKEN` — enables reading linked Confluence pages.

## Usage

### CLI

```powershell
node packages/docsync-cli/dist/index.js check --base <base-ref> --head <head-ref> --repo <path>
```

Exit codes: `0` = no blocking drift, `1` = blocking drift found, `2` = unexpected error.

### GitHub Action

[.github/workflows/docsync.yml](./.github/workflows/docsync.yml) runs the CLI automatically on
`pull_request: [opened, synchronize, ready_for_review]`, posts the report as a PR comment, and fails the job if
blocking drift is found. Add a `GITHUB_MODELS_TOKEN` repository secret to enable AI-generated suggestions.

### VS Code extension

Run **DocSync: Check Current Branch** from the Command Palette. Results appear in the "DocSync-Bot" Output
channel and a side-by-side webview panel.

## Configuration

Optional `docsync.config.json` at the repo root (see the one in this repo for a real example):

```json
{
  "excludePaths": ["node_modules/**", "dist/**", "**/*.test.ts"],
  "enabledAdapters": ["docstring", "markdown", "openapi", "confluence"],
  "blockingSeverity": "medium",
  "confluenceLinks": [{ "symbolId": "src/file.ts#fn", "confluencePageId": "123456" }]
}
```

If absent, built-in defaults are used (see `DEFAULT_CONFIG` in
[`packages/docsync-core/src/types.ts`](./packages/docsync-core/src/types.ts)).

## Known limitations

- Python signature extraction is regex-based, not a full AST parser (Java/Go adapters are not implemented).
- The VS Code extension is an intentionally thin stub (one command + simple webview), not a full inline-editor
  integration — see the MVP boundary agreed in [design-review.md](./design-review.md).
- Confluence integration currently supports reading linked pages for drift detection; writing updates back to
  Confluence is not implemented (would be a deliberate, explicit opt-in operation per the architecture).
- The "undocumented new symbol" rule fires for every newly added exported function/method, including small
  internal helpers — teams that don't document every helper may want to raise `blockingSeverity` or scope
  `excludePaths`, as this repo's own `docsync.config.json` does.
- A handful of transitive `jest`/`ts-jest` dev dependencies carry low-severity advisories (not shipped in any
  published artifact) — see [code-review.md](./code-review.md) for details.

## Agentic SDLC Pipeline (repo tooling)

Beyond the DocSync-Bot product itself, this repository hosts the agentic SDLC tooling used to build it — a
chain of specialized GitHub Copilot custom agents, one per SDLC stage, plus an orchestrator that routes a
ticket and a natural-language goal to the right agent automatically. The same pipeline is reused for any
`EPMCDMETST-<digits>` ticket in this workspace (for example the unrelated `EPMCDMETST-47868` Stays feature in
[`packages/stays-currency`](./packages/stays-currency)), not just DocSync-Bot itself.

### What it's for
- Each SDLC stage (requirements → architecture → design review → implementation plan → implementation → code
  review → verification → PR) has its own narrowly-scoped agent, with its own tool permissions, ticket
  validation, and human-approval gates — no single agent tries to do everything.
- Every agent requires a ticket in the exact format `EPMCDMETST-<digits>` (e.g. `EPMCDMETST-52508`) and checks
  that the ticket already has its required prerequisite artifact (no architecture without requirements, no
  implementation without an approved plan, no PR without a completed review/verification) before doing any work.
- Nothing destructive — editing code, committing, pushing, or opening a PR — happens without an explicit human
  approval step inside the relevant agent.

### How to use it
- **Run the full pipeline for a ticket**: invoke the `SDLC Orchestrator` agent with a ticket number and a goal
  like "run the full pipeline" — it runs each stage in order and stops at the first blocker or approval gate,
  relaying it back to you rather than guessing past it.
- **Run one specific stage**: invoke the orchestrator with a ticket plus a specific goal (e.g.
  `EPMCDMETST-52508 implement the plan`), or pick the matching agent directly from VS Code's Copilot Chat agent
  picker.
- All agents live in [.github/agents/](./.github/agents) as `*.agent.md` files.

### Agents

| Agent | File | Stage | Input | Produces / updates |
|---|---|---|---|---|
| **JIRA Requirements Analyst** | [jira-requirements-analyst.agent.md](.github/agents/jira-requirements-analyst.agent.md) | Requirements | JIRA ticket number | `<TICKET>.txt` export (via the `jira-ticket-export` skill) + a clarified ticket section in `requirements.md` |
| **System Architecture Designer** | [system-architecture-designer.agent.md](.github/agents/system-architecture-designer.agent.md) | Architecture | Ticket number (must exist in `requirements.md`) | A Confluence high-level diagram (via the `ticket-confluence-architecture` skill) + a matching section in `architecture.md` |
| **Architecture Design Reviewer** | [architecture-design-reviewer.agent.md](.github/agents/architecture-design-reviewer.agent.md) | Design review | Ticket number (must exist in `architecture.md`) | Findings/decisions in `design-review.md`, with surgical fixes applied to `architecture.md` |
| **Implementation Planner** | [implementation-planner.agent.md](.github/agents/implementation-planner.agent.md) | Planning | Ticket number (must have an approved `architecture.md` section) | A dependency-ordered, prioritized task list in `impl-plan.md` |
| **Implementation Agent** | [implementation-agent.agent.md](.github/agents/implementation-agent.agent.md) | Implementation | Ticket number (must exist in `impl-plan.md`) | Approved, ticket-scoped code and tests — only after explicit human approval of the exact task scope |
| **Code Review Agent** | [code-review-agent.agent.md](.github/agents/code-review-agent.agent.md) | Code review | Ticket number (must exist in `impl-plan.md`) | A 7-area peer review (correctness, security, error handling, test coverage, clarity, DRY, dependency safety) in `code-review.md`, with real findings fixed directly |
| **Verification Agent** | [verification-agent.agent.md](.github/agents/verification-agent.agent.md) | Verification | Ticket number (must exist in `impl-plan.md`) | Closed test-coverage gaps plus a content-quality check of the ticket's output documentation |
| **Pull Request Agent** | [pull-request-agent.agent.md](.github/agents/pull-request-agent.agent.md) | Pull request | Ticket number (review + verification already complete) | A pushed branch and an opened PR with Summary / Changes Made / Test Evidence / Known Limitations / Reviewer Checklist — only after explicit approval of the exact branch/commits/body |
| **SDLC Orchestrator** | [sdlc-orchestrator.agent.md](.github/agents/sdlc-orchestrator.agent.md) | Routing | Ticket number + natural-language goal | Delegates to exactly the right agent(s) above; never does requirements/design/code/review/PR work itself |

### Skills used by the agents
- [jira-ticket-export](.github/skills/jira-ticket-export/SKILL.md) — fetches a JIRA ticket via the configured
  `mcp-atlassian` MCP server and exports its full details to a text file.
- [ticket-confluence-architecture](.github/skills/ticket-confluence-architecture/SKILL.md) — creates/updates the
  ticket's high-level architecture diagram in Confluence.

### Hooks
[.github/hooks/sdlc-hooks.json](.github/hooks/sdlc-hooks.json) wires deterministic guardrails into every agent
session in this workspace (see [token-optimization.md](./token-optimization.md) for the full rationale):
requires confirmation on destructive commands (`git push --force`, `git reset --hard`, `--no-verify`), flags
real-secret-shaped strings before they're written to a file, validates `EPMCDMETST-<digits>` ticket format
early, and injects known build/test gotchas at session start so agents don't rediscover them by trial and error.

### MCP connections these agents use
[.vscode/mcp.json](.vscode/mcp.json) configures the `mcp-atlassian` (Jira/Confluence) and `github` MCP servers
the agents above depend on. Credentials are supplied through VS Code's `${input:...}` prompts at connect time —
never hardcoded in that file.
