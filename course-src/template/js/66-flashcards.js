// Flashcards (#flashcards, #flashcards.<module>): recall practice on Leitner boxes. The cards are built with the
// course (tools/cards.mjs); scheduling and rendering live in lib/flashcards.js, shared with the build's checks.
(function (SA) {
  'use strict';
  const { el, icon, store } = SA;
  const F = window.Flashcards;
  const GRADES = [['again', 'Again', '1'], ['good', 'Good', '2'], ['easy', 'Easy', '3']];
  const cards = () => SA.course.cards || [];
  let index = null;
  const cardById = (id) => {
    if (!index) index = Object.fromEntries(cards().map((c) => [c.id, c]));
    return index[id];
  };
  const inDeck = () => F.deckFilter(store.state.flashDeck, store.state.done);
  const status = (module) => F.queue({ cards: cards(), records: store.state.flashCards, inDeck: inDeck(), module: module || null, clock: F.systemClock });
  function addToDeck(id) {
    if (store.state.flashDeck[id] > 0) return;
    store.state.flashDeck[id] = Date.now();
    store.save();
  }
  const countIn = (id) => cards().filter((c) => c.module === id).length;
  SA.flash = { status, addToDeck };

  function view(section) {
    SA.setTitle('Flashcards');
    let filter = SA.moduleById[section] && countIn(section) ? section : '';
    if (filter) addToDeck(filter);
    let session = null;  // { ids, i, base, repeats, reviewed, again, cram }
    let revealed = false;
    let onKey = null;

    const statusLine = el('p', { class: 'fc-status' });
    const select = el('select', { id: 'fc-filter', class: 'fc-filter' });
    const stage = el('div', { class: 'fc-stage' });
    const deckList = el('ul', { class: 'fc-deck', 'aria-label': 'Modules and their flashcards' });
    const resetBtn = el('button', { class: 'btn small fc-reset', type: 'button' }, icon('reset', 14), 'Reset schedule');

    function showStatus() {
      const q = status(filter);
      const parts = [el('b', null, `${q.due.length} due`)];
      if (q.unseen) parts.push(` · ${Math.min(q.newLeft, q.unseen)} new left today`);
      parts.push(` · ${SA.count(q.total, 'card')} in ${filter ? SA.moduleById[filter].title : 'your deck'}`);
      statusLine.replaceChildren(...parts);
    }
    function showFilter() {
      const deck = inDeck();
      const mods = SA.modules.filter((m) => deck(m.id) && countIn(m.id));
      select.replaceChildren(el('option', { value: '' }, 'Your whole deck'), ...mods.map((m) => el('option', { value: m.id }, m.title)));
      select.value = filter;
    }
    function showDeck() {
      const deck = inDeck();
      deckList.replaceChildren(...SA.modules.filter((m) => countIn(m.id)).map((m) => {
        const on = deck(m.id);
        const q = on ? status(m.id) : null;
        const add = el('button', { class: 'btn small', type: 'button' }, 'Add to deck');
        add.addEventListener('click', () => {
          addToDeck(m.id);
          refresh();
          SA.toast(`${m.title}: ${SA.count(countIn(m.id), 'card')} added`);
          const again = deckList.querySelector(`[data-module="${m.id}"] .fc-study`);
          if (again) again.focus();
        });
        const remove = el('button', { class: 'btn ghost small', type: 'button', 'aria-label': `Remove ${m.title} from the deck` }, 'Remove');
        remove.addEventListener('click', () => {
          store.state.flashDeck[m.id] = 0;  // the schedule is kept, so adding it back resumes where it was
          store.save();
          if (filter === m.id) {
            filter = '';
            start();
          }
          refresh();
          const back = deckList.querySelector(`[data-module="${m.id}"] button`);
          if (back) back.focus();
        });
        return el('li', { 'data-module': m.id, class: on ? 'on' : null },
          el('a', { class: 'fc-deck-title', href: `#${m.id}` }, m.title),
          el('span', { class: 'fc-deck-count' }, on ? `${SA.count(q.total, 'card')} · ${q.due.length} due` : `${SA.count(countIn(m.id), 'card')} · not in your deck`),
          el('span', { class: 'fc-deck-actions' },
            el('a', { class: 'btn small fc-study', href: `#flashcards.${m.id}`, 'aria-label': `Study ${m.title}` }, 'Study'),
            on ? remove : add));
      }));
    }
    function refresh() {
      showStatus();
      showFilter();
      showDeck();
    }

    // ---------------------------------------------------------------- a session
    function start(cram) {
      const q = status(filter);
      const ids = cram ? cards().filter((c) => c.module === filter).map((c) => c.id) : [...q.due, ...q.fresh];
      session = { ids, i: 0, base: ids.length, repeats: new Set(), reviewed: 0, again: 0, cram: !!cram };
      if (!ids.length) finish(true);
      else {
        show();
        refresh();
      }
    }
    function finish(empty) {
      revealed = false;
      onKey = null;
      const q = status(filter);
      const next = F.nextDue({ cards: cards(), records: store.state.flashCards, inDeck: inDeck(), module: filter || null, clock: F.systemClock });
      const heading = el('h2', { tabindex: '-1' }, empty ? (q.total ? 'Nothing to study right now' : 'Your deck is empty') : session.cram ? 'That was every card' : 'Done for now');
      const lines = [];
      if (!empty && !session.cram) lines.push(`${SA.count(session.reviewed, 'card')} reviewed${session.again ? `, ${session.again} to see again tomorrow` : ''}.`);
      if (!q.total) lines.push('Mark a module finished, or add one below, and its cards join your deck. Each card links back to where it came from.');
      else {
        if (next) lines.push(`Next: ${SA.count(next.count, 'card')} ${F.describeDay(next.day, q.today)}.`);
        if (q.unseen && !q.newLeft) lines.push(`You've had today's ${F.NEW_PER_DAY} new cards; more come tomorrow.`);
      }
      const actions = [];
      if (filter && q.total) {
        const cram = el('button', { class: 'btn', type: 'button' }, 'Run through them anyway');
        cram.addEventListener('click', () => start(true));
        actions.push(cram);
      }
      if (filter) actions.push(el('a', { class: 'btn ghost', href: '#flashcards' }, 'Your whole deck'));
      stage.replaceChildren(el('div', { class: 'fc-done' }, heading, ...lines.map((t) => el('p', null, t)),
        actions.length ? el('div', { class: 'fc-actions' }, ...actions) : null,
        session.cram || empty ? null : el('p', { class: 'fc-hint' }, 'Cards you rated come back after 1, 3, 7, 16, 35 and then 80 days as you keep remembering them.')));
      refresh();
      if (session.base || session.cram) heading.focus({ preventScroll: true });
    }

    function show() {
      revealed = false;
      const id = session.ids[session.i];
      const card = cardById(id);
      const r = F.resolve(card, SA.course);
      const rec = store.state.flashCards[id];
      const box = F.valid(rec) ? rec[0] : 0;
      const repeat = session.i >= session.base;
      const tag = session.cram ? 'practice, not scheduled' : repeat ? 'once more, not scheduled' : box ? `review · box ${box}` : 'new';
      const front = el('div', { class: 'fc-front', html: r.front });
      const back = el('div', { class: 'fc-back', 'aria-live': 'polite' });
      const showBtn = el('button', { class: 'btn primary fc-show', type: 'button' }, 'Show answer', SA.kbd('Space'));
      const foot = el('div', { class: 'fc-foot' }, showBtn);
      const article = el('article', { class: 'fc-card', tabindex: '-1', 'aria-label': `Flashcard ${session.i + 1} of ${session.ids.length}` },
        el('div', { class: 'fc-kicker' }, el('span', null, `${r.label} · ${r.moduleTitle}`), el('span', { class: 'fc-tag' }, tag),
          el('span', { class: 'fc-pos' }, `${session.i + 1} / ${session.ids.length}`)),
        front, back, foot);

      function reveal() {
        if (revealed) return;
        revealed = true;
        const code = r.code.map((c) => (c.collapsed
          ? el('details', { class: 'fc-code' }, el('summary', null, 'Show the code'), SA.codeBlock(c.src))
          : el('div', { class: 'fc-code' }, r.code.length > 1 ? el('div', { class: 'ex-title' }, c.title) : null, SA.codeBlock(c.src))));
        back.replaceChildren(el('div', { class: 'fc-label' }, 'Answer'), el('div', { class: 'fc-back-body', html: r.back }), ...code,
          el('p', { class: 'fc-src' }, el('a', { href: r.href }, `${r.where} →`)));
        SA.hydrate(back);
        if (session.cram || repeat) {
          const next = el('button', { class: 'btn primary', type: 'button' }, 'Next card', SA.kbd('2'));
          next.addEventListener('click', () => advance(null));
          foot.replaceChildren(next);
        } else {
          foot.replaceChildren(el('div', { class: 'fc-rate', role: 'group', 'aria-label': 'How well did you remember it?' },
            GRADES.map(([g, label, key]) => {
              const days = F.INTERVALS[F.nextBox(box, g)];
              const b = el('button', { class: `btn fc-grade fc-${g}`, type: 'button', 'data-grade': g, 'aria-label': `${label}: see it again in ${F.intervalLabel(days)}` },
                el('span', { class: 'fc-grade-label' }, label, SA.kbd(key)), el('small', null, F.intervalLabel(days)));
              b.addEventListener('click', () => advance(g));
              return b;
            })));
        }
        // Focus moves to the card itself, so Space can't rate by accident; 1, 2 and 3 rate, Tab reaches the buttons.
        article.focus({ preventScroll: true });
        const r2 = foot.getBoundingClientRect();
        if (r2.bottom > window.innerHeight) foot.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      showBtn.addEventListener('click', reveal);

      function advance(grade) {
        if (grade && !session.cram && !repeat) {
          store.state.flashCards[id] = F.rate(rec, grade, F.systemClock);
          store.save();
          session.reviewed++;
          if (grade === 'again') {
            session.again++;
            if (!session.repeats.has(id)) {
              session.repeats.add(id);
              session.ids.push(id);  // once more at the end of this session
            }
          }
        }
        session.i++;
        if (session.i >= session.ids.length) finish(false);
        else {
          show();
          showStatus();
          stage.querySelector('.fc-show').focus({ preventScroll: true });
        }
      }
      onKey = (e) => {
        const onControl = e.target.closest && e.target.closest('button, a, summary');
        if (e.key === ' ' && !onControl) {
          e.preventDefault();
          if (!revealed) reveal();
          else if (session.cram || repeat) advance(null);
        } else if (revealed && /^[123]$/.test(e.key)) {
          e.preventDefault();
          if (session.cram || repeat) {
            if (e.key === '2') advance(null);
          } else advance(GRADES[Number(e.key) - 1][0]);
        }
      };
      stage.replaceChildren(article);
      const top = article.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) article.scrollIntoView({ block: 'start' });
    }

    const keydown = (e) => {
      if (!stage.isConnected) {
        document.removeEventListener('keydown', keydown);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || !onKey) return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], .CodeMirror')) return;
      onKey(e);
    };
    document.addEventListener('keydown', keydown);

    select.addEventListener('change', () => {
      filter = select.value;
      start();
      select.focus();
    });

    // Reset needs a second click within 5 s; Escape, a click elsewhere, leaving the button or the time running out
    // disarm it. Escape and clicks are watched on the document: Safari doesn't focus a button that is clicked.
    let armed = null;
    const onEscape = (e) => { if (e.key === 'Escape') disarm(); };
    const onOutside = (e) => { if (!resetBtn.contains(e.target)) disarm(); };
    function disarm() {
      clearTimeout(armed);
      armed = null;
      document.removeEventListener('keydown', onEscape);
      document.removeEventListener('pointerdown', onOutside);
      resetBtn.classList.remove('armed');
      resetBtn.replaceChildren(icon('reset', 14), 'Reset schedule');
    }
    resetBtn.addEventListener('click', () => {
      const n = Object.values(store.state.flashCards).filter(F.valid).length;
      if (!armed) {
        if (!n) {
          SA.toast('Nothing to reset yet');
          return;
        }
        resetBtn.classList.add('armed');
        resetBtn.replaceChildren(icon('alert', 14), `Click again to reset ${SA.count(n, 'card')}`);
        armed = setTimeout(disarm, 5000);
        document.addEventListener('keydown', onEscape);
        document.addEventListener('pointerdown', onOutside);
        return;
      }
      disarm();
      store.state.flashCards = {};
      store.saveNow();
      SA.toast('Schedule reset: every card is new again');
      start();
      resetBtn.focus({ preventScroll: true });
    });
    resetBtn.addEventListener('blur', () => { if (armed) disarm(); });

    SA.main.replaceChildren(el('div', { class: 'lesson flashcards' },
      el('div', { class: 'kicker' }, 'Practice'),
      el('h1', { class: 'title' }, 'Flashcards'),
      el('p', { class: 'lede' }, 'Recall, not recognition: read the prompt, answer it in your head, then show the answer and say how well you remembered. Press Space to show it, then 1, 2 or 3. Finished modules join your deck; at most 20 new cards come in each day.'),
      el('div', { class: 'fc-bar' }, statusLine, el('label', { class: 'fc-filter-label' }, el('span', null, 'Study'), select)),
      stage,
      el('section', { class: 'fc-deck-wrap', 'aria-labelledby': 'fc-deck-h' },
        el('h2', { id: 'fc-deck-h' }, 'Your deck'),
        el('p', null, 'Cards come from each module’s quiz, gotchas and complexity table, its patterns on the cheat sheet, and its problems. Add a module early or study one on its own.'),
        deckList,
        el('div', { class: 'fc-reset-row' }, resetBtn, el('span', null, 'Puts every card back to new. Your deck stays as it is.')))));
    start();
  }

  SA.views.flashcards = view;
})(window.SA = window.SA || {});
