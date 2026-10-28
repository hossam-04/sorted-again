// The problem page: brief, workbench (editor, Run, Check, results), hints, solutions and wrong answers.
(function (SA) {
  'use strict';
  const { el, icon, store, pad2 } = SA;
  const LEVEL = { Easy: 1, Medium: 2, Hard: 3 };

  SA.diffChip = (d) => el('span', { class: 'chip diff', 'data-level': LEVEL[d] || 2, title: `${d} on LeetCode` },
    el('span', { class: 'bars', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')), d);

  SA.statusIcon = (id) => {
    if (store.state.solved[id]) return el('span', { class: 'st solved', title: 'Solved' }, icon('done'), el('span', { class: 'sr' }, 'Solved'));
    if (store.state.tried[id]) return el('span', { class: 'st tried', title: 'Attempted' }, icon('half'), el('span', { class: 'sr' }, 'Attempted'));
    return el('span', { class: 'st', title: 'Not started' }, icon('circle'), el('span', { class: 'sr' }, 'Not started'));
  };

  SA.wrongTag = (w) => {
    if (w.how === 'error') return 'crashes';
    if (w.how === 'timeout' && w.fails !== 'perf') return 'never finishes';
    return { example: 'fails an example', edge: 'fails an edge case', random: 'fails a random test', perf: 'too slow' }[w.fails];
  };

  const section = (title, ...kids) => el('section', { class: 'p-section' }, el('h2', null, title), kids);

  function exampleCard(ex, i) {
    return el('div', { class: 'ex-card' }, el('div', { class: 'exh' }, `Example ${i + 1}`),
      el('dl', null, el('dt', null, 'Input'), el('dd', { class: ex.input.includes('\n') ? 'multiline' : null }, ex.input), el('dt', null, 'Output'), el('dd', null, ex.output)),
      ex.why ? el('div', { class: 'why', html: ex.why }) : null);
  }

  SA.views.problem = function (id) {
    const p = SA.problems[id];
    const m = SA.moduleById[p.module];
    SA.setTitle(`#${p.id} ${p.title}`);

    // ---------------------------------------------------------------- status
    const status = el('span', { class: 'status' });
    const syncStatus = () => {
      const solved = !!store.state.solved[id];
      const tried = !!store.state.tried[id];
      status.className = 'status' + (solved ? ' solved' : '');
      status.replaceChildren(icon(solved ? 'done' : tried ? 'half' : 'circle', 16), solved ? 'Solved' : tried ? 'Attempted' : 'Not started');
    };
    syncStatus();
    const markTried = () => {
      if (!store.state.tried[id]) {
        store.state.tried[id] = Date.now();
        store.save();
        syncStatus();
      }
    };

    // ---------------------------------------------------------------- brief
    const lcLink = p.lcUrl ? el('a', { class: 'btn ghost small', href: p.lcUrl, target: '_blank', rel: 'noopener' },
      p.premium ? 'Premium on LeetCode' : 'Open on LeetCode', icon('ext', 14)) : null;
    const top = el('div', { class: 'p-top' },
      el('div', { class: 'p-head' },
        el('div', { class: 'kicker' }, m ? `Module ${pad2(m.num)} · ${m.title}` : 'Problem'),
        el('h1', { class: 'title' }, el('span', { class: 'p-num' }, `#${p.id}`), p.title),
        el('div', { class: 'row' }, SA.diffChip(p.difficulty),
          p.blind75 ? el('span', { class: 'chip accent', title: 'Part of the Blind 75 list' }, 'Blind 75') : null,
          p.own ? el('span', { class: 'chip', title: `LeetCode's "${p.lcTitle}" is Premium-only, so this is the course's own version of it` }, 'Own version of a Premium problem') : null,
          p.patterns.map((t) => el('span', { class: 'chip' }, t)), status, lcLink)),
      section('Task', el('div', { class: 'p-task', html: p.taskHtml })),
      section('Examples', p.examples.map(exampleCard)),
      section('Constraints', el('div', { class: 'p-constraints', html: p.constraintsHtml })));

    // ---------------------------------------------------------------- workbench
    const draft = store.state.drafts[id];
    const edHost = el('div', { class: 'editor-host' });
    const out = el('div', { class: 'work-out', 'aria-live': 'polite' },
      el('div', { class: 'placeholder' }, 'Run shows your results on the examples. Check also runs the hidden tests: edge cases, random inputs and one large performance test.'));
    const saved = el('span', null, draft ? 'draft restored' : `Python ${SA.course.meta.python.split('.').slice(0, 2).join('.')}`);
    let editor;
    let stepping = null;  // the open "Step through" replay, if any
    const hooks = () => ({ onLine: (n) => editor.setCursor(n), mark: (n) => editor.markError(n), onStep: (args, label) => stepThrough(args, label) });
    const runBtn = el('button', { class: 'btn', type: 'button' }, icon('play', 14), 'Run', SA.kbd('Mod+↵'));
    const checkBtn = el('button', { class: 'btn primary', type: 'button' }, icon('check', 14), 'Check', SA.kbd('⇧Mod+↵'));
    const stepBtn = el('button', { class: 'btn', type: 'button', title: 'Run your code on Example 1 and replay it line by line' }, icon('next', 14), 'Step through');
    const resetBtn = el('button', { class: 'btn ghost small', type: 'button', title: 'Replace your draft with the starter code' }, icon('reset', 14), 'Reset');
    const busy = (on) => {
      runBtn.disabled = on;
      checkBtn.disabled = on;
      stepBtn.disabled = on;
    };
    const endStepping = () => {
      if (stepping) editor.clearStep();
      stepping = null;
    };

    // Run the code on one test with every step recorded, then replay it next to the editor.
    async function stepThrough(args, label) {
      if (stepBtn.disabled) return;
      busy(true);
      endStepping();
      editor.clearMarks();
      out.replaceChildren(SA.results.pending(SA.py.state === 'ready' ? `Running ${label} and recording every step…` : `Starting Python, then running ${label}…`));
      const r = await SA.py.call('step', { problem: p.spec, code: editor.getValue(), ...args }, { defaultLimitMs: 20000 });
      busy(false);
      if (r.timeout) {
        out.replaceChildren(el('div', { class: 'verdict bad' }, el('h3', null, icon('clock', 20), 'Time limit'),
          el('p', null, `${label} ran longer than 20 s while every step was being recorded. Look for a loop that never ends, or recursion without a base case.`)));
        return;
      }
      if (r.unavailable || r.crashed || r.status === 'compile_error') {
        SA.results.renderRun(out, r, p, hooks());
        return;
      }
      stepping = SA.stepper.mount(out, r, {
        editor, label,
        onClose: () => {
          stepping = null;
          out.replaceChildren(el('div', { class: 'placeholder' }, 'Run shows your results on the examples. Check also runs the hidden tests: edge cases, random inputs and one large performance test.'));
        },
      });
      out.querySelector('.stepper').focus({ preventScroll: true });
    }

    async function run() {
      if (runBtn.disabled) return;
      busy(true);
      endStepping();
      editor.clearMarks();
      markTried();
      out.replaceChildren(SA.results.pending(SA.py.state === 'ready' ? 'Running the examples…' : 'Starting Python, then running the examples…'));
      const r = await SA.py.call('run', { problem: p.spec, code: editor.getValue() });
      SA.results.renderRun(out, r, p, hooks());
      busy(false);
    }

    async function check() {
      if (checkBtn.disabled) return;
      busy(true);
      endStepping();
      editor.clearMarks();
      markTried();
      const strip = SA.results.progressStrip(p);
      out.replaceChildren(strip.node);
      const r = await SA.py.call('check', { problem: p.spec, code: editor.getValue(), opts: { perf_limit_ms: p.limits.perf_ms } }, { onProgress: strip.update });
      const verdict = SA.results.renderCheck(out, r, p, { ...hooks(), strip });
      if (verdict === 'accepted') {
        const first = !store.state.solved[id];
        store.state.solved[id] = store.state.solved[id] || Date.now();
        store.save();
        syncStatus();
        SA.renderSidebar(`p${id}`);
        if (first) SA.toast(`Solved #${id}`);
      }
      busy(false);
    }

    editor = SA.editor(edHost, draft || p.starter, {
      label: `Python solution for problem ${p.id}`, lineNumbers: true, onRun: run, onCheck: check,
      onChange: (v) => {
        if (stepping) stepping.stale();
        store.state.drafts[id] = v;
        store.save();
        saved.textContent = 'draft saved';
      },
    });
    runBtn.addEventListener('click', run);
    checkBtn.addEventListener('click', check);
    stepBtn.addEventListener('click', () => stepThrough({ test: p.spec.examples[0] }, 'Example 1'));
    let armed = false;
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        resetBtn.replaceChildren(icon('reset', 14), 'Click again to reset');
        setTimeout(() => {
          armed = false;
          resetBtn.replaceChildren(icon('reset', 14), 'Reset');
        }, 3000);
        return;
      }
      armed = false;
      editor.setValue(p.starter);
      delete store.state.drafts[id];
      store.save();
      resetBtn.replaceChildren(icon('reset', 14), 'Reset');
      saved.textContent = 'starter restored';
    });
    const work = el('div', { class: 'p-work' }, el('div', { class: 'work-card' },
      el('div', { class: 'work-title' }, el('span', null, 'Your solution'), saved),
      edHost,
      el('div', { class: 'work-bar' }, runBtn, checkBtn, stepBtn, el('span', { class: 'spacer' }), resetBtn),
      out));

    // ---------------------------------------------------------------- hints, solutions, wrong answers
    const bottom = el('div', { class: 'p-bottom' });
    if (p.hints.length) {
      const box = el('div', { class: 'hints' });
      let shown = 0;
      const more = el('button', { class: 'btn small', type: 'button' });
      const sync = () => {
        more.textContent = `Show hint ${shown + 1} of ${p.hints.length}`;
        more.hidden = shown >= p.hints.length;
      };
      more.addEventListener('click', () => {
        box.insertBefore(el('div', { class: 'hint' }, el('div', { class: 'hl' }, `Hint ${shown + 1}`), el('p', { html: p.hints[shown] })), more);
        shown++;
        sync();
      });
      sync();
      box.append(more);
      bottom.append(section('Hints', box));
    }

    // Run Check on someone else's code (an alternative or a wrong answer) and show the result inline.
    async function checkInline(code, host, btn) {
      btn.disabled = true;
      host.hidden = false;
      const strip = SA.results.progressStrip(p);
      host.replaceChildren(strip.node);
      const r = await SA.py.call('check', { problem: p.spec, code, opts: { perf_limit_ms: p.limits.perf_ms } }, { onProgress: strip.update });
      SA.results.renderCheck(host, r, p, { strip, onLine() {}, mark() {} });
      btn.disabled = false;
    }
    const copyBtn = (code, pre) => el('button', { class: 'btn ghost small', type: 'button', onclick: () => SA.copyText(code, pre) }, icon('copy', 14), 'Copy');
    const loadBtn = (code) => el('button', { class: 'btn small', type: 'button', onclick: () => {
      editor.setValue(code);
      editor.focus();
      SA.toast(`Loaded into the editor; ${SA.isMac ? '⌘' : 'Ctrl'}+Z undoes it`);
    } }, icon('load', 14), 'Load into editor');

    function solBlock(kind, title, code, html, time, space) {
      const pre = SA.codeBlock(code);
      const result = el('div', { class: 'inline-result', hidden: true, 'aria-live': 'polite' });
      const runCheck = el('button', { class: 'btn small', type: 'button' }, icon('check', 14), 'Run Check');
      runCheck.addEventListener('click', () => checkInline(code, result, runCheck));
      return el('div', { class: 'sol' },
        el('div', { class: 'sol-head' }, el('b', null, title),
          el('span', { class: 'tags' }, time ? SA.bigoOf(time, 'time') : null, space ? SA.bigoOf(space, 'space') : null)),
        pre,
        html ? el('div', { class: 'sol-body', html }) : null,
        el('div', { class: 'sol-actions' }, kind === 'alt' ? runCheck : null, loadBtn(code), copyBtn(code, pre)),
        result);
    }

    function ladder() {
      const rows = p.alternatives.map((a, i) => el('li', null, el('span', { class: 'step-n' }, i + 1),
        el('span', { class: 'name' }, a.title, a.slow ? el('small', null, 'too slow for the performance test') : null),
        el('span', { class: 'cx' }, SA.bigoOf(a.time, 'time'), SA.bigoOf(a.space, 'space'))));
      rows.push(el('li', { class: 'best' }, el('span', { class: 'step-n' }, rows.length + 1), el('span', { class: 'name' }, 'Reference solution', el('small', null, 'shown first below')),
        el('span', { class: 'cx' }, SA.bigoOf(p.solution.time, 'time'), SA.bigoOf(p.solution.space, 'space'))));
      return el('ol', { class: 'ladder', 'aria-label': 'Approaches from brute force to the reference' }, rows);
    }

    function revealBox(text, label, build) {
      const host = el('div');
      const box = el('div', { class: 'reveal' }, el('p', null, text),
        el('button', { class: 'btn', type: 'button', onclick: () => {
          box.remove();
          host.append(build());
          SA.hydrate(host);
        } }, label));
      host.append(box);
      return host;
    }

    bottom.append(section('Solutions', revealBox('Try it first. A solution sticks better after you have wrestled with the problem.', 'Show solutions', () => {
      const box = el('div', { class: 'solutions' });
      box.append(ladder());
      box.append(solBlock('ref', 'Reference solution', p.solution.code, p.solution.html, p.solution.time, p.solution.space));
      p.alternatives.forEach((a) => box.append(solBlock('alt', a.title, a.code, a.html, a.time, a.space)));
      return box;
    })));

    bottom.append(section('Common wrong answers', revealBox('Mistakes people often make here. Run each one to see exactly how it fails.', 'Show wrong answers', () => {
      const box = el('div', { class: 'wrongs' });
      p.wrongs.forEach((w) => {
        const pre = SA.codeBlock(w.code);
        const result = el('div', { class: 'inline-result', hidden: true, 'aria-live': 'polite' });
        const runIt = el('button', { class: 'btn small', type: 'button' }, icon('play', 14), 'Run it');
        runIt.addEventListener('click', () => checkInline(w.code, result, runIt));
        box.append(el('div', { class: 'sol trap' },
          el('div', { class: 'sol-head' }, el('b', null, w.title), el('span', { class: 'tags' }, el('span', { class: 'fails' }, SA.wrongTag(w)), runIt)),
          pre, w.html ? el('div', { class: 'sol-body', html: w.html }) : null, result));
      });
      return box;
    })));

    if (p.notesHtml) bottom.append(section('Notes', el('div', { class: 'prose p-notes', html: p.notesHtml })));
    const idx = SA.problemOrder.indexOf(p.id);
    const prev = SA.problemOrder[idx - 1];
    const next = SA.problemOrder[idx + 1];
    bottom.append(el('nav', { class: 'p-nav', 'aria-label': 'Problem navigation' },
      prev ? el('a', { class: 'btn', href: `#p${prev}` }, `← #${prev}`) : el('span'),
      m ? el('a', { class: 'btn ghost', href: `#${m.id}.practice` }, `All ${m.title} problems`) : null,
      next ? el('a', { class: 'btn', href: `#p${next}` }, `#${next} →`) : el('span')));

    SA.main.replaceChildren(el('div', { class: 'problem' }, top, work, bottom));
    SA.hydrate(SA.main);
    requestAnimationFrame(() => editor.refresh());
  };
})(window.SA);
