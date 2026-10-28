// Shared UI helpers: DOM builder, icons, toast, clipboard, progress storage, the code editor,
// complexity chips and page hydration. Loaded first; later files attach views to SA.views.
(function (SA) {
  'use strict';
  const hasDOM = typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof Node !== 'undefined';
  SA.views = SA.views || {};
  SA.isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  SA.esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  SA.pad2 = (n) => String(n).padStart(2, '0');

  // ------------------------------------------------------------------ DOM
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return e;
  }
  SA.el = el;

  const ICONS = {
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor"/>',
    pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>',
    next: '<path d="M6 5l9 7-9 7z" fill="currentColor"/><path d="M17 5h2v14h-2z" fill="currentColor"/>',
    prev: '<path d="M18 5l-9 7 9 7z" fill="currentColor"/><path d="M5 5h2v14H5z" fill="currentColor"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    alert: '<path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="2"/>',
    load: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    circle: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>',
    half: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    done: '<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M8 12.5l3 3 5-6" fill="none" stroke="var(--surface)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  };
  SA.icon = (name, size) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'icon');
    s.setAttribute('aria-hidden', 'true');
    if (size) {
      s.setAttribute('width', size);
      s.setAttribute('height', size);
    }
    s.innerHTML = ICONS[name] || '';
    return s;
  };

  let toastTimer;
  SA.toast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  };

  function selectNode(node) {
    if (!node) return;
    const r = document.createRange();
    r.selectNodeContents(node);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    SA.toast(`Selected; press ${SA.isMac ? '⌘' : 'Ctrl'}+C to copy`);
  }
  SA.copyText = (text, fallbackNode) => {
    try {
      navigator.clipboard.writeText(text).then(() => SA.toast('Copied to clipboard'), () => selectNode(fallbackNode));
    } catch (e) {
      selectNode(fallbackNode);
    }
  };

  // ------------------------------------------------------------------ progress, saved in this browser only
  SA.store = (() => {
    const KEY = 'sorted-again:v1';
    // flashDeck: module id -> when it joined the flashcard deck (0: removed). flashCards: card id -> its Leitner
    // record (lib/flashcards.js).
    const state = { solved: {}, tried: {}, drafts: {}, done: {}, quiz: {}, drill: {}, drillRecent: [], last: '', play: '', theme: 'system', flashDeck: {}, flashCards: {} };
    const sameShape = (a, b) => typeof a === typeof b && Array.isArray(a) === Array.isArray(b) && (a === null) === (b === null);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        for (const k of Object.keys(state)) if (saved && saved[k] !== undefined && sameShape(saved[k], state[k])) state[k] = saved[k];
      }
    } catch (e) { /* storage unavailable: progress lasts for this visit only */ }
    let timer;
    const write = () => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    };
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(write, 250);
    };
    const saveNow = () => {
      clearTimeout(timer);
      write();
    };
    function exportCode() {
      const json = JSON.stringify({ solved: state.solved, tried: state.tried, done: state.done, quiz: state.quiz, drill: state.drill, drafts: state.drafts, flashDeck: state.flashDeck, flashCards: state.flashCards });
      return 'SA1:' + btoa(unescape(encodeURIComponent(json)));
    }
    function importCode(text) {
      const s = String(text || '').trim();
      if (!s.startsWith('SA1:')) return { ok: false, message: 'That is not a progress code from this course. Codes start with SA1:.' };
      let data;
      try {
        data = JSON.parse(decodeURIComponent(escape(atob(s.slice(4)))));
      } catch (e) {
        return { ok: false, message: 'This progress code is incomplete. Copy the whole code again and paste it here.' };
      }
      for (const k of ['solved', 'tried', 'done', 'quiz', 'drill']) Object.assign(state[k], data[k] || {});
      for (const [id, code] of Object.entries(data.drafts || {})) if (!state.drafts[id]) state.drafts[id] = code;
      // Codes from before flashcards have neither key; the more recent rating of each card wins.
      const F = globalThis.Flashcards;
      const cards = F ? F.mergeRecords(state.flashCards, data.flashCards) : 0;
      if (F) F.mergeDeck(state.flashDeck, data.flashDeck);
      saveNow();
      const n = Object.keys(data.solved || {}).length;
      const m = Object.keys(data.done || {}).length;
      return { ok: true, message: `Imported ${n} solved problem${n === 1 ? '' : 's'} and ${m} finished module${m === 1 ? '' : 's'}${cards ? `, and the schedule of ${cards} flashcard${cards === 1 ? '' : 's'}` : ''}.` };
    }
    return { state, save, saveNow, exportCode, importCode, KEY };
  })();

  // ------------------------------------------------------------------ keys for touchscreens
  // Python needs keys a phone keyboard hides two screens deep (Tab, brackets, =, _). While an editor has focus on a
  // touch device, a row of them sits just above the on-screen keyboard. Each editor passes an adapter with
  // insert/indent/dedent/move/undo/done/focus.
  SA.keybar = (() => {
    const KEYS = [
      ['⇥', 'Indent', (a) => a.indent()], ['⇤', 'Unindent', (a) => a.dedent()],
      ['◀', 'Cursor left', (a) => a.move(-1)], ['▶', 'Cursor right', (a) => a.move(1)], ['↶', 'Undo', (a) => a.undo()],
      [':', 'Colon', (a) => a.insert(':')], ['( )', 'Parentheses', (a) => a.insert('()', 1)], ['[ ]', 'Square brackets', (a) => a.insert('[]', 1)],
      ['=', 'Equals', (a) => a.insert('=')], ['_', 'Underscore', (a) => a.insert('_')],
      ['" "', 'Double quotes', (a) => a.insert('""', 1)], ["' '", 'Single quotes', (a) => a.insert("''", 1)], ['{ }', 'Braces', (a) => a.insert('{}', 1)],
      ['<', 'Less than', (a) => a.insert('<')], ['>', 'Greater than', (a) => a.insert('>')], ['+', 'Plus', (a) => a.insert('+')],
      ['-', 'Minus', (a) => a.insert('-')], ['*', 'Times', (a) => a.insert('*')], ['#', 'Comment', (a) => a.insert('# ')],
      ['⌄', 'Hide the keyboard', (a) => { a.done(); return false; }],  // false: don't give the editor its focus back
    ];
    const touch = () => !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
    let node = null;
    let active = null;
    let hideTimer = null;
    function place() {
      const vv = window.visualViewport;
      if (!node || node.hidden) return;
      if (!vv) {
        node.style.top = '';
        node.style.bottom = '0px';
        return;
      }
      node.style.left = `${vv.offsetLeft}px`;
      node.style.width = `${vv.width}px`;
      node.style.top = `${vv.offsetTop + vv.height - node.offsetHeight}px`;
    }
    function build() {
      node = el('div', { class: 'keybar', role: 'toolbar', 'aria-label': 'Python keys', hidden: true },
        KEYS.map(([label, name, act]) => {
          const b = el('button', { type: 'button', class: name === 'Hide the keyboard' ? 'key hide' : 'key', 'aria-label': name, title: name }, label);
          let pressed = false;
          // Act on press, and cancel the press's default, so the editor keeps its focus and the keyboard stays up.
          const press = () => {
            if (active && act(active) !== false) active.focus();
          };
          b.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            pressed = true;
            press();
          });
          b.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
          b.addEventListener('click', () => {
            if (pressed) { pressed = false; return; }
            press();  // keyboard activation
          });
          return b;
        }));
      document.body.append(node);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', place);
        window.visualViewport.addEventListener('scroll', place);
      }
    }
    return {
      show(adapter) {
        if (!touch()) return;
        clearTimeout(hideTimer);
        if (!node) build();
        active = adapter;
        node.hidden = false;
        document.documentElement.classList.add('keybar-on');
        place();
      },
      hide(adapter) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          if (node && (!adapter || adapter === active)) {
            node.hidden = true;
            active = null;
            document.documentElement.classList.remove('keybar-on');
          }
        }, 200);
      },
    };
  })();

  // ------------------------------------------------------------------ editor (CodeMirror 5, or a textarea offline)
  SA.editor = function (host, value, opts) {
    const o = opts || {};
    const run = () => o.onRun && o.onRun();
    const check = () => (o.onCheck ? o.onCheck() : run());
    if (window.CodeMirror) {
      const keys = {
        'Ctrl-Enter': run, 'Cmd-Enter': run, 'Shift-Ctrl-Enter': check, 'Shift-Cmd-Enter': check,
        Tab: (cm) => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ', 'end')),
        'Shift-Tab': (cm) => cm.indentSelection('subtract'),
        'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment',
        Esc: (cm) => cm.getInputField().blur(),
      };
      const cm = window.CodeMirror(host, {
        value, mode: { name: 'python', version: 3 }, indentUnit: 4, tabSize: 4, indentWithTabs: false, smartIndent: true,
        matchBrackets: true, autoCloseBrackets: true, lineNumbers: !!o.lineNumbers, lineWrapping: false, viewportMargin: Infinity,
        inputStyle: 'contenteditable', spellcheck: false, autocorrect: false, autocapitalize: false, extraKeys: keys,
        placeholder: o.placeholder || '',
      });
      cm.getInputField().setAttribute('aria-label', o.label || 'Python editor');
      if (o.onChange) cm.on('change', () => o.onChange(cm.getValue()));
      const pad = {
        insert(text, back) {
          cm.replaceSelection(text, 'end');
          if (back) {
            const c = cm.getCursor();
            cm.setCursor({ line: c.line, ch: c.ch - back });
          }
        },
        indent: () => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ', 'end')),
        dedent: () => cm.indentSelection('subtract'),
        move: (d) => cm.execCommand(d < 0 ? 'goCharLeft' : 'goCharRight'),
        undo: () => cm.undo(),
        done: () => cm.getInputField().blur(),
        focus: () => { if (!cm.hasFocus()) cm.focus(); },
      };
      cm.on('focus', () => SA.keybar.show(pad));
      cm.on('blur', () => SA.keybar.hide(pad));
      let marked = [];
      let stepLine = null;
      const unstep = () => {
        if (stepLine !== null) cm.removeLineClass(stepLine, 'background', 'cm-step-line');
        stepLine = null;
      };
      return {
        cm,
        // The line a "Step through" replay is on: highlighted, and scrolled into view inside the editor.
        markStep(line) {
          unstep();
          if (line < 1 || line > cm.lineCount()) return;
          stepLine = line - 1;
          cm.addLineClass(stepLine, 'background', 'cm-step-line');
          cm.scrollIntoView({ line: stepLine, ch: 0 }, 40);
        },
        clearStep: unstep,
        getValue: () => cm.getValue(),
        setValue: (v) => cm.setValue(v),
        focus: () => cm.focus(),
        refresh: () => cm.refresh(),
        setCursor(line) {
          cm.focus();
          cm.setCursor({ line: Math.max(0, line - 1), ch: 0 });
          cm.scrollIntoView(null, 80);
        },
        markError(line) {
          if (line < 1 || line > cm.lineCount()) return;
          cm.addLineClass(line - 1, 'background', 'cm-error-line');
          marked.push(line - 1);
        },
        clearMarks() {
          marked.forEach((l) => cm.removeLineClass(l, 'background', 'cm-error-line'));
          marked = [];
        },
      };
    }
    const ta = el('textarea', { class: 'fallback', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': o.label || 'Python editor' });
    ta.value = value;
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) check();
        else run();
      } else if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end');
      } else if (e.key === 'Escape') ta.blur();
    });
    if (o.onChange) ta.addEventListener('input', () => o.onChange(ta.value));
    const changed = () => ta.dispatchEvent(new Event('input'));
    const pad = {
      insert(text, back) {
        ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
        if (back) ta.selectionStart = ta.selectionEnd = ta.selectionEnd - back;
        changed();
      },
      indent: () => pad.insert('    '),
      dedent() {
        const start = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
        const spaces = /^ {0,4}/.exec(ta.value.slice(start))[0].length;
        if (!spaces) return;
        const pos = ta.selectionStart;
        ta.setRangeText('', start, start + spaces, 'preserve');
        ta.selectionStart = ta.selectionEnd = Math.max(start, pos - spaces);
        changed();
      },
      move(d) {
        const p = Math.max(0, Math.min(ta.value.length, ta.selectionStart + d));
        ta.selectionStart = ta.selectionEnd = p;
      },
      undo: () => document.execCommand && document.execCommand('undo'),
      done: () => ta.blur(),
      focus: () => { if (document.activeElement !== ta) ta.focus(); },
    };
    ta.addEventListener('focus', () => SA.keybar.show(pad));
    ta.addEventListener('blur', () => SA.keybar.hide(pad));
    host.append(ta);
    return {
      getValue: () => ta.value,
      setValue: (v) => { ta.value = v; },
      focus: () => ta.focus(),
      refresh() {},
      setCursor(line) {
        const lines = ta.value.split('\n');
        const pos = lines.slice(0, Math.max(0, line - 1)).reduce((n, l) => n + l.length + 1, 0);
        ta.focus();
        ta.setSelectionRange(pos, pos);
      },
      markError() {},
      clearMarks() {},
      markStep() {},
      clearStep() {},
    };
  };
  SA.kbd = (combo) => el('span', { class: 'kbd' }, combo.replace('Mod', SA.isMac ? '⌘' : 'Ctrl'));

  // ------------------------------------------------------------------ complexity chips
  // Each curve is f(x)/f(1) for x in (0, 1], all on one frame, so steepness is comparable between chips.
  const GROWTH = {
    '1': () => 0.12,
    'log n': (x) => 0.12 + (0.55 * Math.log2(1 + 15 * x)) / 4,
    n: (x) => x * 0.9,
    'n log n': (x) => Math.min(1, (0.9 * x * Math.log2(1 + 15 * x)) / 4),
    'n²': (x) => Math.min(1, x * x),
    'n³': (x) => Math.min(1, 1.4 * x * x * x),
    '2ⁿ': (x) => Math.min(1, ((Math.pow(2, 10 * x) - 1) / 1023) * 3),
    'n!': (x) => Math.min(1, ((Math.pow(2, 14 * x) - 1) / 16383) * 9),
  };
  SA.parseBigO = (s) => {
    const label = String(s).trim();
    const m = /^O\((.+)\)$/.exec(label);
    if (!m) return { cls: null, label };
    const x = m[1].replace(/\*\*2|\^2/g, '²').replace(/\*\*3|\^3/g, '³').replace(/\*\*n|\^n/g, 'ⁿ').replace(/\s*\+\s*/g, '+').replace(/\s+/g, ' ').trim();
    let cls = null;
    if (x === '1') cls = '1';
    else if (/!$/.test(x)) cls = 'n!';
    else if (/2ⁿ|4ⁿ|kⁿ/.test(x)) cls = '2ⁿ';
    else if (/³/.test(x)) cls = 'n³';
    else if (/log/.test(x)) cls = /^log/.test(x) ? 'log n' : 'n log n'; // "log n", "log(m·n)", "log m+log n" vs "n log n"
    else if (/²/.test(x) || /^[a-zA-Z] ?[·*×] ?[a-zA-Z]$/.test(x) || /^[a-zA-Z] [a-zA-Z]$/.test(x)) cls = 'n²';
    else if (/^(n|N|V\+E|E\+V|m\+n|n\+m|n\+k|k\+n|n\+q|E|V|L)$/.test(x)) cls = 'n';
    return { cls, label };
  };
  SA.bigo = (cls, label) => {
    const f = GROWTH[cls];
    const chip = el('span', { class: 'bigo', title: f ? `Grows like ${cls}` : null });
    if (f) {
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const xx = i / 20;
        pts.push(`${(2 + xx * 18).toFixed(1)},${(12 - Math.max(0, Math.min(1, f(xx || 0.001))) * 10).toFixed(1)}`);
      }
      chip.append(el('span', { html: `<svg viewBox="0 0 22 14" aria-hidden="true"><path class="axis" d="M2 1v11h19"/><polyline class="curve" points="${pts.join(' ')}"/></svg>` }));
    }
    chip.append(label || `O(${cls})`);
    return chip;
  };
  SA.bigoOf = (text, suffix) => {
    const p = SA.parseBigO(text.startsWith('O(') ? text : `O(${text})`);
    return SA.bigo(p.cls, p.label + (suffix ? ` ${suffix}` : ''));
  };

  // Turn build-time placeholders into live elements: complexity chips and highlighted Python.
  SA.hydrate = (root) => {
    root.querySelectorAll('.bigo-src').forEach((span) => {
      const p = SA.parseBigO(span.textContent);
      span.replaceWith(SA.bigo(p.cls, p.label));
    });
    root.querySelectorAll('pre.code.python > code:not([data-hl])').forEach((code) => {
      code.innerHTML = window.PyHL.highlight(code.textContent);
      code.setAttribute('data-hl', '');
    });
  };
  // A link's target, briefly marked so the eye finds it (a flashcard's "Open in the module", for one).
  SA.flashTarget = (node) => {
    if (!node) return;
    node.classList.add('target-flash');
    setTimeout(() => node.classList.remove('target-flash'), 2400);
  };
  SA.codeBlock = (src, cls) => el('pre', { class: 'code python' + (cls ? ' ' + cls : '') }, el('code', { 'data-hl': '', html: window.PyHL.highlight(src) }));

  SA.fmtMs = (ms) => {
    if (ms < 1) return `${(Math.round(ms * 10) / 10).toFixed(1)} ms`;
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };
  SA.count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  if (!hasDOM) return;
})(typeof window !== 'undefined' ? (window.SA = window.SA || {}) : (globalThis.SA = globalThis.SA || {}));
