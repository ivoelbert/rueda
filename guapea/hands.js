// The hands: where every hand goes at a beat, for each kind of hold.

import { ARM, STAND, activeAbs, dancers, follows, ik, leads, track } from './body.js';
import { HER_FLOURISH, HIS_FLOURISH, JOINED_OUT, JOINED_Z, PRESS } from './figures/guapea.js';
import { P } from './knobs.js';
import { DEG, TAU, add, bump, clamp, inOut, len, lerp, mix, mod, norm, ramp, smooth, sub, v3 } from './math.js';
import { figureAt, shiftBefore } from './timeline.js';

// Each hand gets a target for this frame (a grip it shares with a partner,
// a spot on the partner's back, or its own rest spot), then IK reaches for it.
const REACH = (ARM[0] + ARM[1]) * 0.97;
export let palms = [];

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
  const jz = 13.5 + STAND * P.stand + (track(JOINED_Z, t, 0.42, 0.2) - 13.5) * P.arms - (L.dp + F.dp) / 2;
  const jo = track(JOINED_OUT, t, 0.42, 0.2) * P.arms;
  return reachable(v3(m.x + o.x * jo, m.y + o.y * jo, jz), L.shO, F.shO);
}
// The dile que no grip: chest high, a little inside the circle, lifted for
// her turn on 6.
function crossGrip(L, F, t) {
  const m = mix(L.shO, F.shO, 0.5), o = norm(v3(m.x, m.y, 0));
  const z = 13 + STAND * P.stand - (L.dp + F.dp) / 2 + 3.5 * bump(t, 4.6, 5.3, 6) * P.arms;
  return reachable(v3(m.x - o.x * 3, m.y - o.y * 3, z), L.shO, F.shO);
}
// The closed hold's joined hands (his left, her right): out on his left side at
// about head height, pumped up (u = 1) and down (u = 0).
function closedGrip(L, F, u) {
  const m = mix(L.shO, F.shO, 0.5), z = (L.head.z + F.head.z) / 2 - 4.5 + 10 * u * P.arms;
  return reachable(v3(m.x + L.l.x * 2.5, m.y + L.l.y * 2.5, z), L.shO, F.shO);
}
// Free hands: bent at the elbow in front of the chest, swinging against the step.
const rest = (B, side) => B.Lw(B.nf + 3.4 - B.pf * 0.35, B.ns + side * (B.d.shW - 1.2), B.nz - (B.d.lead ? 5.2 : 4.4));
// A free hand while he walks on his own (the tarritos): it swings forward and
// a little up as the foot on the other side goes forward, as in the mambo,
// and a little back as it goes back.
function swinging(B, side) {
  const ahead = (n) => (B['ankle' + n].x - B.pelvis.x) * B.f.x + (B['ankle' + n].y - B.pelvis.y) * B.f.y;
  const other = side === B.d.sO ? 'I' : 'O', u = clamp((ahead(other) - ahead(other === 'I' ? 'O' : 'I')) / 12, -1, 1);
  const fwd = u > 0 ? 4 * u : 1.5 * u;
  return add(rest(B, side), v3(B.f.x * fwd, B.f.y * fwd, 2 * Math.max(0, u)));
}
// The inside free hand, which also opens out on 1-2-3.
function styled(B, t) {
  const d = B.d, sO = d.sO, style = clamp(P.style * d.style, 0, 2), p = rest(B, -sO);
  if (d.lead) return mix(p, B.Lw(B.nf + 1.5, B.ns - sO * 7.5, B.nz - 3), clamp(track(HIS_FLOURISH, t, 0.5, 0.1, inOut) * style, 0, 1));
  return mix(p, B.Lw(B.nf + 0.8, B.ns - sO * 6.2, B.head.z + 2), clamp(track(HER_FLOURISH, t, 0.55, 0.12, inOut) * style * 0.8, 0, 1));
}

// How far to turn the head (B.yaw) to see p, at most a little past the shoulder.
const toward = (B, p) => clamp(mod(Math.atan2(p.y - B.head.y, p.x - B.head.x) - B.h + Math.PI, TAU) - Math.PI, -1.5, 1.5);

// Before an enchufla the joined hands come up between them on 7-8 instead of
// swinging down and out for the 1.
function lifted(j, L, F, u) {
  if (u <= 0) return j;
  const m = mix(L.shO, F.shO, 0.5);
  return reachable(v3(lerp(j.x, m.x, u), lerp(j.y, m.y, u), j.z + 5 * u), L.shO, F.shO);
}

