// Python syntax highlighting for static code (lessons, solutions, wrong answers, visualizer code panels).
// Plain script: attaches PyHL to globalThis so the page and the Node tests share it.
(function (root) {
  'use strict';
  const KEYWORDS = new Set(('False None True and as assert async await break class continue def del elif else except finally ' +
    'for from global if import in is lambda nonlocal not or pass raise return try while with yield').split(' '));
  const BUILTINS = new Set(('abs all any ascii bin bool bytearray bytes callable chr classmethod complex delattr dict dir divmod ' +
    'enumerate eval exec filter float format frozenset getattr globals hasattr hash hex id input int isinstance issubclass iter ' +
    'len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr ' +
    'slice sorted staticmethod str sum super tuple type vars zip Exception ValueError TypeError IndexError KeyError ' +
    'RecursionError StopIteration NotImplementedError ZeroDivisionError AttributeError RuntimeError').split(' '));
  const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Order matters: comments, strings (prefixes, triple quotes first), numbers, decorators, names, anything else.
  const TOKEN = new RegExp([
    '(#[^\\n]*)',
    '((?:[rRbBuUfF]{1,2})?(?:"""[\\s\\S]*?(?:"""|$)|\'\'\'[\\s\\S]*?(?:\'\'\'|$)|"(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?))',
    '(\\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\\d[\\d_]*(?:\\.[\\d_]*)?(?:[eE][+-]?\\d[\\d_]*)?j?)\\b)',
    '(@[A-Za-z_][\\w.]*)',
    '([A-Za-z_]\\w*)',
    '(\\s+|.)',
  ].join('|'), 'g');

  function highlight(src) {
    let out = '';
    let prev = '';
    let m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      const [t, com, str, num, dec, word] = m;
      if (com) out += `<span class="t-c">${escape(com)}</span>`;
      else if (str) out += `<span class="t-s">${escape(str)}</span>`;
      else if (num) out += `<span class="t-n">${num}</span>`;
      else if (dec) out += `<span class="t-d">${escape(dec)}</span>`;
      else if (word) {
        if (prev === 'def' || prev === 'class') out += `<span class="t-f">${word}</span>`;
        else if (KEYWORDS.has(word)) out += `<span class="t-k">${word}</span>`;
        else if (word === 'self' || word === 'cls') out += `<span class="t-self">${word}</span>`;
        else if (BUILTINS.has(word)) out += `<span class="t-b">${word}</span>`;
        else out += word;
      } else out += escape(t);
      if (word) prev = word;
      else if (t.trim()) prev = t.trim();
    }
    return out;
  }

  root.PyHL = { highlight, escape };
})(typeof globalThis !== 'undefined' ? globalThis : window);
