/*
 * EPMCDMETST-72536: Habit Tracker page script.
 * Classic script (not a module) so the page also works opened from disk.
 * One namespace is exposed: window.HabitTracker.
 */
(function () {
  'use strict';

  var ns = {};
  window.HabitTracker = ns;

  var STORAGE_KEY = 'habitTracker.v1';
  var BACKUP_KEY = 'habitTracker.v1.backup';
  var SAVE_ERROR_TEXT = 'Changes could not be saved in this browser.';

  var els = null; // DOM references, set by start()

  // ---- Day Clock ----
  // The only code that reads the wall clock. Tests replace clock.now.
  var clock = {
    now: function () {
      return new Date();
    },
    todayKey: function () {
      var d = clock.now();
      return String(d.getFullYear()).padStart(4, '0') + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }
  };
  ns.clock = clock;

  var rolloverCallback = null;
  var lastKey = null;
  var timerHandle = null;
  var wakeListening = false;

  function msUntilNextMidnight(d) {
    var next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
    return next.getTime() - d.getTime();
  }

  // Fires the callback once per change of local date key.
  function checkRollover() {
    var key = clock.todayKey();
    if (key !== lastKey) {
      lastKey = key;
      if (rolloverCallback) {
        rolloverCallback();
      }
    }
  }

  function armTimer() {
    if (timerHandle !== null) {
      clearTimeout(timerHandle);
    }
    timerHandle = setTimeout(function () {
      armTimer();
      checkRollover();
    }, msUntilNextMidnight(clock.now()));
  }

  function onWake() {
    if (document.visibilityState === 'hidden') {
      return;
    }
    checkRollover();
  }

  clock.onRollover = function (callback) {
    rolloverCallback = callback;
    lastKey = clock.todayKey();
    armTimer();
    if (!wakeListening) {
      document.addEventListener('visibilitychange', onWake);
      window.addEventListener('focus', onWake);
      wakeListening = true;
    }
  };

  clock.stop = function () {
    if (timerHandle !== null) {
      clearTimeout(timerHandle);
      timerHandle = null;
    }
    document.removeEventListener('visibilitychange', onWake);
    window.removeEventListener('focus', onWake);
    wakeListening = false;
    rolloverCallback = null;
  };

  // ---- Habit Store ----
  // In-memory list is the source of truth. Only this module writes the storage keys.
  var habits = [];
  var listeners = [];
  var lastSaved = true;

  function toRecord(entry) {
    return { id: entry.id, name: entry.name, completedOn: entry.completedOn };
  }

  function copyHabits() {
    return habits.map(toRecord);
  }

  function isValidEntry(entry) {
    return entry !== null && typeof entry === 'object' &&
      typeof entry.id === 'string' && typeof entry.name === 'string' && entry.name.trim() !== '' &&
      (entry.completedOn === null || typeof entry.completedOn === 'string');
  }

  function load() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // Storage disabled or unavailable: start empty, no backup, no write.
      // Marks storage as not saved so the inline warning shows on page load.
      habits = [];
      lastSaved = false;
      return copyHabits();
    }
    if (raw === null || raw === '') {
      habits = [];
      return copyHabits();
    }
    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !Array.isArray(parsed.habits)) {
      backUp(raw);
      habits = [];
      return copyHabits();
    }
    habits = parsed.habits.filter(isValidEntry).map(toRecord);
    habits = regenerateDuplicateIds(habits);
    return copyHabits();
  }

  // Copies unreadable raw data once to the backup key. Never overwrites an existing backup.
  function backUp(raw) {
    try {
      if (window.localStorage.getItem(BACKUP_KEY) === null) {
        window.localStorage.setItem(BACKUP_KEY, raw);
      }
    } catch (e) {
      // Backup failed: the page still starts empty and no further backup is attempted.
    }
  }

  // Timestamp plus random suffix. Retries until isTaken is false.
  function newId(isTaken) {
    var id;
    do {
      id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    } while (isTaken(id));
    return id;
  }

  // The later of two habits with the same id gets a new id. Names may still repeat.
  function regenerateDuplicateIds(list) {
    var seen = Object.create(null);
    return list.map(function (h) {
      var id = h.id;
      if (seen[id] === true) {
        id = newId(function (candidate) { return seen[candidate] === true; });
      }
      seen[id] = true;
      return { id: id, name: h.name, completedOn: h.completedOn };
    });
  }

  var store = {
    load: load
  };
  ns.store = store;

  // Writes the full object. On failure the in-memory change is kept and saved is false.
  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, habits: habits }));
      lastSaved = true;
    } catch (e) {
      lastSaved = false;
    }
    return lastSaved;
  }

  // Called after every in-memory change, whether or not the write succeeded.
  function notify() {
    var state = { saved: lastSaved };
    listeners.slice().forEach(function (listener) {
      listener(state);
    });
  }

  function findHabit(id) {
    for (var i = 0; i < habits.length; i += 1) {
      if (habits[i].id === id) {
        return habits[i];
      }
    }
    return null;
  }

  store.getHabits = copyHabits;

  // Name must already be trimmed and non-empty (the input controller does this).
  store.addHabit = function (name) {
    var id = newId(function (candidate) { return findHabit(candidate) !== null; });
    habits.push({ id: id, name: name, completedOn: null });
    var saved = persist();
    notify();
    return { saved: saved };
  };

  // dateKey is required when checked. The store never reads the clock.
  store.toggleToday = function (id, checked, dateKey) {
    if (checked && !dateKey) {
      throw new TypeError('dateKey is required when checked');
    }
    var habit = findHabit(id);
    if (!habit) {
      return { saved: lastSaved };
    }
    habit.completedOn = checked ? dateKey : null;
    var saved = persist();
    notify();
    return { saved: saved };
  };

  store.removeHabit = function (id) {
    var before = habits.length;
    habits = habits.filter(function (h) { return h.id !== id; });
    if (habits.length === before) {
      return { saved: lastSaved };
    }
    var saved = persist();
    notify();
    return { saved: saved };
  };

  store.subscribe = function (listener) {
    listeners.push(listener);
    return function () {
      listeners = listeners.filter(function (l) { return l !== listener; });
    };
  };

  // ---- Save-state display ----
  // Shows the inline error when the last change was not saved.
  // Cleared on the next successful save. The list keeps working either way.
  function renderSaveState(state) {
    if (els) {
      els.saveError.textContent = state.saved ? '' : SAVE_ERROR_TEXT;
    }
  }

  // ---- Habit List Renderer ----
  var renderer = {};
  ns.renderer = renderer;

  // Names are set with textContent only. Never build markup from user text.
  function buildRow(habit, dateKey) {
    var li = document.createElement('li');
    li.className = 'habit';
    var checked = habit.completedOn === dateKey;
    if (checked) {
      li.classList.add('habit--done');
    }

    var label = document.createElement('label');
    label.className = 'habit-label';

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.dataset.habitId = habit.id;

    var name = document.createElement('span');
    name.className = 'habit-name';
    name.textContent = habit.name;

    label.appendChild(checkbox);
    label.appendChild(name);

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'habit-delete';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', 'Delete ' + habit.name);

    checkbox.addEventListener('change', function () {
      onCheckChange(habit.id, checkbox.checked);
    });
    deleteButton.addEventListener('click', function () {
      onDelete(habit.id, habit.name);
    });

    li.appendChild(label);
    li.appendChild(deleteButton);
    return li;
  }

  // Returns the habit id of the list checkbox that has focus, or null.
  function focusedHabitId() {
    var active = document.activeElement;
    if (!els || !active || active.type !== 'checkbox' || !els.list.contains(active)) {
      return null;
    }
    return active.dataset.habitId || null;
  }

  // Full re-render from the store after every change. Keyboard focus on a habit's
  // checkbox is restored to the same habit, so a midnight re-render does not drop focus.
  renderer.render = function () {
    if (!els) {
      return;
    }
    var focusedId = focusedHabitId();
    var dateKey = clock.todayKey();
    var currentHabits = store.getHabits();
    els.list.textContent = '';
    currentHabits.forEach(function (habit) {
      els.list.appendChild(buildRow(habit, dateKey));
    });
    els.empty.hidden = currentHabits.length > 0;
    if (focusedId !== null) {
      renderer.focusCheckbox(focusedId);
    }
  };

  // Check: the date is passed explicitly. Uncheck clears completedOn (no date needed).
  function onCheckChange(id, checked) {
    store.toggleToday(id, checked, checked ? clock.todayKey() : undefined);
    renderer.focusCheckbox(id);
  }

  // Restores keyboard focus to the checkbox of the same habit after re-render.
  renderer.focusCheckbox = function (id) {
    if (!els) {
      return;
    }
    var boxes = els.list.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i += 1) {
      if (boxes[i].dataset.habitId === id) {
        boxes[i].focus();
        return;
      }
    }
  };

  // Delete: native confirm. Cancel changes nothing. Confirm removes and moves focus to the input.
  function onDelete(id, name) {
    if (!window.confirm('Delete ' + name + '?')) {
      return;
    }
    store.removeHabit(id);
    if (els) {
      els.input.focus();
    }
  }

  // ---- Habit Input Controller ----
  // Trims the text. Empty or whitespace-only input is ignored silently.
  // Enter and the Add button both submit the form.
  function submitHabit(event) {
    event.preventDefault();
    if (!els) {
      return;
    }
    var name = els.input.value.trim();
    if (name === '') {
      return;
    }
    var result = store.addHabit(name);
    if (result.saved) {
      els.input.value = '';
    }
    // Focus stays in the input. The text is kept when the save failed, so the user can retry.
    els.input.focus();
  }

  var unsubscribers = [];

  // Load, render, subscribe, bind, then start the rollover clock.
  function start() {
    els = {
      form: document.getElementById('habit-form'),
      input: document.getElementById('habit-input'),
      saveError: document.getElementById('save-error'),
      empty: document.getElementById('empty-state'),
      list: document.getElementById('habit-list')
    };
    if (!els.form || !els.input || !els.saveError || !els.empty || !els.list) {
      els = null;
      return;
    }
    store.load();
    // Show the inline warning at load when storage is unavailable.
    renderSaveState({ saved: lastSaved });
    renderer.render();
    unsubscribers.push(store.subscribe(renderSaveState));
    unsubscribers.push(store.subscribe(renderer.render));
    els.form.addEventListener('submit', submitHabit);
    // Re-render at local midnight. This path never writes to storage.
    clock.onRollover(renderer.render);
  }

  function stop() {
    clock.stop();
    unsubscribers.forEach(function (unsubscribe) {
      unsubscribe();
    });
    unsubscribers = [];
    if (els) {
      els.form.removeEventListener('submit', submitHabit);
    }
    els = null;
  }

  ns.start = start;
  ns.stop = stop;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
