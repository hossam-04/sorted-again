// Browser tests for the built page, with Playwright (cached Chromium 1243 and WebKit 2359; Firefox if installed).
//   node tools/e2e.mjs [--scenario runtime,shell,problem,module,pages | full] [--engines chromium,webkit,firefox]
//                      [--targets file,serve,artifact] [--page <built html>] [--only <module|id,...>] [--shots]
// Targets: file = the standalone page over file://; serve = the same page over http with the artifact CSP;
// artifact = build/artifact.html inside the artifact viewer's skeleton, also with the artifact CSP.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, webkit, firefox, devices } from 'playwright-core';
import { startServer } from './serve.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.dirname(ROOT);
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const list = (s, dflt) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : dflt);
const SCENARIO_LIST = list(arg('--scenario'), ['full']);
const ENGINES = list(arg('--engines'), ['chromium', 'webkit']);
const TARGETS = list(arg('--targets'), ['file', 'serve', 'artifact']);
const PAGE = path.resolve(arg('--page') || path.join(REPO, 'dsa-course.html'));
const ARTIFACT = arg('--page') ? PAGE.replace(/\.html$/, '') + '.artifact.html' : path.join(ROOT, 'build', 'artifact.html');
const ONLY = arg('--only') ? new Set(list(arg('--only'), [])) : null;
const SHOTS = argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'build', 'shots');
// Problems that exercise every harness path: plain, design, tree, linked list, own Premium replacement, validator, codec, graph clone.
const SAMPLE_PROBLEMS = [167, 155, 104, 206, 252, 210, 297, 133, 460, 1044, 1192];

