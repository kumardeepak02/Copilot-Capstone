/** @jest-environment jsdom */
/// <reference lib="dom" />
/**
 * EPMCDMETST-72536: DOM behaviour tests (architecture section 9, 17; T18).
 * Drives the real index.html and app.js through jsdom events.
 */
import {
  loadApp,
  HabitTrackerNamespace,
  BACKUP_KEY,
  STORAGE_KEY,
  setVisibility,
  storedRecords
} from './helpers/loadApp';

const SAVE_ERROR_TEXT = 'Changes could not be saved in this browser.';

function $(selector: string): HTMLElement {
  const el = document.querySelector(selector);
  if (!el) {
    throw new Error('missing element: ' + selector);
  }
  return el as HTMLElement;
}

function inputEl(): HTMLInputElement {
  return $('#habit-input') as HTMLInputElement;
}

function rows(): HTMLLIElement[] {
  return Array.from(document.querySelectorAll<HTMLLIElement>('#habit-list > li'));
}

function addHabit(name: string): void {
  inputEl().value = name;
  ($('#add-button') as HTMLButtonElement).click();
}

function checkboxFor(name: string): HTMLInputElement {
  const row = rows().find((li) => li.querySelector('.habit-name')?.textContent === name);
  if (!row) {
    throw new Error('no row for ' + name);
  }
  return row.querySelector('input[type="checkbox"]') as HTMLInputElement;
}

// Local midnight is 12 hours after the 12:00 start time used in beforeEach.
const TO_MIDNIGHT_MS = 12 * 60 * 60 * 1000 + 1000;

