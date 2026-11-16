# EPMCDMETST-72536: Implementation Summary

| Field | Value |
|---|---|
| Stage | 5 - Implementation |
| Branch | `feature/EPMCDMETST-72536-habit-tracker` (created from HEAD `3443285`) |
| Plan | [04-impl-plan.md](04-impl-plan.md) (approved; not edited) |
| Gate 1 (scope) | Approved by the human owner in the run request: T01 to T22, implement T01 to T16, then T17 to T18, then the T19 checks. |
| Gate 2 (acceptance) | Approved by the human owner, with one decision recorded in section 6: the storage-disabled inline warning is also shown on page load. T20 and T21 are deferred by the human owner (section 1). |
| Commit / push / PR | Not done. All changes are uncommitted. |

## 1. Task status

| Task | Priority | Status | Notes |
|---|---|---|---|
| T01 Placeholder files | P0 | Done | Files created with marker comments, then replaced by later tasks. See Deviations. |
| T02 Test harness (`loadApp`) | P0 | Done | [test/helpers/loadApp.ts](../../packages/habit-tracker-ui/test/helpers/loadApp.ts) |
| T03 Day Clock: local date key | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T04 Day Clock: midnight timer and recheck | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T05 Store: load and validate | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T06 Store: backup and duplicate IDs | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T07 Store: mutations and full write | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T08 Store: write-failure handling | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T09 Page shell (`index.html`) | P0 | Done | [index.html](../../packages/habit-tracker-ui/public/index.html) |
| T10 Styles (`styles.css`) | P0 | Done | [styles.css](../../packages/habit-tracker-ui/public/styles.css) |
| T11 Save-state display | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js). Load-time warning added after approval (section 6). |
| T12 Renderer: rows and render | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T13 Renderer: check and focus | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T14 Renderer: delete with confirm | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T15 Input controller | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T16 Bootstrap (`start` / `stop`) | P0 | Done | [app.js](../../packages/habit-tracker-ui/public/app.js) |
| T17 Unit tests: clock and store | P0 | Done | [clock.test.ts](../../packages/habit-tracker-ui/test/clock.test.ts), [store.test.ts](../../packages/habit-tracker-ui/test/store.test.ts) |
| T18 DOM behaviour tests | P0 | Done | [ui.test.ts](../../packages/habit-tracker-ui/test/ui.test.ts) |
| T19 Static checks | P1 | Done | [static-checks.test.ts](../../packages/habit-tracker-ui/test/static-checks.test.ts) |
| T20 Browser verification matrix (manual) | P1 | Deferred | Reason: manual, deferred by human owner. Not run. Open follow-up for verification (section 5, item 3). Do not treat as passed. |
| T21 Delivery check (`file://` and static server, DR-12) | P2 | Deferred | Reason: manual, deferred by human owner. Not run. Open follow-up for verification (section 5, items 3 and 4). Do not treat as passed. |
| T22 Package README | P2 | Done | [README.md](../../packages/habit-tracker-ui/README.md) |

Summary: 19 of 22 tasks done. T20 and T21 are deferred by the human owner (reason: manual, deferred by human owner) and were not run. They are open follow-ups for verification, not passed. Blocked tasks: none.

## 2. Files created

- `packages/habit-tracker-ui/public/index.html`
- `packages/habit-tracker-ui/public/styles.css`
- `packages/habit-tracker-ui/public/app.js`
- `packages/habit-tracker-ui/test/helpers/loadApp.ts`
- `packages/habit-tracker-ui/test/clock.test.ts`
- `packages/habit-tracker-ui/test/store.test.ts`
- `packages/habit-tracker-ui/test/ui.test.ts`
- `packages/habit-tracker-ui/test/static-checks.test.ts`
- `packages/habit-tracker-ui/README.md`
- `Docs/EPMCDMETST-72536/05-implementation-summary.md` (this file)

Also changed: `Docs/EPMCDMETST-72536/pipeline-state.json` (`implementation` entry only), `Docs/EPMCDMETST-72536/02-architecture.md` (section 6 Store row, R-2, and section 13.1(c), for the load-time warning in section 6 below), and `Docs/EPMCDMETST-72536/04-impl-plan.md` (T08, T11, T16, and T18 acceptance criteria for the load-time warning, approved by the human owner; status line unchanged).

