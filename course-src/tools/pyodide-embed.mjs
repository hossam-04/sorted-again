// Pyodide, prepared for a single-file page: patched to run in a classic Worker from one blob,
// then gzip+base64 encoded into inert <script> blocks. No runtime fetches: the page feeds every file itself.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

export const PYODIDE_VERSION = '314.0.7';
const require = createRequire(import.meta.url);
const DIR = path.dirname(require.resolve('pyodide/package.json'));

function patchExactly(src, from, to, count, label) {
  const found = src.split(from).length - 1;
  if (found !== count) throw new Error(`${label}: expected ${count} patch site(s), found ${found}`);
  return src.split(from).join(to);
}

// pyodide.js refuses classic Workers because it would import() its ES-module glue. We pass the glue in
// (createPyodideModule), so the refusal is moot. Chrome rejects blob module Workers on file:// pages.
export function patchLoader(src) {
  return patchExactly(src, 'function ge(){try{return globalThis.importScripts("data:text/javascript,"),!0}catch{return!1}}',
    'function ge(){return!1}', 1, 'isClassicWorker');
}

// pyodide.asm.mjs is an ES module; make it a classic script that publishes its factory on self.
export function patchGlue(src) {
  let out = patchExactly(src, 'import.meta.url', '"https://pyodide.invalid/pyodide.asm.mjs"', 3, 'import.meta.url');
  out = patchExactly(out, 'export default _createPyodideModule;', 'self._createPyodideModule=_createPyodideModule;', 1, 'export default');
  return out;
}

export function runtimeAssets() {
  const pkg = JSON.parse(fs.readFileSync(path.join(DIR, 'package.json'), 'utf8'));
  if (pkg.version !== PYODIDE_VERSION) throw new Error(`pyodide ${pkg.version} installed, ${PYODIDE_VERSION} required`);
  const lock = JSON.parse(fs.readFileSync(path.join(DIR, 'pyodide-lock.json'), 'utf8'));
  return {
    loader: patchLoader(fs.readFileSync(path.join(DIR, 'pyodide.js'), 'utf8')),
    glue: patchGlue(fs.readFileSync(path.join(DIR, 'pyodide.asm.mjs'), 'utf8')),
    wasm: fs.readFileSync(path.join(DIR, 'pyodide.asm.wasm')),
    stdlib: fs.readFileSync(path.join(DIR, 'python_stdlib.zip')),
    lock: { info: lock.info, packages: {} },
  };
}

const gz64 = (buf) => zlib.gzipSync(buf, { level: 9 }).toString('base64');
export function blobScripts(a) {
  const blobs = {
    'py-loader': Buffer.from(a.loader, 'utf8').toString('base64'),
    'py-glue': gz64(Buffer.from(a.glue, 'utf8')),
    'py-wasm': gz64(a.wasm),
    'py-stdlib': gz64(a.stdlib),
  };
  return Object.entries(blobs).map(([id, b]) => `<script type="application/octet-stream" id="${id}">${b}</script>`).join('\n');
}