// The sombrero's hat: a hand behind the wearer's neck on the outside (his
// left, her right), the partner's arm lying over the wearer's head.
const hatOn = (B) => B.Lw(B.nf - 2.6, B.ns + B.d.sO * (B.d.shW - 1.5), B.nz + 5);
// The dile que no's hold: his right hand on her left shoulder blade, her left
// hand on his upper back by the spine.
const herBack = (F) => F.Lw(F.nf - 2.4, F.ns - F.d.sO * 1.5, F.pz + 4.5);
const hisBack = (L) => L.Lw(L.nf - 2.2, L.ns - L.d.sO * 1.2, L.nz - 1.5);
// Both hands crossed: the grips of the left hands (LL) and the right hands
// (RR), the top pair a little higher. They start low between them,
// go up over her head (up), then each over its wearer's head (apart: LL his,
// RR hers) and down behind the neck (on).
function crossed(L, F, top, up = 0, apart = 0, on = 0) {
  const c = mix(L.neck, F.neck, 0.5), h = v3(lerp(L.neck.x, F.head.x, 0.65), lerp(L.neck.y, F.head.y, 0.65), F.head.z + 4);
  const grip = (W, dz) => mix(mix(mix(v3(c.x, c.y, c.z - 6 + dz), v3(h.x, h.y, h.z + dz), up), v3(W.head.x, W.head.y, W.head.z + 5), apart), hatOn(W), on);
  return { LL: reachable(grip(L, top === 'L' ? 0.8 : -0.8), L.shO, F.shI), RR: reachable(grip(F, top === 'R' ? 0.8 : -0.8), L.shI, F.shO) };
}
// Both hands held straight (the setenta): his left in her right (O) and his
// right in her left (I), in front between them.
function straight(L, F) {
  const at = (a, c) => { const m = mix(a, c, 0.5); return reachable(v3(m.x, m.y, 13 - (L.dp + F.dp) / 2), a, c); };
  return { O: at(L.shO, F.shO), I: at(L.shI, F.shI) };
}
// A hand's way round her at the waist, from one spot to another, each
// [angle, distance, height]: the angle in degrees round her pelvis (0 = in
// front of her, + = to her left), the height up from the pelvis.
function roundHer(F, [a0, r0, z0], [a1, r1, z1], u) {
  const a = lerp(a0, a1, u) * DEG, r = lerp(r0, r1, u);
  return F.Lw(F.pf + r * Math.cos(a), F.ps + r * Math.sin(a), F.pz + lerp(z0, z1, u));
}
// The setenta's lock: her left hand from in front of her on her left (u = 0),
// by her left side, to behind her back (u = 1).
const lockPath = (F, u) => roundHer(F, [35, 7.32, 0.5], [180, 1.6, 3.5], u);
// El Uno's grips: her hand out at her side, held by his hand on that side, or
// behind her back, held there by his hand from the other side. Before it,
// her right hand starts in front of her (UNO_FRONT).
const UNO_SIDE = { R: [260, 6, 3.5], L: [100, 6, 3.5] }, UNO_BACK = { R: [160, 2.2, 3.5], L: [200, 2.2, 3.5] }, UNO_FRONT = [330, 7, 2];
// The coronación: each wears the other's arm as a hat, his right over her
// head (onR, the right hands' grip) and her left over his (onL), their own
// outside arms bent with the hand behind the neck. On 8 they let go (drop):
// the arms round each other slide down to the dile que no's hold, and the
// outside hands come down free.
function coronacion(L, F, onR, onL, drop) {
  if (onR <= 0 && onL <= 0) return;
  if (drop > 0) {
    L.aim = { O: mix(L.aim.O, rest(L, L.d.sO), drop), I: mix(L.aim.I, herBack(F), drop) };
    F.aim = { O: mix(F.aim.O, rest(F, F.d.sO), drop), I: mix(F.aim.I, hisBack(L), drop) };
  }
  const behind = (W) => v3(-W.f.x * 0.6, -W.f.y * 0.6, 1), bent = (B) => v3(B.l.x * B.d.sO * 0.7, B.l.y * B.d.sO * 0.7, 1);
  L.around = { I: { on: F, w: onR, side: mix(behind(F), v3(F.l.x, F.l.y, -0.3), drop) } };
  F.around = { I: { on: L, w: onL, side: mix(behind(L), v3(-L.l.x, -L.l.y, 0.2), drop) } };
  L.pole = { O: { w: onL * (1 - drop), side: bent(L) } };
  F.pole = { O: { w: onR * (1 - drop), side: bent(F) } };
}
// Each takes the crossed grips, and the top pair's forearms are drawn over
// both of them (render).
// w blends from their aims so far; top is false once nothing is on top.
function holdCrossed(L, F, g, top, w = 1) {
  const to = (a, p) => (w < 1 ? mix(a, p, w) : p);
  L.aim = { O: to(L.aim?.O, g.LL), I: to(L.aim?.I, g.RR) };
  F.aim = { O: to(F.aim?.O, g.RR), I: to(F.aim?.I, g.LL) };
  if (top && w > 0.5) { L.top = { n: top === 'R' ? 'I' : 'O', mate: F }; F.top = { n: top === 'R' ? 'O' : 'I', mate: L }; }
}

