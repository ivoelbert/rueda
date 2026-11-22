// RUEDA · Guapea. An isometric pixel rueda dancing the guapea in unison.
//
// Tuned for feel rather than accuracy: feet land on the beat, the weight and
// hips settle just after, knees dip on every step and lift on 4 and 8, skirts
// and hats lag behind, the joined hands swing out on 1, and the whole circle
// presses palms on 5. You are one dancer. Pick a move in the moves library and
// press Space: the whole rueda dances it from the next 1, then goes back to
// the guapea.
import { Band } from './band.js';
import { Sprites, hull } from '../shared/sprite.js';
import { drawText, centerText, textWidth } from '../shared/font.js';

const W = 400, H = 225, OX = 200, OY = 119;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const q = new URLSearchParams(location.search);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => u * u * (3 - 2 * u);
const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (2 - 2 * u) ** 3 / 2);
const backOut = (u) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
const mod = (a, n) => ((a % n) + n) % n;
const v3 = (x, y, z) => ({ x, y, z });
const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a) => Math.hypot(a.x, a.y, a.z);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const mix = (a, b, u) => v3(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u));
// World units are screen pixels. x and y lie on the floor, z is up; the
// camera sits toward -x -y, so a larger x + y is farther away.
const proj = (p) => ({ x: OX + (p.x - p.y), y: OY - (p.x + p.y) / 2 - p.z, s: 1 });
const depth = (p) => p.x + p.y;
const TO_CAM = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ------------------------------------------------------------ feel knobs
// [default, min, max, step, label]. Values live in the URL, so a tuned
// version can be shared as a link.
const SPEC = {
  bpm: [196, 120, 220, 1, 'Tempo (BPM)'],
  bounce: [1, 0, 2.5, 0.05, 'Knee bounce'],
  hips: [1, 0, 2.5, 0.05, 'Hips'],
  step: [1, 0.3, 2, 0.05, 'Step size'],
  arms: [1, 0, 2, 0.05, 'Arm swing'],
  style: [1, 0, 2, 0.05, 'Styling (free hands)'],
  anticipation: [0.5, 0, 1, 0.05, 'Body moves early'],
  springy: [1, 0, 2, 0.05, 'Skirt & hat bounce'],
  jitter: [0.35, 0, 1, 0.05, 'Human looseness'],
  couples: [8, 3, 12, 1, 'Couples'],
};
const P = Object.fromEntries(Object.entries(SPEC).map(([k, [d, lo, hi]]) => [k, q.has(k) ? clamp(+q.get(k), lo, hi) : d]));

// ------------------------------------------------------------ the guapea
// t runs 0..8 over the eight counts (count 1 at t = 0). Keys are
// [beat, value]: the value is reached on that beat. "O" is the foot on the
// outside of the circle (his left, her right), "I" the inside one.
const PELVIS = [[0, -1], [1, -0.35], [2, 0], [4, 1], [5, 0.35], [6, 0]];
const HIPS = [[0, 1], [1, -1], [2, 1], [3, 1.6], [4, -1], [5, 1], [6, -1], [7, -1.6]]; // toward the weighted foot, popping on 4 and 8
const ANGLE = [[2, 0], [4, 1], [6, 0]]; // he angles to his right on the forward rock
// [beat, forward in steps, inward px (his only), lift px]
const FOOT_O = [[0, -1, 0, 2.6], [2, 0, 0, 2.2], [5, 0, 0, 1.2], [7, 0, 0, 1.3]];
const FOOT_I = [[1, 0, 0, 1.2], [3, 0.15, 0, 1.5], [4, 1, 1.2, 2.6], [6, 0, 0, 2.2]];
const KNEES = [[0, 1], [1, 0.5], [2, 0.7], [3, -0.45], [4, 1], [5, 0.5], [6, 0.7], [7, -0.45]]; // dip per step, a lift on 4 and 8
const JOINED_Z = [[0, 9.5], [2, 13], [4, 17.5], [6, 13.5]]; // joined hands: down and out on 1, up on 5
const JOINED_OUT = [[0, 4], [2, 0.8], [4, 0], [6, 0.8]];
const PRESS = [[3, 0], [4, 1], [5, 0]]; // free palms meet on 5
const HER_FLOURISH = [[1, 1], [2.6, 0]]; // her free hand frames her face on 1-2-3
const HIS_FLOURISH = [[0.5, 0.7], [2.4, 0]]; // his opens to the inside
const FOOT_I_F = FOOT_I.map(([b, f, , lift]) => [b, f, 0, lift]); // she doesn't angle

// A figure gives each role its tracks for one 8-count measure:
//   root    [beat, along, out, turn]: where the body travels. along counts
//           places around the circle (+ = counterclockwise), out is px away
//           from the center, turn is degrees (+ = left). Keys run 0 to 8.
//   pelvis, angle: as in the guapea.
//   O, I    footsteps [beat, forward in steps, inward px, lift px], placed
//           relative to the body where the foot lands.
// shift is how many places clockwise the girls move on by the end, so each
// lead has a new partner (a dame is 1).
const STILL = [[0, 0, 0, 0], [8, 0, 0, 0]];
const GUAPEA = {
  name: 'GUAPEA', shift: 0,
  lead: { root: STILL, pelvis: PELVIS, angle: ANGLE, O: FOOT_O, I: FOOT_I },
  follow: { root: STILL, pelvis: PELVIS, angle: [[0, 0]], O: FOOT_O, I: FOOT_I_F },
};

