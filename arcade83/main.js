// RUEDA '83: a golden-age coin-op on a vertical monitor (224x288). Black
// screen, a handful of bright colors, the rueda seen from above inside a maze
// ring, footsteps left behind as pellets, and a cast roll call in attract mode.
import { Arcade } from '../shared/arcade.js';
import { Sprites, drawDancer, hex, pack } from '../shared/sprite.js';
import { drawText, textWidth, centerText } from '../shared/font.js';
import { D, FIGURES, couplePose } from '../shared/dance.js';

const W = 224, H = 288, DEG = Math.PI / 180;
const EL = 50 * DEG, SE = Math.sin(EL), CE = Math.cos(EL);
const S = 36, CX = 112, CY = 171, RADIUS = 1.45;

const C = {
  black: '#000000', white: '#dedede', red: '#ff0000', pink: '#ffb8ff', cyan: '#00ffff', orange: '#ffb852',
  yellow: '#ffff00', blue: '#2121de', peach: '#ffb8ae', brown: '#de9751', hair: '#a0522d', pants: '#4a4aff', green: '#00ff00',
};
const LOOKS = [
  { lead: { skin: C.peach, hair: C.hair, shirt: C.white, pants: C.pants, shoes: C.white, hat: C.yellow, band: C.red }, follow: { skin: C.brown, hair: C.hair, dress: C.red, shoes: C.red, flower: C.yellow } },
  { lead: { skin: C.brown, hair: C.hair, shirt: C.white, pants: C.pants, shoes: C.white, hat: C.orange, band: C.red }, follow: { skin: C.peach, hair: C.hair, dress: C.pink, shoes: C.pink, flower: C.white } },
  { lead: { skin: C.peach, hair: C.hair, shirt: C.white, pants: C.pants, shoes: C.white, hat: C.yellow, band: C.blue }, follow: { skin: C.brown, hair: C.hair, dress: C.cyan, shoes: C.cyan, flower: C.pink } },
  { lead: { skin: C.brown, hair: C.hair, shirt: C.white, pants: C.pants, shoes: C.white, hat: C.white, band: C.red }, follow: { skin: C.peach, hair: C.hair, dress: C.orange, shoes: C.orange, flower: C.red } },
];
const CALLER = { skin: C.brown, hair: C.hair, shirt: C.yellow, pants: C.pants, shoes: C.white, hat: C.white, band: C.red };

const cam = {
  project: (p) => ({ x: CX + p.x * S, y: CY - (p.y * SE + p.z * CE) * S, s: S, depth: p.y * CE - p.z * SE }),
  toCam: () => ({ x: 0, y: -CE, z: SE }),
};
// A front view centered on (ox, oy), for the roll call and the select screen.
const FE = 12 * DEG;
const frontCam = (cx, cy, s, ox, oy) => ({
  project: (p) => ({ x: cx + (p.x - ox) * s, y: cy - ((p.y - oy) * Math.sin(FE) + p.z * Math.cos(FE)) * s, s, depth: (p.y - oy) * Math.cos(FE) - p.z * Math.sin(FE) }),
  toCam: () => ({ x: 0, y: -1, z: 0 }),
});
// One dancer on their own, facing the viewer, doing the basic.
function solo(role, beat, signal = false) {
  const t = ((beat % 8) + 8) % 8 - (((beat % 8) + 8) % 8 > 7.5 ? 8 : 0);
  const c = couplePose(FIGURES.guapea, FIGURES.guapea, t, { ox: 0, oy: 0, rot: role === 'lead' ? 180 : 0 }, beat, { signal });
  return c[role];
}

const spr = new Sprites(W, H, [...Object.values(C)], { outline: C.black, shade: 0, line: 1 });

