// Parses course content: module lessons (Markdown with ::: blocks) and problem files
// (YAML front matter + sections + fenced code blocks whose info string names their role).
import YAML from 'yaml';
import { Marked } from 'marked';

export class ContentError extends Error {
  constructor(file, message) {
    super(`${file}: ${message}`);
    this.file = file;
  }
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Anchors. slugify is the rule the page used to apply to a heading's text (template/js/40-module.js), so ids made
// here match the links people already have. textOf is an element's textContent, from rendered HTML.
export const slugify = (s, n = 48) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, n);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', '#39': "'" };
export const textOf = (html) => String(html).replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (all, e) => {
  if (ENTITIES[e.toLowerCase()] !== undefined) return ENTITIES[e.toLowerCase()];
  if (/^#x/i.test(e)) return String.fromCodePoint(parseInt(e.slice(2), 16));
  if (/^#\d/.test(e)) return String.fromCodePoint(Number(e.slice(1)));
  return all;
});
// Six hex digits of FNV-1a: tells apart two long texts that share a slug.
export function shortHash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0').slice(0, 6);
}

// A table row's key: its first cell's slug, plus a hash so `s | t` and `s & t` stay apart.
export const rowKey = (cellHtml) => {
  const t = textOf(cellHtml);
  return `${slugify(t, 40)}-${shortHash(t)}`;
};

// Gives every row of every table in html an id, and collects the rows: { anchor, head, row, context }, cells as HTML.
// context is the text of the nearest heading above the table (an h3 under its h2 if there is one).
export function tagTableRows(html, idFor) {
  const rows = [];
  let h2 = '';
  let h3 = '';
  const out = html.replace(/<h([23])[^>]*>([\s\S]*?)<\/h\1>|<table class="md"><thead><tr>([\s\S]*?)<\/tr><\/thead><tbody>([\s\S]*?)<\/tbody><\/table>/g, (all, level, heading, head, body) => {
    if (level) {
      if (level === '2') [h2, h3] = [heading, ''];
      else h3 = heading;
      return all;
    }
    const cells = (s) => [...s.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1]);
    const th = cells(head);
    const context = (h3 || h2).replace(/<a class="anchor"[\s\S]*?<\/a>/, '');
    const tbody = body.replace(/<tr>([\s\S]*?)<\/tr>/g, (tr, inner) => {
      const row = cells(inner);
      const anchor = idFor(row, context);
      rows.push({ anchor, head: th, row, context });
      return `<tr id="${anchor}">${inner}</tr>`;
    });
    return `<table class="md"><thead><tr>${head}</tr></thead><tbody>${tbody}</tbody></table>`;
  });
  return { html: out, rows };
}

export function parseFrontMatter(src, file = '?') {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(src);
  if (!m) return { meta: {}, body: src };
  let meta;
  try {
    meta = YAML.parse(m[1]) || {};
  } catch (e) {
    throw new ContentError(file, `front matter is not valid YAML: ${e.message}`);
  }
  return { meta, body: src.slice(m[0].length) };
}

// 'python alt time="n log n" space="1" slow' -> { lang: 'python', role: 'alt', attrs: { time: 'n log n', space: '1', slow: true } }
export function parseInfo(info) {
  const s = String(info || '').trim();
  const words = /^(\S*)\s*(\S*)\s*([\s\S]*)$/.exec(s);
  const lang = words[1] || '';
  let role = words[2] || '';
  let rest = words[3] || '';
  if (role.includes('=')) {
    rest = `${role} ${rest}`;
    role = '';
  }
  const attrs = {};
  const re = /([\w-]+)(?:=(?:"([^"]*)"|(\S+)))?/g; // key, key="quoted value" or key=bare_value
  let m;
  while ((m = re.exec(rest))) attrs[m[1]] = m[2] ?? m[3] ?? true;
  return { lang, role, attrs };
}

// ------------------------------------------------------------------ problems

const ROLES_JSON = new Set(['examples', 'edge']);
const ROLES_CODE = new Set(['gen', 'perf', 'oracle', 'validator', 'starter']);
const FAILS = new Set(['example', 'edge', 'random', 'perf']);
const HOWS = new Set(['wrong', 'error', 'timeout']);