// Where every hand goes this frame: each kind of hold has its function,
// which the figure dancing now picks by what it says about the hands.
export function hands(b) {
  const n = P.couples, m = Math.floor(b / 8), t = b - m * 8, s = shiftBefore(m), fig = figureAt(m);
  const prep = figureAt(m + 1).lift ? ramp(t, 6, 7.5) : 0;
  palms = [];
  const win = (w) => (w ? ramp(t, w[0], w[1]) * (1 - ramp(t, w[2], w[3])) : 0);
  const at = { b, n, m, t, s, fig, prep, win };
  if (fig.cross) crossedHands(at);
  else if (fig.behind) unoHands(at);
  else if (fig.straight) setentaHands(at);
  else if (fig.pelota) pelotaHands(at);
  else if (fig.shine) freeHands(at);
  else if (fig.closed) (fig.exhibo ? exhiboHands : fig.tarrito ? tarritoHands : closedHands)(at);
  else if (fig.over) turnHands(at);
  else if (!fig.shift && !fig.dile) guapeaHands(at);
  else dameHands(at);
}

const aim = (B, O, I) => { B.aim = { O, I }; };

// The sombrero's crossed hands. In the coronación each wears the other's
// arm: his right around behind her neck, her left around behind his, and
// their own outside arms bent with the hand behind the neck.
function crossedHands({ n, t, s, fig, win }) {
  const top = [...fig.top].reverse().find(([k]) => t >= k)[1];
  const up = win(fig.up);
  const apart = fig.hats ? ramp(t, fig.hats[0], fig.hats[1]) : 0, on = fig.hats ? ramp(t, fig.hats[1], fig.hats[2]) : 0;
  const drop = fig.hats ? ramp(t, fig.hats[3], fig.hats[4]) : 0;
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    const lift = 2 * up * (1 - on); // her shoulders lift with the arms
    F.shO = add(F.shO, v3(0, 0, lift)); F.shI = add(F.shI, v3(0, 0, lift));
    holdCrossed(L, F, crossed(L, F, top, up, apart, on), on < 0.5 && top);
    coronacion(L, F, on, on, drop);
  }
}

// El Uno: both hands held like a handshake while he dances behind her.
// right is how far he is on her right: her arm on his side is wrapped
// behind her back and the other is out at her side, and they swap as
// he passes behind her. In the first bar his right takes her right from
// the guapea (take), she turns past him, her right arm wrapping behind
// her back, and his left takes her left. In the second, on 5 his right
// brings her right arm out by her side and up over her head (wrap: out,
// over her head by, on by), and her left goes up over his head (hats:
// over his head from, by, on by, let go from, by): the coronación.
function unoHands({ n, t, s, fig }) {
  const right = lerp(fig.right[0], fig.right[1], ramp(t, fig.right[2], fig.right[3]));
  const w = fig.wrap, out = w ? ramp(t, w[0], w[1]) : 0, over = w ? ramp(t, w[1] - 0.3, w[2]) : 0, onR = w ? ramp(t, w[2], w[3]) : 0;
  const h = fig.hats, raise = h ? ramp(t, h[0] - 0.5, h[0] + 0.3) : 0, apart = h ? ramp(t, h[0], h[1]) : 0, onL = h ? ramp(t, h[1], h[2]) : 0, drop = h ? ramp(t, h[3], h[4]) : 0;
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    F.shO = add(F.shO, v3(0, 0, 2 * over * (1 - onR))); // her shoulders lift with the arms
    F.shI = add(F.shI, v3(0, 0, 2 * raise * (1 - onL)));
    let RR = roundHer(F, UNO_BACK.R, UNO_SIDE.R, Math.max(right, out)), LL = roundHer(F, UNO_SIDE.L, UNO_BACK.L, right);
    if (fig.take && t < 4) RR = mix(guapeaGrip(L, F, t), roundHer(F, UNO_FRONT, UNO_BACK.R, ramp(t, 0.8, 2.8)), ramp(t, 0, 1));
    if (w) {
      // Up past her right shoulder in an arc, then down behind her neck.
      const beside = F.Lw(F.nf + 0.5, F.ns + F.d.sO * 8, F.head.z + 3), top = v3(F.head.x, F.head.y, F.head.z + 5);
      RR = mix(mix(mix(RR, beside, over), mix(beside, top, over), over), hatOn(F), onR);
    }
    if (h) LL = mix(mix(mix(LL, v3(LL.x, LL.y, L.head.z + 4), raise), v3(L.head.x, L.head.y, L.head.z + 5), apart), hatOn(L), onL);
    // While his right takes her right from his left, the grip stays within his left's reach.
    RR = reachable(RR, fig.take ? mix(L.shO, L.shI, ramp(t, 0, 0.45)) : L.shI, F.shO); LL = reachable(LL, L.shO, F.shI);
    let hisL = LL, hisR = RR, herL = LL;
    if (fig.take) {
      hisR = mix(styled(L, t), RR, ramp(t, 0, 0.45));
      hisL = mix(mix(guapeaGrip(L, F, t), rest(L, L.d.sO), ramp(t, 0.35, 1)), LL, ramp(t, 1.8, 2.8));
      herL = mix(styled(F, t), LL, ramp(t, 1.8, 2.8));
    }
    aim(L, hisL, hisR);
    aim(F, RR, herL);
    coronacion(L, F, onR, onL, drop);
  }
}

