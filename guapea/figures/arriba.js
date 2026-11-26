// Arriba and what is called from it: the dile que si into the closed hold,
// the walk, its dile que no, the tarritos, adentro y afuera and la exhibo.

import { DEG, clamp, smooth } from '../math.js';
import { DIST, PLACE } from './guapea.js';
import { SETENTA_DILE } from './two-hands.js';

// Arriba: a dile que si into the closed hold, then the couples walk round the
// circle in it, bar after bar (loop), until the dile que no. The rueda
// closes up for it (see ringAt()), so these figures' keys say where each one
// is from the middle of the couple in px (gap, see root()): the couple's
// place, -OPEN from his own (in places, half the distance between partners
// in the guapea) and OPEN from hers, and the gap from there. CLOSED is half
// the distance between them in the closed hold (px). Off their own places
// they face each other by aiming (root) back to the middle between them. In
// the hold she is a little to his right (SIDE px, outside the circle).

const OPEN = DIST / 2 / PLACE, CLOSED = 5, SIDE = 1.2;
// A key from a dancer's own place ([beat, along, out, turn, aim]) as one
// from the middle of the couple, the same at full size.
const gapped = (lead, [b, al, out, turn, aim = 0]) => { const h = lead ? OPEN : -OPEN; return [b, -h, out, turn, aim + al + h, (h + al) * PLACE]; };
// Steps on 1-2-3 and 5-6-7, his left foot first and her right. The body
// doesn't stop on the 4 and the 8, so each step lands a little ahead of it
// (behind her), [a, b, c] steps for the steps on 1, 2, 3 and on 5, 6, 7, the
// one before the pause furthest, so the planted foot isn't dragged along
// before it lifts.
const walkSteps = (dir, [a, b, c]) => ({ O: [[0, dir * a, 0, 2.6], [2, dir * c, 0, 2.6], [5, dir * b, 0, 2.6]], I: [[1, dir * b, 0, 2.6], [4, dir * a, 0, 2.6], [6, dir * c, 0, 2.6]] });
// The dile que si's half turn: the couple pivots round the middle between
// them, to his right, [beat, degrees turned, half the distance between them],
// so he goes round the outside of the circle and she round the inside, and
// they end swapped, in line, him facing South. From 5 on the couple also
// sets off along the circle (GO places by the 8), so on the 1 they are
// already walking at the walk's pace.
const PIVOT = [[2, 0, OPEN - 0.01], [3, 8, OPEN - 0.04], [4, 40, 0.165], [5, 105, 0.135], [6, 160, CLOSED / PLACE + 0.005], [7, 176, CLOSED / PLACE], [8, 180, CLOSED / PLACE]];
const GO = 0.1875, go = (b) => (b < 5 ? 0 : (GO * (b - 5) ** 2) / 9);
const pivot = (lead) => PIVOT.map(([b, a, r]) => {
  const h = lead ? OPEN : -OPEN, side = SIDE * smooth(clamp((a - 90) / 90, 0, 1)) * (lead ? -1 : 1);
  return [b, go(b) - h, (lead ? 1 : -1) * r * PLACE * Math.sin(a * DEG) + side, -a, h, (lead ? 1 : -1) * r * PLACE * Math.cos(a * DEG)];
});
// On 1-2-3 a short extension: they lean away from each other on 1, the
// joined hands down and out, and come back on 2-3. On 5-6-7 they turn half
// round together into the closed hold (closed: the window it comes on in):
// his right hand on her back, her left on his shoulder, the joined hands at
// head height.
// The steps on 6 and 7 land a little on in the way they set off (dir: ahead
// of him, behind her).
const dileQueSiSteps = (dir) => ({ pelvis: [[0, -1], [1, -0.35], [2, 0], [4, 0.2], [6, 0]], angle: [[0, 0]], O: [[0, -1, 0, 2.6], [2, 0, 0, 2.2], [5, 0.3 * dir, 0, 2.6]], I: [[1, 0, 0, 1.6], [4, 0, 0, 2.6], [6, 0.6 * dir, 0, 2.4]] });
export const DILE_QUE_SI = {
  shift: 0, whoosh: [4], closed: [3.4, 6.4],
  lead: { ...dileQueSiSteps(1), root: [gapped(true, [0, 0, 0, 0]), gapped(true, [0.7, 0.03, 0, 0]), ...pivot(true)] },
  follow: { ...dileQueSiSteps(-1), root: [gapped(false, [0, 0, 0, 0]), gapped(false, [0.7, -0.03, 0, 0]), ...pivot(false)] },
};
// Walking arriba: he walks forward and she backward, one place round the
// circle a bar (travel), everyone at once. The joined hands pump (pump: up on
// 1, down on 2, up on 3, down on 5, up on 6, down on 7), each one's shoulder
// on that side going with them. The body travels at an even pace, through
// the 4 and the 8 too.
const WALK = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => [b, b * 0.75]);
const walk = (lead) => WALK.map(([b, x]) => [b, (lead ? -OPEN : OPEN) + GO + x / 6, lead ? -SIDE : SIDE, -180, lead ? OPEN : -OPEN, lead ? -CLOSED : CLOSED]);
export const ARRIBA = {
  shift: 0, travel: 1, flow: true, closed: true, pump: [[0, 1], [1, 0], [2, 1], [4, 0], [5, 1], [6, 0]],
  lead: { root: walk(true), pelvis: [[0, 0]], angle: [[0, 0]], ...walkSteps(1, [0.5, 0.6, 0.7]) },
  follow: { root: walk(false), pelvis: [[0, 0]], angle: [[0, 0]], ...walkSteps(-1, [0.5, 0.6, 0.7]) },
};
// The dile que no out of arriba: the setenta's, from the closed hold
// (fromArriba). On 1-2-3 he rocks back, turning a little to his left, and on
// 5-6-7 she crosses in front of him while he turns half round to his left,
// back in the guapea with the same partner, where they walked to. The rueda
// opens up as they do it, so from 5 on it is the guapea's dile que no, in
// places like the guapea after it.
export const ARRIBA_DILE = {
  ...SETENTA_DILE, fromHats: true, fromArriba: true,
  lead: { ...SETENTA_DILE.lead, O: [[0, -0.5, 0, 2.6], ...SETENTA_DILE.lead.O.slice(1)], root: [walk(true)[0], ...[[1, -0.32, -1.6, -158], [2, -0.29, -2.3, -136], [3, -0.26, -2.5, -116]].map((k) => gapped(true, k)), ...SETENTA_DILE.lead.root.filter(([b]) => b >= 4)] },
  follow: { ...SETENTA_DILE.follow, O: [[0, 0.4, 0, 2.6], ...SETENTA_DILE.follow.O.slice(1)], root: [walk(false)[0], ...[[1, 0.37, -2.6, -186], ...SETENTA_DILE.follow.root.filter(([b]) => b >= 2 && b < 4)].map((k) => gapped(false, k)), ...SETENTA_DILE.follow.root.filter(([b]) => b >= 4)] },
};
// The tarrito, out of arriba: on 1 they let go of each other's backs and the
// joined hands go up into an arch (arch and take: the hands' windows, see
// hands()).
// He hurries on under it, past her on the inside of the circle, right
// shoulder by right shoulder (TARRITO_OUT: px out from the center, added to
// the hold's), while she walks on backward. They let go on 4 and he walks on
// to the girl ahead, whose partner has gone on under her arm too, and by the
// 8 they are in the closed hold, walking on arriba. So he covers two places
// in the bar (TARRITO_ALONG, in places at each count) while the girls walk
// one and move on one (shift). To cover the ground he takes long strides.
const TARRITO_ALONG = [0, 0.2, 0.5, 0.78, 1.06, 1.36, 1.64, 1.86, 2];
const TARRITO_OUT = [0, -2.6, -7.4, -8.3, -6, -3.4, -1.6, -0.4, 0];
const TARRITO_SWAY = [[0, 1], [1.2, 0.3], [3.6, 0.3], [4.6, 1]]; // the hips quieter as they pass
// His steps while he hurries, still on 1-2-3 and 5-6-7: each foot stays down
// only until the other one lands ([5]), so the foot behind takes a long
// stride through the 4 and the 8 while the body keeps going. f: how far
// ahead each one lands, O on 1, 3, 6 and I on 2, 5, 7.
const hurry = (f) => ({
  O: [[0, f[0], 0, 2.4, 0, 1.1], [2, f[1], 0, 2.6, 0, 2.1], [5, f[2], 0, 2.6, 0, 1.1]],
  I: [[1, f[3], 0, 2.6, 0, 1.1], [4, f[4], 0, 2.4, 0, 1.1], [6, f[5], 0, 2.6, 0, 2.1]],
});
const tarritoRoot = (along, out) => walk(true).map(([b, a, o, ...r]) => [b, a - b / 8 + along[b], o + out[b], ...r]);
export const TARRITO = {
  ...ARRIBA, shift: 1, travel: 2, whoosh: [1], tarrito: true, arch: [0, 0.8, 3, 3.9], take: [5, 6.2, 6, 7.2], pump: [[0, 1], [3.6, 0.4], [5, 1], [6, 0]],
  lead: {
    ...ARRIBA.lead, root: tarritoRoot(TARRITO_ALONG, TARRITO_OUT), sway: TARRITO_SWAY,
    ...hurry([0.2, 0.6, 0.1, -0.4, -0.2, 0.2]),
  },
  // She leans a little out of his way as he passes.
  follow: { ...ARRIBA.follow, sway: TARRITO_SWAY, root: walk(false).map(([b, along, out, ...r]) => [b, along, out + [0, 0.4, 1, 1.2, 0.6, 0, 0, 0, 0][b], ...r]) },
};
// The tarrito hasta la tuya: the tarrito's arch, but he walks on round the
// inside of the circle (INSIDE px) past every girl, at the tarrito's pace (a
// bar for every 1.6 couples or so), until he comes out to his own girl in the
// last bar and takes her as in the tarrito; then they walk on arriba.
// tuyaBars(n): those bars, the first with the arch, the last with the new
// hold, and his hands free in between. Past the girls he goes at an even
// pace (rel: how many places he has gained on them, A beats to get going and
// C to come up to her), and each bar's shift is the girls he has passed by
// its end, rounded.
const INSIDE = -12;
export function tuyaBars(n) {
  const B = Math.ceil(n * 0.6), T = 8 * B, A = 2.5, C = 4, w = n / (T - (A + C) / 2);
  const I = (x) => x ** 3 - x ** 4 / 2; // smooth's integral
  const rel = (u) => w * (u < A ? A * I(u / A) : u > T - C ? T - (A + C) / 2 - C * I((T - u) / C) : u - A / 2);
  const counts = [0, 1, 2, 3, 4, 5, 6, 7, 8], passed = (j) => Math.round(rel(8 * j));
  return Array.from({ length: B }, (_, j) => {
    const first = j === 0, last = j === B - 1, shift = passed(j + 1) - passed(j);
    const along = counts.map((b) => b / 8 + rel(8 * j + b) - passed(j));
    const out = counts.map((b) => (first && b < 4 ? [0, -2.6, -7.4, -10.5][b] : last && b > 2 ? [-11, -8.5, -5, -2, -0.5, 0][b - 3] : INSIDE));
    return {
      ...TARRITO, shift, travel: shift + 1, whoosh: first ? [1] : [], arch: first ? TARRITO.arch : null, take: last ? TARRITO.take : null,
      pump: [...(first ? [[0, 1], [3.6, 0]] : [[0, 0]]), ...(last ? [[5, 1], [6, 0]] : [])],
      lead: { ...TARRITO.lead, root: tarritoRoot(along, out), ...hurry([0.2, first ? 0.5 : 0.6, 0.1, -0.4, -0.2, last ? 0.2 : 0.5]) },
      // Only her own partner passes her at the tarrito's beats.
      follow: first ? TARRITO.follow : { ...TARRITO.follow, root: walk(false) },
    };
  });
}
// Adentro y afuera, out of arriba: on the 1 the couples stop walking and,
// still in the closed hold, open and close like a V, bar after bar (loop)
// until the next call. On 1 he side-steps in, his left foot toward the
// center, turning a little toward her (AD_HIM degrees), while she turns a
// quarter to her right to face the center and steps back out with her
// right; they rock on 2 and meet in the middle on 3. On 5 the same the other
// way: he side-steps out with his right and she turns to face out and steps
// back in with her left; they meet again on 7. It flows on through the 4 and
// the 8. Keys are [beat, u]: u is how far in he is (1 in, -1 out, 0 in the
// middle, where they walk). The bars' keys end on 7, so from there they head
// for wherever the next 1 has them (rootKeys()): in again, or the middle for
// the next move, which is why a call from here must come by the 5 (call()).
// He goes in or out AD_IN px and she AD_OUT px. In the hold she is a little
// outside him, so while he is in they are further apart across the circle,
// and they come up to AD_GAP px closer along it. The joined hands (pump) are
// at about shoulder height while he is in and head height while he is out.
const AD_IN = 3, AD_OUT = 4.5, AD_GAP = 2.5, AD_HIM = 20;
const adentroKey = (lead) => ([b, u]) => {
  const k = walk(lead)[0];
  return [b, k[1], k[2] + (lead ? -AD_IN : AD_OUT) * u, -180 - (lead ? AD_HIM : 90) * u, k[4], k[5] + (lead ? 1 : -1) * AD_GAP * Math.max(0, u)];
};
const AD_PUMP = [[0, -0.3], [1, -0.3], [2, 0], [3, 0.3], [4, 0.45], [5, 0.45], [6, 0.1], [7, -0.15]];
const adentro = (u) => ({
  shift: 0, travel: 0, flow: true, closed: true, pump: AD_PUMP,
  lead: { root: u.map(adentroKey(true)), pelvis: [[0, 0]], angle: [[0, 0]], O: [[0, 0, -1, 2.4], [2, 0, 0, 2], [5, 0, 0, 1.2]], I: [[1, 0, 0, 1.2], [4, 0, 1, 2.4], [6, 0, 0, 2]] },
  follow: { root: u.map(adentroKey(false)), pelvis: [[0, 0]], angle: [[0, 0]], O: [[0, -0.3, 0, 2.4], [2, 0, 0, 2], [5, 0, 0, 1.2]], I: [[1, 0, 0, 1.2], [4, -0.3, 0, 2.4], [6, 0, 0, 2]] },
});
const AD_U = [[0, 1], [1, 0.8], [2, 0], [4, -1], [5, -0.8], [6, 0]], AD_U_IN = [[0, 0], [1, 0.9], ...AD_U.slice(2)];
export const ADENTRO = adentro(AD_U);
export const ADENTRO_IN = adentro(AD_U_IN); // from the middle, where they stopped walking
// The tarrito out of adentro y afuera: the tarrito's arch, and he walks under
// it past her to the next girl and takes her, but the girls stay where they
// are, stepping in place, so he walks one place (travel) instead of two.
// Then they go on in and out.
export const TARRITO_AD = {
  ...TARRITO, travel: 1,
  lead: { ...ARRIBA.lead, sway: TARRITO_SWAY, root: tarritoRoot(TARRITO_ALONG.map((a, b) => a - b / 8), TARRITO_OUT) },
  follow: { ...TARRITO.follow, ...walkSteps(-1, [0, 0, 0]), root: TARRITO.follow.root.map(([b, along, ...r]) => [b, along - b / 8, ...r]) },
};
// La exhibo, out of adentro y afuera (EXHIBO) or out of arriba (EXHIBO_IN,
// where they stop walking for it): on 1-2-3 the in and out of adentro y
// afuera, but she stays facing the center (her keys' third value is her
// turn) and on 4 walks on forward into it. On 5, as he steps out, he lifts
// the joined hands (his left, the inside one) over her head (exhibo: [up
// from, up by, down from, down by]), she reaches out to the center with her
// free left arm (reachOut, the same), and on 5-6-7 she turns once round to
// her right under them. She ends a whole turn round (-360 degrees), facing
// the center for the next 1 (see rootKeys()). For the turn they let go of
// each other's backs (backs, the same). Then they go on in and out.
const exhiboKey = ([b, u, turn]) => { const k = adentroKey(false)([b, u]); if (turn !== undefined) k[3] = turn; return k; };
const EXHIBO_TURN = [[2, 0, -270], [3, -0.55, -272], [4, -1, -295], [5, -0.85, -450], [6, 0, -610]];
const exhibo = (u, her) => ({
  ...adentro(u), whoosh: [4], exhibo: [3.8, 4.4, 6, 6.8], backs: [3.2, 3.8, 6.2, 7.2], reachOut: [3.3, 4, 4.5, 5.2],
  follow: { ...adentro(u).follow, root: [...her, ...EXHIBO_TURN].map(exhiboKey), O: [[0, -0.3, 0, 2.4], [2, 0.2, 0, 2], [5, 0, 0, 1.6]], I: [[1, 0, 0, 1.2], [4, 0.3, 0, 2.4], [6, 0, 0, 2]] },
});
export const EXHIBO = exhibo(AD_U, [[0, 1], [1, 0.8, -270]]);
export const EXHIBO_IN = exhibo(AD_U_IN, [[0, 0], [1, 0.9]]);
