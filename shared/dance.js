// Dance data and body math for Rueda. Renderers only draw what this returns.
//
// Coordinates are meters. The ground is (x, y) seen from above with math axes
// (x right, y up, counterclockwise angles); height is z.
// Headings are degrees, unwrapped and counterclockwise-positive: a rising
// heading is a left turn, a falling heading is a right turn.
//
// Each figure is one 8-count measure in a couple-local frame: the lead's home is
// (0, 0) facing +y (90°), the follow's home is (0, D) facing -y (-90°), and the
// joined hands (lead's left, follow's right) are on the -x side.
// Time t is in counts from the figure's count 1: count n lands at t = n - 1.
// Root keys run from t = -0.5 (the "and" before 1) to t = 7.5, where the next
// measure's figure takes over.
//
// Root keys:  [t, x, y, heading]
// Steps:      [t, foot, fwd, side]  the foot lands on t, placed relative to the
//             root at that time (fwd along the heading, side positive = left).
//             [t, foot, 'w'] shifts weight without moving; [t, foot, 'tap'] taps.
// Hand keys:  [t, mode, height]

export const D = 0.9;
export const MEASURE = 8;
const DEG = Math.PI / 180;

export const FIGURES = {
  // Open basic: back-rock on 1-2-3, forward-rock on 5-6-7, taps on 4 and 8.
  guapea: {
    label: 'Guapea',
    lead: {
      root: [[-0.5, 0, 0, 90], [0, 0, -0.08, 90], [1, 0, -0.02, 90], [2, 0, 0, 90], [4, 0, 0.06, 90], [5, 0, 0.01, 90], [6, 0, 0, 90], [7.5, 0, 0, 90]],
      steps: [[0, 'L', -0.17], [1, 'R', 'w'], [2, 'L'], [3, 'R', 'tap'], [4, 'R', 0.15], [5, 'L', 'w'], [6, 'R'], [7, 'L', 'tap']],
    },
    follow: {
      root: [[-0.5, 0, D, -90], [0, 0, D + 0.08, -90], [1, 0, D + 0.02, -90], [2, 0, D, -90], [4, 0, D - 0.06, -90], [5, 0, D - 0.01, -90], [6, 0, D, -90], [7.5, 0, D, -90]],
      steps: [[0, 'R', -0.17], [1, 'L', 'w'], [2, 'R'], [3, 'L', 'tap'], [4, 'L', 0.15], [5, 'R', 'w'], [6, 'L'], [7, 'R', 'tap']],
    },
    joined: [[-0.5, 'mid', 1.05], [0, 'mid', 0.98], [1.5, 'mid', 1.02], [4, 'mid', 1.1], [6, 'mid', 1.05], [7.5, 'mid', 1.05]],
    leadR: [[-0.5, 'free']],
    followL: [[-0.5, 'free']],
  },

  // Media enchufla: she starts the enchufla (left turn under his raised left
  // hand, crossing in front of him), he stops her with his right hand on her
  // back on 3-4 and sends her back with a right turn on 5-6-7.
  halfEnchufla: {
    label: 'Media enchufla',
    lead: {
      root: [[-0.5, 0, 0, 90], [0, 0, -0.08, 90], [1, 0, -0.02, 82], [2, -0.15, 0.02, 20], [3, -0.16, 0.02, 12], [4, -0.08, -0.01, 45], [5, -0.02, 0, 80], [6, 0, 0, 90], [7.5, 0, 0, 90]],
      steps: [[0, 'L', -0.17], [1, 'R', 'w'], [2, 'L'], [3, 'R', 'tap'], [4, 'R'], [5, 'L'], [6, 'R'], [7, 'L', 'tap']],
    },
    follow: {
      root: [[-0.5, 0, D, -90], [0, 0, D + 0.08, -90], [1, 0.06, 0.58, -82], [2, 0.33, 0.12, 0], [3, 0.34, 0.1, 4], [4, 0.24, 0.42, -45], [5, 0.08, 0.76, -82], [6, 0, D, -90], [7.5, 0, D, -90]],
      steps: [[0, 'R', -0.17], [1, 'L', 0.05], [2, 'R'], [3, 'L', 'tap'], [4, 'L'], [5, 'R'], [6, 'L'], [7, 'R', 'tap']],
    },
    joined: [[-0.5, 'mid', 1.05], [0, 'mid', 0.98], [1, 'mid', 1.45], [1.6, 'over', 1.85], [3.8, 'over', 1.85], [4.8, 'over', 1.8], [5.6, 'mid', 1.35], [6.5, 'mid', 1.05], [7.5, 'mid', 1.05]],
    leadR: [[-0.5, 'free'], [1.3, 'free'], [1.9, 'back'], [4.3, 'back'], [5, 'free']],
    followL: [[-0.5, 'free'], [1, 'style'], [5.2, 'style'], [6.3, 'free']],
  },

  // Enchufla: same start, but she completes a half left turn on 3 and lands in
  // his starting spot while he turns right and steps back to her left side,
  // right hand on her back (posición caída).
  enchufla: {
    label: 'Enchufla',
    lead: {
      root: [[-0.5, 0, 0, 90], [0, 0, -0.08, 90], [1, -0.04, -0.02, 80], [2, -0.3, 0.02, 15], [3, -0.38, 0, 2], [4, -0.44, 0, 0], [5, -0.42, 0, 0], [6, -0.4, 0, 0], [7.5, -0.4, 0, 0]],
      steps: [[0, 'L', -0.17], [1, 'R', 'w'], [2, 'L'], [3, 'R', 'tap'], [4, 'R', -0.08], [5, 'L', 'w'], [6, 'R'], [7, 'L', 'tap']],
    },
    follow: {
      root: [[-0.5, 0, D, -90], [0, 0, D + 0.08, -90], [1, 0.1, 0.5, -75], [2, 0.12, 0.02, 85], [3, 0.1, 0, 90], [4, 0.08, -0.06, 90], [5, 0.07, -0.02, 90], [6, 0.06, 0, 90], [7.5, 0.06, 0, 90]],
      steps: [[0, 'R', -0.17], [1, 'L', 0.05], [2, 'R'], [3, 'L', 'tap'], [4, 'L', -0.12], [5, 'R', 'w'], [6, 'L'], [7, 'R', 'tap']],
    },
    joined: [[-0.5, 'mid', 1.05], [0, 'mid', 0.98], [1, 'mid', 1.45], [1.4, 'over', 1.85], [2.5, 'over', 1.8], [3.6, 'front', 1.2], [7.5, 'front', 1.15]],
    leadR: [[-0.5, 'free'], [1.3, 'free'], [1.9, 'back'], [7.5, 'back']],
    followL: [[-0.5, 'free'], [1, 'style'], [3.5, 'style'], [4.5, 'free']],
  },

  // Dile que no from caída: he breaks back and turns a quarter left, she walks
  // forward across in front of him and does a half left turn on 3, landing back
  // in open position for the forward-rock on 5-6-7.
  dileQueNo: {
    label: 'Dile que no',
    lead: {
      root: [[-0.5, -0.4, 0, 0], [0, -0.5, 0, 8], [1, -0.38, 0, 45], [2, -0.2, 0, 90], [3, -0.18, 0, 90], [4, -0.12, 0.06, 90], [5, -0.05, 0.01, 90], [6, 0, 0, 90], [7.5, 0, 0, 90]],
      steps: [[0, 'L', -0.12], [1, 'R'], [2, 'L'], [3, 'R', 'tap'], [4, 'R', 0.15], [5, 'L', 'w'], [6, 'R'], [7, 'L', 'tap']],
    },
    follow: {
      root: [[-0.5, 0.06, 0, 90], [0, 0.06, 0.25, 90], [1, 0, 0.6, 130], [2, -0.15, D, 270], [3, -0.16, D, 270], [4, -0.12, D - 0.06, 270], [5, -0.05, D - 0.01, 270], [6, 0, D, 270], [7.5, 0, D, 270]],
      steps: [[0, 'R', 0.02], [1, 'L'], [2, 'R'], [3, 'L', 'tap'], [4, 'L', 0.15], [5, 'R', 'w'], [6, 'L'], [7, 'R', 'tap']],
    },
    joined: [[-0.5, 'front', 1.15], [0, 'front', 1.1], [0.8, 'mid', 1.4], [1.6, 'over', 1.6], [2.4, 'mid', 1.3], [3.5, 'mid', 1.08], [7.5, 'mid', 1.05]],
    leadR: [[-0.5, 'back'], [0.5, 'back'], [1.2, 'free']],
    followL: [[-0.5, 'free'], [1, 'style'], [3, 'style'], [4, 'free']],
  },
};

