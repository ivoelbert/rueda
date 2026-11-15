// Pixel: the rueda in a Havana plaza at night, rendered at 240 lines.
// The plaza is ray-cast per pixel with ordered dithering; the dancers come
// from the same 3D skeletons as every version, drawn with outlines and then
// snapped to a fixed palette so they read as hand-made sprites.
import { Game } from '../shared/game.js';
import { D } from '../shared/dance.js';
import { drawText, textWidth } from '../shared/font.js';

const RADIUS = 1.45;
const game = (window.game = new Game({ couples: 4, ringOffset: -135, radius: RADIUS, subtitle: 'Pixel · Havana plaza' }));

let BH = 240;
const EL = (34 * Math.PI) / 180, SE = Math.sin(EL), CE = Math.cos(EL);
const WALL_Y = 5.4;
let BW, F;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const layer = document.createElement('canvas');
const lctx = layer.getContext('2d', { willReadFrequently: true });
let bg = null, bgKey = '';

function resize() {
  // 240 pixels on the short side; portrait phones get a taller buffer.
  const aspect = innerWidth / innerHeight;
  if (aspect >= 1) { BH = 240; BW = Math.round(BH * aspect); } else { BW = 240; BH = Math.round(BW / aspect); }
  F = Math.min(BW, BH) * 1.5;
  canvas.width = layer.width = BW;
  canvas.height = layer.height = BH;
  bgKey = '';
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ palette
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pack = ([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r;
const RAMPS = {
  sky: ['#0b0a1f', '#141238', '#1f1850', '#2e1f66', '#45277a', '#6a3283'],
  tileL: ['#4a3d5c', '#7d6c8a', '#b8a9bf', '#efe2cf'],
  tileD: ['#120e1c', '#1f1830', '#2e2444', '#43355a'],
  border: ['#4a1f22', '#8a3a2c', '#c46a3c', '#e89a5a'],
  cobble: ['#17121f', '#2a2236', '#3e3449', '#56495e', '#76667a'],
  mortar: ['#0e0b14', '#17121f', '#211a2b'],
  lit: ['#5a2a10', '#c46a1e', '#ffb347', '#ffe08a'],
  dark: ['#0d0a12', '#16202a', '#22313c'],
  shutter: ['#0f2a2a', '#1d4a45', '#2f6e62'],
  rail: ['#0d0a12', '#1b1622'],
  facades: [
    ['#4a1f38', '#8c3d5e', '#c8638a', '#f093b0'],
    ['#12393f', '#226b6b', '#3a9e94', '#6fd1bd'],
    ['#4d3812', '#8c6a1f', '#c99a2e', '#f4cc5a'],
    ['#2f2552', '#53458f', '#8670c4', '#b39ce8'],
    ['#4d2a1d', '#8c4f33', '#c87d55', '#f0aa7e'],
  ],
};
for (const k of Object.keys(RAMPS)) RAMPS[k] = k === 'facades' ? RAMPS[k].map((r) => r.map((c) => pack(hex(c)))) : RAMPS[k].map((c) => pack(hex(c)));

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const shade = (ramp, b, px, py) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(b * (ramp.length - 1) + BAYER[((py & 3) << 2) | (px & 3)])))];
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ------------------------------------------------------------------- camera
const cam = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, d: 0 };
function aimCamera(frame, dt) {
  let t = { tx: 0, ty: 0.6, tz: 0.6, d: 8.5 };
  if (frame.cam === 'close') {
    const c = frame.couples[frame.player.couple];
    t = { tx: (c.lead.j.pelvis.x + c.follow.j.pelvis.x) / 2, ty: (c.lead.j.pelvis.y + c.follow.j.pelvis.y) / 2, tz: 0.85, d: 4.6 };
  }
  const k = cam.d ? 1 - Math.exp(-dt * 4) : 1;
  for (const key of ['tx', 'ty', 'tz', 'd']) cam[key] += (t[key] - cam[key]) * k;
  cam.x = cam.tx; cam.y = cam.ty - CE * cam.d; cam.z = cam.tz + SE * cam.d;
}
function project(p) {
  const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z;
  const zc = dy * CE - dz * SE, yc = dy * SE + dz * CE;
  const s = F / zc;
  return { x: BW / 2 + dx * s, y: BH * 0.47 - yc * s, s, depth: zc };
}

