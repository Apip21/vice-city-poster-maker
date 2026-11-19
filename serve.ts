// serve.ts — a small local preview server for the app (Node 22, stdlib only).
//
//   node serve.ts            → http://localhost:8080
//   node serve.ts --port 9000
//
// It serves only files inside app/, answers with the content types a static
// web app needs, and never serves anything outside that folder. It exists
// for trying the cover maker locally; it is not part of the entry.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function chosenPort(): number {
  const flag = process.argv.indexOf('--port');
  const value = flag === -1 ? 8080 : Number(process.argv[flag + 1]);
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : 8080;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  let pathPart: string;
  try {
    pathPart = decodeURIComponent(new URL(req.url ?? '/', 'http://preview.local').pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('bad request');
    return;
  }
  if (pathPart.endsWith('/')) pathPart += 'index.html';
  const target = resolve(appRoot, `.${pathPart}`);
  if (target !== appRoot && !target.startsWith(appRoot + sep)) {
    res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
    return;
  }
  let length: number;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('directory');
    length = info.size;
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': length,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
});

server.listen(chosenPort(), '127.0.0.1', () => {
  console.log(`Vice City Cover Maker preview: http://localhost:${chosenPort()}`);
});
