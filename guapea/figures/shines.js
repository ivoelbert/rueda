// The shines, where everyone dances free on their own: the mambo of the doble
// play con mambo and of the pelota de 4, and the pelota de 4's turn.

import { ENCHUFLA } from './guapea.js';

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
export const MAMBO_ALL = {
  shift: 0, shine: [0, 2, 4, 6],
  lead: { root: stay(ENCHUFLA.lead.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: MAMBO_HIPS, ...MAMBO_TAPS('O', 'I') },
  follow: { root: stay(ENCHUFLA.follow.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: MAMBO_HIPS.map(([b, v]) => [b, -v]), ...MAMBO_TAPS('I', 'O') },
};
export const MAMBO = { ...MAMBO_ALL, shine: [0, 2], claps: [4, 6] };
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
export const PELOTA4_TURN = {
  shift: 0, shine: [], claps: [0, 2, 4, 6],
  lead: { root: quarters(ENCHUFLA.lead.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: TURN_HIPS, ...TURN_STEPS('O', 'I') },
  follow: { root: quarters(ENCHUFLA.follow.root.at(-1).slice(1)), pelvis: [[0, 0]], angle: [[0, 0]], hips: TURN_HIPS.map(([b, v]) => [b, -v]), ...TURN_STEPS('I', 'O') },
};