// The moves library. Each move starts on a 1 from the guapea and ends in the
// guapea; the hands are scripted in hands().
const MOVES = {
  dame: {
    id: 'dame', name: 'DAME', say: '¡Dame!', shift: 1,
    blurb: 'Dile que no with the girl on your right. The girls move on one place, so everyone has a new partner.',
    // On 1 he lets go, turns right to face the center and steps in toward
    // the girl on his right, his right hand on her back. 2-3 he settles back;
    // on 5-6-7 he opens to his left while she crosses in front of him.
    lead: {
      root: [[0, 0, 0, 0], [0.5, 0.06, -1.6, -78], [1, 0.09, -2.8, -100], [2, 0.08, -2, -96], [3, 0.06, -0.8, -92], [4, 0.05, -0.4, -88], [5, 0.04, 1, -70], [6, 0.02, 1.2, -35], [7, 0.005, 0.3, -6], [8, 0, 0, 0]],
      pelvis: [[0, 0.7], [1, 0.1], [2, 0], [4, -0.4], [5, -0.1], [6, 0]],
      angle: [[0, 0]],
      O: [[0, 0.5, 0, 2.8], [2, 0, 0, 2.2], [5, 0, 0, 2], [7, 0, 0, 1.3]],
      I: [[1, 0, 0, 1.6], [3, 0, 0, 1.2], [4, -0.4, 0, 2.4], [6, 0, 0, 2.2]],
    },
    // She steps back into his hand on 1 with her left arm up and turns left
    // to face the center beside him, then on 5-6-7 crosses in front of him,
    // turning left all the way round to face him.
    follow: {
      root: [[0, 0, 0, 0], [1, -0.12, -1.8, 20], [2, -0.13, -2.2, 55], [3, -0.2, -3, 90], [4, -0.27, -4.5, 125], [5, -0.5, -6.5, 190], [6, -0.8, -4.5, 275], [7, -0.97, -0.8, 345], [8, -1, 0, 360]],
      pelvis: [[0, -1], [1, -0.3], [2, 0.2], [4, 0.6], [5, 0.4], [6, 0]],
      angle: [[0, 0]],
      O: [[0, -0.5, 0, 2.6], [2, 0.2, 2.5, 2.6], [5, 0, 0, 2.2], [7, 0, 0, 1.3]],
      I: [[1, 0, 0, 2.2], [3, 0.15, 0, 1.5], [4, 0.4, 0, 2.6], [6, 0, 0, 2.4]],
    },
  },
};

// The calls: measure number -> move id. Calls more than two measures old are
// folded into baseShift.
const timeline = new Map();
let baseShift = 0;
const figureAt = (m) => MOVES[timeline.get(m)] || GUAPEA;
function shiftBefore(m) {
  let s = baseShift;
  for (const [k, id] of timeline) if (k < m) s += MOVES[id].shift;
  return s;
}

// One track's keys for the measures around beat b, on the absolute beat line,
// so each figure flows into the next.
function keysAround(d, name, b) {
  const m = Math.floor(b / 8), out = [];
  for (let mm = m - 1; mm <= m + 1; mm++) for (const k of figureAt(mm)[d.role][name]) out.push([k[0] + mm * 8, ...k.slice(1)]);
  return out;
}
function activeAbs(keys, b, pre, post) {
  let i = 0;
  for (let k = 0; k < keys.length; k++) if (keys[k][0] - pre <= b) i = k;
  return { k: keys[i], prev: keys[Math.max(0, i - 1)], u: clamp((b - (keys[i][0] - pre)) / (pre + post), 0, 1) };
}
// Root keys as a smooth curve (Hermite with damped Catmull-Rom tangents), at
// rest on the first and last key.
function evalRoot(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], h = b[0] - a[0], u = clamp((t - a[0]) / h, 0, 1);
  const tan = (j, c) => (j <= 0 || j >= keys.length - 1 ? 0 : ((keys[j + 1][c] - keys[j - 1][c]) / (keys[j + 1][0] - keys[j - 1][0])) * 0.85);
  const u2 = u * u, u3 = u2 * u;
  return [1, 2, 3].map((c) => (2 * u3 - 3 * u2 + 1) * a[c] + (u3 - 2 * u2 + u) * h * tan(i, c) + (3 * u2 - 2 * u3) * b[c] + (u3 - u2) * h * tan(i + 1, c));
}
const ramp = (t, a, b) => smooth(clamp((t - a) / (b - a), 0, 1));
const bump = (t, a, b, c) => ramp(t, a, b) * (1 - ramp(t, b, c));

// Each key's window is [beat - pre, beat + post]; between windows it holds.
function active(keys, t, pre, post) {
  let best = -Infinity, i = 0;
  for (let p = -8; p <= 8; p += 8) for (let k = 0; k < keys.length; k++) {
    const s = keys[k][0] + p - pre;
    if (s <= t && s > best) { best = s; i = k; }
  }
  return { k: keys[i], prev: keys[(i + keys.length - 1) % keys.length], u: clamp((t - best) / (pre + post), 0, 1) };
}
function track(keys, t, pre, post, ease = smooth) {
  const a = active(keys, t, pre, post);
  return lerp(a.prev[1], a.k[1], ease(a.u));
}
// Knee dip around a landing at dt = 0: a little give before, the drop right
// after the beat, then a slow rise.
function kick(dt) {
  if (dt < -0.22) return 0;
  if (dt < 0) return 0.3 * (1 + dt / 0.22) ** 2;
  if (dt < 0.06) return 0.3 + (0.7 * dt) / 0.06;
  return Math.exp(-(dt - 0.06) / 0.2);
}
function dip(t) {
  t = mod(t, 8);
  let s = 0;
  for (const [b, w] of KNEES) for (const p of [-8, 0, 8]) {
    const dt = t - (b + p);
    if (dt > -0.3 && dt < 1.6) s += w * kick(dt);
  }
  return s;
}

// 2-bone IK: elbow/knee toward `pole`, end clamped to reach.
function ik(a, target, l1, l2, pole) {
  const D = sub(target, a), d = clamp(len(D), 0.01, l1 + l2 - 0.001), dir = norm(D);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = norm(sub(pole, mul(dir, dot(pole, dir))));
  return { mid: add(a, add(mul(dir, x), mul(p, h))), end: add(a, mul(dir, d)) };
}

// ------------------------------------------------------------ the people
const OUTLINE = '#24121a';
const SKIN = [['#c27a52', '#eeb48a'], ['#8c4a2a', '#b8703f'], ['#5a2c16', '#80492a'], ['#d89a70', '#f6cfa6']];
const HAIR = [['#1c1014', '#3c2228'], ['#3a1c10', '#6c3418'], ['#2a1810', '#54301c']];
const SHIRT = [['#c8bca0', '#f6f0dc'], ['#8eb4c8', '#cfe6ee'], ['#d0b060', '#f4dc94'], ['#c8a8a0', '#f2d8cc']];
const PANTS = [['#1c2440', '#34406a'], ['#4a3020', '#74503a'], ['#2a2a30', '#4a4a54'], ['#6a5a40', '#9c8664']];
const DRESS = [['#9a1420', '#e0303a'], ['#b88a10', '#f2c832'], ['#0a6a6a', '#18aaa0'], ['#5a2a8a', '#9050c8'], ['#c05010', '#f08028'], ['#b0306a', '#ec6aa0'], ['#2a6a2a', '#4ca84a'], ['#1a3a9a', '#3a6ae0']];
const HAT = ['#b08a40', '#e8c878'];
const BAND = ['#a01818', '#202024', '#1a2a6a', '#6a1a4a'];
const SHOES = ['#140c0c', '#3a2418'];
const HEELS = ['#a07020', '#e8c050'];
const FLOWER = ['#f6efe0', '#f05060'];
const EYE = '#1a0e14', MOUTH = '#8a2a30', TRIM = '#f6efe0';
const spr = new Sprites(W, H, [SKIN, HAIR, SHIRT, PANTS, DRESS, [HAT], [BAND], [SHOES], [HEELS], [FLOWER], [[EYE, MOUTH, TRIM]]].flat(3), { outline: OUTLINE, shade: 1, line: 1 });

