import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/diff.js';
const { pylit, diff } = globalThis.SADiff;

test('python literals', () => {
  assert.equal(pylit([1, null, true, 'a"b', { $big: '123456789012345678901' }]), '[1, None, True, "a\\"b", 123456789012345678901]');
  assert.equal(pylit({ $preview: '[1, 2, … 99 more …]' }), '[1, 2, … 99 more …]');
});

test('positional diff marks differing indices', () => {
  const d = diff([3, 4], [2, 4], 'exact');
  assert.equal(d.expected, '[<i class="miss">3</i>, 4]');
  assert.equal(d.got, '[<i class="extra">2</i>, 4]');
  const longer = diff([1, 2], [1, 2, 3], 'exact');
  assert.equal(longer.got, '[1, 2, <i class="extra">3</i>]');
  assert.match(longer.note, /3 items, expected 2/);
});

test('2D and strings', () => {
  assert.equal(diff([[1, 2], [3, 4]], [[1, 2], [3, 5]], 'exact').got, '[[1, 2], [3, <i class="extra">5</i>]]');
  assert.equal(diff('abcd', 'abxd', 'exact').got, '"ab<i class="extra">xd</i>"');
});

test('unordered diff compares as multisets', () => {
  const d = diff([[1, 2], [3]], [[3], [9]], 'unordered');
  assert.equal(d.expected, '[<i class="miss">[1, 2]</i>, [3]]');
  assert.equal(d.got, '[[3], <i class="extra">[9]</i>]');
});
