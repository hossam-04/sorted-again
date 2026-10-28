// Compiles course content into build/course.json, executing and verifying everything in Pyodide with the
// same harness the page runs. Any error fails the build (exit code 1).
//   node tools/compile.mjs [--only a,b] [--content <dir>] [--out <file>] [--jobs N] [--no-lc] [--quick] [--no-cache]
//     --only     verify and output only these modules and/or problem ids (writes build/course.<only>.json by default)
//     --content  read content from another directory (tests use fixtures)
//     --quick    60 small + 20 medium oracle seeds instead of 300 + 50 (iteration only; the final build never uses it)
//     --no-lc    skip LeetCode cross-checks (signature, replay, originality)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PyPool, harnessFiles } from './pool.mjs';
import { INDEX, loadProblem, exampleTests, parseValue } from './leetcode.mjs';
import { parseProblem, parseModule, makeMarked, inlineRefs, ContentError, esc, slugify, textOf, tagTableRows, rowKey } from './content.mjs';
import { buildCards, checkCards, sheetModule, cardCounts } from './cards.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const MODULE_ORDER = ['start', 'big-o', 'arrays', 'two-pointers', 'sliding-window', 'stacks', 'binary-search', 'linked-lists',
  'recursion', 'trees', 'tries', 'heaps', 'backtracking', 'graphs', 'intervals', 'greedy', 'dp', 'bits-math', 'playbook',
  // The advanced part: lessons that build on the core course (front matter part: advanced).
  'ordered-structures', 'greedy-heaps', 'range-queries', 'binary-lifting', 'string-matching', 'advanced-graphs', 'advanced-dp', 'number-theory'];
const PYTHON_VERSION = '3.14.2';
const PYODIDE_VERSION = '314.0.7';

// ------------------------------------------------------------------ arguments
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const ONLY = option('--only') ? new Set(option('--only').split(',').map((s) => s.trim()).filter(Boolean)) : null;
const CONTENT = option('--content') ? path.resolve(option('--content')) : path.join(ROOT, 'content');
const FIXTURE = !!option('--content');
const OUT = option('--out') ? path.resolve(option('--out'))
  : path.join(ROOT, 'build', ONLY ? `course.${[...ONLY].join('-')}.json` : 'course.json');
const JOBS = Number(option('--jobs')) || Math.max(1, Math.min(8, os.cpus().length - 1));
const QUICK = flag('--quick');
const NO_LC = flag('--no-lc');
const NO_CACHE = flag('--no-cache');
const SEEDS = QUICK ? { small: 60, medium: 20 } : { small: 300, medium: 50 };
const CACHE_DIR = path.join(ROOT, 'build', 'verify-cache');

const errors = [];
const warnings = [];

// ------------------------------------------------------------------ helpers
const md = makeMarked();
const PROBLEM_TITLES = {};
const MODULE_IDS = new Set(MODULE_ORDER);
// Problem text may link with [[p:id]] / [[m:id]] too; unknown targets are errors.
function render(text, where) {
  if (!text || !text.trim()) return '';
  const refs = { problems: [], modules: [] };
  const html = md.parse(inlineRefs(text, (kind, id) => (kind === 'p' ? PROBLEM_TITLES[id] : MODULE_TITLES[id]) || null, refs));
  for (const id of refs.problems) if (!PROBLEM_TITLES[id] && !(id in INDEX_BY_ID)) errors.push(`${where || 'text'}: [[p:${id}]] does not match any problem`);
  for (const id of refs.modules) if (!MODULE_IDS.has(id)) errors.push(`${where || 'text'}: [[m:${id}]] does not match any module`);
  return html;
}
// The same for one-line text such as hints and example notes, without a wrapping paragraph.
function renderInline(text, where) {
  if (!text || !text.trim()) return '';
  const refs = { problems: [], modules: [] };
  const html = md.parseInline(inlineRefs(text, (kind, id) => (kind === 'p' ? PROBLEM_TITLES[id] : MODULE_TITLES[id]) || null, refs));
  for (const id of refs.problems) if (!PROBLEM_TITLES[id] && !(id in INDEX_BY_ID)) errors.push(`${where || 'text'}: [[p:${id}]] does not match any problem`);
  for (const id of refs.modules) if (!MODULE_IDS.has(id)) errors.push(`${where || 'text'}: [[m:${id}]] does not match any module`);
  return html;
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const sha = (...parts) => crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24);
// Cached results hold rendered HTML too, so the markdown renderer (content.mjs) is part of the key.
const SOURCE_HASH = sha(...Object.values(harnessFiles()), fs.readFileSync(fileURLToPath(import.meta.url), 'utf8'),
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'content.mjs'), 'utf8'), PYODIDE_VERSION);

