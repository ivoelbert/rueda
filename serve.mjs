// Static server for the deployed build: serves this folder on $PORT.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
};

http.createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(root, path.normalize(url));
  if (!file.startsWith(root) || url.split('/').some((s) => s.startsWith('.'))) return res.writeHead(404).end();
  try {
    if ((await stat(file)).isDirectory()) {
      if (!url.endsWith('/')) return res.writeHead(301, { Location: `${url}/` }).end();
      file = path.join(file, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(Number(process.env.PORT) || 8000, '0.0.0.0');
