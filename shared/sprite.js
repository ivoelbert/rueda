// Sprite rasterizer for the arcade cabinets. Dancers come from the shared 3D
// skeleton: limbs are drawn as canvas strokes on a low-res layer, then every
// covered pixel is snapped to a fixed palette, so they read as pixel sprites.
//
// A color is either one CSS hex string or a [dark, mid, light] ramp. `shade`
// picks how many tones a sprite uses: 0 flat, 1 two-tone, 2 three-tone.
const DEG = Math.PI / 180;
export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const tone = (c, i) => (typeof c === 'string' ? c : c[Math.min(i, c.length - 1)]);
const LIGHT = { x: -0.6, y: -0.8 }; // light from the upper left of the screen

export class Sprites {
  constructor(W, H, colors, { outline = '#000000', shade = 0, line = 1 } = {}) {
    this.W = W; this.H = H; this.outline = outline; this.shade = shade; this.line = line;
    this.layer = document.createElement('canvas');
    this.layer.width = W; this.layer.height = H;
    this.ctx = this.layer.getContext('2d', { willReadFrequently: true });
    this.palette = [outline, ...new Set(colors.flat())].map(hex);
    this.nearest = new Map();
  }

  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  snap(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let v = this.nearest.get(key);
    if (v === undefined) {
      let best = Infinity;
      for (const c of this.palette) {
        const d = (c[0] - r) ** 2 * 0.3 + (c[1] - g) ** 2 * 0.59 + (c[2] - b) ** 2 * 0.11;
        if (d < best) { best = d; v = pack(c); }
      }
      this.nearest.set(key, v);
    }
    return v;
  }

  // Composites the layer onto a Uint32Array frame buffer of the same size.
  commit(out) {
    const d = this.ctx.getImageData(0, 0, this.W, this.H).data;
    for (let i = 0, k = 0; i < out.length; i++, k += 4) if (d[k + 3] > 110) out[i] = this.snap(d[k], d[k + 1], d[k + 2]);
  }

  // Strokes a chain of projected points ({x, y, s}) in one color; widths are
  // meters per segment.
  chain(points, widths, color, outline = true) {
    this.limb(points, widths, Array(points.length - 1).fill(color), outline);
  }

  // Like chain, with one color per segment (e.g. sleeve then forearm).
  limb(points, widths, colors, outline = true) {
    const c = this.ctx;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const segs = colors.map((col, i) => {
      const a = points[i], b = points[i + 1];
      return { a, b, col, w: Math.max(1.2, widths[Math.min(i, widths.length - 1)] * (a.s + b.s) / 2) };
    });
    const line = (a, b, w, color, dx = 0, dy = 0) => {
      c.strokeStyle = color; c.lineWidth = w;
      c.beginPath(); c.moveTo(a.x + dx, a.y + dy); c.lineTo(b.x + dx, b.y + dy); c.stroke();
    };
    if (outline) for (const s of segs) line(s.a, s.b, s.w + this.line * 2, this.outline);
    for (const s of segs) {
      if (this.shade === 0) { line(s.a, s.b, s.w, tone(s.col, 1)); continue; }
      line(s.a, s.b, s.w, tone(s.col, 0));
      const o = s.w * 0.17;
      line(s.a, s.b, s.w * 0.62, tone(s.col, 1), LIGHT.x * o, LIGHT.y * o);
      if (this.shade > 1) line(s.a, s.b, Math.max(1, s.w * 0.24), tone(s.col, 2), LIGHT.x * o * 2, LIGHT.y * o * 2);
    }
  }

