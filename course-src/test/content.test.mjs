import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseInfo, parseProblem, parseModule, makeMarked, inlineRefs, ContentError } from '../tools/content.mjs';

const P = 'test/fixtures/content/problems/two-pointers/0167-two-sum-ii-input-array-is-sorted.md';
const M = 'test/fixtures/content/modules/03-two-pointers.md';

test('info strings carry role and attributes', () => {
  assert.deepEqual(parseInfo('python alt time="n log n" space="1" slow'), { lang: 'python', role: 'alt', attrs: { time: 'n log n', space: '1', slow: true } });
  assert.deepEqual(parseInfo('json examples'), { lang: 'json', role: 'examples', attrs: {} });
  assert.deepEqual(parseInfo("python run title=Tuples_can_be_keys,_lists_can't"), { lang: 'python', role: 'run', attrs: { title: "Tuples_can_be_keys,_lists_can't" } });
  assert.deepEqual(parseInfo('python wrong fails="edge" test="t is shorter" how=error'), { lang: 'python', role: 'wrong', attrs: { fails: 'edge', test: 't is shorter', how: 'error' } });
});

test('the exemplar problem parses completely', () => {
  const p = parseProblem(fs.readFileSync(P, 'utf8'), P);
  assert.equal(p.id, 167);
  assert.equal(p.module, 'two-pointers');
  assert.equal(p.examples.length, 3);
  assert.ok(p.edge.every((t) => t.name));
  assert.match(p.gen, /def gen\(rng, size\)/);
  assert.equal(p.solution.time, 'n');
  assert.ok(p.alternatives.some((a) => a.oracle && a.slow));
  assert.deepEqual(p.wrongs.map((w) => [w.fails, w.how]), [['example', 'wrong'], ['perf', 'timeout'], ['example', 'wrong']]);
  assert.ok(p.hints.length >= 2);
});

test('missing pieces are reported with the file name', () => {
  const src = fs.readFileSync(P, 'utf8').replace(/```python wrong fails="perf"[\s\S]*?```/, '');
  assert.throws(() => parseProblem(src.replace(/## Hints[\s\S]*?## Solution/, '## Solution'), P), (e) => e instanceof ContentError && /hints/i.test(e.message) && e.file === P);
});

test('module blocks become placeholders and data', () => {
  const md = makeMarked();
  const m = parseModule(fs.readFileSync(M, 'utf8'), M, md);
  assert.equal(m.meta.id, 'two-pointers');
  assert.ok(m.examples.length >= 1 && m.html.includes(`data-ex="${m.examples[0].id}"`));
  assert.ok(m.viz.length === 1 && m.html.includes('data-viz="two-pointers-v1"'));
  const q0 = m.quizzes[0].questions[0];
  assert.equal(q0.options[q0.answer], '<code class="nw">l</code>');
  assert.match(m.html, /class="callout gotcha"/);
  assert.match(m.html, /<span class="bigo-src">O\(n\)<\/span>/);
  assert.deepEqual(m.refs.problems, [167]);
});

test('problem links keep the number with the title but may wrap', () => {
  const titleOf = (kind, id) => (kind === 'p' ? 'Construct Binary Tree from Preorder and Inorder Traversal' : 'Trees');
  const html = inlineRefs('see [[p:105]] and [[m:trees]]', titleOf);
  assert.match(html, /<span class="pnum">#105<\/span>&nbsp;Construct Binary/);
  assert.match(html, /<a class="mref" href="#trees">Trees<\/a>/);
  const css = fs.readFileSync(new URL('../template/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.pref[^{]*\{[^}]*nowrap/, 'long problem titles must be able to wrap on a phone');
});

test('quiz options are shuffled the same way on every build, and the answer follows its option', () => {
  const md = makeMarked();
  const q = (k) => `? Question number ${k}?\n- [ ] wrong A${k}\n- [x] right${k}\n- [ ] wrong B${k}\n> Because.`;
  const src = `---\nid: shuffle\ntitle: T\nkicker: k\nsummary: s\n---\n\n:::quiz\n${Array.from({ length: 30 }, (_, k) => q(k)).join('\n\n')}\n:::\n`;
  const a = parseModule(src, 'x.md', md).quizzes[0].questions;
  const b = parseModule(src, 'x.md', md).quizzes[0].questions;
  assert.deepEqual(a, b);
  const positions = [0, 0, 0];
  a.forEach((x, k) => {
    assert.equal(x.options[x.answer], `right${k}`);
    assert.deepEqual([...x.options].sort(), [`right${k}`, `wrong A${k}`, `wrong B${k}`].sort());
    positions[x.answer]++;
  });
  assert.ok(positions.every((n) => n >= 5), `answers bunch up: ${positions}`);
});