const DIST = 19; // partners' pelvises apart in the open position
const ARM = [6.8, 6.6], THIGH = 6.4, SHIN = 6.2, HEAD_R = 5.8;
const FRONT = (225 * Math.PI) / 180; // the couple nearest the camera, seen side-on
// Leads and follows are listed separately because partners change: at
// measure m, lead i dances with follow i + shiftBefore(m).
let leads = [], follows = [], R = 0, SLOT = 0;
const dancers = () => leads.concat(follows);

function build() {
  const n = P.couples;
  // A tight circle: the next couple is about as close as your partner.
  R = (n * (DIST + 24)) / TAU;
  SLOT = TAU / n;
  leads = []; follows = [];
  timeline.clear(); baseShift = 0;
  for (let k = 0; k < n; k++) {
    const a = FRONT + k * SLOT;
    const c = { x: R * Math.cos(a), y: R * Math.sin(a) }, t = { x: -Math.sin(a), y: Math.cos(a) };
    // He faces clockwise with his right shoulder to the center; she faces
    // him, left shoulder to the center. Joined hands (his left, her right)
    // are on the outside of the circle.
    for (const role of ['lead', 'follow']) {
      const lead = role === 'lead', f = lead ? { x: -t.x, y: -t.y } : { x: t.x, y: t.y };
      const r = rng(k * 2 + (lead ? 11 : 29));
      (lead ? leads : follows).push({
        role, lead, k, sO: lead ? 1 : -1, h0: Math.atan2(f.y, f.x),
        home: { x: c.x + t.x * (lead ? 1 : -1) * DIST / 2, y: c.y + t.y * (lead ? 1 : -1) * DIST / 2 },
        hipZ: lead ? 11.5 : 11, shW: lead ? 4.6 : 3.9,
        jit: (r() - 0.5) * 0.06, bounce: 0.85 + r() * 0.3, hips: 0.8 + r() * 0.45, style: 0.7 + r() * 0.6,
        look: lead
          ? { skin: SKIN[(k * 3 + 1) % 4], hair: HAIR[(k * 3 + 1) % 4 >= 1 ? 0 : 2], shirt: SHIRT[k % 4], pants: PANTS[(k + 1) % 4], shoes: SHOES, hat: k % 2 ? HAT : null, band: BAND[(k >> 1) % 4] }
          : { skin: SKIN[(k * 3 + 2) % 4], hair: HAIR[[1, 2].includes((k * 3 + 2) % 4) ? 0 : 1 + (k % 2)], dress: DRESS[k % 8], shoes: HEELS, flower: FLOWER[(k + 1) % 2] },
        spr: null, pose: null,
      });
    }
  }
}

// Where a dancer's body is at beat b: a spot on the floor and a heading. The
// leads keep their places; a follow's home spot moves on one place clockwise
// per partner change.
function root(d, b) {
  const m = Math.floor(b / 8);
  const [along, out, turn] = evalRoot(figureAt(m)[d.role].root, b - m * 8);
  const a = ((d.lead ? 0 : -shiftBefore(m)) + along) * SLOT, c = Math.cos(a), s = Math.sin(a);
  const x = d.home.x * c - d.home.y * s, y = d.home.x * s + d.home.y * c, r = Math.hypot(x, y);
  const h = d.h0 + a + turn * DEG;
  return { x: x + (x / r) * out, y: y + (y / r) * out, h, f: { x: Math.cos(h), y: Math.sin(h) }, l: { x: -Math.sin(h), y: Math.cos(h) } };
}

// One dancer's body (no arms) at beat b.
const LIFT = 0.46, LOOK = 0.75;
function body(d, b) {
  b += d.jit * P.jitter;
  const t = mod(b, 8), S = 4.4 * P.step, sO = d.sO, lead = d.lead, here = root(d, b);
  const Lw = (fwd, side, z) => v3(here.x + here.f.x * fwd + here.l.x * side, here.y + here.f.y * fwd + here.l.y * side, z);
  const trk = (name, pre, post, ease) => { const a = activeAbs(keysAround(d, name, b), b, pre, post); return lerp(a.prev[1], a.k[1], ease(a.u)); };
  const pf = trk('pelvis', 0.3 + 0.4 * P.anticipation, 0.22, inOut) * S * 0.68;
  const ang = trk('angle', 0.4, 0.15, smooth) * -sO * 1.3;
  const ps = track(HIPS, t, 0.42, 0.3, backOut) * sO * 2.2 * P.hips * d.hips + ang;
  const amp = 1.8 * P.bounce * d.bounce, dp = dip(t) * amp, dpLag = dip(t - 0.09) * amp;
  const pz = d.hipZ - dp;
  const pelvis = Lw(pf, ps, pz);
  // A foot lands where the body is about to be and stays there until it
  // lifts again, so traveling steps don't skate.
  const landing = (k, side) => {
    const r = root(d, k[0] + LOOK), s = side + k[2] * -sO;
    return v3(r.x + r.f.x * k[1] * S + r.l.x * s, r.y + r.f.y * k[1] * S + r.l.y * s, 0);
  };
  const knee = (hip, ankle) => ik(hip, ankle, THIGH, SHIN, v3(here.f.x, here.f.y, 0.25)).mid;
  const out = { t, d, Lw, pf, ps, pz, dp, pelvis, f: here.f, l: here.l, h: here.h };
  for (const [name, side] of [['O', sO], ['I', -sO]]) {
    const a = activeAbs(keysAround(d, name, b), b, LIFT, 0), z = Math.sin(Math.PI * a.u) * a.k[3];
    const hip = Lw(pf, ps + side * 2.1, pz);
    let p = mix(landing(a.prev, side * 2.3), landing(a.k, side * 2.3), inOut(a.u));
    // A foot the body has left behind slides along rather than stretching the leg.
    const far = Math.sqrt(Math.max(0, (THIGH + SHIN) ** 2 * 0.97 - (pz - 1.3 - z) ** 2)), dh = Math.hypot(p.x - hip.x, p.y - hip.y);
    if (dh > far) p = v3(hip.x + ((p.x - hip.x) * far) / dh, hip.y + ((p.y - hip.y) * far) / dh, 0);
    out['ankle' + name] = v3(p.x, p.y, 1.3 + z);
    out['toe' + name] = v3(p.x + here.f.x * 2.6, p.y + here.f.y * 2.6, 0.7 + z * 0.6);
    out['hip' + name] = hip;
    out['knee' + name] = knee(out['hip' + name], out['ankle' + name]);
    out['waist' + name] = lead ? Lw(pf, ps + side * 3, pz - 1.6) : Lw(pf, ps + side * 2.5, pz + 2.2);
  }
  // Shoulders stay over the base while the hips swing, so the torso tilts.
  const nf = pf * 0.85, ns = ps * 0.3, nz = pz + 9;
  out.nf = nf; out.ns = ns; out.nz = nz;
  out.neck = Lw(nf, ns, nz);
  out.shO = Lw(nf, ns + sO * d.shW, nz - 1.2);
  out.shI = Lw(nf, ns - sO * d.shW, nz - 1.2);
  // The head lags the knee dip a little.
  out.head = Lw(nf, ns * 0.6 + ps * 0.1, nz + 6.4 + (dp - dpLag) * 0.7);
  return out;
}

