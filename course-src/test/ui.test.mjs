import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = globalThis;
globalThis.document = { readyState: 'complete', addEventListener() {}, getElementById: () => null, createElement: () => ({}) };
await import('../template/js/00-ui.js');
const { parseBigO, fmtMs, count } = globalThis.SA;

test('complexity strings map to growth classes', () => {
  assert.deepEqual(parseBigO('O(n log n)'), { cls: 'n log n', label: 'O(n log n)' });
  assert.equal(parseBigO('O(n^2)').cls, 'n²');
  assert.equal(parseBigO('O(2^n)').cls, '2ⁿ');
  assert.equal(parseBigO('O(1)').cls, '1');
  assert.equal(parseBigO('O(V + E)').cls, 'n');
  assert.equal(parseBigO('O(E log V)').cls, 'n log n');
  assert.equal(parseBigO('O(m·n)').cls, 'n²');
  assert.equal(parseBigO('O(k)').cls, null);
});

test('time formatting', () => {
  assert.equal(parseBigO('O(log(m·n))').cls, 'log n');
  assert.equal(parseBigO('O(log m + log n)').cls, 'log n');
  assert.equal(parseBigO('O(n log m)').cls, 'n log n');
  assert.equal(parseBigO('O(log(min(m, n)))').cls, 'log n');
  assert.equal(fmtMs(12.4), '12 ms');
  assert.equal(fmtMs(1530), '1.53 s');
  assert.equal(count(1, 'module'), '1 module');
  assert.equal(count(19, 'module'), '19 modules');
  assert.equal(fmtMs(0.4), '0.4 ms');
});

test('visualizer inputs are parsed and range-checked', async () => {
  await import('../template/js/20-viz.js');
  const { parseInput } = globalThis.SA.viz;
  assert.deepEqual(parseInput({ name: 'nums', type: 'int[]' }, '[3, 1, 2]'), [3, 1, 2]);
  assert.equal(parseInput({ name: 's', type: 'str' }, '"abba"'), 'abba');
  assert.throws(() => parseInput({ name: 'piles', type: 'int[]', max: 12 }, '4, 30'), /at most 12/);
  assert.throws(() => parseInput({ name: 'k', type: 'int', min: 1 }, '0'), /a number of at least 1/);
  assert.throws(() => parseInput({ name: 'nums', type: 'int[]', sorted: true }, '3, 1'), /ascending order/);
  assert.throws(() => parseInput({ name: 'nums', type: 'int[]', maxLen: 2 }, '1, 2, 3'), /at most 2 items/);
  assert.deepEqual(parseInput({ name: 'words', type: 'words' }, ' car, card  care,'), ['car', 'card', 'care']);
  assert.throws(() => parseInput({ name: 'words', type: 'words', maxLen: 2 }, 'a, b, c'), /at most 2 words/);
  assert.throws(() => parseInput({ name: 'words', type: 'words', minLen: 1 }, ' , '), /at least 1 word\b/);
});

test('paired visualizer inputs must have the same length', async () => {
  await import('../template/js/20-viz.js');
  const { parseInputs } = globalThis.SA.viz;
  const inputs = [
    { name: 'weights', type: 'int[]' },
    { name: 'values', type: 'int[]', label: 'values (one per item)', sameLenAs: 'weights' },
    { name: 'capacity', type: 'int' },
  ];
  assert.deepEqual(parseInputs(inputs, ['1, 3', '1, 4', '5']), { weights: [1, 3], values: [1, 4], capacity: 5 });
  assert.throws(() => parseInputs(inputs, ['1, 3, 4', '1, 4', '5']), /values \(one per item\): enter 3 items, one for each of the weights\./);
  assert.throws(() => parseInputs(inputs, ['1', '1, 4', '5']), /enter 1 item, one for each of the weights\./);
});