export function parseProblem(src, file) {
  const { meta, body } = parseFrontMatter(src, file);
  const fail = (msg) => {
    throw new ContentError(file, msg);
  };
  const md = new Marked({ gfm: true });
  const p = {
    file, id: meta.id, module: meta.module, title: meta.title || null, own: !!meta.own, patterns: meta.patterns || [],
    kind: meta.kind || 'function', signature: meta.signature || null, class: meta.class || null, codec: meta.codec || null,
    adapter: meta.adapter || null, inplace: meta.inplace ?? 0, node: meta.node || null, compare: meta.compare || 'exact',
    tol: meta.tol ?? null, no_mutation: meta.no_mutation || [], params: meta.params || {}, ret: meta.ret || null,
    perf_repeat: meta.perf_repeat || 1, lc_skip: meta.lc_skip || null, no_slow_wrong: meta.no_slow_wrong || null,
    taskMd: '', constraintsMd: '', notesMd: '', examples: null, edge: null,
    gen: null, perf: null, oracle: null, validator: null, starter: null,
    hints: [], solution: null, alternatives: [], wrongs: [],
  };
  let h2 = '';
  let h3 = null;
  let current = null; // the alternative or wrong answer that text after a code block belongs to
  const append = (text) => {
    if (h2 === 'task') p.taskMd += text;
    else if (h2 === 'constraints') p.constraintsMd += text;
    else if (h2 === 'notes') p.notesMd += text;
    else if (h2 === 'solution' && p.solution) p.solution.explainMd += text;
    else if ((h2 === 'alternatives' || h2 === 'wrong answers') && current) current.text += text;
  };
  for (const tok of md.lexer(body)) {
    if (tok.type === 'heading' && tok.depth === 2) {
      h2 = tok.text.trim().toLowerCase();
      h3 = null;
      current = null;
      continue;
    }
    if (tok.type === 'heading' && tok.depth === 3 && (h2 === 'alternatives' || h2 === 'wrong answers')) {
      h3 = tok.text.trim();
      current = null;
      continue;
    }
    if (tok.type === 'code') {
      const { lang, role, attrs } = parseInfo(tok.lang);
      if (lang === 'json' && ROLES_JSON.has(role)) {
        try {
          p[role] = JSON.parse(tok.text);
        } catch (e) {
          fail(`the json ${role} block is not valid JSON: ${e.message}`);
        }
        continue;
      }
      if (lang === 'python' && ROLES_CODE.has(role)) {
        if (p[role] !== null) fail(`more than one python ${role} block`);
        p[role] = tok.text;
        continue;
      }
      if (lang === 'python' && role === 'solution') {
        if (p.solution) fail('more than one python solution block');
        p.solution = { code: tok.text, time: attrs.time, space: attrs.space, explainMd: '' };
        continue;
      }
      if (lang === 'python' && role === 'alt') {
        if (h2 !== 'alternatives' || !h3) fail('a python alt block must sit under "## Alternatives" and a "###" title');
        current = { title: h3, code: tok.text, time: attrs.time, space: attrs.space, slow: !!attrs.slow, oracle: !!attrs.oracle, text: '' };
        p.alternatives.push(current);
        continue;
      }
      if (lang === 'python' && role === 'wrong') {
        if (h2 !== 'wrong answers' || !h3) fail('a python wrong block must sit under "## Wrong answers" and a "###" title');
        const fails = attrs.fails;
        const how = attrs.how || (fails === 'perf' ? 'timeout' : 'wrong');
        current = { title: h3, code: tok.text, fails, how, test: attrs.test === true ? null : attrs.test || null, text: '' };
        p.wrongs.push(current);
        continue;
      }
    }
    if (h2 === 'hints' && tok.type === 'list') {
      for (const item of tok.items) p.hints.push(item.text.trim());
      continue;
    }
    append(tok.raw);
  }
  for (const a of p.alternatives) {
    a.explainMd = a.text.trim();
    delete a.text;
  }
  for (const w of p.wrongs) {
    w.whyMd = w.text.trim();
    delete w.text;
  }
  validateProblem(p, fail);
  return p;
}