// A call is a sequence of measures. The couple-dance enchufla doble opens back
// up with a dile que no, so the couple stays together.
export const CALLS = {
  enchuflaDoble: { name: '¡Enchufla doble!', parts: ['halfEnchufla', 'enchufla', 'dileQueNo'] },
};

// Body proportions (meters).
export const BODY = {
  lead: { pelvisH: 0.93, hipW: 0.1, thigh: 0.45, shin: 0.44, ankleH: 0.07, foot: 0.24, spine: 0.52, neck: 0.08, headR: 0.11, shW: 0.2, upper: 0.3, fore: 0.27, chestR: 0.14 },
  follow: { pelvisH: 0.87, hipW: 0.1, thigh: 0.42, shin: 0.41, ankleH: 0.08, foot: 0.21, spine: 0.47, neck: 0.08, headR: 0.1, shW: 0.17, upper: 0.28, fore: 0.25, chestR: 0.12 },
};

// ---------------------------------------------------------------- math helpers

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (s) => s * s * (3 - 2 * s);
const lerp = (a, b, s) => a + (b - a) * s;
const v3 = (x, y, z) => ({ x, y, z });
const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a) => Math.hypot(a.x, a.y, a.z);
const norm = (a) => { const l = len(a) || 1; return mul(a, 1 / l); };
const lerp3 = (a, b, s) => v3(lerp(a.x, b.x, s), lerp(a.y, b.y, s), lerp(a.z, b.z, s));
export const wrapDeg = (a) => ((a + 180) % 360 + 360) % 360 - 180;

