// The figures with both hands held: the sombrero (crossed), the setenta and
// the setenta corrido (straight) and the uno (like a handshake), and the dile
// que no they end in.

import { DEG } from '../math.js';
import { DAME, DIST, ENCHUFLA_O, ENCHUFLA_STEPS, PLACE } from './guapea.js';

// The sombrero's first two bars hold both hands, crossed: his right holds her
// right and his left her left (cross: see hands()), the pair named in top on
// top from a beat on. It is called on 5 like the others; on the 7-8 before
// it he takes both her hands, his right on top.
//
// First bar, an exhíbela: on 1 they open out a little, and on 2-3 they come
// back in lifting both hands up over her head (up: the window the hands are
// up), ready for 5-6-7, when she turns once round to her right under them.
// That crosses them the other way, his left on top.
export const EXHIBELA = {
  shift: 0, whoosh: [5], cross: true, top: [[0, 'R'], [5, 'L']], up: [1, 2.8, 6, 6.8],
  lead: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [-1, -0.02, 0, 0], [0, -0.02, 0, 0], [1, 0.04, 0, 0], [2, -0.01, 0, 0], [3, -0.07, 0, 0], [4, -0.08, 0, 0], [6.5, -0.08, 0, 0], [8, 0, 0, 0]] },
  follow: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [-1, 0.02, 0, 0], [0, 0.02, 0, 0], [1, -0.04, 0, 0], [2, 0.01, 0, 0], [3, 0.06, 0, 0], [4, 0.07, 0, 0], [5, 0.08, 0, -100], [6, 0.08, 0, -280], [7, 0.05, 0, -360], [8, 0, 0, -360]] },
};
// Second bar, an enchufla without letting go: on 1 both hands go up over her
// head; on 2-3 they pass right shoulder to right shoulder, she on the inside
// turning to her left under the hands and he turning to his right. They
// finish it on 4-5 a step apart, swapped, her on his right, turned toward
// each other halfway between facing the center and facing each other, the
// hands down low between them. On 5-6 they step back in lifting the hands
// over their heads, and on 7, the coronación (hats: [apart, over the heads,
// on, let go, let go by]): his left hand takes her left over his head and his
// right takes her right over hers, so each wears the other's arm as a hat. On
// 8 they let go of both hands: his right arm round her and her left round him
// slide down onto each other's backs, the dile que no's hold, and the
// outside hands come down free.
export const SOMBRERO = {
  shift: 0, whoosh: [1], cross: true, top: [[0, 'L']], up: [0, 0.6, 2.6, 3.6], hats: [4.5, 5.5, 6.3, 7, 7.8],
  lead: { ...ENCHUFLA_STEPS, root: [[0, 0, 0, 0], [1, -0.1, 3.5, -30], [2, -0.25, 4.5, -75], [3, -0.36, 3, -115], [4, -0.405, 1.6, -136], [5, -0.395, 0.6, -137], [6, -0.335, -0.5, -134], [8, -0.32, -0.8, -133]] },
  follow: { ...ENCHUFLA_STEPS, sway: [[0, 1], [3, 1], [4, -1]], root: [[0, 0, 0, 0], [1, 0.12, -4, 35], [2, 0.3, -5, 85], [3, 0.43, -4.2, 124], [4, 0.475, -3.7, 139], [5, 0.465, -3.4, 140], [6, 0.395, -3, 137], [8, 0.38, -3, 136]] },
};
// Third bar, a dile que no with the same girl (dile), already in its hold
// from the coronación (fromHats), so nobody's arm goes up on 1 as she turns
// to face him. On 5-6-7 she crosses in front of him and
// turns to face him, both home by 7, his left hand holding her right, so the
// next guy can take her in the dame.
export const DILE_QUE_NO = {
  shift: 0, whoosh: [5], dile: true, free: true, fromHats: true,
  lead: { ...DAME.lead, pelvis: [[0, 0.3], [1, 0.4], [2, 0], [4, -0.4], [5, -0.1], [6, 0]], root: [[0, -0.32, -0.8, -133], [1, -0.29, -2.4, -122], [2, -0.27, -2.6, -117], [3, -0.25, -2.5, -111], [4, -0.23, -0.8, -100], [4.5, -0.2, 0.6, -78], [5, -0.12, 0.8, -50], [6, -0.02, 0.2, -5], [7, 0, 0, 0], [8, 0, 0, 0]] },
  follow: { ...DAME.follow, pelvis: [[0, 0.4], [1, 0.1], [2, 0.2], [4, 0.6], [5, 0.4], [6, 0]], sway: [[0, -1], [0.7, 1]], root: [[0, 0.38, -3, 136], [1, 0.41, -5.5, 186], [2, 0.395, -5.6, 188], [3, 0.39, -6, 190], [4, 0.375, -7.2, 192], [4.5, 0.24, -10, 182], [5, 0.1, -6.5, 195], [5.7, 0.01, -0.5, 352], [6, 0, 0, 360], [8, 0, 0, 360]] },
};