// The setenta's two hands. His left takes her right over her head
// (high) for her turns, and his right takes her left over his own head
// (mine) for his. Her left hand goes round her and behind her back as
// she turns in the first bar (lock), with his right arm round her right
// side holding it, and comes back round in front as she turns back in
// the second (unlock); in the setenta corrido's bar in between it stays
// there (wrapped). In the third he lets go with his left for his turn
// (offO) and with his right for hers (offI).
function setentaHands({ n, t, s, fig, win }) {
  const high = win(fig.high), mine = win(fig.mine), offO = win(fig.offO), offI = fig.offI ? ramp(t, ...fig.offI) : 0;
  const u = fig.lock ? 1 - (1 - ramp(t, ...fig.lock)) ** 2 : fig.unlock ? 1 - ramp(t, ...fig.unlock) : fig.wrapped ? 1 : 0;
  const locked = smooth(clamp((u - 0.3) / 0.45, 0, 1));
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    F.shO = add(F.shO, v3(0, 0, 2 * high)); // her shoulders lift with the arms
    F.shI = add(F.shI, v3(0, 0, 2 * mine));
    const g = straight(L, F), over = (a, W, z) => { const p = mix(a, W.head, 0.55); return v3(p.x, p.y, z); };
    const O = mix(g.O, reachable(over(L.shO, F, F.head.z + 3), L.shO, F.shO), high);
    let I = mix(g.I, reachable(over(F.shI, L, L.head.z + 6), L.shI, F.shI), mine);
    if (fig.lock) I = reachable(mix(mix(I, v3(I.x, I.y, I.z - 1.5), ramp(t, ...fig.low)), lockPath(F, u), ramp(t, 3.4, 4.4)), L.shI, F.shI);
    if (fig.unlock) I = reachable(mix(lockPath(F, u), I, ramp(t, 5.8, 6.8)), L.shI, F.shI);
    if (fig.wrapped) I = reachable(lockPath(F, 1), L.shI, F.shI);
    aim(L, mix(O, rest(L, L.d.sO), offO), mix(I, styled(L, t), offI));
    aim(F, mix(O, rest(F, F.d.sO), offO), mix(I, styled(F, t), offI));
    if (locked > 0) {
      L.around = { I: { on: F, w: locked, side: v3(-F.l.x, -F.l.y, -0.3) } }; // round her right side
      F.pole = { I: { w: locked, side: v3(F.l.x * 0.6 - F.f.x, F.l.y * 0.6 - F.f.y, -0.3) } }; // her elbow out back
    }
  }
}

