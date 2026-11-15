// RUEDA '86: a mid-80s sports coin-op (256x224). A bright side view of an
// open-air stage: the crowd in the bleachers bounces on the beat and cheers,
// a lamp scoreboard scrolls the calls, and the count runs on a meter below.
import { Arcade } from '../shared/arcade.js';
import { Sprites, drawDancer, shadow, hex, pack } from '../shared/sprite.js';
import { drawText, textWidth, centerText } from '../shared/font.js';
import { D, FIGURES, couplePose } from '../shared/dance.js';

const W = 256, H = 224, DEG = Math.PI / 180;
const EL = 28 * DEG, SE = Math.sin(EL), CE = Math.cos(EL);
const S = 40, CX = 128, CY = 166, RADIUS = 1.45, FLOOR_TOP = 62;

const K = { // NES-style palette
  black: '#000000', white: '#fcfcfc', grey: '#bcbcbc', dgrey: '#747474', sky: '#3cbcfc', sky2: '#a4e4fc', blue: '#0058f8', navy: '#0000a8',
  red: '#f83800', dred: '#a81000', yellow: '#f8d800', orange: '#e45c10', green: '#00a800', lgreen: '#58d854', amber: '#fca044', lamp: '#f8b800', lampOff: '#402000',
  wood: '#c87838', wood2: '#e09858', woodSeam: '#7c3c00', skin1: '#fcb890', skin2: '#c87838', skin3: '#8a4a18',
};
const R = { // two-tone ramps for sprites: [shadow, base]
  shirt: ['#bcbcbc', '#fcfcfc'], cream: ['#d8a870', '#fce0a8'], sky: ['#3c8cd8', '#a4e4fc'],
  navy: ['#0000a8', '#2848f0'], tan: ['#ac7c00', '#e4b458'], brown: ['#503000', '#885818'],
  skin1: ['#e09060', '#fcc8a0'], skin2: ['#a85c28', '#d88848'], skin3: ['#5c2c08', '#8c5020'],
  red: ['#a81000', '#f83800'], yellow: ['#c88800', '#f8d800'], teal: ['#008888', '#00d8c8'], purple: ['#6830b0', '#a868f0'],
  straw: ['#b88800', '#f8d878'], hair: ['#000000', '#402010'], shoe: ['#000000', '#402010'],
};
const LOOKS = [
  { lead: { skin: R.skin2, hair: R.hair, shirt: R.shirt, pants: R.navy, shoes: R.shoe, hat: R.straw, band: R.red }, follow: { skin: R.skin1, hair: R.hair, dress: R.red, hem: K.white, shoes: R.red, flower: R.yellow } },
  { lead: { skin: R.skin3, hair: R.hair, shirt: R.cream, pants: R.tan, shoes: R.shoe, hat: R.shirt, band: R.navy }, follow: { skin: R.skin2, hair: R.hair, dress: R.yellow, hem: K.white, shoes: R.yellow, flower: R.red } },
  { lead: { skin: R.skin1, hair: R.hair, shirt: R.sky, pants: R.navy, shoes: R.shoe, hat: R.straw, band: R.red }, follow: { skin: R.skin3, hair: R.hair, dress: R.teal, hem: K.white, shoes: R.teal, flower: R.red } },
  { lead: { skin: R.skin2, hair: R.hair, shirt: R.shirt, pants: R.brown, shoes: R.shoe, hat: R.straw, band: R.navy }, follow: { skin: R.skin1, hair: R.hair, dress: R.purple, hem: K.white, shoes: R.purple, flower: R.yellow } },
];
const NAMES = { lead: ['EL LÍDER', 'LEAD'], follow: ['LA REINA', 'FOLLOW'] };