// --------------------------------------------------------------- background
function renderBackground() {
  const key = [BW, cam.x, cam.y, cam.z].map((v) => v.toFixed(3)).join();
  if (key === bgKey) return;
  bgKey = key;
  bg = new ImageData(BW, BH);
  const out = new Uint32Array(bg.data.buffer);
  for (let py = 0; py < BH; py++) {
    const v = BH * 0.47 - py;
    const dy = CE * F + SE * v, dz = -SE * F + CE * v;
    for (let px = 0; px < BW; px++) {
      const dx = px - BW / 2;
      let c;
      const tg = dz < 0 ? -cam.z / dz : Infinity;
      const gy = cam.y + dy * tg;
      if (tg < Infinity && gy < WALL_Y) {
        c = floor(cam.x + dx * tg, gy, px, py);
      } else {
        const tw = (WALL_Y - cam.y) / dy;
        const wx = cam.x + dx * tw, wz = cam.z + dz * tw;
        c = wall(wx, wz, px, py);
        if (c === 0) c = sky(dx, dy, dz, px, py);
      }
      out[py * BW + px] = c;
    }
  }
}

function floor(x, y, px, py) {
  const r = Math.hypot(x, y);
  const light = 1 - Math.min(1, r / 11) + 0.08 * Math.cos(x * 0.6);
  if (r < 3.25) {
    const odd = (Math.floor(x / 0.5) + Math.floor(y / 0.5)) & 1;
    return shade(odd ? RAMPS.tileD : RAMPS.tileL, light * 1.05, px, py);
  }
  if (r < 3.5) return shade(RAMPS.border, light, px, py);
  const row = Math.floor(y / 0.3), x2 = x + (row & 1) * 0.18, col = Math.floor(x2 / 0.36);
  const fx = x2 / 0.36 - col, fy = y / 0.3 - row;
  if (fx < 0.12 || fy < 0.14) return shade(RAMPS.mortar, light, px, py);
  return shade(RAMPS.cobble, light * (0.8 + 0.35 * hash(col, row)), px, py);
}

function wall(x, z, px, py) {
  if (z < 0) return RAMPS.mortar[0];
  const u0 = x + 200, bi = Math.floor(u0 / 4.5), u = u0 - bi * 4.5;
  const height = 5.4 + hash(bi, 7) * 1.8;
  if (z > height) return 0;
  const ramp = RAMPS.facades[Math.floor(hash(bi, 3) * 5)];
  const base = 0.85 - z / 12;
  if (z > height - 0.35) return shade(ramp, 0.95, px, py); // cornice
  if (z > height - 0.45) return ramp[0];
  const bay = Math.floor(u / 1.5), bu = u - bay * 1.5;
  if (bu < 0.09 || bu > 1.41) return shade(ramp, base - 0.25, px, py); // pilasters
  const lit = hash(bi * 7 + bay, Math.floor(z / 2.6)) > 0.45;
  const c = bu - 0.75;
  if (z < 2.5) {
    if (Math.abs(c) < 0.5 && (z < 1.85 || c * c + (z - 1.85) ** 2 < 0.25)) {
      return lit ? shade(RAMPS.lit, 0.35 + (1.85 - z) * 0.25, px, py) : shade(RAMPS.dark, 0.3, px, py);
    }
    return shade(ramp, base, px, py);
  }
  if (z < 2.62) return shade(ramp, 0.25, px, py); // balcony slab
  if (z < 3.2) { // balcony railing
    if (z > 3.1 || ((u * 9) % 1) < 0.25) return RAMPS.rail[(z > 3.1) | 0];
  }
  if (z > 2.95 && z < 4.5 && Math.abs(c) < 0.33) {
    if (lit) return shade(RAMPS.lit, 0.55 + (4.5 - z) * 0.2, px, py);
    return shade(RAMPS.shutter, ((z * 7) % 1) < 0.3 ? 0.2 : 0.75, px, py);
  }
  if (z > 4.5 && z < 4.62 && Math.abs(c) < 0.42) return shade(ramp, 0.98, px, py); // lintel
  return shade(ramp, base, px, py);
}

function sky(dx, dy, dz, px, py) {
  const el = Math.atan2(dz, Math.hypot(dx, dy)), az = Math.atan2(dx, dy);
  const sx = Math.floor(az * 260), sy = Math.floor(el * 260);
  if (hash(sx, sy) > 0.992) return pack(hash(sy, sx) > 0.5 ? [255, 255, 255] : [190, 190, 255]);
  const mx = az - 0.42, my = el - 0.36;
  if (mx * mx + my * my < 0.0016) return pack(mx * mx + (my - 0.012) ** 2 < 0.0012 ? [255, 240, 200] : [200, 190, 160]);
  return shade(RAMPS.sky, 1 - Math.min(1, Math.max(0, el / 0.55)), px, py);
}