// ------------------------------------------------------------ hands
// Each hand gets a target for this frame (a grip it shares with a partner,
// a spot on the partner's back, or its own rest spot), then IK reaches for it.
const REACH = (ARM[0] + ARM[1]) * 0.97;
let palms = [];

// If the bodies are too far apart, slide the grip toward the shoulders.
function reachable(p, a, b) {
  const m = mix(a, b, 0.5), ok = (x) => len(sub(x, a)) <= REACH && len(sub(x, b)) <= REACH;
  if (ok(p)) return p;
  let lo = 0, hi = 1;
  for (let i = 0; i < 8; i++) { const s = (lo + hi) / 2; ok(mix(p, m, s)) ? (hi = s) : (lo = s); }
  return mix(p, m, hi);
}
// The guapea grip: down and out on 1, up on 5.
function guapeaGrip(L, F, t) {
  const m = mix(L.shO, F.shO, 0.5), o = norm(v3(m.x, m.y, 0));
  const jz = 13.5 + (track(JOINED_Z, t, 0.42, 0.2) - 13.5) * P.arms - (L.dp + F.dp) / 2;
  const jo = track(JOINED_OUT, t, 0.42, 0.2) * P.arms;
  return reachable(v3(m.x + o.x * jo, m.y + o.y * jo, jz), L.shO, F.shO);
}
// The dile que no grip: chest high, a little inside the circle, lifted for
// her spin on 7.
function crossGrip(L, F, t) {
  const m = mix(L.shO, F.shO, 0.5), o = norm(v3(m.x, m.y, 0));
  const z = 13 - (L.dp + F.dp) / 2 + 3.5 * bump(t, 5.4, 6.4, 7.4) * P.arms;
  return reachable(v3(m.x - o.x * 3, m.y - o.y * 3, z), L.shO, F.shO);
}
// Free hands: bent at the elbow in front of the chest, swinging against the step.
const rest = (B, side) => B.Lw(B.nf + 3.4 - B.pf * 0.35, B.ns + side * (B.d.shW - 1.2), B.nz - (B.d.lead ? 5.2 : 4.4));
// The inside free hand, which also opens out on 1-2-3.
function styled(B, t) {
  const d = B.d, sO = d.sO, style = clamp(P.style * d.style, 0, 2), p = rest(B, -sO);
  if (d.lead) return mix(p, B.Lw(B.nf + 1.5, B.ns - sO * 7.5, B.nz - 3), clamp(track(HIS_FLOURISH, t, 0.5, 0.1, inOut) * style, 0, 1));
  return mix(p, B.Lw(B.nf + 0.8, B.ns - sO * 6.2, B.head.z + 2), clamp(track(HER_FLOURISH, t, 0.55, 0.12, inOut) * style * 0.8, 0, 1));
}

function hands(b) {
  const n = P.couples, m = Math.floor(b / 8), t = b - m * 8, s = shiftBefore(m);
  const aim = (B, O, I) => { B.aim = { O, I }; };
  palms = [];
  if (!figureAt(m).shift) {
    // Guapea: the free palms meet on 5.
    const press = track(PRESS, t, 0.42, 0, inOut);
    for (let i = 0; i < n; i++) {
      const L = leads[i].pose, F = follows[mod(i + s, n)].pose, j = guapeaGrip(L, F, t);
      const pm = mix(L.shI, F.shI, 0.5), palm = v3(pm.x, pm.y, pm.z - 1.5);
      palms.push(palm);
      aim(L, j, mix(styled(L, t), palm, press));
      aim(F, j, mix(styled(F, t), palm, press));
    }
    return;
  }
  // Dame: on 1 everyone lets go, his right hand goes to the back of the girl
  // on his right and she puts her left arm up, lowering it by 3. On 5 his
  // left hand takes her right as she turns across in front of him, and the
  // grip settles into the guapea by 8.
  const wOld = 1 - ramp(t, 0, 0.35), wBack = ramp(t, 0, 0.3) * (1 - ramp(t, 4.6, 5.4));
  const wNew = ramp(t, 3.6, 4.1), toGuapea = ramp(t, 6, 7.6), up = ramp(t, 0, 0.3) * (1 - ramp(t, 1.2, 2));
  const old = [], neu = [];
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, Fo = follows[mod(i + s, n)].pose, Fn = follows[mod(i + s + 1, n)].pose;
    old[i] = guapeaGrip(L, Fo, t);
    neu[i] = mix(crossGrip(L, Fn, t), guapeaGrip(L, Fn, t), toGuapea);
    const back = Fn.Lw(Fn.nf - 2.4, Fn.ns - Fn.d.sO * 1.5, Fn.pz + 4.5); // her left shoulder blade
    aim(L, mix(mix(rest(L, L.d.sO), old[i], wOld), neu[i], wNew), mix(styled(L, t), back, wBack));
  }
  for (let j = 0; j < n; j++) {
    const F = follows[j].pose, sO = F.d.sO;
    // Her shoulder lifts with the arm so the hand clears her head.
    F.shI = add(F.shI, v3(0, 0, 2 * up));
    const high = F.Lw(F.nf + 0.5, F.ns - sO * (F.d.shW + 3), F.head.z + 9);
    aim(F, mix(mix(rest(F, sO), old[mod(j - s, n)], wOld), neu[mod(j - s - 1, n)], wNew), mix(styled(F, t), high, up));
  }
}

