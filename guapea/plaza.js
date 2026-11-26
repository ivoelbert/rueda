// The plaza: the tiled floor with the painted ring, and the strings of bulbs
// over it.

import { R } from './body.js';
import { H, OX, OY, W, clamp, lerp, mod } from './math.js';

export const GOLD = ['#fff8d0', '#ffe890', '#f8d040', '#f0b020', '#e08818', '#c86010', '#9a3c0c'];
export const CREAM = '#f2e6cc';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const pack = (h) => { const [r, g, b] = hex(h); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; };
const TILE_A = ['#1c0e0e', '#3a1c16', '#6a3424', '#9a4e34', '#c06a44'].map(pack);
const TILE_B = ['#20140e', '#40281c', '#78503a', '#a8784e', '#d4a46c'].map(pack);
const GROUT = ['#0e0606', '#1c0e0a', '#2e1a12', '#44281c', '#5c3826'].map(pack);
const PAINT = ['#2a221c', '#5a4c3c', '#9a8a70', '#d8c8a4', '#f4ead0'].map(pack);
export const FLASH = pack('#fff4c8');
export const bg = document.createElement('canvas');
bg.width = W; bg.height = H;
export let ringPixels = [];
export let strands = [];

export function buildPlaza() {
  const g = bg.getContext('2d'), img = g.createImageData(W, H), o = new Uint32Array(img.data.buffer);
  const T = 16;
  ringPixels = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = x - OX, sy = OY - y, wx = (sx + 2 * sy) / 2, wy = (2 * sy - sx) / 2, r = Math.hypot(wx, wy);
    const light = clamp(1.08 - (r / ((R + 30) * 1.85)) ** 2, 0.04, 1);
    const level = (ramp) => ramp[clamp(Math.floor(light * (ramp.length - 1) + BAYER[(y & 3) * 4 + (x & 3)]), 0, ramp.length - 1)];
    const fx = mod(wx, T), fy = mod(wy, T), i = Math.floor(wx / T), j = Math.floor(wy / T);
    let c = (i + j) & 1 ? level(TILE_A) : level(TILE_B);
    if (fx < 1 || fy < 1) c = level(GROUT);
    // Painted ring and a star in the middle.
    const a = Math.atan2(wy, wx);
    if (Math.abs(r - R) < 1.15) { c = level(PAINT); ringPixels.push(y * W + x); }
    if (r < 13 && r < 6.5 + 6 * Math.abs(Math.cos(a * 4)) ** 3) c = r < 4.5 ? level(TILE_A) : level(PAINT);
    o[y * W + x] = c;
  }
  g.putImageData(img, 0, 0);
  // Two strings of bulbs over the floor.
  strands = [];
  g.fillStyle = '#120808';
  for (const [x0, y0, x1, y1, sag] of [[-8, 8, W + 8, 22, 18], [-8, 32, W + 8, 4, 14]]) {
    const bulbs = [];
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0), y = Math.round(lerp(y0, y1, u) + sag * 4 * u * (1 - u));
      g.fillRect(x, y, 1, 1);
      if (mod(x - x0, 18) === 9) bulbs.push({ x, y: y + 1 });
    }
    strands.push(bulbs);
  }
}
