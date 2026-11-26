// The dancers: who they are and what they look like (build()), where each
// one is on the floor at a beat (root()), and their bodies, legs and feet
// (body()), from the figures' keys. The hands are in hands.js.

import { ARRIBA_DILE, DILE_QUE_SI, tuyaBars } from './figures/arriba.js';
import { DIST, HIPS, KNEES, PLACE } from './figures/guapea.js';
import { P } from './knobs.js';
import { DEG, TAU, add, backOut, clamp, dot, inOut, len, lerp, mix, mod, mul, norm, ramp, rng, smooth, sub, v3 } from './math.js';
import { MOVES } from './moves.js';
import { clearCalls, figureAt, shiftBefore, travelBefore } from './timeline.js';

// One track's keys for the measures around beat b, on the absolute beat line,
// so each figure flows into the next.
function keysAround(d, name, b) {
  const m = Math.floor(b / 8), out = [];
  for (let mm = m - 1; mm <= m + 1; mm++) for (const k of figureAt(mm)[d.role][name] ?? (name === 'hips' ? HIPS : [[0, 1]])) out.push([k[0] + mm * 8, ...k.slice(1)]);
  return out;
}
export function activeAbs(keys, b, pre, post) {
  let i = 0;
  for (let k = 0; k < keys.length; k++) if (keys[k][0] - pre <= b) i = k;
  return { k: keys[i], prev: keys[Math.max(0, i - 1)], u: clamp((b - (keys[i][0] - pre)) / (pre + post), 0, 1) };
}
// A foot's step at beat b, as activeAbs: it lifts LIFT before it lands, or
// earlier if the step before it says how long it stays down ([5], beats).
// Such a long stride (long) goes on steadily all the way, so the foot doesn't
// get ahead of the body and wait there.
function stepAt(keys, b) {
  const pre = (k) => (k > 0 && keys[k - 1][5] !== undefined ? Math.max(LIFT, keys[k][0] - keys[k - 1][0] - keys[k - 1][5]) : LIFT);
  let i = 0;
  for (let k = 0; k < keys.length; k++) if (keys[k][0] - pre(k) <= b) i = k;
  return { k: keys[i], prev: keys[Math.max(0, i - 1)], u: clamp((b - (keys[i][0] - pre(i))) / pre(i), 0, 1), long: pre(i) > LIFT };
}
// Root keys as a smooth curve (Hermite with damped Catmull-Rom tangents), at
// rest on the first and last key.
function evalRoot(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], h = b[0] - a[0], u = clamp((t - a[0]) / h, 0, 1);
  const v = (k, c) => k[c] ?? 0; // aim is optional
  const tan = (j, c) => (j <= 0 || j >= keys.length - 1 ? 0 : ((v(keys[j + 1], c) - v(keys[j - 1], c)) / (keys[j + 1][0] - keys[j - 1][0])) * 0.85);
  const u2 = u * u, u3 = u2 * u;
  return [1, 2, 3, 4, 5].map((c) => (2 * u3 - 3 * u2 + 1) * v(a, c) + (u3 - 2 * u2 + u) * h * tan(i, c) + (3 * u2 - 2 * u3) * v(b, c) + (u3 - u2) * h * tan(i + 1, c));
}

// Each key's window is [beat - pre, beat + post]; between windows it holds.
function active(keys, t, pre, post) {
  let best = -Infinity, i = 0;
  for (let p = -8; p <= 8; p += 8) for (let k = 0; k < keys.length; k++) {
    const s = keys[k][0] + p - pre;
    if (s <= t && s > best) { best = s; i = k; }
  }
  return { k: keys[i], prev: keys[(i + keys.length - 1) % keys.length], u: clamp((t - best) / (pre + post), 0, 1) };
}
export function track(keys, t, pre, post, ease = smooth) {
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
export function ik(a, target, l1, l2, pole) {
  const D = sub(target, a), d = clamp(len(D), 0.01, l1 + l2 - 0.001), dir = norm(D);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = norm(sub(pole, mul(dir, dot(pole, dir))));
  return { mid: add(a, add(mul(dir, x), mul(p, h))), end: add(a, mul(dir, d)) };
}

// ------------------------------------------------------------ the people
export const OUTLINE = '#24121a';
export const SKIN = [['#c27a52', '#eeb48a'], ['#8c4a2a', '#b8703f'], ['#5a2c16', '#80492a'], ['#d89a70', '#f6cfa6']];
export const HAIR = [['#1c1014', '#3c2228'], ['#3a1c10', '#6c3418'], ['#2a1810', '#54301c']];
export const SHIRT = [['#c8bca0', '#f6f0dc'], ['#8eb4c8', '#cfe6ee'], ['#d0b060', '#f4dc94'], ['#c8a8a0', '#f2d8cc']];
export const PANTS = [['#1c2440', '#34406a'], ['#4a3020', '#74503a'], ['#2a2a30', '#4a4a54'], ['#6a5a40', '#9c8664']];
export const DRESS = [['#9a1420', '#e0303a'], ['#b88a10', '#f2c832'], ['#0a6a6a', '#18aaa0'], ['#5a2a8a', '#9050c8'], ['#c05010', '#f08028'], ['#b0306a', '#ec6aa0'], ['#2a6a2a', '#4ca84a'], ['#1a3a9a', '#3a6ae0']];
export const HAT = ['#b08a40', '#e8c878'];
export const BAND = ['#a01818', '#202024', '#1a2a6a', '#6a1a4a'];
export const SHOES = ['#140c0c', '#3a2418'];
export const HEELS = ['#a07020', '#e8c050'];
export const FLOWER = ['#f6efe0', '#f05060'];
export const EYE = '#1a0e14', MOUTH = '#8a2a30', TRIM = '#f6efe0';

export const ARM = [6.8, 6.6], THIGH = 6.4, SHIN = 6.2, HEAD_R = 5.8;
const LEG2 = (THIGH + SHIN) ** 2 * 0.97; // the furthest a leg reaches, squared
// Hip height above the ankles (1.3) against the leg's length is how bent the
// knees are standing: hipZ, crouched, and STAND * P.stand higher (about 150
// degrees at the knee). DIP: how far the knees dip on each step (dip()).
// SINK: how far below their height at Straight legs 1 the hips may come down
// for a wide step, so straighter legs still reach as far.
export const STAND = 2.2, DIP = 1.3, SINK = 2.5;
const softMin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4; };
const FRONT = (225 * Math.PI) / 180; // the couple nearest the camera, seen side-on
// Leads and follows are listed separately because partners change: at
// measure m, lead i dances with follow i + shiftBefore(m).
export let leads = [], follows = [], R = 0, SLOT = 0;
export const dancers = () => leads.concat(follows);

