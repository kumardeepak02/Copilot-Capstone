# EPMCDMETST-72912: Auto-search tasks list in UI by filtering loaded tasks as the user types

## Source

**Source file:** `Jira Requirements/EPMCDMETST-72912.txt` (generated from JIRA API)  
**Status:** Open  
**Priority:** Blocker  
**Type:** Story  
**Reporter:** Pranav Oza  
**Created:** 2026-11-18T13:29:39.041+0000  
**Updated:** 2026-11-18T13:29:39.041+0000

## Business Context

The Task Manager UI currently loads all tasks via GET /api/tasks and renders them in a single list without any filtering capability. Users cannot quickly find specific tasks from a potentially long list. This enhancement proposes adding a real-time, client-side search/filter feature that dynamically narrows the task list as the user types. The enhancement is **benchmarking-inspired** and leverages the existing UI architecture where tasks are already present client-side after `getTasks()`.

**Goal:** Enable users to quickly locate tasks by typing a search term that filters the already-loaded task list in real time.

## Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| FR-1 | The UI shall display a text input field labeled "task search field" for user input | Ticket description: "search field" and AC: "When I type 'book' into the task search field" |
| FR-2 | As the user types into the search field, the task list shall be filtered to display only tasks whose title matches the search term (case-insensitive substring match) | Ticket description: "filters the currently loaded tasks list as the user types a search term, and immediately displays only the matching tasks" |
| FR-3 | The filtering shall be performed client-side on the already-loaded task list (no API call required) | Ticket description: "filters...the currently loaded tasks list" and "aligned with the existing UI architecture where tasks are already present client-side after getTasks()" |
| FR-4 | Filtered results shall be displayed immediately (real-time/on-change behavior) | Ticket description: "immediately displays only the matching tasks" |
| FR-5 | When the search field is cleared (emptied), the task list shall display all previously loaded tasks | AC: "When I clear the task search field, Then the task list shows...all tasks" |
| FR-6 | The search shall use substring matching (not exact match), allowing matches anywhere in the task title | AC: typing "book" matches "Book flights" |
| FR-7 | The search shall be case-insensitive | Implicit requirement from AC using "book" (lowercase) to match "Book flights" (capitalized) |

## Non-Functional Requirements

| ID | Requirement | Category | Source |
|---|---|---|---|
| NFR-1 | The filter operation shall complete with no perceptible delay as the user types (sub-100ms response time) | Performance | Implicit from "immediately displays" and benchmarking inspiration |
| NFR-2 | The search shall not trigger any network requests or API calls | Performance / Scalability | Ticket description: "filters...the currently loaded tasks list" (client-side only) |
| NFR-3 | The feature shall work with the task list already loaded in memory from the GET /api/tasks response | Compatibility | Ticket description: "aligned with the existing UI architecture where tasks are already present client-side" |

## Acceptance Criteria

1. **AC-1 (FR-1, FR-2, FR-6, FR-7):** Given the task manager is open with tasks loaded, when the user types "book" into the task search field, then only the task "Book flights" is displayed, and "Write quarterly report" and "Pay invoices" are hidden.

2. **AC-2 (FR-5):** Given the user has typed "book" into the task search field (filtering the list), when the user clears the search field, then all three tasks ("Write quarterly report", "Book flights", "Pay invoices") are displayed again.

3. **AC-3 (FR-3):** The filtering operation shall not trigger any HTTP requests (network tab shows no GET /api/tasks or similar calls during typing).

4. **AC-4 (FR-4):** The task list shall update on every keystroke with no visible lag (< 100ms between keystroke and display update).

## Assumptions and Constraints

| Item | Type | Note |
|---|---|---|
| Tasks are already loaded into the UI before the search feature is used | Assumption | Source: "aligned with the existing UI architecture where tasks are already present client-side after getTasks()" |
| Search operates on task title/name field only | Assumption | Source: AC examples use task titles only |
| Substring matching is acceptable (users expect "book" to match "Book flights") | Assumption | Source: AC example uses partial match |
| No backend changes required | Constraint | Source: "filters the currently loaded tasks list" (client-side only) |
| This feature must coexist with the existing task load mechanism | Constraint | Source: "existing UI architecture" |

## Out of Scope

The following items are explicitly or implicitly out of scope:

- Filtering by task priority, due date, status, or other fields (search title only)
- Server-side search (backend filtering)
- Pagination or lazy-loading of search results
- Advanced search operators or regex patterns
- Search history or saved search filters
- Highlighting matching terms within the displayed task title
- Keyboard shortcuts for search field focus

## Clarifications

None. No clarifying questions were necessary; all requirements are stated clearly in the JIRA ticket description and acceptance criteria.

## Open Questions

The following questions are recorded for stakeholder confirmation before development:

1. **Case-sensitivity (RESOLVED):** Should the search be case-insensitive? → Based on AC (lowercase "book" matches capitalized "Book flights"), the answer is **yes, case-insensitive**.

2. **Match location:** Should the search match the beginning of a task title only (prefix match) or anywhere in the title (substring match)? The AC uses "book" matching "Book flights" (found within the title), suggesting **substring match** is intended.

3. **Empty field behavior:** When the search field is empty on page load, should all tasks be displayed? (Implicit yes from AC-2, but confirm.)

4. **Partial task list:** If fewer than the original tasks are loaded (e.g., GET /api/tasks returns only 10 of 50 tasks), does the search filter only the loaded subset? (Assumed yes; confirm if pagination applies.)

5. **Special characters:** How should the search handle special characters in task titles (e.g., "&", "@", quotes)? Should they be matched literally?

## Dependencies & Blocking Issues

- **Dependency:** This feature depends on the existing Task Manager UI with GET /api/tasks endpoint and task list rendering.
- **No blocking issues** noted in JIRA ticket.
- **Priority:** Marked as **Blocker**, indicating high urgency.

## Implementation Notes

- Recommend implementing with a debounced input handler to avoid excessive filtering on each keystroke if the task list is very large.
- Use `String.includes()` or similar for substring, case-insensitive matching (e.g., `taskTitle.toLowerCase().includes(searchTerm.toLowerCase())`).
- Filter should run client-side only; no changes to backend API required.
- Maintain original task list in memory; filtering produces a view, not a mutation.

---

**Document Version:** 1.0  
**Last Updated:** 2026-11-25T12:03:49.793+05:30  
**Status:** Awaiting Approval