function reach(B) {
  const sO = B.d.sO, pole = (side) => v3(B.l.x * side * 0.7 - B.f.x * 0.35, B.l.y * side * 0.7 - B.f.y * 0.35, -1);
  const O = ik(B.shO, B.aim.O, ARM[0], ARM[1], pole(sO)), I = ik(B.shI, B.aim.I, ARM[0], ARM[1], pole(-sO));
  B.arms = { O: { sh: B.shO, el: O.mid, hand: O.end }, I: { sh: B.shI, el: I.mid, hand: I.end } };
}

// Skirt hems and hats trail the body on a damped spring; the spring also
// tracks how fast she turns, so a spin flares the skirt.
function spring(d, B, dt) {
  const s = d.spr || (d.spr = { x: B.pelvis.x, y: B.pelvis.y, vx: 0, vy: 0, z: B.head.z, vz: 0, h: B.h, w: 0 });
  const K = 160, C = 11, h = dt / 2;
  for (let i = 0; i < 2; i++) {
    s.vx += (K * (B.pelvis.x - s.x) - C * s.vx) * h; s.x += s.vx * h;
    s.vy += (K * (B.pelvis.y - s.y) - C * s.vy) * h; s.y += s.vy * h;
    s.vz += (K * 1.4 * (B.head.z - s.z) - C * s.vz) * h; s.z += s.vz * h;
  }
  if (dt > 0) s.w = lerp(s.w, (mod(B.h - s.h + Math.PI, TAU) - Math.PI) / dt, 1 - Math.exp(-dt * 10));
  s.h = B.h;
}

// ------------------------------------------------------------ drawing
function drawDancer(d, B, A) {
  const look = d.look, lead = d.lead, Pp = proj;
  const legs = [];
  for (const n of ['O', 'I']) {
    legs.push({ z: depth(B['knee' + n]), draw: () => {
      spr.chain([Pp(B['hip' + n]), Pp(B['knee' + n]), Pp(B['ankle' + n])], lead ? [3.6, 3.2] : [2.6, 2.3], lead ? look.pants : look.skin);
      spr.chain([Pp(B['ankle' + n]), Pp(B['toe' + n])], [2.6], look.shoes);
    } });
  }
  legs.sort((a, b) => b.z - a.z).forEach((p) => p.draw());

  const chest = depth(B.neck);
  const items = [];
  if (!lead) items.push({ z: chest + 0.002, draw: () => skirt(d, B) });
  items.push({ z: chest + 0.001, draw: () => {
    const color = lead ? look.shirt : look.dress;
    spr.poly(hull([B.shO, B.shI, B.waistO, B.waistI, B.neck].map(Pp)), color);
    spr.chain([Pp(mix(B.waistO, B.waistI, 0.5)), Pp(B.neck)], [lead ? 7 : 5], color, false);
  } });
  for (const n of ['O', 'I']) {
    const a = A[n];
    items.push({ z: (depth(a.el) + depth(a.hand)) / 2, draw: () => {
      spr.limb([Pp(a.sh), Pp(a.el), Pp(a.hand)], lead ? [3.2, 2.7] : [2.5, 2.2], lead ? [look.shirt, look.skin] : [look.skin, look.skin]);
      spr.blob(Pp(a.hand), 1.35, look.skin);
    } });
  }
  items.sort((a, b) => b.z - a.z).forEach((p) => p.draw());
  head(d, B);
}

function skirt(d, B) {
  const s = d.spr, k = P.springy;
  const lx = clamp(s.x - B.pelvis.x, -3, 3) * k, ly = clamp(s.y - B.pelvis.y, -3, 3) * k;
  const flare = 0.4 + (clamp(Math.hypot(s.vx, s.vy) * 0.07, 0, 1.6) + clamp(Math.abs(s.w) * 0.22, 0, 2.2)) * k;
  const hx = B.pelvis.x + lx, hy = B.pelvis.y + ly, wz = B.pz + 1.8, phase = (s.x + s.y) * 0.4 + B.h;
  const pts = [], hem = [];
  for (let n = 0; n < 18; n++) {
    const a = (n / 18) * TAU;
    pts.push(proj(v3(B.pelvis.x + Math.cos(a) * 3.1, B.pelvis.y + Math.sin(a) * 3.1, wz)));
    const r = 6 + flare, p = v3(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 4.3 + flare * 0.5 - 0.5 * Math.cos(a * 5 + phase));
    hem.push(p);
    pts.push(proj(p));
  }
  spr.poly(hull(pts), d.look.dress);
  const c = depth(B.pelvis);
  for (const p of hem) if (depth(p) < c - 1) spr.dot(proj(p), TRIM, 1);
}

function head(d, B) {
  const look = d.look, h = B.head, f = B.f, l = B.l, R = HEAD_R;
  const W3 = (fw, sd, z) => v3(h.x + f.x * fw + l.x * sd, h.y + f.y * fw + l.y * sd, h.z + z);
  const facing = f.x * TO_CAM.x + f.y * TO_CAM.y;
  spr.chain([proj(B.neck), proj(W3(0, 0, -R * 0.7))], [2.6], look.skin, false);
  const bun = W3(-R * 0.62, 0, R * 0.55);
  if (!d.lead && depth(bun) > depth(h)) spr.blob(proj(bun), 2.4, look.hair);
  spr.blob(proj(h), R, look.hair);
  const eyes = () => {
    if (facing < -0.45) return;
    for (const side of [1, -1]) {
      const nx = f.x * 0.85 + l.x * side * 0.45, ny = f.y * 0.85 + l.y * side * 0.45;
      if (nx * TO_CAM.x + ny * TO_CAM.y < 0.05) continue;
      const e = proj(W3(R * 0.84, side * R * 0.42, -0.6));
      spr.dot(e, EYE, 1); spr.dot({ x: e.x, y: e.y + 1 }, EYE, 1);
    }
    if (facing > 0.15) spr.dot(proj(W3(R * 0.9, 0, -R * 0.45)), MOUTH, 1);
  };
  if (facing > -0.45) spr.blob(proj(W3(R * 0.34, 0, -0.5)), R * 0.8, look.skin, false);
  if (d.lead && look.hat) {
    const lag = clamp(d.spr.z - h.z, -2, 2.5) * P.springy, z0 = h.z + R * 0.7 + lag;
    const ring = (r, z) => Array.from({ length: 16 }, (_, n) => proj(v3(h.x + Math.cos((n / 16) * TAU) * r, h.y + Math.sin((n / 16) * TAU) * r, z)));
    spr.poly(ring(6.2, z0), look.hat);
    spr.poly(hull([...ring(4.3, z0 + 0.3), ...ring(3.7, z0 + 3.6)]), look.hat);
    spr.poly(hull([...ring(4.4, z0 + 0.4), ...ring(4.2, z0 + 1.6)]), look.band, false);
    spr.poly(ring(3.6, z0 + 3.6), look.hat, false);
    eyes();
  } else if (d.lead) {
    eyes();
  } else {
    eyes();
    if (depth(bun) <= depth(h)) spr.blob(proj(bun), 2.4, look.hair);
    spr.blob(proj(W3(-R * 0.4, d.sO * R * 0.6, R * 0.75)), 1.5, look.flower);
  }
}