// ------------------------------------------------------------ background
// The ring as a maze: double walls around the dancers' corridor. A second copy
// with white walls flashes when a move completes.
function mazeImage(color) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff';
  g.lineWidth = 1;
  for (const r of [RADIUS - 0.52, RADIUS + D + 0.5]) {
    for (const off of [-1.5, 1.5]) {
      g.beginPath();
      g.ellipse(CX, CY, r * S + off, (r * S + off) * SE, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // Bandstand at the top.
  g.strokeRect(58.5, 26.5, 107, 34);
  g.strokeRect(61.5, 29.5, 101, 28);
  const d = g.getImageData(0, 0, W, H).data, img = new ImageData(W, H), out = new Uint32Array(img.data.buffer);
  const on = pack(hex(color)), off = pack([0, 0, 0]);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 70 ? on : off;
  return img;
}
const MAZE = { blue: mazeImage(C.blue), white: mazeImage(C.white) };

// -------------------------------------------------------------- the band
function musician(ctx, x, y, kind, beat) {
  const bob = Math.floor(beat * 2) % 2, sw = Math.floor(beat * 4) % 2;
  const r = (c, ax, ay, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + ax, y + ay, w, h); };
  r(C.pants, 3, 14, 2, 5); r(C.pants, 7, 14, 2, 5);
  r(C.white, 3, 7 + bob, 6, 7);
  r(C.peach, 4, 3 + bob, 4, 4);
  r(kind === 'bass' ? C.orange : C.yellow, 2, 2 + bob, 8, 1); r(kind === 'bass' ? C.orange : C.yellow, 3, 0 + bob, 6, 2);
  if (kind === 'conga') {
    r(C.red, -3, 11, 4, 8); r(C.red, 11, 11, 4, 8); r(C.white, -3, 11, 4, 1); r(C.white, 11, 11, 4, 1);
    r(C.peach, sw ? -1 : 0, sw ? 8 : 10, 3, 1); r(C.peach, sw ? 9 : 10, sw ? 10 : 8, 3, 1);
  } else if (kind === 'trumpet') {
    const up = Math.floor(beat) % 4 === 0 ? 1 : 0;
    r(C.yellow, 8, 5 + bob - up, 6, 1); r(C.yellow, 13, 3 + bob - up, 2, 5);
    r(C.peach, 8, 8 + bob, 3, 1);
  } else {
    r(C.orange, 10, 7, 5, 9); r(C.orange, 11, 16, 3, 2); r(C.hair, 12, -3, 1, 10);
    r(C.peach, sw ? 9 : 8, 11, 3, 1);
  }
}

// ---------------------------------------------------------------- pellets
const pellets = [];
const landed = new Map();
function trackFeet(b, f, color) {
  for (const k of ['L', 'R']) {
    const ft = b.feet[k], g = f.measure * 8 + ft.landed, key = b.role + k;
    if (landed.get(key) !== g) {
      if (landed.has(key) && f.beat - g < 0.6) pellets.push({ x: ft.x, y: ft.y, beat: g, color });
      landed.set(key, g);
    }
  }
}

// -------------------------------------------------------------------- HUD
function hudTop(ctx, f) {
  const a = f.arcade;
  if (a.state !== 'play' || a.blink(2)) drawText(ctx, '1UP', 24, 1, C.white, 1, null);
  centerText(ctx, 'HIGH SCORE', 1, C.white, 1, null);
  drawText(ctx, String(f.score).padStart(6, '0'), 8, 10, C.white, 1, null);
  drawText(ctx, String(a.hi).padStart(6, '0'), 94, 10, C.white, 1, null);
}

function hudBottom(ctx, f) {
  const a = f.arcade;
  if (a.state === 'play' || a.state === 'ready') {
    // The 8 counts as pellets; the chomper eats one per beat.
    const x0 = 10, step = 11, y = 278;
    for (let i = 0; i < 8; i++) {
      if (i + 1 < f.count) continue;
      const x = x0 + i * step;
      ctx.fillStyle = C.peach;
      if (i === 0 || i === 4) { if (a.blink(4)) { ctx.fillRect(x - 2, y - 3, 4, 6); ctx.fillRect(x - 3, y - 2, 6, 4); } }
      else ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    const cx = x0 + (f.count - 1) * step, open = (f.beat % 0.5) < 0.25;
    ctx.fillStyle = C.yellow;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.arc(cx, y, 5, open ? 0.7 : 0.15, open ? -0.7 : -0.15); ctx.closePath(); ctx.fill();
    drawText(ctx, `TIME ${String(a.time).padStart(2, '0')}`, 168, 274, a.time <= 10 && a.blink(3) ? C.red : C.white, 1, null);
    centerText(ctx, f.ui.phase.replace(/\s+/g, ' '), 262, C.yellow, 1, null);
  } else drawText(ctx, `CREDIT ${a.credits}`, 8, 277, C.white, 1, null);
  if (a.practice) drawText(ctx, 'PRÁCTICA', 168, 262, C.green, 1, null);
}

// Text in the island at the middle of the ring.
function island(ctx, f) {
  const a = f.arcade, j = f.ui.judge, two = (l1, c1, l2, c2) => { centerText(ctx, l1, CY - 12, c1, 1, null); centerText(ctx, l2, CY - 2, c2, 1, null); };
  if (a.state === 'attract') { if (a.blink(1)) two('INSERT', C.red, 'COIN', C.red); return; }
  if (a.state === 'ready') return two('PLAYER ONE', C.cyan, 'READY!', C.yellow);
  if (a.state === 'over') return two('GAME', C.red, 'OVER', C.red);
  const age = j ? (performance.now() - j.at) / 1000 : 9;
  if (age < (j?.cls === 'complete' ? 1.8 : 0.9)) {
    const color = { perfect: C.cyan, great: C.pink, good: C.white, miss: C.red, complete: C.yellow }[j.cls];
    if (j.cls !== 'complete' || a.blink(5)) centerText(ctx, j.text, CY - 7, color, 1, null);
    return;
  }
  const n = String(f.count);
  drawText(ctx, n, CX - 5, CY - 14, f.count === 1 || f.count === 5 ? C.yellow : C.white, 2, null);
}

function bubble(ctx, f) {
  const c = f.ui.caller;
  if (!c || performance.now() - c.at > 2300) return;
  const head = f.couples[f.caller].lead.j.head, p = cam.project({ ...head, z: head.z + 0.35 });
  const text = '¡ENCHUFLA DOBLE!', w = textWidth(text) + 6, h = 11;
  const x = Math.round(Math.max(2, Math.min(W - w - 2, p.x - w / 2))), y = Math.round(p.y - h - 3);
  ctx.fillStyle = C.white; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = C.black; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.white;
  for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(p.x) - 1 + k, y + h + k, 1, 1);
  drawText(ctx, text, x + 3, y + 2, C.yellow, 1, null);
}

// ------------------------------------------------------------------ pages
let flashUntil = 0;
function scene(ctx, f) {
  const a = f.arcade;
  for (const e of f.events) if (e.type === 'complete') flashUntil = f.beat + 2;
  const flashing = f.beat < flashUntil && Math.floor(f.beat * 4) % 2 === 0;
  const img = new ImageData(new Uint8ClampedArray((flashing ? MAZE.white : MAZE.blue).data), W, H);
  const out = new Uint32Array(img.data.buffer);

  const mine = f.couples[f.player.couple];
  trackFeet(mine.lead, f, C.white);
  trackFeet(mine.follow, f, LOOKS[f.player.couple].follow.dress);
  for (let i = pellets.length - 1; i >= 0; i--) {
    const p = pellets[i], age = f.beat - p.beat;
    if (age > 6 || age < -1) { pellets.splice(i, 1); continue; }
    if (age > 4 && Math.floor(age * 6) % 2) continue;
    const q = cam.project({ x: p.x, y: p.y, z: 0 }), v = pack(hex(p.color));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const x = Math.round(q.x) + dx, y = Math.round(q.y) + dy;
      if (x >= 0 && x < W && y >= 0 && y < H) out[y * W + x] = v;
    }
  }

  spr.clear();
  const list = [];
  f.couples.forEach((c, i) => {
    list.push({ b: c.lead, look: i === f.caller ? CALLER : LOOKS[i].lead });
    list.push({ b: c.follow, look: LOOKS[i].follow });
  });
  list.sort((p, q) => cam.project(q.b.j.pelvis).depth - cam.project(p.b.j.pelvis).depth);
  for (const d of list) drawDancer(spr, d.b, cam, d.look, { thin: 0.85 });
  spr.commit(out);
  ctx.putImageData(img, 0, 0);

  ['conga', 'trumpet', 'bass'].forEach((k, i) => musician(ctx, 74 + i * 30, 33, k, f.beat));
  hudTop(ctx, f);
  hudBottom(ctx, f);
  island(ctx, f);
  bubble(ctx, f);
  if (a.state === 'play' || a.state === 'ready') {
    const you = mine[f.player.role].j.head, p = cam.project({ ...you, z: you.z + 0.3 });
    const bob = Math.round(f.pulse * 2);
    drawText(ctx, '▼', p.x - 2, p.y - 6 - bob, C.cyan, 1, C.black);
    if (a.blink(2)) drawText(ctx, 'YOU', p.x - 8, p.y - 15 - bob, C.cyan, 1, C.black);
  }
  if (a.state === 'over' && a.newHi && a.blink(2)) centerText(ctx, 'NEW HIGH SCORE!', 64, C.yellow, 1, null);
}