function pylit(v) {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return `[${v.map(pylit).join(', ')}]`;
  if (v.$big) return v.$big;
  if (v.$preview) return v.$preview;
  return JSON.stringify(v);
}
const short = (s, n = 160) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function listFiles(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, pattern));
    else if (pattern.test(entry.name)) out.push(full);
  }
  return out.sort();
}

const INDEX_BY_ID = Object.fromEntries(INDEX.map((p) => [p.id, p]));
// LeetCode's own title when cached ("Two Sum II - Input Array Is Sorted"), else NeetCode's.
const titleCache = {};
const lcTitle = (id) => {
  if (!(id in titleCache)) titleCache[id] = ((loadProblem(id) || {}).title || (INDEX_BY_ID[id] || {}).title || '').trim() || null;
  return titleCache[id];
};
const MODULE_TITLES = {};

// ------------------------------------------------------------------ problems
const NODE_COMMENTS = {
  ListNode: '# Definition for a singly-linked list (predefined here, as on LeetCode):\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n',
  TreeNode: '# Definition for a binary tree node (predefined here, as on LeetCode):\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n',
  graph: '# Definition for a graph node (predefined here, as on LeetCode):\n# class Node:\n#     def __init__(self, val=0, neighbors=None):\n#         self.val = val\n#         self.neighbors = neighbors if neighbors is not None else []\n',
  random: '# Definition for a list node with a random pointer (predefined here, as on LeetCode):\n# class Node:\n#     def __init__(self, x, next=None, random=None):\n#         self.val = int(x)\n#         self.next = next\n#         self.random = random\n',
};

function starterFor(p, spec) {
  if (p.starter) return p.starter.replace(/\s+$/, '') + '\n';
  const convs = [...(spec.params || []).map((x) => x.conv), spec.ret || ''].join(' ');
  let head = '';
  if (convs.includes('ListNode') || p.adapter === 'cycle-list') head += NODE_COMMENTS.ListNode;
  if (convs.includes('TreeNode')) head += NODE_COMMENTS.TreeNode;
  if (p.node) head += NODE_COMMENTS[p.node];
  return `${head ? head + '\n' : ''}class Solution:\n    ${p.signature.trim().replace(/:?$/, ':')}\n        pass\n`;
}

function buildSpec(p, desc) {
  const spec = {
    id: p.id, kind: p.kind, compare: p.compare, examples: p.examples, edge: p.edge, gen: p.gen, perf: p.perf,
    reference: p.solution.code, limits: { perf_ms: 30000 },
  };
  if (p.perf_repeat > 1) spec.perf_repeat = p.perf_repeat;
  if (p.tol != null) spec.tol = p.tol;
  if (p.kind === 'function') {
    spec.method = desc.method;
    spec.params = desc.params.map((x) => ({ name: x.name, conv: p.params[x.name] || x.conv }));
    spec.ret = p.ret || desc.ret;
  }
  if (p.kind === 'design') spec.class = p.class;
  if (p.kind === 'codec') spec.codec = p.codec;
  if (p.adapter) spec.adapter = p.adapter;
  if (p.adapter === 'in-place') spec.inplace = p.inplace;
  if (p.node) spec.node = p.node;
  if (p.no_mutation.length) spec.no_mutation = p.no_mutation;
  if (p.validator) spec.validator = p.validator;
  const oracleAlt = p.alternatives.find((a) => a.oracle);
  spec.oracle = p.oracle || (oracleAlt && oracleAlt.code);
  return spec;
}

const GROUP_OF = { example: 'examples', edge: 'edge', random: 'random', perf: 'perf' };
const DEFAULT_HOW = (fails) => (fails === 'perf' ? 'timeout' : 'wrong');

function testName(spec, group, index) {
  if (group === 'examples') return `Example ${index + 1}`;
  if (group === 'edge') return (spec.edge[index] && spec.edge[index].name) || `edge ${index + 1}`;
  if (group === 'perf') return 'performance test';
  return `random input ${index + 1}`;
}