Not changed: root `jest.config.js`, root `package.json`, other packages, `03-design-review.md`, the other tickets' folders. The pre-existing uncommitted changes in the working tree were left as they were.

## 3. Verification

### 3.1 Package tests

Command: `npx jest packages/habit-tracker-ui` (re-run after the section 6 change, and again at the final stage with no code change)

```
PASS packages/habit-tracker-ui/test/static-checks.test.ts
PASS packages/habit-tracker-ui/test/clock.test.ts
PASS packages/habit-tracker-ui/test/store.test.ts
PASS packages/habit-tracker-ui/test/ui.test.ts

Test Suites: 4 passed, 4 total
Tests:       52 passed, 52 total
```

Before the section 6 change the count was 49 of 49. The 3 new tests are in `ui.test.ts` (section 6).

The Jest "Unknown option overrides" warning comes from the root config, which was not changed.

### 3.2 Root test suite

Command: `npm test` (root). Run before the section 6 change, not re-run after it. The figures below are from that earlier run and are stale. The change adds 3 tests to `habit-tracker-ui`.

```
Test Suites: 3 failed, 29 passed, 32 total
Tests:       245 passed, 245 total
```

- The 3 failing suites are all in `packages/login-page-ui/src/test/` (`ErrorDisplay.test.tsx`, `authService.test.ts`, `InputField.test.tsx`). They did not run because they fail to compile. The cause is other uncommitted work in that package (for example, `Cannot find module '../InputField'`). This ticket did not touch that package. These are unrelated baseline failures.
- All 4 `habit-tracker-ui` suites passed within the root run.

### 3.3 Lint

Command: `npm run lint` (root, `tsc --build --noEmit`)

- Exit code 1, with 2 errors: `TS6310` in `packages/docsync-cli/tsconfig.json` and `packages/docsync-vscode-extension/tsconfig.json`. Those tsconfig files are unmodified. These are unrelated baseline errors.
- The lint script does not include `packages/habit-tracker-ui`, so the new files are not covered by it (see Open issues).

### 3.4 Type-check of the new files (ad hoc)

Command: `npx tsc --noEmit --strict --target ES2022 --module commonjs --moduleResolution node --lib ES2022,DOM --types jest,node --esModuleInterop --skipLibCheck` with the five new TypeScript files listed.

- Exit code 0, no errors.

### 3.5 Syntax check

Command: `node --check packages/habit-tracker-ui/public/app.js`: OK. No `@@T` markers remain in `app.js`.

## 4. Deviations from the plan

1. T01 files were created with marker comments, not empty. The edit tool cannot edit an empty file. Later tasks replaced all the markers.
2. Directories were created with PowerShell `New-Item`. No file contents were written by PowerShell.
3. The input controller keeps focus in the input even when the save fails. The plan says focus "stays in" the input. The text is kept so the user can retry.
4. The input has `aria-label="New habit name"` in addition to the placeholder. This is within NFR-4 and T09.
5. The save-error region is always in the DOM (not `hidden`). This keeps the `role="alert"` live region reliable. When empty, it is collapsed with CSS.
6. T17's clock tests use a `setVisibility` helper to override `document.visibilityState`, so the visibility tests can run under jsdom.
7. T19's check for `innerHTML` also covers comments in `app.js`. A comment was reworded so it does not contain the forbidden word.
8. The `app.js` check for `console.` covers the whole file, not only the "normal path". No console calls exist, so this is stricter than the plan.

## 5. Open issues and follow-up decisions

