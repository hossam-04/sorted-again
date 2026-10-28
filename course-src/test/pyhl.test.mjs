import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/pyhl.js';
const { highlight } = globalThis.PyHL;

test('keywords, names, strings, numbers, comments', () => {
  const h = highlight('def f(self, n=1_000):  # note\n    return len("a#b") + 0x1f');
  assert.match(h, /<span class="t-k">def<\/span> <span class="t-f">f<\/span>/);
  assert.match(h, /<span class="t-self">self<\/span>/);
  assert.match(h, /<span class="t-n">1_000<\/span>/);
  assert.match(h, /<span class="t-c"># note<\/span>/);
  assert.match(h, /<span class="t-b">len<\/span>\(<span class="t-s">"a#b"<\/span>\)/);
  assert.match(h, /<span class="t-n">0x1f<\/span>/);
});

test('triple-quoted strings, f-strings, decorators, soft keywords as names', () => {
  const h = highlight('@cache\ndef g():\n    s = f"{x}"\n    """doc\n    """\n    match = type(s)');
  assert.match(h, /<span class="t-d">@cache<\/span>/);
  assert.match(h, /<span class="t-s">f"\{x\}"<\/span>/);
  assert.match(h, /<span class="t-s">"""doc\n    """<\/span>/);
  assert.doesNotMatch(h, /<span class="t-k">match<\/span>/);
  assert.match(h, /<span class="t-b">type<\/span>/);
});

test('escapes HTML', () => {
  assert.equal(highlight('a < b'), 'a &lt; b');
});
