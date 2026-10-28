// Worker bootstrap. It is concatenated after pyodide.js and pyodide.asm.mjs (both patched) into one blob,
// so loadPyodide and self._createPyodideModule already exist here. Nothing is fetched: the page passes
// the compiled WebAssembly module and the standard library bytes in the init message.
let harness = null;
const BASE = 'https://pyodide.invalid/';
self.onmessage = async (e) => {
  const m = e.data;
  if (m.type === 'init') {
    try {
      const files = { [BASE + 'python_stdlib.zip']: m.stdlib, [BASE + 'pyodide.asm.wasm']: new Uint8Array(0) };
      self.fetch = async (url) => {
        const u = String(url && url.url ? url.url : url);
        if (u in files) return new Response(files[u], { headers: { 'Content-Type': u.endsWith('.wasm') ? 'application/wasm' : 'application/zip' } });
        throw new TypeError('This page works offline and does not load ' + u);
      };
      WebAssembly.instantiateStreaming = async (_response, imports) => ({ module: m.wasmModule, instance: await WebAssembly.instantiate(m.wasmModule, imports) });
      const py = await loadPyodide({ indexURL: BASE, lockFileContents: m.lock, createPyodideModule: self._createPyodideModule, stdLibURL: BASE + 'python_stdlib.zip' });
      py.FS.mkdirTree('/sa');
      for (const [name, src] of Object.entries(m.files)) py.FS.writeFile('/sa/' + name, src);
      py.runPython("import sys; sys.path.insert(0, '/sa')");
      harness = py.pyimport('harness');
      postMessage({ type: 'ready', version: py.runPython('import sys; sys.version.split()[0]') });
    } catch (err) {
      postMessage({ type: 'fatal', message: String((err && err.stack) || err) });
    }
    return;
  }
  if (m.type === 'call') {
    const emit = (json) => postMessage({ type: 'progress', id: m.id, data: json });
    try {
      postMessage({ type: 'result', id: m.id, data: harness.entry(m.fn, JSON.stringify(m.payload), emit) });
    } catch (err) {
      // A fatal error (such as a native stack overflow) leaves Pyodide unusable; the page replaces this Worker.
      // A JS stack overflow reads "Maximum call stack size exceeded" in Chrome and Safari, "too much recursion" in Firefox.
      const message = String((err && err.message) || err);
      const overflow = /call stack size|too much recursion/i.test(message);
      const fatal = Boolean(err && err.pyodide_fatal_error) || overflow || /fatal error|has suffered/i.test(message);
      postMessage({ type: 'result', id: m.id, error: message, fatal, stack: overflow });
    }
  }
};
