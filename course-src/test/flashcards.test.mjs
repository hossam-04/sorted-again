import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/flashcards.js';
const F = globalThis.Flashcards;

// A clock pinned to a moment, in a fixed time zone (offset in minutes, as Date#getTimezoneOffset reports it:
// positive west of UTC).
const at = (iso, offset = 0) => ({ now: () => Date.parse(iso), offset: () => offset });
const card = (id, module = 'arrays') => ({ id, module });
const everyModule = () => true;

test('local days come from the clock and its time zone', () => {
  assert.equal(F.localDay(Date.parse('2026-10-24T23:30:00Z'), 0), '2026-10-24');
  assert.equal(F.localDay(Date.parse('2026-10-24T23:30:00Z'), -120), '2026-10-25');  // UTC+2: already the 25th
  assert.equal(F.localDay(Date.parse('2026-10-24T03:00:00Z'), 300), '2026-10-23');   // UTC−5: still the 23rd
  assert.equal(F.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(F.addDays('2028-02-28', 1), '2028-02-29');
});

test('box moves: Again to box 1, Good up one, Easy up two, capped at 6', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((b) => F.nextBox(b, 'again')), [1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((b) => F.nextBox(b, 'good')), [1, 2, 3, 4, 5, 6, 6]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((b) => F.nextBox(b, 'easy')), [2, 3, 4, 5, 6, 6, 6]);
  assert.deepEqual(F.INTERVALS, [0, 1, 3, 7, 16, 35, 80]);
});

test('rating sets the due day from the interval and keeps the day the card was introduced', () => {
  const c = at('2026-10-24T10:00:00Z');
  const first = F.rate(undefined, 'good', c);
  assert.deepEqual(first, [1, '2026-10-25', Date.parse('2026-10-24T10:00:00Z'), '2026-10-24']);
  const later = F.rate(first, 'easy', at('2026-10-25T08:00:00Z'));
  assert.deepEqual(later.slice(0, 2), [3, '2026-11-01']);
  assert.equal(later[3], '2026-10-24');
  assert.deepEqual(F.rate(later, 'again', at('2026-11-01T08:00:00Z')).slice(0, 2), [1, '2026-11-02']);
  const top = F.rate([6, '2026-11-01', 0, '2026-01-01'], 'good', at('2026-11-01T08:00:00Z'));
  assert.deepEqual(top.slice(0, 2), [6, '2027-01-20']);  // 80 days
});

test('a card rated just before midnight is due after midnight, not 24 hours later', () => {
  const rec = F.rate(undefined, 'good', at('2026-10-24T23:59:00Z'));
  const cards = [card('a')];
  const q = (iso) => F.queue({ cards, records: { a: rec }, inDeck: everyModule, clock: at(iso) }).due;
  assert.deepEqual(q('2026-10-24T23:59:30Z'), []);
  assert.deepEqual(q('2026-10-25T00:00:00Z'), ['a']);
});

test('due days follow the device time zone, including the far ends and a DST change', () => {
  // Rated at 20:00 UTC on the 24th from UTC−12 (local 08:00 on the 24th) and from UTC+14 (local 10:00 on the 25th).
  assert.equal(F.rate(undefined, 'good', at('2026-10-24T20:00:00Z', 720))[1], '2026-10-25');
  assert.equal(F.rate(undefined, 'good', at('2026-10-24T20:00:00Z', -840))[1], '2026-10-26');
  // Europe/Berlin leaves summer time on 2026-10-25: local midnight is 22:00Z before and 23:00Z after.
  const berlin = { now: null, offset: (ms) => (ms < Date.parse('2026-10-25T01:00:00Z') ? -120 : -60) };
  const clock = (iso) => ({ ...berlin, now: () => Date.parse(iso) });
  const rec = F.rate(undefined, 'easy', clock('2026-10-24T21:00:00Z'));  // 23:00 local on the 24th
  assert.equal(rec[1], '2026-10-27');
  const due = (iso) => F.queue({ cards: [card('a')], records: { a: rec }, inDeck: everyModule, clock: clock(iso) }).due.length;
  assert.equal(due('2026-10-26T22:59:00Z'), 0);  // 23:59 local on the 26th
  assert.equal(due('2026-10-26T23:00:00Z'), 1);  // midnight local on the 27th
});

test('a clock that moved backwards never hides a card: it is due once today reaches its day', () => {
  const rec = F.rate(undefined, 'easy', at('2026-10-24T12:00:00Z', -840));  // due the 28th, rated from UTC+14
  const q = (iso) => F.queue({ cards: [card('a')], records: { a: rec }, inDeck: everyModule, clock: at(iso, 720) }).due.length;
  assert.equal(q('2026-10-27T12:00:00Z'), 0);
  assert.equal(q('2026-10-28T12:00:00Z'), 1);
});