const cam = {
  project: (p) => ({ x: CX + p.x * S, y: CY - (p.y * SE + p.z * CE) * S, s: S, depth: p.y * CE - p.z * SE }),
  toCam: () => ({ x: 0, y: -CE, z: SE }),
};
const FE = 6 * DEG;
const frontCam = (cx, cy, s, ox, oy) => ({
  project: (p) => ({ x: cx + (p.x - ox) * s, y: cy - ((p.y - oy) * Math.sin(FE) + p.z * Math.cos(FE)) * s, s, depth: (p.y - oy) * Math.cos(FE) - p.z * Math.sin(FE) }),
  toCam: () => ({ x: 0, y: -1, z: 0 }),
});
function solo(role, beat) {
  const m = ((beat % 8) + 8) % 8, t = m > 7.5 ? m - 8 : m;
  return couplePose(FIGURES.guapea, FIGURES.guapea, t, { ox: 0, oy: 0, rot: role === 'lead' ? 180 : 0 }, beat)[role];
}
const spr = new Sprites(W, H, Object.values(R), { outline: K.black, shade: 1 });
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ------------------------------------------------------------ background
const ADS = [['MAMBO', K.red, K.white], ['SON', K.white, K.blue], ['TIMBA', K.yellow, K.navy], ['CHA CHA', K.green, K.white], ['GUARACHA', K.blue, K.yellow], ['SALSA', K.white, K.red]];
const bg = (() => {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // Sky and bleachers.
  g.fillStyle = K.sky; g.fillRect(0, 12, W, 10);
  g.fillStyle = K.sky2; g.fillRect(0, 12, W, 3);
  for (let r = 0; r < 5; r++) { g.fillStyle = r % 2 ? K.dgrey : K.grey; g.fillRect(0, 22 + r * 6, W, 6); }
  // Ad boards on the barrier.
  g.fillStyle = K.black; g.fillRect(0, 52, W, 10);
  let x = 0, i = 0;
  while (x < W) {
    const [text, bgc, fg] = ADS[i++ % ADS.length], w = textWidth(text) + 10;
    g.fillStyle = bgc; g.fillRect(x + 1, 53, w - 2, 8);
    drawText(g, text, x + 5, 54, fg, 1, null);
    x += w;
  }
  const img = g.getImageData(0, 0, W, H), out = new Uint32Array(img.data.buffer);
  // Stage floor: planks along x, seen at the camera's elevation.
  const P = (h) => pack(hex(h));
  const seam = P(K.woodSeam), w1 = P(K.wood), w2 = P(K.wood2), paint = P(K.white), red = P(K.red);
  for (let y = FLOOR_TOP; y < 204; y++) {
    const gy = (CY - y) / (S * SE);
    for (let px = 0; px < W; px++) {
      const gx = (px - CX) / S, r = Math.hypot(gx, gy);
      const row = Math.floor(gy / 0.3), fy = gy / 0.3 - row;
      const fx = ((gx + (((row % 3) + 3) % 3) * 0.7) / 2.1) % 1;
      let v = hash(row, Math.floor((gx + (((row % 3) + 3) % 3) * 0.7) / 2.1)) > 0.5 ? w1 : w2;
      if (fy < 0.12 || Math.abs(fx) < 0.012) v = seam;
      if (Math.abs(r - (RADIUS - 0.45)) < 0.05 || Math.abs(r - (RADIUS + D + 0.45)) < 0.05) v = paint;
      if (r < 0.32 && r > 0.22) v = red;
      out[y * W + px] = v;
    }
  }
  return img;
})();

// ------------------------------------------------------------ the crowd
const CROWD = [];
for (let row = 0; row < 4; row++) {
  for (let x = (row % 2) * 3; x < W; x += 7) {
    const n = CROWD.length;
    CROWD.push({ x, y: 21 + row * 7, skin: [K.skin1, K.skin2, K.skin3][Math.floor(hash(n, 1) * 3)], shirt: [K.red, K.white, K.yellow, K.blue, K.green, K.orange, K.lgreen][Math.floor(hash(n, 2) * 7)], phase: hash(n, 3) });
  }
}
let cheerUntil = -1;
function crowd(ctx, f) {
  const cheer = f.beat < cheerUntil;
  for (const p of CROWD) {
    if (p.y < 44 && p.x > 66 && p.x < 186) continue; // behind the scoreboard
    const up = cheer ? (Math.floor(f.beat * 2 + p.phase * 2) % 2) * 2 : (f.beat + p.phase) % 1 < 0.3 ? 1 : 0;
    const y = p.y - up;
    ctx.fillStyle = p.shirt; ctx.fillRect(p.x, y + 4, 6, 4);
    ctx.fillStyle = p.skin; ctx.fillRect(p.x + 1, y, 4, 4);
    ctx.fillStyle = K.black; ctx.fillRect(p.x + 1, y, 4, 1);
    if (cheer) { ctx.fillStyle = p.skin; ctx.fillRect(p.x - 1, y - 2, 1, 5); ctx.fillRect(p.x + 6, y - 2, 1, 5); }
  }
}

