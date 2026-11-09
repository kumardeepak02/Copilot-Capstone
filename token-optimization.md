# Token Optimization — Agentic SDLC Pipeline

Concrete, already-applied-or-recommended levers to reduce token/turn cost across the `SDLC
Orchestrator` and its 8 subagents, without weakening any agent's required deliverable. Each
section below was checked against the agent's actual `Workflow`/`Constraints` in its `.agent.md`
file — "Task completeness" confirms nothing was cut that the agent needs to do its job.

## Pipeline inventory

| # | Agent | File | Tools (current) |
|---|---|---|---|
| 1 | JIRA Requirements Analyst | `.github/agents/jira-requirements-analyst.agent.md` | `read, edit, search, execute, vscode_askQuestions, mcp-atlassian/*` |
| 2 | System Architecture Designer | `.github/agents/system-architecture-designer.agent.md` | `read, edit, search, execute, vscode_askQuestions, mcp-atlassian/*` |
| 3 | Architecture Design Reviewer | `.github/agents/architecture-design-reviewer.agent.md` | `read, edit, search, vscode_askQuestions` |
| 4 | Implementation Planner | `.github/agents/implementation-planner.agent.md` | `read, edit, search, vscode_askQuestions` |
| 5 | Implementation Agent | `.github/agents/implementation-agent.agent.md` | `read, edit, search, execute, vscode_askQuestions` |
| 6 | Code Review Agent | `.github/agents/code-review-agent.agent.md` | `read, edit, search, execute, vscode_askQuestions` |
| 7 | Verification Agent | `.github/agents/verification-agent.agent.md` | `read, edit, search, execute, vscode_askQuestions` |
| 8 | Pull Request Agent | `.github/agents/pull-request-agent.agent.md` | `read, edit, search, execute, vscode_askQuestions, github/*` |
| 9 | SDLC Orchestrator | `.github/agents/sdlc-orchestrator.agent.md` | `read, search, agent, vscode_askQuestions` |

## Applied (already done in this repo)

1. **Removed an unused tool alias.** `JIRA Requirements Analyst` listed `todo`, but its `Approach`
   section never uses a task list — removed. (Task completeness: unaffected; the agent's 9-step
   approach has no step that needed a todo list.)
2. **Lean tool lists on read/document-only agents.** `Architecture Design Reviewer` and
   `Implementation Planner` already omit `execute` — neither one runs shell commands in its
   workflow (both only read/write Markdown docs), so no trim was needed there, just confirmed.
3. **Orchestrator restricted to exactly 8 named subagents** via the `agents:` frontmatter key
   (not "all agents") — avoids loading irrelevant agent descriptions into its context.
4. **Repo hygiene**: added `jest-run-output.txt` to `.gitignore` (stray debug output; `*.log` was
   already covered) so it stops being re-read/re-diffed by future agent turns.
5. **Hooks already follow the "silent unless something to say" pattern** (see
   `.github/hooks/sdlc-hooks.json`): `UserPromptSubmit`/`PreToolUse`/`PostToolUse` only emit a
   `systemMessage` on an actual match, so they add zero tokens on the common case.

## Per-agent levers (reviewed, not yet applied — pick and ask to apply)

| Agent | Lever | Risk if applied | Task completeness after applying |
|---|---|---|---|
| JIRA Requirements Analyst | Lower `reasoning-effort` (mechanical transcription + clarifying questions, not deep design reasoning) | Low | Unaffected — no architectural judgment required |
| System Architecture Designer | Keep `execute` under review: the invoked `ticket-confluence-architecture` skill doesn't itself call shell scripts (unlike `jira-ticket-export`, which does) — candidate for removal, but left in place since removal risk outweighs the marginal saving until confirmed via a dry run | N/A (not removed) | Unaffected either way |
| Architecture Design Reviewer | Keep `reasoning-effort: high` — this is the agent most responsible for catching real design defects | — | Must not be lowered |
| Implementation Planner | Lower `reasoning-effort` to `medium` (ordering/dependency-graph construction is mechanical once the architecture is read) | Low | Unaffected — task is structured transformation, not novel judgment |
| Implementation Agent | Keep current config; this agent needs full reasoning to implement correctly | — | Must not be lowered |
| Code Review Agent | Keep `reasoning-effort: high` — this is a correctness/security gate | — | Must not be lowered |
| Verification Agent | Request **summarized** test output from `execution_subagent` (pass/fail counts + failure detail only) instead of full raw logs — already the pattern used in this session | Low | Unaffected — evidence requirement is "pass/fail counts + citations", not raw logs |
| Pull Request Agent | Lower `reasoning-effort` to `medium` (drafting from already-produced evidence, not new analysis) | Low | Unaffected — PR body is assembled from `code-review.md`/test output already on disk |
| SDLC Orchestrator | Keep `reasoning-effort: medium` (routing/sequencing, not deep reasoning) | Low | Unaffected — its only job is matching intent to the stage map |

`model:`/`reasoning-effort:` values were **not** hard-pinned in any agent file in this pass: the
available model identifiers in a given VS Code installation can't be verified from inside the
repo, and specifying an invalid value would break the agent entirely. Apply these only after
confirming the exact model name shown in your own model picker.

## Workflow-level levers (apply when running the full pipeline via the orchestrator)

- **Pass condensed context forward instead of re-reading.** Today, each of the 8 subagents
  independently re-reads `impl-plan.md`/`requirements.md`/`architecture.md` to re-find the same
  ticket section. The orchestrator can extract the matching ticket section once and include it
  inline in the subagent's prompt, cutting up to 7 redundant full-file reads per pipeline run.
- **Targeted reads over whole-file reads.** Read only the matching ticket's line range from large
  docs (`impl-plan.md`, `requirements.md`, `architecture.md`, `design-review.md`,
  `code-review.md`) rather than the entire file.
- **Batch independent reads/searches in one turn** instead of issuing them sequentially — reduces
  round-trip overhead (repeated system-prompt/tool-schema cost per turn).
- **Package-scoped test runs before a final full-suite confirmation**, not full-suite on every
  single edit — used throughout the `stays-currency` work in this session.

## What was explicitly NOT changed (to protect task completeness)

- No agent's `Workflow` steps, `Constraints`, ticket-format validation, or approval gates were
  removed or weakened — only unused tool aliases and documentation-only hygiene were touched.
- `Implementation Agent` and `Pull Request Agent` retain their full pre-edit/pre-push human-approval
  requirements; token savings must never come from skipping a safety gate.
- `Architecture Design Reviewer` and `Code Review Agent` keep full reasoning budget — these are the
  two correctness/security checkpoints in the pipeline and are not candidates for cost-cutting.