// What happened in a Check, in the words the build reports.
function classify(r, spec) {
  if (r.timeout) {
    const g = r.last && r.last.group;
    return { group: g, how: 'timeout', name: (r.last && r.last.name) || (r.last && r.last.index !== undefined ? testName(spec, g, r.last.index) : '?') };
  }
  if (r.stack) return { group: 'harness', how: 'crash', name: 'the native stack overflowed, which crashes Python in Safari' };
  if (r.error || r.crashed) return { group: 'harness', how: 'error', name: short(String(r.error)) };
  if (r.status === 'accepted') return { group: null, how: null };
  if (r.status === 'compile_error') return { group: 'compile', how: 'error', name: short(`${r.error.type}: ${r.error.message}`) };
  const f = r.failure;
  return { group: f.group, how: f.status === 'error' ? 'error' : 'wrong', name: f.name, failure: f };
}

function outcomeText(c) {
  if (!c.group) return 'passed every test';
  if (c.group === 'compile') return `does not compile (${c.name})`;
  if (c.group === 'harness') return `stopped the harness (${c.name})`;
  if (c.how === 'timeout') return `timed out in ${c.group} (${c.name})`;
  if (c.how === 'error') {
    const e = c.failure && c.failure.error;
    return `crashed in ${c.group} (${c.name})${e ? `: ${e.type}: ${short(e.message, 100)}` : ''}`;
  }
  return `failed ${c.group} (${c.name})`;
}

function failureDetail(c) {
  if (!c.failure) return outcomeText(c);
  const f = c.failure;
  const parts = [outcomeText(c), `input ${short(f.input, 200)}`];
  if (f.status !== 'error') parts.push(`expected ${short(pylit(f.expected), 120)}`, `got ${short(pylit(f.got), 120)}`);
  if (f.message) parts.push(f.message);
  return parts.join('; ');
}

