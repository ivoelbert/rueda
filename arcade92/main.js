// RUEDA '92: an early-90s fighting-game board (384x224). Big three-tone
// sprites seen side-on, so the hand over her head and both turns read clearly,
// a Havana plaza with a cheering crowd behind, mirrored SABOR bars with a
// timer, ROUND 1 / ¡BAILA!, and a player-select screen with portraits.
import { Arcade } from '../shared/arcade.js';
import { Sprites, drawDancer, shadow, hull, hex, pack } from '../shared/sprite.js';
import { drawText, textWidth, centerText } from '../shared/font.js';
import { FIGURES, couplePose } from '../shared/dance.js';

const W = 384, H = 224, DEG = Math.PI / 180, RADIUS = 1.45;
const HORIZON_CY = H * 0.52, F = 560;

// --------------------------------------------------------------- camera
const v = (x, y, z) => ({ x, y, z });
const sub = (a, b) => v(a.x - b.x, a.y - b.y, a.z - b.z);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z); return v(a.x / l, a.y / l, a.z / l); };
const cross = (a, b) => v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
// Side-on to the player's couple (lead at (0,-1.45), follow at (0,-2.35)).
// Panned a little so the couple nearest the camera stays out of frame.
const EYE = v(-6.4, -2.25, 1.3), AIM = v(0, -2.25, 0.98);
const FWD = norm(sub(AIM, EYE)), RIGHT = norm(cross(FWD, v(0, 0, 1))), UP = cross(RIGHT, FWD);
const cam = {
  project(p) {
    const d = sub(p, EYE), zc = dot(d, FWD), s = F / zc;
    return { x: W / 2 + dot(d, RIGHT) * s, y: HORIZON_CY - dot(d, UP) * s, s, depth: zc };
  },
  toCam: (p) => norm(sub(EYE, p)),
};
const FE = 4 * DEG;
const frontCam = (cx, cy, s, ox, oy) => ({
  project: (p) => ({ x: cx + (p.x - ox) * s, y: cy - ((p.y - oy) * Math.sin(FE) + p.z * Math.cos(FE)) * s, s, depth: (p.y - oy) * Math.cos(FE) - p.z * Math.sin(FE) }),
  toCam: () => ({ x: 0, y: -1, z: 0 }),
});
function solo(role, beat) {
  const m = ((beat % 8) + 8) % 8, t = m > 7.5 ? m - 8 : m;
  return couplePose(FIGURES.guapea, FIGURES.guapea, t, { ox: 0, oy: 0, rot: role === 'lead' ? 180 : 0 }, beat)[role];
}