const soloSpr = new Sprites(W, H, [...Object.values(C)], { outline: C.black, shade: 0, line: 1 });
function soloImage(ctx, entries) {
  soloSpr.clear();
  for (const e of entries) drawDancer(soloSpr, e.b, e.cam, e.look, e.opts || {});
  const img = ctx.getImageData(0, 0, W, H);
  soloSpr.commit(new Uint32Array(img.data.buffer));
  ctx.putImageData(img, 0, 0);
}

function titlePage(ctx, f) {
  const a = f.arcade, age = (performance.now() - window.arcade.pageAt) / 1000;
  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, W, H);
  hudTop(ctx, f);
  centerText(ctx, 'CHARACTER / NICKNAME', 34, C.white, 1, null);
  const cast = [
    { role: 'lead', look: LOOKS[0].lead, name: 'EL LÍDER', nick: '"GUAPO"', color: C.white },
    { role: 'follow', look: LOOKS[0].follow, name: 'LA REINA', nick: '"AZÚCAR"', color: C.red },
    { role: 'lead', look: CALLER, name: 'EL CANTANTE', nick: '"JEFE"', color: C.yellow, signal: true },
  ];
  const sprites = [];
  cast.forEach((c, i) => {
    if (age < 0.8 + i * 1.1) return;
    const y = 56 + i * 32, b = solo(c.role, f.beat, c.signal);
    sprites.push({ b, look: c.look, cam: frontCam(26, y + 24, 14, b.j.pelvis.x, b.j.pelvis.y) });
    drawText(ctx, c.name, 44, y + 8, c.color, 1, null);
    if (age > 1.3 + i * 1.1) drawText(ctx, c.nick, 44 + textWidth(c.name) + 8, y + 8, c.color, 1, null);
  });
  soloImage(ctx, sprites);
  if (age > 4.2) {
    drawText(ctx, 'RUEDA', CX - textWidth('RUEDA', 4) / 2 + 2, 160 + 2, C.red, 4, null);
    drawText(ctx, 'RUEDA', CX - textWidth('RUEDA', 4) / 2, 160, C.yellow, 4, null);
    ctx.fillStyle = C.peach;
    ctx.fillRect(60, 202, 2, 2);
    drawText(ctx, 'PERFECT', 70, 200, C.white, 1, null); drawText(ctx, '300 PTS', 128, 200, C.white, 1, null);
    ctx.fillRect(59, 212, 4, 6); ctx.fillRect(58, 213, 6, 4);
    drawText(ctx, '¡SABROSO!', 70, 212, C.white, 1, null); drawText(ctx, '1000 PTS', 128, 212, C.white, 1, null);
  }
  centerText(ctx, '(C) 1983 CASINO LTD.', 240, C.pink, 1, null);
  if (a.blink(1)) centerText(ctx, 'INSERT COIN', 256, C.red, 1, null);
  hudBottom(ctx, f);
}