// The setenta's first three bars hold both hands straight (straight: his left
// holds her right and his right her left); on the 7-8 before it he takes her
// left hand too. From the second bar on it is three swaps of places in a
// row, one per half bar, so the couple goes round each other like gears.
//
// First bar, an exhíbela that locks her arm: on 1-2-3 his left hand takes her
// right up over her head (high) while his right keeps hers low at the waist
// (low), and on 5-6-7 she turns once round to her right under the high hands.
// The low hands go round her by her left side as she turns (lock), so her left
// arm ends wrapped behind her back, his right hand holding it there round her
// right side. They finish close, face to face, home.
export const SETENTA_LOCK = {
  shift: 0, whoosh: [5], straight: true, high: [1, 2.8, 6, 6.8], low: [0.3, 2.5], lock: [4.3, 6.9],
  lead: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [-1, -0.02, 0, 0], [0, -0.02, 0, 0], [1, 0.04, 0, 0], [2, -0.01, 0, 0], [3, -0.06, 0, 0], [4, -0.08, 0, 0], [5, -0.11, 0.8, 0], [6, -0.135, 2, 0], [8, -0.14, 2.5, 0]] },
  follow: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [-1, 0.02, 0, 0], [0, 0.02, 0, 0], [1, -0.04, 0, 0], [2, 0.01, 0, 0], [3, 0.06, 0, 0], [4, 0.07, 0, 0], [5, 0.11, -0.3, -100], [6, 0.135, -0.8, -280], [7, 0.14, -1, -360], [8, 0.14, -1, -360]] },
};
// Second bar, an enchufla without letting go: on 1-2-3 they ease a little
// apart, and on 5-6-7 his left hand takes her right over her head and they
// swap places, she on the inside turning half round to her left, he on the
// outside turning half round to his right. Her turn unwinds her arm (unlock),
// so by 8 both hands are in front again, and they go straight on into the
// next swap.
export const SETENTA_ENCHUFLA = {
  shift: 0, whoosh: [5], straight: true, high: [3.4, 4.2, 6.4, 7.2], unlock: [4.2, 6.4],
  lead: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[0, -0.14, 2.5, 0], [1, -0.13, 2.6, 4], [2, -0.125, 2.6, 8], [3, -0.12, 2.6, 10], [4, -0.12, 3, -5], [5, -0.24, 5.5, -85], [6, -0.36, 2.5, -160], [7, -0.4, -1, -182], [8, -0.36, -3.8, -170]] },
  follow: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[0, 0.14, -1, -360], [1, 0.13, -1.1, -364], [2, 0.125, -1.1, -368], [3, 0.12, -1.2, -370], [4, 0.12, -2, -352], [5, 0.25, -5.5, -275], [6, 0.37, -2, -192], [7, 0.4, 1, -176], [8, 0.36, 3.8, -190]] },
};
// Third bar, the other two swaps. On 1-2-3 it is his enchufla: he lets go
// with his left (offO), takes her left hand up over his own head with his
// right (mine) and turns half round to his left under it on the inside,
// while she walks round him on the outside; on 4 his left takes her right
// again. On 5-6-7 she does the last enchufla: he lets go with his right
// (offI), takes her right over her head with his left and she turns half
// round to her left under it, so they finish swapped, still holding that
// hand, and walk straight on into the dile que no.
export const SETENTA_TURNS = {
  shift: 0, whoosh: [1, 5], straight: true, flow: true, high: [3.8, 4.5, 6.4, 7.2], mine: [0.1, 0.7, 2.4, 3.2], offO: [0, 0.5, 2.8, 3.6], offI: [3.8, 4.3],
  lead: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[0, -0.36, -3.8, -170], [1, -0.2, -5.5, -95], [2, -0.04, -2, -15], [3, -0.03, 0.6, 6], [4, -0.06, 1.8, -5], [5, -0.22, 5.5, -85], [6, -0.36, 2.5, -160], [7, -0.4, -1, -180], [8, -0.4, -1.6, -165]] },
  follow: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[0, 0.36, 3.8, -190], [1, 0.2, 5.5, -265], [2, 0.04, 2, -345], [3, 0.03, -0.6, -366], [4, 0.07, -1.8, -352], [5, 0.25, -5.5, -275], [6, 0.37, -2, -192], [7, 0.42, 1, -178], [8, 0.44, -1.8, -180]] },
};
// Fourth bar, the dile que no from there: his left hand keeps hers (held) as
// she comes in on his right, her free arm going straight onto his shoulder.
export const SETENTA_DILE = {
  ...DILE_QUE_NO, free: false, fromHats: false, held: true, flow: true,
  lead: { ...DILE_QUE_NO.lead, root: [[0, -0.4, -1.6, -165], [1, -0.32, -2.4, -125], ...DILE_QUE_NO.lead.root.filter(([b]) => b >= 2)] },
  follow: { ...DILE_QUE_NO.follow, sway: [[0, 1]], root: [[0, 0.44, -1.8, -180], ...DILE_QUE_NO.follow.root.filter(([b]) => b >= 1).map(([b, a, o, r]) => [b, a, o, r - 360])] },
};