  blob(p, r, color, outline = true) {
    const c = this.ctx, R = Math.max(0.8, r * p.s);
    const disc = (x, y, rr, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); };
    if (outline) disc(p.x, p.y, R + this.line, this.outline);
    if (this.shade === 0) return disc(p.x, p.y, R, tone(color, 1));
    disc(p.x, p.y, R, tone(color, 0));
    disc(p.x + LIGHT.x * R * 0.18, p.y + LIGHT.y * R * 0.18, R * 0.78, tone(color, 1));
    if (this.shade > 1) disc(p.x + LIGHT.x * R * 0.42, p.y + LIGHT.y * R * 0.42, R * 0.3, tone(color, 2));
  }

  poly(pts, color, outline = true) {
    const c = this.ctx;
    const path = (scale = 1, dx = 0, dy = 0) => {
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      c.beginPath();
      pts.forEach((p, i) => { const x = cx + (p.x - cx) * scale + dx, y = cy + (p.y - cy) * scale + dy; i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath();
    };
    if (outline) { path(); c.strokeStyle = this.outline; c.lineWidth = this.line * 2; c.lineJoin = 'round'; c.stroke(); }
    if (this.shade === 0) { path(); c.fillStyle = tone(color, 1); c.fill(); return; }
    const size = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    path(); c.fillStyle = tone(color, 0); c.fill();
    path(0.8, LIGHT.x * size * 0.08, LIGHT.y * size * 0.08); c.fillStyle = tone(color, 1); c.fill();
    if (this.shade > 1) { path(0.35, LIGHT.x * size * 0.2, LIGHT.y * size * 0.2); c.fillStyle = tone(color, 2); c.fill(); }
  }

  dot(p, color, size = 1) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
  }
}