// Hermite through the keys with damped Catmull-Rom tangents: smooth travel that
// still settles on each count, like weight landing on the beat.
const TANGENT = 0.6;
function sampleKeys(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const k0 = keys[i], k1 = keys[i + 1], kp = keys[i - 1], kn = keys[i + 2];
  const h = k1[0] - k0[0];
  const s = (t - k0[0]) / h, s2 = s * s, s3 = s2 * s;
  const out = [];
  for (let j = 1; j < k0.length; j++) {
    const m0 = kp ? (k1[j] - kp[j]) / (k1[0] - kp[0]) : 0;
    const m1 = kn ? (kn[j] - k0[j]) / (kn[0] - k0[0]) : 0;
    out.push((2 * s3 - 3 * s2 + 1) * k0[j] + (s3 - 2 * s2 + s) * h * m0 * TANGENT + (-2 * s3 + 3 * s2) * k1[j] + (s3 - s2) * h * m1 * TANGENT);
  }
  return out;
}

// ------------------------------------------------------------ footwork per role

const FOOT_SIDE = 0.1;
const SWING = 0.45; // counts a stepping foot spends in the air before landing

const prepared = new Map();
function events(fig, role) {
  const key = fig.label + role;
  if (prepared.has(key)) return prepared.get(key);
  const list = fig[role].steps.map(([t, foot, a, b]) => {
    if (a === 'tap' || a === 'w') return { t, foot, kind: a };
    const [x, y, th] = sampleKeys(fig[role].root, t);
    const fwd = a ?? 0, side = b ?? (foot === 'L' ? FOOT_SIDE : -FOOT_SIDE);
    const r = th * DEG;
    return { t, foot, kind: 'step', x: x + Math.cos(r) * fwd - Math.sin(r) * side, y: y + Math.sin(r) * fwd + Math.cos(r) * side };
  });
  prepared.set(key, list);
  return list;
}

// Dancer state in the couple frame at time t of `fig`, with `prev` the figure of
// the measure before (for where the feet were planted).
function dancerLocal(role, prev, fig, t) {
  const keys = fig[role].root;
  const [x, y, th] = sampleKeys(keys, t);
  const evs = events(prev, role).map((e) => ({ ...e, t: e.t - MEASURE })).concat(events(fig, role));
  const feet = {};
  for (const f of ['L', 'R']) {
    let plant = null, next = null, tap = null;
    for (const e of evs) {
      if (e.foot !== f) continue;
      if (e.kind === 'step') {
        if (e.t <= t) plant = e;
        else if (!next) next = e;
      } else if (e.kind === 'tap' && t > e.t - 0.35 && t < e.t + 0.15) tap = e;
    }
    let fx = plant ? plant.x : x, fy = plant ? plant.y : y, lift = 0, landed = plant ? plant.t : -99;
    if (next && t > next.t - SWING) {
      const s = (t - (next.t - SWING)) / SWING;
      const dist = Math.hypot(next.x - fx, next.y - fy);
      fx = lerp(fx, next.x, ease(s));
      fy = lerp(fy, next.y, ease(s));
      lift = Math.sin(Math.PI * s) * (0.025 + Math.min(dist, 0.5) * 0.12);
    }
    if (tap) {
      const s = clamp((t - (tap.t - 0.35)) / 0.5, 0, 1);
      lift = Math.max(lift, Math.sin(Math.PI * s) * 0.04);
    }
    feet[f] = { x: fx, y: fy, lift, landed };
  }
  // Weight follows the last foot that took it; hips sway over that foot (Cuban motion).
  const weightEvs = evs.filter((e) => e.kind !== 'tap' && e.t <= t + 0.1);
  const last = weightEvs[weightEvs.length - 1], before = weightEvs[weightEvs.length - 2];
  const sign = (e) => (!e ? 0 : e.foot === 'L' ? 1 : -1);
  const w = last ? ease(clamp((t - last.t + 0.1) / 0.45, 0, 1)) : 1;
  const sway = lerp(sign(before), sign(last), w);
  const h0 = sampleKeys(keys, t - 0.04)[2], h1 = sampleKeys(keys, t + 0.04)[2];
  return { x, y, th, feet, sway, omega: (h1 - h0) / 0.08 };
}