async function shots(page, engine, target) {
  const have = await page.evaluate(() => ({ mods: window.SA.modules.map((m) => m.id), probs: Object.keys(window.SA.problems).map(Number) }));
  // With --only, photograph what is being tested; otherwise a fixed sample.
  const wantMods = ONLY ? [...ONLY].filter((x) => !/^\d+$/.test(x)) : ['two-pointers', 'graphs', 'dp'];
  const wantProbs = ONLY ? [...ONLY].filter((x) => /^\d+$/.test(x)).map(Number) : [167];
  const views = ['home', ...have.mods.filter((m) => wantMods.includes(m)), ...have.probs.filter((id) => wantProbs.includes(id)).map((id) => `p${id}`)];
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      for (const v of views) {
        await goto(page, v);
        await page.waitForTimeout(150);
        if (await page.$('.viz .step')) {
          for (let k = 0; k < 4; k++) await page.click('.viz button[aria-label="Step forward"]');
          await page.locator('.viz').first().scrollIntoViewIfNeeded();
        }
        await page.screenshot({ path: path.join(SHOT_DIR, `${engine}-${target}-${v}-${width}-${scheme}.png`) });
      }
    }
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 900 });
}
const CHROMIUM = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const ALLOWED = [/^file:/, /^blob:/, /^data:/, /^https:\/\/cdnjs\.cloudflare\.com\//, /^https:\/\/fonts\.googleapis\.com\//, /^https:\/\/fonts\.gstatic\.com\//, /^http:\/\/localhost:\d+\//];

const results = [];
function makeTester(engine, target, page) {
  return {
    async check(name, fn) {
      const t0 = Date.now();
      try {
        await fn();
        results.push({ engine, target, name, ok: true, ms: Date.now() - t0 });
      } catch (e) {
        results.push({ engine, target, name, ok: false, ms: Date.now() - t0, detail: String((e && e.message) || e).split('\n')[0].slice(0, 300) });
        if (page) {
          const file = path.join(SHOT_DIR, `fail-${engine}-${target}-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.png`);
          try {
            fs.mkdirSync(SHOT_DIR, { recursive: true });
            await page.screenshot({ path: file, fullPage: false });
          } catch { /* a page that crashed can't be photographed */ }
        }
      }
    },
    skip(name, why) {
      results.push({ engine, target, name, ok: null, detail: why });
    },
  };
}

const booted = (page) => page.waitForFunction(() => window.SA && window.SA.booted, null, { timeout: 60000 });
// WebKit ignores a page's navigations after about 200 in ten seconds ("Excessive navigation attempts
// blocked."), and a sweep of every route gets there. Pace hash changes to stay well under that.
const navTimes = new WeakMap();
const goto = async (page, hash) => {
  const times = navTimes.get(page) || [];
  navTimes.set(page, times);
  while (times.length && Date.now() - times[0] > 10000) times.shift();
  if (times.length >= 150) await page.waitForTimeout(10050 - (Date.now() - times[0]));
  times.push(Date.now());
  try {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForFunction((h) => location.hash === '#' + h, hash, { timeout: 20000, polling: 50 });
  } catch (e) {
    throw new Error(`going to #${hash}: ${String((e && e.message) || e).split('\n')[0]}`);
  }
};

export const SCENARIOS = {

  // Every route at three widths in both color schemes: no sideways scroll, real content, no errors.
  async sweep(page, t, env) {
    const routes = await page.evaluate(() => ['home', 'problems', 'drill', 'flashcards', 'patterns', 'complexity', 'playground', ...window.SA.modules.map((m) => m.id), ...window.SA.problemOrder.map((id) => `p${id}`)]);
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of [390, 768, 1440]) {
        await t.check(`sweep: ${routes.length} routes at ${width} px, ${scheme}`, async () => {
          await page.setViewportSize({ width, height: 900 });
          const bad = [];
          for (const r of routes) {
            const before = env.errors.length;
            await goto(page, r);
            await page.waitForTimeout(30);
            const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, text: document.getElementById('main').innerText.length,
              empty: !!document.querySelector('#main .empty'), bg: getComputedStyle(document.body).backgroundColor }));
            if (m.sw > m.iw + 1) bad.push(`${r} scrolls sideways (${m.sw} > ${m.iw})`);
            if (m.text < 200 && !m.empty) bad.push(`${r} has only ${m.text} characters`);
            if (env.errors.length > before) bad.push(`${r}: ${env.errors.slice(before).join(' | ').slice(0, 160)}`);
          }
          if (bad.length) throw new Error(bad.slice(0, 4).join('; ') + (bad.length > 4 ? ` (+${bad.length - 4} more)` : ''));
        });
      }
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await goto(page, 'home');
  },

  // WCAG contrast of every text token on every surface, computed from the live CSS in both schemes.
  async contrast(page, t) {
    for (const scheme of ['light', 'dark']) {
      await t.check(`contrast: text tokens reach WCAG AA (${scheme})`, async () => {
        await page.emulateMedia({ colorScheme: scheme });
        const bad = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          const hex = (name) => css.getPropertyValue(name).trim();
          const rgb = (h) => {
            const m = /^#([0-9a-f]{6})$/i.exec(h);
            if (!m) return null;
            const n = parseInt(m[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
          };
          const lum = (c) => {
            const [r, g, b] = c.map((v) => {
              v /= 255;
              return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const ratio = (a, b) => {
            const [x, y] = [lum(rgb(hex(a))), lum(rgb(hex(b)))].sort((p, q) => q - p);
            return (x + 0.05) / (y + 0.05);
          };
          const texts = ['--ink', '--ink-2', '--ink-3', '--accent', '--ok', '--bad', '--warn', '--c-kw', '--c-fn', '--c-bi', '--c-str', '--c-num', '--c-com', '--c-dec'];
          const grounds = ['--paper', '--surface', '--surface-2'];
          const out = [];
          for (const f of texts) for (const g of grounds) {
            if (!rgb(hex(f)) || !rgb(hex(g))) { out.push(`${f} or ${g} is not a plain hex color`); continue; }
            const r = ratio(f, g);
            if (r < 4.5) out.push(`${f} on ${g}: ${r.toFixed(2)}`);
          }
          for (const [f, g] of [['--mark-ink', '--mark'], ['--accent-ink', '--accent'], ['--ok', '--ok-soft'], ['--bad', '--bad-soft'], ['--ink', '--accent-soft'], ['--ink', '--bad-soft'], ['--ink', '--ok-soft']]) {
            const r = ratio(f, g);
            if (r < 4.5) out.push(`${f} on ${g}: ${r.toFixed(2)}`);
          }
          return out;
        });
        await page.emulateMedia({ colorScheme: 'light' });
        if (bad.length) throw new Error(bad.join('; '));
      });
    }
  },

  // With JavaScript off (a Messages or Quick Look preview), the page must say how to open it.
  async nojs(page, t, env) {
    await t.check('no JavaScript: the "open in a browser" message shows', async () => {
      const ctx = await env.browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const p2 = await ctx.newPage();
      await p2.goto(env.url);
      const shown = await p2.locator('#nojs').isVisible();
      const text = await p2.locator('#nojs').textContent();
      const app = await p2.locator('#app').isVisible();
      const sw = await p2.evaluate(() => document.documentElement.scrollWidth).catch(() => 0);
      await ctx.close();
      if (!shown || app || !/Open this page in a web browser/.test(text)) throw new Error(`notice visible ${shown}, app visible ${app}`);
      if (sw > 391) throw new Error(`scrolls sideways (${sw})`);
    });
  },
  async shell(page, t) {
    await t.check('shell: no-JavaScript notice hidden, app shown', async () => {
      const s = await page.evaluate(() => [document.getElementById('nojs').hidden, document.getElementById('app').hidden]);
      if (s[0] !== true || s[1] !== false) throw new Error(JSON.stringify(s));
    });
    await t.check('shell: theme toggle cycles and survives a reload', async () => {
      const get = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const seq = [];
      for (let i = 0; i < 3; i++) {
        await page.click('#theme-btn');
        seq.push(await get());
      }
      if (JSON.stringify(seq) !== JSON.stringify(['light', 'dark', null])) throw new Error(`cycle ${JSON.stringify(seq)}`);
      await page.click('#theme-btn');
      await page.reload();
      await booted(page);
      const after = await get();
      await page.click('#theme-btn');
      await page.click('#theme-btn');
      if (after !== 'light') throw new Error(`after reload: ${after}`);
    });
    await t.check('shell: sidebar lists every module', async () => {
      const [n, want] = await page.evaluate(() => [document.querySelectorAll('#sidebar .side-mod').length, window.SA.modules.length]);
      if (n !== want || n < 1) throw new Error(`${n} links for ${want} modules`);
    });
    await t.check('shell: drawer opens and closes at phone width', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.click('#menu-btn');
      const open = await page.evaluate(() => document.getElementById('sidebar').classList.contains('open'));
      await page.keyboard.press('Escape');
      const closed = await page.evaluate(() => !document.getElementById('sidebar').classList.contains('open'));
      await page.setViewportSize({ width: 1280, height: 900 });
      if (!open || !closed) throw new Error(`open ${open}, closed ${closed}`);
    });
    await t.check('shell: unknown route shows "Nothing at this address"', async () => {
      await goto(page, 'nope');
      await page.waitForFunction(() => /Nothing at this address/.test(document.getElementById('main').textContent), null, { timeout: 5000 });
      await goto(page, 'home');
    });
  },

  async problem(page, t, env) {
    const id = Number((env.problemId) || 167);
    const out = () => page.evaluate(() => (document.querySelector('.work-out') || {}).textContent || '');
    const setEditor = (code) => page.evaluate((c) => {
      const cmEl = document.querySelector('.editor-host .CodeMirror');
      if (cmEl) cmEl.CodeMirror.setValue(c);
      else {
        const ta = document.querySelector('.editor-host textarea');
        ta.value = c;
        ta.dispatchEvent(new Event('input'));
      }
    }, code);
    await t.check(`problem ${id}: page renders`, async () => {
      await goto(page, `p${id}`);
      await page.waitForSelector('.problem h1.title');
      const h1 = await page.textContent('.problem h1.title');
      if (!h1.includes(`#${id}`)) throw new Error(h1);
    });
    if (id === 167) {
      await t.check('problem 167: examples show my own data', async () => {
        const txt = await page.textContent('.p-top');
        if (!txt.includes('numbers = [1, 3, 4, 6, 8, 11], target = 10') || !txt.includes('[3, 4]')) throw new Error('example text missing');
      });
    }
    await t.check(`problem ${id}: Run with the starter shows failing examples`, async () => {
      await page.click('.work-bar .btn:has-text("Run")');
      await page.waitForFunction(() => /examples pass|Doesn't compile/.test(document.querySelector('.work-out').textContent), null, { timeout: 90000 });
      const text = await out();
      const m = /(\d+) of (\d+) examples pass/.exec(text);  // a starter may pass a trivial example, never all of them
      if (!m || Number(m[1]) >= Number(m[2]) || !/Example 1[\s\S]*wrong answer|Example 1[\s\S]*raised/.test(text)) throw new Error(text.slice(0, 200));
    });
    await t.check(`problem ${id}: the reference is Accepted and marks the problem solved`, async () => {
      await page.click('button:has-text("Show solutions")');
      await page.locator('.solutions .sol').first().locator('button:has-text("Load into editor")').click();
      await page.click('.work-bar .btn.primary');
      await page.waitForFunction(() => /Accepted|Wrong answer|Runtime error|Time limit|compile/.test(document.querySelector('.work-out .verdict:not(.running)')?.textContent || '')
        || !!document.querySelector('.work-out .crash, .work-out > .out-msg.error'), null, { timeout: 120000 });
      const text = await out();
      if (!text.includes('Accepted')) throw new Error(text.slice(0, 300));
      const side = await page.textContent('#sidebar');
      if (!side.includes(`✓ ${id}`)) throw new Error('sidebar not updated');
    });
    await t.check(`problem ${id}: Step through replays the code line by line`, async () => {
      await page.click('.work-bar button:has-text("Step through")');
      await page.waitForSelector('.stepper, .work-out .crash, .work-out > .out-msg.error, .work-out .verdict.bad', { timeout: 120000 });
      const first = (await page.textContent('.stepper .step').catch(() => '')) || (await out()).slice(0, 200);
      const total = Number(first.split(' of ')[1]);
      if (!/^step 1 of \d+$/.test(first) || total < 2) throw new Error(first);
      await page.click('.stepper button[aria-label="Step forward"]');
      const second = await page.textContent('.stepper .step');
      const lit = await page.evaluate(() => document.querySelectorAll('.editor-host .cm-step-line').length);
      const result = await page.textContent('.st-result');
      if (second !== `step 2 of ${total}` || lit !== 1 || !/the expected answer/.test(result)) throw new Error(`${second}; ${lit} lines lit; ${result}`);
      await page.click('.stepper button:has-text("Close")');
      if (await page.evaluate(() => document.querySelectorAll('.editor-host .cm-step-line').length)) throw new Error('the step line stayed highlighted');
    });
    await t.check(`problem ${id}: every wrong answer fails the way it says`, async () => {
      await page.click('button:has-text("Show wrong answers")');
      const n = await page.locator('.wrongs .sol.trap').count();
      const meta = await page.evaluate((pid) => window.SA.problems[pid].wrongs.map((w) => ({ fails: w.fails, how: w.how, test: w.test, title: w.title })), id);
      for (let i = 0; i < n; i++) {
        const card = page.locator('.wrongs .sol.trap').nth(i);
        await card.locator('button:has-text("Run it")').click();
        await page.waitForFunction((k) => {
          const box = document.querySelectorAll('.wrongs .sol.trap')[k].querySelector('.inline-result');
          const v = box && box.querySelector('.verdict:not(.running)');
          return (v && /Accepted|Wrong answer|Runtime error|Time limit|compile/.test(v.textContent)) || !!(box && box.querySelector('.crash, :scope > .out-msg.error'));
        }, i, { timeout: 120000 });
        const text = await card.locator('.inline-result').textContent();
        const w = meta[i];
        const want = w.how === 'timeout' ? 'Time limit' : w.how === 'error' ? 'Runtime error' : 'Wrong answer';
        if (!text.includes(want)) throw new Error(`"${w.title}": expected "${want}", got ${text.slice(0, 160)}`);
        if (w.test && !text.includes(w.test)) throw new Error(`"${w.title}": expected test "${w.test}" in ${text.slice(0, 160)}`);
        if (w.how === 'timeout') await page.waitForFunction(() => window.SA.py.state === 'ready', null, { timeout: 60000 });
      }
    });
    await t.check(`problem ${id}: an infinite loop is stopped`, async () => {
      await setEditor('class Solution:\n    def f(self, *args):\n        pass\n\nwhile True:\n    pass\n');
      await page.click('.work-bar .btn:has-text("Run")');
      await page.waitForFunction(() => /ran longer than 3 s/.test(document.querySelector('.work-out').textContent), null, { timeout: 30000 });
      await page.waitForFunction(() => window.SA.py.state === 'ready', null, { timeout: 60000 });
    });
    await t.check(`problem ${id}: the draft survives a reload`, async () => {
      await page.waitForTimeout(400);
      await page.reload();
      await booted(page);
      await page.waitForSelector('.editor-host');
      const code = await page.evaluate(() => {
        const cmEl = document.querySelector('.editor-host .CodeMirror');
        return cmEl ? cmEl.CodeMirror.getValue() : document.querySelector('.editor-host textarea').value;
      });
      if (!code.includes('while True')) throw new Error(code.slice(0, 80));
      if (!(await page.evaluate((pid) => window.SA.isSolved(pid), id))) throw new Error('solved state lost after reload');
    });
  },

  async module(page, t, env) {
    const mod = env.moduleId || 'two-pointers';
    const viz = '.viz';
    const step = () => page.textContent(`${viz} .step`);
    const line = () => page.evaluate((v) => (document.querySelector(`${v} .viz-code .ln.on .no`) || {}).textContent, viz);
    await goto(page, mod);
    await page.waitForSelector('.lesson h1.title');
    const has = await page.evaluate(() => ({ viz: !!document.querySelector('.viz .step'), ex: !!document.querySelector('.prose .example'), quiz: !!document.querySelector('.prose .quiz') }));
    if (!has.viz) t.skip(`module ${mod}: visualizer`, 'this module has no step-through visualizer');
    if (has.viz) await t.check(`module ${mod}: page and visualizer render`, async () => {
      await page.waitForSelector(`${viz} .step`);
      const s = await step();
      if (!/^step 1 \/ \d+$/.test(s)) throw new Error(s);
      const first = await page.evaluate((id) => {
        const m = window.SA.modules.find((x) => x.id === id);
        const v = m && m.viz.find((x) => x.trace && x.trace.frames.length);
        return v ? String(v.trace.frames[0].line) : null;
      }, mod);
      if ((await line()) !== first) throw new Error(`highlighted line ${await line()}, expected ${first}`);
    });
    if (has.viz) await t.check(`module ${mod}: stepping forward and back moves the highlighted line`, async () => {
      for (let k = 0; k < 3; k++) await page.click(`${viz} button[aria-label="Step forward"]`);
      const s4 = await step();
      const l4 = await line();
      await page.click(`${viz} button[aria-label="Step back"]`);
      const s3 = await step();
      const l3 = await line();
      const want = await page.evaluate((id) => {
        const m = window.SA.modules.find((x) => x.id === id);
        const v = m && m.viz.find((x) => x.trace && x.trace.frames.length);
        return v ? v.trace.frames.slice(2, 4).map((f) => String(f.line)) : [];
      }, mod);
      if (!/^step 4 \//.test(s4) || !/^step 3 \//.test(s3) || l4 !== want[1] || l3 !== want[0]) throw new Error(`${s4} line ${l4} / ${s3} line ${l3}, expected lines ${want.join(', ')}`);
    });
    if (has.viz) await t.check(`module ${mod}: Play advances on its own`, async () => {
      const before = Number((await step()).split(' ')[1]);
      await page.click(`${viz} .viz-controls .btn.primary`);
      await page.waitForTimeout(2600);
      await page.click(`${viz} .viz-controls .btn.primary`);
      const after = Number((await step()).split(' ')[1]);
      if (after < before + 2) throw new Error(`${before} -> ${after}`);
    });
    if (await page.$('.viz.growth')) await t.check(`module ${mod}: the growth chart follows its slider`, async () => {
      const before = await page.textContent('.viz.growth .growth-n');
      await page.$eval('.viz.growth input[type=range]', (r) => { r.value = r.max; r.dispatchEvent(new Event('input')); });
      const after = await page.textContent('.viz.growth .growth-n');
      const rows = await page.$$eval('.viz.growth tbody tr', (trs) => trs.map((tr) => tr.textContent));
      const dots = await page.$$eval('.viz.growth .dot', (d) => d.length);
      if (after === before || after !== 'n = 1,000,000' || rows.length !== 6 || !/301,030 digits/.test(rows[5]) || dots !== 6) throw new Error(`${before} -> ${after}; ${dots} dots; ${rows.join(' | ')}`);
    });
    if (mod === 'two-pointers') {
      await t.check('module two-pointers: Edit input traces again in Python', async () => {
        const total = (await step()).split('/ ')[1];
        await page.click(`${viz} button:has-text("Edit input")`);
        await page.fill(`${viz} .viz-edit input >> nth=0`, '2, 4, 9');
        await page.fill(`${viz} .viz-edit input >> nth=1`, '13');
        await page.click(`${viz} button:has-text("Trace again")`);
        await page.waitForFunction(([v, tot]) => {
          const s = document.querySelector(`${v} .step`).textContent;
          return /^step 1 \//.test(s) && s.split('/ ')[1] !== tot;
        }, [viz, total], { timeout: 60000 });
        await page.evaluate((v) => {
          const s = document.querySelector(`${v} .scrub`);
          s.value = s.max;
          s.dispatchEvent(new Event('input'));
        }, viz);
        const cap = await page.textContent(`${viz} .caption`);
        if (!/is the target/.test(cap)) throw new Error(cap);
      });
      await t.check('module two-pointers: an unsorted input is refused with a reason', async () => {
        await page.fill(`${viz} .viz-edit input >> nth=0`, '3, 1');
        await page.click(`${viz} button:has-text("Trace again")`);
        const err = await page.textContent(`${viz} .viz-edit .err`);
        if (!/ascending order/.test(err)) throw new Error(err);
      });
    }
    if (has.ex) await t.check(`module ${mod}: a lesson example runs`, async () => {
      const ex = page.locator('.prose .example').first();
      await ex.locator('button:has-text("Run")').click();
      await page.waitForFunction(() => /ran here in/.test(document.querySelector('.prose .example .note').textContent), null, { timeout: 60000 });
      const out = await ex.locator('.ex-out').textContent();
      if (!out.trim()) throw new Error('no output');
    });
    if (has.quiz) await t.check(`module ${mod}: the quiz scores answers`, async () => {
      const q = page.locator('.prose .quiz').first();
      const n = await q.locator('.quiz-q').count();
      for (let k = 0; k < n; k++) await q.locator('.quiz-q').nth(k).locator('.quiz-opt').first().click();
      const s = await q.locator('.quiz-score').textContent();
      if (!new RegExp(`\\d+ of ${n} correct`).test(s)) throw new Error(s);
    });
  },

  async pages(page, t, env) {
    await t.check('pages: home shows the course map and progress table', async () => {
      await goto(page, 'home');
      await page.waitForSelector('.course-map');
      const [rows, mods, repl] = await page.evaluate(() => [document.querySelectorAll('.course-map tbody tr.link').length, window.SA.modules.length, document.querySelectorAll('.repl tbody tr').length]);
      if (rows !== mods || repl !== 4) throw new Error(`${rows} rows for ${mods} modules, ${repl} REPL rows`);
    });
    await t.check('pages: the problems index filters by search', async () => {
      await goto(page, 'problems');
      await page.fill('#problem-search', 'Two Sum II');
      const ids = await page.evaluate(() => [...document.querySelectorAll('table.ptable tbody td.id')].map((x) => x.textContent));
      if (!ids.includes('167') || ids.length < 1) throw new Error(JSON.stringify(ids));
      await page.fill('#problem-search', 'zzzz-nothing');
      const empty = await page.textContent('table.ptable tbody');
      if (!/No problems match/.test(empty)) throw new Error(empty);
      await page.fill('#problem-search', '');
    });
    await t.check('pages: the playground runs code', async () => {
      await goto(page, 'playground');
      await page.waitForSelector('.editor-host');
      await page.evaluate(() => {
        const cmEl = document.querySelector('.editor-host .CodeMirror');
        if (cmEl) cmEl.CodeMirror.setValue('print(sum(range(5)))\n');
        else document.querySelector('.editor-host textarea').value = 'print(sum(range(5)))\n';
      });
      await page.click('.work-bar .btn.primary');
      await page.waitForFunction(() => /finished|error/.test((document.querySelector('.work-out .out-foot') || {}).textContent || ''), null, { timeout: 60000 });
      const text = await page.textContent('.work-out .stdout');
      if (text.trim() !== '10') throw new Error(text);
    });
    await t.check('pages: a cheat-sheet template loads into the playground and runs', async () => {
      await page.selectOption('#play-template', { label: 'Two pointers' });
      const code = await page.evaluate(() => {
        const cmEl = document.querySelector('.editor-host .CodeMirror');
        return cmEl ? cmEl.CodeMirror.getValue() : document.querySelector('.editor-host textarea').value;
      });
      if (!/def pair_with_sum/.test(code)) throw new Error(code.slice(0, 80));
      await page.click('.work-bar .btn.primary');
      await page.waitForFunction(() => /finished|error/.test((document.querySelector('.work-out .out-foot') || {}).textContent || ''), null, { timeout: 60000 });
      const text = await page.textContent('.work-out .stdout');
      if (text.trim() !== '(2, 4)') throw new Error(text);
    });
    await t.check('pages: the cheat sheet shows its cards, links and highlighted templates', async () => {
      await goto(page, 'patterns');
      await page.waitForSelector('.sheet-card');
      const [cards, links, hl] = await page.evaluate(() => [document.querySelectorAll('.sheet-card').length,
        document.querySelectorAll('.sheet-card a[href^="#p"]').length, document.querySelectorAll('.sheet-card pre.code code[data-hl]').length]);
      if (cards < 20 || links < 40 || hl < 20) throw new Error(`${cards} cards, ${links} problem links, ${hl} highlighted blocks`);
    });
    await t.check('pages: the complexity reference shows its tables with growth chips', async () => {
      await goto(page, 'complexity');
      await page.waitForSelector('.prose table');
      const [tables, chips] = await page.evaluate(() => [document.querySelectorAll('.prose table').length, document.querySelectorAll('.prose table .bigo').length]);
      if (tables < 8 || chips < 60) throw new Error(`${tables} tables, ${chips} chips`);
    });
    await goto(page, 'playground');
    await page.waitForSelector('.editor-host');
    await t.check('pages: a stack overflow in the playground is explained, and Python comes back', async () => {
      const before = env.errors.length;
      await page.evaluate(() => {
        const src = 'def d(k):\n    return 0 if k == 0 else 1 + max(d(j) for j in (k - 1,))\nprint(d(3000))\n';
        const cmEl = document.querySelector('.editor-host .CodeMirror');
        if (cmEl) cmEl.CodeMirror.setValue(src);
        else document.querySelector('.editor-host textarea').value = src;
      });
      await page.click('.work-bar .btn.primary');
      await page.waitForSelector('.work-out .crash', { timeout: 60000 });
      const msg = await page.textContent('.work-out .crash');
      if (!/stack overflowed/.test(msg)) throw new Error(msg);
      await page.waitForFunction(() => /ready again/.test((document.querySelector('.work-out .restart-note') || {}).textContent || ''), null, { timeout: 60000 });
      const r = await page.evaluate(() => window.SA.py.call('exec', { code: 'print("back")' }));
      if (r.stdout !== 'back\n') throw new Error(JSON.stringify(r));
      // Pyodide logs the crash this check causes on purpose; other console errors still count.
      const expected = /Pyodide has suffered a fatal error|The cause of the fatal error|Maximum call stack size exceeded|too much recursion|Pyodide already fatally failed|^JSHandle@object$/;
      const later = env.errors.splice(before).filter((e) => !expected.test(e));
      env.errors.push(...later);
    });
    await t.check('pages: the pattern drill grades an answer and moves on', async () => {
      await goto(page, 'drill');
      await page.waitForSelector('.drill-card .quiz-opt');
      const before = await page.textContent('.drill-task');
      await page.keyboard.press('1');
      await page.waitForSelector('.drill-feedback:not([hidden])');
      const marked = await page.evaluate(() => document.querySelectorAll('.drill-card .quiz-opt.correct').length);
      const score = await page.textContent('.drill-score');
      await page.click('.drill-actions .btn.primary');
      await page.waitForFunction((b) => document.querySelector('.drill-task').textContent !== b && !document.querySelector('.drill-feedback:not([hidden])'), before);
      if (marked !== 1 || !/^[01] of 1 this session/.test(score)) throw new Error(`${marked} correct marks; ${score}`);
    });
    await t.check('pages: Where to focus points at a topic the evidence says is weak', async () => {
      await page.evaluate(() => { window.SA.store.state.drill.graphs = [4, 0]; window.SA.store.saveNow(); });
      await goto(page, 'home');
      await page.waitForSelector('.focus-card');
      const text = await page.textContent('.focus-grid');
      if (!/Graphs/.test(text) || !/drill: recognised 0 of 4/.test(text)) throw new Error(text.slice(0, 200));
    });
    await t.check('pages: no touch keys on a desktop', async () => {
      await goto(page, 'playground');
      await page.waitForSelector('.editor-host .CodeMirror');
      await page.click('.editor-host .CodeMirror-line');
      await page.waitForTimeout(300);
      if (await page.evaluate(() => { const k = document.querySelector('.keybar'); return !!k && !k.hidden; })) throw new Error('the key bar showed without a touchscreen');
    });
    await t.check('pages: a progress code moves progress after storage is cleared', async () => {
      await page.evaluate(() => {
        window.SA.store.state.solved[167] = Date.now();
        window.SA.store.saveNow();
      });
      await goto(page, 'home');
      await page.click('button:has-text("Copy progress code")');
      const code = await page.inputValue('#progress-code');
      if (!code.startsWith('SA1:')) throw new Error(code.slice(0, 20));
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await booted(page);
      const before = await page.evaluate(() => Object.keys(window.SA.store.state.solved).length);
      await page.fill('#progress-code', code);
      await page.click('button:has-text("Import")');
      await page.waitForFunction(() => /Imported 1 solved/.test(document.querySelector('.progress-io .msg').textContent), null, { timeout: 5000 });
      const after = await page.evaluate(() => Object.keys(window.SA.store.state.solved).length);
      if (before !== 0 || after !== 1) throw new Error(`before ${before}, after ${after}`);
    });
  },

  // Flashcards: study a module by keyboard, add and finish modules, follow a card to its source, keep the schedule
  // across a reload, and reset it. Starts from empty storage.
  async flashcards(page, t) {
    const pick = () => page.evaluate(() => {
      const cards = window.SA.course.cards || [];
      const has = (id) => cards.some((c) => c.module === id && c.kind === 'gotcha');
      const ids = window.SA.modules.map((m) => m.id).filter(has);
      return { study: ids.includes('binary-search') ? 'binary-search' : ids[0], other: ids.find((id) => id !== 'binary-search' && id !== ids[0]) || ids[1] };
    });
    const records = () => page.evaluate(() => Object.entries(window.SA.store.state.flashCards).filter(([, r]) => window.Flashcards.valid(r)).length);
    let mods;
    await t.check('flashcards: an empty deck says how to fill it', async () => {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await booted(page);
      mods = await pick();
      await goto(page, 'flashcards');
      const h = (await page.textContent('.fc-done h2')).trim();
      if (h !== 'Your deck is empty') throw new Error(h);
    });
    await t.check('flashcards: a module\'s "N flashcards" link studies that module and adds it to the deck', async () => {
      await goto(page, mods.study);
      const label = await page.textContent('.meta-link');
      if (!/^\d+ flashcards?$/.test(label.trim())) throw new Error(label);
      await page.click('.meta-link');
      await page.waitForSelector('.fc-card .fc-show');
      const [deck, filter] = await page.evaluate(() => [window.SA.store.state.flashDeck, document.getElementById('fc-filter').value]);
      if (!(deck[mods.study] > 0) || filter !== mods.study) throw new Error(JSON.stringify({ deck, filter }));
    });
    await t.check('flashcards: Space shows the answer to screen readers, 2 rates it, focus moves to the next card', async () => {
      await page.evaluate(() => document.getElementById('main').focus());
      await page.keyboard.press('Space');
      await page.waitForSelector('.fc-back .fc-back-body');
      const after = await page.evaluate(() => {
        const back = document.querySelector('.fc-back');
        const rate = document.querySelector('.fc-rate').getBoundingClientRect();
        return { live: back.getAttribute('aria-live'), text: back.textContent.length, focus: document.activeElement.className, visible: rate.top >= 0 && rate.bottom <= window.innerHeight + 1 };
      });
      if (after.live !== 'polite' || after.text < 10 || after.focus !== 'fc-card') throw new Error(JSON.stringify(after));
      await page.waitForFunction(() => { const r = document.querySelector('.fc-rate').getBoundingClientRect(); return r.bottom <= window.innerHeight + 1; }, null, { timeout: 3000 });
      await page.keyboard.press('2');
      await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('fc-show'), null, { timeout: 3000 });
      const rec = await page.evaluate(() => Object.values(window.SA.store.state.flashCards)[0]);
      if ((await records()) !== 1 || rec[0] !== 1) throw new Error(JSON.stringify(rec));
    });
    await t.check('flashcards: keys typed in the deck filter do not rate a card', async () => {
      await page.keyboard.press('Space');  // on the focused Show answer button
      await page.waitForSelector('.fc-rate');
      await page.focus('#fc-filter');
      await page.keyboard.press('3');
      await page.waitForTimeout(150);
      if ((await records()) !== 1) throw new Error('a key in the filter rated the card');
      await page.click('.fc-rate .fc-good');
      await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('fc-show'), null, { timeout: 3000 });
      if ((await records()) !== 2) throw new Error('clicking Good did not rate the card');
    });
    await t.check('flashcards: "Add to deck" and "Mark as finished" both bring a module\'s cards in', async () => {
      const add = await page.evaluate(() => [...document.querySelectorAll('.fc-deck li:not(.on)')].map((li) => li.dataset.module).find(Boolean));
      await page.click(`.fc-deck li[data-module="${add}"] button:has-text("Add to deck")`);
      await page.waitForSelector(`.fc-deck li.on[data-module="${add}"]`);
      await goto(page, mods.other);
      await page.click('button:has-text("Mark as finished")');
      const deck = await page.evaluate(() => window.SA.store.state.flashDeck);
      if (!(deck[add] > 0) || !(deck[mods.other] > 0)) throw new Error(JSON.stringify(deck));
    });
    await t.check('flashcards: the schedule survives a reload, and the home page shows what is due', async () => {
      await page.waitForTimeout(400);  // the store saves after 250 ms
      await page.reload();
      await booted(page);
      if ((await records()) !== 2) throw new Error(`${await records()} schedules after the reload`);
      await goto(page, 'home');
      const label = await page.textContent('.section-head a[href="#flashcards"]');
      if (!/^Flashcards · \d+ due today$/.test(label.trim())) throw new Error(label);
    });
    await t.check('flashcards: "Open in the module" goes to the card\'s source and marks it', async () => {
      await goto(page, `flashcards.${mods.study}`);
      await page.click('.fc-show');
      const href = await page.getAttribute('.fc-src a', 'href');
      await page.click('.fc-src a');
      await page.waitForFunction((h) => location.hash === h, href);
      const id = href.slice(1);
      await page.waitForFunction((x) => { const n = document.getElementById(x); return n && n.classList.contains('target-flash'); }, id, { timeout: 3000 });
      const box = await page.evaluate((x) => { const r = document.getElementById(x).getBoundingClientRect(); return [r.top, r.bottom, window.innerHeight]; }, id);
      if (box[1] < 0 || box[0] > box[2]) throw new Error(`${id} is off screen: ${box}`);
    });
    await t.check('flashcards: reset needs a second click and keeps the deck', async () => {
      await goto(page, 'flashcards');
      await page.click('.fc-reset');
      if (!/Click again to reset 2 cards/.test(await page.textContent('.fc-reset'))) throw new Error(await page.textContent('.fc-reset'));
      await page.keyboard.press('Escape');
      if (!/^Reset schedule$/.test((await page.textContent('.fc-reset')).trim()) || (await records()) !== 2) throw new Error('Escape did not disarm the reset');
      await page.click('.fc-reset');
      await page.click('.fc-reset');
      const deck = await page.evaluate(() => Object.values(window.SA.store.state.flashDeck).filter((v) => v > 0).length);
      if ((await records()) !== 0 || deck < 3) throw new Error(`${await records()} schedules, ${deck} modules in the deck`);
      if (!(await page.evaluate(() => document.activeElement.classList.contains('fc-reset')))) throw new Error('focus left the reset button');
    });
  },

  // A phone with a touchscreen: the bar of Python keys above the on-screen keyboard (SA.keybar).
  async mobile(page, t, env) {
    const descriptor = { chromium: 'Pixel 7', webkit: 'iPhone 13' }[env.engine];
    const name = 'mobile: Python keys appear above the keyboard and type into the editor';
    if (!descriptor) {
      t.skip(name, `Playwright can't emulate a phone in ${env.engine}`);
      return;
    }
    const ctx = await env.browser.newContext({ ...devices[descriptor] });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => env.errors.push(String(e)));
    try {
      await t.check(name, async () => {
        await p.goto(env.url);
        await booted(p);
        await goto(p, 'p167');
        await p.waitForSelector('.editor-host .CodeMirror');
        await p.evaluate(() => document.querySelector('.editor-host .CodeMirror').CodeMirror.setValue('x'));
        await p.tap('.editor-host .CodeMirror-line');
        await p.evaluate(() => document.querySelector('.editor-host .CodeMirror').CodeMirror.setCursor({ line: 0, ch: 1 }));
        await p.waitForSelector('.keybar:not([hidden])');
        for (const k of ['Equals', 'Square brackets', 'Cursor right', 'Colon', 'Indent']) await p.tap(`.keybar [aria-label="${k}"]`);
        const v = await p.evaluate(() => document.querySelector('.editor-host .CodeMirror').CodeMirror.getValue());
        if (v !== 'x=[]:    ') throw new Error(`editor holds ${JSON.stringify(v)}`);
        const gap = await p.evaluate(() => Math.round((window.visualViewport ? visualViewport.height : innerHeight) - document.querySelector('.keybar').getBoundingClientRect().bottom));
        if (Math.abs(gap) > 1) throw new Error(`the bar sits ${gap} px off the bottom of the visible area`);
        await p.tap('.keybar [aria-label="Hide the keyboard"]');
        await p.waitForSelector('.keybar', { state: 'hidden' });
      });
    } finally {
      await ctx.close();
    }
  },

  async runtime(page, t) {
    await t.check('runtime: Python starts', async () => {
      const s = await page.evaluate(() => window.SA.py.ensure().then(() => window.SA.py.state), null);
      if (s !== 'ready') throw new Error(`state ${s}`);
    });
    await t.check('runtime: runs code', async () => {
      const r = await page.evaluate(() => window.SA.py.call('exec', { code: 'print(1 + 1)' }));
      if (r.stdout !== '2\n') throw new Error(JSON.stringify(r));
    });
    await t.check('runtime: stops an infinite loop', async () => {
      const r = await page.evaluate(() => window.SA.py.call('exec', { code: 'while True:\n    pass', limit_ms: 500 }));
      if (!r.timeout) throw new Error(JSON.stringify(r));
    });
    await t.check('runtime: restarts and runs again', async () => {
      const r = await page.evaluate(() => window.SA.py.call('exec', { code: 'print("again")' }));
      if (r.stdout !== 'again\n') throw new Error(JSON.stringify(r));
    });
    await t.check('runtime: a start that stalls is stopped, and the next call starts Python afresh', async () => {
      const r = await page.evaluate(async () => {
        const py = window.SA.py;
        const normal = py.bootLimitMs;
        py.bootLimitMs = 1;  // no Worker can start Python that fast
        const stopped = await py.call('exec', { code: 'while True:\n    pass', limit_ms: 300 });  // forces a restart
        const stalled = await py.call('exec', { code: 'print("never")' });
        py.bootLimitMs = normal;
        const after = await py.call('exec', { code: 'print("fresh")' });
        return { stopped, stalled, after, state: py.state };
      });
      if (!r.stopped.timeout || !r.stalled.unavailable || !/didn't finish starting/.test(r.stalled.error) || r.after.stdout !== 'fresh\n' || r.state !== 'ready') {
        throw new Error(JSON.stringify(r).slice(0, 400));
      }
    });
    // The Worker's native stack is small (Safari's especially); see harness.py.
    await t.check('runtime: deep recursion, deep caches and long chains stay off the native stack', async () => {
      const code = [
        'from functools import cache',
        '@cache',
        'def f(k):',
        '    return 0 if k == 0 else f(k - 1) + 1',
        'print(f(20000))',
        'class N:',
        '    def __init__(self, nxt):',
        '        self.nxt = nxt',
        'head = None',
        'for _ in range(30000):',
        '    head = N(head)',
      ].join('\n');
      const r = await page.evaluate((c) => window.SA.py.call('exec', { code: c }), code);
      if (r.stdout !== '20000\n') throw new Error(JSON.stringify(r).slice(0, 400));
      const deep = await page.evaluate(() => window.SA.py.call('exec', { code: 'def r(k):\n    return r(k + 1)\nr(0)' }));
      if (!deep.error || deep.error.type !== 'RecursionError') throw new Error(JSON.stringify(deep).slice(0, 400));
    });
  },
};