// ---------------------------------------------------------- lamp scoreboard
const BOARD = { x: 68, y: 12, w: 120, h: 30 };
function lampBoard(ctx, f) {
  const { x, y, w, h } = BOARD, a = f.arcade, ui = f.ui, now = performance.now();
  ctx.fillStyle = K.dgrey; ctx.fillRect(x + 20, y + h, 4, 10); ctx.fillRect(x + w - 24, y + h, 4, 10);
  ctx.fillStyle = K.grey; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = K.black; ctx.fillRect(x, y, w, h);
  let msg = `COUNT ${f.count}`, color = K.lamp, scroll = false;
  if (a.state === 'attract') { msg = 'RUEDA ★ INSERT COIN ★ '; scroll = true; }
  else if (a.state === 'ready') msg = 'READY';
  else if (a.state === 'over') msg = 'GAME OVER';
  else if (ui.judge && now - ui.judge.at < 1000) { msg = ui.judge.text; color = ui.judge.cls === 'miss' ? K.red : ui.judge.cls === 'complete' ? K.yellow : K.lgreen; }
  if (ui.caller && now - ui.caller.at < 2600 && a.state !== 'over') { msg = '¡ENCHUFLA DOBLE! '; scroll = true; color = K.lamp; }
  // Each font pixel is one lamp on a 2px grid: 9 characters fit on the board.
  const cols = Math.floor(w / 2), rows = 7, lit = new Set();
  const tw = msg.length * 6;
  const off = scroll ? Math.floor(now / 45) % (tw + cols) - cols : -Math.floor((cols - tw + 1) / 2);
  const tmp = lampBuffer(msg);
  for (let cx = 0; cx < cols; cx++) for (let r = 0; r < rows; r++) {
    const sx = cx + off;
    if (sx >= 0 && sx < tmp.w && tmp.on(sx, r)) lit.add(cx * 8 + r);
  }
  for (let cx = 0; cx < cols; cx++) for (let r = 0; r < rows; r++) {
    ctx.fillStyle = lit.has(cx * 8 + r) ? color : K.lampOff;
    ctx.fillRect(x + 1 + cx * 2 - 1, y + 4 + r * 3, 1, 2);
  }
}
const lampCache = new Map();
function lampBuffer(msg) {
  if (lampCache.has(msg)) return lampCache.get(msg);
  const c = document.createElement('canvas'), w = msg.length * 6;
  c.width = w; c.height = 7;
  drawText(c.getContext('2d'), msg, 0, 0, '#fff', 1, null);
  const d = c.getContext('2d').getImageData(0, 0, w, 7).data;
  const buf = { w, on: (x, y) => d[(y * w + x) * 4 + 3] > 0 };
  lampCache.set(msg, buf);
  return buf;
}

// ------------------------------------------------------------------- HUD
function hudTop(ctx, f) {
  const a = f.arcade;
  ctx.fillStyle = K.black; ctx.fillRect(0, 0, W, 12);
  drawText(ctx, '1P', 4, 3, K.yellow, 1, null); drawText(ctx, String(f.score).padStart(6, '0'), 18, 3, K.white, 1, null);
  drawText(ctx, 'HI', 94, 3, K.yellow, 1, null); drawText(ctx, String(a.hi).padStart(6, '0'), 108, 3, K.white, 1, null);
  if (a.state === 'play' || a.state === 'ready' || a.state === 'over') {
    drawText(ctx, 'TIME', 186, 3, K.yellow, 1, null);
    drawText(ctx, String(a.time).padStart(2, '0'), 214, 3, a.time <= 10 && a.blink(3) ? K.red : K.white, 1, null);
  } else drawText(ctx, `CREDIT ${a.credits}`, 196, 3, K.white, 1, null);
}

