// Home, the problems index, the playground, the patterns cheat sheet and the complexity reference.
(function (SA) {
  'use strict';
  const { el, icon, store, pad2 } = SA;

  // ------------------------------------------------------------------ home
  function progressPanel() {
    const box = el('textarea', { id: 'progress-code', 'aria-label': 'Progress code', spellcheck: 'false', placeholder: 'Paste a progress code here to import it.' });
    const msg = el('span', { class: 'msg', 'aria-live': 'polite' });
    return el('div', { class: 'progress-io' },
      el('p', null, 'Progress is saved in this browser only. To move it (for example from the downloaded file to the online version), copy your progress code here and paste it there.'),
      box,
      el('div', { class: 'row' },
        el('button', { class: 'btn small', type: 'button', onclick: () => {
          box.value = store.exportCode();
          box.select();
          SA.copyText(box.value, box);
          msg.textContent = 'Progress code copied. Paste it into the other copy of the course.';
        } }, icon('copy', 14), 'Copy progress code'),
        el('button', { class: 'btn small', type: 'button', onclick: () => {
          const r = store.importCode(box.value);
          msg.textContent = r.message;
          if (r.ok) {
            SA.renderSidebar('home');
            // Redraw home with the imported progress, unless the reader has already moved on.
            const here = location.hash;
            setTimeout(() => { if (location.hash === here) SA.route(); }, 1200);
          }
        } }, icon('load', 14), 'Import'),
        msg));
  }

  SA.views.home = function () {
    SA.setTitle('');
    const byDiff = { Easy: [0, 0], Medium: [0, 0], Hard: [0, 0] };
    for (const id of SA.problemOrder) {
      const d = SA.problems[id].difficulty;
      if (!byDiff[d]) continue;
      byDiff[d][1]++;
      if (SA.isSolved(id)) byDiff[d][0]++;
    }
    const all = [SA.problemOrder.filter(SA.isSolved).length, SA.problemOrder.length];
    const last = store.state.last && store.state.last !== 'home' ? store.state.last : '';
    const lastLabel = (() => {
      const pg = last.split('.')[0];
      if (SA.moduleById[pg]) return `Continue: ${SA.moduleById[pg].title}`;
      if (/^p\d+$/.test(pg) && SA.problems[pg.slice(1)]) return `Continue: #${pg.slice(1)} ${SA.problems[pg.slice(1)].title}`;
      return null;
    })();
    const meta = SA.course.meta;
    const advancedCount = SA.problemOrder.filter((id) => SA.problems[id].track === 'advanced').length;
    const statRow = (label, [s, t]) => el('tr', null, el('td', null, label), el('td', { class: 'num' }, s), el('td', { class: 'num' }, t),
      el('td', null, el('span', { class: 'bar', role: 'img', 'aria-label': `${Math.round((100 * s) / Math.max(t, 1))}%` }, el('i', { style: `width:${(100 * s) / Math.max(t, 1)}%` }))));
    const first = SA.moduleById.start || SA.modules[0];
    const hero = el('section', { class: 'hero' },
      el('div', null,
        el('div', { class: 'kicker' }, 'Data structures and algorithms, in Python'),
        el('h1', { html: 'Get your algorithms back by <span class="fn">running</span> them.' }),
        el('p', { class: 'lede' }, `For people who learned this once. ${SA.count(SA.modules.length, 'short module')}, ${SA.count(meta.vizCount, 'step-through visualizer')} and ${SA.count(SA.problemOrder.length, 'problem')}: the NeetCode 150 list${advancedCount ? `, then ${advancedCount} advanced ones` : ''}, in Python ${meta.python.split('.').slice(0, 2).join('.')}. Each one is checked right here against hidden edge cases, randomised tests and a performance test.`),
        el('div', { class: 'actions' },
          lastLabel ? el('a', { class: 'btn primary', href: `#${last}` }, lastLabel) : first ? el('a', { class: 'btn primary', href: `#${first.id}` }, first.id === 'start' ? 'Start with the warm-up' : `Start: ${first.title}`) : null,
          el('a', { class: 'btn', href: '#problems' }, 'Browse problems'),
          el('a', { class: 'btn ghost', href: '#patterns' }, 'Patterns cheat sheet'))),
      el('div', { class: 'repl' },
        el('div', { class: 'in', html: '<span class="prompt">&gt;&gt;&gt;</span> my.progress(by=<span class="t-s">"difficulty"</span>)' }),
        el('table', null,
          el('thead', null, el('tr', null, el('th', null, 'difficulty'), el('th', { class: 'num' }, 'solved'), el('th', { class: 'num' }, 'total'), el('th', null, el('span', { class: 'sr' }, 'share')))),
          el('tbody', null, statRow('Easy', byDiff.Easy), statRow('Medium', byDiff.Medium), statRow('Hard', byDiff.Hard), statRow('All', all))),
        el('div', { class: 'foot' }, el('span', null, `${Object.keys(store.state.done).length} of ${SA.modules.length} modules finished`), el('span', null, 'saved in this browser'))));
    const map = el('div', { class: 'course-map' }, el('table', null,
      el('thead', null, el('tr', null, el('th', null, 'n'), el('th', null, 'Module'), el('th', { class: 'c' }, 'Covers'), el('th', { style: 'text-align:right' }, 'Problems'))),
      el('tbody', null, SA.modules.map((m) => {
        const partRow = m.part === 'advanced' && m === SA.modules.find((x) => x.part === 'advanced')
          ? el('tr', { class: 'part' }, el('th', { colspan: '4' }, 'Advanced', el('small', null, 'Beyond the NeetCode 150: the structures and techniques behind most Hard problems. Each module builds on the core modules it names.')))
          : null;
        const pr = SA.moduleProgress(m);
        const done = !!store.state.done[m.id];
        const tr = el('tr', { class: 'link' }, el('td', { class: 'n' }, pad2(m.num)),
          el('td', { class: 'm' }, el('a', { href: `#${m.id}` }, m.title), el('small', null, m.summary)),
          el('td', { class: 'c' }, m.kicker),
          el('td', { class: 'p' }, done ? el('span', { class: 'status solved' }, icon('done', 16), pr.total ? `${pr.solved}/${pr.total}` : 'done') : pr.total ? `${pr.solved}/${pr.total}` : el('span', { class: 'none' }, '—')));
        tr.addEventListener('click', (e) => { if (e.target.tagName !== 'A') location.hash = m.id; });
        return partRow ? [partRow, tr] : tr;
      }))));
    const how = el('div', { class: 'how' },
      el('div', null, el('h3', null, 'Python runs in this page'), el('p', null, `Real CPython ${meta.python}, built into the page. Nothing you type leaves your browser, and it keeps working offline once loaded.`)),
      el('div', null, el('h3', null, 'Checked like LeetCode, then some'), el('p', null, 'Check runs your code on hidden edge cases, 40 random inputs compared with a brute-force answer, and one large input with a time limit.')),
      el('div', null, el('h3', null, 'Step through the idea'), el('p', null, 'Visualizers replay the key algorithms line by line. Change the input and trace it again.')),
      el('div', null, el('h3', null, 'Your code works on LeetCode too'), el('p', null, 'Signatures, predefined classes like ListNode and TreeNode, and the usual imports match LeetCode, so you can paste solutions either way.')));
    SA.main.replaceChildren(el('div', { class: 'home' }, hero, ...SA.practice.focusSection(),
      el('div', { class: 'section-head' }, el('h2', null, 'The course'), el('p', null, 'Top to bottom, or jump to whatever feels rusty.')), map,
      el('div', { class: 'section-head' }, el('h2', null, 'How this page works')), how,
      el('div', { class: 'section-head' }, el('h2', null, 'Your progress')), progressPanel()));
  };

  // ------------------------------------------------------------------ problems index
  const filters = { q: '', diff: 'All', status: 'All', track: 'All', module: 'all', b75: false };
  SA.views.problems = function () {
    SA.setTitle('Problems');
    const search = el('input', { type: 'search', id: 'problem-search', placeholder: 'Search by number, title or pattern', 'aria-label': 'Search problems', value: filters.q });
    const seg = (key, values) => el('div', { class: 'seg', role: 'group', 'aria-label': { diff: 'Difficulty', status: 'Status', track: 'Track' }[key] }, values.map((v) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(filters[key] === v) }, v);
      b.addEventListener('click', () => {
        filters[key] = v;
        b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        draw();
      });
      return b;
    }));
    const modOption = (m) => el('option', { value: m.id, selected: filters.module === m.id }, `${pad2(m.num)} ${m.title}`);
    const withProblems = SA.modules.filter((m) => m.problems.length);
    const advanced = withProblems.filter((m) => m.part === 'advanced');
    const modSel = el('select', { id: 'problem-module', 'aria-label': 'Module' }, el('option', { value: 'all' }, 'All modules'),
      advanced.length
        ? [el('optgroup', { label: 'NeetCode 150' }, withProblems.filter((m) => m.part !== 'advanced').map(modOption)), el('optgroup', { label: 'Advanced' }, advanced.map(modOption))]
        : withProblems.map(modOption));
    modSel.addEventListener('change', () => { filters.module = modSel.value; draw(); });
    const b75 = el('button', { class: 'btn small', type: 'button', 'aria-pressed': String(filters.b75) }, 'Blind 75 only');
    b75.addEventListener('click', () => {
      filters.b75 = !filters.b75;
      b75.setAttribute('aria-pressed', String(filters.b75));
      draw();
    });
    const tbody = el('tbody');
    const count = el('p', { class: 'meta' });
    function draw() {
      const q = filters.q.trim().toLowerCase();
      const ids = SA.problemOrder.filter((id) => {
        const p = SA.problems[id];
        if (filters.diff !== 'All' && p.difficulty !== filters.diff) return false;
        if (filters.status === 'Solved' && !SA.isSolved(id)) return false;
        if (filters.status === 'To do' && SA.isSolved(id)) return false;
        if (filters.module !== 'all' && p.module !== filters.module) return false;
        if (filters.track !== 'All' && (p.track === 'advanced') !== (filters.track === 'Advanced')) return false;
        if (filters.b75 && !p.blind75) return false;
        if (q && !`${id} ${p.title} ${p.lcTitle} ${p.patterns.join(' ')} ${SA.moduleById[p.module].title}`.toLowerCase().includes(q)) return false;
        return true;
      });
      tbody.replaceChildren(...ids.map((id) => {
        const p = SA.problems[id];
        const m = SA.moduleById[p.module];
        return el('tr', null,
          el('td', null, SA.statusIcon(id)),
          el('td', { class: 'id' }, id),
          el('td', null, el('a', { href: `#p${id}` }, p.title), p.blind75 ? el('span', { class: 'tag75', title: 'Part of the Blind 75 list' }, 'B75') : null),
          el('td', null, SA.diffChip(p.difficulty)),
          el('td', { class: 'mod' }, `${pad2(m.num)} ${m.title}`),
          el('td', { class: 'pat' }, p.patterns.join(' · ')));
      }));
      if (!ids.length) tbody.append(el('tr', null, el('td', { colspan: '6', class: 'empty' }, 'No problems match these filters.')));
      count.replaceChildren(el('span', null, el('b', null, ids.length), ` of ${SA.problemOrder.length} shown`), el('span', null, el('b', null, SA.problemOrder.filter(SA.isSolved).length), ' solved'));
    }
    search.addEventListener('input', () => { filters.q = search.value; draw(); });
    SA.main.replaceChildren(el('div', { class: 'home' },
      el('div', { class: 'kicker' }, 'Practice'),
      el('h1', { class: 'title' }, 'All problems'),
      el('p', { class: 'lede' }, `Every problem from the NeetCode 150 list${SA.problemOrder.some((id) => SA.problems[id].track === 'advanced') ? ', then the advanced part\'s problems,' : ''} grouped by the module that teaches the idea. The 7 that are Premium on LeetCode are written here as the course's own versions. Descriptions and test data are the course's own; the titles link to LeetCode.`),
      el('div', { class: 'filters' }, search, seg('diff', ['All', 'Easy', 'Medium', 'Hard']), seg('status', ['All', 'To do', 'Solved']), seg('track', ['All', 'NeetCode 150', 'Advanced']), modSel, b75),
      count,
      el('div', { class: 'ptable-wrap' }, el('table', { class: 'ptable' },
        el('thead', null, el('tr', null, el('th', null, el('span', { class: 'sr' }, 'Status')), el('th', null, '#'), el('th', null, 'Problem'), el('th', null, 'Level'), el('th', { class: 'mod' }, 'Module'), el('th', { class: 'pat' }, 'Patterns'))),
        tbody))));
    draw();
  };

  // ------------------------------------------------------------------ playground
  const SAMPLE = `# Scratchpad: plain Python 3.14. ${SA.isMac ? '⌘' : 'Ctrl'}+Enter runs it.
import time

nums = list(range(200_000))
as_set = set(nums)

t = time.perf_counter()
print(199_999 in nums)      # scans the whole list: O(n)
print(f"list: {(time.perf_counter() - t) * 1000:.2f} ms")

t = time.perf_counter()
print(199_999 in as_set)    # one hash lookup: O(1) on average
print(f"set:  {(time.perf_counter() - t) * 1000:.3f} ms")
`;
  SA.views.playground = function () {
    SA.setTitle('Playground');
    const out = el('div', { class: 'work-out', 'aria-live': 'polite' }, el('div', { class: 'placeholder' }, 'Run prints your output here. Each run starts from a clean slate.'));
    const edHost = el('div', { class: 'editor-host' });
    let editor;
    const runBtn = el('button', { class: 'btn primary', type: 'button' }, icon('play', 14), 'Run', SA.kbd('Mod+↵'));
    async function run() {
      runBtn.disabled = true;
      editor.clearMarks();
      out.replaceChildren(SA.results.pending(SA.py.state === 'ready' ? 'Running…' : 'Starting Python, then running…'));
      const r = await SA.py.call('exec', { code: editor.getValue(), limit_ms: 10000 });
      const hooks = { onLine: (n) => editor.setCursor(n), mark: (n) => editor.markError(n) };
      out.replaceChildren();
      if (r.timeout) out.append(SA.msgBox('error', 'This ran longer than 10 s and was stopped.', 'Look for a loop that never ends.'));
      else if (r.unavailable) out.append(SA.msgBox('error', `Python isn't available in this browser: ${r.error}`));
      else if (r.stdout === undefined) out.append(SA.results.crashBox(r));
      else {
        if (r.stdout) out.append(el('pre', { class: 'stdout' }, r.stdout));
        if (r.error) out.append(el('div', { class: 'ex-err' }, SA.results.errorBlock(r.error, hooks)));
        out.append(el('div', { class: 'out-foot' }, el('span', null, r.error ? 'stopped with an error' : 'finished'), el('span', null, SA.fmtMs(r.ms))));
      }
      runBtn.disabled = false;
    }
    editor = SA.editor(edHost, store.state.play || SAMPLE, { label: 'Playground code', lineNumbers: true, onRun: run, onChange: (v) => { store.state.play = v; store.save(); } });
    runBtn.addEventListener('click', run);
    const templates = SA.course.templates || [];
    const pick = el('select', { id: 'play-template', 'aria-label': 'Load a pattern template' }, el('option', { value: '' }, templates.length ? 'Load a pattern template…' : 'Templates arrive with the cheat sheet'),
      templates.map((t, i) => el('option', { value: String(i) }, t.title)));
    pick.addEventListener('change', () => {
      if (pick.value === '') return;
      editor.setValue(templates[Number(pick.value)].code);
      pick.value = '';
      SA.toast(`Loaded the template; ${SA.isMac ? '⌘' : 'Ctrl'}+Z undoes it`);
    });
    const reset = el('button', { class: 'btn ghost small', type: 'button', onclick: () => { editor.setValue(SAMPLE); } }, icon('reset', 14), 'Reset');
    SA.main.replaceChildren(el('div', null,
      el('div', { class: 'kicker' }, 'Free practice'),
      el('h1', { class: 'title' }, 'Playground'),
      el('p', { class: 'lede', style: 'margin-bottom:24px' }, 'Any Python you like: try an idea, time two approaches, or load a pattern template from the cheat sheet. This is a plain script, so write your own imports.'),
      el('div', { class: 'play' }, el('div', { class: 'work-card' },
        el('div', { class: 'work-title' }, el('span', null, 'Scratchpad'), el('span', { class: 'play-tools' }, pick)),
        edHost,
        el('div', { class: 'work-bar' }, runBtn, el('span', { class: 'spacer' }), reset),
        out))));
    requestAnimationFrame(() => editor.refresh());
  };

  // ------------------------------------------------------------------ reference pages
  // A section of a reference page (#patterns.<slug>, #complexity.cx-…), scrolled to and marked once it renders.
  const showSection = (id) => {
    const target = id && document.getElementById(id);
    if (target) requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center' });
      SA.flashTarget(target);
    });
  };

  SA.views.patterns = function (section) {
    SA.setTitle('Patterns cheat sheet');
    const grid = el('div', { class: 'sheet-grid', html: SA.course.cheatsheet || '' });
    SA.main.replaceChildren(el('div', { class: 'sheet' },
      el('div', { class: 'kicker' }, 'Reference'),
      el('h1', { class: 'title' }, 'Patterns cheat sheet'),
      el('p', { class: 'lede' }, 'When you see this, think that: the signals that point to each pattern, with a Python template you can load into the Playground.'),
      SA.course.cheatsheet ? grid : el('p', { class: 'empty' }, 'The cheat sheet has not been written yet.')));
    SA.hydrate(SA.main);
    if (section) showSection(`patterns.${section}`);
  };

  SA.views.complexity = function (section) {
    SA.setTitle('Complexity reference');
    SA.main.replaceChildren(el('div', { class: 'reference' },
      el('div', { class: 'kicker' }, 'Reference'),
      el('h1', { class: 'title' }, 'Complexity reference'),
      el('p', { class: 'lede' }, 'What Python’s built-ins cost, what the classic algorithms cost, and which complexity an input size allows.'),
      SA.course.complexity ? el('div', { class: 'prose', html: SA.course.complexity }) : el('p', { class: 'empty' }, 'The reference has not been written yet.')));
    SA.hydrate(SA.main);
    if (section) showSection(`complexity.${section}`);
  };
})(window.SA);