// The setenta corrido's extra bar, after the setenta's lock. Her left arm stays wrapped behind her back (wrapped) and
// the other hands low in front, as at the end of the lock, and the couple
// walks once round the middle between them, clockwise (to their right):
// easing in on 1, at an even pace through the 4, easing out by the 8, a
// step on every count. It flows on from her turn (flow), and both keep
// facing each other all the way round (aim undoes the turn that going round
// the circle would add), so the hold stays the same.
const CORRIDO_V = 360 / 7; // degrees a beat
const corridoAt = (b) => (b < 1 ? (CORRIDO_V * b * b) / 2 : b > 7 ? 360 - (CORRIDO_V * (8 - b) ** 2) / 2 : CORRIDO_V * (b - 0.5));
// Each one's spot as [px counterclockwise, px out] from the couple's place.
const corridoSpot = (lead) => { const [, al, out] = SETENTA_LOCK[lead ? 'lead' : 'follow'].root.at(-1); return [((lead ? 1 : -1) * DIST) / 2 + al * PLACE, out]; };
function corrido(lead) {
  const me = corridoSpot(lead), her = corridoSpot(!lead), c = [(me[0] + her[0]) / 2, (me[1] + her[1]) / 2], dt = me[0] - c[0], dn = me[1] - c[1];
  const [, al0, , turn0] = SETENTA_LOCK[lead ? 'lead' : 'follow'].root.at(-1);
  return Array.from({ length: 17 }, (_, i) => {
    const b = i / 2, a = corridoAt(b) * DEG, t = c[0] - dn * Math.sin(a) + dt * Math.cos(a);
    const along = (t - ((lead ? 1 : -1) * DIST) / 2) / PLACE;
    return [b, along, c[1] + dn * Math.cos(a) + dt * Math.sin(a), turn0 - corridoAt(b), al0 - along];
  });
}
const CORRIDO_STEPS = { pelvis: [[0, 0]], angle: [[0, 0]], O: [[0, 0, 0, 2.2], [2, 0, 0, 2.2], [5, 0, 0, 2.2], [7, 0, 0, 1.6]], I: [[1, 0, 0, 2.2], [3, 0, 0, 1.6], [4, 0, 0, 2.2], [6, 0, 0, 2.2]] };
export const SETENTA_CORRIDO = {
  shift: 0, straight: true, wrapped: true, flow: true,
  lead: { ...CORRIDO_STEPS, root: corrido(true) },
  follow: { ...CORRIDO_STEPS, root: corrido(false) },
};

