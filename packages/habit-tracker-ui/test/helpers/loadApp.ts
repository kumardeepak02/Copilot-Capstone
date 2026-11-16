/// <reference lib="dom" />
/**
 * EPMCDMETST-72536: test helper.
 * Loads index.html body and the real public/app.js into the jsdom document.
 * This file is not matched by testMatch (no ".test" in its name).
 */
import * as fs from 'fs';
import * as path from 'path';

export interface HabitRecord {
  id: string;
  name: string;
  completedOn: string | null;
}

export interface SaveState {
  saved: boolean;
}

export interface HabitTrackerNamespace {
  clock: {
    now: () => Date;
    todayKey: () => string;
    onRollover: (callback: () => void) => void;
    stop: () => void;
  };
  store: {
    load: () => HabitRecord[];
    getHabits: () => HabitRecord[];
    addHabit: (name: string) => SaveState;
    toggleToday: (id: string, checked: boolean, dateKey?: string) => SaveState;
    removeHabit: (id: string) => SaveState;
    subscribe: (listener: (state: SaveState) => void) => () => void;
  };
  start: () => void;
  stop: () => void;
}

const PACKAGE_DIR = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.join(PACKAGE_DIR, 'public');

export const STORAGE_KEY = 'habitTracker.v1';
export const BACKUP_KEY = 'habitTracker.v1.backup';

export interface StoredRecords {
  version: number;
  habits: HabitRecord[];
}

/** Parsed value under the storage key. Call only after the page has saved data. */
export function storedRecords(): StoredRecords {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
}

/** Overrides document.visibilityState for the visibility tests. */
export function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state
  });
}

export function readAsset(fileName: string): string {
  return fs.readFileSync(path.join(PUBLIC_DIR, fileName), 'utf8');
}

/**
 * Renders the page body from index.html, then runs app.js as a classic script
 * in the current global scope. Returns the namespace app.js exposes.
 * Call the returned stop() in afterEach to remove window and document listeners.
 */
export function loadApp(): HabitTrackerNamespace {
  const html = readAsset('index.html');
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (!body) {
    throw new Error('index.html has no body element');
  }
  document.body.innerHTML = body[1];
  delete (window as unknown as { HabitTracker?: unknown }).HabitTracker;
  new Function(readAsset('app.js'))();
  return (window as unknown as { HabitTracker: HabitTrackerNamespace }).HabitTracker;
}
