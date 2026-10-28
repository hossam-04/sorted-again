// Worker thread: one Pyodide instance running lib/harness.py. Same message protocol as the page's Worker.
import { parentPort, workerData } from 'node:worker_threads';
import { loadPyodide } from 'pyodide';

const py = await loadPyodide();
py.FS.mkdirTree('/sa');
for (const [name, src] of Object.entries(workerData.files)) py.FS.writeFile(`/sa/${name}`, src);
py.runPython("import sys; sys.path.insert(0, '/sa')");
const harness = py.pyimport('harness');
parentPort.postMessage({ type: 'ready' });
parentPort.on('message', (m) => {
  if (m.type !== 'call') return;
  const emit = (json) => parentPort.postMessage({ type: 'progress', id: m.id, data: json });
  try {
    parentPort.postMessage({ type: 'result', id: m.id, data: harness.entry(m.fn, JSON.stringify(m.payload), emit) });
  } catch (err) {
    const message = String((err && err.message) || err);
    // A Pyodide fatal error (such as a native stack overflow) leaves the runtime unusable.
    const fatal = Boolean(err && err.pyodide_fatal_error) || /call stack size|fatal error|has suffered/i.test(message);
    parentPort.postMessage({ type: 'result', id: m.id, error: message, fatal, stack: /call stack size/i.test(message) });
  }
});