// ------------------------------------------------------------ the plaza
const GOLD = ['#fff8d0', '#ffe890', '#f8d040', '#f0b020', '#e08818', '#c86010', '#9a3c0c'];
const CREAM = '#f2e6cc';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pack = (h) => { const [r, g, b] = hex(h); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; };
const TILE_A = ['#1c0e0e', '#3a1c16', '#6a3424', '#9a4e34', '#c06a44'].map(pack);
const TILE_B = ['#20140e', '#40281c', '#78503a', '#a8784e', '#d4a46c'].map(pack);
const GROUT = ['#0e0606', '#1c0e0a', '#2e1a12', '#44281c', '#5c3826'].map(pack);
const PAINT = ['#2a221c', '#5a4c3c', '#9a8a70', '#d8c8a4', '#f4ead0'].map(pack);
const FLASH = pack('#fff4c8');
const bg = document.createElement('canvas');
bg.width = W; bg.height = H;
let ringPixels = [];
let strands = [];

function buildPlaza() {
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

// ------------------------------------------------------------ game state
const music = new Band(P.bpm);
let frozen = q.has('beat') ? +q.get('beat') : null;
const beatNow = () => frozen ?? music.beat();
const state = {
  mode: q.has('play') || frozen !== null ? 'play' : 'title',
  role: q.get('role') === 'follow' ? 'follow' : 'lead',
  move: MOVES[q.get('move')] ? q.get('move') : 'dame',
  startedAt: -99, calledAt: -99, half: false, muted: false,
};
let particles = [];
let shake = 0;

const player = () => (state.role === 'lead' ? leads : follows)[0];

function puff(p, n, color = '#d8b088', speed = 14) {
  const s = proj(p);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    particles.push({ x: s.x, y: s.y, vx: Math.cos(a) * speed * (0.5 + Math.random()), vy: Math.sin(a) * speed * 0.4 - 4, g: 10, life: 0.35 + Math.random() * 0.2, c: color });
  }
}

// Things that happen on a count: dust under the feet, and in a move, the
// whoosh of her turn and the landing on the next 1.
function onBeat(k) {
  const c = mod(k, 8), m = Math.floor(k / 8), fig = figureAt(m), me = player();
  for (const d of dancers()) {
    const mine = d === me && state.mode === 'play';
    if (c === 0 || c === 4 || (mine && [1, 2, 5, 6].includes(c))) puff(c === 0 || c === 2 || c === 5 ? d.pose.ankleO : d.pose.ankleI, mine ? 4 : 2);
  }
  if (fig.shift && c === 6) music.sfx('whoosh');
  if (c === 0 && figureAt(m - 1).shift) {
    music.sfx('perfect');
    shake = 0.6;
    for (const d of [me, me.lead ? follows[mod(shiftBefore(m), leads.length)] : leads[mod(-shiftBefore(m), leads.length)]]) puff(d.pose.ankleO, 10, '#f0d0a0', 30);
  }
}

// Space: the rueda dances the selected move from the next 1.
function call() {
  if (state.mode === 'title') return start();
  const b = music.beat(), m = Math.floor(b / 8) + 1;
  if (timeline.has(m)) return music.sfx('nope');
  timeline.set(m, state.move);
  state.calledAt = b;
  music.sfx('select');
  shout(MOVES[state.move].say);
}

