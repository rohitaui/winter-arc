const test = require('node:test');
const assert = require('node:assert/strict');
const plan = require('../workout-plan.js');

test('keeps the opening workout and places strength on Tuesday, Thursday, Saturday', () => {
  const first = plan.forDate('2026-10-01');
  assert.equal(first.mode, 'strength');
  assert.equal(first.rounds, 1);
  assert.deepEqual(first.exercises.map(({ reps }) => reps), [
    '10 reps', '8 reps', '5 / leg', '10 reps', '10 reps', '5 / side', '15–20 sec',
  ]);
  assert.equal(plan.forDate('2026-10-02').mode, 'recovery');
  assert.equal(plan.forDate('2026-10-03').mode, 'strength');
  assert.equal(plan.forDate('2026-10-06').mode, 'strength');
  assert.equal(plan.forDate('2026-10-04').mode, 'recovery');
});

test('progresses gently across the 92-day arc without adding rounds after the foundation', () => {
  assert.equal(plan.forDate('2026-10-13').rounds, 1);
  assert.equal(plan.forDate('2026-10-15').rounds, 2);
  assert.equal(plan.forDate('2026-11-01').phase, 'Build');
  assert.equal(plan.forDate('2026-12-01').phase, 'Transform');
  assert.equal(plan.forDate('2026-11-03').exercises[0].reps, '11 reps');
  assert.equal(plan.forDate('2026-11-17').exercises[0].reps, '12 reps');
  assert.equal(plan.forDate('2026-12-01').exercises[0].reps, '13 reps');
  assert.equal(plan.forDate('2026-12-15').exercises[0].reps, '14 reps');
  assert.equal(plan.forDate('2026-12-31').day, 92);
});

test('uses only recovery days outside the three scheduled weekly strength days', () => {
  for (const monday of ['2026-10-05', '2026-11-02', '2026-12-07']) {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(`${monday}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return plan.forDate(date.toISOString().slice(0, 10));
    });
    assert.equal(days.filter(({ mode }) => mode === 'strength').length, 3);
    assert.equal(days.filter(({ mode }) => mode === 'recovery').length, 4);
  }
  assert.equal(plan.forDate('2026-09-30').mode, 'outside');
  assert.equal(plan.forDate('2027-01-01').mode, 'outside');
});
