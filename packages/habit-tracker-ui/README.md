# Habit Tracker UI

A static, client-side habit tracker page. Ticket: EPMCDMETST-72536.

## Files

- `public/index.html`: page shell (loads `styles.css` and `app.js` as a classic script).
- `public/styles.css`: layout and styles. No external resources.
- `public/app.js`: all page logic. Exposes one namespace, `window.HabitTracker`.
- `test/`: Jest tests (TypeScript, jsdom per file). `test/helpers/loadApp.ts` loads the real page.

## How to open the page

- Open `public/index.html` directly in a browser (`file://`), or
- serve the `public/` folder with any static server.

No build step and no dependencies are needed.

## Behaviour

- Add a habit with the input and the Add button (or Enter). Empty or whitespace-only names are ignored. Names are trimmed.
- Check a habit to mark it done for today. Uncheck to clear it.
- Delete asks for confirmation with the native dialog. Cancel changes nothing.
- Completions apply to the current local date only. At local midnight the list is re-checked, so yesterday's completions show as unchecked. The page also re-checks when the tab becomes visible or gains focus.
- If a change cannot be saved (storage full or disabled), the page shows "Changes could not be saved in this browser." The change stays on the page for the current session.

## Storage

- Key `habitTracker.v1` in `localStorage`, value `{"version":1,"habits":[...]}`.
- Unreadable data at that key is copied once to `habitTracker.v1.backup` before the page starts empty. An existing backup is never overwritten.
- Data is per browser profile. Two local `file://` pages may share storage (depends on the browser; see the delivery record in the implementation summary).

## Running the tests

From the repository root:

```
npx jest packages/habit-tracker-ui
```

The tests use the root Jest config (`jest.config.js`) and the root devDependency `jest-environment-jsdom`. That config currently has uncommitted changes from other work, so if test results differ, check it first. `npm test` at the root runs all packages.

## Limits

- No server, no accounts, no sync, no telemetry.
- jsdom tests do not check layout, real browser dialogs, or screen-reader output. Those need the manual browser matrix.
- Not yet verified: opening the page from disk (`file://`), the static-server check, and the browser matrix. These manual checks are deferred and have not been run.
