# EPMCDMETST-72536: Design Review

| Field | Value |
|---|---|
| Stage | 3 - Design Review |
| Review date | 2026-11-16 |
| Source requirements | [01-requirements.md](01-requirements.md) (stage `completed`, approved 2026-11-16T21:45:08+05:30; not modified) |
| Architecture reviewed | [02-architecture.md](02-architecture.md) (stage `completed`, approved 2026-11-16T22:00:22+05:30; **modified on approval: E-1 to E-7 applied in place, see §6**) |
| Pipeline status after review | `designReview.status = completed`, approved 2026-11-16T22:09:54.232+05:30 (see §9) |

## 1. Scope

- **In scope:** requirements coverage and traceability, component responsibilities and interfaces, sequence flows, data model, failure modes, trust boundaries, accessibility (NFR-4), browser targets, testability, and the status of open items.
- **Inputs read:** `01-requirements.md`, `02-architecture.md`, `pipeline-state.json`. No other files, tickets, or external systems were used.
- **Assumptions accepted:** OI-1, OI-4, OI-5, and OI-7, per §13.2 of the architecture. Each was checked only for contradiction with the requirements (see DR-14).
- **Method:** each finding cites the architecture section and requirement ID it depends on. Confidence reflects how directly the document supports the finding.

## 2. Overall Assessment

The architecture covers every approved requirement ID (FR-1 to FR-13, NFR-1 to NFR-6, AC set, and assumptions A-1 to A-4 and C-1 to C-3). The design is simple and fits the zero-dependency, client-only constraints. The daily reset uses a per-habit `completedOn` date, which needs no cleanup job. Text rendering uses `textContent`, and the state model is validated on load.

The review found **no blockers and no Critical or High findings**. It found **3 Medium** findings (focus after toggle, cross-tab overwrite, and the add-failure path) and **9 Low** findings. The three decisions it needed (PENDING-1 to PENDING-3) are now resolved (§5). The seven proposed architecture edits (E-1 to E-7, §6) were applied on approval.

## 3. Blockers

**None.** No finding stops implementation planning. The three Medium findings are resolved: DR-01 by E-1, DR-02 by PENDING-1 and E-6, and DR-03 by PENDING-2 and E-2.

## 4. Findings

Severity: Critical / High / Medium / Low / Informational. Confidence: High / Medium / Low.

**Status after approval:** DR-01, DR-02, DR-03, DR-04, DR-05, DR-06, and DR-10 are resolved by E-1 to E-7 and PENDING-1 to PENDING-3 (§5, §6). DR-08 is resolved by PENDING-3. DR-07, DR-09, DR-11, DR-12, and DR-13 remain open at Low or Informational severity and are carried to implementation planning (§7, §8). DR-14 needs no change. The table below is the review-time record and is not edited.