// --------------------------------------------------------------- palette
const R = { // [shadow, base, light]
  skin1: ['#b06838', '#e8a070', '#fcd0a8'], skin2: ['#7a4020', '#b06838', '#e09060'], skin3: ['#4a2410', '#7a4020', '#a86030'],
  white: ['#9090b0', '#d8d8ec', '#ffffff'], cream: ['#b89868', '#e8d0a0', '#fff0d0'], sky: ['#3870b0', '#68a8e0', '#b0e0ff'],
  navy: ['#182050', '#30408c', '#5068c0'], charcoal: ['#282830', '#484858', '#707080'], tan: ['#806030', '#b89050', '#e0c080'],
  red: ['#880818', '#d82030', '#ff6060'], yellow: ['#a07000', '#e8b800', '#fff060'], teal: ['#006060', '#10a8a0', '#60e8d0'], purple: ['#501878', '#8838c0', '#c070f0'],
  straw: ['#a07020', '#e0b050', '#fff0a0'], band: ['#600010', '#a01020', '#e04040'], hair: ['#100808', '#302018', '#584030'],
  shoe: ['#100808', '#382018', '#604030'], gold: ['#806000', '#d0a000', '#fff080'],
  // muted tones for the crowd
  c1: ['#503050', '#805878', '#a880a0'], c2: ['#304860', '#507090', '#78a0c0'], c3: ['#605030', '#908050', '#b8a878'], c4: ['#603838', '#905858', '#c08080'], cskin: ['#704830', '#a07050', '#c89878'],
};
const LOOKS = [
  { lead: { skin: R.skin2, hair: R.hair, shirt: R.white, pants: R.navy, shoes: R.shoe, hat: R.straw, band: R.band }, follow: { skin: R.skin1, hair: R.hair, dress: R.red, hem: '#ff6060', shoes: R.gold, flower: R.yellow } },
  { lead: { skin: R.skin3, hair: R.hair, shirt: R.cream, pants: R.charcoal, shoes: R.shoe, hat: R.white, band: R.navy }, follow: { skin: R.skin2, hair: R.hair, dress: R.yellow, hem: '#fff060', shoes: R.gold, flower: R.red } },
  { lead: { skin: R.skin1, hair: R.hair, shirt: R.sky, pants: R.navy, shoes: R.shoe, hat: R.straw, band: R.band }, follow: { skin: R.skin3, hair: R.hair, dress: R.teal, hem: '#60e8d0', shoes: R.gold, flower: R.red } },
  { lead: { skin: R.skin2, hair: R.hair, shirt: R.white, pants: R.tan, shoes: R.shoe, hat: R.straw, band: R.navy }, follow: { skin: R.skin1, hair: R.hair, dress: R.purple, hem: '#c070f0', shoes: R.gold, flower: R.yellow } },
];
const NAMES = { lead: 'GUAPO', follow: 'AZÚCAR' };
const spr = new Sprites(W, H, Object.values(R), { outline: '#100810', shade: 2 });
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ------------------------------------------------------------ background
// Ray-cast once per pixel: sky, a row of colonial facades across the plaza,
// and the cobbled ground; then palms and bunting drawn as sprites on top.
const FACADE_X = 30;
const FACADES = [['#e890a8', '#c06880', '#f8c0d0'], ['#70c8b8', '#409888', '#a8f0e0'], ['#f0d070', '#c0a040', '#fff0b0'], ['#b0a0e0', '#8070b8', '#d8d0ff'], ['#f0a878', '#c07850', '#ffd0b0']];
const bg = (() => {
  const img = new ImageData(W, H), out = new Uint32Array(img.data.buffer);
  const P = (h) => pack(hex(h));
  const SKY = ['#5890e0', '#68a0e8', '#78b0ec', '#8cc0f0', '#a0d0f0', '#b8dcf0', '#d8e0e0', '#f0d8c0'].map(P);
  const COB = [['#584848', '#706060', '#887878', '#a09088'], ['#504040', '#685858', '#807070', '#988880']].map((r) => r.map(P));
  const MORTAR = P('#383030'), DARK = P('#302028'), DOOR = P('#583830'), SHUT = P('#2f6e62'), SHUT2 = P('#1d4a45'), WIN = P('#f8e0a0'), RAIL = P('#281820');
  const DOME = P('#c0b8d8'), DOME2 = P('#a098c0');
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const a = (px - W / 2) / F, b = -(py - HORIZON_CY) / F;
      const dir = v(FWD.x + RIGHT.x * a + UP.x * b, FWD.y + RIGHT.y * a + UP.y * b, FWD.z + RIGHT.z * a + UP.z * b);
      let c;
      const tw = (FACADE_X - EYE.x) / dir.x;
      const tg = dir.z < 0 ? -EYE.z / dir.z : Infinity;
      if (tg < tw) {
        const gx = EYE.x + dir.x * tg, gy = EYE.y + dir.y * tg;
        const row = Math.floor(gx / 0.32), off = (row & 1) * 0.19, col = Math.floor((gy + off) / 0.38);
        const fx = gx / 0.32 - row, fy = (gy + off) / 0.38 - col;
        const far = Math.min(1, tg / 34);
        if (fx < 0.13 || fy < 0.1) c = MORTAR;
        else {
          const r = Math.hypot(gx, gy);
          const lit = 1.7 - far * 1.3 + 0.6 * Math.max(0, 1 - r / 3.4) + hash(row, col) * 0.6 - fx * 0.5;
          c = COB[(row + col) & 1][Math.max(0, Math.min(3, Math.floor(lit)))];
        }
      } else {
        const wy = EYE.y + dir.y * tw, wz = EYE.z + dir.z * tw;
        const bi = Math.floor((wy + 100) / 6.5), u = wy + 100 - bi * 6.5, height = 6.5 + hash(bi, 7) * 4.5;
        if (wz > height) {
          // Sky, with the Capitolio dome far behind.
          const az = Math.atan2(dir.y, dir.x), el = Math.atan2(dir.z, Math.hypot(dir.x, dir.y));
          const dx = (az - 0.32) / 0.05, dome = el < 0.115 - dx * dx * 0.04 && Math.abs(dx) < 1.7;
          const lantern = Math.abs(az - 0.32) < 0.008 && el < 0.15;
          c = dome || lantern || (el < 0.075 && Math.abs(az - 0.32) < 0.16) ? (dx < 0 ? DOME : DOME2) : SKY[Math.max(0, Math.min(7, 7 - Math.floor(el / 0.035)))];
        } else {
          const ramp = FACADES[Math.floor(hash(bi, 3) * 5)].map(P);
          const bay = Math.floor(u / 1.6), bu = u - bay * 1.6, cu = bu - 0.8;
          if (u < 0.15 || u > 6.35) c = ramp[1];
          else if (wz > height - 0.5) c = wz > height - 0.2 ? ramp[2] : ramp[1];
          else if (wz < 3.4) {
            const arch = Math.abs(cu) < 0.6 && (wz < 2.5 || cu * cu + (wz - 2.5) ** 2 < 0.36);
            c = arch ? (hash(bi, bay) > 0.5 ? DARK : DOOR) : wz < 0.3 ? ramp[1] : ramp[0];
          } else if (wz < 3.55) c = ramp[2];
          else if (wz < 4.3 && wz > 3.55) c = (u * 6) % 1 < 0.3 || wz > 4.2 ? RAIL : Math.abs(cu) < 0.42 && wz < 6 ? (hash(bi * 9, bay) > 0.5 ? WIN : SHUT) : ramp[0];
          else if (Math.abs(cu) < 0.42 && wz < 6) c = hash(bi * 9, bay) > 0.5 ? WIN : (wz * 6) % 1 < 0.5 ? SHUT : SHUT2;
          else c = ramp[0];
        }
      }
      out[py * W + px] = c;
    }
  }
  // Palms and bunting in front of the facades.
  const deco = new Sprites(W, H, Object.values(R).concat([['#204820', '#307830', '#58a848'], ['#583818', '#806030', '#a88850']]), { outline: '#100810', shade: 2 });
  const leaf = ['#204820', '#307830', '#58a848'], trunk = ['#583818', '#806030', '#a88850'];
  for (const [px, py] of [[24, -10.5], [24, 5.5], [26, -16]]) {
    const pts = [0, 1, 2, 3, 4, 5].map((k) => cam.project(v(px, py + Math.sin(k * 0.5) * 0.35, k * 1.6)));
    deco.chain(pts, [0.4, 0.36, 0.34, 0.32, 0.3], trunk);
    const top = v(px, py + Math.sin(2.5) * 0.35, 8);
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2, fr = [cam.project(top)];
      for (let s = 1; s <= 4; s++) fr.push(cam.project(v(top.x + Math.cos(ang) * s * 0.75, top.y + Math.sin(ang) * s * 0.9, top.z + 0.3 - s * s * 0.16)));
      deco.chain(fr, [0.45, 0.4, 0.3, 0.15], leaf);
    }
  }
  const FLAGS = [R.red, R.white, R.navy, R.yellow, R.teal];
  for (let k = 0; k < 40; k++) {
    const t = k / 39, y = -16 + t * 28, z = 7.2 - Math.sin(t * Math.PI) * 1.6;
    const a = cam.project(v(20, y, z)), b = cam.project(v(20, y + 0.6, z - (Math.cos(t * Math.PI) * 0.12))), tip = cam.project(v(20, y + 0.3, z - 0.75));
    deco.poly([a, b, tip], FLAGS[k % 5], false);
  }
  deco.commit(out);
  return img;
})();

