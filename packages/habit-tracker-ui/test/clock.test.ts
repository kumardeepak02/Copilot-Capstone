/** @jest-environment jsdom */
/// <reference lib="dom" />
/**
 * EPMCDMETST-72536: Day Clock tests (architecture section 17, T17).
 */
import { loadApp, HabitTrackerNamespace, STORAGE_KEY, setVisibility } from './helpers/loadApp';

describe('Day Clock', () => {
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
    setVisibility('visible');
  });

  it('defines window.HabitTracker with the clock after load (smoke test)', () => {
    app = loadApp();
    expect(app).toBeDefined();
    expect(typeof app.clock.todayKey).toBe('function');
    expect(typeof app.store.load).toBe('function');
  });

  it('formats todayKey as zero-padded local YYYY-MM-DD', () => {
    app = loadApp();
    app.clock.now = () => new Date(2026, 0, 5, 0, 0, 0);
    expect(app.clock.todayKey()).toBe('2026-01-05');
  });

  it('stores a check made at 23:59:59 under the displayed local date', () => {
    app = loadApp();
    app.clock.now = () => new Date(2026, 10, 16, 23, 59, 59);
    const habitId = 'h1';
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, habits: [{ id: habitId, name: 'Run', completedOn: null }] })
    );
    app.store.load();
    app.store.toggleToday(habitId, true, app.clock.todayKey());
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(saved.habits[0].completedOn).toBe('2026-11-16');
  });

  it('fires the rollover callback once when the timer reaches local midnight', () => {
    app = loadApp();
    const callback = jest.fn();
    app.clock.onRollover(callback);
    // 12:00 to 00:00 is 12 hours; advance a little past it.
    jest.advanceTimersByTime(12 * 60 * 60 * 1000 + 1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire the rollover callback before the date changes', () => {
    app = loadApp();
    const callback = jest.fn();
    app.clock.onRollover(callback);
    jest.advanceTimersByTime(60 * 60 * 1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('rechecks the date on visibilitychange when the page becomes visible', () => {
    app = loadApp();
    const callback = jest.fn();
    app.clock.onRollover(callback);
    // Simulate the device sleeping past midnight: the clock moves, the timer does not fire.
    app.clock.now = () => new Date(2026, 10, 17, 9, 0, 0);
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback).not.toHaveBeenCalled();
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('rechecks the date on window focus', () => {
    app = loadApp();
    const callback = jest.fn();
    app.clock.onRollover(callback);
    app.clock.now = () => new Date(2026, 10, 17, 9, 0, 0);
    window.dispatchEvent(new Event('focus'));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stop() removes timers and wake listeners', () => {
    app = loadApp();
    const callback = jest.fn();
    app.clock.onRollover(callback);
    app.clock.stop();
    app.clock.now = () => new Date(2026, 10, 17, 9, 0, 0);
    window.dispatchEvent(new Event('focus'));
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(callback).not.toHaveBeenCalled();
  });
});
