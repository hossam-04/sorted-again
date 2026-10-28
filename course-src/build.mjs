// Assembles the single-file course from build/course.json, the template, the app scripts and the Python runtime.
//   node tools/compile.mjs && node build.mjs [--course build/course.x.json] [--out build/preview-x.html]
// Writes ../dsa-course.html (a standalone document) and build/artifact.html (body-only, for publishing).
// With --out, writes <out> and <out minus .html>.artifact.html instead, so parallel previews never collide.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeAssets, blobScripts } from './tools/pyodide-embed.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MAX_BYTES = 16 * 1024 * 1024;
const APP = ['lib/pyhl.js', 'lib/diff.js', 'lib/flashcards.js', ...fs.readdirSync(path.join(ROOT, 'template', 'js')).filter((f) => f.endsWith('.js')).sort().map((f) => `template/js/${f}`)];
const scriptSafe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const jsonSafe = (s) => s.replace(/</g, '\\u003c');

const assets = runtimeAssets();
const boot = read('template/worker.js');
if (/<\/script|<!--/i.test(boot)) throw new Error('template/worker.js must not contain </script or <!--');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
};
const course = fs.readFileSync(path.resolve(arg('--course') || path.join(ROOT, 'build', 'course.json')), 'utf8');
const OUT = arg('--out') ? path.resolve(arg('--out')) : path.join(ROOT, '..', 'dsa-course.html');
const OUT_ARTIFACT = arg('--out') ? OUT.replace(/\.html$/, '') + '.artifact.html' : path.join(ROOT, 'build', 'artifact.html');
// Function replacements: payloads contain `$` sequences that string replacement would interpret.
const page = read('template/page.html')
  .replace('/*{{CM_CSS}}*/', () => read('node_modules/codemirror/lib/codemirror.css'))
  .replace('/*{{STYLES}}*/', () => read('template/styles.css'))
  .replace('/*{{COURSE_JSON}}*/', () => jsonSafe(course))
  .replace('/*{{PY_FILES}}*/', () => jsonSafe(JSON.stringify({ 'harness.py': read('lib/harness.py'), 'tracer.py': read('lib/tracer.py'), 'stepper.py': read('lib/stepper.py') })))
  .replace('/*{{PY_LOCK}}*/', () => jsonSafe(JSON.stringify(assets.lock)))
  .replace('/*{{PY_BOOT}}*/', () => boot)
  .replace('/*{{APP}}*/', () => scriptSafe(APP.map(read).join('\n;\n')))
  .replace('<!--{{PY_BLOBS}}-->', () => blobScripts(assets));
if (/\{\{[A-Z_]+\}\}/.test(page)) throw new Error('unfilled template placeholder');
const [head, body] = page.split('<!--BODY-->');
const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head.trim()}
</head>
<body>
${body.trim()}
</body>
</html>
`;
const artifact = head.trim() + '\n' + body.trim() + '\n';
for (const [name, html] of [['dsa-course.html', standalone], ['artifact.html', artifact]]) {
  if (Buffer.byteLength(html) > MAX_BYTES) throw new Error(`${name} is ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB, over the 16 MB limit`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.mkdirSync(path.dirname(OUT_ARTIFACT), { recursive: true });
fs.writeFileSync(OUT, standalone);
fs.writeFileSync(OUT_ARTIFACT, artifact);
const mb = (s) => (Buffer.byteLength(s) / 1048576).toFixed(2) + ' MB';
console.log(`${path.relative(process.cwd(), OUT)} ${mb(standalone)} (course data ${mb(course)}, runtime ${mb(blobScripts(assets))})`);