test('at most 20 new cards a day, counted from the saved records so a reload changes nothing', () => {
  const cards = Array.from({ length: 30 }, (_, i) => card(`c${i}`));
  const clock = at('2026-10-24T09:00:00Z');
  let q = F.queue({ cards, records: {}, inDeck: everyModule, clock });
  assert.equal(q.fresh.length, 20);
  assert.equal(q.newLeft, 20);
  assert.deepEqual(q.fresh.slice(0, 3), ['c0', 'c1', 'c2']);  // course order
  const records = {};
  for (const id of q.fresh.slice(0, 15)) records[id] = F.rate(records[id], 'good', clock);
  const reloaded = JSON.parse(JSON.stringify(records));
  q = F.queue({ cards, records: reloaded, inDeck: everyModule, clock });
  assert.equal(q.introducedToday, 15);
  assert.equal(q.newLeft, 5);
  assert.equal(q.fresh.length, 5);
  assert.deepEqual(q.due, []);
  q = F.queue({ cards, records: reloaded, inDeck: everyModule, clock: at('2026-10-25T09:00:00Z') });
  assert.equal(q.newLeft, 20);
  assert.equal(q.fresh.length, 15);
  assert.equal(q.due.length, 15);
});

test('reviews come first, oldest due day first and then course order; only the deck counts', () => {
  const cards = [card('a'), card('b'), card('c'), card('d', 'trees'), card('e')];
  const records = { a: [2, '2026-10-24', 1, '2026-10-01'], b: [1, '2026-10-20', 1, '2026-10-01'], c: [1, '2026-10-24', 1, '2026-10-01'], d: [1, '2026-10-01', 1, '2026-10-01'] };
  const q = F.queue({ cards, records, inDeck: (m) => m === 'arrays', clock: at('2026-10-24T09:00:00Z') });
  assert.deepEqual(q.due, ['b', 'a', 'c']);
  assert.deepEqual(q.fresh, ['e']);
  assert.equal(q.total, 4);
  const only = F.queue({ cards, records, inDeck: () => true, module: 'trees', clock: at('2026-10-24T09:00:00Z') });
  assert.deepEqual(only.due, ['d']);
  assert.deepEqual(only.fresh, []);
});

test('malformed and orphaned records are ignored', () => {
  const cards = [card('a'), card('b'), card('c')];
  const records = { a: 'nonsense', b: [9, 'later', null], gone: [1, '2026-10-24', 1, '2026-10-24'], c: [1, '2026-10-24', 1, '2026-10-24'] };
  const q = F.queue({ cards, records, inDeck: everyModule, clock: at('2026-10-24T09:00:00Z') });
  assert.deepEqual(q.due, ['c']);
  assert.deepEqual(q.fresh, ['a', 'b']);
  assert.equal(q.introducedToday, 1);  // "gone" no longer exists in the course
  assert.deepEqual(F.rate('nonsense', 'good', at('2026-10-24T09:00:00Z')).slice(0, 2), [1, '2026-10-25']);
});

test('the next due day after today, and how many cards fall on it', () => {
  const cards = [card('a'), card('b'), card('c')];
  const records = { a: [1, '2026-10-26', 1, '2026-10-01'], b: [1, '2026-10-26', 1, '2026-10-01'], c: [2, '2026-10-29', 1, '2026-10-01'] };
  assert.deepEqual(F.nextDue({ cards, records, inDeck: everyModule, clock: at('2026-10-24T09:00:00Z') }), { day: '2026-10-26', count: 2 });
  assert.equal(F.nextDue({ cards, records: {}, inDeck: everyModule, clock: at('2026-10-24T09:00:00Z') }), null);
  assert.equal(F.describeDay('2026-10-25', '2026-10-24'), 'tomorrow');
  assert.equal(F.describeDay('2026-10-24', '2026-10-24'), 'today');
  assert.equal(F.describeDay('2026-10-28', '2026-10-24'), 'in 4 days');
  assert.equal(F.intervalLabel(1), '1 day');
  assert.equal(F.intervalLabel(16), '16 days');
});

test('merging an imported schedule keeps the most recent rating of each card', () => {
  const mine = { a: [3, '2026-11-01', 200, '2026-10-01'], b: [1, '2026-10-25', 100, '2026-10-02'] };
  const theirs = { a: [1, '2026-10-25', 150, '2026-10-01'], b: [4, '2026-11-10', 300, '2026-10-02'], c: [2, '2026-10-27', 50, '2026-10-20'], bad: [1] };
  const n = F.mergeRecords(mine, theirs);
  assert.equal(n, 2);
  assert.deepEqual(mine.a, [3, '2026-11-01', 200, '2026-10-01']);
  assert.deepEqual(mine.b, [4, '2026-11-10', 300, '2026-10-02']);
  assert.deepEqual(mine.c, [2, '2026-10-27', 50, '2026-10-20']);
  assert.equal(mine.bad, undefined);
  assert.equal(F.mergeRecords(mine, 'not an object'), 0);
  assert.equal(F.mergeRecords(mine, null), 0);
});

test('merging decks: the earliest add wins, and an add beats a removal', () => {
  const mine = { arrays: 500, trees: 0 };
  F.mergeDeck(mine, { arrays: 300, trees: 900, graphs: 100, junk: 'x' });
  assert.deepEqual(mine, { arrays: 300, trees: 900, graphs: 100 });
  F.mergeDeck(mine, [1, 2]);
  assert.deepEqual(mine, { arrays: 300, trees: 900, graphs: 100 });
});

test('deck membership: added, removed, or following "finished"', () => {
  const inDeck = F.deckFilter({ arrays: 5, trees: 0 }, { trees: 1, graphs: 1 });
  assert.equal(inDeck('arrays'), true);
  assert.equal(inDeck('trees'), false);  // removed by hand, even though finished
  assert.equal(inDeck('graphs'), true);  // finished before flashcards existed
  assert.equal(inDeck('dp'), false);
});