// --------------------------------------------------------------- characters
const OUTLINE = '#14101e';
const SKIN = ['#8d5524', '#c68642', '#5c3a21', '#e0ac69', '#7a4b2a', '#a86b3c', '#4a2e1a', '#d49a6a'];
const DRESS = [['#e83b3b', '#ff7a6a'], ['#f4cc5a', '#fff09a'], ['#2bb3a8', '#7ff0dd'], ['#9b4fd1', '#d79bff']];
const SHIRT = ['#f4ecd8', '#f4ecd8', '#9fd8f0', '#f4ecd8'];
const PANTS = ['#2b2a4a', '#efe3c4', '#2b2a4a', '#5a3a2a'];
const HAIR = '#1e1218';
const CHAR_PALETTE = [OUTLINE, ...SKIN, ...DRESS.flat(), ...SHIRT, ...PANTS, HAIR, '#e8c070', '#7a3a1a', '#ffffff', '#ff4d6d', '#2f6e3a', '#4fa45a', '#6b4a2a', '#9a6b3a', '#d6d0c0'].map(hex);
const nearest = new Map();
function snap(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  let v = nearest.get(key);
  if (v === undefined) {
    let best = 1e9;
    for (const c of CHAR_PALETTE) {
      const d = (c[0] - r) ** 2 * 0.3 + (c[1] - g) ** 2 * 0.59 + (c[2] - b) ** 2 * 0.11;
      if (d < best) { best = d; v = pack(c); }
    }
    nearest.set(key, v);
  }
  return v;
}

function chain(points, widths, color) {
  // Outline pass, then fill, so joints inside one limb show no seams.
  lctx.lineCap = 'round';
  lctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], s = (a.s + b.s) / 2;
      lctx.strokeStyle = pass ? (Array.isArray(color) ? color[i] : color) : OUTLINE;
      lctx.lineWidth = Math.max(1.5, widths[i] * s) + (pass ? 0 : 2);
      lctx.beginPath(); lctx.moveTo(a.x, a.y); lctx.lineTo(b.x, b.y); lctx.stroke();
    }
  }
}

function blob(p, r, color) {
  for (const pass of [0, 1]) {
    lctx.fillStyle = pass ? color : OUTLINE;
    lctx.beginPath(); lctx.arc(p.x, p.y, Math.max(1, r * p.s) + (pass ? 0 : 1), 0, Math.PI * 2); lctx.fill();
  }
}

function poly(pts, color, outline = true) {
  const path = () => { lctx.beginPath(); pts.forEach((p, i) => (i ? lctx.lineTo(p.x, p.y) : lctx.moveTo(p.x, p.y))); lctx.closePath(); };
  if (outline) { path(); lctx.strokeStyle = OUTLINE; lctx.lineWidth = 2; lctx.lineJoin = 'round'; lctx.stroke(); }
  path(); lctx.fillStyle = color; lctx.fill();
}