function validateProblem(p, fail) {
  if (!Number.isInteger(p.id)) fail('front matter needs an integer id');
  if (!p.module) fail('front matter needs a module');
  if (p.kind === 'function' && !p.signature) fail('a function problem needs a signature in the front matter');
  if (p.kind === 'design' && (!p.class || !p.starter)) fail('a design problem needs a class in the front matter and a python starter block');
  if (p.kind === 'codec' && (!p.codec || !p.starter)) fail('a codec problem needs codec: tree|strings and a python starter block');
  if (!['function', 'design', 'codec'].includes(p.kind)) fail(`unknown kind ${p.kind}`);
  if (!p.taskMd.trim()) fail('missing "## Task"');
  if (!p.constraintsMd.trim()) fail('missing "## Constraints"');
  if (!Array.isArray(p.examples) || p.examples.length < 2 || p.examples.length > 4) fail('needs a json examples block with 2 to 4 examples');
  if (p.examples.some((t) => !t.why)) fail('every example needs a "why"');
  if (!Array.isArray(p.edge) || p.edge.length < 3) fail('needs a json edge block with at least 3 named cases');
  if (p.edge.some((t) => !t.name)) fail('every edge case needs a "name"');
  const names = p.edge.map((t) => t.name);
  if (new Set(names).size !== names.length) fail('edge case names must be unique');
  if (!p.gen) fail('missing the python gen block');
  if (!p.perf) fail('missing the python perf block');
  const oracleAlts = p.alternatives.filter((a) => a.oracle).length;
  if ((p.oracle ? 1 : 0) + oracleAlts !== 1) fail('needs exactly one oracle: a python oracle block or one alternative marked oracle');
  if (p.hints.length < 2) fail('needs at least 2 hints under "## Hints"');
  if (!p.solution) fail('missing the python solution block');
  if (!p.solution.time || !p.solution.space) fail('the solution needs time="…" and space="…"');
  if (!p.solution.explainMd.trim()) fail('the solution needs an explanation');
  if (p.alternatives.length < 1) fail('needs at least 1 alternative');
  for (const a of p.alternatives) {
    if (!a.time || !a.space) fail(`alternative "${a.title}" needs time and space`);
    if (!a.explainMd) fail(`alternative "${a.title}" needs an explanation`);
  }
  if (p.wrongs.length < 2) fail('needs at least 2 wrong answers');
  for (const w of p.wrongs) {
    if (!FAILS.has(w.fails)) fail(`wrong answer "${w.title}" needs fails="example|edge|random|perf"`);
    if (!HOWS.has(w.how)) fail(`wrong answer "${w.title}" has an unknown how="${w.how}"`);
    if (!w.whyMd) fail(`wrong answer "${w.title}" needs a reason`);
    if (w.fails === 'edge' && w.test && !names.includes(w.test)) fail(`wrong answer "${w.title}" names test "${w.test}", which is not an edge case`);
  }
  if (!p.wrongs.some((w) => w.fails === 'perf') && !p.no_slow_wrong) fail('needs a fails="perf" wrong answer, or no_slow_wrong: <reason> in the front matter');
}

// ------------------------------------------------------------------ modules

let sink = null; // the module being compiled, so the code renderer can register examples

