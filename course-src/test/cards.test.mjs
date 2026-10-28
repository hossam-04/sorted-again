import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseModule, makeMarked } from '../tools/content.mjs';
import { buildCards, checkCards, sheetModule } from '../tools/cards.mjs';

const DIR = 'content/modules';
const FILES = fs.readdirSync(DIR).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
const SOURCES = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(DIR, f), 'utf8')]));

// Modules the way compile.mjs hands them over, minus the Python-run parts cards don't use.
function compile(sources) {
  return Object.entries(sources).map(([file, src]) => {
    const m = parseModule(src, file, makeMarked());
    return { id: m.meta.id, title: m.meta.title, html: m.html, quizzes: m.quizzes, gotchas: m.gotchas, cxRows: m.cxRows, problems: [] };
  });
}
const idsOf = (sources) => buildCards({ modules: compile(sources) }).map((c) => c.id);
const course = (modules) => ({ modules, problems: {}, templates: [], cheatsheet: '', complexity: '' });

test('every card from the real lessons has a unique id, both sides and a link that resolves', () => {
  const modules = compile(SOURCES);
  const cards = buildCards({ modules });
  assert.ok(cards.length > 300, `only ${cards.length} cards`);
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  assert.deepEqual(checkCards(cards, course(modules)), []);
  const kinds = new Set(cards.map((c) => c.kind));
  assert.deepEqual([...kinds].sort(), ['cx', 'gotcha', 'quiz']);
});

test('editing one module leaves every other card id alone, and keeps its untouched cards', () => {
  const before = idsOf(SOURCES);
  const file = FILES.find((f) => f.includes('binary-search'));
  let src = SOURCES[file];
  // A new question at the top of the quiz, gotchas in a different order, a changed table value and new prose.
  src = src.replace(':::quiz\n', ':::quiz\n? A brand-new question about halving?\n- [x] Yes\n- [ ] No\n> Because.\n\n');
  const overflow = /:::gotcha Overflow in other languages\n[\s\S]*?\n:::\n/.exec(src)[0];
  src = src.replace(overflow, '').replace('## Halving a range\n', `## Halving a range\n\n${overflow}\n`);
  src = src.replace('| Find a value in a sorted list | `O(n)` | `O(log n)` |', '| Find a value in a sorted list | `O(n)` scan | `O(log n)` halving |');
  src = src.replace('Binary search is that game.', 'Binary search is that game, played well.');
  const after = idsOf({ ...SOURCES, [file]: src });
  const outside = (ids) => ids.filter((id) => !id.includes(':binary-search:'));
  assert.deepEqual(outside(after), outside(before));
  const inside = (ids) => new Set(ids.filter((id) => id.includes(':binary-search:')));
  const [b, a] = [inside(before), inside(after)];
  for (const id of b) assert.ok(a.has(id), `${id} changed`);
  assert.deepEqual([...a].filter((id) => !b.has(id)).map((id) => id.replace(/-[0-9a-f]{6}$/, '')), ['quiz:binary-search:a-brand-new-question-about-halvi']);  // slugs stop at 32 characters
});

test('ids come from the source text', () => {
  const ids = idsOf(SOURCES);
  assert.ok(ids.includes('gotcha:binary-search:the-loop-that-never-ends'));
  assert.ok(ids.some((id) => /^cx:binary-search:find-a-value-in-a-sorted-list-[0-9a-f]{6}$/.test(id)));
  assert.ok(ids.some((id) => /^quiz:binary-search:binary-search-over-1-000-000-sor-[0-9a-f]{6}$/.test(id)));
});

test('only questions that need their options keep them on the front', () => {
  const cards = buildCards({ modules: compile(SOURCES) });
  const withOptions = cards.filter((c) => c.kind === 'quiz' && c.ref.opts).map((c) => c.module).sort();
  assert.deepEqual(withOptions, ['arrays', 'number-theory', 'stacks']);
});

test('a cheat-sheet section joins the module most of its practice problems are in, ties to the first', () => {
  const mod = { 1: 'arrays', 15: 'two-pointers', 11: 'two-pointers', 238: 'arrays' };
  assert.equal(sheetModule([1, 15, 11], mod), 'two-pointers');
  assert.equal(sheetModule([238, 15], mod), 'arrays');
  assert.equal(sheetModule([], mod), null);
});

test('the checks catch duplicates, empty sides, code and links to nowhere', () => {
  const modules = compile({ [FILES[6]]: SOURCES[FILES[6]] });
  const good = buildCards({ modules });
  const bad = [
    good[0],
    { ...good[0] },
    { id: 'gotcha:x:empty', kind: 'gotcha', module: modules[0].id, href: good[1].href, ref: { title: '', html: '' } },
    { id: 'gotcha:x:code', kind: 'gotcha', module: modules[0].id, href: good[1].href, ref: { title: 'Code', html: '<pre class="code python"><code>print(1)</code></pre>' } },
    { id: 'gotcha:x:link', kind: 'gotcha', module: modules[0].id, href: '#binary-search.nowhere', ref: { title: 'Lost', html: '<p>A link to nowhere.</p>' } },
  ];
  const errors = checkCards(bad, course(modules)).join('\n');
  assert.match(errors, /flashcard [^ ]+ is defined twice/);
  assert.match(errors, /gotcha:x:empty has an empty front/);
  assert.match(errors, /gotcha:x:empty has an empty back/);
  assert.match(errors, /gotcha:x:code: its back holds a code block/);
  assert.match(errors, /gotcha:x:link links to #binary-search.nowhere, which is not on any page/);
});