export function build() {
  const n = P.couples;
  // A tight circle: the next couple is about as close as your partner.
  R = (n * (DIST + 24)) / TAU;
  SLOT = TAU / n;
  // In arriba the circle closes up to a place every RING * PLACE px, but with
  // few couples not so far that the guys going round inside run into each other.
  RING = Math.min(1, Math.max(0.72, 22 / R));
  MOVES.tuya.bars = tuyaBars(n);
  leads = []; follows = [];
  clearCalls();
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

// Measure m's root keys. Across the bar line into a figure that flows on
// from the one before, each side also takes the other's keys, so the curve
// carries on through it instead of coming to rest on the 8. A key on the bar
// line that both have is the same key, so it is kept once; a figure whose
// keys end before the 8 (adentro y afuera) leaves the way on to the next
// one's. A figure that ends a whole turn round (la exhibo) flows on into the
// next one's turn the same way: its turns are taken a whole turn on too.
function rootKeys(d, m) {
  const fig = figureAt(m), prev = figureAt(m - 1), next = figureAt(m + 1), own = fig[d.role].root;
  // Another figure's keys on this measure's beats; a follow's along restarts
  // from her new home after a partner change, and everyone's from where the
  // couples have walked to; turns as near as they come to this one's (the
  // key at its edge next to this one's ref).
  const moved = (f, dt, da, dw, edge, ref) => {
    const keys = f[d.role].root, w = 360 * Math.round((ref[3] - keys.at(edge)[3]) / 360);
    return keys.map(([t, along, out, turn, ...rest]) => [t + dt, along + (d.lead ? 0 : da) + dw, out, turn + w, ...rest]);
  };
  const before = fig.flow ? moved(prev, -8, prev.shift, -(prev.travel ?? 0), -1, own[0]) : [], after = next.flow ? moved(next, 8, -fig.shift, fig.travel ?? 0, 0, own.at(-1)) : [];
  if (before.length && before.at(-1)[0] >= own[0][0]) before.pop();
  if (after.length && after[0][0] <= own.at(-1)[0]) after.shift();
  return [...before, ...own, ...after];
}

// The circle's size at beat b, against the guapea's. In arriba the rueda
// closes up (to RING, see build()), so a place round the circle is shorter
// and the walk and the tarritos cover less ground: from the dile que si's 2
// on, into the first bar walking. It opens up again from the dile que no's
// 1, into the bar after it.
let RING = 1;
function ringIn(m, t) {
  const fig = figureAt(m), prev = figureAt(m - 1);
  if (fig === DILE_QUE_SI) return lerp(ringIn(m - 1, 8), RING, ramp(t, 2, 13));
  if (fig === ARRIBA_DILE) return lerp(ringIn(m - 1, 8), 1, ramp(t, 0, 12));
  if (prev === DILE_QUE_SI) return lerp(ringIn(m - 2, 8), RING, ramp(t + 8, 2, 13));
  if (prev === ARRIBA_DILE) return lerp(ringIn(m - 2, 8), 1, ramp(t + 8, 0, 12));
  return fig.closed === true ? RING : 1;
}
const ringAt = (b) => { const m = Math.floor(b / 8); return ringIn(m, b - m * 8); };

// Where a dancer's body is at beat b: a spot on the floor and a heading. The
// leads keep their places; a follow's home spot moves on one place clockwise
// per partner change. Walking arriba moves everyone's on counterclockwise.
// A gap (px) moves them round the circle without turning them, so it stays
// the same in px however big the circle is.
function root(d, b) {
  let m = Math.floor(b / 8);
  if (b - (m + 1) * 8 >= figureAt(m + 1)[d.role].root[0][0]) m++; // the next move's preparation
  const [along, out, turn, aim, gap] = evalRoot(rootKeys(d, m), b - m * 8);
  const k = ringAt(b), g = gap / (k * PLACE);
  const a = ((d.lead ? 0 : -shiftBefore(m)) + travelBefore(m) + along + g) * SLOT, c = Math.cos(a), s = Math.sin(a);
  const x = k * (d.home.x * c - d.home.y * s), y = k * (d.home.x * s + d.home.y * c), r = Math.hypot(x, y);
  const h = d.h0 + a + turn * DEG + (aim - g) * SLOT;
  return { x: x + (x / r) * out, y: y + (y / r) * out, h, f: { x: Math.cos(h), y: Math.sin(h) }, l: { x: -Math.sin(h), y: Math.cos(h) } };
}

// One dancer's body (no arms) at beat b.
const LIFT = 0.46, LOOK = 0.75;
export function body(d, b) {
  b += d.jit * P.jitter;
  const t = mod(b, 8), S = 4.4 * P.step, sO = d.sO, lead = d.lead, here = root(d, b);
  const Lw = (fwd, side, z) => v3(here.x + here.f.x * fwd + here.l.x * side, here.y + here.f.y * fwd + here.l.y * side, z);
  const trk = (name, pre, post, ease) => { const a = activeAbs(keysAround(d, name, b), b, pre, post); return lerp(a.prev[1], a.k[1], ease(a.u)); };
  const pf = trk('pelvis', 0.3 + 0.4 * P.anticipation, 0.22, inOut) * S * 0.68;
  const ang = trk('angle', 0.4, 0.15, smooth) * -sO * 1.3;
  const ps = trk('hips', 0.42, 0.3, backOut) * sO * 2.2 * P.hips * d.hips * trk('sway', 0.4, 0.4, smooth) + ang;
  const amp = DIP * P.bounce * d.bounce, dp = dip(t) * amp, dpLag = dip(t - 0.09) * amp;
  // A foot lands where the body is about to be and stays there until it
  // lifts again, so traveling steps don't skate.
  // While the circle closes up or opens out it lands where the circle will
  // be a little later (q), so the body drifts across it, not away from it.
  const landing = (k, side) => {
    const r = root(d, k[0] + LOOK), s = side + k[2] * -sO, q = ringAt(k[0] + 2 * LOOK) / ringAt(k[0] + LOOK);
    return v3(q * (r.x + r.f.x * k[1] * S + r.l.x * s), q * (r.y + r.f.y * k[1] * S + r.l.y * s), 0);
  };
  // The hips ride high, the knees only a little bent, and come down (up to
  // SINK) only as far as a foot out in a wide step needs to reach the floor:
  // a foot in the air hands over from where it took off to where it will
  // land, so they start coming down as it swings out.
  const hz = d.hipZ + STAND * P.stand - dp, low = d.hipZ + STAND * Math.min(P.stand, 1) - dp - SINK;
  const feet = [['O', sO], ['I', -sO]].map(([name, side]) => {
    const a = stepAt(keysAround(d, name, b), b), z = Math.sin(Math.PI * a.u) * a.k[3];
    const hip = Lw(pf, ps + side * 2.1, 0), from = landing(a.prev, side * 2.3), to = landing(a.k, side * 2.3), p = mix(from, to, a.long ? smooth(a.u) : inOut(a.u));
    const floor = (q) => Math.max(low, 1.3 + Math.sqrt(Math.max(0, LEG2 - (q.x - hip.x) ** 2 - (q.y - hip.y) ** 2)));
    return { name, side, a, z, p, dh: Math.hypot(p.x - hip.x, p.y - hip.y), reach: lerp(floor(from), floor(to), smooth(a.u)) };
  });
  const reach = Math.min(...feet.map((f) => f.reach));
  const pz = Math.max(softMin(hz, reach, 1), low);
  const pelvis = Lw(pf, ps, pz);
  const knee = (hip, ankle) => ik(hip, ankle, THIGH, SHIN, v3(here.f.x, here.f.y, 0.25)).mid;
  const out = { t, d, Lw, pf, ps, pz, dp, pelvis, f: here.f, l: here.l, h: here.h };
  for (const { name, side, a, z, p: p0, dh } of feet) {
    const heel = lerp(a.prev[4] ?? 0, a.k[4] ?? 0, inOut(a.u)); // a toe tap's heel stays up
    const hip = Lw(pf, ps + side * 2.1, pz);
    let p = p0;
    // A foot the body has left behind slides along rather than stretching the leg.
    const far = Math.sqrt(Math.max(0, LEG2 - (pz - 1.3 - z) ** 2));
    if (dh > far) p = v3(hip.x + ((p.x - hip.x) * far) / dh, hip.y + ((p.y - hip.y) * far) / dh, 0);
    out['ankle' + name] = v3(p.x, p.y, 1.3 + z + heel);
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
