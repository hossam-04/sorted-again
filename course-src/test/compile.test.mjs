import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const run = (args) => {
  try {
    return { code: 0, out: execFileSync('node', ['tools/compile.mjs', ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout) + String(e.stderr) };
  }
};

test('the exemplar problem verifies end to end', { timeout: 600000 }, () => {
  const r = run(['--content', 'test/fixtures/content', '--out', 'build/test-course.json', '--quick', '--jobs', '2']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /all checks passed/);
  const course = JSON.parse(fs.readFileSync('build/test-course.json', 'utf8'));
  const p = course.problems[167];
  assert.ok(p.limits.perf_ms >= 1000 && p.limits.ref_ms * 20 <= p.limits.perf_ms);
  assert.equal(p.examples[0].input, 'numbers = [1, 3, 4, 6, 8, 11], target = 10');
  assert.equal(p.examples[0].output, '[3, 4]');
  assert.equal(p.spec.oracle, undefined);
  assert.match(p.hints[2], /<a [^>]*href="#two-pointers"/);
  assert.ok(!/\[\[[pm]:/.test(JSON.stringify(course)), 'a [[p:...]] or [[m:...]] link was left unrendered');
});

test('a mislabelled wrong answer fails the build with a precise message', { timeout: 600000 }, () => {
  const r = run(['--content', 'test/fixtures/broken', '--out', 'build/test-broken.json', '--quick', '--jobs', '2', '--no-lc']);
  assert.equal(r.code, 1);
  assert.match(r.out, /#167 wrong answer "Moves the wrong pointer": declared fails=edge, but it failed examples \(Example 1\)/);
});
