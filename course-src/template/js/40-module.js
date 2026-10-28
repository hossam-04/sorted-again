// The module page: lesson prose with runnable examples, quizzes and visualizers, then the module's problems.
(function (SA) {
  'use strict';
  const { el, icon, store, pad2 } = SA;
  const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

  // ------------------------------------------------------------------ runnable examples
  function renderOutput(host, out, hooks) {
    host.replaceChildren();
    if (out.timeout) {
      host.append(SA.msgBox('error', 'This ran longer than 10 s and was stopped.', 'Look for a loop that never ends.'));
      return;
    }
    if (out.unavailable) {
      host.append(SA.msgBox('error', `Python isn't available in this browser: ${out.error}`, 'The output below each example was computed when the course was built.'));
      return;
    }
    if (out.crashed || out.stdout === undefined) {
      host.append(SA.results.crashBox(out));
      return;
    }
    if (out.stdout) host.append(el('pre', { class: 'stdout' }, out.stdout));
    if (out.error) host.append(el('div', { class: 'ex-err' }, SA.results.errorBlock(out.error, hooks)));
    if (!out.stdout && !out.error) host.append(el('div', { class: 'out-ok' }, 'Ran without printing anything.'));
  }

  function hydrateExample(host, ex) {
    const codeWrap = el('div', { class: 'ex-code' }, SA.codeBlock(ex.code));
    const out = el('div', { class: 'ex-out', 'aria-live': 'polite' });
    const note = el('span', { class: 'note' }, 'output from when the course was built');
    let editor = null;
    const hooks = { onLine: (n) => editor && editor.setCursor(n), mark: (n) => editor && editor.markError(n) };
    const runBtn = el('button', { class: 'btn primary small', type: 'button' }, icon('play', 14), 'Run');
    const editBtn = el('button', { class: 'btn small', type: 'button' }, icon('edit', 14), 'Edit');
    const resetBtn = el('button', { class: 'btn ghost small', type: 'button', hidden: true }, icon('reset', 14), 'Reset');
    async function run() {
      runBtn.disabled = true;
      if (editor) editor.clearMarks();
      note.textContent = SA.py.state === 'ready' ? 'running…' : 'starting Python…';
      const r = await SA.py.call('exec', { code: editor ? editor.getValue() : ex.code, limit_ms: 10000 });
      renderOutput(out, r, hooks);
      note.textContent = r.ms !== undefined ? `ran here in ${SA.fmtMs(r.ms)}` : '';
      runBtn.disabled = false;
    }
    const edit = () => {
      if (editor) {
        editor.focus();
        return;
      }
      codeWrap.replaceChildren();
      editor = SA.editor(codeWrap, ex.code, { onRun: run, label: 'Example code' });
      editBtn.hidden = true;
      resetBtn.hidden = false;
      editor.focus();
    };
    runBtn.addEventListener('click', run);
    editBtn.addEventListener('click', edit);
    codeWrap.addEventListener('dblclick', () => { if (!editor) edit(); });
    resetBtn.addEventListener('click', () => {
      editor.setValue(ex.code);
      editor.clearMarks();
      renderOutput(out, ex.output, hooks);
      note.textContent = 'output from when the course was built';
    });
    host.replaceChildren(...[ex.title ? el('div', { class: 'ex-title' }, ex.title) : null, codeWrap,
      el('div', { class: 'ex-bar' }, runBtn, editBtn, resetBtn, el('span', { class: 'spacer' }), note), out].filter(Boolean));
    renderOutput(out, ex.output, hooks);
  }

  // ------------------------------------------------------------------ quizzes
  function hydrateQuiz(host, quiz, m) {
    const n = quiz.questions.length;
    let answered = 0;
    let right = 0;
    const missed = [];
    const score = el('div', { class: 'quiz-score', 'aria-live': 'polite' }, `0 of ${n} answered`);
    const prev = store.state.quiz[quiz.id];
    const before = prev ? el('div', { class: 'quiz-prev' }, `Last time: ${prev.right} of ${prev.total} correct.`) : null;
    const tagged = quiz.questions.some((q) => q.module);
    const finish = () => {
      store.state.quiz[quiz.id] = { right, total: n, at: Date.now(), ...(tagged ? { missed: [...new Set(missed)] } : {}) };  // missed: for Where to focus
      store.save();
      score.replaceChildren(`${right} of ${n} correct.`);
      if (tagged) {
        const mods = [...new Set(missed)].map((id) => SA.moduleById[id]).filter(Boolean);
        if (mods.length) {
          score.append(' Start with: ');
          mods.forEach((m, i) => score.append(i ? ', ' : '', el('a', { href: `#${m.id}` }, m.title)));
          score.append('.');
        } else score.append(' No weak spots found. Skim the modules and spend your time on the problems.');
      }
    };
    quiz.questions.forEach((q, qi) => {
      const opts = el('div', { class: 'quiz-opts' });
      const explain = el('div', { class: 'quiz-explain', hidden: true, html: q.explain });
      q.options.forEach((o, oi) => {
        const b = el('button', { class: 'quiz-opt', type: 'button' }, el('span', { class: 'mark', 'aria-hidden': 'true' }), el('span', { html: o }));
        b.addEventListener('click', () => {
          [...opts.children].forEach((x, xi) => {
            x.disabled = true;
            if (xi === q.answer) {
              x.classList.add('correct');
              x.querySelector('.mark').textContent = '✓';
            }
          });
          if (oi !== q.answer) {
            b.classList.add('wrong');
            b.querySelector('.mark').textContent = '✕';
            if (q.module) missed.push(q.module);
          } else right++;
          b.setAttribute('aria-label', (oi === q.answer ? 'Correct: ' : 'Incorrect: ') + b.textContent);
          answered++;
          explain.hidden = false;
          if (answered === n) finish();
          else score.textContent = `${answered} of ${n} answered · ${right} correct`;
        });
        opts.append(b);
      });
      host.append(el('div', { class: 'quiz-q', id: q.anchor ? `${m.id}.${q.anchor}` : null }, el('div', { class: 'qtext' }, el('span', { class: 'qnum' }, `Q${qi + 1}`), el('span', { html: q.q })), opts, explain));
    });
    if (before) host.append(before);
    host.append(score);
  }

  // ------------------------------------------------------------------ the page
  SA.problemList = (ids) => el('ol', { class: 'plist' }, ids.map((id) => {
    const p = SA.problems[id];
    return el('li', null, el('a', { href: `#p${id}` }, SA.statusIcon(id), el('span', { class: 'pnum' }, `#${id}`),
      el('span', { class: 'ptitle' }, p.title, p.blind75 ? el('span', { class: 'tag75', title: 'Part of the Blind 75 list' }, 'B75') : null,
        el('span', { class: 'ptags' }, p.patterns.join(' · '))), SA.diffChip(p.difficulty)));
  }));

  SA.views.module = function (m, section) {
    SA.setTitle(m.title);
    const pr = SA.moduleProgress(m);
    const doneBtn = el('button', { class: 'btn small', type: 'button' });
    const syncDone = () => {
      const d = !!store.state.done[m.id];
      doneBtn.replaceChildren(icon(d ? 'done' : 'circle', 14), d ? 'Finished' : 'Mark as finished');
      doneBtn.setAttribute('aria-pressed', String(d));
    };
    syncDone();
    doneBtn.addEventListener('click', () => {
      if (store.state.done[m.id]) delete store.state.done[m.id];
      else {
        store.state.done[m.id] = Date.now();
        if (!(store.state.flashDeck[m.id] > 0)) store.state.flashDeck[m.id] = Date.now();  // its flashcards join the deck
      }
      store.save();
      syncDone();
      SA.renderSidebar(m.id);
    });
    const cardCount = (SA.course.cards || []).filter((c) => c.module === m.id).length;
    const prose = el('div', { class: 'prose', html: m.html });
    const h2s = [...prose.querySelectorAll('h2')];
    const used = new Set();
    prose.querySelectorAll('h2, h3').forEach((h) => {
      // The build gives headings their ids (tools/content.mjs, the same rule); older course data may not.
      if (!h.id) {
        let id = slug(h.textContent);
        while (used.has(id)) id += '-x';
        used.add(id);
        h.id = `${m.id}.${id}`;
      }
      h.append(el('a', { class: 'anchor', href: `#${h.id}`, 'aria-label': 'Link to this section' }, '#'));
    });
    const toc = h2s.length >= 6 || m.problems.length >= 12
      ? el('ul', { class: 'toc', 'aria-label': 'In this module' }, h2s.map((h) => el('li', null, el('a', { href: `#${h.id}` }, h.textContent.replace(/#$/, '')))),
        m.problems.length ? el('li', null, el('a', { href: `#${m.id}.practice` }, 'Practice')) : null)
      : null;
    const head = el('header', { class: 'lesson-head' },
      el('div', { class: 'kicker' }, `Module ${pad2(m.num)}${m.kicker ? ' · ' + m.kicker : ''}`),
      el('h1', { class: 'title' }, m.title),
      m.summary ? el('p', { class: 'lede' }, m.summary) : null,
      el('div', { class: 'meta' },
        el('span', null, el('b', null, `~${m.minutes} min`)),
        m.examples.length ? el('span', null, el('b', null, m.examples.length), ` runnable example${m.examples.length === 1 ? '' : 's'}`) : null,
        m.viz.length ? el('span', null, el('b', null, m.viz.length), ` visualizer${m.viz.length === 1 ? '' : 's'}`) : null,
        m.problems.length ? el('span', null, el('b', null, `${pr.solved}/${pr.total}`), ' problems solved') : null,
        cardCount ? el('a', { class: 'meta-link', href: `#flashcards.${m.id}` }, el('b', null, cardCount), ` flashcard${cardCount === 1 ? '' : 's'}`) : null,
        doneBtn),
      toc);
    const parts = [head, prose];
    if (m.problems.length) {
      parts.push(el('section', { class: 'practice', id: `${m.id}.practice` },
        el('h2', null, 'Practice'),
        el('p', null, 'Each problem opens with an editor, Run and Check. Solve it here, then submit the same code on LeetCode if you like.'),
        SA.problemList(m.problems)));
    }
    const i = SA.modules.indexOf(m);
    const prev = SA.modules[i - 1];
    const next = SA.modules[i + 1];
    parts.push(el('nav', { class: 'pager', 'aria-label': 'Module navigation' },
      prev ? el('a', { href: `#${prev.id}` }, el('small', null, 'Previous'), prev.title) : el('span'),
      next ? el('a', { class: 'next', href: `#${next.id}` }, el('small', null, 'Next'), next.title) : el('span')));
    SA.main.replaceChildren(el('article', { class: 'lesson' }, parts));

    const exById = Object.fromEntries(m.examples.map((x) => [x.id, x]));
    const quizById = Object.fromEntries(m.quizzes.map((q) => [q.id, q]));
    const vizById = Object.fromEntries(m.viz.map((v) => [v.id, v]));
    prose.querySelectorAll('.example[data-ex]').forEach((h) => exById[h.dataset.ex] && hydrateExample(h, exById[h.dataset.ex]));
    prose.querySelectorAll('.quiz[data-quiz]').forEach((h) => quizById[h.dataset.quiz] && hydrateQuiz(h, quizById[h.dataset.quiz], m));
    prose.querySelectorAll('.viz-host[data-viz]').forEach((h) => vizById[h.dataset.viz] && SA.viz.mount(h, vizById[h.dataset.viz]));
    SA.hydrate(SA.main);
    if (section) {
      const target = document.getElementById(`${m.id}.${section}`);
      if (target) requestAnimationFrame(() => {
        target.scrollIntoView({ block: /^(q-|gotcha-|cx-)/.test(section) ? 'center' : 'start' });
        if (/^(q-|gotcha-|cx-)/.test(section)) SA.flashTarget(target);
      });
    }
  };
})(window.SA);
