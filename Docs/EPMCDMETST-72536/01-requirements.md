# EPMCDMETST-72536: Static Web Page UI

| Field | Value |
|---|---|
| Source file | [Jira Requirements/EPMCDMETST-72536.txt](../../Jira%20Requirements/EPMCDMETST-72536.txt) (found in workspace; not regenerated) |
| Jira URL | https://jiraeu.epam.com/browse/EPMCDMETST-72536 |
| Project | EPM-CDME-TEST (EPMCDMETST) |
| Issue type | Story (per raw payload `issue_type.name`; header field blank, see OI-1) |
| Status / Priority | Open / Average |
| Reporter | Deepak Kumar2 |
| UI baseline | Jira `customfield_12700` ("UI Requirements & Acceptance Criteria: Simple Habit Tracker"), used as-is |
| Stage status | `completed` (approved 2026-11-16T21:45:08+05:30) |

## 1. Goal

As a user, I want a lightweight, client-side habit tracker with local storage persistence so that I can
easily add, check off, and manage my daily habits without needing a backend database or external APIs.
(Ticket description.)

## 2. Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| FR-1 | The page has a text input for a new habit name, showing the placeholder "Enter a new habit...". | Spec Feature 1, AC 1.1 |
| FR-2 | A new habit is added by clicking the "Add Habit" button or pressing Enter while the input holds non-empty text. The habit appears in the list immediately. | Spec Feature 1, AC 1.2 (see OI-3) |
| FR-3 | An empty or whitespace-only habit name is not added. The action is silently ignored (no error message) and the page does not crash. | Spec Feature 1, AC 1.3 (see OI-2) |
| FR-4 | After a successful add, the input clears and regains focus. | Spec Feature 1, AC 1.4 |
| FR-5 | Each habit row shows its name and a checkbox or toggle for today's completion. | Spec Feature 2, AC 2.1 |
| FR-6 | Checking a habit applies a completion style (for example strike-through or muted colour). Unchecking reverts it. | Spec Feature 2, AC 2.2, AC 2.3 |
| FR-7 | When no habits exist, the page shows the empty-state message "No habits added yet. Start by adding one above!". | Spec Feature 2, AC 2.4 |
| FR-8 | Each habit row has a delete control (icon or "Delete" text). | Spec Feature 3, AC 3.1 (see OI-4) |
| FR-9 | **Updated AC 3.2:** Clicking delete opens a confirmation prompt before anything is removed. On confirm, the habit is removed from the list (DOM) and from localStorage. On cancel, nothing changes. | Spec AC 3.2 replaced per human answer 8 (conflict, see section 5) |
| FR-10 | Every add, check, uncheck, and delete writes the updated habit data to localStorage. | Spec Feature 4, AC 4.1 |
| FR-11 | Habits (names and their existence) persist across browser refreshes. | Spec Feature 4, AC 4.2 (first part) |
| FR-12 | **Updated AC 4.2 / new AC 4.3, daily completion reset:** the checked state is tied to the user's local calendar date. Within the same local date, a refresh keeps each habit's checked/unchecked state. When the local date changes, all habits show as unchecked for the new day. | Human answer 4 (conflict, see section 5) |
| FR-13 | Duplicate habit names are allowed. Each row is checked, unchecked, and deleted independently, even when names match. | Human answer 7 |

## 3. Non-Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| NFR-1 | Layout is a centred card with max-width about 600px. It renders cleanly on desktop and mobile viewports. | Spec section 3, Responsive Layout |
| NFR-2 | Pure HTML, CSS, and vanilla JavaScript. No frameworks (React, Vue) and no CSS libraries (Tailwind, Bootstrap CDN) unless loaded locally. | Spec section 3, Zero Dependencies |
| NFR-3 | Data is stored client-side only in browser localStorage. There are no backend database calls and no external API calls. | Ticket description; spec section 1 |
| NFR-4 | Accessibility uses the spec's wording and does not target a WCAG level. Form inputs have associated labels or aria-labels. Interactive elements are keyboard-navigable. | Spec section 3, Accessibility; human answer 6 |
| NFR-5 | Supported browsers are the latest evergreen versions of Chrome, Edge, Firefox, and Safari. | Human answer 5 |
| NFR-6 | The page has no limits. There is no maximum habit name length and no maximum habit count. | Human answer 7 |

## 4. Acceptance Criteria

Criteria are taken from the spec in `customfield_12700`. Changed criteria are marked.

### Feature 1: Habit input
- **AC 1.1** The input shows the placeholder "Enter a new habit...". (FR-1)
- **AC 1.2** Clicking "Add Habit", or pressing Enter, with non-empty text appends the habit to the list immediately. (FR-2)
- **AC 1.3** Empty or whitespace-only input is silently ignored: no habit is added, no error is shown, and nothing crashes. (FR-3; decided in OI-2)
- **AC 1.4** After a successful add, the input clears and regains focus. (FR-4)

### Feature 2: Habit list and checklist
- **AC 2.1** Each habit shows its name and a checkbox or toggle. (FR-5)
- **AC 2.2** Checking applies a completion style (for example strike-through). (FR-6)
- **AC 2.3** Unchecking reverts the completion style. (FR-6)
- **AC 2.4** With no habits, the empty-state message "No habits added yet. Start by adding one above!" is shown. (FR-7)

