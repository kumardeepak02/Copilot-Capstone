# EPMCDMETST-72536: Implementation Plan

| Field | Value |
|---|---|
| Stage | 4 - Implementation Plan |
| Plan date | 2026-11-16 |
| Approval source (inputs) | Design review approved 2026-11-16T22:09:54.232+05:30 (`03-design-review.md` §9; `pipeline-state.json` `designReview.status = completed`). Architecture approved 2026-11-16T22:00:22+05:30 (`02-architecture.md` §18; E-1 to E-7 applied). Requirements approved 2026-11-16T21:45:08+05:30. Planning was requested by the human owner for this run. |
| Inputs read | `01-requirements.md`, `02-architecture.md`, `03-design-review.md`, `pipeline-state.json`. Repo files were checked only for layout and test conventions (§3). |
| Plan status | **Approved** by the human owner (§10). |
| Approved at | 2026-11-16T22:20:28.390+05:30 |
| Approved scope | The plan as written, including the §10 decisions: file layout in §4, Jest/jsdom approach with no root Jest config change, and inline save-error text "Changes could not be saved in this browser." Approval covers the plan only. Implementation requires its own approval. |
| Implementation status | Not started. No application code was written in this stage. |

## 1. Summary

- **Tasks:** 22. Full IDs are `EPMCDMETST-72536-T01` to `EPMCDMETST-72536-T22`. The tables and sections below use the short form `T01`–`T22`, which is the suffix of the full ID. Every task is referred to by its short form in this document.
- **Priority counts:** P0 = 18, P1 = 2, P2 = 2, P3 = 0.
- **Blocked tasks:** none at plan time (§13).
- **Critical path (11 tasks):** T01 → T02 → T05 → T06 → T07 → T08 → T11 → T15 → T16 → T18 → T20.
- **Scope:** the requirements in `01-requirements.md` only. Nothing is added beyond FR-1 to FR-13, NFR-1 to NFR-6, AC 1.1 to 4.3, AC X.1 and X.2, and the architecture's §17 test approach.

## 2. Assumptions