| ID | Severity | Confidence | Finding | Evidence (architecture section; requirement) | Impact | Recommendation |
|---|---|---|---|---|---|---|
| DR-01 | Medium | High | **Keyboard focus is lost after checking or unchecking a habit.** The list is fully re-rendered after every change, but focus handling is specified only for add and delete. | §6 ("Full re-render of the list from state after each change"); §9.2 has no focus step; §9.3 and R-8 cover only add and delete; NFR-4 (interactive elements keyboard-navigable; focus restored after add and delete). | A keyboard user who toggles a habit with Space is returned to the top of the page or the body. They must tab back to their place after every toggle, which weakens NFR-4. | Add a step to §9.2 and R-8: after re-render, restore focus to the checkbox for the same habit `id`. Proposed edit in §6, item E-1. |
| DR-02 | Medium | High | **Cross-tab overwrite causes silent data loss, and the assumption behind it is not recorded.** Each tab keeps an in-memory copy and writes the full object. A stale tab can overwrite another tab's add or delete. The design says no cross-tab sync is required, but no requirement or §13.2 entry states this. | §10 (write rules: full object on every change); §12 ("No cross-tab sync is required"); R-5 ("last write wins; one tab's changes can be overwritten"); requirements A-1 to A-4 and C-1 to C-3 contain no multi-tab statement. Relevant to FR-10 and FR-11. | Habits added or deleted in one tab can disappear after a refresh in another tab. The user sees no error. This is a persistence failure that the requirements do not accept or reject. | Either (a) record "single tab per origin is assumed" as an explicit assumption and get human confirmation (**PENDING-1**), or (b) re-read storage before each write, or add a `storage` event listener. Option (b) is an architecture change and needs approval. |
| DR-03 | Medium | High | **Save-failure path is ambiguous against FR-4 ("after a successful add").** In §9.1, the save-failure branch ends, then the common path renders the new row and clears and focuses the input. The diagram does not say whether a failed save counts as a successful add. | §9.1 (`alt write fails` branch, followed by unconditional `habits changed` / `input cleared and focused`); FR-4; FR-2 ("appears in the list immediately"); Q-1 (inline error; in-memory list keeps working). | Implementers may clear the input when the save failed, so the user loses the typed text even though nothing was saved. Or they may keep the text, which contradicts FR-4 as written. | Decide the behaviour explicitly (**PENDING-2**). Recommended: the row appears and the inline error shows, and the input is kept (not cleared) when the save fails, so the user can retry. Clearing happens only on a successful save. Update §9.1 to match. |
| DR-04 | Low | High | **Verbatim UI text and FR-level traceability are missing from the architecture.** The placeholder, empty-state message, and FR-level mapping do not appear. §14 maps NFRs only. | A-4 (texts used verbatim); FR-1, FR-7; AC 1.1, AC 2.4. §8 says only "empty-state region". §14 covers NFR-1 to NFR-6, not FR-1 to FR-13. | Text drift during implementation. Traceability relies on the reader reading each section. | Add a FR-to-component traceability table and list the verbatim strings: placeholder "Enter a new habit...", empty state "No habits added yet. Start by adding one above!", and button "Add Habit". |
| DR-05 | Low | High | **Interface inconsistencies in the component model.** (a) §7 shows `Clock -> Store: todayKey`, but §8 says the Renderer calls `Clock.todayKey()`, and §9.2 passes no date to `toggleToday(id, checked)` while saying the Store "sets completedOn = today". (b) §8 says the Input Controller calls `List.render()`, but §9.1 uses a "habits changed" event from the Store. (c) Near local midnight, the Renderer and the Store could read different dates. | §7; §8 (Renderer, Store, Input Controller); §9.1; §9.2; FR-12; AC 4.3. | A check made at 23:59:59 could be stored under a different date from the one displayed. Implementers may build different interfaces. | Define one date source: the Store or the Renderer receives an explicit `dateKey` argument. Also define one change-notification mechanism (callback or event). Align §7 and §8. |
| DR-06 | Low | Medium | **Corrupt storage can be overwritten and duplicate IDs on load are not handled.** If the key is unparseable, the store starts empty (§10). The next add or check then overwrites the key, so the recoverable data is lost. §12 and R-3 say to drop invalid entries but do not cover whole-key corruption or duplicate `id` values. | §10 (read rules; write rules); §12 (validate on read); R-3. | Accidental data loss after a damaged write. Duplicate IDs would make per-row actions (FR-13) act on the wrong row. | Keep the unreadable raw value under a backup key before the first write. Define duplicate-ID handling (for example, regenerate IDs on load and write them back). |
| DR-07 | Low | Medium | **If the browser suppresses dialogs, delete does nothing with no feedback.** `confirm()` returns false in that case, which is indistinguishable from the user cancelling. | §6 (native `window.confirm`); R-4 ("Accept as browser behaviour"); FR-9 (on confirm the habit is removed). | The user clicks Delete and nothing happens, with no message. | Accept with a note, or show a brief inline message when `confirm` returns false without a user choice. Decide with DR-02 if the human wants to change the confirmation mechanism (OI-7 assumption). |
| DR-08 | Low | High | **When storage is unavailable, FR-11 cannot be met, and the requirements do not say how to handle it.** R-2 starts empty and shows an inline error. Habits added in that state are not kept across refresh. | R-2; Q-1; FR-11 (habits persist across refresh); NFR-3. | Persistence is absent for users with storage disabled. The design only warns them. | Confirm that the inline warning is the accepted behaviour for this case (**PENDING-3**). If the product owner wants more, the requirements must change first. |
| DR-09 | Low | High | **Provenance of Q-1 is not in the requirements.** §13.1 lists Q-1 under "binding, from requirements", but `01-requirements.md` has no Q-1 entry. The decision is recorded only in the architecture as a human decision. | §13.1; §16; §18; `01-requirements.md` §5 and §9 (no Q-1). | Traceability gap. A reviewer cannot confirm from the requirements that the visible-error behaviour is approved. | Record Q-1 in the requirements decision log by a process the owner chooses, or note in §13.1 that it is an architecture-level human decision. Do not change the requirements in this review. |
| DR-10 | Low | High | **Testability of the midnight rollover is not specified.** The Day Clock reads the wall clock and schedules timers, but no injectable clock or test seam is defined. No test approach exists (§17). | §8 (Day Clock); §9.5; R-6; AC 4.3; §17 ("no test execution"). | Rollover and DST edge cases may not be testable without real time or a browser. | Add a `now()` provider that tests can replace, and a short test plan covering midnight, visibility change, and a stale-date load. |
| DR-11 | Low | Medium | **No performance targets, and NFR-6 is only partly met.** Each change re-renders all rows (O(n)), and localStorage has a practical size ceiling (R-1). NFR-6 says there are no limits. | §6; §14 ("No performance targets were given"); NFR-6; R-1 (rated Low likelihood). | Large lists may become slow. A quota failure is possible at a large but unspecified habit count. The design cannot guarantee NFR-6. | Note the limit explicitly as a known exception. Optionally set a target, for example a list of 500 habits renders within a stated time. Human to decide whether a target is needed (no decision required to proceed). |
| DR-12 | Low | Medium | **localStorage may be shared across local files when the page is opened from disk.** In some browsers, all `file://` pages share one origin. The key `habitTracker.v1` could then collide with another local page. | §5 (file-based serving, §5.1); §12 ("Same-origin"); C-1. | Low likelihood of collision, with possible data corruption or leakage between local pages. Not confirmed for every browser. | Note in the implementation plan. Use a unique key prefix. Verify behaviour per browser during testing. |
| DR-13 | Informational | High | **Not addressed: CSP, client-side error logging, hosting and rollout, and observability.** §5 leaves hosting to the implementation plan. §12 and §14 do not mention a Content-Security-Policy. No error reporting exists. | §5; §12; §14. | Defence-in-depth and supportability gaps. No requirement mandates them. | Note in the implementation plan. Consider a restrictive CSP meta tag (no external scripts are allowed by NFR-2 and NFR-3). |
| DR-14 | Informational | High | **Accepted assumptions checked for contradiction with the requirements.** OI-1: consistent (the architecture says the requirements are correct as approved). OI-4: consistent with FR-8 (icon or text). OI-5: consistent with A-3 (purge not specified). OI-7: consistent with FR-9 (a confirmation prompt is required; form not specified). | §13.2; `01-requirements.md` §6, §8, §9. | None found. | No change needed. Re-check if any of these four items changes status. |