// ------------------------------------------------------------------ body + IK

function ik(a, target, l1, l2, pole) {
  const d = sub(target, a);
  const dist = len(d);
  const reach = clamp(dist, Math.abs(l1 - l2) + 0.02, (l1 + l2) * 0.995);
  const n = mul(d, 1 / (dist || 1));
  const along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  let p = sub(pole, mul(n, dot(pole, n)));
  if (len(p) < 1e-4) p = v3(0, 0, -1);
  p = norm(p);
  return [add(a, add(mul(n, along), mul(p, h))), add(a, mul(n, reach))];
}

function toWorld(st, frame) {
  const r = frame.rot * DEG, c = Math.cos(r), s = Math.sin(r);
  const tx = (x, y) => ({ x: frame.ox + c * x - s * y, y: frame.oy + s * x + c * y });
  const p = tx(st.x, st.y);
  const feet = {};
  for (const f of ['L', 'R']) feet[f] = { ...st.feet[f], ...tx(st.feet[f].x, st.feet[f].y) };
  return { ...st, x: p.x, y: p.y, th: st.th + frame.rot, feet };
}

// Legs, pelvis, torso and head. Arms come later because hands depend on the partner.
function bodyPose(role, st) {
  const P = BODY[role];
  const r = st.th * DEG;
  const fwd = v3(Math.cos(r), Math.sin(r), 0), left = v3(-Math.sin(r), Math.cos(r), 0);
  const sway = st.sway;
  const pelvis = v3(st.x + left.x * sway * 0.035, st.y + left.y * sway * 0.035, P.pelvisH - 0.015 * (1 - Math.abs(sway)));
  const hy = (st.th - sway * 8) * DEG;
  const hipLeft = v3(-Math.sin(hy), Math.cos(hy), 0);
  const hipL = add(pelvis, add(mul(hipLeft, P.hipW), v3(0, 0, sway * 0.018)));
  const hipR = add(pelvis, add(mul(hipLeft, -P.hipW), v3(0, 0, -sway * 0.018)));
  const legs = {};
  for (const [f, hip, s] of [['L', hipL, 1], ['R', hipR, -1]]) {
    const ft = st.feet[f];
    const yaw = r + s * 0.12;
    const fdir = v3(Math.cos(yaw), Math.sin(yaw), 0);
    const ankle = v3(ft.x - fdir.x * 0.05, ft.y - fdir.y * 0.05, P.ankleH + ft.lift);
    const [knee, ank] = ik(hip, ankle, P.thigh, P.shin, add(fdir, mul(left, s * 0.15)));
    legs[f] = { knee, ankle: ank, toe: add(ank, v3(fdir.x * P.foot * 0.75, fdir.y * P.foot * 0.75, -P.ankleH * 0.6)) };
  }
  const cy = (st.th + sway * 5) * DEG;
  const chestLeft = v3(-Math.sin(cy), Math.cos(cy), 0);
  const chestFwd = v3(Math.cos(cy), Math.sin(cy), 0);
  const shoulderMid = add(pelvis, add(mul(chestFwd, 0.02), v3(0, 0, P.spine)));
  const neck = add(shoulderMid, v3(0, 0, P.neck));
  // Followers spot their turns: the head leads the body in the turn direction.
  const spot = role === 'follow' ? clamp(st.omega * 0.12, -55, 55) : clamp(st.omega * 0.05, -20, 20);
  return {
    role, P, th: st.th, headYaw: st.th + spot, omega: st.omega, sway, fwd, left, chestFwd, chestLeft,
    flare: clamp((Math.abs(st.omega) - 40) / 260, 0, 1),
    feet: st.feet,
    j: {
      pelvis, hipL, hipR,
      kneeL: legs.L.knee, kneeR: legs.R.knee, ankleL: legs.L.ankle, ankleR: legs.R.ankle, toeL: legs.L.toe, toeR: legs.R.toe,
      chest: add(pelvis, v3(0, 0, P.spine * 0.62)),
      neck, head: add(neck, v3(0, 0, P.headR + 0.03)),
      shL: add(shoulderMid, mul(chestLeft, P.shW)), shR: add(shoulderMid, mul(chestLeft, -P.shW)),
    },
  };
}