function selectPage(ctx, f) {
  const a = f.arcade;
  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, W, H);
  hudTop(ctx, f);
  centerText(ctx, 'SELECT YOUR DANCER', 30, C.white, 1, null);
  const boxes = [{ role: 'lead', x: 18, name: 'EL LÍDER', sub: 'LEAD', color: C.white }, { role: 'follow', x: 116, name: 'LA REINA', sub: 'FOLLOW', color: C.red }];
  const sprites = [];
  for (const bx of boxes) {
    const on = a.cursor === bx.role;
    ctx.strokeStyle = on && a.blink(4) ? C.yellow : C.blue;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx.x + 0.5, 46.5, 89, 140);
    ctx.strokeRect(bx.x + 3.5, 49.5, 83, 134);
    const b = solo(bx.role, f.beat);
    sprites.push({ b, look: LOOKS[0][bx.role], cam: frontCam(bx.x + 45, 172, 52, b.j.pelvis.x, b.j.pelvis.y) });
    centerAt(ctx, bx.name, bx.x + 45, 194, bx.color);
    centerAt(ctx, bx.sub, bx.x + 45, 204, on ? C.yellow : C.blue);
    if (on) centerAt(ctx, '▲ 1UP', bx.x + 45, 216, C.cyan);
  }
  soloImage(ctx, sprites);
  centerText(ctx, '◄ ►  THEN PUSH BUTTON', 236, C.white, 1, null);
  centerText(ctx, `TIME ${a.selectLeft}`, 250, a.selectLeft <= 3 ? C.red : C.yellow, 1, null);
  hudBottom(ctx, f);
}
const centerAt = (ctx, text, x, y, color) => drawText(ctx, text, x - textWidth(text) / 2, y, color, 1, null);

