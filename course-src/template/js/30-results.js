// Rendering Run and Check results: the live progress strip, per-example cards, the expected-vs-yours
// diff, tracebacks that jump to the editor line, and the time bar for the performance test.
(function (SA) {
  'use strict';
  const { el, icon, fmtMs } = SA;
  const GROUP_LABEL = { examples: 'Examples', edge: 'Edge cases', random: 'Random', perf: 'Performance' };
  const GROUP_NOUN = { examples: 'example', edge: 'edge case', random: 'random test', perf: 'performance test' };

  function msgBox(kind, text, hint) {
    return el('div', { class: `out-msg ${kind}` }, icon(kind === 'error' ? 'x' : kind === 'warning' ? 'alert' : 'info'),
      el('div', null, el('span', null, text), hint ? el('span', { class: 'hint' }, hint) : null));
  }
  SA.msgBox = msgBox;

  function pending(text) {
    return el('div', { class: 'placeholder pending' }, el('span', { class: 'spinner', 'aria-hidden': 'true' }), text);
  }

  // ------------------------------------------------------------------ errors and values
  function errorBlock(err, hooks) {
    const box = el('div', { class: 'err-box' });
    box.append(el('div', { class: 'err-title' }, el('b', null, err.type || 'Error'), err.message ? `: ${err.message}` : ''));
    const frames = (err.frames || []).filter((f) => f.line);
    const lineLink = (line, extra) => el('button', { type: 'button', class: 'linelink', onclick: () => hooks && hooks.onLine && hooks.onLine(line) }, `Line ${line}`, extra || '');
    if (frames.length) {
      box.append(el('ul', { class: 'tb' }, frames.map((f) => el('li', null, lineLink(f.line), f.name && f.name !== '<module>' ? el('span', { class: 'fn' }, ` in ${f.name}`) : null,
        f.text ? el('code', null, f.text) : null))));
    } else if (err.line) {
      box.append(el('ul', { class: 'tb' }, el('li', null, lineLink(err.line, err.col ? `, column ${err.col}` : ''))));
    }
    if (err.hint) box.append(el('p', { class: 'err-hint' }, err.hint));
    if (err.line && hooks && hooks.mark) hooks.mark(err.line);
    return box;
  }

  function valueRows(test, mode) {
    const rows = [el('dt', null, 'Input'), el('dd', { class: 'val' + (String(test.input || '').includes('\n') ? ' multiline' : '') }, test.input || '')];
    let note = '';
    if (test.status !== 'error' && test.got !== undefined) {
      const d = window.SADiff.diff(test.expected, test.got, mode);
      const same = test.status === 'pass';
      rows.push(el('dt', null, 'Expected'), el('dd', { class: 'val', html: same ? SA.esc(window.SADiff.pylit(test.expected)) : d.expected }));
      rows.push(el('dt', null, 'Yours'), el('dd', { class: 'val', html: same ? SA.esc(window.SADiff.pylit(test.got)) : d.got }));
      note = same ? '' : d.note;
    } else if (test.expected !== undefined && test.expected !== null) {
      rows.push(el('dt', null, 'Expected'), el('dd', { class: 'val' }, window.SADiff.pylit(test.expected)));
    }
    return { dl: el('dl', { class: 'kv' }, rows), note };
  }

  function legend() {
    return el('div', { class: 'legend-row' },
      el('span', null, el('i', { class: 'sw-miss' }), 'expected'),
      el('span', null, el('i', { class: 'sw-extra' }), 'different in yours'));
  }

  function stdoutBlock(text) {
    if (!text) return null;
    return el('div', { class: 'stdout-wrap' }, el('div', { class: 'stdout-label' }, 'Your print() output'), el('pre', { class: 'stdout' }, text));
  }

  function caseCard(test, payload, hooks, title, sub) {
    const card = el('div', { class: 'case' });
    card.append(el('h4', null, title, sub ? el('small', null, sub) : null));
    const { dl, note } = valueRows(test, payload.spec.compare);
    card.append(dl);
    if (test.status === 'fail') {
      if (test.message) card.append(el('p', { class: 'case-msg' }, test.message));
      if (note) card.append(el('p', { class: 'case-note' }, note));
      if (payload.spec.compare === 'validator') card.append(el('p', { class: 'case-note' }, 'Several answers are valid here; yours broke one of the rules above.'));
      else if (test.got !== undefined) card.append(legend());
    }
    if (test.status === 'error' && test.error) card.append(errorBlock(test.error, hooks));
    const out = stdoutBlock(test.stdout);
    if (out) card.append(out);
    if (test.stepWith && hooks && hooks.onStep) {
      card.append(el('div', { class: 'case-actions' }, el('button', { class: 'btn small', type: 'button', onclick: () => hooks.onStep(test.stepWith, title) },
        icon('next', 14), 'Step through this test')));
    }
    return card;
  }

  function timeBar(refMs, yoursMs, limitMs, stopped) {
    const pct = (ms) => Math.max(1.2, Math.min(100, (100 * ms) / limitMs));
    const row = (label, ms, cls, text) => el('div', { class: 'tb-row' }, el('span', { class: 'tb-label' }, label),
      el('div', { class: 'track' }, el('i', { class: cls, style: `width:${pct(ms)}%` })), el('span', { class: 'tb-val' }, text));
    return el('div', { class: 'timebar', role: 'img', 'aria-label': `Reference ${fmtMs(refMs)}; yours ${stopped ? `stopped at the ${fmtMs(limitMs)} limit` : fmtMs(yoursMs)}; limit ${fmtMs(limitMs)}` },
      row('reference', refMs, 'ref', fmtMs(refMs)),
      row('yours', stopped ? limitMs : yoursMs, stopped ? 'over' : 'you', stopped ? `stopped at ${fmtMs(limitMs)}` : fmtMs(yoursMs)),
      el('div', { class: 'legend' }, el('span', null, `Bars are scaled to the ${fmtMs(limitMs)} limit, which is about 20 times the reference time.`)));
  }

  // When Python was restarted after a time limit, say so until it is back.
  function restartNote() {
    const note = el('p', { class: 'restart-note' }, el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Restarting Python…');
    const off = SA.py.onState((state) => {
      if (state === 'ready') {
        note.replaceChildren(icon('check', 14), 'Python restarted and is ready again.');
        note.classList.add('ok');
        if (off) setTimeout(off, 0);
      }
    });
    return note;
  }

  // Python itself failed: a native stack overflow (see harness.py) or another fatal error.
  function crashBox(r) {
    const box = el('div', { class: 'crash' });
    if (r.stack) {
      box.append(msgBox('error', "Python crashed: the browser's stack overflowed.",
        'Recursion that goes through a built-in function, such as max(dfs(x) for x in …), map(dfs, …) or sorted(key=…), ' +
        "uses the browser's own stack, and Safari allows only about 100 levels of it (Chrome a few hundred). So does catching " +
        'an error that came up through hundreds of recursive calls. Plain recursion is fine to 100,000 calls. Write that part ' +
        'as a loop, or run this code on LeetCode.'));
    } else {
      box.append(msgBox('error', `Python stopped unexpectedly: ${String(r.error || '').split('\n').slice(-1)[0]}`,
        'Try again. If it happens every time, simplify the code to find the line that causes it.'));
    }
    const test = r.last && r.last.event === 'start' && r.last.group !== 'exec' ? r.last.name : '';
    if (test) box.append(el('p', { class: 'crash-where' }, `It crashed while running ${test === 'performance test' ? 'the performance test' : test}${r.last.label ? ` (${r.last.label})` : ''}.`));
    if (r.crashed) box.append(restartNote());
    return box;
  }

  function trouble(host, r) {
    if (r.unavailable) {
      const why = String(r.error || '');
      host.replaceChildren(msgBox('error', /^Python /.test(why) ? why : `Python isn't available in this browser: ${why}`, 'Everything else on the page still works, and you can run your code on LeetCode.'));
      return 'unavailable';
    }
    if (r.crashed || (r.error && typeof r.error === 'string')) {
      host.replaceChildren(crashBox(r));
      return 'error';
    }
    return null;
  }

  // ------------------------------------------------------------------ Run (visible examples)
  function renderRun(host, r, payload, hooks) {
    const bad = trouble(host, r);
    if (bad) return bad;
    if (r.timeout) {
      const name = (r.last && r.last.name) || 'an example';
      host.replaceChildren(
        el('div', { class: 'verdict bad' }, el('h3', null, icon('clock', 20), 'Time limit'),
          el('p', null, `Your code ran longer than 3 s on ${name}. Look for a loop that never ends, or recursion without a base case.`)),
        restartNote());
      return 'timeout';
    }
    if (r.status === 'compile_error') {
      host.replaceChildren(el('div', { class: 'verdict bad' }, el('h3', null, icon('x', 20), "Doesn't compile"), el('p', null, 'Fix the line below, then run again.')),
        el('div', { class: 'case' }, errorBlock(r.error, hooks)));
      return 'compile_error';
    }
    const passed = r.tests.filter((t) => t.status === 'pass').length;
    const all = passed === r.tests.length;
    host.replaceChildren(el('div', { class: `verdict ${all ? 'ok' : 'bad'}` },
      el('h3', null, icon(all ? 'check' : 'x', 20), `${passed} of ${r.tests.length} examples pass`),
      el('p', null, all ? 'Now press Check to run the hidden tests too.' : 'Compare your output with the expected one below.')));
    r.tests.forEach((t) => {
      const sub = `${t.status === 'pass' ? 'passed' : t.status === 'error' ? 'raised an error' : 'wrong answer'} · ${fmtMs(t.ms)}`;
      host.append(caseCard({ ...t, stepWith: { test: payload.spec.examples[t.index] } }, payload, hooks, t.name, sub));
    });
    return all ? 'pass' : 'fail';
  }

  // ------------------------------------------------------------------ Check (all groups)
  function progressStrip(payload) {
    const spec = payload.spec;
    const groups = [['examples', spec.examples.length], ['edge', spec.edge.length], ['random', spec.gen ? 40 : 0], ['perf', spec.perf ? 1 : 0]]
      .filter(([, n]) => n > 0);
    const cells = {};
    const counts = {};
    for (const [g, n] of groups) {
      counts[g] = { total: n, passed: 0, failed: 0 };
      cells[g] = el('div', { class: 'group', 'data-state': 'idle' }, el('span', { class: 'gn' }, GROUP_LABEL[g]), el('span', { class: 'gv' }, `0 / ${n}`));
    }
    const title = el('h3', null, el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Checking…');
    const line = el('p', null, 'Running the examples.');
    const node = el('div', { class: 'verdict running' }, title, line, el('div', { class: 'groups' }, groups.map(([g]) => cells[g])));
    const setCell = (g, state, text, ic) => {
      const c = cells[g];
      if (!c) return;
      c.dataset.state = state;
      c.querySelector('.gv').replaceChildren(ic ? icon(ic, 14) : '', text);
    };
    function update(ev) {
      const g = ev.group;
      if (!counts[g]) return;
      if (ev.event === 'prepare') {
        setCell(g, 'running', g === 'perf' ? 'preparing' : 'generating');
        line.textContent = g === 'random' ? 'Generating random inputs.' : g === 'perf' ? 'Building the large input for the performance test.' : `Running the ${GROUP_LABEL[g].toLowerCase()}.`;
      } else if (ev.event === 'start') {
        setCell(g, 'running', `${counts[g].passed + counts[g].failed} / ${counts[g].total}`);
        line.textContent = g === 'perf' ? `Performance test: ${ev.label || 'a large input'} (limit ${fmtMs(ev.limit_ms)}).` : `${GROUP_LABEL[g]}: ${ev.name || `test ${ev.index + 1}`}.`;
      } else if (ev.event === 'end') {
        if (ev.status === 'pass') counts[g].passed++;
        else counts[g].failed++;
        setCell(g, 'running', `${counts[g].passed + counts[g].failed} / ${counts[g].total}`);
      }
    }
    function finalize(r) {
      const seen = new Set();
      for (const gr of (r && r.groups) || []) {
        seen.add(gr.name);
        if (counts[gr.name]) counts[gr.name].total = gr.total;
        if (gr.failure) setCell(gr.name, 'fail', `${gr.passed} / ${gr.total}`, 'x');
        else setCell(gr.name, 'pass', `${gr.passed} / ${gr.total}`, 'check');
      }
      if (r && r.timeout && r.last && counts[r.last.group]) {
        const g = r.last.group;
        seen.add(g);
        setCell(g, 'fail', g === 'perf' ? 'over the limit' : 'time limit', 'clock');
        for (const [other] of groups) {
          if (other === g) break;
          if (!seen.has(other)) {
            seen.add(other);
            setCell(other, 'pass', `${counts[other].passed} / ${counts[other].total}`, 'check');
          }
        }
      }
      for (const [g] of groups) if (!seen.has(g)) setCell(g, 'skip', 'skipped');
      node.classList.remove('running');
    }
    return { node, update, finalize, title, line };
  }

  function renderCheck(host, r, payload, hooks) {
    const strip = hooks.strip;
    const bad = trouble(host, r);
    if (bad) return bad;
    strip.finalize(r);
    const verdict = strip.node;
    const setVerdict = (kind, ic, title, text) => {
      verdict.className = `verdict ${kind}`;
      strip.title.replaceChildren(icon(ic, 20), title);
      strip.line.replaceChildren(...(Array.isArray(text) ? text : [text]));
    };
    host.replaceChildren(verdict);
    const limit = payload.limits.perf_ms;
    if (r.timeout) {
      const g = r.last && r.last.group;
      if (g === 'perf') {
        setVerdict('bad', 'clock', 'Time limit exceeded', `Every answer was right, but the performance test took longer than ${fmtMs(limit)}. ` +
          'Look for work you repeat inside a loop: a scan, a copy or a sort that a set, a dict, a pointer or a heap could avoid.');
        verdict.append(timeBar(payload.limits.ref_ms, limit, limit, true));
        host.append(el('div', { class: 'case' }, el('h4', null, 'Performance test', el('small', null, (r.last && r.last.label) || 'a large input'))));
      } else {
        setVerdict('bad', 'clock', 'Time limit', `Your code ran longer than 3 s on ${(r.last && r.last.name) || 'a test'}. Look for a loop that never ends, or recursion without a base case.`);
      }
      host.append(restartNote());
      return 'timeout';
    }
    if (r.status === 'compile_error') {
      setVerdict('bad', 'x', "Doesn't compile", 'Fix the line below, then check again.');
      host.append(el('div', { class: 'case' }, errorBlock(r.error, hooks)));
      return 'compile_error';
    }
    if (r.status === 'accepted') {
      const total = r.groups.reduce((n, g) => n + g.total, 0);
      const parts = r.groups.map((g) => `${g.total} ${g.name === 'examples' ? 'example' : g.name === 'edge' ? 'edge case' : g.name === 'random' ? 'random input' : 'performance test'}${g.total === 1 ? '' : 's'}`);
      setVerdict('ok', 'done', 'Accepted', `Passed all ${total} tests: ${parts.join(', ')}.`);
      if (r.perf) verdict.append(timeBar(r.perf.ref_ms, r.perf.ms, r.perf.limit_ms, false));
      return 'accepted';
    }
    const f = r.failure;
    const group = r.groups.find((g) => g.name === f.group);
    const title = f.status === 'error' ? 'Runtime error' : 'Wrong answer';
    setVerdict('bad', 'x', title, `Failed ${GROUP_NOUN[f.group]} ${f.index + 1} of ${group ? group.total : '?'}: ${f.name}.`);
    const sub = f.group === 'random' ? `seed ${f.seed}; Check uses the same random inputs every time, so you can reproduce this` : f.group === 'perf' ? 'the large input' : '';
    // A failing test can be replayed step by step, unless it is the large performance input or too big to send back.
    const small = (v) => !(v && typeof v === 'object' && !Array.isArray(v) && v.$preview);
    const stepWith = f.group !== 'perf' && f.data !== undefined && small(f.data) ? { data: f.data, ...(small(f.expected) ? { expected: f.expected } : {}) } : null;
    host.append(caseCard({ ...f, input: f.input, stepWith }, payload, hooks, f.group === 'perf' ? 'Performance test' : f.name, sub));
    return f.status === 'error' ? 'error' : 'wrong';
  }

  SA.results = { pending, renderRun, renderCheck, progressStrip, errorBlock, msgBox, timeBar, crashBox };
})(window.SA);
