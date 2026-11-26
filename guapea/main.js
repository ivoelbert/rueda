// RUEDA · Guapea. An isometric pixel rueda dancing the guapea in unison.
//
// Tuned for feel rather than accuracy: feet land on the beat, the weight and
// hips settle just after, knees dip on every step and lift on 4 and 8, skirts
// and hats lag behind, the joined hands swing out on 1, and the whole circle
// presses palms on 5. You are one dancer. Pick a move in the moves library and
// press Space: the whole rueda dances it from the next 1, then goes back to
// the guapea.
import { ChipMusic } from '../shared/chip.js';
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
  bpm: [200, 120, 220, 1, 'Tempo (BPM)'],
  bounce: [1, 0, 2.5, 0.05, 'Knee bounce'],
  stand: [1.5, 0, 2, 0.05, 'Straight legs'],
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
const DIST = 19; // partners' pelvises apart in the open position
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
//   root    [beat, along, out, turn, aim]: where the body travels. along
//           counts places around the circle (+ = counterclockwise), out is
//           px away from the center, turn is degrees (+ = left). A heading
//           turns with the place the body is on; aim, if given, turns it
//           further by that many places' worth, whatever the number of
//           couples, so partners off their own places can face each other.
//           Keys run 0 to 8;
//           a move can start at -2 to prepare on the 7 and 8 before it
//           (the call comes on 5).
//   pelvis, angle, hips: as in the guapea.
//   sway    optional, [beat, factor]: the hip sway assumes partners face
//           each other; -1 swings her hips with his when they stand side by
//           side facing the same way.
//   O, I    footsteps [beat, forward in steps, inward px, lift px, heel px],
//           placed relative to the body where the foot lands; heel, if
//           given, keeps the heel up off the floor there, for a toe tap.
// shift is how many places clockwise the girls move on by the end, so each
// lead has a new partner (a dame is 1). whoosh lists the counts (0-7) of
// the figure's big turns.
const STILL = [[0, 0, 0, 0], [8, 0, 0, 0]];
const GUAPEA = {
  name: 'GUAPEA', shift: 0,
  lead: { root: STILL, pelvis: PELVIS, angle: ANGLE, O: FOOT_O, I: FOOT_I },
  follow: { root: STILL, pelvis: PELVIS, angle: [[0, 0]], O: FOOT_O, I: FOOT_I_F },
};

const DAME = {
  shift: 1, whoosh: [5],
  // On the 7 and 8 before it he turns about a quarter round to his right,
  // toward the girl on his right, and drifts away from his partner, still
  // holding her hand. On 1 he lets go, turns right to face the center and
  // steps in toward the girl on his right, taking her into a closed hold.
  // 2-3 he settles back; on 5-6-7 he turns back to his left while she
  // crosses in front of him, and he is home by 7.
  lead: {
    root: [[-2, 0, 0, 0], [-1, 0.025, -0.1, -50], [0, 0.05, -0.3, -80], [0.5, 0.07, -1.8, -90], [1, 0.1, -3, -110], [2, 0.09, -2.6, -108], [3, 0.08, -2, -106], [4, 0.07, -1.6, -104], [5, 0.03, -0.6, -50], [6, 0, 0, 0], [8, 0, 0, 0]],
    pelvis: [[0, -0.6], [1, 0.3], [2, 0], [4, -0.4], [5, -0.1], [6, 0]],
    angle: [[0, 0]],
    O: [[0, 0.5, 0, 2.8], [2, 0, 0, 2.2], [5, 0, 0, 2], [7, 0, 0, 1.3]],
    I: [[1, 0, 0, 1.6], [3, 0, 0, 1.2], [4, -0.4, 0, 2.4], [6, 0, 0, 2.2]],
  },
  // On the 7 and 8 she turns about a quarter round to her left, toward
  // him, and drifts away from her partner, still holding his hand. On 1
  // she lets go and turns half round to her left, into his arms, face to
  // face and a little to his right, her left arm going up and over onto
  // his back. On 5 she walks across in front of him, on 6 she turns half
  // round to her left, and on 7 she is home, facing him.
  follow: {
    root: [[-2, 0, 0, 0], [-1, -0.025, -0.15, 55], [0, -0.05, -0.4, 100], [0.5, -0.13, -3, 150], [1, -0.252, -6.1, 186], [2, -0.266, -6.1, 188], [3, -0.281, -5.8, 190], [4, -0.295, -5.7, 192], [4.5, -0.493, -9.6, 182], [5, -0.731, -5.4, 195], [5.7, -0.98, -0.3, 352], [6, -1, 0, 360], [8, -1, 0, 360]],
    pelvis: [[0, -1], [1, -0.3], [2, 0.2], [4, 0.6], [5, 0.4], [6, 0]],
    angle: [[0, 0]],
    O: [[0, -0.5, 0, 2.6], [2, 0.2, 2.5, 2.6], [5, 0, 0, 2.2], [7, 0, 0, 1.3]],
    I: [[1, 0, 0, 2.2], [3, 0.15, 0, 1.5], [4, 0.4, 0, 2.6], [6, 0, 0, 2.4]],
  },
};

// The enchufla's first bar; the second is a dame. Called on 5 like the dame:
// on the 7 and 8 the joined hands come up and they open a little away from
// each other.
const ENCHUFLA_STEPS = { pelvis: [[0, -0.5], [1, 0.3], [2, 0], [4, 0.3], [6, 0]], angle: [[0, 0]], O: [[0, -0.6, 0, 2.6], [2, 0, 0, 2.6], [5, 0, 0, 2.6], [7, 0, 0, 1.3]], I: [[1, 0, 0, 2.6], [3, 0, 0, 1.2], [4, 0, 0, 2.6], [6, 0, 0, 2.4]] };
// They are already heading back on 4, so the foot that lands on 3 goes on
// ahead instead of being dragged.
const ENCHUFLA_O = [[0, -0.6, 0, 2.6], [2, 0.8, 0, 2.6], [5, 0, 0, 2.6], [7, 0, 0, 1.3]];
// lift: the joined hands come up on the 7-8 before it. The hand windows are
// [on from, on by, off from, off by]: over, his left hand takes her right
// over her head for a turn; hug, his right hand on her back; flair, her free
// left arm straight up; look, they turn their heads to each other. letGo:
// when they let go of each other.
const ENCHUFLA = {
  shift: 0, whoosh: [1], lift: true, over: [[0, 0.6, 2, 3]], letGo: [3.7, 4.2],
  // On 1 he breaks back and lifts her right hand over her head. On 2-3 he
  // passes behind her, turning half round to his right, so by 4 he is in her
  // place facing her, already starting back. On 5 he lets go and walks back
  // past in front of her to the girl on his right, facing her as she comes
  // to him, and on 8 starts turning into the dame.
  lead: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[-2, 0, 0, 0], [-1, -0.015, 0, 6], [0, 0, 0.5, 15], [1, -0.2, 5.5, -80], [2, -0.42, 2, -165], [3, -0.45, -0.8, -185], [4, -0.32, -4, -182], [5, -0.15, -5, -168], [6, -0.02, -3.8, -168], [7, 0.04, -1.5, -166], [8, 0.05, -0.3, -153]] },
  // On 1 she breaks back. On 2-3 she walks across in front of him, turning
  // half round to her left under his arm, so by 4 she is in his place
  // facing him. On 5 they let go and she walks back past him and on to her
  // new partner, the lead on her left, facing him as she comes.
  follow: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[-2, 0, 0, 0], [-1, 0.015, 0, -6], [0, 0, 0.5, -15], [1, 0.22, -5.5, 85], [2, 0.43, -1.5, 170], [3, 0.46, 0.8, 186], [4, 0.33, 3.8, 178], [5, 0.15, 5, 152], [6, 0.03, 3.6, 141], [7, -0.035, 1.7, 146], [8, -0.09, -0.7, 154]] },
};

