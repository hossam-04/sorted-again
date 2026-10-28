// Expected-vs-actual rendering for test results: Python literals with the differences marked.
// Plain script: attaches SADiff to globalThis so the page and the Node tests share it.
(function (root) {
  'use strict';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function pylit(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(pylit).join(', ') + ']';
    if (typeof v === 'object') {
      if ('$big' in v) return v.$big;
      if ('$preview' in v) return v.$preview;
      if ('$set' in v) return v.$set.length ? '{' + v.$set.map(pylit).join(', ') + '}' : 'set()';
      if ('$map' in v) return '{' + v.$map.map(([k, x]) => pylit(k) + ': ' + pylit(x)).join(', ') + '}';
      if ('$node' in v) return `Node(${pylit(v.val)})`;
      return '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pylit(x)).join(', ') + '}';
    }
    return String(v);
  }

  const isPreview = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && '$preview' in v;
  const mark = (cls, html) => `<i class="${cls}">${html}</i>`;

  // Same canonical form as the harness: floats rounded to 6 places; optionally sort nested lists.
  function canon(v, deep) {
    if (Array.isArray(v)) {
      const items = v.map((x) => canon(x, deep));
      if (deep) items.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0));
      return items;
    }
    if (typeof v === 'number' && !Number.isInteger(v)) return Math.round(v * 1e6) / 1e6;
    return v;
  }
  const keyOf = (v, deep) => JSON.stringify(canon(v, deep));

  function strings(e, g) {
    let i = 0;
    while (i < e.length && i < g.length && e[i] === g[i]) i++;
    const part = (s) => JSON.stringify(s).slice(1, -1);
    const show = (s, cls) => '"' + esc(part(s.slice(0, i))) + (i < s.length ? mark(cls, esc(part(s.slice(i)))) : '') + '"';
    const note = e.length !== g.length ? `Yours is ${g.length} character${g.length === 1 ? '' : 's'} long, expected ${e.length}.` : '';
    return { expected: show(e, 'miss'), got: show(g, 'extra'), note };
  }

  function positional(e, g) {
    if (Array.isArray(e) && Array.isArray(g)) {
      const eh = [];
      const gh = [];
      for (let i = 0; i < Math.max(e.length, g.length); i++) {
        const inE = i < e.length;
        const inG = i < g.length;
        if (inE && inG) {
          if (keyOf(e[i]) === keyOf(g[i])) {
            eh.push(esc(pylit(e[i])));
            gh.push(esc(pylit(g[i])));
          } else if (Array.isArray(e[i]) && Array.isArray(g[i])) {
            const inner = positional(e[i], g[i]);
            eh.push(inner.expected);
            gh.push(inner.got);
          } else {
            eh.push(mark('miss', esc(pylit(e[i]))));
            gh.push(mark('extra', esc(pylit(g[i]))));
          }
        } else if (inE) eh.push(mark('miss', esc(pylit(e[i]))));
        else gh.push(mark('extra', esc(pylit(g[i]))));
      }
      const note = e.length !== g.length ? `Yours has ${g.length} item${g.length === 1 ? '' : 's'}, expected ${e.length}.` : '';
      return { expected: '[' + eh.join(', ') + ']', got: '[' + gh.join(', ') + ']', note };
    }
    if (typeof e === 'string' && typeof g === 'string') return strings(e, g);
    return { expected: mark('miss', esc(pylit(e))), got: mark('extra', esc(pylit(g))), note: '' };
  }

  function multiset(e, g, deep) {
    if (!Array.isArray(e) || !Array.isArray(g)) return positional(e, g);
    const counter = (list) => {
      const c = new Map();
      for (const x of list) c.set(keyOf(x, deep), (c.get(keyOf(x, deep)) || 0) + 1);
      return c;
    };
    const inGot = counter(g);
    const inExp = counter(e);
    let missing = 0;
    let extra = 0;
    const eh = e.map((x) => {
      const k = keyOf(x, deep);
      if (inGot.get(k) > 0) {
        inGot.set(k, inGot.get(k) - 1);
        return esc(pylit(x));
      }
      missing++;
      return mark('miss', esc(pylit(x)));
    });
    const gh = g.map((x) => {
      const k = keyOf(x, deep);
      if (inExp.get(k) > 0) {
        inExp.set(k, inExp.get(k) - 1);
        return esc(pylit(x));
      }
      extra++;
      return mark('extra', esc(pylit(x)));
    });
    const parts = [];
    if (missing) parts.push(`${missing} expected item${missing === 1 ? ' is' : 's are'} missing from yours`);
    if (extra) parts.push(`${extra} item${extra === 1 ? '' : 's'} in yours ${extra === 1 ? 'is' : 'are'} not expected`);
    return { expected: '[' + eh.join(', ') + ']', got: '[' + gh.join(', ') + ']', note: parts.length ? parts.join('; ') + ' (order does not matter here).' : '' };
  }

  function diff(expected, got, mode) {
    if (isPreview(expected) || isPreview(got) || mode === 'validator') {
      return { expected: esc(pylit(expected)), got: esc(pylit(got)), note: '' };
    }
    if (mode === 'unordered' || mode === 'unordered-deep') return multiset(expected, got, mode === 'unordered-deep');
    return positional(expected, got);
  }

  root.SADiff = { pylit, diff };
})(typeof globalThis !== 'undefined' ? globalThis : window);