function hull(points) {
  const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

const DEG = Math.PI / 180;
function drawDancer(b, look) {
  const j = b.j, P = {};
  for (const k of Object.keys(j)) P[k] = project(j[k]);
  const head = j.head, yaw = b.headYaw * DEG;
  const parts = [];
  const lead = b.role === 'lead';
  const legColor = lead ? look.pants : look.skin;
  for (const s of ['L', 'R']) {
    parts.push({ z: P['knee' + s].depth + 0.3, draw: () => {
      chain([P['hip' + s], P['knee' + s], P['ankle' + s]], [0.15, 0.12], lead ? legColor : [look.skin, look.skin]);
      chain([P['ankle' + s], P['toe' + s]], [0.1], lead ? '#2a1a14' : look.dress[0]);
    } });
  }
  parts.sort((p, q) => q.z - p.z);
  if (!lead) {
    parts.push({ z: P.pelvis.depth + 1, draw: () => {
      const f = b.flare, spin = b.th * DEG * 1.4, pts = [];
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const rr = (0.24 + f * 0.22) * (1 + 0.07 * Math.sin(a * 6 + spin));
        pts.push(project({ x: j.pelvis.x + Math.cos(a) * rr, y: j.pelvis.y + Math.sin(a) * rr, z: 0.5 + f * 0.14 - 0.03 * Math.cos(a * 6 + spin) }));
        pts.push(project({ x: j.pelvis.x + Math.cos(a) * 0.15, y: j.pelvis.y + Math.sin(a) * 0.15, z: j.pelvis.z + 0.05 }));
      }
      poly(hull(pts), look.dress[0]);
      // Hem highlight on the side facing the camera.
      lctx.fillStyle = look.dress[1];
      for (let k = 0; k < 32; k += 2) if (pts[k].depth < P.pelvis.depth) lctx.fillRect(Math.round(pts[k].x), Math.round(pts[k].y) - 1, 1, 1);
    } });
  }
  const rest = [];
  rest.push({ z: P.chest.depth, draw: () => {
    const torso = [P.shL, P.shR, P.hipR, P.hipL];
    poly(hull(torso.concat([P.neck, P.pelvis])), lead ? look.shirt : look.dress[0]);
    chain([P.pelvis, P.neck], [lead ? 0.26 : 0.22], lead ? look.shirt : look.dress[0]);
    if (lead) {
      // Guayabera pleats.
      lctx.fillStyle = '#d6d0c0';
      for (const t of [0.35, 0.65]) {
        const a = { x: P.shL.x + (P.shR.x - P.shL.x) * t, y: P.shL.y + (P.shR.y - P.shL.y) * t + 2 };
        const c = { x: P.hipL.x + (P.hipR.x - P.hipL.x) * t, y: P.hipL.y + (P.hipR.y - P.hipL.y) * t - 1 };
        if (Math.abs(P.shR.x - P.shL.x) > 5) { lctx.fillRect(Math.round(a.x), Math.round(a.y), 1, Math.max(1, Math.round(c.y - a.y))); }
      }
    } else {
      // Bodice straps.
      chain([P.shL, P.chest], [0.05], look.dress[1]);
      chain([P.shR, P.chest], [0.05], look.dress[1]);
    }
  } });
  for (const s of ['L', 'R']) {
    rest.push({ z: P['el' + s].depth, draw: () => {
      chain([P['sh' + s], P['el' + s], P['wr' + s]], [0.1, 0.085], lead ? [look.shirt, look.skin] : look.skin);
      blob(P['wr' + s], 0.045, look.skin);
    } });
  }
  rest.push({ z: P.head.depth - 0.25, draw: () => {
    chain([P.neck, project({ ...head, z: head.z - 0.06 })], [0.09], look.skin);
    const back = { x: head.x - Math.cos(yaw) * 0.08, y: head.y - Math.sin(yaw) * 0.08, z: head.z + 0.03 };
    if (!lead) blob(project({ ...back, z: back.z + 0.03 }), 0.07, HAIR);
    blob(P.head, b.P.headR, look.skin);
    // Hair cap behind the face, eyes when the face points at the camera.
    const toCam = { x: cam.x - head.x, y: cam.y - head.y };
    const facing = Math.cos(yaw) * toCam.x + Math.sin(yaw) * toCam.y > 0;
    const hb = project({ x: head.x - Math.cos(yaw) * 0.05, y: head.y - Math.sin(yaw) * 0.05, z: head.z + 0.06 });
    lctx.fillStyle = HAIR;
    lctx.beginPath(); lctx.arc(hb.x, hb.y, b.P.headR * hb.s * 0.85, Math.PI, 0); lctx.fill();
    if (facing) {
      lctx.fillStyle = OUTLINE;
      for (const sd of [1, -1]) {
        const e = project({ x: head.x + Math.cos(yaw) * 0.1 - Math.sin(yaw) * sd * 0.04, y: head.y + Math.sin(yaw) * 0.1 + Math.cos(yaw) * sd * 0.04, z: head.z + 0.01 });
        lctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
      }
    }
    if (lead) {
      const brim = [];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        brim.push(project({ x: head.x + Math.cos(a) * 0.17, y: head.y + Math.sin(a) * 0.17, z: head.z + 0.07 }));
      }
      poly(brim, '#e8c070');
      const base = project({ ...head, z: head.z + 0.08 }), band = project({ ...head, z: head.z + 0.11 });
      chain([base, band], [0.17], '#7a3a1a');
      chain([band, project({ ...head, z: head.z + 0.17 })], [0.16], '#e8c070');
    } else {
      blob(project({ x: back.x - Math.sin(yaw) * 0.06, y: back.y + Math.cos(yaw) * 0.06, z: back.z + 0.08 }), 0.035, '#ff4d6d');
    }
  } });
  rest.sort((p, q) => q.z - p.z);
  for (const p of parts.concat(rest)) p.draw();
}