// The enchufla doble's first bar; then comes a whole enchufla. It starts
// like the enchufla: they pass right shoulder to right shoulder. On 5, when
// they are past each other, his right hand on her back stops her in the
// middle of her turn, she throws her left arm up, and they turn
// their heads to look at each other. On 5-6-7 he sends her back under his
// arm. They keep moving through 4 and 8, and are home on the next 1 for the
// enchufla.
const DOBLE = {
  shift: 0, whoosh: [1, 4], lift: true, over: [[0, 0.7, 5.6, 6.6]], hug: [3.3, 3.9, 4.6, 5.2], flair: [3.8, 4.1, 5.5, 6.4], look: [3.4, 3.9, 4.6, 5.2],
  // On 1 he breaks back and lifts her right hand; on 2-3-4 he walks past
  // her on the outside, turning right, so on 5 he is beyond her at her left
  // side with his right hand on her back. On 5-6-7 he walks back past her
  // and home, opening a little to his left for the enchufla.
  lead: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [-1, -0.015, 0, 6], [0, 0, 0.5, 15], [1, -0.08, 2.8, -5], [2, -0.18, 3.6, -30], [3, -0.26, 2.6, -52], [3.75, -0.295, 1.3, -62], [4, -0.3, 1, -65], [4.5, -0.28, 1.6, -58], [5, -0.22, 2.4, -40], [6, -0.12, 2, -10], [7, -0.04, 1, 12], [8, 0, 0.5, 25]] },
  // On 2-3-4 she walks past him on the inside and turns to her left under
  // his arm. On 5 he stops her two thirds of the way round, with him at her
  // left side, and her left arm goes up; on 5-6-7 she spins back to her
  // right under his arm, a little past facing him, and walks home for the
  // enchufla.
  follow: { ...ENCHUFLA_STEPS, sway: [[0, 1], [2.2, 1], [3, -1], [4.8, -1], [5.6, 1]], root: [[-2, 0, 0, 0], [-1, 0.015, 0, -6], [0, 0, 0.5, -15], [1, 0.09, -2, 20], [2, 0.2, -4, 65], [3, 0.255, -4.6, 100], [3.75, 0.272, -4.6, 117], [4, 0.275, -4.5, 120], [4.5, 0.25, -4.6, 105], [5, 0.19, -3.9, 75], [6, 0.1, -1.8, 25], [7, 0.03, -0.4, -15], [8, 0, 0.5, -35]] },
};

