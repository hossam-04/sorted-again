// Practice tools built on the progress saved in this browser: the pattern drill (#drill), and the "Where to focus"
// section of the home page, which ranks the topics the evidence says need work.
(function (SA) {
  'use strict';
  const { el, icon } = SA;

  // Topics that are easy to mistake for each other: the drill's wrong options come from here.
  const NEIGHBOURS = {
    arrays: ['two-pointers', 'sliding-window', 'binary-search', 'greedy', 'bits-math'],
    'two-pointers': ['sliding-window', 'arrays', 'binary-search', 'linked-lists'],
    'sliding-window': ['two-pointers', 'arrays', 'heaps', 'stacks'],
    stacks: ['arrays', 'recursion', 'trees', 'sliding-window'],
    'binary-search': ['two-pointers', 'arrays', 'greedy', 'heaps'],
    'linked-lists': ['two-pointers', 'recursion', 'heaps', 'arrays'],
    recursion: ['backtracking', 'dp', 'trees', 'stacks'],
    trees: ['graphs', 'recursion', 'backtracking', 'tries'],
    tries: ['trees', 'backtracking', 'arrays', 'graphs'],
    heaps: ['greedy', 'intervals', 'binary-search', 'graphs'],
    backtracking: ['dp', 'recursion', 'graphs', 'trees'],
    graphs: ['trees', 'backtracking', 'dp', 'heaps'],
    intervals: ['greedy', 'heaps', 'arrays', 'binary-search'],
    greedy: ['dp', 'intervals', 'heaps', 'arrays'],
    dp: ['greedy', 'backtracking', 'recursion', 'graphs'],
    'bits-math': ['arrays', 'dp', 'greedy', 'two-pointers'],
    'ordered-structures': ['heaps', 'binary-search', 'sliding-window', 'range-queries'],
    'greedy-heaps': ['greedy', 'heaps', 'intervals', 'advanced-dp'],
    'range-queries': ['ordered-structures', 'binary-search', 'arrays', 'binary-lifting'],
    'binary-lifting': ['trees', 'range-queries', 'advanced-graphs', 'recursion'],
    'string-matching': ['sliding-window', 'tries', 'arrays', 'advanced-dp'],
    'advanced-graphs': ['graphs', 'advanced-dp', 'binary-lifting', 'heaps'],
    'advanced-dp': ['dp', 'backtracking', 'advanced-graphs', 'bits-math'],
    'number-theory': ['bits-math', 'advanced-dp', 'binary-search', 'arrays'],
  };
  const RECENT = 30;  // a drilled problem doesn't come back for this many rounds

  function shuffle(items, rng) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // One question: a problem, and four modules to choose from. Topics you keep missing come up twice as often.
  function drillRound({ modules, problems, state, rng = Math.random }) {
    const topics = modules.filter((m) => m.problems.length && NEIGHBOURS[m.id]);
    const recent = new Set(state.drillRecent || []);
    let pool = topics.flatMap((m) => m.problems.filter((id) => !recent.has(id)));
    if (!pool.length) pool = topics.flatMap((m) => m.problems);
    const weight = (id) => {
      const [seen, right] = (state.drill || {})[problems[id].module] || [0, 0];
      return seen >= 2 && right / seen < 0.6 ? 2 : 1;
    };
    let r = rng() * pool.reduce((n, id) => n + weight(id), 0);
    let problem = pool[pool.length - 1];
    for (const id of pool) {
      r -= weight(id);
      if (r < 0) { problem = id; break; }
    }
    const answer = problems[problem].module;
    const byId = Object.fromEntries(topics.map((m) => [m.id, m]));
    let wrong = shuffle(NEIGHBOURS[answer].filter((id) => byId[id]), rng).slice(0, 3);
    if (wrong.length < 3) wrong = wrong.concat(shuffle(topics.map((m) => m.id).filter((id) => id !== answer && !wrong.includes(id)), rng).slice(0, 3 - wrong.length));
    const options = shuffle([answer, ...wrong], rng).map((id) => ({ id, title: byId[id].title }));
    return { problem, answer, options };
  }

  // Counts are kept per topic: [questions seen, recognised].
  function recordDrill(state, q, chosen) {
    state.drill = state.drill || {};
    const s = state.drill[q.answer] || [0, 0];
    s[0] += 1;
    if (chosen === q.answer) s[1] += 1;
    state.drill[q.answer] = s;
    state.drillRecent = (state.drillRecent || []).concat(q.problem).slice(-RECENT);
    return chosen === q.answer;
  }

  // The topics that need work most, each with the evidence and one next step: the warm-up and lesson quizzes,
  // the drill, and problems attempted but not solved.
  function weakSpots({ modules, problems, state, limit = 3 }) {
    const quizzes = state.quiz || {};
    const spots = [];
    modules.forEach((m, order) => {
      const reasons = [];
      let score = 0;
      if (Object.values(quizzes).some((q) => (q.missed || []).includes(m.id))) {
        score += 1;
        reasons.push('missed in the warm-up quiz');
      }
      const quiz = quizzes[`${m.id}-q1`];
      if (quiz && quiz.total && quiz.right / quiz.total < 0.8) {
        score += 1.5 * (1 - quiz.right / quiz.total);
        reasons.push(`lesson quiz: ${quiz.right} of ${quiz.total}`);
      }
      const [seen, right] = (state.drill || {})[m.id] || [0, 0];
      if (seen >= 2 && right / seen < 0.75) {
        score += 1.5 * (1 - right / seen);
        reasons.push(`drill: recognised ${right} of ${seen}`);
      }
      const stuck = m.problems.filter((id) => (state.tried || {})[id] && !(state.solved || {})[id]);
      if (stuck.length) {
        score += 0.5 * Math.min(stuck.length, 3);
        reasons.push(`${stuck.length} attempted problem${stuck.length === 1 ? '' : 's'} not solved yet`);
      }
      if (!score) return;
      const open = stuck[0] || m.problems.find((id) => !(state.solved || {})[id]);
      const next = open
        ? { href: `#p${open}`, label: `${stuck.length ? 'Retry' : 'Try'} #${open} ${problems[open].title}` }
        : { href: `#${m.id}`, label: `Reread ${m.title}` };
      spots.push({ module: m, reasons, next, score, order });
    });
    return spots.sort((a, b) => b.score - a.score || a.order - b.order).slice(0, limit);
  }

  // ------------------------------------------------------------------ the drill page
  function drillView() {
    const { store } = SA;
    SA.setTitle('Pattern drill');
    const session = { seen: 0, right: 0 };
    const score = el('p', { class: 'drill-score', 'aria-live': 'polite' });
    const card = el('section', { class: 'drill-card', 'aria-label': 'Drill question' });
    const table = el('div');
    const allTime = () => Object.values(store.state.drill || {}).reduce((t, [s, r]) => [t[0] + s, t[1] + r], [0, 0]);
    const showScore = () => {
      const [s, r] = allTime();
      score.replaceChildren(el('b', null, `${session.right} of ${session.seen}`), ' this session', s ? ` · ${r} of ${s} in all` : '');
    };
    const showTable = () => {
      const rows = SA.modules.filter((m) => NEIGHBOURS[m.id]).map((m) => {
        const [s, r] = (store.state.drill || {})[m.id] || [0, 0];
        return el('tr', null, el('td', null, el('a', { href: `#${m.id}` }, m.title)), el('td', { class: 'num' }, s ? `${r} of ${s}` : '—'));
      });
      table.replaceChildren(el('details', { class: 'drill-by-topic' }, el('summary', null, 'Recognised so far, by topic'),
        el('div', { class: 'tablewrap' }, el('table', { class: 'md' }, el('thead', null, el('tr', null, el('th', null, 'Topic'), el('th', { class: 'num' }, 'Recognised'))), el('tbody', null, rows)))));
    };

    let onKeys = null;  // the current question's keys: 1-4 to answer, Enter for the next one
    const keydown = (e) => {
      if (!card.isConnected) {
        document.removeEventListener('keydown', keydown);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || !onKeys) return;
      if (e.target.closest && e.target.closest('input, textarea, select, button, a, .CodeMirror')) return;
      onKeys(e);
    };
    document.addEventListener('keydown', keydown);

    function ask() {
      const q = drillRound({ modules: SA.modules, problems: SA.problems, state: store.state });
      const p = SA.problems[q.problem];
      let answered = false;
      const feedback = el('div', { class: 'drill-feedback', hidden: true });
      const nextBtn = el('button', { class: 'btn primary', type: 'button', onclick: ask }, 'Next problem', SA.kbd('↵'));
      const opts = q.options.map((o, k) => el('button', { class: 'quiz-opt', type: 'button', 'data-module': o.id },
        el('span', { class: 'mark', 'aria-hidden': 'true' }, String(k + 1)), el('span', null, o.title)));
      function choose(k) {
        if (answered) return;
        answered = true;
        const chosen = q.options[k].id;
        const right = recordDrill(store.state, q, chosen);
        store.save();
        session.seen += 1;
        if (right) session.right += 1;
        opts.forEach((b, j) => {
          b.disabled = true;
          if (q.options[j].id === q.answer) {
            b.classList.add('correct');
            b.querySelector('.mark').textContent = '✓';
          } else if (j === k) {
            b.classList.add('wrong');
            b.querySelector('.mark').textContent = '✕';
          }
        });
        const topic = SA.moduleById[q.answer];
        feedback.replaceChildren(
          el('p', { class: 'drill-verdict' }, right ? 'Right.' : `Not quite: this one belongs to ${topic.title}.`),
          el('p', null, el('a', { href: `#p${p.id}` }, `#${p.id} ${p.title}`), ` · ${p.patterns.join(' · ')}`),
          el('div', { class: 'drill-actions' }, nextBtn, el('a', { class: 'btn', href: `#p${p.id}` }, 'Open the problem'), el('a', { class: 'btn ghost', href: `#${topic.id}` }, `Read ${topic.title}`)));
        feedback.hidden = false;
        showScore();
        showTable();
        nextBtn.focus({ preventScroll: true });
      }
      opts.forEach((b, k) => b.addEventListener('click', () => choose(k)));
      card.replaceChildren(
        el('div', { class: 'kicker' }, 'Which technique solves this?'),
        el('div', { class: 'p-task drill-task', html: p.taskHtml }),
        el('div', { class: 'quiz-opts' }, opts),
        feedback);
      onKeys = (e) => {
        if (!answered && /^[1-4]$/.test(e.key)) { e.preventDefault(); choose(Number(e.key) - 1); }
        else if (answered && e.key === 'Enter') { e.preventDefault(); ask(); }
      };
      if (session.seen) window.scrollTo(0, 0);
    }

    SA.main.replaceChildren(el('div', { class: 'lesson drill' },
      el('div', { class: 'kicker' }, 'Practice'),
      el('h1', { class: 'title' }, 'Pattern drill'),
      el('p', { class: 'lede' }, 'Read a problem and name the technique that solves it. Spotting the pattern is half the work in an interview, and this trains it in seconds per question. Press 1 to 4 to answer.'),
      score, card, table));
    showScore();
    showTable();
    ask();
  }

  // ------------------------------------------------------------------ the home page's "Where to focus"
  function focusSection() {
    const spots = weakSpots({ modules: SA.modules, problems: SA.problems, state: SA.store.state });
    const drill = el('a', { class: 'btn', href: '#drill' }, 'Pattern drill');
    const fc = SA.flash ? SA.flash.status() : null;
    const toStudy = fc ? fc.due.length + fc.fresh.length : 0;
    const cards = el('a', { class: toStudy ? 'btn primary' : 'btn', href: '#flashcards' }, toStudy ? `Flashcards · ${toStudy} due today` : 'Flashcards');
    const body = spots.length
      ? el('div', { class: 'focus-grid' }, spots.map((s) => el('div', { class: 'focus-card' },
        el('h3', null, el('a', { href: `#${s.module.id}` }, s.module.title)),
        el('ul', null, s.reasons.map((r) => el('li', null, r))),
        el('a', { class: 'btn small', href: s.next.href }, icon('next', 14), s.next.label))))
      : el('p', { class: 'focus-empty' }, 'Nothing to point at yet. Take the ', el('a', { href: '#start' }, 'warm-up quiz'),
        ', try a few rounds of the ', el('a', { href: '#drill' }, 'pattern drill'), ' or attempt some problems, and this section will show the topics that need the most work. Finished modules also bring their ', el('a', { href: '#flashcards' }, 'flashcards'), ' into your deck.');
    return [el('div', { class: 'section-head' }, el('h2', null, 'Where to focus'), el('div', { class: 'head-actions' }, cards, drill)), body];
  }

  SA.practice = { NEIGHBOURS, drillRound, recordDrill, weakSpots, focusSection };
  SA.views = SA.views || {};
  SA.views.drill = drillView;
})(window.SA = window.SA || {});