async function verifyProblem(p, call, lc) {
  const where = `#${p.id}`;
  const E = [];
  const W = [];
  let desc = null;
  if (p.kind === 'function') {
    desc = await call('describe', { signature: p.signature });
    if (desc.error) return { E: [`${where} signature does not parse: ${short(desc.error)}`], W };
  }
  const spec = buildSpec(p, desc);
  if (!spec.oracle) E.push(`${where} has no oracle`);

  // 1. Shape vs LeetCode
  if (lc && !NO_LC) {
    if (p.kind === 'function' && lc.meta.name && lc.meta.name !== spec.method) E.push(`${where} method ${spec.method} differs from LeetCode's ${lc.meta.name}`);
    if (!p.adapter && p.kind === 'function' && Array.isArray(lc.meta.params) && lc.meta.params.length !== spec.params.length) {
      E.push(`${where} has ${spec.params.length} parameter(s); LeetCode's ${lc.meta.name} has ${lc.meta.params.length}`);
    }
    if (p.kind === 'design' && lc.meta.classname && lc.meta.classname !== p.class) E.push(`${where} class ${p.class} differs from LeetCode's ${lc.meta.classname}`);
  }

  // 2. Starter: compiles, fails example 1
  const starter = starterFor(p, spec);
  const st = await call('run', { problem: spec, code: starter, tests: [spec.examples[0]] });
  if (st.error || st.timeout) E.push(`${where} starter code could not be run: ${short(String(st.error || 'timeout'))}`);
  else if (st.status === 'compile_error') E.push(`${where} starter code does not compile: ${st.error.message} (line ${st.error.line})`);
  else if (st.tests[0].status === 'pass') E.push(`${where} starter code already passes example 1`);

  // 3. Reference vs oracle on randomized inputs, then calibration
  const ref = await call('check', {
    problem: spec, code: spec.reference,
    opts: { random_expected: 'oracle', random_small: SEEDS.small, random_medium: SEEDS.medium, perf_limit_ms: 30000, prepare_limit_ms: 300000 },
  }, { defaultLimitMs: 300000 });
  const rc = classify(ref, spec);
  if (rc.group) {
    E.push(`${where} reference ${failureDetail(rc)}`);
    return { E, W };
  }
  const pt = await call('perf_time', { problem: spec, code: spec.reference, runs: 3 }, { defaultLimitMs: 120000 });
  if (pt.error || pt.timeout) {
    E.push(`${where} perf_time failed: ${short(String(pt.error || 'timeout'))}`);
    return { E, W };
  }
  const refMs = pt.ms;
  const limit = clamp(Math.ceil((20 * refMs) / 100) * 100, 1000, 10000);
  if (refMs > 0.05 * limit) E.push(`${where} reference takes ${refMs.toFixed(0)} ms on the performance input; it must stay under 5% of the ${limit} ms limit (make the input smaller)`);
  spec.limits = { perf_ms: limit };

  // 4. Alternatives
  for (const a of p.alternatives) {
    const r = await call('check', {
      problem: spec, code: a.code,
      opts: { random_small: SEEDS.small, random_medium: SEEDS.medium, perf_limit_ms: a.slow ? 2 * limit : limit },
    }, { defaultLimitMs: 120000 });
    const c = classify(r, spec);
    if (a.slow) {
      if (!(c.how === 'timeout' && c.group === 'perf')) {
        E.push(`${where} alternative "${a.title}" is marked slow, but it ${c.group ? failureDetail(c) : `finished the performance test in ${r.perf ? r.perf.ms.toFixed(0) : '?'} ms (limit ${limit} ms)`}`);
      }
    } else if (c.group) {
      E.push(`${where} alternative "${a.title}" ${failureDetail(c)}`);
    }
  }

  // 5. Wrong answers, with the page's own test configuration
  for (const w of p.wrongs) {
    const r = await call('check', { problem: spec, code: w.code, opts: { perf_limit_ms: w.fails === 'perf' && w.how === 'timeout' ? 2 * limit : limit } });
    const c = classify(r, spec);
    const ok = c.group === GROUP_OF[w.fails] && c.how === w.how && (!w.test || c.name === w.test);
    if (!ok) {
      const declared = `fails=${w.fails}${w.how !== DEFAULT_HOW(w.fails) ? ` how=${w.how}` : ''}${w.test ? ` test="${w.test}"` : ''}`;
      E.push(`${where} wrong answer "${w.title}": declared ${declared}, but it ${outcomeText(c)}`);
    }
  }

  // 6. LeetCode's own examples, replayed against the reference
  if (lc && !NO_LC) {
    if (p.lc_skip) W.push(`${where} LeetCode replay skipped: ${p.lc_skip}`);
    else if (lc.paidOnly) W.push(`${where} LeetCode replay skipped (Premium, no published outputs)`);
    else {
      let tests = exampleTests(lc, p.kind === 'design' ? 'design' : 'function');
      if (p.kind === 'codec') tests = tests.map((t) => ({ args: t.args }));
      else tests = tests.filter((t) => 'out' in t);
      if (!tests.length) E.push(`${where} no LeetCode examples could be parsed; fix the parser or set lc_skip`);
      else {
        const r = await call('run', { problem: spec, code: spec.reference, tests });
        if (r.error || r.timeout || r.status !== 'ok') E.push(`${where} LeetCode replay could not run: ${short(String(r.error || r.status || 'timeout'))}`);
        else r.tests.forEach((t, i) => {
          if (t.status !== 'pass') E.push(`${where} LeetCode example ${i + 1}: ${t.status}; input ${short(t.input)}; expected ${short(pylit(t.expected))}; got ${short(t.got_text || '')} ${t.message || ''}${t.error ? ` ${t.error.type}: ${t.error.message}` : ''}`);
        });
      }
    }
    // 7. Originality: none of our tests may reuse LeetCode's example inputs. Degenerate inputs with at most two
    // values in total (an empty list, a single node, [1] and k = 1) are shared by every problem and allowed.
    const theirs = new Set(lc.examples.map((lines) => JSON.stringify(lines.map((l) => parseValue(l).value))));
    const ours = [...spec.examples.map((t, i) => [`example ${i + 1}`, t]), ...spec.edge.map((t) => [`edge "${t.name}"`, t])];
    const leaves = (v) => (Array.isArray(v) ? v.reduce((n, x) => n + leaves(x), 0) : v && typeof v === 'object' ? Object.values(v).reduce((n, x) => n + leaves(x), 0) : 1);
    for (const [label, t] of ours) {
      const key = JSON.stringify(p.kind === 'design' ? [t.ops, t.args] : t.args);
      if (theirs.has(key) && (p.kind === 'design' || leaves(t.args) > 2)) E.push(`${where} ${label} reuses one of LeetCode's example inputs; write your own`);
    }
  }

  // 8. Display strings for the examples
  const disp = await call('run', { problem: spec, code: spec.reference });
  if (disp.error || disp.status !== 'ok') {
    E.push(`${where} display run failed: ${short(String(disp.error || disp.status))}`);
    return { E, W };
  }
  disp.tests.forEach((t, i) => {
    if (t.status !== 'pass') E.push(`${where} reference fails its own example ${i + 1}: expected ${short(pylit(t.expected))}, got ${short(t.got_text)}`);
  });

  const idx = INDEX_BY_ID[p.id] || { title: p.title || `Problem ${p.id}`, slug: '', difficulty: 'Medium', blind75: false, premium: false };
  const pageSpec = { ...spec };
  delete pageSpec.oracle;
  const payload = {
    id: p.id, title: p.title || lcTitle(p.id) || idx.title, lcTitle: lcTitle(p.id) || idx.title, slug: idx.slug, difficulty: idx.difficulty, blind75: !!idx.blind75,
    premium: !!idx.premium, own: p.own, module: p.module, track: idx.track || 'core', patterns: p.patterns,
    lcUrl: idx.slug ? `https://leetcode.com/problems/${idx.slug}/` : '',
    taskHtml: render(p.taskMd, where), constraintsHtml: render(p.constraintsMd, where), notesHtml: render(p.notesMd, where),
    hints: p.hints.map((h) => renderInline(h, where)),
    starter, spec: pageSpec,
    examples: disp.tests.map((t, i) => ({ input: t.input, output: t.got_text, why: renderInline(spec.examples[i].why || '', where) })),
    solution: { code: p.solution.code, time: p.solution.time, space: p.solution.space, html: render(p.solution.explainMd, where) },
    alternatives: p.alternatives.map((a) => ({ title: a.title, code: a.code, time: a.time, space: a.space, slow: a.slow, html: render(a.explainMd, where) })),
    wrongs: p.wrongs.map((w) => ({ title: w.title, code: w.code, fails: w.fails, how: w.how, test: w.test, html: render(w.whyMd, where) })),
    limits: { perf_ms: limit, ref_ms: Math.round(refMs * 10) / 10 },
  };
  return { E, W, payload };
}