| ID | Assumption | Basis | Effect if wrong |
|---|---|---|---|
| PA-1 | The page is three static assets (`index.html`, `styles.css`, `app.js`) with no build step and no dependencies. | Architecture §4, §5 ("Build: none required"), §6, NFR-2 | Low. A build step would add a task. |
| PA-2 | Files go in a new folder `packages/habit-tracker-ui/` (layout in §4). The architecture does not name a location and leaves hosting to this plan. | Architecture §5 ("Hosting location ... left to the implementation plan"); repo convention in §3 | Low. Only the paths in §4 change. |
| PA-3 | No `package.json` or root workspace entry for the new folder. There is nothing to build or install. The root Jest config already scans `packages/` for tests. | PA-1; `package.json` workspaces; `jest.config.js` `roots` | Low. Adding a `package.json` is a small follow-up if the owner wants one. |
| PA-4 | Automated tests are `*.test.ts` files (root Jest `testMatch` accepts only `.ts` and `.tsx`). They load the plain-JS `app.js` into a jsdom document. The test file opts into jsdom with a per-file docblock. The root `jest.config.js` is not changed. | `jest.config.js` `testMatch` and `testEnvironment: "node"`; architecture §17 | Medium. A different test runner would change T02 and T17–T19. |
| PA-5 | `app.js` is one classic script (no ES module) and exposes its modules on one namespace object, `window.HabitTracker`, so tests can reach them. | Architecture §5.1, §6 ("Globals must be scoped"), §8 | Low. |
| PA-6 | Habit IDs are a timestamp plus a random suffix, checked for uniqueness at creation. | Architecture §6 (recommendation), §10 | Low. |
| PA-7 | The Input Controller is the only place that trims names. The Store receives trimmed, non-empty names. | Architecture §8 (Input Controller "Trims text") | Low. |
| PA-8 | The delete confirmation message is `Delete <name>?` (the architecture's §9.3 text). Cancel causes no re-render, so focus is not moved. | Architecture §9.3; FR-9 ("On cancel, nothing changes") | Low. |
| PA-9 | **Proposed copy for the inline save-error message:** "Changes could not be saved in this browser." The architecture requires a message that says changes are not saved but does not give wording. This is the only new user-facing text in the plan. | Architecture §8 (Page shell), §10, Q-1 | Low. Copy can be changed without other effects. Requires approval (§10). |
| PA-10 | Open items OI-1, OI-4, OI-5, and OI-7 are accepted as assumptions per architecture §13.2 and design review DR-14. OI-4 uses the "Delete" text button. OI-5 keeps stale entries. OI-7 uses `window.confirm`. | Design review §5 | Medium for OI-7 only. An in-page modal would be a re-plan of T14. |

## 3. Repository Conventions Checked (where needed)

- The repo's workspaces are under `packages/<name>/`. Source is in `src/`, tests in `src/test/` or `test/`, and static HTML in `public/` (`packages/login-page-ui/public/index.html`).
- `packages/login-page-ui` is a React/Vite-style package. It is **not** a template for this ticket. This ticket has no framework and no build (NFR-2).
- Root `jest.config.js` uses `roots: ["<rootDir>/packages"]` and `testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.tsx"]`. A new `packages/habit-tracker-ui/test/*.test.ts` is picked up by `npm test` with no config change. A per-file `@jest-environment jsdom` docblock selects jsdom. `jest-environment-jsdom` is already a root devDependency.
- Root `npm run lint` is `tsc --build --noEmit`. T02 confirms that the new test folder is covered (or that it is intentionally out of scope).
- Nothing else in the repo is changed by this ticket.

## 4. File Locations to Create

All paths are relative to the repo root `C:\Users\deepak_kumar2\Projects\Copilot-Capstone`.

| Path | Created by | Purpose | Architecture reference |
|---|---|---|---|
| `packages/habit-tracker-ui/public/index.html` | T09 | Page shell: card, input and label, Add button, list container, empty-state region, inline error region (`role="alert"`). Loads `styles.css` and `app.js` with `defer`, not as a module. | §5.1, §8, §14.2 |
| `packages/habit-tracker-ui/public/styles.css` | T10 | Centred card (max-width about 600px), responsive, completion style, focus-visible style, error style. | §8, NFR-1 |
| `packages/habit-tracker-ui/public/app.js` | T02 (skeleton), then T03–T16 | One classic script in an IIFE. Contains Day Clock, Habit Store, Habit List Renderer, Habit Input Controller, Delete Confirmation wrapper, and bootstrap. Exposes `window.HabitTracker`. | §6, §7, §8 |
| `packages/habit-tracker-ui/test/helpers/loadApp.ts` | T02 | Loads `index.html` and `app.js` into the jsdom document and returns the namespace. Not matched by `testMatch`. | §17 |
| `packages/habit-tracker-ui/test/clock.test.ts` | T17 | Day Clock unit tests. | §17 |
| `packages/habit-tracker-ui/test/store.test.ts` | T17 | Store load, backup, duplicate-ID, write, and failure tests. | §17 |
| `packages/habit-tracker-ui/test/ui.test.ts` | T18 | DOM behaviour tests for add, check, delete, empty state, focus, and error display. | §9, §17 |
| `packages/habit-tracker-ui/test/static-checks.test.ts` | T19 | Reads the three assets and checks for forbidden patterns (criteria in T19). | NFR-2, NFR-3, §12 |
| `packages/habit-tracker-ui/README.md` | T22 | How to open the page, storage key, daily reset, limits, known constraints. | A-2, A-3, R-1, R-5 |

No other files are created or changed. `pipeline-state.json` is updated only at the approval step (§10).

## 5. Storage Keys and Constants (fixed by the architecture)

- Active key: `habitTracker.v1`. Backup key: `habitTracker.v1.backup`. (E-4; §10)
- Stored shape: `{"version":1,"habits":[{"id","name","completedOn"}]}`. `completedOn` is `YYYY-MM-DD` or `null`. (§10)
- Verbatim texts (§14.2): placeholder `Enter a new habit...`; button `Add Habit`; empty state `No habits added yet. Start by adding one above!`; delete control `Delete`, with accessible name `Delete <habit name>`.

## 6. Task Table

Status is **Proposed** for every task. Priority: P0 = needed for the approved requirements or the design's correctness rules. P1 = gates release verification. P2 = documentation and delivery. P3 = none.

| ID | Pri | Task | Files | Maps to (FR / NFR / AC / other) | Direct prerequisites |
|---|---|---|---|---|---|
| T01 | P0 | Create the package folder and the three empty static assets | `public/index.html`, `public/styles.css`, `public/app.js` (empty) | NFR-2, NFR-3, C-1 | none |
| T02 | P0 | App namespace and jsdom test loader | `public/app.js`, `test/helpers/loadApp.ts` | NFR-2, NFR-5 (ES2017 level), §17 | T01 |
| T03 | P0 | Day Clock `todayKey()` with injectable `now()` | `public/app.js` | FR-12, AC 4.3, A-2, DR-10 / E-7 | T02 |
| T04 | P0 | Day Clock midnight timer, `onRollover`, and recheck on `visibilitychange` and `focus` | `public/app.js` | FR-12, AC 4.3, OI-6, R-6, §9.5 | T03 |
| T05 | P0 | Habit Store: load, parse, and validate | `public/app.js` | FR-11, FR-12, R-3, §10 read rules | T02 |
| T06 | P0 | Store: back up unreadable data; regenerate duplicate IDs | `public/app.js` | E-4 / DR-06, FR-13, FR-11, R-3, §12 | T05 |
| T07 | P0 | Store mutations: add, toggle with `dateKey`, remove; full-object write; change notification | `public/app.js` | FR-2, FR-5, FR-9 (data), FR-10, FR-12, FR-13, NFR-3, NFR-6, E-3 | T06 |
| T08 | P0 | Store write-failure path: keep in-memory change; report `saved = false`; start empty when storage is unavailable, and report `saved = false` on load in that case | `public/app.js` | Q-1, R-1, R-2, PENDING-3 / DR-08, FR-10, NFR-3 | T07 |
| T09 | P0 | Page shell markup with verbatim texts, labels, and regions | `public/index.html` | FR-1, FR-2, FR-7, NFR-4, A-4, §14.2 | T01 |
| T10 | P0 | Stylesheet: centred card, responsive, completion style, focus style | `public/styles.css` | NFR-1, NFR-2, FR-6, NFR-4 | T09 |
| T11 | P0 | Inline error display: show, clear on next successful save | `public/app.js`, `public/index.html` (region) | Q-1, NFR-4 (`role="alert"`), R-1, R-2, DR-03 / E-2 | T08, T09 |
| T12 | P0 | Habit List Renderer: rows, checkbox, name, Delete button, empty state, `textContent` only | `public/app.js` | FR-5, FR-6 (style), FR-7, FR-8, FR-13, NFR-4, §12 (text safety), R-10 | T03, T07, T09 |
| T13 | P0 | Check and uncheck wiring with `dateKey`; focus restored to the same habit's checkbox after re-render | `public/app.js` | FR-5, FR-6, FR-10, FR-12, AC 2.1 to 2.3, DR-01 / E-1, R-8, NFR-4 | T12 |
| T14 | P0 | Delete wiring: `window.confirm`; remove on confirm; no change on cancel; focus to Add input after delete | `public/app.js` | FR-8, FR-9, FR-10, AC 3.1, AC 3.2, OI-4, OI-7, DR-07, R-4, R-9, NFR-4 | T12 |
| T15 | P0 | Add input controller: trim; silent ignore of empty; Enter and button; clear and focus only on successful save | `public/app.js` | FR-1 (placeholder), FR-2, FR-3, FR-4, FR-13, AC 1.1 to 1.4, AC X.1, NFR-4, DR-03 / E-2 | T08, T11, T12 |
| T16 | P0 | Bootstrap and integration: load, render, subscribe, start clock, rollover re-render; no write on rollover | `public/app.js` | FR-11, FR-12, AC 4.2, AC 4.3, A-3, §9.4, §9.5, §10 write rules | T04, T11, T13, T14, T15 |
| T17 | P0 | Unit tests: Day Clock and Store (§17 list) | `test/clock.test.ts`, `test/store.test.ts` | §17, FR-10, FR-11, FR-12, FR-13, Q-1, E-4, DR-10 | T04, T08 |
| T18 | P0 | DOM behaviour tests (§9 flows) through the page | `test/ui.test.ts` | AC 1.1 to 4.3, AC X.1, FR-1 to FR-13, NFR-4 (keyboard-only steps) | T16 |
| T19 | P1 | Static checks: no `innerHTML` or `eval`; no external URLs; no module script; no build reference | `test/static-checks.test.ts` | NFR-2, NFR-3, §5, §12, R-10, DR-13 (observability: no telemetry) | T16 |
| T20 | P1 | Browser verification in the NFR-5 matrix (manual) | none (test record) | NFR-1, NFR-4, NFR-5, AC X.2, E-1, E-2, E-7 | T18, T19 |
| T21 | P2 | Delivery check: open from disk (`file://`) and from a static server; no build artifacts; DR-12 key-sharing check | none (test record) | C-1, NFR-3, §5, §5.1, DR-12 | T19 |
| T22 | P2 | README for the package | `README.md` | A-2, A-3, NFR-3, R-1, R-5 / DR-02, DR-12 | T16 |

## 7. Task Details and Acceptance Criteria

Each task is verifiable by reading the file or running the named test. "Done" means every criterion is met.

### T01. Package folder and empty assets (P0)
- **Deliverable:** the folder `packages/habit-tracker-ui/public/` with three files: `index.html`, `styles.css`, `app.js`.
- **Acceptance:**
  - Exactly these three files exist under `public/`.
  - No `package.json`, build config, or lock file is added (PA-1, PA-3).
- **Rationale for P0:** the foundation for all other tasks.

### T02. Namespace and jsdom loader (P0)
- **Deliverable:** `app.js` is wrapped in one IIFE and exposes `window.HabitTracker = {}`, with module slots for clock, store, renderer, and input. `test/helpers/loadApp.ts` loads `index.html` and then `app.js` into jsdom and returns the namespace.
- **Acceptance:**
  - `app.js` has no top-level globals other than `HabitTracker` (PA-5).
  - A smoke test (run from `npm test` in the package) confirms the namespace is defined after load.
  - `npm test` and `npm run lint` at the repo root still pass. If the root `tsconfig` does not cover `test/`, the plan notes this and does not change the config (§3).

### T03. Day Clock `todayKey()` (P0)
- **Deliverable:** `HabitTracker.clock.todayKey()` returns the local date as `YYYY-MM-DD`. It uses an injectable `now()` that defaults to `() => new Date()`. This is the only code that reads the wall clock (§8).
- **Acceptance:**
  - Uses local getters (`getFullYear`, `getMonth`, `getDate`) and not UTC.
  - Month and day are zero-padded.
  - Given `now()` = local 2026-11-16 23:59:59, the result is `"2026-11-16"`. Given local 2026-01-05 00:00:00, the result is `"2026-01-05"` (tested in T17).
  - Replacing `now()` changes the result, with no other code change.

### T04. Day Clock midnight timer and recheck (P0)
- **Deliverable:** `onRollover(callback)` schedules a `setTimeout` for the next local midnight, computed from `now()`. It re-arms after each firing. It also rechecks on `visibilitychange` (when visible) and `focus`. A recheck calls the callback only when the date key has changed since the last known key.
- **Acceptance:**
  - With fake timers and an injected `now()`, the callback fires once at local midnight and is re-armed for the following midnight (FR-12, OI-6).
  - A `visibilitychange` or `focus` event after a date change fires the callback once. The same event with no date change does not fire it (R-6).
  - The clock writes nothing to storage (§10 write rules).
  - The timer handle is kept, so the schedule can be cleared in tests.

### T05. Store load and validate (P0)
- **Deliverable:** `HabitTracker.store.load()` reads `habitTracker.v1` inside a try block and validates it.
- **Acceptance:**
  - A missing or empty key yields an empty list, with no backup and no write (§10).
  - Valid JSON with `version` 1 and an array `habits` loads. Each entry needs a string `id`, a string `name`, and `completedOn` that is a string or `null`. Invalid entries are dropped (§12, R-3).
  - Any exception from `getItem` (storage disabled) yields an empty list with no thrown error (R-2).
  - A stored `completedOn` is never rewritten on load (A-3, OI-5).

### T06. Store backup and duplicate IDs (P0)
- **Deliverable:** on load, if the key is not valid JSON or has an unexpected top-level shape, the raw string is copied to `habitTracker.v1.backup` before any write. The backup is written only if that key is not already set. Duplicate IDs are regenerated on load, and the corrected data is written with the next write (E-4 / DR-06).
- **Acceptance:**
  - Unparseable data at `habitTracker.v1` is copied to the backup key before the first write (tested in T17).
  - An existing backup is never overwritten by a later load.
  - If the backup write fails, the page still starts empty, and no further backup is attempted. No error is thrown to the user (§10).
  - Two habits with the same `id`: the later one gets a new unique `id`. Names may still repeat (FR-13).

### T07. Store mutations and full write (P0)
- **Deliverable:**
  - `addHabit(name)` creates `{id, name, completedOn: null}` with an ID per PA-6. It returns `{saved}`.
  - `toggleToday(id, checked, dateKey)` sets `completedOn` to `dateKey` when checked and to `null` when unchecked. `dateKey` is required when checked (E-3).
  - `removeHabit(id)` removes the habit.
  - Every change writes the full `{version: 1, habits}` object to `habitTracker.v1`.
  - `subscribe(listener)` is called after every in-memory change, whether or not the write succeeded.
- **Acceptance:**
  - Each mutation changes the in-memory list and writes once (FR-10).
  - The Store does not read the clock (E-3).
  - Duplicate names create separate habits with separate IDs (FR-13).
  - No length or count limit is applied (NFR-6).

### T08. Store write-failure path (P0)
- **Deliverable:** `setItem` is wrapped in try/catch. On failure, the store keeps the in-memory change, returns `saved = false`, and notifies listeners. On the next successful write, it reports success.
- **Acceptance:**
  - A throwing `setItem` (for example, `QuotaExceededError`) results in `saved = false`, the change kept in memory, and listeners called (Q-1, R-1).
  - Storage unavailable (access throws): the page starts empty, changes work in memory, and each change reports `saved = false` (R-2, PENDING-3).
  - Storage unavailable on load: the store reports `saved = false` before the first render, so the load-time warning (T11, T16) is shown. No backup and no write are attempted on load.
  - The next successful write reports `saved = true`, which clears the error (§10 write rules).
  - No exception reaches the page code (R-3).

### T09. Page shell markup (P0)
- **Deliverable:** `index.html` contains:
  - a `<form>` with a labelled `<input type="text">` (placeholder `Enter a new habit...`) and a submit button `Add Habit`, so Enter submits;
  - the list container;
  - the empty-state region with `No habits added yet. Start by adding one above!`;
  - an inline error region with `role="alert"`;
  - `<link>` to `styles.css` and `<script src="app.js" defer>` (not a module).
- **Acceptance:**
  - The label is visible or the input has `aria-label` (NFR-4).
  - All texts match §14.2 exactly.
  - No external URL appears (NFR-2, NFR-3).
  - The page works without JavaScript for layout only; no behaviour is claimed without it.

### T10. Stylesheet (P0)
- **Deliverable:** `styles.css` with a centred card, `max-width: 600px`, fluid width, relative units, and long-name wrapping. Completed habits use strike-through and a muted colour (FR-6, not colour alone). A visible `:focus-visible` style. An error style for the alert region.
- **Acceptance:**
  - Layout is centred and does not overflow at phone width (NFR-1, verified in T20).
  - Strike-through is present in the completed style (FR-6).
  - No external font, CDN, or CSS library (NFR-2).

### T11. Inline error display (P0)
- **Deliverable:** a function shows the PA-9 message in the alert region when the store reports `saved = false`, and clears it on the next `saved = true`. No `alert()`, no thrown error, no console-only error.
- **Acceptance:**
  - A failed write shows the message; a successful write clears it (Q-1).
  - The region has `role="alert"` (NFR-4).
  - The message does not hide the list or disable the page (Q-1, "the in-memory list keeps working").
  - On page load, when the store reports storage unavailable, the same message is shown before the first render. It clears on the next successful save (R-2).

### T12. Habit List Renderer (P0)
- **Deliverable:** renders from `store.getHabits()` with the `dateKey` from the clock at render time. Each habit is an `<li>` with:
  - a native checkbox, labelled by the habit name;
  - the name as `textContent`;
  - a `Delete` button with `aria-label="Delete <name>"`.
  - The empty-state region shows only when the list is empty.
  - Re-renders fully after every change (§6).
- **Acceptance:**
  - Checked is `completedOn === dateKey` (FR-12, A-2).
  - Duplicate names render as separate rows (FR-13).
  - A name such as `<img src=x onerror=...>` is shown as text and does not execute (§12, R-10).
  - Empty state is shown only with zero habits (FR-7).

### T13. Check and uncheck with focus restore (P0)
- **Deliverable:** on checkbox change, the renderer calls `clock.todayKey()` if checked and then `store.toggleToday(id, checked, dateKey)`. After the re-render, focus returns to the checkbox for that habit `id` (E-1).
- **Acceptance:**
  - Checking applies the completed style; unchecking removes it (AC 2.2, 2.3).
  - Focus is on the same habit's checkbox after re-render, both after check and after uncheck (E-1, DR-01).
  - The date written is the displayed date (E-3), so a check at 23:59:59 is stored under the displayed date (§17).

### T14. Delete with confirmation (P0)
- **Deliverable:** the Delete button calls `window.confirm("Delete <name>?")`. On `true`, the store removes the habit, the list re-renders, and focus moves to the Add input (§9.3). On `false`, nothing changes and the list is not re-rendered (PA-8).
- **Acceptance:**
  - Cancelling leaves the habit in the list and in storage (FR-9).
  - Confirming removes the row and the stored habit (FR-9, FR-10).
  - When `confirm` returns `false` because the browser suppressed dialogs, no message is shown. This is accepted behaviour (R-4, DR-07).

### T15. Add input controller (P0)
- **Deliverable:** on Enter or the Add button, the controller trims the text.
  - If empty, it does nothing: no error, no change to the input (FR-3).
  - Otherwise it calls `store.addHabit(name)`.
  - If `saved`, it clears the input and focuses it (FR-4).
  - If not saved, it keeps the text, and focus stays in the input. The row still appears through the store notification (PENDING-2 / E-2).
- **Acceptance:**
  - Placeholder and button text match §14.2.
  - Enter and the button both add (FR-2).
  - Whitespace-only input is ignored, and the store is not called (FR-3, PA-7).
  - Two identical names produce two rows (AC X.1).

### T16. Bootstrap and integration (P0)
- **Deliverable:** on load, the page:
  1. loads the store;
  2. shows the save-state from the load result (the T11 warning if storage is unavailable on load), before the first render;
  3. renders;
  4. subscribes the renderer and error display to the store;
  5. binds the input and list handlers;
  6. starts `clock.onRollover`, which re-renders with the new date key.
  - No write is made on rollover (§10). No write is made on load for the warning.
- **Acceptance:**
  - Habits persist across reload (FR-11, AC 4.2).
  - A habit checked yesterday shows unchecked today on load (FR-12, AC 4.3).
  - Rollover at midnight re-renders all rows as unchecked, with no storage write (OI-6, §9.5).
  - No script error on an empty store, on corrupt data, or with storage disabled (R-2, R-3).
  - With storage disabled at page load, the warning is visible on first render, and the list still works in memory (R-2).

### T17. Unit tests: Day Clock and Store (P0)
- **Deliverable:** `test/clock.test.ts` and `test/store.test.ts`, covering the §17 list:
  - midnight rollover (timer fires; a check at 23:59:59 is stored under the displayed date);
  - recheck on `visibilitychange` and `focus`;
  - a stale `completedOn` shown as unchecked on load (through the store and clock, with the render result in T18);
  - add and toggle with a failing write (quota exceeded and storage disabled), with `saved = false`;
  - unreadable data backed up before the first write, and the backup not overwritten;
  - duplicate IDs regenerated on load.
- **Acceptance:** all tests pass under `npm test`. Each §17 item has at least one named test.

### T18. DOM behaviour tests (P0)
- **Deliverable:** `test/ui.test.ts` drives the page through jsdom events and checks the DOM and storage.
- **Acceptance:**
  - Covers AC 1.1 to 1.4, 2.1 to 2.4, 3.1, 3.2 (confirm and cancel), 4.1 to 4.3, and AC X.1.
  - Keyboard-only path: Tab to input, type, Enter adds; Tab to a checkbox, Space toggles, focus stays on that checkbox (NFR-4, E-1).
  - Failed add: text kept, alert shown, row shown (E-2).
  - Storage problems on load (R-2): storage disabled shows the warning on load, before any change; storage available shows no warning on load; when storage recovers, the load-time warning clears after the next successful save.
  - All tests pass under `npm test`.

### T19. Static checks (P1)
- **Deliverable:** `test/static-checks.test.ts` reads the three assets and checks:
  - no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, or `eval` / `new Function` in `app.js`;
  - no `http://` or `https://` in `index.html`, `styles.css`, or `app.js` (no external resources, NFR-3);
  - no `type="module"` in `index.html` (§5.1);
  - no `fetch`, `XMLHttpRequest`, `WebSocket`, or `sendBeacon` in `app.js` (NFR-3);
  - no `console.` call in the normal path of `app.js` (no telemetry, DR-13).
- **Acceptance:** all checks pass under `npm test`. Any hit fails the test.

### T20. Browser verification matrix (P1, manual)
- **Deliverable:** a test record listing, for latest evergreen Chrome, Edge, Firefox, and Safari (NFR-5), the results of:
  - layout at desktop and phone widths (NFR-1);
  - keyboard-only add, check, uncheck, and delete, and focus restore (NFR-4, E-1);
  - the save-failure path (E-2), using storage disabled or quota exceeded;
  - the midnight rollover (E-7) by changing the device clock or waiting, if practical.
- **Acceptance:** every listed item has a pass or fail entry for each browser. Browsers not available in the environment are marked "not run", not "pass". Browser testing is a verification item, not a design decision (§10).

### T21. Delivery check (P2)
- **Deliverable:** a record of:
  - opening `index.html` directly from disk (`file://`) in each browser and confirming it works (C-1, §5.1);
  - serving the folder with any static server and confirming the same;
  - a DR-12 check: whether two local `file://` pages share `localStorage` in each browser. If they do, the record notes that, and the key is not changed in this plan.
- **Acceptance:** the folder contains only the three assets plus README. No build output, no generated files.

### T22. Package README (P2)
- **Deliverable:** `packages/habit-tracker-ui/README.md`, covering:
  - how to open the page (disk or static server);
  - the storage keys and the backup key;
  - the daily reset rule (A-2, A-3);
  - known constraints: storage quota (R-1), storage disabled (R-2), single tab per origin (R-5, DR-02), and no performance target (DR-11);
  - how to run the tests.
- **Acceptance:** each statement matches the approved design. No new feature is described.

## 8. Dependency Summary and Parallel Work

### 8.1 Direct prerequisites (complete list, checked for cycles)

| Task | Prerequisites | Task | Prerequisites |
|---|---|---|---|
| T01 | — | T12 | T03, T07, T09 |
| T02 | T01 | T13 | T12 |
| T03 | T02 | T14 | T12 |
| T04 | T03 | T15 | T08, T11, T12 |
| T05 | T02 | T16 | T04, T11, T13, T14, T15 |
| T06 | T05 | T17 | T04, T08 |
| T07 | T06 | T18 | T16 |
| T08 | T07 | T19 | T16 |
| T09 | T01 | T20 | T18, T19 |
| T10 | T09 | T21 | T19 |
| T11 | T08, T09 | T22 | T16 |

Every prerequisite refers to a defined task (T01–T22). The graph has no cycle. Each task appears after all of its prerequisites in the table order.

### 8.2 Execution order (topological)

`T01 → T02 → {T03 → T04} ∥ {T05 → T06 → T07 → T08} ∥ {T09 → T10} → T11 → T12 → {T13 ∥ T14} → T15 → T16 → {T17 ∥ T18 ∥ T19 ∥ T22} → T20 ∥ T21`

Notes:
- T09 and T10 (markup and CSS) can run alongside the store work (T05–T08).
- T17 can start once T04 and T08 are done, which is before the UI tasks finish.
- T13 and T14 are independent of each other.
- T20 and T21 are independent of each other.

### 8.3 Critical path

**T01 → T02 → T05 → T06 → T07 → T08 → T11 → T15 → T16 → T18 → T20** (11 tasks). The path runs through the store and the add flow, which are the most dependent parts. Any slip in T05–T08 or T15 moves the release date.

## 9. Verification Approach

| Level | Tasks | Method | Pass condition |
|---|---|---|---|
| Unit | T03, T04, T05, T06, T07, T08 (via T17) | Jest + jsdom, fake timers, injected `now()`, stubbed `localStorage` that throws | Each §17 item has a passing named test |
| DOM behaviour | T11–T16 (via T18) | Jest + jsdom, real `app.js` through `loadApp` | AC 1.1–4.3 and AC X.1 pass; focus and error paths pass |
| Static | T19 | Jest reads the source files | No forbidden pattern found |
| Browser | T20 | Manual, latest evergreen Chrome, Edge, Firefox, Safari | Each listed item passes or is recorded as "not run" |
| Delivery | T21 | Open from disk and from a static server | Works from both; no build artifacts |
| Commands | all code tasks | `npm test` and `npm run lint` from the repo root | Both pass with no new warnings in the new files |

**Limits of verification (carried from architecture §17):** jsdom does not render layout, does not run real browser dialogs, and does not check screen-reader output. Those are covered only by T20. Design-review items DR-01, DR-03, and DR-08 are checked in T18 and T20. DR-11 (no performance target) is not verified because no target was set (§11).

## 10. Approval Gate

Approval of this plan is requested before any implementation. The following decisions are included in that request:

1. The file layout in §4, including `packages/habit-tracker-ui/` and no `package.json` (PA-2, PA-3).
2. The Jest and jsdom approach, `*.test.ts` under `test/`, with no root Jest config change (PA-4).
3. The proposed inline error text in PA-9.
4. The assumptions in §2 (PA-6 to PA-10, including OI-4, OI-5, and OI-7).

**Status: Approved** by the human owner on 2026-11-16T22:20:28.390+05:30. The approved decisions are items 1 to 4 above, including the save-error text in item 3. `stages.implementationPlan` is recorded as `completed` in `pipeline-state.json`.

## 11. Excluded and Not Planned

These items were considered and are **not** in any task. Adding any of them needs a requirement or design change first.

| Item | Source | Reason |
|---|---|---|
| Content-Security-Policy meta tag | DR-13 (Informational) | Not required by any requirement. Could be a later decision. |
| Client-side error logging or telemetry | DR-13 | Not required. T19 checks that none is added. |
| Performance target for large lists | DR-11, NFR-6 | No target was given. The owner can set one later. |
| `storage` event listener (cross-tab sync) | R-5, DR-02 | Single tab per origin is confirmed (PENDING-1). |
| In-page modal for delete | OI-7 | Native `window.confirm` is the assumption. A change would re-plan T14. |
| Purge of stale completion data | OI-5, A-3, R-7 | Keep-and-ignore is the assumption. |
| Streak counter; clear or reset of all data; editing a habit name | Requirements §7 | Out of scope (human answers 2 and 3). |
| Backend, external APIs, accounts, sync | Requirements §7, NFR-3 | Out of scope. |
| Hosting target and deployment pipeline | Architecture §5 | Delivery is static files (T21). No host is chosen by this ticket. |
| Build tooling, framework, CSS library | NFR-2, PA-1 | Not allowed or not needed. |
| Formal WCAG testing | Requirements §7, NFR-4 | Out of scope (answer 6). |

## 12. Open Items Carried Forward (not blocking)

| Item | Status | Effect on this plan |
|---|---|---|
| OI-1 (Jira export metadata) | Not a product item. Requirements header only. | None. |
| DR-09 (Q-1 provenance gap in the requirements) | Documentation follow-up for the owner. Not changed in this stage. | None on the tasks. Record it when the owner chooses. |
| OI-4, OI-5, OI-7 | Accepted assumptions (PA-10). | Re-plan only if the owner reverses one. |
| DR-11, DR-12, DR-13 | See §11 and T21. | T21 records DR-12. The rest are excluded. |

## 13. Blocked Tasks

**None.** No task depends on an unresolved decision or missing prerequisite. Every open item is an accepted assumption (PA-10) or a proposal awaiting approval (§10). If the owner rejects a proposal, the affected tasks are re-planned and re-approved, not marked as blocked.

| Task | If the owner changes… | Unblock / re-plan condition |
|---|---|---|
| T01, T02, T17, T18, T19 | The file layout (PA-2) or test approach (PA-4) | Owner confirms the new layout or approach; affected paths in §4 are updated |
| T11, T15 | The error text (PA-9) | Owner confirms the new text. No task order change |
| T14 | The delete mechanism (OI-7) | Owner chooses an in-page modal; T14 is re-planned with its accessibility work |

## 14. Plan Quality Checks Performed

- Every task ID is unique (T01–T22).
- Every task has a deliverable and acceptance criteria (§7).
- Every dependency names a defined task (§8.1).
- The order respects dependencies (§8.2). The graph has no cycle.
- Every FR-1 to FR-13, NFR-1 to NFR-6, and AC 1.1–4.3 and AC X.1–X.2 appears in at least one task's map column (§6). AC X.2 is verified in T20.
- No task adds a feature outside the requirements and architecture.