// ------------------------------------------------------------- the crowd
const CROWD = [];
for (let y = -14; y < 10; y += 0.62) {
  const n = CROWD.length;
  CROWD.push({ x: 9 + hash(n, 1) * 2.4, y: y + hash(n, 2) * 0.3, color: [R.c1, R.c2, R.c3, R.c4][Math.floor(hash(n, 3) * 4)], h: 1.55 + hash(n, 4) * 0.3, phase: hash(n, 5) });
}
let cheerUntil = -1;
function drawCrowd(f) {
  const cheer = f.beat < cheerUntil;
  const list = CROWD.map((p) => ({ p, d: cam.project(v(p.x, p.y, 0)).depth })).sort((a, b) => b.d - a.d);
  for (const { p } of list) {
    const hop = cheer ? Math.abs(Math.sin((f.beat + p.phase) * Math.PI)) * 0.12 : (f.beat + p.phase) % 1 < 0.25 ? 0.03 : 0;
    const z0 = hop, hip = cam.project(v(p.x, p.y, z0 + p.h * 0.52)), neck = cam.project(v(p.x, p.y, z0 + p.h * 0.84)), head = cam.project(v(p.x, p.y, z0 + p.h * 0.92));
    const handUp = cheer || (Math.floor(f.beat + p.phase * 8) % 8 === 0);
    for (const side of [-1, 1]) {
      const sh = cam.project(v(p.x, p.y + side * 0.18, z0 + p.h * 0.8));
      const hand = handUp ? cam.project(v(p.x - 0.1, p.y + side * 0.28, z0 + p.h * 1.08 + Math.sin(f.beat * Math.PI * 2 + side) * 0.05)) : cam.project(v(p.x, p.y + side * 0.24, z0 + p.h * 0.5));
      spr.chain([sh, hand], [0.09], R.cskin);
    }
    spr.chain([cam.project(v(p.x, p.y - 0.08, z0)), hip], [0.14], R.charcoal);
    spr.chain([cam.project(v(p.x, p.y + 0.08, z0)), hip], [0.14], R.charcoal);
    spr.chain([hip, neck], [0.34], p.color);
    spr.blob(head, 0.11, R.cskin);
    for (const side of [-1, 1]) spr.dot(cam.project(v(p.x - 0.1, p.y + side * 0.04, z0 + p.h * 0.93)), '#100810', 1);
  }
}

