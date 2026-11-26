// npm run strip -- <out.png> <calls> <couple> <beat> [<beat> ...] [--all] [--query <url options>]
//
// Pictures of one couple at the given beats, side by side, each labeled with
// its count: lead number <couple> and the girl nearest him, drawn alone
// (--all draws everyone), cropped around him and scaled up. <calls> is what
// ?call= takes ('' for the guapea), so for the setenta corrido's walk round:
//   npm run strip -- corrido.png setentacorrido 2 15 16 17 18 19 20 21 22 23 24
// --query adds URL options, such as '&stand=1'.
import { writeFile } from 'node:fs/promises';
import { serve, launch, open, ROOT } from './lib.mjs';

const args = process.argv.slice(2), flags = { all: false, query: '' }, pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--all') flags.all = true;
  else if (args[i] === '--query') flags.query = args[++i];
  else pos.push(args[i]);
}
const [out, calls, couple, ...beats] = pos;
if (!beats.length) {
  console.error('usage: npm run strip -- <out.png> <calls> <couple> <beat> [<beat> ...] [--all] [--query <url options>]');
  process.exit(2);
}

// Runs in the page.
async function shoot({ beats, couple, all }) {
  const r = window.rueda, L = r.leads()[couple], SW = 60, SH = 66, K = 4, LAB = 34;
  const apart = (d) => Math.hypot(d.pose.pelvis.x - L.pose.pelvis.x, d.pose.pelvis.y - L.pose.pelvis.y);
  if (!all) r.only((d) => d === L || d === r.follows().reduce((a, c) => (apart(c) < apart(a) ? c : a)));
  const strip = document.createElement('canvas'), g = strip.getContext('2d'), screen = document.getElementById('screen');
  strip.width = beats.length * SW * K;
  strip.height = SH * K + LAB;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#222';
  g.fillRect(0, 0, strip.width, strip.height);
  g.textAlign = 'center';
  for (const [i, b] of beats.entries()) {
    r.seek(b);
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const c = r.proj(L.pose.pelvis), x = i * SW * K + (SW * K) / 2;
    g.drawImage(screen, Math.round(c.x - SW / 2), Math.round(c.y - SH / 2 - 4), SW, SH, i * SW * K, 0, SW * K, SH * K);
    g.fillStyle = '#fff';
    g.font = 'bold 16px monospace';
    g.fillText((((b % 8) + 8) % 8 + 1).toFixed(2).replace(/\.?0+$/, ''), x, SH * K + 16);
    g.fillStyle = '#999';
    g.font = '11px monospace';
    g.fillText(`beat ${b}`, x, SH * K + 30);
  }
  return strip.toDataURL('image/png');
}

const browser = await launch(), here = await serve(ROOT);
try {
  const page = await open(browser, here.url, (calls ? `call=${calls}` : '') + flags.query);
  const png = await page.evaluate(shoot, { beats: beats.map(Number), couple: Number(couple), all: flags.all });
  if (page.errors.length) console.error('page errors: ' + page.errors.join(' | '));
  await writeFile(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log(out);
} finally {
  await browser.close();
  here.close();
}