// ------------------------------------------------------------------ modules
const loadViz = (name) => {
  const base = path.join(CONTENT, 'viz', name);
  if (!fs.existsSync(`${base}.json`)) throw new Error(`viz ${name}: missing content/viz/${name}.json`);
  const spec = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
  const src = spec.static ? '' : fs.readFileSync(`${base}.py`, 'utf8');
  return { spec, src };
};

async function compileModule(file, pool, problemTitles) {
  const where = `module ${path.basename(file)}`;
  const m = parseModule(fs.readFileSync(file, 'utf8'), file, md, {
    titleOf: (kind, id) => (kind === 'p' ? problemTitles[id] || null : MODULE_TITLES[id] || null),
  });
  const examples = await Promise.all(m.examples.map(async (ex) => {
    const out = await pool.call('exec', { code: ex.code, limit_ms: 10000 }, { defaultLimitMs: 15000 });
    if (out.timeout) errors.push(`${where} example ${ex.id} ran longer than 10 s`);
    else if (out.crashed || out.stdout === undefined) errors.push(`${where} example ${ex.id} could not run: ${short(String(out.error))}`);
    else if (out.error && !ex.expectError) errors.push(`${where} example ${ex.id} raises ${out.error.type}: ${out.error.message} (line ${out.error.line})`);
    else if (!out.error && ex.expectError) errors.push(`${where} example ${ex.id} is marked error but ran cleanly`);
    else if (!out.error && !out.stdout.trim()) warnings.push(`${where} example ${ex.id} prints nothing`);
    return { ...ex, output: { stdout: out.stdout || '', error: out.error || null, ms: out.ms || 0 } };
  }));
  const viz = await Promise.all(m.viz.map(async (v) => {
    let loaded;
    try {
      loaded = loadViz(v.name);
    } catch (e) {
      errors.push(`${where} ${e.message}`);
      return null;
    }
    const args = { ...(loaded.spec.args || {}), ...v.args };
    if (loaded.spec.static) return { id: v.id, name: v.name, spec: loaded.spec, src: '', args, trace: null };
    const tr = await pool.call('trace', { code: loaded.src, spec: loaded.spec, args }, { defaultLimitMs: 20000 });
    if (tr.timeout) errors.push(`${where} viz ${v.name} did not finish`);
    else if (!tr.frames) errors.push(`${where} viz ${v.name} could not run: ${short(String(tr.error || 'crashed'))}`);
    else if (tr.error) errors.push(`${where} viz ${v.name} raised ${tr.error}`);
    else if (tr.truncated && !loaded.spec.allowTruncate) errors.push(`${where} viz ${v.name} hit the 400-frame cap; use a smaller default input`);
    else if (tr.frames.length < 3) errors.push(`${where} viz ${v.name} produced only ${tr.frames.length} frames`);
    else {
      // A {field} left in a caption means its expression failed in that frame.
      const bad = tr.frames.findIndex((f) => /\{[^{}]+\}/.test(f.caption || ''));
      if (bad >= 0) errors.push(`${where} viz ${v.name} frame ${bad + 1} (line ${tr.frames[bad].line}) has a caption field that didn't evaluate: ${short(tr.frames[bad].caption)}`);
    }
    return { id: v.id, name: v.name, spec: loaded.spec, src: loaded.src, args, trace: tr.frames ? { frames: tr.frames, code: tr.code, truncated: tr.truncated } : null };
  }));
  const minutes = Math.max(5, Math.round(m.words / 180) + m.examples.length + 2 * m.viz.length);
  return {
    module: {
      id: m.meta.id, num: MODULE_ORDER.indexOf(m.meta.id), part: m.meta.part || 'core', title: m.meta.title, kicker: m.meta.kicker || '', summary: m.meta.summary || '',
      minutes, html: m.html, examples, quizzes: m.quizzes, viz: viz.filter(Boolean), problems: [],
    },
    refs: m.refs,
    cardSrc: { gotchas: m.gotchas, cxRows: m.cxRows },
  };
}

