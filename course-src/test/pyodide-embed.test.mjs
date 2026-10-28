import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { patchLoader, patchGlue, runtimeAssets, blobScripts } from '../tools/pyodide-embed.mjs';

test('loader patch disables the classic-worker refusal exactly once', () => {
  const { loader } = runtimeAssets();
  assert.match(loader, /function ge\(\)\{return!1\}/);
  assert.doesNotMatch(loader, /importScripts\("data:text\/javascript,"\)/);
  assert.throws(() => patchLoader('nothing to patch'), /expected 1 patch site/);
});

test('glue patch removes ESM syntax and still parses as a classic script', () => {
  const { glue } = runtimeAssets();
  assert.doesNotMatch(glue, /import\.meta/);
  assert.match(glue, /self\._createPyodideModule=_createPyodideModule;\s*$/);
  assert.doesNotThrow(() => new Function(glue));
  assert.throws(() => patchGlue('export default _createPyodideModule;'), /expected 3 patch site/);
});

test('blob scripts decode back to the original bytes', () => {
  const assets = runtimeAssets();
  const html = blobScripts(assets);
  const get = (id) => new RegExp(`<script type="application/octet-stream" id="${id}">([A-Za-z0-9+/=]+)</script>`).exec(html)[1];
  assert.equal(Buffer.from(get('py-loader'), 'base64').toString('utf8'), assets.loader);
  const wasm = zlib.gunzipSync(Buffer.from(get('py-wasm'), 'base64'));
  assert.deepEqual(wasm.subarray(0, 4), Buffer.from([0, 97, 115, 109]));
  assert.equal(wasm.length, assets.wasm.length);
  assert.equal(zlib.gunzipSync(Buffer.from(get('py-stdlib'), 'base64')).length, assets.stdlib.length);
  assert.equal(zlib.gunzipSync(Buffer.from(get('py-glue'), 'base64')).toString('utf8'), assets.glue);
});

test('lock file keeps only the info block', () => {
  const { lock } = runtimeAssets();
  assert.deepEqual(Object.keys(lock), ['info', 'packages']);
  assert.equal(lock.info.python, '3.14.2');
});
