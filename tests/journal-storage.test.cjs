const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../app-data.js', `file://${__filename}`), 'utf8');

function appAt(today = '2026-10-02') {
  const storage = new Map();
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
    ArcProgress: {
      START: '2026-10-01',
      END: '2026-12-31',
      key: () => today,
      dayNumber: date => Math.floor((Date.parse(`${date}T12:00:00Z`) - Date.parse('2026-10-01T12:00:00Z')) / 86400000) + 1,
      normalize: row => row,
    },
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
  return { context, storage, run: code => vm.runInContext(code, context) };
}

test('saves today’s journal to the guest cache and daily row', () => {
  const app = appAt();
  assert.equal(app.run("saveJournalEntry('2026-10-02', 'Felt good after my walk.')"), true);
  assert.equal(app.run('state.journal'), 'Felt good after my walk.');
  assert.equal(app.run("state.rows['2026-10-02'].journal"), 'Felt good after my walk.');
  const saved = JSON.parse(app.storage.get('winterArc:guest:v2'));
  assert.equal(saved.journals['2026-10-02'], 'Felt good after my walk.');
});

test('edits a past journal while preserving that day’s existing habit check-ins', () => {
  const app = appAt();
  app.run(`applyRows([{
    date: '2026-10-01', day_number: 1, completed: false, workout_completed: true,
    journal: 'Original reflection.', habits: { move: true, workout: true, water: true }
  }])`);
  assert.equal(app.run("saveJournalEntry('2026-10-01', 'Updated reflection.')"), true);
  const row = app.run("state.rows['2026-10-01']");
  assert.equal(row.journal, 'Updated reflection.');
  assert.equal(row.habits.move, true);
  assert.equal(row.habits.workout, true);
  assert.equal(row.habits.water, true);
});
