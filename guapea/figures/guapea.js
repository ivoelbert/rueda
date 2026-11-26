// The guapea, and the figures danced from its open hold with one hand: the
// dame, the enchufla, the enchufla doble and the pelotas uno to tres. What a
// figure is, and its tracks, is explained above GUAPEA.

// t runs 0..8 over the eight counts (count 1 at t = 0). Keys are
// [beat, value]: the value is reached on that beat. "O" is the foot on the
// outside of the circle (his left, her right), "I" the inside one.
export const DIST = 19; // partners' pelvises apart in the open position
export const PLACE = DIST + 24; // px from couple to couple round the circle, at full size
const PELVIS = [[0, -1], [1, -0.35], [2, 0], [4, 1], [5, 0.35], [6, 0]];
export const HIPS = [[0, 1], [1, -1], [2, 1], [3, 1.6], [4, -1], [5, 1], [6, -1], [7, -1.6]]; // toward the weighted foot, popping on 4 and 8
const ANGLE = [[2, 0], [4, 1], [6, 0]]; // he angles to his right on the forward rock
// [beat, forward in steps, inward px (his only), lift px]
const FOOT_O = [[0, -1, 0, 2.6], [2, 0, 0, 2.2], [5, 0, 0, 1.2], [7, 0, 0, 1.3]];
const FOOT_I = [[1, 0, 0, 1.2], [3, 0.15, 0, 1.5], [4, 1, 1.2, 2.6], [6, 0, 0, 2.2]];
export const KNEES = [[0, 1], [1, 0.5], [2, 0.7], [3, -0.45], [4, 1], [5, 0.5], [6, 0.7], [7, -0.45]]; // dip per step, a lift on 4 and 8
export const JOINED_Z = [[0, 9.5], [2, 13], [4, 17.5], [6, 13.5]]; // joined hands: down and out on 1, up on 5
export const JOINED_OUT = [[0, 4], [2, 0.8], [4, 0], [6, 0.8]];
export const PRESS = [[3, 0], [4, 1], [5, 0]]; // free palms meet on 5
export const HER_FLOURISH = [[1, 1], [2.6, 0]]; // her free hand frames her face on 1-2-3
export const HIS_FLOURISH = [[0.5, 0.7], [2.4, 0]]; // his opens to the inside
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
export const GUAPEA = {
  name: 'GUAPEA', shift: 0,
  lead: { root: STILL, pelvis: PELVIS, angle: ANGLE, O: FOOT_O, I: FOOT_I },
  follow: { root: STILL, pelvis: PELVIS, angle: [[0, 0]], O: FOOT_O, I: FOOT_I_F },
};

export const DAME = {
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
export const ENCHUFLA_STEPS = { pelvis: [[0, -0.5], [1, 0.3], [2, 0], [4, 0.3], [6, 0]], angle: [[0, 0]], O: [[0, -0.6, 0, 2.6], [2, 0, 0, 2.6], [5, 0, 0, 2.6], [7, 0, 0, 1.3]], I: [[1, 0, 0, 2.6], [3, 0, 0, 1.2], [4, 0, 0, 2.6], [6, 0, 0, 2.4]] };
// They are already heading back on 4, so the foot that lands on 3 goes on
// ahead instead of being dragged.
export const ENCHUFLA_O = [[0, -0.6, 0, 2.6], [2, 0.8, 0, 2.6], [5, 0, 0, 2.6], [7, 0, 0, 1.3]];
// lift: the joined hands come up on the 7-8 before it. The hand windows are
// [on from, on by, off from, off by]: over, his left hand takes her right
// over her head for a turn; hug, his right hand on her back; flair, her free
// left arm straight up; look, they turn their heads to each other. letGo:
// when they let go of each other.
export const ENCHUFLA = {
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
export const DOBLE = {
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

const fromOne = (tracks) => ({ ...tracks, root: tracks.root.filter(([b]) => b >= 0) });
// After an enchufla they are already facing each other with their hands
// free, so its dame starts from its 1, from where the enchufla left them on
// 8. flow: they walk straight on into it, without coming to rest on the bar
// line, and keep turning toward each other into the hold.
export const DAME_AFTER_ENCHUFLA = {
  ...DAME, free: true, flow: true,
  lead: { ...DAME.lead, root: [[0, 0.05, -0.3, -153], [0.5, 0.07, -1.8, -134], ...DAME.lead.root.filter(([b]) => b >= 1)] },
  follow: { ...DAME.follow, root: [[0, -0.09, -0.7, 154], [0.5, -0.16, -3.2, 171], ...DAME.follow.root.filter(([b]) => b >= 1)] },
};
// After the doble's first bar they walk straight into the enchufla's 1,
// still wound a little past facing each other from being sent back.
const wound = (tracks, turn) => ({ ...tracks, root: [[0, 0, 0.5, turn], ...fromOne(tracks).root.slice(1)] });
export const ENCHUFLA_AFTER_DOBLE = { ...ENCHUFLA, lead: wound(ENCHUFLA.lead, 25), follow: wound(ENCHUFLA.follow, -35) };
// The pelotas: an enchufla where everyone claps (claps: the counts, 0-7) on
// the way to the new partner, on 7, on 7 and 8, or on 7, 8 and the dame's 1.
export const PELOTA_1 = { ...ENCHUFLA, claps: [6] };
export const PELOTA_2 = { ...ENCHUFLA, claps: [6, 7] };
export const DAME_CLAP = { ...DAME_AFTER_ENCHUFLA, claps: [0] };