// ------------------------------------------------------------------ text
const GOLD = ['#ffffff', '#fff080', '#f8d800', '#f8b000', '#f08000', '#e04000', '#a01000'];
const big = (ctx, text, y, scale, colors = GOLD, italic = 0.22) => centerText(ctx, text, y, colors, scale, '#100810', { italic, shadow: '#100810' });

// -------------------------------------------------------------------- HUD
function hudTop(ctx, f) {
  const a = f.arcade, heat = a.heat;
  drawText(ctx, '1P', 8, 2, '#f8d800', 1, '#100810'); drawText(ctx, String(f.score).padStart(7, ' '), 22, 2, '#ffffff', 1, '#100810');
  drawText(ctx, 'HI', 300, 2, '#f8d800', 1, '#100810'); drawText(ctx, String(a.hi).padStart(7, ' '), 314, 2, '#ffffff', 1, '#100810');
  const bar = (x, w, fromRight) => {
    ctx.fillStyle = '#100810'; ctx.fillRect(x - 2, 11, w + 4, 12);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, 12, w + 2, 10);
    ctx.fillStyle = '#381828'; ctx.fillRect(x, 13, w, 8);
    const fw = Math.round(w * heat), fx = fromRight ? x + w - fw : x;
    ctx.fillStyle = heat >= 0.99 && a.blink(6) ? '#ffffff' : '#f8d800'; ctx.fillRect(fx, 13, fw, 8);
    ctx.fillStyle = '#fff8b0'; ctx.fillRect(fx, 13, fw, 2);
  };
  bar(14, 152, true);
  bar(218, 152, false);
  const t = a.state === 'attract' || a.state === 'select' ? 99 : a.time;
  ctx.fillStyle = '#100810'; ctx.fillRect(176, 9, 32, 22);
  drawText(ctx, String(t).padStart(2, '0'), 180, 12, t <= 10 && a.blink(3) ? ['#ffffff', '#ff8080', '#ff4040', '#e01010', '#e01010', '#a00000', '#800000'] : GOLD, 2, null);
  const you = f.player.role;
  drawText(ctx, NAMES.lead, 16, 26, you === 'lead' ? '#f8d800' : '#ffffff', 1, '#100810');
  drawText(ctx, NAMES.follow, 368 - textWidth(NAMES.follow), 26, you === 'follow' ? '#f8d800' : '#ffffff', 1, '#100810');
  drawText(ctx, 'SABOR', 166 - textWidth('SABOR'), 26, '#ff8080', 1, '#100810');
  drawText(ctx, 'SABOR', 218, 26, '#ff8080', 1, '#100810');
  // The 8 counts as pips under the timer.
  for (let i = 0; i < 8; i++) {
    const x = 167 + i * 7, on = i + 1 === f.count && (a.state === 'play' || a.state === 'ready' || a.state === 'attract');
    ctx.fillStyle = '#100810'; ctx.fillRect(x - 1, 33, 6, 6);
    ctx.fillStyle = on ? (i === 0 || i === 4 ? '#ff4040' : '#f8d800') : i === 0 || i === 4 ? '#801020' : '#403848';
    ctx.fillRect(x, 34, 4, 4);
  }
  if (heat >= 0.99 && a.state === 'play' && a.blink(4)) centerText(ctx, '¡ESTÁ QUE ARDE!', 44, '#ff6020', 1, '#100810');
}