export function makeMarked() {
  const md = new Marked({ gfm: true });
  // Keep "9 × 9" on one line, and short inline code such as `i < j` too (a class, not &nbsp;, so copied code stays valid).
  md.use({ hooks: { postprocess: (html) => html.replace(/(\d) × (\d)/g, '$1&nbsp;×&nbsp;$2').replace(/(?<!<pre[^>]*>)<code>([^<]{1,24})<\/code>/g, '<code class="nw">$1</code>') } });
  md.use({
    renderer: {
      code({ text, lang }) {
        const { lang: l, role, attrs } = parseInfo(lang);
        const code = text.replace(/\s+$/, '');
        if (l === 'python' && role === 'run' && sink) {
          const ex = { id: `${sink.id}-ex${sink.examples.length + 1}`, code, title: attrs.title ? String(attrs.title).replace(/_/g, ' ') : '', expectError: !!attrs.error };
          sink.examples.push(ex);
          return `<div class="example" data-ex="${ex.id}"></div>\n`;
        }
        if (l === 'python') return `<pre class="code python"><code>${esc(code)}</code></pre>\n`;
        return `<pre class="code plain"><code>${esc(code)}</code></pre>\n`;
      },
      table(token) {
        const cell = (c, tag) => {
          const inner = this.parser.parseInline(c.tokens).replace(/<code>(O\([^<]+\))<\/code>/g, '<span class="bigo-src">$1</span>');
          return `<${tag}${c.align ? ` style="text-align:${c.align}"` : ''}>${inner}</${tag}>`;
        };
        const head = token.header.map((c) => cell(c, 'th')).join('');
        const body = token.rows.map((r) => '<tr>' + r.map((c) => cell(c, 'td')).join('') + '</tr>').join('');
        return `<div class="tablewrap"><table class="md"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
      },
    },
  });
  return md;
}

const CALLOUTS = { gotcha: 'Gotcha', key: 'Key idea', tip: 'Tip', note: 'Note', interview: 'Interview angle', work: 'On the job' };

function parseQuiz(text, md, fail) {
  const qs = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const q = /^\? (?:\(([\w-]+)\)\s+)?(.*)$/.exec(line);
    if (q) {
      cur = { q: q[2], module: q[1] || null, options: [], answer: -1, explain: '' };
      qs.push(cur);
      continue;
    }
    if (!cur) continue;
    const opt = /^- \[( |x)\] (.*)$/.exec(line);
    if (opt) {
      if (opt[1] === 'x') {
        if (cur.answer >= 0) fail(`quiz question has two correct options: ${cur.q}`);
        cur.answer = cur.options.length;
      }
      cur.options.push(opt[2]);
      continue;
    }
    if (line.startsWith('> ')) cur.explain += (cur.explain ? '\n' : '') + line.slice(2);
  }
  if (!qs.length) fail('empty quiz');
  for (const q of qs) {
    if (q.answer < 0) fail(`quiz question without a correct option: ${q.q}`);
    if (q.options.length < 2) fail(`quiz question needs at least 2 options: ${q.q}`);
    if (!q.explain) fail(`quiz question without an explanation: ${q.q}`);
  }
  return qs.map((q) => {
    const order = shuffledOrder(q.options.length, q.q);
    const html = md.parseInline(q.q);
    const text = textOf(html);
    // anchor: the question's id on the page (<module>.<anchor>), and the stable part of its flashcard's id.
    return { q: html, module: q.module, options: order.map((k) => md.parseInline(q.options[k])), answer: order.indexOf(q.answer), explain: md.parse(q.explain), anchor: `q-${slugify(text, 32)}-${shortHash(text)}` };
  });
}

// Authors tend to put the right answer in the same place, so options are shuffled at build time. The shuffle is
// seeded by the question text, so every build (and every reader) sees the same order.
function shuffledOrder(n, seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;  // FNV-1a
  const next = () => {  // mulberry32
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: n }, (_, k) => k);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// [[p:167]] and [[m:graphs]] (optionally [[p:167|label]]) become links; refs collects what was used.
export function inlineRefs(text, titleOf, refs) {
  return text.replace(/\[\[(p|m):([\w-]+)(?:\|([^\]]+))?\]\]/g, (all, kind, id, label) => {
    if (kind === 'p') {
      const n = Number(id);
      if (refs && !refs.problems.includes(n)) refs.problems.push(n);
      return `<a class="pref" href="#p${n}"><span class="pnum">#${n}</span>&nbsp;${esc(label || (titleOf && titleOf('p', n)) || 'problem')}</a>`;
    }
    if (refs && !refs.modules.includes(id)) refs.modules.push(id);
    return `<a class="mref" href="#${id}">${esc(label || (titleOf && titleOf('m', id)) || id)}</a>`;
  });
}

export function parseModule(src, file, md, opts = {}) {
  const { meta, body } = parseFrontMatter(src, file);
  const fail = (msg) => {
    throw new ContentError(file, msg);
  };
  if (!meta.id || !meta.title) fail('front matter needs id and title');
  const titleOf = opts.titleOf || (() => null);
  const ctx = { id: meta.id, examples: [], quizzes: [], viz: [], gotchas: [], refs: { problems: [], modules: [] } };
  const withRefs = inlineRefs(body, titleOf, ctx.refs);
  const lines = withRefs.split('\n');
  const out = [];
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^:::(\w+)\s*(.*)$/.exec(lines[i]);
    if (!open) {
      out.push(lines[i]);
      continue;
    }
    const [, kind, title] = open;
    const inner = [];
    i++;
    while (i < lines.length && lines[i].trim() !== ':::') inner.push(lines[i++]);
    if (i >= lines.length) fail(`unclosed :::${kind}`);
    let html;
    if (kind === 'quiz') {
      const id = `${meta.id}-q${ctx.quizzes.length + 1}`;
      ctx.quizzes.push({ id, questions: parseQuiz(inner.join('\n'), md, fail) });
      html = `<div class="quiz" data-quiz="${id}"></div>`;
    } else if (kind === 'viz') {
      const name = title.trim();
      if (!name) fail(':::viz needs a visualizer name');
      let args = {};
      const json = inner.join('\n').trim();
      if (json) {
        try {
          args = JSON.parse(json);
        } catch (e) {
          fail(`:::viz ${name} args are not valid JSON: ${e.message}`);
        }
      }
      const id = `${meta.id}-v${ctx.viz.length + 1}`;
      ctx.viz.push({ id, name, args });
      html = `<div class="viz-host" data-viz="${id}"></div>`;
    } else if (CALLOUTS[kind]) {
      sink = ctx;
      const inside = md.parse(inner.join('\n'));
      sink = null;
      const titleHtml = title ? md.parseInline(title) : '';
      let id = '';
      if (kind === 'gotcha') {
        if (!title.trim()) fail(':::gotcha needs a title');
        const s = slugify(textOf(titleHtml));
        id = `${meta.id}.gotcha-${s}`;
        ctx.gotchas.push({ slug: s, anchor: id, title: titleHtml, html: inside });
      }
      html = `<aside class="callout ${kind}"${id ? ` id="${id}"` : ''}><div class="callout-label">${esc(CALLOUTS[kind])}${title ? ` <span>· ${titleHtml}</span>` : ''}</div>${inside}</aside>`;
    } else {
      fail(`unknown block :::${kind}`);
    }
    blocks.push(html);
    out.push('', `<!--BLOCK:${blocks.length - 1}-->`, '');
  }
  sink = ctx;
  let html;
  try {
    html = md.parse(out.join('\n'));
  } finally {
    sink = null;
  }
  html = html.replace(/<!--BLOCK:(\d+)-->/g, (m, n) => blocks[Number(n)]);
  // Section ids, made here so a build can check links into them: <module>.<slug of the heading's text>.
  const used = new Set();
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (all, level, inner) => {
    let id = slugify(textOf(inner));
    while (used.has(id)) id += '-x';
    used.add(id);
    return `<h${level} id="${meta.id}.${id}">${inner}</h${level}>`;
  });
  // The rows of the tables under "## Complexity" (flashcards link to them).
  let cxRows = [];
  html = html.replace(new RegExp(`<h2 id="${meta.id}\\.complexity[^"]*">[\\s\\S]*?(?=<h2 |$)`), (seg) => {
    const t = tagTableRows(seg, (row) => `${meta.id}.cx-${rowKey(row[0])}`);
    cxRows = t.rows;
    return t.html;
  });
  const words = body.replace(/```[\s\S]*?```/g, '').split(/\s+/).length;
  return { meta, html, words, examples: ctx.examples, quizzes: ctx.quizzes, viz: ctx.viz, gotchas: ctx.gotchas, cxRows, refs: ctx.refs };
}