// The pelota: his left (hand 'L') or right ('R') holds her right, low in
// front between them, and over swap his other hand takes it before the
// first lets go. over: up over her head (both: over both heads). golpe:
// the joined right arms stretched between them, the free arms stretched
// out, his to the center and hers away from it, the heads following.
function pelotaHands({ n, t, s, fig, win }) {
  const over = win(fig.over), golpe = win(fig.golpe), sw = fig.swap, r0 = fig.hand === 'R' ? 1 : 0;
  const mid = sw ? (sw[0] + sw[1]) / 2 : 0, r = sw ? lerp(r0, 1 - r0, ramp(t, sw[0], sw[1])) : r0;
  // How much each of his hands is on hers.
  const wR = sw ? (r0 ? 1 - ramp(t, mid, sw[1]) : ramp(t, sw[0], mid)) : r0, wL = sw ? (r0 ? ramp(t, sw[0], mid) : 1 - ramp(t, mid, sw[1])) : 1 - r0;
  const radial = (B, k) => { const p = norm(v3(B.pelvis.x, B.pelvis.y, 0)); return v3(p.x * k, p.y * k, 1.5); };
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    F.shO = add(F.shO, v3(0, 0, 2 * over)); // her shoulders lift with the arms
    if (fig.both) { L.shI = add(L.shI, v3(0, 0, 2 * over * wR)); L.shO = add(L.shO, v3(0, 0, 2 * over * wL)); }
    const hs = mix(L.shO, L.shI, r), m = mix(hs, F.shO, 0.5), g = mix(L.shI, F.shO, 0.5);
    let low = v3(m.x, m.y, 13 - (L.dp + F.dp) / 2);
    // Out of the guapea the hands start where its 7-8 lifted them.
    if (fig.fromGuapea) low = mix(lifted(guapeaGrip(L, F, t), L, F, 1 - ramp(t, 2, 3)), low, ramp(t, 2, 3.5));
    const heads = mix(L.head, F.head, 0.5), hers = mix(hs, F.head, 0.55);
    const top = fig.both ? v3(heads.x, heads.y, Math.max(L.head.z, F.head.z) + 2.5) : v3(hers.x, hers.y, F.head.z + 3);
    const grip = reachable(mix(mix(low, top, over), v3(g.x, g.y, (L.shI.z + F.shO.z) / 2 - 1), golpe), hs, F.shO);
    const his = add(L.shO, radial(L, -12.8)), her = add(F.shI, radial(F, 12.8));
    aim(L, mix(mix(rest(L, L.d.sO), his, golpe), grip, wL), mix(styled(L, t), grip, wR));
    aim(F, grip, mix(styled(F, t), her, golpe));
    if (golpe > 0) { L.yaw = toward(L, his) * golpe; F.yaw = toward(F, her) * golpe; }
  }
}

// A shine's hands are free (shineHands reaches them forward).
function freeHands() {
  for (const d of dancers()) aim(d.pose, rest(d.pose, d.sO), rest(d.pose, -d.sO));
}

// The closed hold's pump at beat b, from the figures' pump keys read across
// the bar lines, so the first pump starts on the 8 before: 1 up, 0 down.
function pumpAt(b, m) {
  const keys = [];
  for (let mm = m - 1; mm <= m + 1; mm++) for (const [c, v] of figureAt(mm).pump ?? [[0, 0]]) keys.push([mm * 8 + c, v]);
  const a = activeAbs(keys, b, 0.4, 0.2);
  return lerp(a.prev[1], a.k[1], inOut(a.u));
}

// Arriba. In the dile que si the joined hands go from the guapea's grip up
// to the closed hold's, his right hand to her back and her left up over
// his arm onto his shoulder (closed: the window [from, by] they do it
// in). Walking, they pump (pumpAt()), and each one's shoulder on that side
// goes up with them, the other a little down.
function closedHands({ b, n, m, t, s, fig }) {
  const hold = fig.closed === true ? 1 : ramp(t, ...fig.closed), pump = pumpAt(b, m);
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    for (const B of [L, F]) { B.shO = add(B.shO, v3(0, 0, 1.4 * pump)); B.shI = add(B.shI, v3(0, 0, -0.6 * pump)); }
    const j = mix(guapeaGrip(L, F, t), closedGrip(L, F, pump), hold);
    aim(L, j, mix(styled(L, t), herBack(F), hold));
    aim(F, j, add(mix(styled(F, t), hisBack(L), hold), v3(0, 0, 5 * Math.sin(Math.PI * hold))));
    L.around = { I: { on: F, w: hold, side: v3(F.l.x, F.l.y, -0.3) } }; // around her left side
    F.around = { I: { on: L, w: hold, side: v3(-L.l.x, -L.l.y, 0.2) } }; // over his right shoulder
  }
}

// La exhibo (see EXHIBO): the joined hands go up over her head for her
// turn, she reaches out to the center, and they let go of each other's
// backs for it.
function exhiboHands({ b, n, m, s, fig, win }) {
  const pump = pumpAt(b, m);
  const over = win(fig.exhibo), off = win(fig.backs), out = win(fig.reachOut);
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    for (const B of [L, F]) { B.shO = add(B.shO, v3(0, 0, 1.4 * pump)); B.shI = add(B.shI, v3(0, 0, -0.6 * pump)); }
    F.shO = add(F.shO, v3(0, 0, 2 * over)); // her shoulder goes up with the arm
    const top = mix(L.shO, F.head, 0.6), j = mix(closedGrip(L, F, pump), reachable(v3(top.x, top.y, F.head.z + 4), L.shO, F.shO), over);
    const c = norm(v3(-F.shI.x, -F.shI.y, 0)), point = add(F.shI, v3(c.x * REACH * 0.9, c.y * REACH * 0.9, 1.5));
    aim(L, j, mix(herBack(F), rest(L, -L.d.sO), off));
    aim(F, j, add(mix(hisBack(L), mix(rest(F, -F.d.sO), point, out), off), v3(0, 0, 5 * Math.sin(Math.PI * off))));
    L.around = { I: { on: F, w: 1 - off, side: v3(F.l.x, F.l.y, -0.3) } };
    F.around = { I: { on: L, w: 1 - off, side: v3(-L.l.x, -L.l.y, 0.2) } };
  }
}