function hudBottom(ctx, f) {
  const a = f.arcade;
  if (a.state === 'play' || a.state === 'ready') centerText(ctx, f.ui.phase.replace(/\s+/g, ' '), 212, '#ffffff', 1, '#100810');
  else drawText(ctx, `CREDIT ${a.credits}`, 304, 212, '#ffffff', 1, '#100810');
  if (a.practice) drawText(ctx, 'PRÁCTICA ½×', 8, 212, '#60f060', 1, '#100810');
}

function bubble(ctx, f) {
  const c = f.ui.caller;
  if (!c || performance.now() - c.at > 2400) return;
  const head = f.couples[f.caller].lead.j.head, p = cam.project({ ...head, z: head.z + 0.5 });
  const text = '¡ENCHUFLA DOBLE!', w = textWidth(text) + 10, h = 13;
  const x = Math.round(Math.max(2, Math.min(W - w - 2, p.x - w / 2))), y = Math.round(Math.max(48, p.y - h - 4));
  ctx.fillStyle = '#100810'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h);
  for (let k = 0; k < 4; k++) { ctx.fillStyle = '#100810'; ctx.fillRect(Math.round(p.x) - 1 - k, y + h + k, 2 * k + 3, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x) - k, y + h + k - 1, 2 * k + 1, 1); }
  drawText(ctx, text, x + 5, y + 3, '#d82030', 1, null);
}