// The caller shouts the move.
function shout(text) {
  if (state.muted || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'));
  if (voice) u.voice = voice;
  u.lang = 'es-ES';
  u.rate = 1.25;
  u.pitch = 1.1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function start() {
  music.start();
  state.mode = 'play';
  state.startedAt = music.beat();
  if (state.muted) music.out.gain.value = 0;
}

// ------------------------------------------------------------ frame
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let last = performance.now(), lastB = null, warmedFor = null;

function poseAll(b, dt) {
  for (const d of dancers()) d.pose = body(d, b);
  hands(b);
  for (const d of dancers()) { reach(d.pose); spring(d, d.pose, dt); }
}

// Calls well behind us only matter for who dances with whom.
function fold(b) {
  const m = Math.floor(b / 8);
  for (const [k, id] of timeline) if (k < m - 3) { baseShift += MOVES[id].shift; timeline.delete(k); }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const b = beatNow();
  if (frozen === null) fold(b);
  else if (warmedFor !== frozen) {
    // Run the springs up to the frozen beat so stills match live play.
    for (let s = frozen - 2; s < frozen; s += (music.bpm / 60) / 60) poseAll(s, 1 / 60);
    warmedFor = frozen;
  }
  poseAll(b, frozen !== null ? 0 : dt);
  if (frozen === null && lastB !== null && b - lastB < 4) for (let k = Math.floor(lastB) + 1; k <= Math.floor(b); k++) onBeat(k);
  lastB = b;
  render(b, dt);
  syncLibrary(b);
}

function render(b, dt) {
  const t = mod(b, 8), cnt = Math.floor(t);
  ctx.drawImage(bg, 0, 0);
  const img = ctx.getImageData(0, 0, W, H), out = new Uint32Array(img.data.buffer);
  // The ring lights up on every 1.
  if (t < 0.3) for (const [i, idx] of ringPixels.entries()) if (t < 0.15 || (i & 1)) out[idx] = FLASH;
  // Shadows, and a gold ring under you.
  const me = player();
  for (const d of dancers()) {
    const B = d.pose, c = proj(v3(B.pelvis.x, B.pelvis.y, 0)), rx = 7.5 + B.dp * 0.4, ry = rx * 0.45;
    if (d === me) ellipse(out, c.x, c.y, 12 + (t % 1 < 0.15 ? 1 : 0), 5.5 + (t % 1 < 0.15 ? 0.5 : 0), pack(GOLD[2]));
    for (let y = Math.floor(c.y - ry); y <= c.y + ry; y++) for (let x = Math.floor(c.x - rx); x <= c.x + rx; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || (x + y) & 1) continue;
      if (((x - c.x) / rx) ** 2 + ((y - c.y) / ry) ** 2 > 1) continue;
      const v = out[y * W + x];
      out[y * W + x] = ((255 << 24) | (((v >> 17) & 0x7f) << 16) | (((v >> 9) & 0x7f) << 8) | ((v >> 1) & 0x7f)) >>> 0;
    }
  }
  spr.clear();
  dancers().sort((a, c) => depth(c.pose.pelvis) - depth(a.pose.pelvis)).forEach((d) => drawDancer(d, d.pose, d.pose.arms));
  spr.commit(out);
  const sh = shake > 0.05 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
  shake *= Math.pow(0.001, dt);
  ctx.putImageData(img, sh, 0);

  // Palms meet on 5: a little spark between every couple.
  if (t >= 4 && t < 4.22) for (const palm of palms) {
    const p = proj(palm), r = t < 4.08 ? 2 : 1;
    ctx.fillStyle = '#fff8d0';
    ctx.fillRect(Math.round(p.x) - r, Math.round(p.y), r * 2 + 1, 1);
    ctx.fillRect(Math.round(p.x), Math.round(p.y) - r, 1, r * 2 + 1);
  }
  // Bulbs brighten on 1 and 5.
  const glow = Math.max(0, 1 - (t % 4) / 0.5);
  strands.forEach((bulbs, si) => bulbs.forEach((p, i) => {
    const warm = (i + si) % 3 === 0 ? '#ffd890' : (i + si) % 3 === 1 ? '#ffe8b0' : '#ffc070';
    ctx.fillStyle = glow > 0.3 ? '#fffbe8' : warm;
    ctx.fillRect(p.x - 1, p.y, 2, 2);
    if (glow > 0.6) { ctx.fillStyle = 'rgba(255, 230, 160, 0.35)'; ctx.fillRect(p.x - 2, p.y - 1, 4, 4); }
  }));
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.92;
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  hud(b, t, cnt);
}

function ellipse(out, cx, cy, rx, ry, color) {
  for (let a = 0; a < TAU; a += 0.02) {
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = color;
  }
}

// ------------------------------------------------------------ HUD
function hud(b, t, cnt) {
  const me = player(), B = me.pose, m = Math.floor(b / 8), fig = figureAt(m), next = timeline.get(m + 1);
  drawText(ctx, 'RUEDA', 8, 6, GOLD, 2, OUTLINE, { shadow: OUTLINE });
  drawText(ctx, fig.name, 9, 24, fig === GUAPEA ? CREAM : GOLD[2], 1, OUTLINE);

  // Marker over your head.
  const hp = proj(v3(B.head.x, B.head.y, B.head.z + (me.lead ? 13 : 9)));
  const bob = t % 1 < 0.2 ? 1 : 0;
  drawText(ctx, '1P', Math.round(hp.x) - 5, Math.round(hp.y) - 9 + bob, GOLD[2], 1, OUTLINE);
  drawText(ctx, '▼', Math.round(hp.x) - 2, Math.round(hp.y) - 1 + bob, GOLD[2], 1, OUTLINE);

  if (state.mode === 'title') return title(b);

  // The call waiting for the next 1.
  if (next) {
    const text = `¡${MOVES[next].name}!`, left = Math.ceil(8 - t);
    drawText(ctx, 'NEXT', W - 8 - textWidth(text, 2) - textWidth('NEXT ') , 10, CREAM, 1, OUTLINE);
    if (left > 1 || Math.floor(b * 4) % 2 === 0) drawText(ctx, text, W - 8 - textWidth(text, 2), 6, GOLD, 2, OUTLINE, { shadow: OUTLINE });
    drawText(ctx, `IN ${left}`, W - 8 - textWidth(`IN ${left}`), 24, '#c0a888', 1, OUTLINE);
  }

  // The move's name over the circle on its 1; otherwise a big 1 and 5 in
  // the middle of the circle.
  if (fig.shift && t < 1.2) {
    const s = t < 0.08 ? 5 : 4;
    if (t < 0.6 || Math.floor(b * 6) % 2 === 0) centerText(ctx, `¡${fig.name}!`, 12 - (s - 4) * 2, GOLD, s, OUTLINE, { shadow: OUTLINE });
  } else if ((cnt === 0 || cnt === 4) && t % 4 < 0.45) {
    const s = t % 4 < 0.08 ? 5 : 4;
    centerText(ctx, String(cnt + 1), OY - 28 - (s - 4) * 3, cnt === 0 ? GOLD : CREAM, s, OUTLINE, { shadow: OUTLINE });
  }

  // The count strip.
  const cw = 18, x0 = Math.round(W / 2 - (cw * 8) / 2), y0 = H - 22;
  for (let n = 0; n < 8; n++) {
    const x = x0 + n * cw, cur = n === cnt, key = n === 0 || n === 4, pause = n === 3 || n === 7;
    ctx.fillStyle = OUTLINE; ctx.fillRect(x, y0 - (cur ? 2 : 0), cw - 2, 19);
    ctx.fillStyle = cur ? (key ? '#f8d040' : '#f2e6cc') : key ? '#5a3a1a' : '#2e1c20';
    ctx.fillRect(x + 1, y0 + 1 - (cur ? 2 : 0), cw - 4, 17);
    if (key && !cur) { ctx.fillStyle = '#f0b020'; ctx.fillRect(x + 1, y0 + 16, cw - 4, 2); }
    drawText(ctx, String(n + 1), x + 3, y0 + 2 - (cur ? 2 : 0), cur ? OUTLINE : pause ? '#7a6060' : key ? '#f8d040' : CREAM, 2, null);
  }
  drawText(ctx, `1P ${state.role === 'lead' ? 'LEAD' : 'FOLLOW'}`, 8, H - 20, GOLD[2], 1, OUTLINE);
  drawText(ctx, state.half ? '½× PRÁCTICA' : '', 8, H - 10, '#a8e878', 1, OUTLINE);
  const idle = !next && !fig.shift && b - Math.max(state.calledAt, state.startedAt) > 12;
  if (idle && Math.floor(b * 2) % 2 === 0) centerText(ctx, `SPACE: CALL ¡${MOVES[state.move].name}!`, H - 33, CREAM, 1, OUTLINE);
  if (b - state.startedAt < 4 && b - state.startedAt >= 0) centerText(ctx, '¡A BAILAR!', 12, GOLD, 4, OUTLINE, { shadow: OUTLINE });
}

const ROLE_HIT = { lead: [W / 2 - 92, W / 2 - 28], follow: [W / 2 + 22, W / 2 + 96] };
function title(b) {
  // Above and below the circle, so the dancers show.
  centerText(ctx, 'RUEDA', 4, GOLD, 5, OUTLINE, { shadow: OUTLINE });
  centerText(ctx, 'DE CASINO', H - 56, CREAM, 2, OUTLINE);
  const blink = Math.floor(b) % 2 === 0;
  const sel = (role, text, x) => drawText(ctx, text, x, H - 34, state.role === role ? (blink ? GOLD : '#f8d040') : '#7a6a60', 2, OUTLINE);
  sel('lead', '◄ LEAD', ROLE_HIT.lead[0]);
  sel('follow', 'FOLLOW ►', ROLE_HIT.follow[0]);
  if (blink) centerText(ctx, 'PRESS SPACE OR CLICK TO DANCE', H - 12, CREAM, 1, OUTLINE);
  drawText(ctx, 'T: TUNE THE FEEL', W - 8 - textWidth('T: TUNE THE FEEL'), 8, '#c0a888', 1, OUTLINE);
}

// ------------------------------------------------------------ moves library
const lib = document.getElementById('moves');
let libKey = '';
function buildLibrary() {
  const list = lib.querySelector('ol');
  list.innerHTML = '';
  Object.values(MOVES).forEach((mv, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" data-move="${mv.id}"><kbd>${i + 1}</kbd><b>${mv.name}</b><i></i><small>${mv.blurb}</small></button>`;
    li.querySelector('button').addEventListener('click', (e) => { e.currentTarget.blur(); select(mv.id); });
    list.appendChild(li);
  });
  libKey = '';
}
function select(id) {
  if (id !== state.move) music.sfx('select');
  state.move = id;
}
// Marks the selected move, and the one dancing now or next.
function syncLibrary(b) {
  const m = Math.floor(b / 8), now = timeline.get(m), next = timeline.get(m + 1), key = `${state.move}|${now}|${next}`;
  if (key === libKey) return;
  libKey = key;
  for (const btn of lib.querySelectorAll('button[data-move]')) {
    const id = btn.dataset.move;
    btn.classList.toggle('on', id === state.move);
    btn.querySelector('i').textContent = id === now ? 'NOW' : id === next ? 'NEXT' : '';
  }
}

// ------------------------------------------------------------ input
function setRole(role) { state.role = role; }
addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'INPUT') return;
  const k = e.code, ids = Object.keys(MOVES);
  if (k === 'Space' || k === 'Enter' || k === 'KeyZ') { e.preventDefault(); call(); }
  else if (k === 'ArrowLeft' || k === 'KeyA') setRole('lead');
  else if (k === 'ArrowRight' || k === 'KeyD') setRole('follow');
  else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); select(ids[mod(ids.indexOf(state.move) + (k === 'ArrowUp' ? -1 : 1), ids.length)]); }
  else if (/^Digit[1-9]$/.test(k) && ids[+k.slice(5) - 1]) select(ids[+k.slice(5) - 1]);
  else if (k === 'KeyT') toggleTune();
  else if (k === 'KeyM') {
    state.muted = !state.muted;
    if (music.out) music.out.gain.value = state.muted ? 0 : 0.7;
    if (state.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  }
  else if (k === 'KeyS') { state.half = !state.half; music.setBpm(P.bpm * (state.half ? 0.5 : 1)); }
});
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  if (state.mode === 'title' && y > H - 48) {
    for (const [role, [x0, x1]] of Object.entries(ROLE_HIT)) if (x >= x0 && x <= x1) return setRole(role);
  }
  call();
});