test('the growth visualizer counts operations and estimates times', async () => {
  await import('../template/js/20-viz.js');
  const { rows, fmtOps, fmtTime } = globalThis.SA.viz.growth;
  const at = (n) => Object.fromEntries(rows(n).map((r) => [r.label, r]));
  const r = at(1000000);
  assert.equal(r['O(1)'].ops, '1');
  assert.equal(r['O(log n)'].ops, '20');
  assert.equal(r['O(n)'].ops, '1,000,000');
  assert.equal(r['O(n log n)'].ops, '20,000,000');
  assert.equal(r['O(n²)'].ops, '1,000,000,000,000');
  assert.equal(r['O(2ⁿ)'].ops, 'a number with 301,030 digits');
  assert.equal(at(10)['O(2ⁿ)'].ops, '1,024');
  assert.equal(at(1)['O(log n)'].ops, '1');
  assert.equal(fmtOps(17), '17');
  assert.equal(fmtTime(0), 'under 1 ms');
  assert.equal(fmtTime(Math.log10(2e7)), '2 s');
  assert.equal(fmtTime(12), '28 hours');
  assert.equal(fmtTime(Math.log10(3e4 * 1e7)), '8 hours');
  assert.equal(fmtTime(Math.log10(5 * 86400 * 1e7)), '5 days');
  assert.equal(fmtTime(Math.log10(200 * 365.25 * 86400 * 1e7)), '200 years');
  assert.equal(fmtTime(100), 'longer than the universe has existed');
});

test('the drill asks about one problem, with the right module among four confusable ones', async () => {
  await import('../template/js/65-practice.js');
  const { drillRound, recordDrill, NEIGHBOURS } = globalThis.SA.practice;
  const modules = ['arrays', 'two-pointers', 'sliding-window', 'stacks', 'binary-search', 'linked-lists', 'recursion', 'trees', 'tries', 'heaps',
    'backtracking', 'graphs', 'intervals', 'greedy', 'dp', 'bits-math'].map((id) => ({ id, title: id.toUpperCase(), problems: [] }));
  const problems = {};
  modules.forEach((m, k) => { for (let j = 0; j < 3; j++) { const id = 100 * k + j; problems[id] = { id, module: m.id }; m.problems.push(id); } });
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const state = { drill: {}, drillRecent: [] };
  for (let round = 0; round < 40; round++) {
    const q = drillRound({ modules, problems, state, rng });
    const ids = q.options.map((o) => o.id);
    assert.equal(new Set(ids).size, 4);
    assert.ok(ids.includes(q.answer));
    assert.equal(q.answer, problems[q.problem].module);
    for (const id of ids) if (id !== q.answer) assert.ok(NEIGHBOURS[q.answer].includes(id) || NEIGHBOURS[q.answer].length < 3);
    assert.ok(!state.drillRecent.includes(q.problem), 'a recently drilled problem came back too soon');
    recordDrill(state, q, round % 3 === 0 ? q.answer : ids.find((x) => x !== q.answer));
  }
  const seen = Object.values(state.drill).reduce((n, [s]) => n + s, 0);
  assert.equal(seen, 40);
  assert.ok(state.drillRecent.length <= 30);
});