// ------------------------------------------------------------------ scene
let sparks = [];
function scene(ctx, f, dt) {
  const a = f.arcade;
  for (const e of f.events) if (e.type === 'complete') cheerUntil = f.beat + 4;
  const img = new ImageData(new Uint8ClampedArray(bg.data), W, H), out = new Uint32Array(img.data.buffer);
  for (const c of f.couples) for (const b of [c.lead, c.follow]) shadow(out, W, H, cam, b.j.pelvis, 0.28 + (b.flare || 0) * 0.1, 0.22);
  spr.clear();
  drawCrowd(f);
  const list = [];
  f.couples.forEach((c, i) => { list.push({ b: c.lead, look: LOOKS[i].lead }); list.push({ b: c.follow, look: LOOKS[i].follow }); });
  list.sort((p, q) => cam.project(q.b.j.pelvis).depth - cam.project(p.b.j.pelvis).depth);
  for (const d of list) if (cam.project(d.b.j.pelvis).depth > 0.5) drawDancer(spr, d.b, cam, d.look, { face: true });
  spr.commit(out);
  ctx.putImageData(img, 0, 0);

  // Sparks on good hits, flames at your feet when the SABOR bar is full.
  const you = f.couples[f.player.couple][f.player.role];
  const yp = cam.project(you.j.head), fp = cam.project({ ...you.j.pelvis, z: 0 });
  for (const e of f.events) {
    if ((e.type === 'judge' && e.grade !== 'miss') || e.type === 'complete') {
      for (let k = 0; k < (e.type === 'complete' ? 80 : 26); k++) sparks.push({ x: yp.x, y: yp.y + 30, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 180 - 40, g: 260, life: 1.1, c: ['#fff080', '#f8b000', '#ffffff', '#ff6060'][k % 4] });
    }
  }
  if (a.heat >= 0.99 && a.state === 'play') for (let k = 0; k < 3; k++) sparks.push({ x: fp.x + (Math.random() - 0.5) * 40, y: fp.y, vx: 0, vy: -40 - Math.random() * 50, g: -30, life: 0.6, c: ['#fff080', '#f8b000', '#e04000'][k] });
  sparks = sparks.filter((s) => (s.life -= dt) > 0);
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.g * dt; ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2); }

  if (a.state === 'play' || a.state === 'ready') {
    const bob = Math.round(f.pulse * 2), m = cam.project({ ...you.j.head, z: you.j.head.z + 0.28 });
    drawText(ctx, '▼', m.x - 2, m.y - 6 - bob, '#f8d800', 1, '#100810');
    drawText(ctx, '1P', m.x - 5, m.y - 15 - bob, '#f8d800', 1, '#100810');
  }
  hudTop(ctx, f);
  hudBottom(ctx, f);
  bubble(ctx, f);

  const j = f.ui.judge, age = j ? (performance.now() - j.at) / 1000 : 9;
  if (a.state === 'play' && a.age > 1.3 && age < (j?.cls === 'complete' ? 1.8 : 0.9)) {
    const pop = age < 0.08 ? 1 : 0;
    if (j.cls === 'complete') { if (a.blink(6) || age > 0.5) big(ctx, j.text, 74, 4 + pop); }
    else big(ctx, j.text, 60 - Math.round(Math.min(age, 0.25) * 24), 3, j.cls === 'miss' ? ['#ffffff', '#c0c0c0', '#a0a0a0', '#808080', '#606060', '#404040', '#303030'] : GOLD);
  }
  if (a.state === 'ready') big(ctx, 'ROUND 1', 78, 4);
  if (a.state === 'play' && a.age < 1.3) big(ctx, '¡BAILA!', 70, 6);
  if (a.state === 'attract' && a.blink(1)) big(ctx, 'INSERT COIN', 188, 2, ['#ffffff', '#ffffff', '#e0e0f0', '#c0c0e0', '#a0a0d0', '#8080c0', '#6060a0'], 0);
  if (a.state === 'over') {
    big(ctx, a.age < 2 ? 'TIME OVER' : 'GAME OVER', 74, 4);
    if (a.newHi && a.blink(2)) big(ctx, 'NEW RECORD!', 116, 2);
  }
}