// The sombrero's first two bars hold both hands, crossed: his right holds her
// right and his left her left (cross: see hands()), the pair named in top on
// top from a beat on. It is called on 5 like the others; on the 7-8 before
// it he takes both her hands, his right on top.
//
// First bar, an exhíbela: on 1 they open out a little, and on 2-3 they come
// back in lifting both hands up over her head (up: the window the hands are
// up), ready for 5-6-7, when she turns once round to her right under them.
// That crosses them the other way, his left on top.
const EXHIBELA = {
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
const SOMBRERO = {
  shift: 0, whoosh: [1], cross: true, top: [[0, 'L']], up: [0, 0.6, 2.6, 3.6], hats: [4.5, 5.5, 6.3, 7, 7.8],
  lead: { ...ENCHUFLA_STEPS, root: [[0, 0, 0, 0], [1, -0.1, 3.5, -30], [2, -0.25, 4.5, -75], [3, -0.36, 3, -115], [4, -0.405, 1.6, -136], [5, -0.395, 0.6, -137], [6, -0.335, -0.5, -134], [8, -0.32, -0.8, -133]] },
  follow: { ...ENCHUFLA_STEPS, sway: [[0, 1], [3, 1], [4, -1]], root: [[0, 0, 0, 0], [1, 0.12, -4, 35], [2, 0.3, -5, 85], [3, 0.43, -4.2, 124], [4, 0.475, -3.7, 139], [5, 0.465, -3.4, 140], [6, 0.395, -3, 137], [8, 0.38, -3, 136]] },
};
// Third bar, a dile que no with the same girl (dile), already in its hold
// from the coronación (fromHats), so nobody's arm goes up on 1 as she turns
// to face him. On 5-6-7 she crosses in front of him and
// turns to face him, both home by 7, his left hand holding her right, so the
// next guy can take her in the dame.
const DILE_QUE_NO = {
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
const SETENTA_LOCK = {
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
const SETENTA_ENCHUFLA = {
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
const SETENTA_TURNS = {
  shift: 0, whoosh: [1, 5], straight: true, flow: true, high: [3.8, 4.5, 6.4, 7.2], mine: [0.1, 0.7, 2.4, 3.2], offO: [0, 0.5, 2.8, 3.6], offI: [3.8, 4.3],
  lead: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[0, -0.36, -3.8, -170], [1, -0.2, -5.5, -95], [2, -0.04, -2, -15], [3, -0.03, 0.6, 6], [4, -0.06, 1.8, -5], [5, -0.22, 5.5, -85], [6, -0.36, 2.5, -160], [7, -0.4, -1, -180], [8, -0.4, -1.6, -165]] },
  follow: { ...ENCHUFLA_STEPS, O: ENCHUFLA_O, root: [[0, 0.36, 3.8, -190], [1, 0.2, 5.5, -265], [2, 0.04, 2, -345], [3, 0.03, -0.6, -366], [4, 0.07, -1.8, -352], [5, 0.25, -5.5, -275], [6, 0.37, -2, -192], [7, 0.42, 1, -178], [8, 0.44, -1.8, -180]] },
};
// Fourth bar, the dile que no from there: his left hand keeps hers (held) as
// she comes in on his right, her free arm going straight onto his shoulder.
const SETENTA_DILE = {
  ...DILE_QUE_NO, free: false, fromHats: false, held: true, flow: true,
  lead: { ...DILE_QUE_NO.lead, root: [[0, -0.4, -1.6, -165], [1, -0.32, -2.4, -125], ...DILE_QUE_NO.lead.root.filter(([b]) => b >= 2)] },
  follow: { ...DILE_QUE_NO.follow, sway: [[0, 1]], root: [[0, 0.44, -1.8, -180], ...DILE_QUE_NO.follow.root.filter(([b]) => b >= 1).map(([b, a, o, r]) => [b, a, o, r - 360])] },
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
const UNO = {
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
const UNO_CORONACION = {
  shift: 0, whoosh: [4], behind: true, right: [1, 0, 0.3, 2.8], wrap: [3.8, 4.6, 5.5, 6.3], hats: [5.3, 6.1, 6.9, 7, 7.8],
  lead: { ...ENCHUFLA_STEPS, root: [[0, -0.138, 3, -90], [1, -0.17, 3.9, -85], [2, -0.235, 4.2, -82], [3, -0.285, 3, -87], [4, -0.298, 3, -90], [5, -0.305, 2.2, -100], [6, -0.315, 0.6, -120], [7, -0.32, -0.6, -131], [8, -0.32, -0.8, -133]] },
  follow: { ...ENCHUFLA_STEPS, sway: [[0, -1]], root: [[0, 0.138, -3, 90], [1, 0.17, -3.8, 85], [2, 0.235, -4.1, 82], [3, 0.285, -3, 87], [4, 0.298, -3, 90], [5, 0.32, -3, 100], [6, 0.355, -3, 120], [7, 0.375, -3, 133], [8, 0.38, -3, 136]] },
};

// The moves library. Each move starts on a 1 from the guapea, dances its
// bars (one figure per 8 counts) and ends in the guapea; the hands are
// scripted in hands().
const fromOne = (tracks) => ({ ...tracks, root: tracks.root.filter(([b]) => b >= 0) });
// After an enchufla they are already facing each other with their hands
// free, so its dame starts from its 1, from where the enchufla left them on
// 8. flow: they walk straight on into it, without coming to rest on the bar
// line, and keep turning toward each other into the hold.
const DAME_AFTER_ENCHUFLA = {
  ...DAME, free: true, flow: true,
  lead: { ...DAME.lead, root: [[0, 0.05, -0.3, -153], [0.5, 0.07, -1.8, -134], ...DAME.lead.root.filter(([b]) => b >= 1)] },
  follow: { ...DAME.follow, root: [[0, -0.09, -0.7, 154], [0.5, -0.16, -3.2, 171], ...DAME.follow.root.filter(([b]) => b >= 1)] },
};
// After the doble's first bar they walk straight into the enchufla's 1,
// still wound a little past facing each other from being sent back.
const wound = (tracks, turn) => ({ ...tracks, root: [[0, 0, 0.5, turn], ...fromOne(tracks).root.slice(1)] });
const ENCHUFLA_AFTER_DOBLE = { ...ENCHUFLA, lead: wound(ENCHUFLA.lead, 25), follow: wound(ENCHUFLA.follow, -35) };
// The pelotas: an enchufla where everyone claps (claps: the counts, 0-7) on
// the way to the new partner, on 7, on 7 and 8, or on 7, 8 and the dame's 1.
const PELOTA_1 = { ...ENCHUFLA, claps: [6] };
const PELOTA_2 = { ...ENCHUFLA, claps: [6, 7] };
const DAME_CLAP = { ...DAME_AFTER_ENCHUFLA, claps: [0] };
// The pelota: her right hand is held throughout (pelota), by his left (hand:
// 'L') or his right ('R'), passed from one of his hands to the other over
// swap. The couple keeps going round each other clockwise: each enchufla
// swaps their places and carries on a quarter further, and nothing stops on
// the 4 or the 8.
//
// First bar: an enchufla without letting go, and on 5-6-7 they carry on round
// so he ends a step inside the circle facing out and she a step outside
// facing in. On 6-7 his right takes her right from his left.
const PELOTA_IN = {
  shift: 0, whoosh: [1], lift: true, pelota: true, fromGuapea: true, hand: 'L', swap: [5.4, 6.6], over: [0, 0.6, 2, 3], golpe: [6.6, 8, 9, 10.6],
  lead: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [-1, -0.015, 0, 6], [0, 0, 0.5, 15], [1, -0.2, 5.5, -80], [2, -0.42, 2, -165], [3, -0.45, -0.8, -185], [4, -0.421, -4, -205], [5, -0.368, -7.5, -230], [6, -0.286, -9.2, -253], [7, -0.221, -9.5, -268], [8, -0.221, -13, -155]] },
  follow: { ...ENCHUFLA_STEPS, root: [[-2, 0, 0, 0], [-1, 0.015, 0, -6], [0, 0, 0.5, -15], [1, 0.22, -5.5, 85], [2, 0.43, -1.5, 170], [3, 0.46, 0.8, 186], [4, 0.433, 4.2, 165], [5, 0.368, 7.5, 140], [6, 0.286, 9.2, 115], [7, 0.221, 9.5, 92], [8, 0.221, 13, 205]] },
};
// Second bar. On 8-1 the golpe (golpe: the window, running on from the bar
// before): both turn to their left, past side by side, stepping a little
// apart, so they look opposite ways with the joined right arms stretched
// between them; his free arm stretches out to the center and hers away from
// it, and their heads follow their hands. On 2-3 they come back to face each
// other and a little closer, and on 5-6-7 she turns once to her right under
// the hands while he turns once to his left (both: the hands over both
// heads). Back to back, his left takes her right from his right.
const PELOTA_GOLPE = {
  shift: 0, whoosh: [0, 4], flow: true, pelota: true, hand: 'R', swap: [4.6, 5.6], both: true, over: [2.2, 3.2, 6.2, 7.2], golpe: [-1.4, 0, 1, 2.6],
  lead: { ...ENCHUFLA_STEPS, root: [[0, -0.221, -13, -155], [1, -0.221, -12, -205], [2, -0.221, -9, -250], [3, -0.221, -7, -272], [4, -0.221, -6.5, -195], [5, -0.221, -6.5, -100], [6, -0.221, -7, -10], [7, -0.221, -8.5, 70], [8, -0.221, -9.5, 100]] },
  follow: { ...ENCHUFLA_STEPS, root: [[0, 0.221, 13, 205], [1, 0.221, 12, 160], [2, 0.221, 9, 115], [3, 0.221, 7, 70], [4, 0.221, 6.5, -10], [5, 0.221, 6.5, -100], [6, 0.221, 7, -190], [7, 0.221, 8.5, -260], [8, 0.221, 9.5, -280]] },
};
// Third bar: the enchufla back, his left holding her right, and on 5-6-7 a
// quarter further round, so they are back in line with the circle, swapped,
// as at the end of the setenta, and walk straight on into its dile que no.
const PELOTA_OUT = {
  shift: 0, whoosh: [1], flow: true, pelota: true, hand: 'L', over: [0, 0.6, 2, 3],
  lead: { ...ENCHUFLA_STEPS, root: [[0, -0.221, -9.5, 100], [1, -0.093, -0.9, 10], [2, -0.174, 8.6, -75], [3, -0.24, 9.8, -95], [4, -0.331, 8.2, -120], [5, -0.402, 5.4, -145], [6, -0.426, 0.8, -160], [7, -0.407, -1.2, -165], [8, -0.4, -1.6, -165]] },
  follow: { ...ENCHUFLA_STEPS, root: [[0, 0.221, 9.5, -280], [1, 0.093, 0, -185], [2, 0.186, -9, -100], [3, 0.24, -10.3, -84], [4, 0.331, -8.2, -110], [5, 0.402, -5.4, -140], [6, 0.437, -2.2, -165], [7, 0.44, -1.9, -178], [8, 0.44, -1.8, -180]] },
};
// Doble play con mambo: the enchufla's first bar comes to rest on 8 facing the
// next girl, where its dame would take her, and they shine there, everyone
// the same way. On 1 everyone taps the left foot forward on the toes (heel:
// the heel stays up), on 2 brings it back, taps the right on 3 and brings it
// back on 4, the hips going over the standing foot, and the hand on the
// other side reaches forward with each tap. On 5-6-7-8 the feet go on and
// everyone claps on 5 and 7. Then the dame takes her from there. shine: the
// hands are free, and on these counts the hand on the other side reaches
// forward with the tap (shineHands).
const MAMBO_TAPS = (first, second) => ({
  [first]: [[0, 0.7, 0, 1.4, 1.5], [1, 0, 0, 1.2], [4, 0.7, 0, 1.4, 1.5], [5, 0, 0, 1.2]],
  [second]: [[2, 0.7, 0, 1.4, 1.5], [3, 0, 0, 1.2], [6, 0.7, 0, 1.4, 1.5], [7, 0, 0, 1.2]],
});
const MAMBO_HIPS = [[0, -1.4], [1, 0.8], [2, 1.4], [3, -0.8], [4, -1.4], [5, 0.8], [6, 1.4], [7, -0.8]]; // his; O is his left foot
const stay = (k) => [[0, ...k], [7, ...k], [8, ...k]];
const MAMBO_ALL = {
  shift: 0, shine: [0, 2, 4, 6],
  lead: { root: stay(ENCHUFLA.lead.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: MAMBO_HIPS, ...MAMBO_TAPS('O', 'I') },
  follow: { root: stay(ENCHUFLA.follow.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: MAMBO_HIPS.map(([b, v]) => [b, -v]), ...MAMBO_TAPS('I', 'O') },
};
const MAMBO = { ...MAMBO_ALL, shine: [0, 2], claps: [4, 6] };
// Pelota de 4: the enchufla, a whole bar of mambo, then everyone turns once
// round to the left in place, a quarter turn landing with a clap on each of
// 1, 3, 5 and 7: the left foot steps round with the turn and the right
// closes after it. On 7 they face each other again, and the dame takes her
// from there.
// Each quarter turn snaps round over the half beat before its count and
// holds still until the next one.
function quarters([along, out, turn]) {
  const k = [];
  for (const c of [0, 2, 4, 6]) {
    const from = turn - 360 + 45 * c;
    k.push([c - 0.55, along, out, from], [c - 0.45, along, out, from], [c, along, out, from + 90], [c + 0.3, along, out, from + 90]);
  }
  return [...k, [7, along, out, turn], [8, along, out, turn]];
}
const TURN_STEPS = (left, right) => ({ [left]: [0, 2, 4, 6].map((c) => [c, 0, 0, 2.2]), [right]: [0, 2, 4, 6].map((c) => [c + 0.5, 0, 0, 1.2]) });
const TURN_HIPS = [0, 2, 4, 6].flatMap((c) => [[c, 1], [c + 1, 0]]); // his, over the left foot as it lands
const PELOTA4_TURN = {
  shift: 0, shine: [], claps: [0, 2, 4, 6],
  lead: { root: quarters(ENCHUFLA.lead.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: TURN_HIPS, ...TURN_STEPS('O', 'I') },
  follow: { root: quarters(ENCHUFLA.follow.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: TURN_HIPS.map(([b, v]) => [b, -v]), ...TURN_STEPS('I', 'O') },
};
// Arriba: a dile que si into the closed hold, then the couples walk round the
// circle in it, bar after bar (loop), until the dile que no. The rueda
// closes up for it (see ringAt()), so these figures' keys say where each one
// is from the middle of the couple in px (gap, see root()): the couple's
// place, -OPEN from his own (in places, half the distance between partners
// in the guapea) and OPEN from hers, and the gap from there. CLOSED is half
// the distance between them in the closed hold (px). Off their own places
// they face each other by aiming (root) back to the middle between them. In
// the hold she is a little to his right (SIDE px, outside the circle).
const PLACE = DIST + 24; // px from couple to couple round the circle, at full size
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
const DILE_QUE_SI = {
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
const ARRIBA = {
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
const ARRIBA_DILE = {
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
const TARRITO = {
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
function tuyaBars(n) {
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
const ADENTRO = adentro(AD_U);
const ADENTRO_IN = adentro(AD_U_IN); // from the middle, where they stopped walking
// The tarrito out of adentro y afuera: the tarrito's arch, and he walks under
// it past her to the next girl and takes her, but the girls stay where they
// are, stepping in place, so he walks one place (travel) instead of two.
// Then they go on in and out.
const TARRITO_AD = {
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
const EXHIBO = exhibo(AD_U, [[0, 1], [1, 0.8, -270]]);
const EXHIBO_IN = exhibo(AD_U_IN, [[0, 0], [1, 0.9]]);
const MOVES = {
  dame: {
    id: 'dame', name: 'DAME', say: '¡Dame!', bars: [DAME],
    blurb: 'Dile que no with the girl on your right. The girls move on one place, so everyone has a new partner.',
  },
  enchufla: {
    id: 'enchufla', name: 'ENCHUFLA', say: '¡Enchufla!', bars: [ENCHUFLA, DAME_AFTER_ENCHUFLA],
    blurb: 'She turns under his arm and they swap places, then he walks on to the girl on his right for a dame. Everyone has a new partner.',
  },
  doble: {
    id: 'doble', name: 'ENCHUFLA DOBLE', say: '¡Enchufla doble!', bars: [DOBLE, ENCHUFLA_AFTER_DOBLE, DAME_AFTER_ENCHUFLA],
    blurb: 'She starts the enchufla; on 5 his hand on her back stops her, her free arm goes up, and he sends her back. Then a whole enchufla. Everyone has a new partner.',
  },
  sombrero: {
    id: 'sombrero', name: 'SOMBRERO', say: '¡Sombrero!', bars: [EXHIBELA, SOMBRERO, DILE_QUE_NO, DAME],
    blurb: 'Both hands crossed: an exhíbela, then an enchufla without letting go, and on 7 the coronación, each wearing the other\'s arm as a hat. A dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  setenta: {
    id: 'setenta', name: 'SETENTA', say: '¡Setenta!', bars: [SETENTA_LOCK, SETENTA_ENCHUFLA, SETENTA_TURNS, SETENTA_DILE, DAME],
    blurb: 'Both hands: an exhíbela that wraps her left arm behind her back, an enchufla without letting go that unwinds it, then his enchufla and hers, round like gears. A dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  uno: {
    id: 'uno', name: 'UNO', say: '¡Uno!', bars: [UNO, UNO_CORONACION, DILE_QUE_NO, DAME],
    blurb: 'Hands like a handshake, he steps in behind her and they swap sides behind each other; on 5 her arm goes over her head into the coronación. A dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  pelota1: {
    id: 'pelota1', name: 'PELOTA UNO', say: '¡Pelota uno!', bars: [PELOTA_1, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla, and everyone claps on 7 on the way to the new partner. Then the dame. Everyone has a new partner.',
  },
  pelota2: {
    id: 'pelota2', name: 'PELOTA DOS', say: '¡Pelota dos!', bars: [PELOTA_2, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla with two claps, on 7 and 8, then the dame. Everyone has a new partner.',
  },
  pelota3: {
    id: 'pelota3', name: 'PELOTA TRES', say: '¡Pelota tres!', bars: [PELOTA_2, DAME_CLAP],
    blurb: 'An enchufla with three claps, on 7, 8 and the dame\'s 1, then the rest of the dame. Everyone has a new partner.',
  },
  festival: {
    id: 'festival', name: 'FESTIVAL PELOTA', say: '¡Festival pelota!', bars: [PELOTA_1, DAME_AFTER_ENCHUFLA, PELOTA_2, DAME_AFTER_ENCHUFLA, PELOTA_2, DAME_CLAP],
    blurb: 'Pelota uno, dos and tres back to back: one clap, then two, then three, with a new partner each time.',
  },
  pelota: {
    id: 'pelota', name: 'PELOTA', say: '¡Pelota!', bars: [PELOTA_IN, PELOTA_GOLPE, PELOTA_OUT, SETENTA_DILE, DAME],
    blurb: 'An enchufla that takes the guys inside the circle and the girls outside. On 1 the golpe: guys point to the center, girls out. She turns, he turns, an enchufla back into line, a dile que no hands her on, then a dame. Everyone has a new partner.',
  },
  dobleplay: {
    id: 'dobleplay', name: 'DOBLE PLAY CON MAMBO', say: '¡Doble play con mambo!', bars: [ENCHUFLA, MAMBO, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla that stops facing the next girl for the mambo: everyone taps the left foot, then the right, the other hand reaching forward, and claps on 5 and 7 as the feet keep going. Then a dame with her. Everyone has a new partner.',
  },
  pelota4: {
    id: 'pelota4', name: 'PELOTA DE 4', say: '¡Pelota de cuatro!', bars: [ENCHUFLA, MAMBO_ALL, PELOTA4_TURN, DAME_AFTER_ENCHUFLA],
    blurb: 'An enchufla that stops facing the next girl, a whole bar of mambo, then everyone turns once round to the left in four quarters, clapping on each: 1, 3, 5 and 7. Then a dame with her. Everyone has a new partner.',
  },
  // from: what the rueda must be doing for the move to be called (arriba,
  // adentro y afuera, or a list); the rest are called from the guapea.
  // loop: after its bars the move goes on with this figure until the next
  // call, and to: what the rueda is doing then.
  arriba: {
    id: 'arriba', name: 'ARRIBA', say: '¡Arriba!', bars: [DILE_QUE_SI], loop: ARRIBA, to: 'arriba',
    blurb: 'A dile que si: a short extension, then a half turn together into the closed hold. The rueda closes up and every couple walks round the circle, a place a bar, the joined hands pumping, until the next call.',
  },
  dilequeno: {
    id: 'dilequeno', name: 'DILE QUE NO', say: '¡Dile que no!', bars: [ARRIBA_DILE], from: ['arriba', 'adentro'],
    blurb: 'Out of the closed hold: she crosses in front of him and they are back in the guapea, with the same partner, where they walked to.',
  },
  tarrito: {
    id: 'tarrito', name: 'TARRITO', say: '¡Tarrito!', bars: [TARRITO], from: 'arriba', loop: ARRIBA, to: 'arriba',
    blurb: 'The joined hands go up into an arch and he walks on under her arm while she keeps walking. By the 8 he has the girl ahead in the closed hold and they walk on arriba. Everyone has a new partner.',
  },
  tuya: {
    id: 'tuya', name: 'TARRITO HASTA LA TUYA', say: '¡Tarrito hasta la tuya!', bars: [], from: 'arriba', loop: ARRIBA, to: 'arriba',
    blurb: 'A tarrito, but he walks on round the inside of the circle, past every girl, until he is back with his own. Then they walk on arriba.',
  },
  adentro: {
    id: 'adentro', name: 'ADENTRO Y AFUERA', say: '¡Adentro y afuera!', bars: [ADENTRO_IN], from: 'arriba', loop: ADENTRO, to: 'adentro',
    blurb: 'They stop walking and, in the closed hold, he steps in on 1 as she turns to face the center and steps out, and on 5 the other way round, meeting in the middle on 3 and 7. Again and again until the next call.',
  },
  // Arriba again out of adentro y afuera: they walk on from the middle.
  arriba2: {
    id: 'arriba2', name: 'ARRIBA', say: '¡Arriba!', bars: [ARRIBA], from: 'adentro', loop: ARRIBA, to: 'arriba',
    blurb: 'Out of adentro y afuera they walk on round the circle in the closed hold, a place a bar, the joined hands pumping, until the next call.',
  },
  // loopIn: the loop's first bar after the move's own.
  tarrito2: {
    id: 'tarrito2', name: 'TARRITO', say: '¡Tarrito!', bars: [TARRITO_AD], from: 'adentro', loop: ADENTRO, loopIn: ADENTRO_IN, to: 'adentro',
    blurb: 'The joined hands go up into an arch and he walks under her arm to the next girl, who waits stepping in place. By the 8 he has her in the closed hold, and they go on in and out. Everyone has a new partner.',
  },
  // La exhibo out of adentro y afuera, and out of arriba (exhibo2).
  exhibo: {
    id: 'exhibo', name: 'LA EXHIBO', say: '¡La exhibo!', bars: [EXHIBO], from: 'adentro', loop: ADENTRO, to: 'adentro',
    blurb: 'On 1-2-3 the in and out, but she stays facing the center and walks on into it. On 5 he lifts the joined hands, she reaches out to the center with her free arm and turns once round under them. Then they go on in and out.',
  },
  exhibo2: {
    id: 'exhibo2', name: 'LA EXHIBO', say: '¡La exhibo!', bars: [EXHIBO_IN], from: 'arriba', loop: ADENTRO, to: 'adentro',
    blurb: 'They stop walking and go in and out, but on 2-3 she stays facing the center and walks on into it. On 5 he lifts the joined hands, she reaches out to the center with her free arm and turns once round under them. Then they go on in and out.',
  },
};

// The calls: measure number -> move id; the move's bars follow from that
// measure on. Calls well behind us are folded into baseShift and baseTravel.
const timeline = new Map();
let baseShift = 0, baseTravel = 0;
// The measure a call ends on: a move with a loop goes on until the next call.
function endOf(k, mv) {
  if (!mv.loop) return k + mv.bars.length;
  let e = Infinity;
  for (const kk of timeline.keys()) if (kk > k && kk < e) e = kk;
  return e;
}
// The call dancing in measure m, and which of its bars (loop: in its loop).
function callAt(m) {
  for (const [k, id] of timeline) {
    const mv = MOVES[id];
    if (m >= k && m < endOf(k, mv)) return { id, bar: m - k, loop: m - k >= mv.bars.length };
  }
  return null;
}
const figureAt = (m) => {
  const c = callAt(m), mv = c && MOVES[c.id];
  return !c ? GUAPEA : c.loop ? (c.bar === mv.bars.length && mv.loopIn) || mv.loop : mv.bars[c.bar];
};
// What a call's figures add up to (key: shift, how many places the girls
// have moved on clockwise; travel, how many places the couples have walked
// counterclockwise) before measure m.
function sumOf(k, id, m, key) {
  const mv = MOVES[id], end = Math.min(m, endOf(k, mv));
  let s = 0;
  mv.bars.forEach((f, j) => { if (k + j < end) s += f[key] ?? 0; });
  if (end > k + mv.bars.length) s += (end - k - mv.bars.length) * (mv.loop[key] ?? 0);
  return s;
}
function shiftBefore(m) {
  let s = baseShift;
  for (const [k, id] of timeline) s += sumOf(k, id, m, 'shift');
  return s;
}
function travelBefore(m) {
  let s = baseTravel;
  for (const [k, id] of timeline) s += sumOf(k, id, m, 'travel');
  return s;
}
// What the rueda is doing between moves at measure m: the guapea, arriba or
// adentro y afuera, from the move that took it there until the dile que no.
function stateAt(m) {
  let last = -Infinity, id = null;
  for (const [k, i] of timeline) if (k < m && k > last) { last = k; id = i; }
  return (id && MOVES[id].to) || 'guapea';
}

// One track's keys for the measures around beat b, on the absolute beat line,
// so each figure flows into the next.
function keysAround(d, name, b) {
  const m = Math.floor(b / 8), out = [];
  for (let mm = m - 1; mm <= m + 1; mm++) for (const k of figureAt(mm)[d.role][name] ?? (name === 'hips' ? HIPS : [[0, 1]])) out.push([k[0] + mm * 8, ...k.slice(1)]);
  return out;
}
function activeAbs(keys, b, pre, post) {
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

const ARM = [6.8, 6.6], THIGH = 6.4, SHIN = 6.2, HEAD_R = 5.8;
const LEG2 = (THIGH + SHIN) ** 2 * 0.97; // the furthest a leg reaches, squared
// Hip height above the ankles (1.3) against the leg's length is how bent the
// knees are standing: hipZ, crouched, and STAND * P.stand higher (about 150
// degrees at the knee). DIP: how far the knees dip on each step (dip()).
// SINK: how far below their height at Straight legs 1 the hips may come down
// for a wide step, so straighter legs still reach as far.
const STAND = 2.2, DIP = 1.3, SINK = 2.5;
const softMin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4; };
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
  // In arriba the circle closes up to a place every RING * PLACE px, but with
  // few couples not so far that the guys going round inside run into each other.
  RING = Math.min(1, Math.max(0.72, 22 / R));
  MOVES.tuya.bars = tuyaBars(n);
  leads = []; follows = [];
  timeline.clear(); baseShift = 0; baseTravel = 0;
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
function body(d, b) {
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

function hands(b) {
  const n = P.couples, m = Math.floor(b / 8), t = b - m * 8, s = shiftBefore(m), fig = figureAt(m);
  const aim = (B, O, I) => { B.aim = { O, I }; };
  const prep = figureAt(m + 1).lift ? ramp(t, 6, 7.5) : 0;
  palms = [];
  const win = (w) => (w ? ramp(t, w[0], w[1]) * (1 - ramp(t, w[2], w[3])) : 0);
  if (fig.cross) {
    // The sombrero's crossed hands. In the coronación each wears the other's
    // arm: his right around behind her neck, her left around behind his, and
    // their own outside arms bent with the hand behind the neck.
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
    return;
  }
  if (fig.behind) {
    // El Uno: both hands held like a handshake while he dances behind her.
    // right is how far he is on her right: her arm on his side is wrapped
    // behind her back and the other is out at her side, and they swap as
    // he passes behind her. In the first bar his right takes her right from
    // the guapea (take), she turns past him, her right arm wrapping behind
    // her back, and his left takes her left. In the second, on 5 his right
    // brings her right arm out by her side and up over her head (wrap: out,
    // over her head by, on by), and her left goes up over his head (hats:
    // over his head from, by, on by, let go from, by): the coronación.
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
    return;
  }
  if (fig.straight) {
    // The setenta's two hands. His left takes her right over her head
    // (high) for her turns, and his right takes her left over his own head
    // (mine) for his. Her left hand goes round her and behind her back as
    // she turns in the first bar (lock), with his right arm round her right
    // side holding it, and comes back round in front as she turns back in
    // the second (unlock). In the third he lets go with his left for his
    // turn (offO) and with his right for hers (offI).
    const high = win(fig.high), mine = win(fig.mine), offO = win(fig.offO), offI = fig.offI ? ramp(t, ...fig.offI) : 0;
    const u = fig.lock ? 1 - (1 - ramp(t, ...fig.lock)) ** 2 : fig.unlock ? 1 - ramp(t, ...fig.unlock) : 0;
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
      aim(L, mix(O, rest(L, L.d.sO), offO), mix(I, styled(L, t), offI));
      aim(F, mix(O, rest(F, F.d.sO), offO), mix(I, styled(F, t), offI));
      if (locked > 0) {
        L.around = { I: { on: F, w: locked, side: v3(-F.l.x, -F.l.y, -0.3) } }; // round her right side
        F.pole = { I: { w: locked, side: v3(F.l.x * 0.6 - F.f.x, F.l.y * 0.6 - F.f.y, -0.3) } }; // her elbow out back
      }
    }
    return;
  }
  if (fig.pelota) {
    // The pelota: his left (hand 'L') or right ('R') holds her right, low in
    // front between them, and over swap his other hand takes it before the
    // first lets go. over: up over her head (both: over both heads). golpe:
    // the joined right arms stretched between them, the free arms stretched
    // out, his to the center and hers away from it, the heads following.
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
    return;
  }
  if (fig.shine) {
    // A shine's hands are free (shineHands reaches them forward).
    for (const d of dancers()) aim(d.pose, rest(d.pose, d.sO), rest(d.pose, -d.sO));
    return;
  }
  if (fig.closed) {
    // Arriba. In the dile que si the joined hands go from the guapea's grip up
    // to the closed hold's, his right hand to her back and her left up over
    // his arm onto his shoulder (closed: the window [from, by] they do it
    // in). Walking, they pump (pump: the figures' keys, read across the bar
    // lines so the first pump starts on the 8 before), and each one's
    // shoulder on that side goes up with them, the other a little down.
    const hold = fig.closed === true ? 1 : ramp(t, ...fig.closed), keys = [];
    for (let mm = m - 1; mm <= m + 1; mm++) for (const [c, v] of figureAt(mm).pump ?? [[0, 0]]) keys.push([mm * 8 + c, v]);
    const a = activeAbs(keys, b, 0.4, 0.2), pump = lerp(a.prev[1], a.k[1], inOut(a.u));
    if (fig.exhibo) {
      // La exhibo (see EXHIBO): the joined hands go up over her head for her
      // turn, she reaches out to the center, and they let go of each other's
      // backs for it.
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
      return;
    }
    if (fig.tarrito) {
      // The tarrito: on 1 they let go of each other's backs (off) and the
      // joined hands go on up into the arch he walks under. They let
      // go of it on 4 (letGo) (arch: those windows). His left takes the right
      // hand of the girl he comes up to (the bar's shift on) on 6 (take), and
      // by the 8 they are in the closed hold (on) (take: those windows).
      // Without them his hands are free and swing as he walks.
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
      return;
    }
    for (let i = 0; i < n; i++) {
      const L = leads[i].pose, F = follows[mod(i + s, n)].pose;
      for (const B of [L, F]) { B.shO = add(B.shO, v3(0, 0, 1.4 * pump)); B.shI = add(B.shI, v3(0, 0, -0.6 * pump)); }
      const j = mix(guapeaGrip(L, F, t), closedGrip(L, F, pump), hold);
      aim(L, j, mix(styled(L, t), herBack(F), hold));
      aim(F, j, add(mix(styled(F, t), hisBack(L), hold), v3(0, 0, 5 * Math.sin(Math.PI * hold))));
      L.around = { I: { on: F, w: hold, side: v3(F.l.x, F.l.y, -0.3) } }; // around her left side
      F.around = { I: { on: L, w: hold, side: v3(-L.l.x, -L.l.y, 0.2) } }; // over his right shoulder
    }
    return;
  }
  if (fig.over) {
    // Turns under the arm: for each turn his left hand takes her right over
    // her head and brings it down after. In the doble his right hand stops
    // her by her back (hug) and her free left arm goes straight up (flair).
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
    return;
  }
  if (!fig.shift && !fig.dile) {
    // Guapea: the free palms meet on 5.
    const press = track(PRESS, t, 0.42, 0, inOut);
    for (let i = 0; i < n; i++) {
      const L = leads[i].pose, F = follows[mod(i + s, n)].pose, j = lifted(guapeaGrip(L, F, t), L, F, prep);
      const pm = mix(L.shI, F.shI, 0.5), palm = v3(pm.x, pm.y, pm.z - 1.5);
      palms.push(palm);
      aim(L, j, mix(styled(L, t), palm, press));
      aim(F, j, mix(styled(F, t), palm, press));
    }
    return;
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
function crossPrep(b) {
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
function shineHands(b) {
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
let sparks = [];
function clapHands(b) {
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
function reach(B) {
  const sO = B.d.sO, pole = (n, side) => {
    let p = v3(B.l.x * side * 0.7 - B.f.x * 0.35, B.l.y * side * 0.7 - B.f.y * 0.35, -1);
    for (const a of [B.around?.[n], B.pole?.[n]]) if (a) p = mix(p, a.side, a.w);
    return p;
  };
  const O = ik(B.shO, B.aim.O, ARM[0], ARM[1], pole('O', sO)), I = ik(B.shI, B.aim.I, ARM[0], ARM[1], pole('I', -sO));
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
    // Around a partner, or on top in crossed hands, the forearm and hand are
    // drawn later (render); the upper arm stays with the body.
    if (B.around?.[n]?.w > 0.5 || B.top?.n === n) items.push({ z: (depth(a.sh) + depth(a.el)) / 2, draw: () => arm(d, a, 'upper') });
    else items.push({ z: (depth(a.el) + depth(a.hand)) / 2, draw: () => arm(d, a) });
  }
  items.sort((a, b) => b.z - a.z).forEach((p) => p.draw());
  head(d, B);
}

// part: 'upper' (shoulder to elbow), 'fore' (elbow to hand) or both.
function arm(d, a, part) {
  const look = d.look, w = d.lead ? [3.2, 2.7] : [2.5, 2.2], c = d.lead ? [look.shirt, look.skin] : [look.skin, look.skin];
  if (part === 'upper') return spr.limb([proj(a.sh), proj(a.el)], [w[0]], [c[0]]);
  if (part === 'fore') spr.limb([proj(a.el), proj(a.hand)], [w[1]], [c[1]]);
  else spr.limb([proj(a.sh), proj(a.el), proj(a.hand)], w, c);
  spr.blob(proj(a.hand), 1.35, look.skin);
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

// B.yaw turns the head on the shoulders (+ = to the left).
function head(d, B) {
  const look = d.look, h = B.head, R = HEAD_R, c = Math.cos(B.yaw || 0), sn = Math.sin(B.yaw || 0);
  const f = { x: B.f.x * c - B.f.y * sn, y: B.f.x * sn + B.f.y * c }, l = { x: -f.y, y: f.x };
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
const music = new ChipMusic(P.bpm, 'fm');
music.layers = { band: true, melody: true };
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
// whoosh of its big turn and the landing on the 1 after it.
function onBeat(k) {
  const c = mod(k, 8), m = Math.floor(k / 8), fig = figureAt(m), me = player();
  for (const d of dancers()) {
    const mine = d === me && state.mode === 'play';
    if (c === 0 || c === 4 || (mine && [1, 2, 5, 6].includes(c))) puff(c === 0 || c === 2 || c === 5 ? d.pose.ankleO : d.pose.ankleI, mine ? 4 : 2);
  }
  if (fig.whoosh?.includes(c)) music.sfx('whoosh');
  const done = callAt(m - 1);
  if (c === 0 && done && done.bar === MOVES[done.id].bars.length - 1) {
    music.sfx('perfect');
    shake = 0.6;
    for (const d of [me, me.lead ? follows[mod(shiftBefore(m), leads.length)] : leads[mod(-shiftBefore(m), leads.length)]]) puff(d.pose.ankleO, 10, '#f0d0a0', 30);
  }
}

// Space: the rueda dances the selected move from the next 1.
function call() {
  if (state.mode === 'title') return start();
  // Moves are called on 5. A call once the move's preparation has started
  // (on 7) is too late; it waits for the 1 after. A call during a longer
  // move waits for it to end.
  // Out of adentro y afuera the couples head on from the 7 to wherever the
  // next move needs them, so a call must come by the 5.
  const mv = MOVES[state.move], first = mv.bars[0], b = music.beat();
  const early = Math.max(-Math.min(0, first.lead.root[0][0], first.follow.root[0][0]), nextState(b) === 'adentro' ? 3 : 0);
  let m = Math.floor((b + early) / 8) + 1;
  const running = callAt(m);
  if (running?.bar > 0 && !running.loop) m += MOVES[running.id].bars.length - running.bar;
  // A loop (arriba) goes on only until the next call.
  if (mv.bars.some((_, j) => callAt(m + j) && !callAt(m + j).loop) || !callableFrom(mv, stateAt(m))) return music.sfx('nope');
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
  crossPrep(b);
  shineHands(b);
  clapHands(b);
  for (const d of dancers()) { reach(d.pose); spring(d, d.pose, dt); }
}

// Calls well behind us only matter for who dances with whom, and where. In
// order, since a loop ends where the next call starts.
function fold(b) {
  const m = Math.floor(b / 8);
  for (const k of [...timeline.keys()].sort((x, y) => x - y)) {
    const id = timeline.get(k);
    if (endOf(k, MOVES[id]) > m - 3) break;
    baseShift += sumOf(k, id, Infinity, 'shift');
    baseTravel += sumOf(k, id, Infinity, 'travel');
    timeline.delete(k);
  }
}

// The clap sounds are scheduled ahead, like the band's notes, so they are
// heard right on the count: once the listener hears a beat it is too late to
// start a sound for it.
let clapsUpTo = -Infinity;
function scheduleClaps(b) {
  const m = Math.floor(b / 8);
  for (let mm = m; mm <= m + 1; mm++) for (const c of figureAt(mm).claps ?? []) {
    const k = mm * 8 + c, at = music.timeOf(k);
    if (k <= clapsUpTo || at > music.ctx.currentTime + 0.15) continue;
    clapsUpTo = k;
    if (at > music.ctx.currentTime - 0.03) music.sfx('clap', at);
  }
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
  if (frozen === null && music.ctx) scheduleClaps(b);
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
  // A hand on someone's back shows over them when their back is to the
  // camera, and hides behind them when it isn't.
  const around = new Map();
  for (const d of dancers()) for (const [n, { on, w }] of Object.entries(d.pose.around || {})) {
    if (w <= 0.5) continue;
    const k = on.f.x * TO_CAM.x + on.f.y * TO_CAM.y < 0 ? 'after' : 'before';
    if (!around.has(on)) around.set(on, { before: [], after: [] });
    around.get(on)[k].push(() => arm(d, d.pose.arms[n], 'fore'));
  }
  // In crossed hands, the top pair's forearms show over both partners.
  const drawn = new Set();
  dancers().sort((a, c) => depth(c.pose.pelvis) - depth(a.pose.pelvis)).forEach((d) => {
    const w = around.get(d.pose), top = d.pose.top;
    w?.before.forEach((f) => f());
    drawDancer(d, d.pose, d.pose.arms);
    w?.after.forEach((f) => f());
    if (top && drawn.has(top.mate)) for (const B of [d.pose, top.mate]) arm(B.d, B.arms[B.top.n], 'fore');
    drawn.add(d.pose);
  });
  spr.commit(out);
  const sh = shake > 0.05 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
  shake *= Math.pow(0.001, dt);
  ctx.putImageData(img, sh, 0);

  // Palms meet on 5: a little spark between every couple. Claps spark too.
  for (const [palm, age] of [...(t >= 4 && t < 4.22 ? palms.map((p) => [p, t - 4]) : []), ...sparks]) {
    const p = proj(palm), r = age < 0.08 ? 2 : 1;
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
  const me = player(), B = me.pose, m = Math.floor(b / 8), now = callAt(m), next = timeline.get(m + 1);
  drawText(ctx, 'RUEDA', 8, 6, GOLD, 2, OUTLINE, { shadow: OUTLINE });
  // The big name over the circle on a move's 1 says it instead.
  if (!(now?.bar === 0 && t < 1.2)) drawText(ctx, now ? MOVES[now.id].name : GUAPEA.name, 9, 24, now ? GOLD[2] : CREAM, 1, OUTLINE);

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
  if (now?.bar === 0 && t < 1.2) {
    // A long name goes on two lines so it clears the corners of the HUD.
    // Split at the space that leaves the shorter longest line.
    const text = `¡${MOVES[now.id].name}!`, cuts = [...text.matchAll(/ /g)].map((c) => c.index);
    const longest = (cut) => Math.max(cut, text.length - cut - 1), cut = cuts.reduce((a, c) => (longest(c) < longest(a) ? c : a), cuts[0]);
    const lines = textWidth(text, 4) > W - 140 && cut > 0 ? [text.slice(0, cut), text.slice(cut + 1)] : [text];
    const s = t < 0.08 && lines.length === 1 ? 5 : 4;
    if (t < 0.6 || Math.floor(b * 6) % 2 === 0) lines.forEach((line, i) => centerText(ctx, line, 12 - (s - 4) * 2 + i * (7 * s + 4), GOLD, s, OUTLINE, { shadow: OUTLINE }));
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
  const idle = !next && (!now || now.loop) && b - Math.max(state.calledAt, state.startedAt) > 12;
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
let libKey = '', libMove = '', libState = '';
// The list shows only the moves that can be called next: from the guapea,
// from arriba or from adentro y afuera. Each keeps its own pick, so after a
// dile que no the pick from before arriba is back.
const picks = {};
const callableFrom = (mv, st) => [mv.from ?? 'guapea'].flat().includes(st);
const available = (st) => Object.values(MOVES).filter((mv) => callableFrom(mv, st)).map((mv) => mv.id);
const STATE_NAME = { guapea: 'Guapea', arriba: 'Arriba', adentro: 'Adentro y afuera' };
// What the next call would start from: what the rueda does once the move
// dancing now, or called for the next 1, is done.
function nextState(b) {
  let m = Math.floor(b / 8) + 1;
  const c = callAt(m);
  if (c && !c.loop) m += MOVES[c.id].bars.length - c.bar;
  return stateAt(m);
}
function buildLibrary(st) {
  if (libState) picks[libState] = state.move;
  libState = st;
  const ids = available(st);
  state.move = ids.includes(picks[st]) ? picks[st] : ids.includes(state.move) ? state.move : ids[0];
  lib.querySelector('#avail').textContent = `${STATE_NAME[st]} – available moves`;
  const list = lib.querySelector('ol');
  list.innerHTML = '';
  ids.map((id) => MOVES[id]).forEach((mv, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" data-move="${mv.id}"><kbd${i < 10 ? '' : ' class="none"'}>${i < 10 ? (i + 1) % 10 : '&nbsp;'}</kbd><b>${mv.name}</b><i></i><small>${mv.blurb}</small></button>`;
    li.querySelector('button').addEventListener('click', (e) => { e.currentTarget.blur(); select(mv.id); });
    list.appendChild(li);
  });
  libKey = ''; libMove = '';
}
function select(id) {
  if (id !== state.move) music.sfx('select');
  state.move = id;
}
// Marks the selected move, and the one dancing now or next.
function syncLibrary(b) {
  const st = nextState(b);
  if (st !== libState) buildLibrary(st);
  const m = Math.floor(b / 8), now = callAt(m)?.id, next = timeline.get(m + 1), key = `${state.move}|${now}|${next}`;
  if (key === libKey) return;
  libKey = key;
  // A move picked with a key may be below the fold of the list.
  if (state.move !== libMove) lib.querySelector(`button[data-move="${(libMove = state.move)}"]`)?.scrollIntoView({ block: 'nearest' });
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
  const k = e.code, ids = available(libState);
  if (k === 'Space' || k === 'Enter' || k === 'KeyZ') { e.preventDefault(); call(); }
  else if (k === 'ArrowLeft' || k === 'KeyA') setRole('lead');
  else if (k === 'ArrowRight' || k === 'KeyD') setRole('follow');
  else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); select(ids[mod(ids.indexOf(state.move) + (k === 'ArrowUp' ? -1 : 1), ids.length)]); }
  else if (/^Digit[0-9]$/.test(k) && ids[(+k.slice(5) + 9) % 10]) select(ids[(+k.slice(5) + 9) % 10]); // 0 is the tenth
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
// ?call=enchufla, or several calls: ?call=arriba,dilequeno@5 (each one from
// the given measure, or right after the one before).
if (q.has('call')) {
  let at = 1;
  for (const c of q.get('call').split(',')) {
    const [id, from] = c.split('@'), mv = MOVES[id] ? id : state.move;
    if (from) at = +from;
    timeline.set(at, mv);
    at += MOVES[mv].bars.length;
  }
}
buildPlaza();
buildPanel();
buildLibrary(nextState(beatNow()));
fit();
window.rueda = { P, state, music, timeline, leads: () => leads, follows: () => follows, seek: (b) => { frozen = b; }, call };
requestAnimationFrame(frame);
