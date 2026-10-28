// "Step through": replays the steps lib/stepper.py recorded while the learner's own code ran on one test.
// The current line is highlighted in the editor; the panel shows where the code is, its variables and the result.
(function (SA) {
  'use strict';
  const { el, icon } = SA;

  // Names whose value is new or different from the previous step in the same function call.
  function changedNames(prev, cur) {
    if (!prev || prev.depth !== cur.depth || prev.fn !== cur.fn) return new Set();
    const before = new Map(prev.vars);
    return new Set(cur.vars.filter(([name, value]) => before.get(name) !== value).map(([name]) => name));
  }

  function eventText(s) {
    if (s.event === 'return') return [`Line ${s.line}: ${s.fn} returns `, el('code', null, s.ret)];
    if (s.event === 'exception') return [`Line ${s.line} raises `, el('code', null, s.exc)];
    return [`About to run line ${s.line}`];
  }

  function resultBox(r) {
    const res = r.result || {};
    if (res.status === 'error') {
      const e = res.error || {};
      return el('div', { class: 'st-result bad' }, icon('x', 16), el('span', null, `Raises ${e.type || 'an error'}${e.message ? `: ${e.message}` : ''}${e.line ? ` (line ${e.line})` : ''}.`));
    }
    if (res.status === 'fail') {
      return el('div', { class: 'st-result bad' }, icon('x', 16), el('span', null, 'Returns ', el('code', null, res.got_text), ', but the expected answer is ', el('code', null, res.expected_text), '.'));
    }
    if (res.status === 'pass') return el('div', { class: 'st-result ok' }, icon('check', 16), el('span', null, 'Returns ', el('code', null, res.got_text), ', the expected answer.'));
    return el('div', { class: 'st-result' }, icon('info', 16), el('span', null, 'Returns ', el('code', null, res.got_text), '.'));
  }

  // o: { editor, label, onClose }. Returns { stale() } for when the code in the editor changes.
  function mount(host, r, o) {
    const steps = r.steps || [];
    let i = 0;
    const where = el('div', { class: 'st-where' });
    const note = el('p', { class: 'st-note' });
    const vars = el('tbody');
    const varsTable = el('table', { class: 'st-vars' }, el('thead', null, el('tr', null, el('th', { scope: 'col' }, 'Variable'), el('th', { scope: 'col' }, 'Value'))), vars);
    const printed = el('pre', { class: 'st-out', hidden: true });
    const label = el('span', { class: 'step' });
    const scrub = el('input', { type: 'range', class: 'scrub', min: '0', max: String(Math.max(0, steps.length - 1)), value: '0', 'aria-label': 'Step' });
    const button = (name, aria, fn) => el('button', { class: 'btn small', type: 'button', 'aria-label': aria, title: aria, onclick: fn }, icon(name, 14));
    const back = button('prev', 'Step back', () => go(i - 1));
    const fwd = button('next', 'Step forward', () => go(i + 1));
    const close = el('button', { class: 'btn ghost small', type: 'button', onclick: () => { o.editor.clearStep(); o.onClose(); } }, icon('x', 14), 'Close');
    const staleNote = el('p', { class: 'st-stale', hidden: true }, 'Your code changed after this run, so the steps may not match it. Press Step through again.');

    function go(k) {
      if (!steps.length) return;
      i = Math.max(0, Math.min(steps.length - 1, k));
      const s = steps[i];
      scrub.value = String(i);
      label.textContent = `step ${i + 1} of ${steps.length}`;
      back.disabled = i === 0;
      fwd.disabled = i === steps.length - 1;
      where.replaceChildren(el('span', { class: 'st-fn' }, s.stack.join(' › ')), el('span', { class: 'st-depth' }, `depth ${s.depth}`));
      note.replaceChildren(...eventText(s));
      note.className = `st-note ${s.event}`;
      const changed = changedNames(steps[i - 1], s);
      vars.replaceChildren(...(s.vars.length ? s.vars.map(([name, value]) => el('tr', { class: changed.has(name) ? 'changed' : null },
        el('th', { scope: 'row' }, name, changed.has(name) ? el('span', { class: 'st-chg' }, 'changed') : null), el('td', null, el('code', null, value))))
        : [el('tr', null, el('td', { colspan: '2', class: 'st-none' }, 'No variables yet.'))]));
      const text = (r.stdout || '').slice(0, s.out);
      printed.hidden = !text;
      printed.textContent = text;
      if (!staleNote.hidden) return;
      o.editor.markStep(s.line);
    }

    scrub.addEventListener('input', () => go(Number(scrub.value)));
    const panel = el('section', { class: 'stepper', tabindex: '0', 'aria-label': 'Step through your code' },
      el('div', { class: 'st-head' }, el('h3', null, `Stepping through ${o.label}`), close),
      el('p', { class: 'st-input' }, el('span', { class: 'st-k' }, 'Input'), el('code', null, r.input || '')),
      resultBox(r),
      steps.length ? el('div', { class: 'st-controls' }, back, fwd, scrub, label) : el('p', { class: 'st-note' }, 'Your code finished without running a line of its own.'),
      where, note, staleNote, varsTable,
      el('div', { class: 'st-printed', hidden: !(r.stdout || '').length }, el('span', { class: 'st-k' }, 'Printed so far'), printed),
      r.truncated ? el('p', { class: 'st-trunc' }, `Recorded the first ${steps.length.toLocaleString('en-US')} steps; after that the code ran to the end without recording. Try a smaller input to see every step.`) : null);
    panel.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(steps.length - 1); }
    });
    host.replaceChildren(panel);
    go(0);
    return {
      stale() {
        staleNote.hidden = false;
        o.editor.clearStep();
      },
    };
  }

  SA.stepper = { mount, changedNames };
})(window.SA);