function drawPalm(x, y) {
  const base = project({ x, y, z: 0 });
  const pot = [project({ x: x - 0.3, y, z: 0 }), project({ x: x + 0.3, y, z: 0 }), project({ x: x + 0.38, y, z: 0.5 }), project({ x: x - 0.38, y, z: 0.5 })];
  const trunk = [0, 1, 2, 3, 4].map((k) => project({ x: x + Math.sin(k * 0.4) * 0.15, y, z: 0.5 + k * 0.75 }));
  chain(trunk, [0.2, 0.18, 0.17, 0.16], ['#6b4a2a', '#9a6b3a', '#6b4a2a', '#9a6b3a']);
  const top = trunk[4];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2, pts = [top];
    for (let s = 1; s <= 4; s++) pts.push(project({ x: x + Math.sin(0.8) * 0.15 + Math.cos(a) * s * 0.4, y: y + Math.sin(a) * s * 0.4, z: 3.5 - s * s * 0.09 + 0.15 }));
    chain(pts, [0.16, 0.13, 0.1, 0.06], k % 2 ? '#2f6e3a' : '#4fa45a');
  }
  poly(pot, '#c46a3c');
  return base;
}

// ------------------------------------------------------------- frame + HUD
const sparks = [];
const LOOKS = [0, 1, 2, 3].map((i) => ({
  lead: { skin: SKIN[i * 2], shirt: SHIRT[i], pants: PANTS[i] },
  follow: { skin: SKIN[i * 2 + 1], dress: DRESS[i] },
}));
const PALMS = [[-4.6, 3.6], [4.6, 3.6], [-5.6, -0.8], [5.6, -0.8]];

function shadow(out, p, r) {
  const c = project({ x: p.x, y: p.y, z: 0 });
  const rx = r * c.s, ry = r * c.s * SE * 1.2;
  for (let y = Math.floor(c.y - ry); y <= c.y + ry; y++) {
    if (y < 0 || y >= BH) continue;
    for (let x = Math.floor(c.x - rx); x <= c.x + rx; x++) {
      if (x < 0 || x >= BW || ((x + y) & 1)) continue;
      if (((x - c.x) / rx) ** 2 + ((y - c.y) / ry) ** 2 > 1) continue;
      const i = y * BW + x, v = out[i];
      out[i] = (255 << 24) | (((v >> 17) & 0x7f) << 16) | (((v >> 9) & 0x7f) << 8) | ((v >> 1) & 0x7f);
    }
  }
}

function hud(frame) {
  drawText(ctx, 'SCORE', 6, 5, '#5fc7b8');
  drawText(ctx, String(frame.score).padStart(6, '0'), 6, 14, '#ffffff', 2);
  if (frame.combo > 1) drawText(ctx, `${frame.combo}× COMBO`, 6, 31, '#f4cc5a');
  // On narrow (portrait) screens the beat row moves below the score.
  const bw = 13, x0 = Math.round(BW / 2 - (8 * bw + 7 * 2) / 2), by = BW < 330 ? 40 : 4;
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * (bw + 2), on = frame.count === i + 1;
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 1, by, bw + 2, bw + 2);
    ctx.fillStyle = on ? '#f4cc5a' : i === 0 || i === 4 ? '#8a1c2c' : '#24195a';
    ctx.fillRect(x, by + 1, bw, bw);
    drawText(ctx, String(i + 1), x + 4, by + 4, on ? '#14101e' : '#b8a9bf', 1, null);
  }
  const phase = frame.ui.phase.replace(/\s+/g, ' ');
  drawText(ctx, phase, BW / 2 - textWidth(phase) / 2, by + 19, '#5fc7b8');

  const j = frame.ui.judge;
  if (j) {
    const age = (performance.now() - j.at) / 1000, life = j.cls === 'complete' ? 1.6 : 1;
    if (age < life) {
      const sc = age < 0.08 ? 4 : age < 0.18 ? 3 : 3;
      const color = { perfect: '#7ff0dd', great: '#ff7a6a', good: '#ffffff', miss: '#e83b3b', complete: '#f4cc5a' }[j.cls] || '#fff';
      if (Math.floor(age * 12) % 2 === 0 || age < 0.5) drawText(ctx, j.text, BW / 2 - textWidth(j.text, sc) / 2, BH * 0.3 - age * 10, color, sc);
    }
  }
}

