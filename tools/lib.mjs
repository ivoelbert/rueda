// Shared by the tools: a static server for the game, a headless browser, the
// game at another git commit, and the list of scenarios (one per move).
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

// Serves dir on a free localhost port.
export function serve(dir) {
  const server = http.createServer(async (req, res) => {
    let file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (file.endsWith(path.sep)) file = path.join(file, 'index.html');
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}

// The repo as it is at a git commit, in a temporary directory.
export async function checkout(ref) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rueda-'));
  const tar = execFileSync('git', ['archive', '--format=tar', ref], { cwd: ROOT, maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  return dir;
}

// Playwright's Chromium, or else an installed Google Chrome.
export async function launch() {
  try {
    return await chromium.launch();
  } catch {
    try {
      return await chromium.launch({ channel: 'chrome' });
    } catch {
      throw new Error('No browser for the tools: run `npx playwright install chromium` once.');
    }
  }
}

// The guapea page with a query, its clock stopped (?beat) so it doesn't play
// on by itself. page.errors collects the page's errors.
export async function open(browser, base, query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.goto(`${base}/guapea/?beat=0&${query}`);
  await page.waitForFunction(() => window.rueda);
  return page;
}

// One scenario per move in the library: the calls that dance it and the
// beats they cover, from the 7 before the first. A move called from arriba
// or from adentro y afuera comes after the calls that get the rueda there,
// each with a bar of its loop; a move that leaves the rueda in arriba or
// adentro y afuera gets a bar of its loop and a dile que no after it.
export const scenarios = (page) => page.evaluate(() => {
  const M = window.rueda.moves, out = [{ id: 'guapea', call: '', from: 0, to: 16 }];
  for (const [id, mv] of Object.entries(M)) {
    const calls = [];
    let at = 1;
    const add = (k) => { calls.push(`${k}@${at}`); at += M[k].bars.length + (M[k].loop ? 1 : 0); };
    const from = [mv.from ?? 'guapea'].flat()[0];
    if (from !== 'guapea') add('arriba');
    if (from === 'adentro') add('adentro');
    add(id);
    if (mv.to) { calls.push(`dilequeno@${at}`); at++; }
    out.push({ id, call: calls.join(','), from: 6, to: at * 8 + 2 });
  }
  return out;
});