describe('Habit Tracker page (DOM behaviour)', () => {
  let app: HabitTrackerNamespace | undefined;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 16, 12, 0, 0) });
    window.localStorage.clear();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    app?.stop();
    app = undefined;
    jest.useRealTimers();
    jest.restoreAllMocks();
    setVisibility('visible');
  });

  describe('add habit (AC 1.1 to 1.4, FR-1 to FR-3)', () => {
    it('shows the empty state with no habits and hides it after an add', () => {
      app = loadApp();
      expect($('#empty-state').hidden).toBe(false);
      addHabit('Read');
      expect($('#empty-state').hidden).toBe(true);
      expect(rows()).toHaveLength(1);
    });

    it('adds a trimmed habit, clears the input, and keeps focus in the input', () => {
      app = loadApp();
      addHabit('  Read a book  ');
      expect(rows()[0].querySelector('.habit-name')?.textContent).toBe('Read a book');
      expect(inputEl().value).toBe('');
      expect(document.activeElement).toBe(inputEl());
    });

    it('ignores empty and whitespace-only input without adding a row', () => {
      app = loadApp();
      addHabit('   ');
      addHabit('');
      expect(rows()).toHaveLength(0);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('submits on Enter (form submit) as well as the Add button', () => {
      app = loadApp();
      inputEl().value = 'Walk';
      $('#habit-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      expect(rows().map((li) => li.querySelector('.habit-name')?.textContent)).toEqual(['Walk']);
    });

    it('keeps habits after a reload (AC 1.4 persistence)', () => {
      app = loadApp();
      addHabit('Stretch');
      app.stop();
      app = loadApp();
      expect(rows().map((li) => li.querySelector('.habit-name')?.textContent)).toEqual(['Stretch']);
    });
  });

  describe('check and uncheck (AC 2.1 to 2.4)', () => {
    it('checking marks the habit done for today and stores the date', () => {
      app = loadApp();
      addHabit('Run');
      const box = checkboxFor('Run');
      box.click();
      expect(rows()[0].classList.contains('habit--done')).toBe(true);
      const stored = storedRecords();
      expect(stored.habits[0].completedOn).toBe('2026-11-16');
    });

    it('unchecking clears completion', () => {
      app = loadApp();
      addHabit('Run');
      checkboxFor('Run').click();
      checkboxFor('Run').click();
      expect(rows()[0].classList.contains('habit--done')).toBe(false);
      expect(storedRecords().habits[0].completedOn).toBeNull();
    });

    it('keyboard toggle keeps focus on the same checkbox (NFR-4, E-1)', () => {
      app = loadApp();
      addHabit('Run');
      addHabit('Read');
      checkboxFor('Read').focus();
      checkboxFor('Read').click();
      const active = document.activeElement as HTMLInputElement;
      expect(active.type).toBe('checkbox');
      expect(active.dataset.habitId).toBe(checkboxFor('Read').dataset.habitId);
      expect(active.closest('li')?.querySelector('.habit-name')?.textContent).toBe('Read');
    });

    it('Enter in the input submits the add form (keyboard path, NFR-4)', () => {
      app = loadApp();
      inputEl().value = 'Walk';
      inputEl().focus();
      inputEl().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      // jsdom does not perform implicit submission on Enter, so the submit the browser would
      // perform is requested here. Real Enter behaviour is covered by the manual browser matrix.
      ($('#habit-form') as HTMLFormElement).requestSubmit();
      expect(rows().map((li) => li.querySelector('.habit-name')?.textContent)).toEqual(['Walk']);
      expect(document.activeElement).toBe(inputEl());
    });

    it('Space on a focused checkbox toggles it and keeps focus on it (keyboard path, NFR-4)', () => {
      app = loadApp();
      addHabit('Run');
      checkboxFor('Run').focus();
      checkboxFor('Run').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      // Browsers toggle a checkbox on Space by clicking it. jsdom does not, so the click is simulated.
      checkboxFor('Run').click();
      expect(checkboxFor('Run').checked).toBe(true);
      expect(document.activeElement).toBe(checkboxFor('Run'));
    });

    it('a stale completion from a previous day shows as unchecked on load (AC 2.4)', () => {      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, habits: [{ id: 'a', name: 'Run', completedOn: '2026-11-14' }] })
      );
      app = loadApp();
      expect(checkboxFor('Run').checked).toBe(false);
      expect(rows()[0].classList.contains('habit--done')).toBe(false);
    });

    it('re-renders at the date change and clears today-completion (AC 2.4, E-7)', () => {
      app = loadApp();
      addHabit('Run');
      checkboxFor('Run').click();
      expect(checkboxFor('Run').checked).toBe(true);
      app.clock.now = () => new Date(2026, 10, 17, 8, 0, 0);
      window.dispatchEvent(new Event('focus'));
      expect(checkboxFor('Run').checked).toBe(false);
    });
  });

  describe('delete (AC 3.1, 3.2)', () => {
    it('confirm removes the habit and moves focus to the input', () => {
      app = loadApp();
      addHabit('Run');
      ($('.habit-delete') as HTMLButtonElement).click();
      expect(window.confirm).toHaveBeenCalledWith('Delete Run?');
      expect(rows()).toHaveLength(0);
      expect(document.activeElement).toBe(inputEl());
    });

    it('cancel leaves the habit unchanged', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      app = loadApp();
      addHabit('Run');
      ($('.habit-delete') as HTMLButtonElement).click();
      expect(rows()).toHaveLength(1);
      expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });
  });

  describe('list display (AC 4.1 to 4.3)', () => {
    it('lists habits in insertion order', () => {
      app = loadApp();
      addHabit('One');
      addHabit('Two');
      addHabit('Three');
      expect(rows().map((li) => li.querySelector('.habit-name')?.textContent)).toEqual([
        'One',
        'Two',
        'Three'
      ]);
    });

    it('shows names as plain text, never as markup (AC X.1, R-10)', () => {
      app = loadApp();
      addHabit('<img src=x onerror="alert(1)"><b>bold</b>');
      expect(document.querySelector('#habit-list img')).toBeNull();
      expect(document.querySelector('#habit-list b')).toBeNull();
      expect(rows()[0].querySelector('.habit-name')?.textContent).toBe('<img src=x onerror="alert(1)"><b>bold</b>');
    });
  });

  describe('failed write (E-2, Q-1)', () => {
    it('keeps the text and the row, and shows the alert when the add cannot be saved', () => {
      app = loadApp();
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      addHabit('Unsaved habit');
      expect($('#save-error').textContent).toBe(SAVE_ERROR_TEXT);
      expect(inputEl().value).toBe('Unsaved habit');
      expect(rows().map((li) => li.querySelector('.habit-name')?.textContent)).toEqual(['Unsaved habit']);
    });

    it('clears the alert after a later successful save', () => {
      app = loadApp();
      const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      addHabit('First');
      expect($('#save-error').textContent).toBe(SAVE_ERROR_TEXT);
      setSpy.mockRestore();
      addHabit('Second');
      expect($('#save-error').textContent).toBe('');
    });
  });

  describe('storage problems on load', () => {
    it('unreadable data starts empty, is backed up, and the page still works', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken');
      app = loadApp();
      expect($('#empty-state').hidden).toBe(false);
      expect(window.localStorage.getItem(BACKUP_KEY)).toBe('{broken');
      addHabit('Fresh');
      expect(rows()).toHaveLength(1);
    });

    it('a failed backup write still starts empty with no alert and no throw', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken');
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      app = loadApp();
      expect(rows()).toHaveLength(0);
      expect($('#empty-state').hidden).toBe(false);
      expect($('#save-error').textContent).toBe('');
    });

    it('storage disabled: the page loads empty and changes still show in the list', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      app = loadApp();
      addHabit('Memory only');
      expect(rows()).toHaveLength(1);
      expect($('#save-error').textContent).toBe(SAVE_ERROR_TEXT);
    });

    it('storage disabled: the inline warning is shown on page load, before any change', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      app = loadApp();
      expect($('#save-error').textContent).toBe(SAVE_ERROR_TEXT);
      expect(rows()).toHaveLength(0);
    });

    it('storage available: no warning is shown on page load', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, habits: [] }));
      app = loadApp();
      expect($('#save-error').textContent).toBe('');
    });

    it('storage recovers: the load-time warning clears after the next successful save', () => {
      const getSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      app = loadApp();
      expect($('#save-error').textContent).toBe(SAVE_ERROR_TEXT);
      getSpy.mockRestore();
      addHabit('Saved now');
      expect($('#save-error').textContent).toBe('');
    });
  });

  describe('midnight rollover through visibility (AC 2.4, E-7)', () => {
    it('the list re-renders on visibilitychange when the date has changed', () => {
      app = loadApp();
      addHabit('Run');
      checkboxFor('Run').click();
      app.clock.now = () => new Date(2026, 10, 17, 7, 0, 0);
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(checkboxFor('Run').checked).toBe(false);
    });

    it('the timer-driven midnight re-render unchecks the habit and writes nothing to storage', () => {
      app = loadApp();
      addHabit('Run');
      checkboxFor('Run').click();
      const setSpy = jest.spyOn(Storage.prototype, 'setItem');
      jest.advanceTimersByTime(TO_MIDNIGHT_MS);
      expect(checkboxFor('Run').checked).toBe(false);
      expect(setSpy).not.toHaveBeenCalled();
    });

    it('keeps keyboard focus on the same habit checkbox when the midnight re-render rebuilds the list', () => {
      app = loadApp();
      addHabit('Run');
      addHabit('Read');
      const readId = checkboxFor('Read').dataset.habitId;
      checkboxFor('Read').focus();
      checkboxFor('Read').click();
      jest.advanceTimersByTime(TO_MIDNIGHT_MS);
      const active = document.activeElement as HTMLInputElement;
      expect(active.type).toBe('checkbox');
      expect(active.dataset.habitId).toBe(readId);
      expect(active.checked).toBe(false);
    });
  });

  describe('accessible names and roles (NFR-4, plan T09)', () => {
    it('names the input and marks the save error as an alert region', () => {
      app = loadApp();
      expect(inputEl().getAttribute('aria-label')).toBe('New habit name');
      expect($('#save-error').getAttribute('role')).toBe('alert');
    });

    it('wraps each checkbox in a label with the habit name and a named Delete button', () => {
      app = loadApp();
      addHabit('Run');
      const box = checkboxFor('Run');
      const label = box.closest('label');
      expect(label).not.toBeNull();
      expect(label?.querySelector('input')).toBe(box);
      expect(label?.textContent).toBe('Run');
      const deleteButton = $('.habit-delete') as HTMLButtonElement;
      expect(deleteButton.type).toBe('button');
      expect(deleteButton.getAttribute('aria-label')).toBe('Delete Run');
    });
  });
});
