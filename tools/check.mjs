// npm run check [-- --against <git ref>] [--only <move>,<move>] [--query <url options>]
//
// Dances every move in the library in a headless browser (one scenario per
// move, see scenarios() in lib.mjs) and reports for each:
//   jump    the biggest change from one 0.05-beat step to the next of any
//           pelvis (px), hand (px) or heading (degrees), so a snap shows up
//   slide   how far planted feet slide: px per foot per beat, and the worst step
//   close   the closest any two pelvises come (px), so dancers running into
//           each other show up
//   errors  anything the page threw
// A number past LIMITS is marked with ! and makes it exit with 1. They sit a
// little above the worst the moves had when the tools were added (the hands'
// worst, about 5 px, is on the dame's 1), so they catch a
// move getting worse rather than prove one looks right.
//
// --against dances the same scenarios at that git commit too and says which
// moves now dance differently, and from which beat: run it with HEAD before
// committing to see that a change only touches the moves it should.
// --query adds URL options, such as '&stand=1' or '&couples=3'.
import { rm } from 'node:fs/promises';
import { serve, checkout, launch, open, scenarios, ROOT } from './lib.mjs';

const LIMITS = { pelvis: 2.5, hand: 6, turn: 15, slide: 0.6, close: 4.5 };

const args = process.argv.slice(2), opt = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const against = opt('--against'), only = opt('--only')?.split(','), query = opt('--query') ?? '';

// Runs in the page: poses everyone every 0.05 beats from `from` to `to`.
function measure({ from, to }) {
  const r = window.rueda, all = [...r.leads(), ...r.follows()], STEP = 0.05, TAU = 2 * Math.PI;
  const tag = (d) => (d.lead ? 'L' : 'F') + d.k;
  const res = { pelvis: [0, ''], hand: [0, ''], turn: [0, ''], worst: [0, ''], close: [Infinity, ''], slide: 0, prints: [] };
  const top = (key, v, where) => { if (v > res[key][0]) res[key] = [v, where]; };
  const r2 = (v) => v.toFixed(2);
  let prev = null, slid = 0;
  const steps = Math.round((to - from) / STEP);
  for (let s = 0; s <= steps; s++) {
    const b = from + s * STEP, at = '@' + b.toFixed(2);
    r.pose(b);
    const now = all.map((d) => ({ d, B: d.pose }));
    let print = '';
    for (const { B } of now) print += [B.pelvis.x, B.pelvis.y, B.head.z, B.arms.O.hand.x, B.arms.O.hand.y, B.arms.O.hand.z, B.arms.I.hand.x, B.arms.I.hand.y, B.arms.I.hand.z, B.ankleO.x, B.ankleO.y, B.ankleI.x, B.ankleI.y, B.h].map(r2).join(',') + ';';
    let h = 0;
    for (let i = 0; i < print.length; i++) h = (h * 31 + print.charCodeAt(i)) | 0;
    res.prints.push(h);
    if (prev) now.forEach(({ d, B }, i) => {
      const A = prev[i].B, where = tag(d) + at;
      top('pelvis', Math.hypot(B.pelvis.x - A.pelvis.x, B.pelvis.y - A.pelvis.y), where);
      for (const n of ['O', 'I']) {
        const p = A.arms[n].hand, q = B.arms[n].hand;
        top('hand', Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z), where);
        const a = A['ankle' + n], c = B['ankle' + n];
        if (a.z < 1.45 && c.z < 1.45) { const m = Math.hypot(c.x - a.x, c.y - a.y); slid += m; top('worst', m, tag(d) + n + at); }
      }
      top('turn', Math.abs((((B.h - A.h + Math.PI) % TAU) + TAU) % TAU - Math.PI) * 180 / Math.PI, where);
    });
    for (let i = 0; i < now.length; i++) for (let j = i + 1; j < now.length; j++) {
      const a = now[i].B.pelvis, c = now[j].B.pelvis, dist = Math.hypot(a.x - c.x, a.y - c.y);
      if (dist < res.close[0]) res.close = [dist, tag(now[i].d) + '-' + tag(now[j].d) + at];
    }
    prev = now;
  }
  res.slide = slid / (all.length * 2) / (to - from);
  return res;
}

async function dance(browser, base, sc) {
  const page = await open(browser, base, (sc.call ? `call=${sc.call}` : '') + query);
  try {
    if (!(await page.evaluate(() => typeof window.rueda.pose === 'function'))) throw new Error('this version of the game has no rueda.pose(), which the tools need');
    // A move missing from this version would dance whatever is selected.
    const known = await page.evaluate((ids) => ids.every((id) => window.rueda.moves[id]), sc.call.split(',').filter(Boolean).map((c) => c.split('@')[0]));
    if (!known) return { missing: true };
    const res = await page.evaluate(measure, sc);
    res.errors = page.errors;
    return res;
  } catch (e) {
    return { errors: [...page.errors, e.message] };
  } finally {
    await page.close();
  }
}

const browser = await launch();
const here = await serve(ROOT);
const oldDir = against && (await checkout(against)), old = oldDir && (await serve(oldDir));
let failed = false;
try {
  const page = await open(browser, here.url, '');
  const all = (await scenarios(page)).filter((sc) => !only || only.includes(sc.id));
  await page.close();
  const pad = (s, n) => String(s).padEnd(n), num = (v, limit, below) => {
    const bad = below ? v < limit : v > limit;
    if (bad) failed = true;
    return pad(v.toFixed(2) + (bad ? '!' : ''), 8);
  };
  console.log(pad('move', 16) + pad('pelvis', 8) + pad('hand', 8) + pad('turn°', 8) + pad('slide', 8) + pad('close', 8) + (old ? 'vs ' + against : ''));
  for (const sc of all) {
    const r = await dance(browser, here.url, sc);
    let line = pad(sc.id, 16);
    if (r.pelvis) line += num(r.pelvis[0], LIMITS.pelvis) + num(r.hand[0], LIMITS.hand) + num(r.turn[0], LIMITS.turn) + num(r.slide, LIMITS.slide) + num(r.close[0], LIMITS.close, true);
    if (old && r.prints) {
      const o = await dance(browser, old.url, sc);
      const i = o.prints ? r.prints.findIndex((h, k) => h !== o.prints[k]) : -1;
      line += o.missing ? 'new' : !o.prints ? 'could not dance it there' : i < 0 ? 'same' : `changed from beat ${(sc.from + i * 0.05).toFixed(2)}`;
    }
    console.log(line);
    if (r.pelvis) console.log(pad('', 16) + `worst: pelvis ${r.pelvis[1]}, hand ${r.hand[1]}, turn ${r.turn[1]}, slide ${r.worst[0].toFixed(2)} ${r.worst[1]}, close ${r.close[1]}`);
    if (r.errors?.length) { failed = true; console.log(pad('', 16) + 'ERRORS: ' + r.errors.join(' | ')); }
  }
} finally {
  await browser.close();
  here.close();
  if (old) { old.close(); await rm(oldDir, { recursive: true }); }
}
process.exit(failed ? 1 : 0);