export function hull(points) {
  const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// Draws one dancer. cam.project(p) -> {x, y, s, depth} (depth grows away from
// the camera); cam.toCam(p) -> unit vector from p toward the camera.
// look: { skin, hair, shirt, pants, shoes, hat, band } for leads,
//       { skin, hair, dress, hem, shoes, flower } for follows.
// opts.thin scales limb widths; opts.face draws eyes, brows and a mouth.
export function drawDancer(spr, b, cam, look, opts = {}) {
  const j = b.j, P = {}, lead = b.role === 'lead', k = opts.thin ?? 1;
  for (const key of Object.keys(j)) P[key] = cam.project(j[key]);
  const head = j.head, yaw = b.headYaw * DEG;
  const fd = { x: Math.cos(yaw), y: Math.sin(yaw) }, ld = { x: -Math.sin(yaw), y: Math.cos(yaw) };
  const at = (base, f, l, z) => cam.project({ x: base.x + fd.x * f + ld.x * l, y: base.y + fd.y * f + ld.y * l, z: base.z + z });
  const legs = [], rest = [];

  for (const s of ['L', 'R']) {
    legs.push({ z: P['knee' + s].depth, draw: () => {
      spr.chain([P['hip' + s], P['knee' + s], P['ankle' + s]], [0.15 * k, 0.12 * k], lead ? look.pants : look.skin);
      spr.chain([P['ankle' + s], P['toe' + s]], [0.1 * k], look.shoes);
    } });
  }
  legs.sort((p, q) => q.z - p.z);

  if (!lead) {
    legs.push({ z: P.pelvis.depth, draw: () => {
      const f = b.flare, spin = b.th * DEG * 1.4, pts = [], hem = [];
      for (let n = 0; n < 18; n++) {
        const a = (n / 18) * Math.PI * 2;
        const rr = (0.24 + f * 0.22) * (1 + 0.07 * Math.sin(a * 6 + spin));
        const h = cam.project({ x: j.pelvis.x + Math.cos(a) * rr, y: j.pelvis.y + Math.sin(a) * rr, z: 0.5 + f * 0.14 - 0.03 * Math.cos(a * 6 + spin) });
        hem.push(h);
        pts.push(h, cam.project({ x: j.pelvis.x + Math.cos(a) * 0.15, y: j.pelvis.y + Math.sin(a) * 0.15, z: j.pelvis.z + 0.05 }));
      }
      spr.poly(hull(pts), look.dress);
      if (look.hem) for (const h of hem) if (h.depth < P.pelvis.depth) spr.dot(h, look.hem, Math.max(1, Math.round(h.s * 0.03)));
    } });
  }

  rest.push({ z: P.chest.depth, draw: () => {
    const color = lead ? look.shirt : look.dress;
    spr.poly(hull([P.shL, P.shR, P.hipR, P.hipL, P.neck, P.pelvis]), color);
    spr.chain([P.pelvis, P.neck], [(lead ? 0.26 : 0.22) * k], color, false);
    if (lead && P.chest.s > 50) {
      // Guayabera pleats on bigger sprites.
      for (const t of [0.3, 0.7]) {
        const top = { x: P.shL.x + (P.shR.x - P.shL.x) * t, y: P.shL.y + (P.shR.y - P.shL.y) * t + 2, s: P.chest.s };
        const bot = { x: P.hipL.x + (P.hipR.x - P.hipL.x) * t, y: P.hipL.y + (P.hipR.y - P.hipL.y) * t, s: P.chest.s };
        spr.ctx.strokeStyle = tone(look.shirt, 0); spr.ctx.lineWidth = 1;
        spr.ctx.beginPath(); spr.ctx.moveTo(top.x, top.y); spr.ctx.lineTo(bot.x, bot.y); spr.ctx.stroke();
      }
    }
  } });
  for (const s of ['L', 'R']) {
    rest.push({ z: P['el' + s].depth, draw: () => {
      spr.limb([P['sh' + s], P['el' + s], P['wr' + s]], [0.1 * k, 0.085 * k], lead ? [look.shirt, look.skin] : [look.skin, look.skin]);
      spr.blob(P['wr' + s], 0.045 * k, look.skin);
    } });
  }
  rest.push({ z: P.head.depth - 0.2, draw: () => {
    const R = b.P.headR, tc = cam.toCam(head), facing = fd.x * tc.x + fd.y * tc.y;
    spr.chain([P.neck, cam.project({ ...head, z: head.z - 0.07 })], [0.09 * k], look.skin, false);
    const bun = at(head, -0.1, 0, 0.05);
    if (!lead && bun.depth > P.head.depth) spr.blob(bun, 0.065, look.hair);
    // Hair first, then the face shifted toward where the head points.
    spr.blob(P.head, R, look.hair);
    if (facing > -0.55) {
      const face = at(head, R * 0.32, 0, -0.012);
      spr.blob(face, R * 0.82, look.skin, false);
      const eyeR = Math.max(1, Math.round(R * P.head.s * 0.16));
      for (const side of [1, -1]) {
        const n = { x: fd.x * 0.85 + ld.x * side * 0.42, y: fd.y * 0.85 + ld.y * side * 0.42 };
        if (n.x * tc.x + n.y * tc.y < 0.12) continue;
        const e = at(head, R * 0.8, R * side * 0.4, 0.012);
        spr.dot(e, '#1a1020', eyeR);
        if (opts.face) spr.dot({ x: e.x, y: e.y - eyeR * 1.6, s: e.s }, tone(look.hair, 1), eyeR);
      }
      if (opts.face && facing > -0.2) spr.dot(at(head, R * 0.9, 0, -0.055), '#8a1c2c', Math.max(1, Math.round(R * P.head.s * 0.2)));
    }
    if (!lead) {
      if (bun.depth <= P.head.depth) spr.blob(bun, 0.065, look.hair);
      spr.blob(at(head, -0.05, 0.075, 0.085), 0.034, look.flower);
    } else {
      const brim = [];
      for (let n = 0; n < 14; n++) {
        const a = (n / 14) * Math.PI * 2;
        brim.push(cam.project({ x: head.x + Math.cos(a) * 0.17, y: head.y + Math.sin(a) * 0.17, z: head.z + 0.07 }));
      }
      spr.poly(brim, look.hat);
      const base = cam.project({ ...head, z: head.z + 0.08 }), band = cam.project({ ...head, z: head.z + 0.11 });
      spr.chain([base, band], [0.17], look.band, false);
      spr.chain([band, cam.project({ ...head, z: head.z + 0.17 })], [0.155], look.hat, false);
    }
  } });
  rest.sort((p, q) => q.z - p.z);
  for (const p of legs.concat(rest)) p.draw();
}

// Darkens a ground-plane ellipse under p in a Uint32Array frame (checkered, so
// it reads as a dithered sprite shadow). k is how much the camera squashes depth.
export function shadow(out, W, H, cam, p, r, k) {
  const c = cam.project({ x: p.x, y: p.y, z: 0 });
  const rx = r * c.s, ry = Math.max(1, r * c.s * k);
  for (let y = Math.floor(c.y - ry); y <= c.y + ry; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = Math.floor(c.x - rx); x <= c.x + rx; x++) {
      if (x < 0 || x >= W || ((x + y) & 1)) continue;
      if (((x - c.x) / rx) ** 2 + ((y - c.y) / ry) ** 2 > 1) continue;
      const i = y * W + x, v = out[i];
      out[i] = ((255 << 24) | (((v >> 17) & 0x7f) << 16) | (((v >> 9) & 0x7f) << 8) | ((v >> 1) & 0x7f)) >>> 0;
    }
  }
}
