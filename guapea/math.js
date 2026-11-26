// The screen, the isometric projection from the floor to it, vectors and
// easing.

export const W = 400, H = 225, OX = 200, OY = 119;
export const TAU = Math.PI * 2, DEG = Math.PI / 180;

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => u * u * (3 - 2 * u);
export const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (2 - 2 * u) ** 3 / 2);
export const backOut = (u) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
export const mod = (a, n) => ((a % n) + n) % n;
export const v3 = (x, y, z) => ({ x, y, z });
export const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a) => Math.hypot(a.x, a.y, a.z);
export const norm = (a) => mul(a, 1 / (len(a) || 1));
export const mix = (a, b, u) => v3(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u));
// World units are screen pixels. x and y lie on the floor, z is up; the
// camera sits toward -x -y, so a larger x + y is farther away.
export const proj = (p) => ({ x: OX + (p.x - p.y), y: OY - (p.x + p.y) / 2 - p.z, s: 1 });
export const depth = (p) => p.x + p.y;
export const TO_CAM = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
export const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export const ramp = (t, a, b) => smooth(clamp((t - a) / (b - a), 0, 1));
export const bump = (t, a, b, c) => ramp(t, a, b) * (1 - ramp(t, b, c));