function hudBottom(ctx, f) {
  const a = f.arcade;
  ctx.fillStyle = K.navy; ctx.fillRect(0, 204, W, 20);
  ctx.fillStyle = K.white; ctx.fillRect(0, 204, W, 1);
  drawText(ctx, 'COUNT', 6, 206, K.yellow, 1, null);
  for (let i = 0; i < 8; i++) {
    const x = 40 + i * 14, on = i + 1 === f.count;
    ctx.fillStyle = K.black; ctx.fillRect(x, 206, 12, 9);
    ctx.fillStyle = on ? (i === 0 || i === 4 ? K.red : K.yellow) : i === 0 || i === 4 ? K.dred : K.blue;
    ctx.fillRect(x + 1, 207, 10, 7);
    drawText(ctx, String(i + 1), x + 4, 207, on ? K.black : K.white, 1, null);
  }
  drawText(ctx, f.player.role === 'lead' ? 'YOU: LEAD' : 'YOU: FOLLOW', 162, 207, K.yellow, 1, null);
  centerText(ctx, f.ui.phase.replace(/\s+/g, ' '), 216, K.white, 1, null);
  if (a.practice) drawText(ctx, '½×', 6, 216, K.lgreen, 1, null);
}

function bubble(ctx, f) {
  const c = f.ui.caller;
  if (!c || performance.now() - c.at > 2300) return;
  const head = f.couples[f.caller].lead.j.head, p = cam.project({ ...head, z: head.z + 0.42 });
  const text = '¡ENCHUFLA DOBLE!', w = textWidth(text) + 8, h = 12;
  const x = Math.round(Math.max(2, Math.min(W - w - 2, p.x - w / 2))), y = Math.round(Math.max(64, p.y - h - 4));
  ctx.fillStyle = K.black; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = K.white; ctx.fillRect(x, y, w, h);
  for (let k = 0; k < 4; k++) { ctx.fillStyle = K.black; ctx.fillRect(Math.round(p.x) - 1 - k, y + h + k, 2 * k + 3, 1); ctx.fillStyle = K.white; ctx.fillRect(Math.round(p.x) - k, y + h + k - 1, 2 * k + 1, 1); }
  drawText(ctx, text, x + 4, y + 3, K.red, 1, null);
}

// Big centered message with a blue outline and drop shadow.
function bigText(ctx, text, y, color, scale = 2) {
  centerText(ctx, text, y, color, scale, K.navy, { shadow: K.black });
}

