// Which figure every measure dances, from the calls, and what the rueda does
// between moves (the guapea, arriba or adentro y afuera).

import { GUAPEA } from './figures/guapea.js';
import { MOVES } from './moves.js';

// The calls: measure number -> move id; the move's bars follow from that
// measure on. Calls well behind us are folded into baseShift and baseTravel.
export const timeline = new Map();
let baseShift = 0, baseTravel = 0;
export function clearCalls() {
  timeline.clear();
  baseShift = 0;
  baseTravel = 0;
}
// The measure a call ends on: a move with a loop goes on until the next call.
function endOf(k, mv) {
  if (!mv.loop) return k + mv.bars.length;
  let e = Infinity;
  for (const kk of timeline.keys()) if (kk > k && kk < e) e = kk;
  return e;
}
// The call dancing in measure m, and which of its bars (loop: in its loop).
export function callAt(m) {
  for (const [k, id] of timeline) {
    const mv = MOVES[id];
    if (m >= k && m < endOf(k, mv)) return { id, bar: m - k, loop: m - k >= mv.bars.length };
  }
  return null;
}
export const figureAt = (m) => {
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
export function shiftBefore(m) {
  let s = baseShift;
  for (const [k, id] of timeline) s += sumOf(k, id, m, 'shift');
  return s;
}
export function travelBefore(m) {
  let s = baseTravel;
  for (const [k, id] of timeline) s += sumOf(k, id, m, 'travel');
  return s;
}
// What the rueda is doing between moves at measure m: the guapea, arriba or
// adentro y afuera, from the move that took it there until the dile que no.
export function stateAt(m) {
  let last = -Infinity, id = null;
  for (const [k, i] of timeline) if (k < m && k > last) { last = k; id = i; }
  return (id && MOVES[id].to) || 'guapea';
}

// Calls well behind us only matter for who dances with whom, and where. In
// order, since a loop ends where the next call starts.
export function fold(b) {
  const m = Math.floor(b / 8);
  for (const k of [...timeline.keys()].sort((x, y) => x - y)) {
    const id = timeline.get(k);
    if (endOf(k, MOVES[id]) > m - 3) break;
    baseShift += sumOf(k, id, Infinity, 'shift');
    baseTravel += sumOf(k, id, Infinity, 'travel');
    timeline.delete(k);
  }
}

export const callableFrom = (mv, st) => [mv.from ?? 'guapea'].flat().includes(st);

// What the next call would start from: what the rueda does once the move
// dancing now, or called for the next 1, is done.
export function nextState(b) {
  let m = Math.floor(b / 8) + 1;
  const c = callAt(m);
  if (c && !c.loop) m += MOVES[c.id].bars.length - c.bar;
  return stateAt(m);
}