// ------------------------------------------------------------------ pages
// Head-and-shoulders portraits, drawn as sprites into a w x h box at (x, y).
function portrait(s, x, y, who) {
  const P = (px, py) => ({ x: x + px, y: y + py, s: 1 });
  const lead = who === 'lead', look = LOOKS[0][who];
  s.ctx.save();
  s.ctx.beginPath(); s.ctx.rect(x, y, 72, 80); s.ctx.clip();
  s.poly([P(4, 80), P(12, 60), P(60, 60), P(68, 80)], lead ? look.shirt : look.dress);
  if (!lead) { s.blob(P(36, 38), 22, look.hair); s.blob(P(52, 18), 9, look.hair); }
  s.chain([P(36, 52), P(36, 64)], [15], look.skin);
  if (lead) s.poly([P(26, 60), P(36, 70), P(46, 60), P(42, 58), P(36, 64), P(30, 58)], R.white);
  s.blob(P(36, 40), 17, look.skin);
  if (!lead) s.blob(P(36, 27), 15, look.hair, false);
  s.ctx.restore();
  const r = (c, px, py, w, h) => { s.ctx.fillStyle = c; s.ctx.fillRect(x + px, y + py, w, h); };
  r('#ffffff', 27, 39, 5, 3); r('#ffffff', 40, 39, 5, 3);
  r('#100810', 29, 39, 2, 3); r('#100810', 42, 39, 2, 3);
  r(look.hair[0], 26, 35, 7, 2); r(look.hair[0], 39, 35, 7, 2);
  r(look.skin[0], 35, 42, 2, 5);
  if (lead) {
    r(look.hair[1], 30, 48, 12, 2);
    r('#801020', 32, 51, 8, 2);
    s.poly([P(10, 26), P(62, 26), P(58, 30), P(14, 30)], look.hat);
    s.poly([P(22, 26), P(24, 9), P(48, 9), P(50, 26)], look.hat);
    r(look.band[1], 23, 20, 26, 4);
  } else {
    r('#c01030', 31, 50, 10, 2); r('#ff6070', 33, 50, 6, 1);
    r(look.hair[0], 26, 36, 1, 1);
    s.blob(P(56, 15), 6, look.flower); r('#fff080', 55, 14, 2, 2);
    s.blob(P(19, 47), 2.5, R.gold, false); s.blob(P(53, 47), 2.5, R.gold, false);
  }
}