1. **Storage-disabled warning on load.** Resolved (human decision). The inline warning is now shown on page load when storage is unavailable at startup, as well as after a failed write. See section 6. Architecture §13.1(c) and plan T08, T11, T16, and T18 are updated.
2. **Lint does not cover the new package.** The root `npm run lint` script does not include `packages/habit-tracker-ui`. The plan (T02) says to note this and not change the config. Decision needed: add the package to the lint references (a config change, outside this ticket's scope as stated), or accept the ad hoc type-check.
3. **T20 browser matrix deferred (open follow-up for verification).** Deferred by the human owner: manual, deferred by human owner. Not run. Still needed: layout at desktop and phone widths, keyboard-only flows, the save-failure path, and rollover, in Chrome, Edge, Firefox, and Safari. Not claimed as passed.
4. **T21 delivery check deferred (open follow-up for verification).** Deferred by the human owner: manual, deferred by human owner. Not run. Still needed: open from disk (`file://`) and from a static server.
5. **DR-12 (shared `file://` storage)** has not been checked in any browser. Part of T21, deferred (open follow-up).
5. **Root `npm test` has 3 failing login-page-ui suites** from other uncommitted work. They are not caused by this ticket. They should be resolved in that work before any merge that runs the full suite.
6. **Test `file` placement.** Tests are under the package's `test/` folder, so the root Jest config picks them up with no change. No `package.json` was added (PA-3).
7. **Commit and push** have not been done. Code review is pending.

## 7. Code review fixes (2026-11-16)

The human owner approved the code review (`06-code-review.md`). This pass applied CR-02, CR-03, CR-04, CR-05, CR-07, CR-08, CR-09, and CR-10:
- `public/app.js`: non-empty trimmed name check in `isValidEntry` (CR-05); focus restored to the same habit after a render (CR-03); local `habits` renamed `currentHabits` (CR-08); planning IDs removed from comments (CR-07).
- `public/styles.css`: completed-text colour `#616e7c` (CR-04).
- `test/helpers/loadApp.ts`: shared storage keys, `storedRecords()`, and `setVisibility()` exported (CR-09). The three jsdom test files import them.
- `test/ui.test.ts`, `test/store.test.ts`: keyboard, rollover, backup-failure, accessibility, focus, and empty-name tests added (CR-02, CR-03, CR-05).
- `README.md`: test-run and limits text (CR-10).

Decisions recorded by default option: CR-01 (declared devDependency; already in the working tree), CR-06 (accept as designed), CR-11 (no config change), CR-12 (track separately; root dependencies unchanged).

Result: `npx jest packages/habit-tracker-ui` gives 4 of 4 suites and 60 of 60 tests passing (was 52). Details in `06-code-review.md` section 6A.

## 6. Post-approval change: load-time storage warning

**Human decision (2026-11-16):** the storage-disabled inline warning is shown on page load when storage is unavailable at startup, in addition to after a failed write. The human owner approved the implementation with this decision.

**Code change** ([app.js](../../packages/habit-tracker-ui/public/app.js)):
- `load()`: when the storage read throws, the catch branch also sets `lastSaved = false` (it still starts empty, with no backup and no write).
- `start()`: after `store.load()`, calls `renderSaveState({ saved: lastSaved })` before the first render. The existing inline error region shows the warning on load.
- The existing rules still apply: the warning clears on the next successful save, and the list keeps working in memory. No new DOM element, no new CSS, and no change to `index.html` or `styles.css`.

**Test change** ([ui.test.ts](../../packages/habit-tracker-ui/test/ui.test.ts), "storage problems on load"):
- New: storage disabled shows the warning on load, before any change.
- New: storage available shows no warning on load (guards against a false warning).
- New: when storage recovers, the load-time warning clears after the next successful save.
- Existing tests unchanged. Result: `npx jest packages/habit-tracker-ui` gives 52 of 52 passing (section 3.1).

**Docs updated:**
- [02-architecture.md](02-architecture.md) §13.1(c) states the load-time warning. R-2 mitigation and the section 6 Habit Store row are aligned with it. No requirement ID or section was added.
- [04-impl-plan.md](04-impl-plan.md) was edited in place on the human owner's approval. T08 (Habit Store), T11 (inline error display), T16 (bootstrap and page load), and T18 (DOM tests) now cover the load-time warning. No section or requirement ID was added. The plan's "Approved" status line was not changed.

**Approval status:** Gate 2 accepted by the human owner, including the section 6 decision. The human owner also decided that T20 and T21 are deferred (reason: manual, deferred by human owner). They are recorded as deferred open follow-ups for verification, not as passed. Because the human owner made this scope decision, `stages.implementation` is recorded as `completed` with `approvedAt` set. Remaining open follow-ups: T20 (browser matrix), T21 (delivery check), and DR-12 (sections 5.3 to 5.5).