function callerBubble(frame) {
  const c = frame.ui.caller;
  if (!c || performance.now() - c.at > 2400) return;
  const head = frame.couples[frame.caller].lead.j.head;
  const p = project({ ...head, z: head.z + 0.45 });
  const text = c.text, w = textWidth(text) + 8, h = 13;
  const x = Math.round(Math.min(BW - w - 2, Math.max(2, p.x - w / 2))), y = Math.round(p.y - h - 4);
  ctx.fillStyle = OUTLINE; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h);
  for (let k = 0; k < 4; k++) { ctx.fillStyle = OUTLINE; ctx.fillRect(Math.round(p.x) - k - 1, y + h + k, 2 * k + 3, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x) - k, y + h + k - 1, 2 * k + 1, 1); }
  drawText(ctx, text, x + 4, y + 3, '#e83b3b', 1, null);
}

let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const frame = game.update();
  aimCamera(frame, dt);
  renderBackground();

  const img = new ImageData(new Uint8ClampedArray(bg.data), BW, BH);
  const out = new Uint32Array(img.data.buffer);
  for (const c of frame.couples) { shadow(out, c.lead.j.pelvis, 0.26); shadow(out, c.follow.j.pelvis, 0.26 + c.follow.flare * 0.12); }

  // Dancers and palms, far to near, onto the sprite layer.
  lctx.clearRect(0, 0, BW, BH);
  const items = PALMS.map(([x, y]) => ({ depth: project({ x, y, z: 0 }).depth, draw: () => drawPalm(x, y) }));
  frame.couples.forEach((c, i) => {
    items.push({ depth: project(c.lead.j.pelvis).depth, draw: () => drawDancer(c.lead, LOOKS[i].lead) });
    items.push({ depth: project(c.follow.j.pelvis).depth, draw: () => drawDancer(c.follow, LOOKS[i].follow) });
  });
  items.sort((a, b) => b.depth - a.depth);
  for (const it of items) it.draw();

  // Snap the sprite layer to the palette with hard alpha, then composite.
  const spr = lctx.getImageData(0, 0, BW, BH).data;
  for (let i = 0, k = 0; i < out.length; i++, k += 4) if (spr[k + 3] > 120) out[i] = snap(spr[k], spr[k + 1], spr[k + 2]);
  ctx.putImageData(img, 0, 0);

  // String lights blink around the beat.
  const n = Math.floor(frame.beat);
  const bulbs = ['#f4cc5a', '#e83b3b', '#4fa45a', '#5fc7b8'];
  for (const [y0, z0] of [[5.6, 4.9], [2.4, 4.6], [-0.9, 4.4]]) {
    for (let k = 0; k <= 48; k++) {
      const x = -7 + k * 0.29, sag = 0.7 * (1 - ((x / 7) ** 2));
      const p = project({ x, y: y0, z: z0 - sag });
      if (p.depth < 0.5) continue;
      ctx.fillStyle = '#0d0a12';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      if (k % 2) continue;
      const on = ((k >> 1) + n) % 3 === 0;
      ctx.fillStyle = on ? bulbs[(k >> 1) % 4] : '#3a2a40';
      const sz = p.s > 40 ? 2 : 1;
      ctx.fillRect(Math.round(p.x), Math.round(p.y) + 1, sz, sz);
    }
  }

  // YOU marker.
  const you = frame.couples[frame.player.couple][frame.player.role];
  const yp = project({ ...you.j.head, z: you.j.head.z + 0.3 });
  const bob = Math.round(frame.pulse * 2);
  drawText(ctx, '▼', yp.x - 2, yp.y - 4 - bob, '#f4cc5a');
  drawText(ctx, 'YOU', yp.x - 8, yp.y - 13 - bob, '#f4cc5a');

  for (const e of frame.events) {
    if (e.type === 'judge' && e.grade !== 'miss' || e.type === 'complete') {
      const n2 = e.type === 'complete' ? 70 : 30;
      for (let k = 0; k < n2; k++) sparks.push({ x: yp.x, y: yp.y + 20, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140 - 20, life: 1, c: bulbs[k % 4] });
    }
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 220 * dt;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
  }

  callerBubble(frame);
  hud(frame);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