// The tarrito: on 1 they let go of each other's backs (off) and the
// joined hands go on up into the arch he walks under. They let
// go of it on 4 (letGo) (arch: those windows). His left takes the right
// hand of the girl he comes up to (the bar's shift on) on 6 (take), and
// by the 8 they are in the closed hold (on) (take: those windows).
// Without them his hands are free and swing as he walks.
function tarritoHands({ b, n, m, t, s, fig }) {
  const pump = pumpAt(b, m);
  const off = fig.arch ? ramp(t, fig.arch[0], fig.arch[1]) : 1, letGo = fig.arch ? ramp(t, fig.arch[2], fig.arch[3]) : 1;
  const take = fig.take ? ramp(t, fig.take[0], fig.take[1]) : 0, on = fig.take ? ramp(t, fig.take[2], fig.take[3]) : 0;
  // In the arch they stretch up, the shoulder on that side going up too,
  // so the hands are as high above them as they reach, not hidden behind
  // his head as he goes under.
  const up = ramp(t, 0, 1.2) * (1 - letGo);
  for (const d of dancers()) { const B = d.pose; B.shO = add(B.shO, v3(0, 0, 1.4 * pump + 2.5 * up)); B.shI = add(B.shI, v3(0, 0, -0.6 * pump)); }
  const arch = [], neu = [];
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, Fo = follows[mod(i + s, n)].pose, Fn = follows[mod(i + s + fig.shift, n)].pose, mid = mix(L.shO, Fo.shO, 0.5);
    arch[i] = mix(closedGrip(L, Fo, pump), reachable(v3(mid.x, mid.y, mid.z + REACH), L.shO, Fo.shO), ramp(t, 0, 1.2));
    neu[i] = closedGrip(L, Fn, pump);
    aim(L, mix(mix(arch[i], swinging(L, L.d.sO), letGo), neu[i], take), mix(mix(herBack(Fo), swinging(L, -L.d.sO), off), herBack(Fn), on));
    L.around = { I: on > 0 ? { on: Fn, w: on, side: v3(Fn.l.x, Fn.l.y, -0.3) } : { on: Fo, w: 1 - off, side: v3(Fo.l.x, Fo.l.y, -0.3) } };
  }
  for (let j = 0; j < n; j++) {
    const F = follows[j].pose, Lo = leads[mod(j - s, n)].pose, Ln = leads[mod(j - s - fig.shift, n)].pose, over = 5 * Math.sin(Math.PI * (on > 0 ? on : off));
    aim(F, mix(mix(arch[mod(j - s, n)], rest(F, F.d.sO), letGo), neu[mod(j - s - fig.shift, n)], take), add(mix(mix(hisBack(Lo), rest(F, -F.d.sO), off), hisBack(Ln), on), v3(0, 0, over)));
    F.around = { I: on > 0 ? { on: Ln, w: on, side: v3(-Ln.l.x, -Ln.l.y, 0.2) } : { on: Lo, w: 1 - off, side: v3(-Lo.l.x, -Lo.l.y, 0.2) } };
  }
}

