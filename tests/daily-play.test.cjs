const test = require('node:test');
const assert = require('node:assert/strict');
const play = require('../daily-play.js');

function memoryStorage(initial) {
  let value = initial ?? null;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
}

test('one date and theme always produce the same sign, including after module reload', () => {
  const first = play.signFor('2026-11-17', 'focus');
  delete require.cache[require.resolve('../daily-play.js')];
  assert.deepEqual(require('../daily-play.js').signFor('2026-11-17', 'focus'), first);
  for (const theme of play.themes) {
    const sign = play.signFor('2026-11-17', theme.id);
    assert.equal(sign.theme, theme.id);
    assert.equal(sign.lines.length, 2);
    assert.ok(sign.title && sign.note);
  }
});

test('rejects invalid dates and themes instead of silently shifting them', () => {
  for (const date of ['2026-02-30', '2025-02-29', '2026-13-01', '1899-12-31', '2100-01-01', '2026-1-1', null]) {
    assert.throws(() => play.signFor(date, 'free'));
  }
  assert.doesNotThrow(() => play.signFor('2000-02-29', 'free'));
  assert.throws(() => play.signFor('2026-11-17', 'missing'));
});

test('daily challenges repeat predictably and change at month and year boundaries', () => {
  for (const date of ['2026-11-30', '2026-12-31', '2000-02-29']) {
    assert.deepEqual(play.challengeFor(date), play.challengeFor(date));
    assert.notEqual(play.challengeFor(date).id, play.challengeFor(play.shiftDate(date, 1)).id);
  }
});

test('Shanghai today changes at UTC 16:00, regardless of local timezone', () => {
  assert.equal(play.todayCN(new Date('2026-11-17T15:59:59Z')), '2026-11-17');
  assert.equal(play.todayCN(new Date('2026-11-17T16:00:00Z')), '2026-11-18');
});

test('only today can be stamped, once, and the record survives reopening', () => {
  const storage = memoryStorage();
  const store = play.createStampStore(storage, '2026-11-17');
  assert.equal(store.stamp('2026-11-16', '2026-11-17').kind, 'readonly');
  assert.equal(store.stamp('2026-11-18', '2026-11-17').kind, 'readonly');
  assert.equal(store.stamp('2026-11-17', '2026-11-17').kind, 'added');
  assert.equal(store.stamp('2026-11-17', '2026-11-17').kind, 'already');
  const dates = store.getDates();
  dates.push('2026-11-16');
  assert.deepEqual(store.getDates(), ['2026-11-17']);
  assert.deepEqual(play.createStampStore(storage, '2026-11-17').getDates(), ['2026-11-17']);
});

test('corrupt, wrong-version, duplicate, invalid and future records are handled', () => {
  for (const raw of ['{oops', 'null', '[]', '{"version":2,"stamps":["2026-11-17"]}', '{"version":1,"stamps":"wrong"}']) {
    assert.deepEqual(play.createStampStore(memoryStorage(raw), '2026-11-17').getDates(), []);
  }
  const raw = JSON.stringify({ version: 1, stamps: ['2026-11-17', '2026-02-30', '2026-11-17', '2026-11-18', 42, '2026-11-16'] });
  assert.deepEqual(play.createStampStore(memoryStorage(raw), '2026-11-17').getDates(), ['2026-11-16', '2026-11-17']);
});

test('streak spans leap days and years, survives until the end of today, and resets after a gap', () => {
  assert.equal(play.statsFor(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01').streak, 3);
  const stamps = ['2025-12-30', '2025-12-31', '2026-01-01'];
  assert.equal(play.statsFor(stamps, '2026-01-01').streak, 3);
  assert.equal(play.statsFor(stamps, '2026-01-02').streak, 3);
  assert.equal(play.statsFor(stamps, '2026-01-03').streak, 0);
  assert.equal(play.statsFor(['1900-01-01'], '1900-01-01').streak, 1);
  const stats = play.statsFor(stamps, '2026-01-01');
  assert.equal(stats.total, 3);
  assert.equal(stats.week.length, 7);
  assert.equal(stats.week.at(-1).date, '2026-01-01');
  assert.equal(stats.week.at(-1).stamped, true);
});

test('blocked storage and quota errors keep the session usable and report persistence accurately', () => {
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  for (const storage of [null, denied, { getItem: () => null, setItem() { throw new Error('quota'); } }]) {
    const store = play.createStampStore(storage, '2026-11-17');
    const result = store.stamp('2026-11-17', '2026-11-17');
    assert.equal(result.kind, 'added');
    assert.equal(result.persistent, false);
    assert.equal(store.stamp('2026-11-17', '2026-11-17').kind, 'already');
  }
});

test('two open tabs merge stamps instead of overwriting the other tab', () => {
  const storage = memoryStorage();
  const first = play.createStampStore(storage, '2026-11-17');
  const second = play.createStampStore(storage, '2026-11-18');
  first.stamp('2026-11-17', '2026-11-17');
  second.stamp('2026-11-18', '2026-11-18');
  first.reload('2026-11-18');
  assert.deepEqual(first.getDates(), ['2026-11-17', '2026-11-18']);
});
