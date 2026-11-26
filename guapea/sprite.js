// Sprite rasterizer: limbs and shapes are drawn as canvas strokes on a
// low-res layer, then every covered pixel is snapped to a fixed palette, so
// they read as pixel sprites.
//
// A color is either one CSS hex string or a [dark, mid, light] ramp. `shade`
// picks how many tones a sprite uses: 0 flat, 1 two-tone, 2 three-tone.
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
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