### Feature 3: Delete habit
- **AC 3.1** Each habit has a delete control (icon or "Delete" text). (FR-8)
- **AC 3.2 (updated)** Clicking delete shows a confirmation prompt. Confirming removes the habit from the DOM and localStorage. Cancelling leaves the habit unchanged.
  - *Original text:* "Clicking the delete button immediately removes the habit from the DOM and local storage."
  - *Changed by:* human answer 8.

### Feature 4: Local storage persistence
- **AC 4.1** Add, check/uncheck, and delete each update localStorage. (FR-10)
- **AC 4.2 (updated)** Refreshing the page keeps all previously added habits. Checked/unchecked states are kept for the same local calendar date only. (FR-11, FR-12)
  - *Original text:* "Refreshing the browser page retains all previously added habits and their current checked/unchecked states."
  - *Changed by:* human answer 4.
- **AC 4.3 (new, derived from answer 4)** Completion state is reset daily. When the user's local calendar date differs from the date a completion was recorded, that habit shows as unchecked. The reset applies on page load and at local midnight (browser time zone) while the page is open. (FR-12; decided in OI-6)

### Cross-cutting
- **AC X.1** Duplicate names can be added. Each row works independently. (FR-13)
- **AC X.2** The layout and accessibility criteria in NFR-1 to NFR-4 are met on all browsers in NFR-5.

## 5. Conflicts Resolved by Human Answers

| Spec item | Conflict | Resolution (binding) |
|---|---|---|
| AC 3.2 (immediate delete) | Conflicts with the confirmation prompt | Confirmation prompt before delete (answer 8). AC 3.2 updated (FR-9). |
| AC 4.2 (checked states persist across refreshes) | Conflicts with daily reset | Checked states reset daily, not a persistent toggle (answer 4). AC 4.2 updated and AC 4.3 added (FR-12). |

## 6. Assumptions and Constraints

- **A-1** The baseline is the UI spec in `customfield_12700`, used as-is (answer 1).
- **A-2** "Local calendar date" means the date in the user's browser time zone.
- **A-3** Completion data recorded for an earlier local date is treated as unchecked. No completion history is kept. Whether old entries are purged from localStorage is not specified (OI-5).
- **A-4** The spec's placeholder, button, and empty-state texts are used verbatim as labels.
- **C-1** Client-side only: HTML, CSS, vanilla JS, and localStorage (NFR-2, NFR-3).
- **C-2** Browser targets are the latest evergreen Chrome, Edge, Firefox, and Safari (NFR-5).
- **C-3** No limits on name length, habit count, or duplicate names (NFR-6, FR-13).

## 7. Out of Scope

- **Streak counter.** The spec's Core Features mention it, but the human ruled it out (answer 2).
- **Clear / reset local data.** The spec's Core Features mention it, but the human ruled it out (answer 3).
- **Jira `customfield_35221`.** This is an unrelated Dutch office-supply list and is excluded (answer 9).
- Backend database, external APIs, user accounts, sync across devices.
- Editing an existing habit name.
- Browsers other than the latest evergreen Chrome, Edge, Firefox, and Safari.
- Formal WCAG conformance testing (answer 6).

## 8. Open Items

Nothing here changes the approved answers above. OI-2, OI-3, and OI-6 were decided at approval (see below). The remaining items were not decided at approval and are carried into architecture as assumptions.

- **OI-1 Jira export field mismatch (not fixed; out of this agent's scope).**
  - **Type** is blank in the header. The raw payload has `"issue_type": {"name": "Story"}`. [`extract-jira-issue.ps1` line 46](../../.github/skills/jira-ticket-export/scripts/extract-jira-issue.ps1) reads `$issue.issuetype.name`, which does not exist in this payload. **Proposed fix:** have the script read `issue_type.name` (with a fallback to `issuetype.name`).
  - **Labels** is blank. [Script line 49](../../.github/skills/jira-ticket-export/scripts/extract-jira-issue.ps1) reads `$issue.labels`, and the payload has no `labels` key at all. This is not a key-name mismatch. **Proposed fix:** confirm in Jira whether the issue has labels. If it does, re-export with `labels` included in the requested fields. If it does not, the blank is correct.
  - Editing the shared export script and re-running the Jira export are outside this requirements agent's remit, so neither was done.
- **OI-2 (resolved)** Empty or whitespace-only input is silently ignored. No inline error is shown. Applied to FR-3 and AC 1.3.
- **OI-3 (resolved)** The add button label is "Add Habit". Applied to FR-2 and AC 1.2.
- **OI-4** Delete control: icon ("🗑️") or "Delete" text? AC 3.1 gives both as examples. Pick one.
- **OI-5** Stale completion data: should entries from earlier local dates be purged from localStorage, or kept but ignored (A-3)?
- **OI-6 (resolved)** Daily reset happens at local midnight in the browser time zone. If the page stays open across midnight, habits reset at that moment. Applied to FR-12 and AC 4.3.
- **OI-7** Confirmation prompt form (native browser dialog or in-page modal). The spec does not say.

## 9. Open Questions

Resolved at approval: OI-2, OI-3, OI-6. Still open and carried into architecture as assumptions: OI-1, OI-4, OI-5, OI-7.