// The cheat sheet (one card per "## " section) and the complexity reference. Templates feed the Playground's
// menu, and each one is run here, as a plain script like the Playground runs it, so a broken template fails the build.
// sections (the cheat sheet's, for flashcards) and rows (the complexity tables') come with ids the pages link to.
async function compileExtra(name, splitCards, pool) {
  const file = path.join(CONTENT, `${name}.md`);
  if (!fs.existsSync(file)) return { html: '', templates: [], sections: [], rows: [] };
  const src = fs.readFileSync(file, 'utf8');
  const templates = [];
  const sections = [];
  let rows = [];
  const parts = splitCards ? src.split(/^## /m).slice(1) : [src];
  let html = parts.map((part) => {
    if (!splitCards) return render(part, `${name}.md`);
    const nl = part.indexOf('\n');
    const title = part.slice(0, nl).trim();
    const body = part.slice(nl + 1);
    const first = templates.length;
    for (const m of body.matchAll(/```python template(?: title="([^"]+)")?\n([\s\S]*?)```/g)) templates.push({ title: m[1] || title, code: m[2].replace(/\s+$/, '') + '\n' });
    const para = (label) => (new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?:\\n\\s*\\n|$)`).exec(body) || [])[1];
    const see = para('When you see');
    const think = para('Think');
    if (!see || !think) errors.push(`${name}.md, ${title}: needs a "**When you see:**" and a "**Think:**" paragraph (they make its flashcard)`);
    const practice = [...((/\*\*Practice:\*\*([^\n]*)/.exec(body) || [])[1] || '').matchAll(/\[\[p:(\d+)/g)].map((m) => Number(m[1]));
    const slug = slugify(title);
    sections.push({ slug, title, see: renderInline(see || '', `${name}.md, ${title}`), think: renderInline(think || '', `${name}.md, ${title}`),
      tpl: templates.slice(first).map((t, k) => first + k), practice });
    return `<section class="sheet-card" id="patterns.${slug}"><h2>${esc(title)}</h2>${render(body, `${name}.md, ${title}`)}</section>`;
  }).join('\n');
  if (!splitCards) {
    const t = tagTableRows(html, (row, context) => `complexity.cx-${slugify(textOf(context), 24)}-${rowKey(row[0])}`);
    html = t.html;
    rows = t.rows;
  }
  await Promise.all(templates.map(async (t) => {
    const out = await pool.call('exec', { code: t.code, limit_ms: 10000 }, { defaultLimitMs: 15000 });
    if (out.timeout) errors.push(`${name}.md template "${t.title}" ran longer than 10 s`);
    else if (out.crashed || out.stdout === undefined) errors.push(`${name}.md template "${t.title}" could not run: ${short(String(out.error))}`);
    else if (out.error) errors.push(`${name}.md template "${t.title}" raises ${out.error.type}: ${out.error.message} (line ${out.error.line})`);
    else if (!out.stdout.trim()) errors.push(`${name}.md template "${t.title}" prints nothing; end it with a small demo`);
  }));
  return { html, templates, sections, rows };
}

// ------------------------------------------------------------------ main
async function main() {
  const t0 = Date.now();
  // Parse every problem file
  const files = listFiles(path.join(CONTENT, 'problems'), /^\d{4}-.*\.md$/);
  const sources = [];
  const seen = new Set();
  for (const file of files) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      const p = parseProblem(text, file);
      const idx = INDEX_BY_ID[p.id];
      if (seen.has(p.id)) errors.push(`#${p.id} is defined twice`);
      seen.add(p.id);
      if (!FIXTURE && !idx) errors.push(`#${p.id} is not in the problem index`);
      if (idx) {
        const expectName = `${String(p.id).padStart(4, '0')}-${idx.slug}.md`;
        if (path.basename(file) !== expectName) errors.push(`#${p.id} file should be named ${expectName}`);
        if (idx.module !== p.module) errors.push(`#${p.id} belongs to module ${idx.module}, not ${p.module}`);
        if (idx.premium && !p.own) errors.push(`#${p.id} is Premium on LeetCode: write it as your own exercise (own: true, with your own title)`);
      }
      if (path.basename(path.dirname(file)) !== p.module) errors.push(`#${p.id} sits in folder ${path.basename(path.dirname(file))}, not ${p.module}`);
      sources.push({ p, text });
    } catch (e) {
      if (e instanceof ContentError) errors.push(e.message);
      else throw e;
    }
  }
  if (!FIXTURE && !ONLY) for (const idx of INDEX) if (!seen.has(idx.id)) errors.push(`#${idx.id} ${idx.title} has no content file yet`);

  // Modules
  const moduleFiles = listFiles(path.join(CONTENT, 'modules'), /^\d\d-[\w-]+\.md$/);
  for (const file of moduleFiles) {
    const id = path.basename(file).replace(/^\d\d-/, '').replace(/\.md$/, '');
    try {
      MODULE_TITLES[id] = parseModule(fs.readFileSync(file, 'utf8'), file, makeMarked()).meta.title;
    } catch {
      MODULE_TITLES[id] = id;
    }
  }
  const selected = (p) => !ONLY || ONLY.has(String(p.id)) || ONLY.has(p.module);
  const todo = sources.filter(({ p }) => selected(p));
  const problemTitles = Object.fromEntries(sources.map(({ p }) => [p.id, p.title || lcTitle(p.id) || `Problem ${p.id}`]));
  Object.assign(PROBLEM_TITLES, problemTitles);

  const pool = new PyPool({ size: JOBS });
  const problems = {};
  let fromCache = 0;
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const done = await Promise.all(todo.map(async ({ p, text }) => {
      const lc = FIXTURE && NO_LC ? null : loadProblem(p.id);
      if (!lc && !NO_LC && !FIXTURE) warnings.push(`#${p.id} has no LeetCode cache entry; run npm run lc`);
      const key = sha(text, SOURCE_HASH, QUICK ? 'quick' : 'full', NO_LC ? 'nolc' : 'lc', lc ? JSON.stringify(lc) : '');
      const cacheFile = path.join(CACHE_DIR, `${p.id}.json`);
      if (!NO_CACHE && fs.existsSync(cacheFile)) {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cached.key === key) {
          fromCache++;
          return { p, ...cached.result, cached: true };
        }
      }
      const started = Date.now();
      const result = await pool.session((call) => verifyProblem(p, call, lc));
      result.seconds = (Date.now() - started) / 1000;
      if (!result.E.length) fs.writeFileSync(cacheFile, JSON.stringify({ key, result }));
      const mark = result.E.length ? `✗ ${result.E.length} error(s)` : `✓ ref ${result.payload.limits.ref_ms} ms, limit ${result.payload.limits.perf_ms} ms`;
      console.log(`  #${p.id} ${problemTitles[p.id]}: ${mark} (${result.seconds.toFixed(1)} s)`);
      return { p, ...result };
    }));
    // Code that should pass but timed out in the performance test may only have met a busy machine: with several
    // workers running at once, one perf test can be slowed many times over. Verify those problems once more, one at
    // a time, now that the pool is otherwise idle, and keep that result.
    const busy = /\b(alternative "[^"]*"|reference) timed out in perf\b/;
    for (let i = 0; i < done.length; i++) {
      const r = done[i];
      if (r.cached || !r.E.length || !r.E.every((e) => busy.test(e))) continue;
      const lc = FIXTURE && NO_LC ? null : loadProblem(r.p.id);
      const again = await pool.session((call) => verifyProblem(r.p, call, lc));
      console.log(`  #${r.p.id} ${problemTitles[r.p.id]}: verified again on a quiet pool: ${again.E.length ? `✗ ${again.E.length} error(s)` : '✓'}`);
      if (!again.E.length) {
        warnings.push(`#${r.p.id} timed out in a performance test while the build was busy, and passed when verified again alone`);
        const key = sha(sources.find((x) => x.p.id === r.p.id).text, SOURCE_HASH, QUICK ? 'quick' : 'full', NO_LC ? 'nolc' : 'lc', lc ? JSON.stringify(lc) : '');
        fs.writeFileSync(path.join(CACHE_DIR, `${r.p.id}.json`), JSON.stringify({ key, result: again }));
      }
      done[i] = { p: r.p, ...again };
    }
    for (const r of done) {
      errors.push(...r.E);
      warnings.push(...r.W);
      if (r.payload) problems[r.p.id] = r.payload;
    }

    // Lessons
    const modules = [];
    const cardSrc = {};
    for (const file of moduleFiles) {
      const id = path.basename(file).replace(/^\d\d-/, '').replace(/\.md$/, '');
      if (ONLY && !ONLY.has(id) && ![...ONLY].some((x) => sources.find(({ p }) => String(p.id) === x && p.module === id))) continue;
      if (!MODULE_ORDER.includes(id)) {
        errors.push(`${file}: unknown module id ${id}`);
        continue;
      }
      try {
        const { module: m, refs, cardSrc: src } = await compileModule(file, pool, problemTitles);
        cardSrc[m.id] = src;
        if (path.basename(file).slice(0, 2) !== String(m.num).padStart(2, '0')) errors.push(`${file}: module ${m.id} should be numbered ${String(m.num).padStart(2, '0')}`);
        for (const id2 of refs.problems) if (!problemTitles[id2] && !INDEX_BY_ID[id2]) errors.push(`${file}: [[p:${id2}]] does not match any problem`);
        for (const id2 of refs.modules) if (!MODULE_ORDER.includes(id2)) errors.push(`${file}: [[m:${id2}]] does not match any module`);
        modules.push(m);
      } catch (e) {
        if (e instanceof ContentError) errors.push(e.message);
        else throw e;
      }
    }
    modules.sort((a, b) => a.num - b.num);
    const order = INDEX.map((x) => x.id);
    for (const m of modules) {
      m.problems = Object.values(problems).filter((p) => p.module === m.id).map((p) => p.id)
        .sort((a, b) => (order.indexOf(a) < 0 ? 1e9 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 1e9 : order.indexOf(b)));
    }
    if (!FIXTURE && !ONLY) for (const id of MODULE_ORDER) if (!modules.find((m) => m.id === id)) errors.push(`module ${id} has no lesson file yet`);

    const sheet = await compileExtra('cheatsheet', true, pool);
    const complexity = await compileExtra('complexity', false, pool);
    const course = {
      meta: {
        builtAt: new Date().toISOString(), python: PYTHON_VERSION, pyodide: PYODIDE_VERSION,
        problemCount: Object.keys(problems).length, exampleCount: modules.reduce((n, m) => n + m.examples.length, 0),
        vizCount: modules.reduce((n, m) => n + m.viz.length, 0), partial: !!ONLY || FIXTURE,
      },
      modules, problems, cheatsheet: sheet.html, templates: sheet.templates, complexity: complexity.html,
    };
    // Flashcards: built from everything above, then checked with the same renderer the page uses.
    const moduleOfProblem = Object.fromEntries(sources.map(({ p }) => [p.id, p.module]));
    for (const s of sheet.sections) {
      s.module = sheetModule(s.practice, moduleOfProblem);
      if (!s.module) errors.push(`cheatsheet.md, ${s.title}: its **Practice:** line links no problems, so its flashcard has no module`);
    }
    course.cards = buildCards({ modules: modules.map((m) => ({ ...m, ...cardSrc[m.id] })), problems, sheet: sheet.sections, reference: complexity.rows });
    errors.push(...checkCards(course.cards, course));
    const cc = cardCounts(course.cards);
    course.meta.cardCount = course.cards.length;
    if (flag('--cards')) console.log('flashcards by module: ' + Object.entries(cc.byModule).map(([k, n]) => `${k} ${n}`).join(', '));
    const json = JSON.stringify(course);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, json);
    const counts = Object.values(problems);
    console.log(`\nmodules ${modules.length}, examples ${course.meta.exampleCount}, problems ${counts.length} (${fromCache} from cache), ` +
      `solutions+alternatives ${counts.reduce((n, p) => n + 1 + p.alternatives.length, 0)}, wrong answers ${counts.reduce((n, p) => n + p.wrongs.length, 0)}, ` +
      `viz ${course.meta.vizCount}, flashcards ${course.cards.length} (${Object.entries(cc.byKind).map(([k, n]) => `${k} ${n}`).join(', ')}), ${path.relative(process.cwd(), OUT)} ${(Buffer.byteLength(json) / 1048576).toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  } finally {
    await pool.close();
  }
  for (const w of warnings) console.log('warn  ' + w);
  for (const e of errors) console.log('ERROR ' + e);
  console.log(errors.length ? `\n${errors.length} error(s)` : '\nall checks passed');
  process.exitCode = errors.length ? 1 : 0;
}

await main();
