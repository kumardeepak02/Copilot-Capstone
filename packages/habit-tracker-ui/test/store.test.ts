/** @jest-environment jsdom */
/// <reference lib="dom" />
/**
 * EPMCDMETST-72536: Habit Store tests (architecture sections 5 to 10, 17; T17).
 */
import {
  loadApp,
  HabitTrackerNamespace,
  SaveState,
  BACKUP_KEY,
  STORAGE_KEY,
  storedRecords
} from './helpers/loadApp';

describe('Habit Store', () => {
  let app: HabitTrackerNamespace | undefined;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 16, 12, 0, 0) });
    window.localStorage.clear();
  });

  afterEach(() => {
    app?.stop();
    app = undefined;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('load', () => {
    it('starts empty when nothing is stored', () => {
      app = loadApp();
      expect(app.store.load()).toEqual([]);
    });

    it('loads stored habits, keeping completedOn as stored', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, habits: [{ id: 'a', name: 'Read', completedOn: '2026-11-15' }] })
      );
      app = loadApp();
      expect(app.store.getHabits()).toEqual([{ id: 'a', name: 'Read', completedOn: '2026-11-15' }]);
    });

    it('drops entries with an invalid shape and keeps valid ones', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          habits: [
            { id: 'a', name: 'Read', completedOn: null },
            { id: 5, name: 'Bad id', completedOn: null },
            'not an object',
            { id: 'b', name: 'Walk', completedOn: 42 }
          ]
        })
      );
      app = loadApp();
      expect(app.store.getHabits().map((h) => h.id)).toEqual(['a']);
    });

    it('drops entries whose name is empty or whitespace-only (architecture section 12)', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          habits: [
            { id: 'a', name: '', completedOn: null },
            { id: 'b', name: '   ', completedOn: null },
            { id: 'c', name: 'Read', completedOn: null }
          ]
        })
      );
      app = loadApp();
      expect(app.store.getHabits().map((h) => h.id)).toEqual(['c']);
    });

    it('backs up unparseable data to the backup key before the first write', () => {
      const raw = '{this is not json';
      window.localStorage.setItem(STORAGE_KEY, raw);
      app = loadApp();
      expect(app.store.getHabits()).toEqual([]);
      expect(window.localStorage.getItem(BACKUP_KEY)).toBe(raw);
    });

    it('does not overwrite an existing backup', () => {
      window.localStorage.setItem(BACKUP_KEY, 'first backup');
      window.localStorage.setItem(STORAGE_KEY, 'corrupt again');
      app = loadApp();
      expect(window.localStorage.getItem(BACKUP_KEY)).toBe('first backup');
    });

    it('regenerates duplicate IDs on load and keeps both names', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          habits: [
            { id: 'dup', name: 'First', completedOn: null },
            { id: 'dup', name: 'Second', completedOn: null }
          ]
        })
      );
      app = loadApp();
      const habits = app.store.getHabits();
      expect(habits.map((h) => h.name)).toEqual(['First', 'Second']);
      expect(habits[0].id).toBe('dup');
      expect(habits[1].id).not.toBe('dup');
    });

    it('keeps a stale completedOn value as stored (the view decides it is unchecked)', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, habits: [{ id: 'a', name: 'Read', completedOn: '2026-11-14' }] })
      );
      app = loadApp();
      expect(app.store.getHabits()[0].completedOn).toBe('2026-11-14');
      expect(app.clock.todayKey()).toBe('2026-11-16');
    });

    it('starts empty without writing when reading storage throws (storage disabled)', () => {
      const setSpy = jest.spyOn(Storage.prototype, 'setItem');
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      app = loadApp();
      expect(app.store.getHabits()).toEqual([]);
      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe('writes', () => {
    it('addHabit writes the full object with version 1 and reports saved', () => {
      app = loadApp();
      const result: SaveState = app.store.addHabit('Stretch');
      expect(result.saved).toBe(true);
      const stored = storedRecords();
      expect(stored.version).toBe(1);
      expect(stored.habits).toHaveLength(1);
      expect(stored.habits[0].name).toBe('Stretch');
      expect(stored.habits[0].completedOn).toBeNull();
    });

    it('toggleToday stores the given date and clears it on uncheck', () => {
      app = loadApp();
      app.store.addHabit('Stretch');
      const id = app.store.getHabits()[0].id;
      app.store.toggleToday(id, true, '2026-11-16');
      expect(storedRecords().habits[0].completedOn).toBe('2026-11-16');
      app.store.toggleToday(id, false);
      expect(storedRecords().habits[0].completedOn).toBeNull();
    });

    it('toggleToday throws when checked without a date', () => {
      app = loadApp();
      app.store.addHabit('Stretch');
      const id = app.store.getHabits()[0].id;
      expect(() => app?.store.toggleToday(id, true)).toThrow(TypeError);
    });

    it('removeHabit deletes the habit and persists', () => {
      app = loadApp();
      app.store.addHabit('One');
      app.store.addHabit('Two');
      const first = app.store.getHabits()[0].id;
      expect(app.store.removeHabit(first).saved).toBe(true);
      expect(app.store.getHabits().map((h) => h.name)).toEqual(['Two']);
      expect(storedRecords().habits.map((h) => h.name)).toEqual(['Two']);
    });

    it('quota exceeded: add keeps the habit in memory and reports saved false', () => {
      app = loadApp();
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      const states: SaveState[] = [];
      app.store.subscribe((s) => states.push(s));
      const result = app.store.addHabit('Kept in memory');
      expect(result.saved).toBe(false);
      expect(app.store.getHabits().map((h) => h.name)).toEqual(['Kept in memory']);
      expect(states).toEqual([{ saved: false }]);
    });

    it('storage disabled: toggle keeps the change in memory and reports saved false', () => {
      app = loadApp();
      app.store.addHabit('Walk');
      const id = app.store.getHabits()[0].id;
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      const result = app.store.toggleToday(id, true, '2026-11-16');
      expect(result.saved).toBe(false);
      expect(app.store.getHabits()[0].completedOn).toBe('2026-11-16');
    });

    it('a later successful write reports saved true again', () => {
      app = loadApp();
      const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      expect(app.store.addHabit('A').saved).toBe(false);
      setSpy.mockRestore();
      expect(app.store.addHabit('B').saved).toBe(true);
    });

    it('subscribe returns an unsubscribe function', () => {
      app = loadApp();
      const listener = jest.fn();
      const unsubscribe = app.store.subscribe(listener);
      app.store.addHabit('X');
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      app.store.addHabit('Y');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