// A point in a body's own frame: fwd, left, height.
const local = (b, f, l, h) => v3(b.j.pelvis.x + b.chestFwd.x * f + b.chestLeft.x * l, b.j.pelvis.y + b.chestFwd.y * f + b.chestLeft.y * l, h);

const FREE = {
  lead: (b, beat) => local(b, 0.12, -0.24, 0.98),
  follow: (b, beat) => local(b, 0.1, 0.25, 0.98),
};

function handTarget(mode, h, L, F, beat) {
  switch (mode) {
    case 'mid': {
      const m = lerp3(L.j.shL, F.j.shR, 0.5);
      return v3(m.x, m.y, h);
    }
    case 'over': {
      const toLead = norm(v3(L.j.pelvis.x - F.j.pelvis.x, L.j.pelvis.y - F.j.pelvis.y, 0));
      return v3(F.j.head.x + toLead.x * 0.18, F.j.head.y + toLead.y * 0.18, h);
    }
    case 'front': return local(F, 0.32, -0.1, h);
    case 'back': return local(F, -0.14, 0.02, 1.18);
    case 'freeL': return FREE.lead(L, beat);
    case 'freeF': return FREE.follow(F, beat);
    case 'style': return local(F, 0.04, 0.7, 1.5);
    case 'signal': return local(L, 0.1, -0.22, 1.72 + 0.07 * Math.sin(beat * Math.PI * 2));
  }
}

function sampleHand(keys, t, L, F, beat, freeMode) {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const [t0, m0, h0] = keys[i];
  const pos0 = handTarget(m0 === 'free' ? freeMode : m0, h0, L, F, beat);
  const k1 = keys[i + 1];
  if (!k1 || t <= t0) return pos0;
  const pos1 = handTarget(k1[1] === 'free' ? freeMode : k1[1], k1[2], L, F, beat);
  return lerp3(pos0, pos1, ease(clamp((t - t0) / (k1[0] - t0), 0, 1)));
}

function arm(b, side, target) {
  const P = b.P;
  const sh = side === 'L' ? b.j.shL : b.j.shR;
  const s = side === 'L' ? 1 : -1;
  const pole = add(v3(0, 0, -1), add(mul(b.chestLeft, s * 0.7), mul(b.chestFwd, -0.35)));
  const [el, wr] = ik(sh, target, P.upper, P.fore, pole);
  b.j['el' + side] = el;
  b.j['wr' + side] = wr;
}

function clampReach(from, to, reach) {
  const d = sub(to, from), l = len(d);
  return l <= reach ? to : add(from, mul(d, reach / l));
}

// Everything a renderer needs for one couple at beat time t of `fig`.
// opts.signal: the lead raises his right fist (the caller's hand signal).
export function couplePose(prev, fig, t, frame, beat, opts = {}) {
  const L = bodyPose('lead', toWorld(dancerLocal('lead', prev, fig, t), frame));
  const F = bodyPose('follow', toWorld(dancerLocal('follow', prev, fig, t), frame));
  // Joined hands: both arms reach for the same point; if it is out of reach,
  // pull it back toward whoever cannot reach until both can.
  let grip = sampleHand(fig.joined, t, L, F, beat);
  for (let k = 0; k < 3; k++) {
    const a = clampReach(L.j.shL, grip, (L.P.upper + L.P.fore) * 0.99);
    const b = clampReach(F.j.shR, grip, (F.P.upper + F.P.fore) * 0.99);
    grip = lerp3(a, b, 0.5);
  }
  arm(L, 'L', grip);
  arm(F, 'R', grip);
  arm(L, 'R', opts.signal ? handTarget('signal', 0, L, F, beat) : sampleHand(fig.leadR, t, L, F, beat, 'freeL'));
  arm(F, 'L', sampleHand(fig.followL, t, L, F, beat, 'freeF'));
  return { lead: L, follow: F, grip };
}