// Turns under the arm: for each turn his left hand takes her right over
// her head and brings it down after. In the doble his right hand stops
// her by her back (hug) and her free left arm goes straight up (flair).
function turnHands({ n, t, s, fig, prep, win }) {
  const over = Math.max(...fig.over.map(win)), hug = win(fig.hug), flair = win(fig.flair), look = win(fig.look);
  const letGo = fig.letGo ? ramp(t, ...fig.letGo) : 0, up = Math.max(1 - ramp(t, 2, 3), prep);
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    F.shO = add(F.shO, v3(0, 0, 2 * over)); // her shoulders lift with the arms
    F.shI = add(F.shI, v3(0, 0, 4 * flair)); // she stretches up into the flair
    const top = mix(L.shO, F.head, 0.55), high = reachable(v3(top.x, top.y, F.head.z + 3), L.shO, F.shO);
    const j = mix(lifted(guapeaGrip(L, F, t), L, F, up), high, over);
    const back = F.Lw(F.nf - 2.6, F.ns, F.pz + 4.5); // the middle of her back
    // Up and a little out in front of her, so it clears his head beside her.
    const sky = F.Lw(F.nf + 5, F.ns - F.d.sO * (F.d.shW + 3), F.head.z + 9);
    aim(L, mix(j, rest(L, L.d.sO), letGo), mix(styled(L, t), back, hug));
    aim(F, mix(j, rest(F, F.d.sO), letGo), mix(styled(F, t), sky, flair));
    if (hug > 0) L.around = { I: { on: F, w: hug, side: v3(-L.l.x, -L.l.y, -0.3) } }; // elbow out to his right
    if (look > 0) { L.yaw = toward(L, F.head) * look; F.yaw = toward(F, L.head) * look; }
  }
}

// Guapea: the free palms meet on 5.
function guapeaHands({ n, t, s, prep }) {
  const press = track(PRESS, t, 0.42, 0, inOut);
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose, j = lifted(guapeaGrip(L, F, t), L, F, prep);
    const pm = mix(L.shI, F.shI, 0.5), palm = v3(pm.x, pm.y, pm.z - 1.5);
    palms.push(palm);
    aim(L, j, mix(styled(L, t), palm, press));
    aim(F, j, mix(styled(F, t), palm, press));
  }
}

// Dame: on 1 everyone lets go and the girl on his right turns into his
// arms. His right hand goes to her back; her left arm goes straight up and
// comes down over his right arm onto his back by 3. On 5 they let go of
// each other's backs and his left hand takes her right as she crosses in
// front of him; the grip is back in the guapea by 7. After an enchufla
// (fig.free) they have already let go of their old partners. In the
// sombrero's dile que no (fig.dile) it is his own partner, and they are
// already in the hold from the coronación (fig.fromHats). With his own
// partner her arm doesn't go up and the free hands go straight to each
// other's backs, without the styling. After the setenta his left hand
// keeps hers throughout (fig.held), and out of arriba from the closed
// hold (fig.fromArriba).
function dameHands({ n, t, s, fig, prep }) {
  const hats = !!fig.fromHats, nn = fig.dile ? 0 : 1, own = (B) => (fig.dile ? rest(B, -B.d.sO) : styled(B, t));
  const wOld = fig.free ? 0 : fig.held ? 1 : 1 - ramp(t, 0, 0.35), release = ramp(t, 4.4, 5);
  const wBack = (hats ? 1 : fig.held ? ramp(t, 0.6, 1.5) : ramp(t, 0.3, 0.7)) * (1 - release), up = hats || fig.dile ? 0 : ramp(t, 0, 0.3), hold = hats ? 1 : ramp(t, 1, 2);
  const wNew = fig.held ? ramp(t, 0.3, 1.8) : ramp(t, 3.7, 4.1), toGuapea = ramp(t, 5.4, 6.4);
  const old = [], neu = [];
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, Fo = follows[mod(i + s, n)].pose, Fn = follows[mod(i + s + nn, n)].pose;
    old[i] = fig.fromArriba ? closedGrip(L, Fo, 0) : fig.held ? straight(L, Fo).O : guapeaGrip(L, Fo, t);
    neu[i] = lifted(mix(crossGrip(L, Fn, t), guapeaGrip(L, Fn, t), toGuapea), L, Fn, prep);
    aim(L, mix(mix(rest(L, L.d.sO), old[i], wOld), neu[i], wNew), mix(own(L), herBack(Fn), wBack));
    L.around = { I: { on: Fn, w: wBack, side: v3(Fn.l.x, Fn.l.y, -0.3) } }; // around her left side
  }
  for (let j = 0; j < n; j++) {
    const F = follows[j].pose, sO = F.d.sO, L = leads[mod(j - s - nn, n)].pose;
    // Her shoulder lifts with the arm so the hand clears her head.
    F.shI = add(F.shI, v3(0, 0, 2 * up * (1 - hold)));
    const high = F.Lw(F.nf + 0.5, F.ns - sO * (F.d.shW + 3), F.head.z + 9);
    const free = mix(mix(own(F), high, up), hisBack(L), hold);
    aim(F, mix(mix(rest(F, sO), old[mod(j - s, n)], wOld), neu[mod(j - s - nn, n)], wNew), mix(free, styled(F, t), release));
    F.around = { I: { on: L, w: hold * (1 - release), side: v3(-L.l.x, -L.l.y, 0.2) } }; // over his right shoulder
  }
}

