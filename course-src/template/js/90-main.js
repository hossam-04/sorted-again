// App shell: boot, theme, the Python status pill, sidebar, drawer and the hash router.
(function (SA) {
  'use strict';
  const { el, icon, store, pad2 } = SA;

  // ------------------------------------------------------------------ data
  const data = JSON.parse(document.getElementById('course-data').textContent);
  SA.course = data;
  SA.modules = data.modules;
  SA.moduleById = Object.fromEntries(data.modules.map((m) => [m.id, m]));
  SA.problems = data.problems;
  SA.problemOrder = data.modules.flatMap((m) => m.problems);
  SA.isSolved = (id) => !!store.state.solved[id];
  SA.moduleProgress = (m) => ({ solved: m.problems.filter(SA.isSolved).length, total: m.problems.length });

  // ------------------------------------------------------------------ theme
  const THEMES = ['system', 'light', 'dark'];
  const themeBtn = document.getElementById('theme-btn');
  function applyTheme() {
    const t = THEMES.includes(store.state.theme) ? store.state.theme : 'system';
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    themeBtn.replaceChildren(icon(t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'half', 18));
    themeBtn.setAttribute('aria-label', `Theme: ${t}. Change theme`);
    themeBtn.title = `Theme: ${t}`;
  }
  themeBtn.addEventListener('click', () => {
    const i = THEMES.indexOf(store.state.theme);
    store.state.theme = THEMES[(i + 1) % THEMES.length];
    store.saveNow();
    applyTheme();
    SA.toast(`Theme: ${store.state.theme}`);
  });
  applyTheme();

  // ------------------------------------------------------------------ Python status pill
  const pill = document.getElementById('engine-pill');
  const LABELS = { idle: 'Python', loading: 'Starting Python', ready: 'Python ready', restarting: 'Restarting Python', error: 'Python unavailable' };
  SA.py.onState((state, detail) => {
    pill.dataset.state = state;
    const short = state === 'ready' && detail ? `Python ${detail.split('.').slice(0, 2).join('.')} ready` : LABELS[state] || 'Python';
    pill.querySelector('.label').textContent = short;
    pill.title = state === 'error' ? `Python could not start: ${detail}` : state === 'ready' ? `CPython ${detail}, running inside this page` : 'Python runs inside this page';
  });

  // ------------------------------------------------------------------ sidebar and drawer
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menu-btn');
  const scrim = document.getElementById('scrim');
  function setDrawer(open) {
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', () => setDrawer(!sidebar.classList.contains('open')));
  scrim.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) setDrawer(false);
  });

  SA.renderSidebar = function (page) {
    const total = SA.problemOrder.length;
    const solved = SA.problemOrder.filter(SA.isSolved).length;
    const doneMods = SA.modules.filter((m) => store.state.done[m.id]).length;
    const activeModule = SA.moduleById[page] ? page : /^p\d+$/.test(page) && SA.problems[page.slice(1)] ? SA.problems[page.slice(1)].module : null;
    const frag = document.createDocumentFragment();
    frag.append(el('div', { class: 'side-progress' },
      el('div', { class: 'row' }, el('span', null, 'Problems solved'), el('b', null, `${solved} / ${total}`)),
      el('div', { class: 'meter', role: 'img', 'aria-label': `${solved} of ${total} problems solved` }, el('i', { style: `width:${total ? (100 * solved) / total : 0}%` })),
      el('div', { class: 'row' }, el('span', null, 'Modules finished'), el('b', null, `${doneMods} / ${SA.modules.length}`)),
      el('div', { class: 'meter', role: 'img', 'aria-label': `${doneMods} of ${SA.modules.length} modules finished` }, el('i', { style: `width:${SA.modules.length ? (100 * doneMods) / SA.modules.length : 0}%` }))));
    frag.append(el('nav', { class: 'side-block side-links', 'aria-label': 'Pages' },
      [['home', 'Home'], ['problems', 'All problems'], ['drill', 'Pattern drill'], ['flashcards', 'Flashcards'], ['patterns', 'Patterns cheat sheet'], ['complexity', 'Complexity reference'], ['playground', 'Playground']]
        .map(([id, label]) => el('a', { href: `#${id}`, 'aria-current': page === id || (id === 'home' && !page) ? 'page' : null }, label))));
    const list = el('nav', { class: 'side-block', 'aria-label': 'Modules' }, el('div', { class: 'side-label' }, 'Modules'));
    for (const m of SA.modules) {
      if (m.part === 'advanced' && m === SA.modules.find((x) => x.part === 'advanced')) list.append(el('div', { class: 'side-label part' }, 'Advanced'));
      const pr = SA.moduleProgress(m);
      const done = !!store.state.done[m.id];
      list.append(el('a', { class: 'side-mod' + (done ? ' done' : ''), href: `#${m.id}`, 'aria-current': page === m.id ? 'page' : null },
        el('span', { class: 'num' }, pad2(m.num)), el('span', { class: 't' }, m.title),
        el('span', { class: 'state', title: done ? 'Finished' : pr.total ? `${pr.solved} of ${pr.total} problems solved` : null }, done ? '✓' : pr.total ? `${pr.solved}/${pr.total}` : '')));
      if (m.id === activeModule && m.problems.length) {
        list.append(el('div', { class: 'side-probs' }, m.problems.map((id) => el('a', { href: `#p${id}`, 'aria-current': page === `p${id}` ? 'page' : null },
          el('span', { class: 'pn' + (SA.isSolved(id) ? ' ok' : '') }, (SA.isSolved(id) ? '✓ ' : '') + id), el('span', null, SA.problems[id].title)))));
      }
    }
    frag.append(list);
    sidebar.replaceChildren(frag);
    const cur = sidebar.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) {
      const a = cur.getBoundingClientRect();
      const b = sidebar.getBoundingClientRect();
      if (a.top < b.top || a.bottom > b.bottom) cur.scrollIntoView({ block: 'center' });
    }
  };

  // ------------------------------------------------------------------ router
  const main = document.getElementById('main');
  SA.main = main;
  SA.setTitle = (t) => { document.title = t ? `${t} · Sorted Again` : 'Sorted Again'; };
  SA.views.notFound = SA.views.notFound || (() => {
    SA.setTitle('Not found');
    main.replaceChildren(el('div', { class: 'lesson' }, el('div', { class: 'kicker' }, 'KeyError'), el('h1', { class: 'title' }, 'Nothing at this address'),
      el('p', { class: 'lede' }, 'That link does not match a module, a problem or a page.'), el('p', null, el('a', { class: 'btn', href: '#home' }, 'Go to the course home'))));
  });
  function show(view, ...args) {
    const fn = SA.views[view];
    if (fn) fn(...args);
    else SA.views.notFound();
  }
  function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    const dot = hash.indexOf('.');
    const page = dot < 0 ? hash : hash.slice(0, dot);
    const section = dot < 0 ? '' : hash.slice(dot + 1);
    setDrawer(false);
    if (!page || page === 'home') show('home');
    else if (/^p\d+$/.test(page)) (SA.problems[page.slice(1)] ? show('problem', Number(page.slice(1))) : show('notFound'));
    else if (['problems', 'patterns', 'complexity', 'playground', 'drill', 'flashcards'].includes(page)) show(page, section);
    else if (SA.moduleById[page]) show('module', SA.moduleById[page], section);
    else show('notFound');
    SA.renderSidebar(page || 'home');
    document.querySelectorAll('.toplinks a').forEach((a) => a.setAttribute('aria-current', a.dataset.nav === page ? 'page' : 'false'));
    if (!section || page === 'flashcards') window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    if (page && page !== 'home') {
      store.state.last = hash;
      store.save();
    }
  }
  SA.route = route;

  // ------------------------------------------------------------------ boot
  document.getElementById('nojs').hidden = true;
  document.getElementById('app').hidden = false;
  window.addEventListener('hashchange', route);
  route();
  SA.booted = true;
  // Start Python once the page is idle, so the first Run is quick.
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  idle(() => SA.py.ensure().catch(() => {}), { timeout: 4000 });
})(window.SA);