let sparks = [];
function scene(ctx, f, dt) {
  const a = f.arcade;
  for (const e of f.events) if (e.type === 'complete') cheerUntil = f.beat + 4;
  const img = new ImageData(new Uint8ClampedArray(bg.data), W, H), out = new Uint32Array(img.data.buffer);
  for (const c of f.couples) { shadow(out, W, H, cam, c.lead.j.pelvis, 0.26, SE); shadow(out, W, H, cam, c.follow.j.pelvis, 0.26 + c.follow.flare * 0.12, SE); }
  if (a.state === 'play' || a.state === 'ready') { // yellow ring painted under the player
    const p = f.couples[f.player.couple][f.player.role].j.pelvis, ring = pack(hex(K.yellow));
    for (let k = 0; k < 64; k++) {
      const q = cam.project({ x: p.x + Math.cos(k / 10.2) * 0.36, y: p.y + Math.sin(k / 10.2) * 0.36, z: 0 });
      const x = Math.round(q.x), y = Math.round(q.y);
      if (x >= 0 && x < W && y >= 0 && y < H) out[y * W + x] = ring;
    }
  }
  spr.clear();
  const list = [];
  f.couples.forEach((c, i) => { list.push({ b: c.lead, look: LOOKS[i].lead }); list.push({ b: c.follow, look: LOOKS[i].follow }); });
  list.sort((p, q) => cam.project(q.b.j.pelvis).depth - cam.project(p.b.j.pelvis).depth);
  for (const d of list) drawDancer(spr, d.b, cam, d.look, { thin: 0.9 });
  spr.commit(out);
  ctx.putImageData(img, 0, 0);
  crowd(ctx, f);
  lampBoard(ctx, f);
  hudTop(ctx, f);
  hudBottom(ctx, f);
  bubble(ctx, f);

  const you = f.couples[f.player.couple][f.player.role].j.head, yp = cam.project({ ...you, z: you.z + 0.32 });
  if (a.state === 'play' || a.state === 'ready') {
    const bob = Math.round(f.pulse * 2);
    drawText(ctx, '▼', yp.x - 2, yp.y - 6 - bob, K.yellow, 1, K.black);
    drawText(ctx, '1P', yp.x - 5, yp.y - 15 - bob, K.yellow, 1, K.black);
  }
  for (const e of f.events) {
    if ((e.type === 'judge' && e.grade !== 'miss') || e.type === 'complete') {
      const n = e.type === 'complete' ? 60 : 20;
      for (let k = 0; k < n; k++) sparks.push({ x: yp.x, y: yp.y + 10, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 120 - 30, life: 1.2, c: [K.yellow, K.red, K.white, K.lgreen][k % 4] });
    }
  }
  sparks = sparks.filter((s) => (s.life -= dt) > 0);
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt; ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2); }

  const j = f.ui.judge, age = j ? (performance.now() - j.at) / 1000 : 9;
  if (a.state === 'play' && age < (j?.cls === 'complete' ? 1.8 : 0.9)) {
    const color = { perfect: K.lgreen, great: K.yellow, good: K.white, miss: K.red, complete: K.yellow }[j.cls];
    if (j.cls !== 'complete' || a.blink(5)) bigText(ctx, j.cls === 'complete' ? j.text : `${j.text}!`.replace('!!', '!'), 84 - Math.min(age, 0.3) * 20, color, j.cls === 'complete' ? 3 : 2);
  }
  if (a.state === 'attract' && a.blink(1)) bigText(ctx, 'INSERT COIN', 92, K.white);
  if (a.state === 'ready') bigText(ctx, a.blink(2) ? 'READY?' : '', 92, K.white);
  if (a.state === 'play' && a.age < 1.4) bigText(ctx, '¡A BAILAR!', 88, K.yellow, 3);
  if (a.state === 'over') {
    bigText(ctx, a.age < 2 ? 'TIME UP' : 'GAME OVER', 86, a.age < 2 ? K.yellow : K.red, 3);
    if (a.newHi && a.blink(2)) bigText(ctx, 'NEW RECORD!', 116, K.lgreen);
  }
}

// ------------------------------------------------------------------ pages
const soloSpr = new Sprites(W, H, Object.values(R), { outline: K.black, shade: 1 });
function soloImage(ctx, entries) {
  soloSpr.clear();
  for (const e of entries) drawDancer(soloSpr, e.b, e.cam, e.look);
  const img = ctx.getImageData(0, 0, W, H);
  soloSpr.commit(new Uint32Array(img.data.buffer));
  ctx.putImageData(img, 0, 0);
}

function flag(ctx, x, y) { // Cuban flag, 15x9
  for (let r = 0; r < 5; r++) { ctx.fillStyle = r % 2 ? K.white : K.blue; ctx.fillRect(x, y + r * 2, 15, 2); }
  ctx.fillStyle = K.red;
  for (let r = 0; r < 10; r++) ctx.fillRect(x, y + r, Math.round(6 - Math.abs(r - 4.5) * 1.2), 1);
  ctx.fillStyle = K.white; ctx.fillRect(x + 1, y + 4, 2, 2);
}

function titlePage(ctx, f) {
  const a = f.arcade;
  ctx.putImageData(bg, 0, 0);
  crowd(ctx, f);
  ctx.fillStyle = K.sky; ctx.fillRect(0, 62, W, 142);
  ctx.fillStyle = K.sky2; for (let y = 66; y < 204; y += 8) ctx.fillRect(0, y, W, 1);
  hudTop(ctx, f);
  const logo = [K.white, K.yellow, K.yellow, K.orange, K.orange, K.red, K.dred];
  centerText(ctx, 'RUEDA', 72, logo, 6, K.navy, { shadow: K.black, italic: 0 });
  centerText(ctx, "CASINO SPORTS '86", 120, K.white, 1, K.navy);
  const top = [['1ST', a.hi, 'CUB'], ['2ND', 40000, 'HAV'], ['3RD', 30000, 'SON'], ['4TH', 20000, 'MAM'], ['5TH', 10000, 'BOL']];
  top.forEach(([n, s, who], i) => {
    const y = 134 + i * 10;
    drawText(ctx, n, 70, y, i ? K.white : K.yellow, 1, K.navy);
    drawText(ctx, String(s).padStart(6, '0'), 100, y, i ? K.white : K.yellow, 1, K.navy);
    drawText(ctx, who, 150, y, i ? K.white : K.yellow, 1, K.navy);
  });
  if (a.blink(1)) bigText(ctx, 'INSERT COIN', 188, K.yellow, 1);
  ctx.fillStyle = K.navy; ctx.fillRect(0, 204, W, 20);
  centerText(ctx, '(C) KASINO 1986', 210, K.white, 1, null);
}

