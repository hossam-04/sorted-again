// Fetches LeetCode metadata for the course's problems into cache/lc/<id>.json.
// Used only to VERIFY our own solutions (signatures, example inputs -> outputs, originality).
// Nothing fetched here is copied into the course page.
//   node tools/leetcode.mjs            fetch anything missing
//   node tools/leetcode.mjs show 167   print a problem as plain text (to check our wording is our own)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, 'cache', 'lc');
const SPECS = path.join(ROOT, '..', 'docs', 'superpowers', 'specs');
const readIndex = (name, track) => JSON.parse(fs.readFileSync(path.join(SPECS, name), 'utf8')).map((p) => ({ ...p, track }));
// The NeetCode 150, then the advanced part's problems. A module's problems follow this order.
export const INDEX = [...readIndex('2026-10-02-problem-index.json', 'core'), ...readIndex('2026-10-23-advanced-index.json', 'advanced')];
const QUERY = `query q($s: String!) { question(titleSlug: $s) {
  questionFrontendId title titleSlug difficulty isPaidOnly content metaData exampleTestcaseList } }`;

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
export const htmlToText = (html) => decode(html.replace(/<li>/g, '\n  - ').replace(/<\/p>|<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ''))
  .replace(/\n{3,}/g, '\n\n').trim();

export function parseValue(s) {
  const t = String(s).trim();
  try {
    return { ok: true, value: JSON.parse(t) };
  } catch {
    return { ok: false, value: undefined };
  }
}

export function outputsFromHtml(html) {
  const text = decode(String(html).replace(/<\/p>|<br\s*\/?>|<\/div>/g, '\n').replace(/<[^>]+>/g, ''));
  const out = [];
  // "Output: value", "Output" with the value on the next line (design problems), or a value spread over lines.
  const re = /(?:^|\n)[ \t]*Output:?[ \t]*/g;
  while (re.exec(text)) {
    const rest = text.slice(re.lastIndex);
    const end = rest.search(/\n[ \t]*(?:Explanation|Example|Input|Constraints)\b|\S\n[ \t]*\n|$/);
    const chunk = rest.slice(0, end < 0 ? undefined : end + (/^\S\n/.test(rest.slice(end)) ? 1 : 0)).trim();
    const joined = chunk.replace(/\s*\n\s*/g, '');
    out.push(parseValue(joined).ok ? joined : chunk.split('\n')[0].trim());
  }
  return out;
}

export function exampleTests(lc, kind) {
  return lc.examples.map((lines, i) => {
    const vals = lines.map((l) => parseValue(l).value);
    const t = kind === 'design' ? { ops: vals[0], args: vals[1] } : { args: vals };
    if (i < lc.outputs.length) {
      const o = parseValue(lc.outputs[i]);
      if (o.ok) t.out = o.value;
    }
    return t;
  });
}

export function loadProblem(id) {
  const file = path.join(CACHE, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  const q = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    id: Number(q.questionFrontendId), title: q.title, slug: q.titleSlug, difficulty: q.difficulty, paidOnly: q.isPaidOnly,
    meta: q.metaData ? JSON.parse(q.metaData) : {},
    examples: (q.exampleTestcaseList || []).map((s) => s.split('\n')),
    outputs: q.content ? outputsFromHtml(q.content) : [],
    text: htmlToText(q.content || ''),
  };
}

async function fetchOne(slug) {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: `https://leetcode.com/problems/${slug}/`, 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query: QUERY, variables: { s: slug } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${slug}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.question;
}

export async function fetchMissing({ log = console.log } = {}) {
  fs.mkdirSync(CACHE, { recursive: true });
  let fetched = 0;
  for (const p of INDEX) {
    const file = path.join(CACHE, `${p.id}.json`);
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(file, JSON.stringify(await fetchOne(p.slug)));
    fetched++;
    await new Promise((r) => setTimeout(r, 600));
  }
  log(`leetcode cache: fetched ${fetched}, cached ${INDEX.length}`);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'show') {
    const p = loadProblem(arg);
    if (!p) throw new Error(`not cached: ${arg}`);
    console.log(`#${p.id} ${p.title} (${p.difficulty}) https://leetcode.com/problems/${p.slug}/\n${p.text}`);
    console.log('\nmeta:', JSON.stringify(p.meta), '\nexamples:', JSON.stringify(p.examples), '\noutputs:', JSON.stringify(p.outputs));
    return;
  }
  await fetchMissing();
  let mismatch = 0;
  for (const { id } of INDEX) {
    const p = loadProblem(id);
    if (!p.paidOnly && p.outputs.length !== p.examples.length) {
      mismatch++;
      console.log(`#${id}: ${p.examples.length} example inputs, ${p.outputs.length} parsed outputs`);
    }
  }
  console.log(`output/example count mismatches: ${mismatch}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
