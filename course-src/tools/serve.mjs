// Local preview server that reproduces the claude.ai artifact viewer's Content-Security-Policy
// (measured with a probe artifact on 2026-10-02).
//   node tools/serve.mjs <root-dir>     (PORT env var, default 4173)
// Routes:
//   /                      -> dsa-course.html (standalone page)
//   /artifact[?src=<path>] -> course-src/build/artifact.html (or <path>) inside the artifact viewer's skeleton
//   anything else          -> a static file under <root-dir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net/pyodide/ https://cdn.jsdelivr.net/gh/python-visualization/ https://cdn.jsdelivr.net/npm/ https://cdn.tailwindcss.com https://code.jquery.com https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  "form-action 'self'",
  "frame-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

// What the artifact viewer wraps around a published page (its head carries only these).
const SKELETON_HEAD = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}' +
  'body{margin:0;font:14px system-ui,sans-serif;background:#faf9f5}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

export function startServer(root, port = 0) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (status, type, body) => {
      res.writeHead(status, { 'Content-Type': type, 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store' });
      res.end(body);
    };
    if (url.pathname === '/favicon.ico') return send(204, 'image/x-icon', '');
    if (url.pathname === '/artifact') {
      const rel = url.searchParams.get('src') || 'course-src/build/artifact.html';
      const file = path.join(base, rel);
      if (!file.startsWith(base) || !fs.existsSync(file)) return send(404, 'text/plain', 'artifact not built');
      return send(200, TYPES['.html'], SKELETON_HEAD + fs.readFileSync(file, 'utf8') + '</body></html>');
    }
    const rel = decodeURIComponent(url.pathname === '/' ? '/dsa-course.html' : url.pathname);
    const file = path.join(base, rel);
    if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(404, 'text/plain', 'not found');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] || '..';
  const server = await startServer(root, Number(process.env.PORT || 4173));
  console.log(`serving ${path.resolve(root)} on http://localhost:${server.address().port} (artifact CSP)`);
}
