import test from 'node:test';
import assert from 'node:assert/strict';
import { parseValue, outputsFromHtml, exampleTests } from '../tools/leetcode.mjs';

test('parses JSON-like values, including LeetCode words', () => {
  assert.deepEqual(parseValue('[1,null,2]'), { ok: true, value: [1, null, 2] });
  assert.deepEqual(parseValue('true'), { ok: true, value: true });
  assert.deepEqual(parseValue('"ab"'), { ok: true, value: 'ab' });
  assert.deepEqual(parseValue('2.50000'), { ok: true, value: 2.5 });
  assert.equal(parseValue('one two').ok, false);
});

test('finds outputs in both of LeetCode\'s example layouts', () => {
  const pre = '<pre><strong>Input:</strong> a = [9,8], b = 1\n<strong>Output:</strong> [4,5]\n<strong>Explanation:</strong> made up.</pre>';
  const div = '<div class="example-block"><p><strong>Input:</strong> <span class="example-io">a = [1]</span></p><p><strong>Output:</strong> <span class="example-io">false</span></p></div>';
  assert.deepEqual(outputsFromHtml(pre + div), ['[4,5]', 'false']);
  const design = '<pre>\n<strong>Input</strong>\n["Box","put"]\n[[1],[3]]\n\n<strong>Output</strong>\n[null,null]\n\n<strong>Explanation</strong>\nmade up</pre>';
  assert.deepEqual(outputsFromHtml(design), ['[null,null]']);
  const multi = '<pre><strong>Input:</strong> c = [9], t = 9\n<strong>Output:</strong> \n[\n[9],\n[4,5]\n]\n</pre>\n<p><strong>Example 2:</strong></p>';
  assert.deepEqual(outputsFromHtml(multi), ['[[9],[4,5]]']);
});

test('builds function and design tests from example lines', () => {
  const fn = { examples: [['[9,8,7]', '15']], outputs: ['[2,3]'] };
  assert.deepEqual(exampleTests(fn, 'function'), [{ args: [[9, 8, 7], 15], out: [2, 3] }]);
  const design = { examples: [['["Box","put","get"]', '[[1],[3],[]]']], outputs: ['[null,null,3]'] };
  assert.deepEqual(exampleTests(design, 'design'), [{ ops: ['Box', 'put', 'get'], args: [[1], [3], []], out: [null, null, 3] }]);
  const premium = { examples: [['[1]']], outputs: [] };
  assert.deepEqual(exampleTests(premium, 'function'), [{ args: [[1]] }]);
});