function backdrop(ctx) {
  for (let y = 0; y < H; y++) { ctx.fillStyle = `rgb(${16 + y / 10}, ${12 + y / 14}, ${48 + y / 3})`; ctx.fillRect(0, y, W, 1); }
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

function titlePage(ctx, f) {
  const a = f.arcade;
  ctx.putImageData(bg, 0, 0);
  ctx.fillStyle = 'rgba(16, 8, 30, 0.55)'; ctx.fillRect(0, 0, W, H);
  big(ctx, 'RUEDA', 46, 9, GOLD, 0.22);
  centerText(ctx, 'CASINO CHAMPION EDITION', 116, '#ffffff', 1, '#100810');
  centerText(ctx, 'THE WORLD RUEDA TOURNAMENT', 128, '#ff8080', 1, '#100810');
  if (a.blink(1)) big(ctx, 'INSERT COIN', 160, 2, ['#ffffff', '#ffffff', '#e0e0f0', '#c0c0e0', '#a0a0d0', '#8080c0', '#6060a0'], 0);
  centerText(ctx, '(C) HAVANA 1992', 196, '#ffffff', 1, '#100810');
  drawText(ctx, `CREDIT ${a.credits}`, 304, 212, '#ffffff', 1, '#100810');
  drawText(ctx, 'HI', 8, 212, '#f8d800', 1, '#100810'); drawText(ctx, String(a.hi), 22, 212, '#ffffff', 1, '#100810');
}

const selSpr = new Sprites(W, H, Object.values(R), { outline: '#100810', shade: 2 });
function selectPage(ctx, f) {
  const a = f.arcade;
  backdrop(ctx);
  big(ctx, 'PLAYER SELECT', 8, 2);
  centerText(ctx, String(a.selectLeft), 30, a.selectLeft <= 3 ? '#ff4040' : '#ffffff', 2, '#100810');
  const boxes = { lead: 112, follow: 200 };
  for (const [role, x] of Object.entries(boxes)) {
    ctx.fillStyle = role === 'lead' ? '#801828' : '#481878'; ctx.fillRect(x, 120, 72, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let yy = 122; yy < 200; yy += 3) ctx.fillRect(x, yy, 72, 1);
  }
  selSpr.clear();
  const img0 = ctx.getImageData(0, 0, W, H);
  // Full-size dancers on the sides, portraits in the middle.
  const lead = solo('lead', f.beat), follow = solo('follow', f.beat);
  drawDancer(selSpr, lead, frontCam(56, 214, 98, lead.j.pelvis.x, lead.j.pelvis.y), LOOKS[0].lead, { face: true });
  drawDancer(selSpr, follow, frontCam(328, 214, 98, follow.j.pelvis.x, follow.j.pelvis.y), LOOKS[0].follow, { face: true });
  portrait(selSpr, boxes.lead, 120, 'lead');
  portrait(selSpr, boxes.follow, 120, 'follow');
  selSpr.commit(new Uint32Array(img0.data.buffer));
  ctx.putImageData(img0, 0, 0);
  for (const [role, x] of Object.entries(boxes)) {
    const on = a.cursor === role;
    ctx.strokeStyle = on ? (a.blink(4) ? '#ff2020' : '#ffffff') : '#605070';
    ctx.lineWidth = on ? 3 : 1;
    ctx.strokeRect(x - 0.5 - (on ? 1 : 0), 119.5 - (on ? 1 : 0), 73 + (on ? 2 : 0), 81 + (on ? 2 : 0));
    if (on) drawText(ctx, '1P', x + 2, 110, a.blink(4) ? '#ff2020' : '#ffffff', 1, '#100810');
    const name = NAMES[role];
    drawText(ctx, name, x + 36 - textWidth(name) / 2, 204, on ? '#f8d800' : '#c0b0d0', 1, '#100810');
    drawText(ctx, role.toUpperCase(), x + 36 - textWidth(role.toUpperCase()) / 2, 214, '#ffffff', 1, '#100810');
  }
  centerText(ctx, '◄ ►  PUSH BUTTON', 92, '#ffffff', 1, '#100810');
}

function draw(ctx, f, dt) {
  const a = f.arcade;
  if (a.state === 'attract' && a.page === 'title') return titlePage(ctx, f);
  if (a.state === 'select') return selectPage(ctx, f);
  scene(ctx, f, dt);
}

function marquee(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#401030'); g.addColorStop(1, '#100818');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const m = new Sprites(w, h, Object.values(R), { outline: '#100810', shade: 2 });
  const lead = solo('lead', 2.2), follow = solo('follow', 2.2);
  drawDancer(m, lead, frontCam(30, h - 2, 24, lead.j.pelvis.x, lead.j.pelvis.y), LOOKS[0].lead);
  drawDancer(m, follow, frontCam(w - 30, h - 2, 24, follow.j.pelvis.x, follow.j.pelvis.y), LOOKS[0].follow);
  const img = ctx.getImageData(0, 0, w, h);
  m.commit(new Uint32Array(img.data.buffer));
  ctx.putImageData(img, 0, 0);
  centerText(ctx, 'RUEDA', 6, GOLD, 4, '#100810', { italic: 0.22, shadow: '#100810' });
  centerText(ctx, 'CASINO CHAMPION EDITION', 38, '#ffffff', 1, '#100810');
}

new Arcade({ W, H, era: '92', flavor: 'fm', couples: 4, ringOffset: -90, radius: RADIUS, callerCouple: 1, draw, marquee, marqueeSize: [240, 48] });
