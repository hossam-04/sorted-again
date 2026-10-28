// Flashcards: the Leitner scheduler and the card renderer, shared by the page and the build checks.
// Plain script: attaches Flashcards to globalThis so the page and the Node tests share it.
//   A saved record is [box, dueDay, lastRatedMs, introducedDay]; days are local calendar days, 'YYYY-MM-DD'.
(function (root) {
  'use strict';
  const INTERVALS = [0, 1, 3, 7, 16, 35, 80];  // days to wait in each box; box 0 is a card never rated
  const MAX_BOX = INTERVALS.length - 1;
  const NEW_PER_DAY = 20;
  const DAY_MS = 86400000;
  const DAY = /^\d{4}-\d\d-\d\d$/;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ------------------------------------------------------------------ days
  // offsetMin is what Date#getTimezoneOffset reports: minutes to add to local time to get UTC.
  const localDay = (ms, offsetMin) => new Date(ms - offsetMin * 60000).toISOString().slice(0, 10);
  const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
  const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
  const systemClock = { now: () => Date.now(), offset: (ms) => new Date(ms).getTimezoneOffset() };
  const today = (clock) => {
    const t = clock.now();
    return localDay(t, clock.offset(t));
  };
  const describeDay = (day, from) => {
    const n = daysBetween(from, day);
    return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
  };
  const intervalLabel = (days) => `${days} day${days === 1 ? '' : 's'}`;

  // ------------------------------------------------------------------ scheduling
  const valid = (r) => Array.isArray(r) && r.length >= 4 && Number.isInteger(r[0]) && r[0] >= 1 && r[0] <= MAX_BOX &&
    DAY.test(r[1]) && typeof r[2] === 'number' && DAY.test(r[3]);
  function nextBox(box, grade) {
    if (grade === 'again') return 1;
    return Math.min(MAX_BOX, Math.max(1, box + (grade === 'easy' ? 2 : 1)));
  }
  function rate(record, grade, clock) {
    const t = clock.now();
    const day = localDay(t, clock.offset(t));
    const ok = valid(record);
    const box = nextBox(ok ? record[0] : 0, grade);
    return [box, addDays(day, INTERVALS[box]), t, ok ? record[3] : day];
  }

  // What to study now. cards are in course order; inDeck(moduleId) says whether a module is in the deck; with
  // module set, only that module counts (the caller adds it to the deck first).
  function queue({ cards, records, inDeck, module = null, clock, limit = NEW_PER_DAY }) {
    const day = today(clock);
    const recs = records && typeof records === 'object' ? records : {};
    let introducedToday = 0;
    const due = [];
    const fresh = [];
    let total = 0;
    cards.forEach((c, order) => {
      const r = recs[c.id];
      const ok = valid(r);
      if (ok && r[3] === day) introducedToday++;
      if (module ? c.module !== module : !inDeck(c.module)) return;
      total++;
      if (!ok) fresh.push(c.id);
      else if (r[1] <= day) due.push({ id: c.id, day: r[1], order });
    });
    due.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.order - b.order));
    const newLeft = Math.max(0, limit - introducedToday);
    return { due: due.map((d) => d.id), fresh: fresh.slice(0, newLeft), newLeft, introducedToday, total, unseen: fresh.length, today: day };
  }

  // The first day after today with cards due in the deck, and how many.
  function nextDue({ cards, records, inDeck, module = null, clock }) {
    const day = today(clock);
    const counts = {};
    for (const c of cards) {
      const r = records && records[c.id];
      if (!valid(r) || r[1] <= day || (module ? c.module !== module : !inDeck(c.module))) continue;
      counts[r[1]] = (counts[r[1]] || 0) + 1;
    }
    const first = Object.keys(counts).sort()[0];
    return first ? { day: first, count: counts[first] } : null;
  }

  // A module is in the deck when it was added (a time stamp), never when it was removed (0), and otherwise when it
  // was marked finished, so modules finished before flashcards existed bring their cards along.
  const deckFilter = (deck, done) => (id) => {
    const v = deck ? deck[id] : undefined;
    return typeof v === 'number' ? v > 0 : !!(done && done[id]);
  };

  // Importing: the more recent rating of each card wins. Returns how many records changed.
  function mergeRecords(mine, theirs) {
    if (!theirs || typeof theirs !== 'object' || Array.isArray(theirs)) return 0;
    let n = 0;
    for (const [id, r] of Object.entries(theirs)) {
      if (!valid(r) || (valid(mine[id]) && mine[id][2] >= r[2])) continue;
      mine[id] = r.slice(0, 4);
      n++;
    }
    return n;
  }
  function mergeDeck(mine, theirs) {
    if (!theirs || typeof theirs !== 'object' || Array.isArray(theirs)) return mine;
    for (const [id, v] of Object.entries(theirs)) {
      if (typeof v !== 'number') continue;
      const a = mine[id];
      mine[id] = typeof a !== 'number' ? v : a > 0 && v > 0 ? Math.min(a, v) : Math.max(a, v);
    }
    return mine;
  }

  // ------------------------------------------------------------------ rendering
  // A card's front and back as HTML, from the card record and the course data it points into. code lists the
  // Python a card shows, always taken from a cheat-sheet template or a reference solution, both run by the build.
  const KIND = { quiz: 'Quiz', gotcha: 'Gotcha', cx: 'Complexity', pattern: 'Pattern', problem: 'Problem' };
  const prompt = (text) => `<p class="fc-prompt">${text}</p>`;
  function resolve(card, course) {
    const mod = (course.modules || []).find((m) => m.id === card.module);
    const where = card.href.startsWith('#p') ? 'Open the problem' : card.href.startsWith('#patterns.') ? 'Open in the cheat sheet'
      : card.href.startsWith('#complexity.') ? 'Open in the complexity reference' : 'Open in the module';
    const out = { kind: card.kind, label: KIND[card.kind] || card.kind, module: card.module, moduleTitle: mod ? mod.title : card.module, href: card.href, where, front: '', back: '', code: [] };
    const r = card.ref || {};
    if (card.kind === 'quiz') {
      const quiz = mod && mod.quizzes.find((q) => q.id === r.quiz);
      const q = quiz && quiz.questions[r.i];
      if (!q) return out;
      out.front = `<p class="fc-q">${q.q}</p>` + (r.opts ? `<ul class="fc-opts">${q.options.map((o) => `<li>${o}</li>`).join('')}</ul>` : '');
      out.back = `<p class="fc-a">${q.options[q.answer]}</p>${q.explain}`;
    } else if (card.kind === 'gotcha') {
      out.front = `<p class="fc-q">${r.title}</p>${prompt('What goes wrong, and what do you do instead?')}`;
      out.back = r.html;
    } else if (card.kind === 'cx') {
      if (r.reference) out.label = 'Complexity reference';
      // The prompt names what to recall; a notes column is the answer's commentary, not a question.
      const filled = r.head.slice(1).filter((h, k) => r.row[k + 1] && r.row[k + 1].trim());
      const asked = filled.filter((h) => !/^notes?$/i.test(plainText(h)));
      const cols = asked.length ? asked : filled;
      out.front = `${r.context ? `<p class="fc-ctx">${r.context}</p>` : ''}<p class="fc-q">${r.row[0]}</p>${prompt(cols.map((h) => `${h}?`).join(' '))}`;
      out.back = `<dl class="fc-dl">${r.head.slice(1).map((h, k) => (r.row[k + 1] && r.row[k + 1].trim() ? `<dt>${h}</dt><dd>${r.row[k + 1]}</dd>` : '')).join('')}</dl>`;
    } else if (card.kind === 'pattern') {
      out.front = `<p class="fc-ctx">When you see</p><div class="fc-q">${r.see}</div>${prompt('What do you reach for?')}`;
      out.back = `<p class="fc-ctx">Think</p><div class="fc-a">${r.think}</div>`;
      out.code = (r.tpl || []).map((k) => course.templates[k]).filter(Boolean).map((t) => ({ title: t.title, src: t.code }));
    } else if (card.kind === 'problem') {
      const p = course.problems[r.p];
      if (!p) return out;
      const keyIdea = (/<p>[\s\S]*?<\/p>/.exec(p.solution.html) || [''])[0];
      const big = (s) => `<span class="bigo-src">O(${esc(s)})</span>`;
      // A task may show a class definition (#133's Node); it isn't code the build runs, so the card points to it instead.
      const task = p.taskHtml.replace(/<pre[\s\S]*?<\/pre>/g, '<p class="fc-ctx">(a class definition: see the problem page)</p>');
      out.front = `<p class="fc-q"><span class="pnum">#${p.id}</span> ${esc(p.title)}</p><div class="fc-task">${task}</div>${prompt('Which approach, and why?')}`;
      out.back = `<p class="fc-tags">${p.patterns.map(esc).join(' · ')}</p>${keyIdea}<p class="fc-cx">Time ${big(p.solution.time)} · Space ${big(p.solution.space)}</p>`;
      out.code = [{ title: 'The reference solution', src: p.solution.code, collapsed: true }];
    }
    return out;
  }
  const plainText = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, 'x').replace(/\s+/g, ' ').trim();

  root.Flashcards = {
    INTERVALS, MAX_BOX, NEW_PER_DAY, localDay, addDays, daysBetween, today, describeDay, intervalLabel, systemClock,
    valid, nextBox, rate, queue, nextDue, deckFilter, mergeRecords, mergeDeck, resolve, plainText,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