// Before the sombrero, on 7-8 he takes both her hands, crossed, his right on
// top; before the setenta, straight.
export function crossPrep(b) {
  const n = P.couples, m = Math.floor(b / 8), t = b - m * 8, s = shiftBefore(m + 1), w = ramp(t, 6, 7.2), next = figureAt(m + 1), now = figureAt(m);
  if (w <= 0 || (next.cross ? now.cross : !next.straight || now.straight)) return;
  for (let i = 0; i < n; i++) {
    const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
    if (next.cross) { holdCrossed(L, F, crossed(L, F, 'R'), 'R', w); continue; }
    const g = straight(L, F);
    for (const B of [L, F]) B.aim = { O: mix(B.aim.O, g.O, w), I: mix(B.aim.I, g.I, w) };
  }
}

// The mambo (fig.shine): with each tap the hand on the other side reaches a
// little forward, the right with the left foot on 1 and 5 and the left with
// the right on 3 and 7, and comes back with the foot. It reads the next
// measure too, so the hand is on its way out on the 8 before.
export function shineHands(b) {
  const m = Math.floor(b / 8);
  for (let mm = m; mm <= m + 1; mm++) for (const c of figureAt(mm).shine ?? []) {
    const at = mm * 8 + c, w = bump(b, at - 0.45, at, at + 1), side = c % 4 ? 1 : -1;
    if (w > 0) for (const d of dancers()) {
      const B = d.pose, n = side === d.sO ? 'O' : 'I';
      B.aim[n] = mix(B.aim[n], B.Lw(B.nf + 7.5, B.ns + side * (d.shW - 0.8), B.nz - 3), w);
    }
  }
}

// Claps (fig.claps): everyone's hands come up in front of the chin a little
// apart before the first clap, meet on each clapped count, open again, and
// after the last go back to what they were doing. It reads the figures on
// both sides of the bar line, so the pelota tres's last clap can land on the
// dame's 1. Each clap leaves a spark between the hands (sparks: [spot, age]).
export let sparks = [];
export function clapHands(b) {
  const m = Math.floor(b / 8), at = [];
  sparks = [];
  for (let mm = m - 1; mm <= m + 1; mm++) for (const c of figureAt(mm).claps ?? []) at.push(mm * 8 + c);
  if (!at.length) return;
  // Claps up to two beats apart are one run; the hands stay up through a run.
  at.sort((x, y) => x - y);
  let ready = 0;
  for (let i = 0, j = 0; i < at.length; i = j) {
    while (j + 1 < at.length && at[j + 1] - at[j] <= 2) j++;
    ready = Math.max(ready, ramp(b, at[i] - 0.8, at[i] - 0.35) * (1 - ramp(b, at[j] + 0.2, at[j] + 0.65)));
    j++;
  }
  if (ready <= 0) return;
  // The hands speed up into each other over the 0.3 beats before a clap, so
  // they meet right on the count, and spring apart straight after it.
  const shut = Math.max(...at.map((c) => (b <= c ? clamp((b - c + 0.3) / 0.3, 0, 1) ** 3 : (1 - clamp((b - c) / 0.3, 0, 1)) ** 2)));
  const age = Math.min(...at.map((c) => (b >= c ? b - c : Infinity)));
  for (const d of dancers()) {
    const B = d.pose, sO = d.sO, gap = 0.6 + 4 * (1 - shut);
    const hand = (side) => B.Lw(B.nf + 4, B.ns + side * gap, B.nz + 1);
    B.aim = { O: mix(B.aim.O, hand(sO), ready), I: mix(B.aim.I, hand(-sO), ready) };
    for (const a of [B.around, B.pole]) for (const n in a ?? {}) a[n].w *= 1 - ready; // elbows down at the sides
    if (age < 0.22) sparks.push([hand(0), age]);
  }
}

// An arm around a partner (B.around) bends its elbow out past the partner's
// side, so it reaches round them instead of through them. B.pole points an
// elbow some other way, such as out and up for a hand behind the neck.
export function reach(B) {
  const sO = B.d.sO, pole = (n, side) => {
    let p = v3(B.l.x * side * 0.7 - B.f.x * 0.35, B.l.y * side * 0.7 - B.f.y * 0.35, -1);
    for (const a of [B.around?.[n], B.pole?.[n]]) if (a) p = mix(p, a.side, a.w);
    return p;
  };
  const O = ik(B.shO, B.aim.O, ARM[0], ARM[1], pole('O', sO)), I = ik(B.shI, B.aim.I, ARM[0], ARM[1], pole('I', -sO));
  B.arms = { O: { sh: B.shO, el: O.mid, hand: O.end }, I: { sh: B.shI, el: I.mid, hand: I.end } };
}
