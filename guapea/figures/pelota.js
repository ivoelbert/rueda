// The pelota's figures.

import { ENCHUFLA_STEPS } from './guapea.js';

// The pelota: her right hand is held throughout (pelota), by his left (hand:
// 'L') or his right ('R'), passed from one of his hands to the other over
// swap. The couple keeps going round each other clockwise: each enchufla
// swaps their places and carries on a quarter further, and nothing stops on
// the 4 or the 8.
//
// First bar: an enchufla without letting go, and on 5-6-7 they carry on round
// so he ends a step inside the circle facing out and she a step outside
// facing in. On 6-7 his right takes her right from his left.
export const PELOTA_IN = {
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
export const PELOTA_GOLPE = {
  shift: 0, whoosh: [0, 4], flow: true, pelota: true, hand: 'R', swap: [4.6, 5.6], both: true, over: [2.2, 3.2, 6.2, 7.2], golpe: [-1.4, 0, 1, 2.6],
  lead: { ...ENCHUFLA_STEPS, root: [[0, -0.221, -13, -155], [1, -0.221, -12, -205], [2, -0.221, -9, -250], [3, -0.221, -7, -272], [4, -0.221, -6.5, -195], [5, -0.221, -6.5, -100], [6, -0.221, -7, -10], [7, -0.221, -8.5, 70], [8, -0.221, -9.5, 100]] },
  follow: { ...ENCHUFLA_STEPS, root: [[0, 0.221, 13, 205], [1, 0.221, 12, 160], [2, 0.221, 9, 115], [3, 0.221, 7, 70], [4, 0.221, 6.5, -10], [5, 0.221, 6.5, -100], [6, 0.221, 7, -190], [7, 0.221, 8.5, -260], [8, 0.221, 9.5, -280]] },
};
// Third bar: the enchufla back, his left holding her right, and on 5-6-7 a
// quarter further round, so they are back in line with the circle, swapped,
// as at the end of the setenta, and walk straight on into its dile que no.
export const PELOTA_OUT = {
  shift: 0, whoosh: [1], flow: true, pelota: true, hand: 'L', over: [0, 0.6, 2, 3],
  lead: { ...ENCHUFLA_STEPS, root: [[0, -0.221, -9.5, 100], [1, -0.093, -0.9, 10], [2, -0.174, 8.6, -75], [3, -0.24, 9.8, -95], [4, -0.331, 8.2, -120], [5, -0.402, 5.4, -145], [6, -0.426, 0.8, -160], [7, -0.407, -1.2, -165], [8, -0.4, -1.6, -165]] },
  follow: { ...ENCHUFLA_STEPS, root: [[0, 0.221, 9.5, -280], [1, 0.093, 0, -185], [2, 0.186, -9, -100], [3, 0.24, -10.3, -84], [4, 0.331, -8.2, -110], [5, 0.402, -5.4, -140], [6, 0.437, -2.2, -165], [7, 0.44, -1.9, -178], [8, 0.44, -1.8, -180]] },
};