// ------------------------------------------------------------ tune panel
const panel = document.getElementById('tune');
function toggleTune() { panel.hidden = !panel.hidden; }
document.getElementById('tuneBtn').addEventListener('click', (e) => { e.currentTarget.blur(); toggleTune(); });
function saveUrl() {
  const u = new URLSearchParams();
  for (const [k, [d]] of Object.entries(SPEC)) if (P[k] !== d) u.set(k, P[k]);
  history.replaceState(null, '', u.size ? `?${u}` : location.pathname);
}
function buildPanel() {
  const rows = panel.querySelector('.rows');
  rows.innerHTML = '';
  for (const [k, [, lo, hi, st, label]] of Object.entries(SPEC)) {
    const row = document.createElement('label');
    row.innerHTML = `<span>${label}</span><b></b><input type="range" min="${lo}" max="${hi}" step="${st}">`;
    const input = row.querySelector('input'), val = row.querySelector('b');
    input.value = P[k]; val.textContent = P[k];
    input.addEventListener('input', () => {
      P[k] = +input.value; val.textContent = P[k];
      if (k === 'bpm') music.setBpm(P.bpm * (state.half ? 0.5 : 1));
      if (k === 'couples') { build(); buildPlaza(); }
      saveUrl();
    });
    rows.appendChild(row);
  }
}
panel.querySelector('[data-copy]').addEventListener('click', async (e) => {
  await navigator.clipboard.writeText(location.href).catch(() => {});
  e.currentTarget.textContent = 'COPIED ✓';
  setTimeout(() => (e.target.textContent = 'COPY LINK'), 1400);
});
panel.querySelector('[data-reset]').addEventListener('click', () => {
  for (const [k, [d]] of Object.entries(SPEC)) P[k] = d;
  music.setBpm(P.bpm * (state.half ? 0.5 : 1));
  build(); buildPlaza(); buildPanel(); saveUrl();
});

const stage = document.getElementById('stage');
function fit() {
  const dpr = devicePixelRatio || 1, w = stage.clientWidth - 12, h = stage.clientHeight - 12;
  // Whole device pixels per game pixel when that fills most of the space.
  const fill = Math.min(w / W, h / H), crisp = Math.floor(fill * dpr) / dpr;
  const k = crisp >= fill * 0.8 ? crisp : fill;
  canvas.style.width = `${W * k}px`;
  canvas.style.height = `${H * k}px`;
}
addEventListener('resize', fit);

build();
if (q.has('call')) timeline.set(1, MOVES[q.get('call')] ? q.get('call') : state.move);
buildPlaza();
buildPanel();
buildLibrary();
fit();
window.rueda = { P, state, music, timeline, leads: () => leads, follows: () => follows, seek: (b) => { frozen = b; }, call };
requestAnimationFrame(frame);
