import test from 'node:test';
import assert from 'node:assert/strict';
import { PyPool } from '../tools/pool.mjs';

test('pool runs harness calls, kills runaway code and recovers', { timeout: 180000 }, async () => {
  const pool = new PyPool({ size: 1 });
  try {
    const ok = await pool.call('exec', { code: 'print(6 * 7)' });
    assert.equal(ok.stdout, '42\n');
    const t0 = Date.now();
    const spin = await pool.call('exec', { code: 'while True:\n    pass', limit_ms: 500 });
    assert.equal(spin.timeout, true);
    assert.equal(spin.last.group, 'exec');
    assert.ok(Date.now() - t0 < 5000);
    const again = await pool.call('exec', { code: 'import sys\nprint(sys.getrecursionlimit())' });
    assert.equal(again.stdout, '100000\n');
    const deep = await pool.call('exec', { code: 'def r(n):\n    return 0 if n == 0 else 1 + r(n - 1)\nprint(r(50000))' });
    assert.equal(deep.stdout, '50000\n');
    const bad = await pool.call('check', { problem: { id: 1, kind: 'function', method: 'f', params: [], examples: [], reference: 'oops(' }, code: 'class Solution:\n    def f(self):\n        return 1\n' });
    assert.match(bad.error, /reference does not load/);
  } finally {
    await pool.close();
  }
});

test('pool threads have a Safari-sized stack, and the harness stays within it', { timeout: 300000 }, async () => {
  const pool = new PyPool({ size: 1 });
  const big = Array.from({ length: 30000 }, (_, i) => i);
  const reverse = {
    id: 206, kind: 'function', method: 'reverseList', params: [{ name: 'head', conv: 'ListNode' }], ret: 'ListNode', compare: 'exact',
    examples: [{ args: [big], out: [...big].reverse() }], reference: '',
  };
  const chain = 'class Solution:\n    def reverseList(self, head):\n        prev = None\n        while head:\n            head.next, prev, head = prev, head, head.next\n        return prev\n';
  try {
    const rec = await pool.call('exec', { code: 'def r(k):\n    return r(k + 1)\nr(0)' });
    assert.equal(rec.error.type, 'RecursionError');
    const cached = await pool.call('exec', { code: 'from functools import cache\n@cache\ndef f(k):\n    return 0 if k == 0 else f(k - 1) + 1\nprint(f(20000))' });
    assert.equal(cached.stdout, '20000\n');
    const list = await pool.call('run', { problem: reverse, code: chain });
    assert.equal(list.tests[0].status, 'pass');
    const freed = await pool.call('exec', { code: 'class N:\n    def __init__(self, nxt):\n        self.nxt = nxt\nhead = None\nfor _ in range(30000):\n    head = N(head)\nprint("built")' });
    assert.equal(freed.stdout, 'built\n');
    const viaC = await pool.call('exec', { code: 'def d(k):\n    return 0 if k == 0 else 1 + max(d(j) for j in (k - 1,))\nprint(d(3000))' });
    assert.equal(viaC.stack, true);
    assert.equal(viaC.crashed, true);
    const after = await pool.call('exec', { code: 'print("alive")' });
    assert.equal(after.stdout, 'alive\n');
  } finally {
    await pool.close();
  }
});
