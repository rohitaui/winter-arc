const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ArcProgress = require('../progress.js');

const source = fs.readFileSync(new URL('../app-data.js', `file://${__filename}`), 'utf8');
const habitIds = ['move', 'workout', 'food', 'deepWork', 'learn', 'sleep'];

function appAt(today = '2026-10-03', initial = {}) {
  const storage = new Map(Array.isArray(initial) ? initial : Object.entries(initial));
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { textContent: '', dataset: {} });
      return elements.get(id);
    },
  };
  const context = {
    window: {},
    document,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    ArcProgress: { ...ArcProgress, key: () => today },
    toast() {},
    render() {},
    renderProgress() {},
    closeAuth() {},
    openAuth() {},
    closeAccountMenu() {},
    loadProfile() {},
    clearTimeout() {},
    setTimeout() {},
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { storage, run: code => vm.runInContext(code, context) };
}

test('guest check-ins create persisted progress rows and survive a reload', () => {
  const app = appAt();
  app.run("toggle('move')");
  app.run("toggle('food')");

  const row = app.run("state.rows['2026-10-03']");
  assert.equal(row.habits.move, true);
  assert.equal(row.habits.food, true);
  assert.equal(row.completed, false);
  assert.equal(ArcProgress.build([row], '2026-10-03').day('2026-10-03').status, 'Partial');

  const savedCache = app.storage.get('winterArc:guest:v2');
  assert.ok(JSON.parse(savedCache).rows['2026-10-03']);
  const reloaded = appAt('2026-10-03', [['winterArc:guest:v2', savedCache]]);
  const restoredRow = reloaded.run("state.rows['2026-10-03']");
  assert.equal(restoredRow.habits.move, true);
  assert.equal(ArcProgress.build([restoredRow], '2026-10-03').day('2026-10-03').count, 2);
});

test('guest progress becomes complete at six check-ins and reopens when one is unmarked', () => {
  const app = appAt();
  for (const id of habitIds) app.run(`toggle('${id}')`);

  let row = app.run("state.rows['2026-10-03']");
  assert.equal(row.completed, true);
  assert.equal(ArcProgress.build([row], '2026-10-03').day('2026-10-03').status, 'Complete');
  app.run("toggle('sleep')");
  row = app.run("state.rows['2026-10-03']");
  assert.equal(row.completed, false);
  assert.equal(ArcProgress.build([row], '2026-10-03').day('2026-10-03').status, 'Partial');
});

test('legacy guest Walk check-ins hydrate as Move in progress and history', () => {
  const oldCache = JSON.stringify({
    owner: 'guest', rows: {}, tasks: { '2026-10-02:walk': true }, days: {},
    journals: {}, journal: '', workouts: 0, pending: {},
  });
  const app = appAt('2026-10-03', [['winterArc:guest:v2', oldCache]]);
  const row = app.run("state.rows['2026-10-02']");
  assert.equal(app.run("state.tasks['2026-10-02:move']"), true);
  assert.equal(row.habits.move, true);
  assert.equal(ArcProgress.build([row], '2026-10-03').day('2026-10-02').count, 1);
});

test('legacy guest checks with a stale complete flag do not count as six-habit completion', () => {
  const oldHabits = Object.fromEntries(habitIds.slice(0, 5).map(id => [id, true]));
  const oldTasks = Object.fromEntries(Object.entries(oldHabits).map(([id, value]) => [`2026-10-02:${id}`, value]));
  const oldCache = JSON.stringify({
    owner: 'guest', rows: {}, tasks: oldTasks, days: { '2026-10-02': true },
    journals: {}, journal: '', workouts: 0, pending: {},
  });
  const app = appAt('2026-10-03', [['winterArc:guest:v2', oldCache]]);
  const row = app.run("state.rows['2026-10-02']");
  assert.equal(row.completed, false);
  assert.equal(ArcProgress.build([row], '2026-10-03').day('2026-10-02').status, 'Partial');
});

test('progress ignores a stale cloud completed flag when any current habit is unchecked', () => {
  const oldCloudRow = {
    day_number: 1,
    completed: true,
    workout_completed: true,
    habits: { walk: true, workout: true, food: true, sleep: true },
  };
  const model = ArcProgress.build([oldCloudRow], '2026-10-03');
  assert.equal(model.day('2026-10-01').count, 4);
  assert.equal(model.day('2026-10-01').status, 'Partial');
  assert.equal(model.completed, 0);
});