async function launch(name) {
  if (name === 'chromium') return chromium.launch({ executablePath: CHROMIUM, headless: true });
  if (name === 'webkit') return webkit.launch({ headless: true });
  if (name === 'firefox') return firefox.launch({ headless: true });
  throw new Error(`unknown engine ${name}`);
}

async function main() {
  if (!fs.existsSync(PAGE)) throw new Error(`${PAGE} does not exist; run npm run build first`);
  const scenarios = SCENARIO_LIST.includes('full') ? ['runtime', 'shell', 'pages', 'flashcards', 'contrast', 'nojs', 'sweep', 'module', 'problem', 'mobile'] : SCENARIO_LIST;
  for (const s of scenarios) if (!SCENARIOS[s]) throw new Error(`unknown scenario ${s}`);
  const server = await startServer(REPO, 0);
  const port = server.address().port;
  const urls = {
    file: pathToFileURL(PAGE).href,
    serve: `http://localhost:${port}/${path.relative(REPO, PAGE).split(path.sep).join('/')}`,
    artifact: `http://localhost:${port}/artifact?src=${encodeURIComponent(path.relative(REPO, ARTIFACT).split(path.sep).join('/'))}`,
  };
  if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });
  try {
    for (const engine of ENGINES) {
      let browser;
      try {
        browser = await launch(engine);
      } catch (e) {
        results.push({ engine, target: '-', name: 'launch', ok: null, detail: `not run: ${String(e.message).split('\n')[0]}` });
        continue;
      }
      for (const target of TARGETS) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();
        page.setDefaultTimeout(90000);
        const requests = [];
        const errors = [];
        page.on('request', (r) => requests.push(r.url()));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('pageerror', (e) => errors.push(String(e)));
        const t = makeTester(engine, target, page);
        const env = { engine, target, url: urls[target], context, browser, page, requests, errors, only: ONLY, shots: SHOTS, shotDir: SHOT_DIR };
        await t.check('boots', async () => {
          await page.goto(urls[target]);
          await page.waitForFunction(() => window.SA && window.SA.booted, null, { timeout: 60000 });
        });
        for (const s of scenarios) {
          if (s === 'problem') {
            const have = await page.evaluate(() => Object.keys(window.SA.problems).map(Number));
            const want = ONLY ? [...ONLY].filter((x) => /^\d+$/.test(x)).map(Number) : SAMPLE_PROBLEMS;
            for (const id of want.filter((x) => have.includes(x))) await SCENARIOS.problem(page, t, { ...env, problemId: id });
          } else if (s === 'module') {
            const have = await page.evaluate(() => window.SA.modules.map((m) => m.id));
            const want = ONLY ? [...ONLY].filter((x) => !/^\d+$/.test(x)) : have;
            for (const id of want.filter((x) => have.includes(x))) await SCENARIOS.module(page, t, { ...env, moduleId: id });
          } else await SCENARIOS[s](page, t, env);
        }
        if (SHOTS && target !== 'serve') await shots(page, engine, target);
        await t.check('no network requests outside the allowlist', async () => {
          const bad = requests.filter((u) => !ALLOWED.some((re) => re.test(u)));
          if (bad.length) throw new Error(bad.slice(0, 3).join(', '));
        });
        await t.check('no console errors', async () => {
          const real = errors.filter((e) => !/favicon/.test(e));
          if (real.length) throw new Error(real.slice(0, 3).join(' | '));
        });
        await context.close();
      }
      await browser.close();
    }
  } finally {
    server.close();
  }
  const pass = results.filter((r) => r.ok === true).length;
  const fail = results.filter((r) => r.ok === false);
  const skipped = results.filter((r) => r.ok === null);
  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const mark = r.ok === true ? 'PASS' : r.ok === false ? 'FAIL' : 'SKIP';
    console.log(`${mark}  ${r.engine.padEnd(8)} ${r.target.padEnd(8)} ${r.name.padEnd(width)}${r.ms !== undefined ? ` ${String(r.ms).padStart(6)} ms` : ''}${r.detail ? `  ${r.detail}` : ''}`);
  }
  console.log(`\n${pass} passed, ${fail.length} failed, ${skipped.length} not run`);
  process.exitCode = fail.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