function selectPage(ctx, f) {
  const a = f.arcade;
  ctx.fillStyle = K.sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = K.sky2; for (let y = 14; y < H; y += 8) ctx.fillRect(0, y, W, 1);
  hudTop(ctx, f);
  bigText(ctx, 'SELECT PLAYER', 18, K.white);
  const sprites = [];
  [['lead', 28], ['follow', 136]].forEach(([role, x]) => {
    const on = a.cursor === role;
    ctx.fillStyle = on && a.blink(4) ? K.yellow : K.white; ctx.fillRect(x - 2, 40, 96, 136);
    ctx.fillStyle = K.navy; ctx.fillRect(x, 42, 92, 132);
    ctx.fillStyle = K.blue; ctx.fillRect(x, 140, 92, 34);
    const b = solo(role, f.beat);
    sprites.push({ b, look: LOOKS[0][role], cam: frontCam(x + 46, 166, 52, b.j.pelvis.x, b.j.pelvis.y) });
    flag(ctx, x + 6, 46);
    drawText(ctx, 'CUBA', x + 25, 47, K.white, 1, null);
    drawText(ctx, NAMES[role][0], x + 46 - textWidth(NAMES[role][0]) / 2, 180, on ? K.yellow : K.white, 1, K.navy);
    drawText(ctx, NAMES[role][1], x + 46 - textWidth(NAMES[role][1]) / 2, 190, K.white, 1, K.navy);
    if (on) drawText(ctx, '1P', x + 76, 47, a.blink(3) ? K.yellow : K.red, 1, null);
  });
  soloImage(ctx, sprites);
  centerText(ctx, `◄ ►  PUSH BUTTON  ${a.selectLeft}`, 208, K.white, 1, K.navy);
}

function draw(ctx, f, dt) {
  const a = f.arcade;
  if (a.state === 'attract' && a.page === 'title') return titlePage(ctx, f);
  if (a.state === 'select') return selectPage(ctx, f);
  scene(ctx, f, dt);
}

function marquee(ctx, w, h) {
  ctx.fillStyle = K.sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = K.sky2; for (let y = 2; y < h; y += 6) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = K.white; ctx.fillRect(0, h - 6, w, 2); ctx.fillStyle = K.red; ctx.fillRect(0, h - 4, w, 4);
  const m = new Sprites(w, h, Object.values(R), { outline: K.black, shade: 1 });
  const lead = solo('lead', 2.2), follow = solo('follow', 2.2);
  drawDancer(m, lead, frontCam(26, h - 3, 20, lead.j.pelvis.x, lead.j.pelvis.y), LOOKS[0].lead);
  drawDancer(m, follow, frontCam(w - 26, h - 3, 20, follow.j.pelvis.x, follow.j.pelvis.y), LOOKS[0].follow);
  const img = ctx.getImageData(0, 0, w, h);
  m.commit(new Uint32Array(img.data.buffer));
  ctx.putImageData(img, 0, 0);
  centerText(ctx, 'RUEDA', 4, [K.white, K.yellow, K.yellow, K.orange, K.orange, K.red, K.dred], 4, K.navy, { shadow: K.black, italic: 0 });
  centerText(ctx, "CASINO SPORTS '86", 33, K.white, 1, K.navy);
}

new Arcade({ W, H, era: '86', flavor: 'nes', couples: 4, ringOffset: -135, radius: RADIUS, draw, marquee, marqueeSize: [220, 44] });