function draw(ctx, f) {
  const a = f.arcade;
  if (a.state === 'attract' && a.page === 'title') return titlePage(ctx, f);
  if (a.state === 'select') return selectPage(ctx, f);
  scene(ctx, f);
}

// Marquee: the logo between two dancers, black glass with a yellow rim.
function marquee(ctx, w, h) {
  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, w, h);
  const m = new Sprites(w, h, [...Object.values(C)], { outline: C.black });
  const lead = solo('lead', 4), follow = solo('follow', 4);
  drawDancer(m, lead, frontCam(30, 37, 18, lead.j.pelvis.x, lead.j.pelvis.y), LOOKS[0].lead);
  drawDancer(m, follow, frontCam(w - 30, 37, 18, follow.j.pelvis.x, follow.j.pelvis.y), LOOKS[0].follow);
  const img = ctx.getImageData(0, 0, w, h);
  m.commit(new Uint32Array(img.data.buffer));
  ctx.putImageData(img, 0, 0);
  const x = (w - textWidth('RUEDA', 4)) / 2;
  drawText(ctx, 'RUEDA', x + 2, 6, C.red, 4, null);
  drawText(ctx, 'RUEDA', x, 4, [C.yellow, C.yellow, C.yellow, C.orange, C.orange, C.red, C.red], 4, null);
  ctx.fillStyle = C.peach;
  for (let i = 0; i < 9; i++) ctx.fillRect(x + 6 + i * 13, 37, 2, 2);
}

new Arcade({ W, H, era: '83', flavor: 'namco', couples: 4, ringOffset: -135, radius: RADIUS, draw, marquee, marqueeSize: [200, 42] });
