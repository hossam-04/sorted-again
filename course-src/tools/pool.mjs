// A pool of Pyodide worker threads with the page's watchdog: a call dies when the limit announced by its
// latest progress event runs out, and its thread is replaced. Used by tools/compile.mjs.
import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const THREAD = path.join(ROOT, 'tools', 'pool-thread.mjs');
const SLACK_MS = 250;
// The page runs Python in a Web Worker, and Safari gives workers a small native stack: about 100 levels of
// recursion through C code (functools.cache, max(generator)...) or a few hundred objects freed in one chain.
// With this V8 stack size Node overflows at the same depths, so content that would crash Safari fails the build.
export const BROWSER_STACK_MB = 0.3;

export function harnessFiles() {
  const lib = (f) => fs.readFileSync(path.join(ROOT, 'lib', f), 'utf8');
  return { 'harness.py': lib('harness.py'), 'tracer.py': lib('tracer.py'), 'stepper.py': lib('stepper.py') };
}

class Slot {
  constructor(files, stackSizeMb) {
    this.files = files;
    this.stackSizeMb = stackSizeMb;
    this.spawn();
  }

  spawn() {
    this.worker = new Worker(THREAD, { workerData: { files: this.files }, resourceLimits: { stackSizeMb: this.stackSizeMb } });
    this.ready = new Promise((resolve, reject) => {
      const onMsg = (m) => {
        if (m.type === 'ready') {
          this.worker.off('message', onMsg);
          resolve();
        }
      };
      this.worker.on('message', onMsg);
      this.worker.once('error', reject);
    });
  }

  async call(fn, payload, opts = {}) {
    await this.ready;
    const defaultLimitMs = opts.defaultLimitMs || 10000;
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      const worker = this.worker;
      let timer = null;
      let last = null;
      const arm = (ms) => {
        clearTimeout(timer);
        timer = setTimeout(onTimeout, ms + SLACK_MS);
      };
      const cleanup = () => {
        clearTimeout(timer);
        worker.off('message', onMsg);
        worker.off('error', onErr);
      };
      const onTimeout = () => {
        cleanup();
        worker.terminate();
        this.spawn();
        resolve({ timeout: true, last });
      };
      const onErr = (err) => {
        cleanup();
        this.spawn();
        resolve({ crashed: true, error: String((err && err.message) || err), last });
      };
      const onMsg = (m) => {
        if (m.id !== id) return;
        if (m.type === 'progress') {
          last = JSON.parse(m.data);
          if (last.event === 'start' || last.event === 'prepare') arm(last.limit_ms);
          else if (last.event === 'end') arm(defaultLimitMs);
          if (opts.onProgress) opts.onProgress(last);
        } else if (m.type === 'result') {
          cleanup();
          if (m.fatal) {
            worker.terminate();
            this.spawn();
          }
          resolve(m.error ? { error: m.error, crashed: m.fatal, stack: m.stack } : JSON.parse(m.data));
        }
      };
      worker.on('message', onMsg);
      worker.once('error', onErr);
      arm(defaultLimitMs);
      worker.postMessage({ type: 'call', id, fn, payload });
    });
  }

  close() {
    return this.worker.terminate();
  }
}

export class PyPool {
  constructor({ size = Math.max(1, Math.min(8, os.cpus().length - 1)), files = harnessFiles(), stackSizeMb = BROWSER_STACK_MB } = {}) {
    this.slots = Array.from({ length: size }, () => new Slot(files, stackSizeMb));
    this.free = [...this.slots];
    this.waiting = [];
  }

  acquire() {
    if (this.free.length) return Promise.resolve(this.free.pop());
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  release(slot) {
    const next = this.waiting.shift();
    if (next) next(slot);
    else this.free.push(slot);
  }

  async call(fn, payload, opts) {
    return this.session((call) => call(fn, payload, opts));
  }

  async session(work) {
    const slot = await this.acquire();
    try {
      return await work((fn, payload, opts) => slot.call(fn, payload, opts));
    } finally {
      this.release(slot);
    }
  }

  async close() {
    await Promise.all(this.slots.map((s) => s.close()));
  }
}