test('weak spots rank topics by the evidence, and suggest a next step', async () => {
  await import('../template/js/65-practice.js');
  const { weakSpots } = globalThis.SA.practice;
  const modules = [
    { id: 'arrays', title: 'Arrays and hashing', problems: [1, 2, 3] },
    { id: 'graphs', title: 'Graphs', problems: [10, 11] },
    { id: 'dp', title: 'Dynamic programming', problems: [20, 21] },
    { id: 'heaps', title: 'Heaps', problems: [30] },
  ];
  const problems = { 1: { title: 'A' }, 2: { title: 'B' }, 3: { title: 'C' }, 10: { title: 'G1' }, 11: { title: 'G2' }, 20: { title: 'D1' }, 21: { title: 'D2' }, 30: { title: 'H' } };
  const empty = weakSpots({ modules, problems, state: { solved: {}, tried: {}, quiz: {}, drill: {} } });
  assert.deepEqual(empty, []);
  const state = {
    solved: { 1: 1, 2: 1, 3: 1, 30: 1 }, tried: { 1: 1, 10: 1, 11: 1 },
    quiz: { 'start-q1': { right: 12, total: 17, missed: ['dp', 'graphs'] }, 'graphs-q1': { right: 2, total: 5 }, 'arrays-q1': { right: 5, total: 5 } },
    drill: { dp: [4, 1], heaps: [3, 3] },
  };
  const spots = weakSpots({ modules, problems, state });
  assert.deepEqual(spots.map((s) => s.module.id), ['graphs', 'dp']);
  assert.deepEqual(spots[0].reasons, ['missed in the warm-up quiz', 'lesson quiz: 2 of 5', '2 attempted problems not solved yet']);
  assert.deepEqual(spots[0].next, { href: '#p10', label: 'Retry #10 G1' });
  assert.deepEqual(spots[1].reasons, ['missed in the warm-up quiz', 'drill: recognised 1 of 4']);
  assert.deepEqual(spots[1].next, { href: '#p20', label: 'Try #20 D1' });
});

test('every topic module, core and advanced, has drill neighbours that are real modules', async () => {
  await import('../template/js/65-practice.js');
  const { NEIGHBOURS } = globalThis.SA.practice;
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../tools/compile.mjs', import.meta.url), 'utf8');
  const order = [.../MODULE_ORDER = \[([\s\S]*?)\];/.exec(src)[1].matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
  const topics = order.filter((id) => !['start', 'big-o', 'playbook'].includes(id));
  for (const id of topics) {
    assert.ok(NEIGHBOURS[id], `${id} has no drill neighbours`);
    assert.ok(NEIGHBOURS[id].length >= 3, `${id} needs at least three neighbours`);
    for (const n of NEIGHBOURS[id]) assert.ok(order.includes(n) && n !== id, `${id} lists unknown neighbour ${n}`);
  }
});

test('progress codes carry flashcard schedules, and older codes without them import cleanly', async () => {
  await import('../lib/flashcards.js');
  const { store } = globalThis.SA;
  const code = (data) => 'SA1:' + Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  store.state.flashCards = { 'quiz:arrays:x-1a2b3c': [2, '2026-10-27', 1000, '2026-10-20'] };
  store.state.flashDeck = { arrays: 500 };
  const old = store.importCode(code({ solved: { 1: 1 }, done: { arrays: 1 } }));  // from before flashcards
  assert.equal(old.ok, true);
  assert.equal(old.message, 'Imported 1 solved problem and 1 finished module.');
  assert.deepEqual(store.state.flashCards, { 'quiz:arrays:x-1a2b3c': [2, '2026-10-27', 1000, '2026-10-20'] });
  const exported = JSON.parse(Buffer.from(store.exportCode().slice(4), 'base64').toString('utf8'));
  assert.deepEqual(exported.flashDeck, { arrays: 500 });
  assert.deepEqual(Object.keys(exported.flashCards), ['quiz:arrays:x-1a2b3c']);
  const newer = store.importCode(code({ flashCards: { 'quiz:arrays:x-1a2b3c': [3, '2026-11-03', 2000, '2026-10-20'], bad: 'x' }, flashDeck: { arrays: 300, trees: 900 } }));
  assert.match(newer.message, /and the schedule of 1 flashcard\.$/);
  assert.deepEqual(store.state.flashCards['quiz:arrays:x-1a2b3c'], [3, '2026-11-03', 2000, '2026-10-20']);
  assert.deepEqual(store.state.flashDeck, { arrays: 300, trees: 900 });
  assert.equal(store.importCode(code({ flashCards: 'broken', flashDeck: [1] })).ok, true);
});
