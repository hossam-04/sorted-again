// SA.py: unpacks the embedded Python runtime once, runs harness calls in a Worker and enforces
// time limits by killing and replacing the Worker. Calls run one at a time.
(function (SA) {
  'use strict';
  const listeners = new Set();
  let state = 'idle', detail = '', assets = null, assetsPromise = null, slot = null, version = '';
  let queue = Promise.resolve();
  const setState = (s, d) => {
    state = s;
    detail = d || '';
    listeners.forEach((f) => { try { f(state, detail); } catch (e) { /* a broken listener must not stop Python */ } });
  };
  const domReady = () => new Promise((r) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r()));
  const text = (id) => {
    const node = document.getElementById(id);
    if (!node) throw new Error('This page is missing part of its Python runtime (' + id + ').');
    return node.textContent.trim();
  };
  function b64(s) {
    if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s);
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  async function gunzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function prepare() {
    if (!assetsPromise) {
      assetsPromise = (async () => {
        await domReady();
        if (typeof DecompressionStream !== 'function' || typeof WebAssembly !== 'object' || typeof Worker !== 'function') {
          throw new Error('This browser is too old to run Python here. Update it, or run the code on LeetCode.');
        }
        const loader = new TextDecoder().decode(b64(text('py-loader')));
        const glue = new TextDecoder().decode(await gunzip(b64(text('py-glue'))));
        const wasmModule = await WebAssembly.compile(await gunzip(b64(text('py-wasm'))));
        const stdlib = await gunzip(b64(text('py-stdlib')));
        const url = URL.createObjectURL(new Blob([loader, '\n;\n', glue, '\n;\n', text('py-boot')], { type: 'text/javascript' }));
        return { url, wasmModule, stdlib, files: JSON.parse(text('py-files')), lock: JSON.parse(text('py-lock')) };
      })();
      assetsPromise.catch(() => { assetsPromise = null; });
    }
    return assetsPromise;
  }
  // A Worker that hasn't started Python by then is stopped, so a stalled start can't hold up every later call;
  // the next call starts a fresh one.
  let bootLimitMs = 90000;
  function spawn() {
    const w = new Worker(assets.url);
    const ready = new Promise((resolve, reject) => {
      const stall = setTimeout(() => reject(new Error("Python didn't finish starting, so it was stopped. Run again to retry, or reload the page.")), bootLimitMs);
      w.onmessage = (e) => {
        if (e.data.type === 'ready') { clearTimeout(stall); version = e.data.version; resolve(); }
        else if (e.data.type === 'fatal') { clearTimeout(stall); reject(new Error(e.data.message)); }
      };
      w.onerror = (e) => { clearTimeout(stall); e.preventDefault(); reject(new Error(e.message || 'Python could not start in this browser.')); };
    });
    w.postMessage({ type: 'init', wasmModule: assets.wasmModule, stdlib: assets.stdlib.slice(), files: assets.files, lock: assets.lock });
    return { w, ready };
  }
  async function ensure() {
    if (slot) return slot.ready;
    if (state !== 'restarting') setState('loading');
    try {
      assets = assets || (await prepare());
      slot = spawn();
      await slot.ready;
      setState('ready', version);
    } catch (err) {
      if (slot) slot.w.terminate();
      slot = null;
      setState('error', String((err && err.message) || err));
      throw err;
    }
  }
  function kill() {
    if (slot) { slot.w.terminate(); slot = null; }
  }
  function call(fn, payload, opts) {
    const o = opts || {};
    const defaultLimit = o.defaultLimitMs || 10000;
    const run = () => new Promise((resolve) => {
      ensure().then(() => {
        const w = slot.w;
        const id = Math.random().toString(36).slice(2);
        let timer = null;
        let last = null;
        const arm = (ms) => { clearTimeout(timer); timer = setTimeout(onTimeout, ms + 300); };
        const done = (v) => { clearTimeout(timer); w.onmessage = null; w.onerror = null; resolve(v); };
        function restart() { kill(); setState('restarting'); ensure().catch(() => {}); }
        function onTimeout() { done({ timeout: true, last }); restart(); }
        w.onmessage = (e) => {
          const d = e.data;
          if (d.id !== id) return;
          if (d.type === 'progress') {
            last = JSON.parse(d.data);
            if (last.event === 'start' || last.event === 'prepare') arm(last.limit_ms);
            else if (last.event === 'end') arm(defaultLimit);
            if (o.onProgress) o.onProgress(last);
          } else if (d.type === 'result') {
            const fatal = Boolean(d.error) && (d.fatal || /fatal error|has suffered|call stack size|too much recursion/i.test(d.error));
            done(d.error ? { error: d.error, crashed: fatal, stack: Boolean(d.stack), last } : JSON.parse(d.data));
            if (fatal) restart();
          }
        };
        w.onerror = (e) => { e.preventDefault(); done({ crashed: true, error: e.message || 'Python stopped unexpectedly.' }); restart(); };
        arm(defaultLimit);
        w.postMessage({ type: 'call', id, fn, payload });
      }, (err) => resolve({ unavailable: true, error: String((err && err.message) || err) }));
    });
    queue = queue.then(run, run);
    return queue;
  }
  SA.py = {
    ensure, call,
    onState(f) { listeners.add(f); f(state, detail); return () => listeners.delete(f); },
    get state() { return state; },
    get version() { return version; },
    get bootLimitMs() { return bootLimitMs; },
    set bootLimitMs(ms) { bootLimitMs = ms; },  // tests shorten it to force a stalled start
  };
})(window.SA = window.SA || {});