// El Uno: both hands held like a handshake (his right in her right, his left
// in her left) and he dances behind her, both facing the center, the two of
// them swapping sides like a windshield wiper (behind; right: how far he is
// on her right, [from, to, from beat, by beat]). On his side her arm is
// wrapped behind her back.
//
// First bar: on 1 his right hand takes her right (take) and she walks past
// him on the inside, right shoulder to right shoulder; on 2-3 she turns a
// quarter to her left to face the center and he steps in behind her on her
// left, turning a quarter to his right, her right arm wrapping behind her
// back, and his left takes her left. On 5-6-7 they swap: she slides to her
// left in front and he to his right behind her, so her right arm comes out
// and her left wraps behind her back.
export const UNO = {
  shift: 0, whoosh: [1], behind: true, take: true, right: [0, 1, 4.5, 7],
  lead: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [0, 0, 0, 0], [1, -0.07, 1.8, -15], [2, -0.19, 3.4, -50], [3, -0.27, 3, -82], [4, -0.298, 3, -90], [5, -0.27, 3.3, -95], [6, -0.21, 4.4, -98], [7, -0.155, 3.3, -93], [8, -0.138, 3, -90]] },
  follow: { ...ENCHUFLA_STEPS, sway: [[0, 1], [1.6, 1], [2.6, -1]], root: [[-2, 0, 0, 0], [0, 0, 0, 0], [1, 0.08, -2.1, 15], [2, 0.2, -3.5, 55], [3, 0.27, -3, 85], [4, 0.298, -3, 90], [5, 0.27, -3.3, 95], [6, 0.21, -4.2, 98], [7, 0.155, -3.3, 93], [8, 0.138, -3, 90]] },
};
// Second bar: on 1-2-3 they swap back, her right arm wrapping behind her back
// again. On 5 his right hand brings it out by her right side and up over her
// head (wrap), and on 5-6-7 he steps up beside her on her left, both turning
// toward each other, while her left hand goes up over his head (hats): the
// coronación on 7, as in the sombrero, which they let go of on 8 into the
// dile que no's hold.
export const UNO_CORONACION = {
  shift: 0, whoosh: [4], behind: true, right: [1, 0, 0.3, 2.8], wrap: [3.8, 4.6, 5.5, 6.3], hats: [5.3, 6.1, 6.9, 7, 7.8],
  lead: { ...ENCHUFLA_STEPS, root: [[0, -0.138, 3, -90], [1, -0.17, 3.9, -85], [2, -0.235, 4.2, -82], [3, -0.285, 3, -87], [4, -0.298, 3, -90], [5, -0.305, 2.2, -100], [6, -0.315, 0.6, -120], [7, -0.32, -0.6, -131], [8, -0.32, -0.8, -133]] },
  follow: { ...ENCHUFLA_STEPS, sway: [[0, -1]], root: [[0, 0.138, -3, 90], [1, 0.17, -3.8, 85], [2, 0.235, -4.1, 82], [3, 0.285, -3, 87], [4, 0.298, -3, 90], [5, 0.32, -3, 100], [6, 0.355, -3, 120], [7, 0.375, -3, 133], [8, 0.38, -3, 136]] },
};