## 5. Decision Log

| Decision | Status | Who confirmed | Notes |
|---|---|---|---|
| Accept OI-1, OI-4, OI-5, OI-7 as assumptions (per §13.2) | Agreed (per instruction) | Human owner (task instruction, 2026-11-16) | No contradiction with the requirements (DR-14). |
| Q-1 visible inline error on save failure | Agreed (architecture approval) | Human owner (architecture stage) | Provenance gap noted in DR-09. |
| PENDING-1: Single-tab assumption vs. cross-tab handling | **RESOLVED** (recommendation: option a) | Human owner (approval instruction, 2026-11-16) | Source: DR-02. Recorded as an assumption that a single tab per origin is used (architecture §13.2, DR-02 row; E-6). No re-read before write and no `storage` listener were added. Option (b) was not chosen. |
| PENDING-2: Is an add that fails to save treated as successful? | **RESOLVED** (recommendation) | Human owner (approval instruction, 2026-11-16) | Source: DR-03. A failed save still shows the new row and the inline error. The input text is kept, and the input is cleared only after a successful save (FR-4). Applied in E-2 (§9.1, §8, §10). |
| PENDING-3: Accept no persistence when storage is disabled, with an inline warning only | **RESOLVED** (recommendation: accept) | Human owner (approval instruction, 2026-11-16) | Source: DR-08. Recorded in architecture §13.1. No requirement change. |
| Apply E-1 to E-7 (all proposed architecture edits) | **Agreed** (Apply all) | Human owner (approval instruction, 2026-11-16) | Applied in place to `02-architecture.md`. See §6. |

All decisions above are recorded with the confirming party. No PENDING item remains.

## 6. Changes Proposed to 02-architecture.md

**Applied on approval.** The human owner chose **Apply** for all seven edits on 2026-11-16. `02-architecture.md` was changed in place, in this ticket's sections only. No requirement IDs were added, and no section was duplicated. Where each edit landed:

