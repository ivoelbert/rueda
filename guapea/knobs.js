// The URL's options (q), and the feel knobs the tune panel sets (P).

import { clamp } from './math.js';

export const q = new URLSearchParams(location.search);

// ------------------------------------------------------------ feel knobs
// [default, min, max, step, label]. Values live in the URL, so a tuned
// version can be shared as a link.
export const SPEC = {
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
export const P = Object.fromEntries(Object.entries(SPEC).map(([k, [d, lo, hi]]) => [k, q.has(k) ? clamp(+q.get(k), lo, hi) : d]));
