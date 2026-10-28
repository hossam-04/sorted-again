// Flashcards, generated from content the build has already compiled and verified, plus the checks that keep them
// honest. Pure: no Pyodide, so the tests call it on parsed content directly.
//   A card is { id, kind, module, href, ref }: ref points into the course data, or carries the little HTML the
//   course doesn't already have. lib/flashcards.js turns a card into its front and back, here and in the page.
import { slugify, textOf, rowKey } from './content.mjs';
import '../lib/flashcards.js';

const F = globalThis.Flashcards;
const OPTIONS_NEEDED = /\bwhich of these\b/i;  // questions that can't be answered without their options

// Ids come from the source (module, kind and a slug of the card's own text), never from a position, so editing one
// module leaves every other card's schedule alone.
//   modules:   compiled modules in course order, each with html, quizzes, gotchas, cxRows and problems (ids)
//   problems:  the problem payloads by id
//   sheet:     cheat-sheet sections { slug, see, think, tpl, module }
//   reference: complexity.md rows from tagTableRows; their cards join refModule
export function buildCards({ modules, problems = {}, sheet = [], reference = [], refModule = 'big-o' }) {
  const cards = [];
  const known = new Set(modules.map((m) => m.id));
  for (const m of modules) {
    const at = (needle) => {
      const i = m.html.indexOf(needle);
      return i < 0 ? Infinity : i;
    };
    const own = [];
    for (const quiz of m.quizzes || []) {
      quiz.questions.forEach((q, i) => {
        const ref = { quiz: quiz.id, i };
        if (OPTIONS_NEEDED.test(textOf(q.q))) ref.opts = true;
        own.push({ pos: at(`data-quiz="${quiz.id}"`) + i / 1000, card: { id: `quiz:${m.id}:${q.anchor.slice(2)}`, kind: 'quiz', module: m.id, href: `#${m.id}.${q.anchor}`, ref } });
      });
    }
    for (const g of m.gotchas || []) {
      own.push({ pos: at(`id="${g.anchor}"`), card: { id: `gotcha:${m.id}:${g.slug}`, kind: 'gotcha', module: m.id, href: `#${g.anchor}`, ref: { title: g.title, html: g.html } } });
    }
    for (const r of m.cxRows || []) {
      own.push({ pos: at(`id="${r.anchor}"`), card: { id: `cx:${m.id}:${rowKey(r.row[0])}`, kind: 'cx', module: m.id, href: `#${r.anchor}`, ref: { head: r.head, row: r.row } } });
    }
    own.sort((a, b) => a.pos - b.pos);
    cards.push(...own.map((x) => x.card));
    for (const s of sheet) {
      if (s.module === m.id) cards.push({ id: `pattern:${s.slug}`, kind: 'pattern', module: m.id, href: `#patterns.${s.slug}`, ref: { see: s.see, think: s.think, tpl: s.tpl } });
    }
    if (m.id === refModule) {
      for (const r of reference) {
        cards.push({ id: `cx:ref:${slugify(textOf(r.context), 24)}:${rowKey(r.row[0])}`, kind: 'cx', module: m.id, href: `#${r.anchor}`, ref: { head: r.head, row: r.row, context: r.context, reference: true } });
      }
    }
    for (const id of m.problems || []) {
      if (problems[id]) cards.push({ id: `problem:${id}`, kind: 'problem', module: m.id, href: `#p${id}`, ref: { p: id } });
    }
  }
  return cards.filter((c) => known.has(c.module));
}

// The module a cheat-sheet section belongs to: where most of its Practice problems are; ties go to the first one.
export function sheetModule(practiceIds, moduleOfProblem) {
  const mods = practiceIds.map((id) => moduleOfProblem[id]).filter(Boolean);
  if (!mods.length) return null;
  const count = {};
  for (const m of mods) count[m] = (count[m] || 0) + 1;
  return mods.reduce((best, m) => (count[m] > count[best] ? m : best), mods[0]);
}

const idsIn = (html) => [...String(html || '').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const WIDGET = /<pre[\s>]|data-(ex|viz|quiz)=/;

// Every check returns readable messages; an empty list means the cards are sound.
export function checkCards(cards, course) {
  const errors = [];
  const anchors = new Set();
  const addIds = (where, ids) => {
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${where}: the id "${id}" is used twice, so a link to it is ambiguous`);
      seen.add(id);
      anchors.add(id);
    }
  };
  for (const m of course.modules) addIds(`module ${m.id}`, [...idsIn(m.html), ...m.quizzes.flatMap((q) => q.questions.map((x) => `${m.id}.${x.anchor}`))]);
  addIds('cheatsheet.md', idsIn(course.cheatsheet));
  addIds('complexity.md', idsIn(course.complexity));
  const verifiedCode = new Set([...(course.templates || []).map((t) => t.code), ...Object.values(course.problems || {}).map((p) => p.solution.code)]);
  const seen = new Set();
  for (const card of cards) {
    const where = `flashcard ${card.id}`;
    if (seen.has(card.id)) errors.push(`${where} is defined twice; give one of its sources a different title or text`);
    seen.add(card.id);
    if (!course.modules.some((m) => m.id === card.module)) errors.push(`${where} belongs to module ${card.module}, which is not in the course`);
    const r = F.resolve(card, course);
    for (const side of ['front', 'back']) {
      // The card's own text: the generic prompt and context lines don't count.
      const own = r[side].replace(/<p class="fc-(prompt|ctx)">[\s\S]*?<\/p>/g, '');
      if (F.plainText(own).length < 3) errors.push(`${where} has an empty ${side}`);
      if (WIDGET.test(r[side])) errors.push(`${where}: its ${side} holds a code block or a widget; cards show code only from a verified template or solution`);
    }
    for (const c of r.code) if (!verifiedCode.has(c.src)) errors.push(`${where} shows code that is not a verified template or reference solution`);
    const target = card.href.replace(/^#/, '');
    if (/^p\d+$/.test(target) ? !course.problems[target.slice(1)] : !anchors.has(target)) errors.push(`${where} links to ${card.href}, which is not on any page`);
  }
  return errors;
}

// "quiz 151, gotcha 46, ..." and the same per module, for the build's summary.
export function cardCounts(cards) {
  const byKind = {};
  const byModule = {};
  for (const c of cards) {
    const k = c.kind === 'cx' && c.ref.reference ? 'cx-ref' : c.kind;
    byKind[k] = (byKind[k] || 0) + 1;
    byModule[c.module] = (byModule[c.module] || 0) + 1;
  }
  return { byKind, byModule };
}