| Edit | Finding | Applied in `02-architecture.md` |
|---|---|---|
| E-1 | DR-01 | §6 table; §8 Renderer; §9.2 (new focus step after re-render); §14 NFR-4; §15 R-8 |
| E-2 | DR-03 (PENDING-2) | §8 Store (`addHabit` returns `saved`); §9.1 (input cleared and refocused only on success; a failed add keeps the text and shows the error). Choice: the row is shown and not marked as unsaved. |
| E-3 | DR-05 | §7 diagram; §8 Input Controller, Renderer, Store, and Day Clock; §9.2 (`dateKey` passed explicitly to `toggleToday`). Change notification is a Store `subscribe` listener. |
| E-4 | DR-06 | §8 Store; §10 (backup key, read rules, owned data); §12 stored-data row |
| E-5 | DR-04 | §14.1 FR-to-component traceability; §14.2 verbatim texts |
| E-6 | DR-02 (PENDING-1) | §12 other-tabs row; §13.1 decisions; §13.2 new DR-02 row (confirmed); §15 R-5 |
| E-7 | DR-10 | §8 Day Clock (`now()` injectable); §17 test approach |

The edit details below are the proposals as written. Each is now **APPLIED**.

- **E-1 (DR-01), APPLIED:** Add to §9.2 after the render step: "Restore focus to the checkbox for habit `id` after re-render." Add to R-8: "Focus restored after check and uncheck, by habit id." *Not dependent on a PENDING decision.*
- **E-2 (DR-03, depends on PENDING-2), APPLIED:** In §9.1, make the input clear and refocus happen only on a successful save. On failure, keep the typed text, show the inline error, and show the new row as unsaved (or do not show it; choose one). Clarify whether FR-4 applies.
- **E-3 (DR-05), APPLIED:** In §7 and §8, use one date source. Pass `dateKey` explicitly to `toggleToday` and `addHabit`, or move `todayKey` into the Store. Use one change-notification mechanism.
- **E-4 (DR-06), APPLIED:** In §10 and §12, add: back up an unparseable raw value before the first write; define duplicate-ID handling on load.
- **E-5 (DR-04), APPLIED:** Add a FR-to-component traceability table and the verbatim strings to §8 or §14.
- **E-6 (DR-02, depends on PENDING-1), APPLIED:** Either add the single-tab assumption to §13.2 and mark it confirmed, or add a re-read-before-write step to §10 and §9.2.
- **E-7 (DR-10), APPLIED:** Add an injectable clock and a short test approach to §8 and §17.

## 7. Remaining Risks

- Open at approval (Low or Informational, not blocking): DR-07 (suppressed confirm, accepted as browser behaviour per R-4), DR-09 (Q-1 provenance gap in the requirements), DR-11 (no performance target), DR-12 (shared `file://` storage), DR-13 (CSP and observability). DR-02 is no longer open, as PENDING-1 recorded it as a confirmed assumption.
- Storage-disabled case (DR-08) gives no persistence by agreed decision (PENDING-3). The inline warning is the only mitigation.
- Known unverified claims: NFR-1 (responsive layout), NFR-4 (keyboard and screen-reader behaviour), and NFR-5 (browser support) are design intentions until browser testing is done (§17 of the architecture).
- A failed add now keeps the typed text (PENDING-2). Retrying the same text adds a second row, because duplicate names are allowed (FR-13). This is a known usability consequence and is recorded in the architecture §9.1 note.
- Known unverified claims: NFR-1 (responsive layout), NFR-4 (keyboard and screen-reader behaviour), and NFR-5 (browser support) are design intentions until browser testing is done (§17 of the architecture).
- The focus behaviour described in §9 (DR-01) is now specified by E-1 (focus restored after check and uncheck). It must be verified in browser testing.

## 8. Follow-Up Actions Before Coding

1. Done: PENDING-1, PENDING-2, and PENDING-3 are resolved with the review recommendations (§5).
2. Done: E-1 to E-7 applied to `02-architecture.md` on approval (§6).
3. Open: record the Q-1 provenance (DR-09) in the requirements decision log, or note it in the architecture. The requirements were not changed in this review.
4. Carry the Informational items (DR-12, DR-13) and the performance note (DR-11) into the implementation plan.
5. Re-run this review if the architecture changes again after this approval.
6. Before implementation: browser-verify the focus behaviour (E-1), the save-failure path (E-2), and the midnight rollover (E-7).

## 9. Approval

- Status recorded: `completed`. Approved by the human owner on 2026-11-16 at 22:09:54.232+05:30 (`approvedAt` in `pipeline-state.json`).
- Approval conditions met: PENDING-1, PENDING-2, and PENDING-3 are resolved (§5). No Critical or High finding is open. E-1 to E-7 are applied (§6).
- Source of approval: the human owner's written instruction for this run ("Approve the design review"). The interactive approval prompt (`vscode_askQuestions`) was not available in this session, so the approval was recorded from that instruction.
- Implementation planning has **not** started. It is the next stage and needs its own request.
