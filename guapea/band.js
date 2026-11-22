// The guapea's band: a salsa conjunto on an early-90s FM sound chip.
//
// One 8-count measure is one cycle of 2-3 son clave. The chords move every
// two counts (C F G7 F). The bass plays a tumbao: it anticipates every change
// on 2& and 4 and leaves the 1 empty. The piano plays a montuno in octaves
// that pushes each chord an eighth early. The congas play a tumbao with the
// open tones on 4 and 4&, the bongo bell and the güiro mark every count, and
// the horns play a mambo over a four-measure loop, which a timbal fill and a
// crash bring back in.
import { ChipMusic } from '../shared/chip.js';

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const mod = (a, n) => ((a % n) + n) % n;

// One chord per two counts. top: the montuno's octave note; inner: the
// notes between the octave; root: what the bass anticipates.
const CHORDS = [
  { pcs: [0, 4, 7], top: 55, inner: [60, 64], root: 36 }, // C
  { pcs: [5, 9, 0], top: 57, inner: [60, 65], root: 41 }, // F
  { pcs: [7, 11, 2, 5], top: 59, inner: [62, 67], root: 43 }, // G7
  { pcs: [5, 9, 0], top: 57, inner: [60, 65], root: 41 }, // F
];
// The chord an eighth belongs to: the "and" before each change already
// belongs to the next chord.
const chordAt = (e) => CHORDS[Math.floor(((e + 1) % 16) / 4)];

// Patterns over the 16 eighths of a measure (count 1 is eighth 0).
const CLAVE = [2, 4, 8, 11, 14]; // 2-3 son clave: 2, 3 | 5, 6&, 8
const CAMPANA = 'O.ccO.ccO.ccO.cc'; // bongo bell: Open mouth on 1 and 3, closed neck on 2 2& and 4 4&
const GUIRO = 'L.ssL.ssL.ssL.ss'; // Long scrape on 1 and 3, short short on 2 2& and 4 4&
const CONGAS = 'htsthtoohtsthtOO'; // heel toe slap toe heel toe, open open on 4 4&, the tumba on 8 8&
// Bass tumbao, eighth -> [chord, length in eighths]: 2& and 6& push the chord
// on 3 and 7, 4 and 8 push the chord on the next 1 and 5.
const BASS = { 3: [1, 3], 6: [2, 5], 11: [3, 3], 14: [0, 5] };

// The horns over a four-measure loop: [eighth, top note, length in eighths].
// A call, its answer, a measure for the piano, then ponches into the call.
const HORNS = [
  [[1, 76, 1], [2, 79, 1], [3, 81, 2], [6, 77, 1], [7, 79, 2], [10, 77, 1], [11, 81, 1], [13, 79, 1], [14, 77, 1], [15, 76, 3]],
  [[2, 74, 1], [3, 72, 2], [5, 74, 1], [6, 77, 1], [7, 74, 2], [10, 71, 1], [11, 72, 3]],
  [],
  [[3, 81, 1], [6, 81, 1], [7, 83, 2], [11, 81, 1], [14, 79, 1]],
];
// The highest chord tone a third or more below m.
function below(m, pcs) {
  for (let k = 3; k < 10; k++) if (pcs.includes(mod(m - k, 12))) return m - k;
  return m - 5;
}

export class Band extends ChipMusic {
  constructor(bpm) {
    super(bpm, 'fm');
  }

  playEighth(e, bar, t) {
    const n = 30 / this.bpm, part = mod(Math.floor(bar / 2), 4), ch = chordAt(e);
    // Percussion.
    if (CLAVE.includes(e)) this.clave(t);
    if (CAMPANA[e] !== '.') this.campana(t, CAMPANA[e] === 'O');
    if (GUIRO[e] !== '.') this.guiro(t, GUIRO[e] === 'L', n);
    this.conga(t, CONGAS[e]);
    if (part === 3 && e >= 12) this.timbal(t, e % 2 === 0, e === 15 ? 1 : 0.7);
    if (part === 0 && e === 0) this.crash(t);
    // Bass tumbao: the root of the next chord, held until the next note.
    if (BASS[e]) this.bajo(t, CHORDS[BASS[e][0]].root, BASS[e][1] * n * 0.94);
    // Piano montuno: tied over each chord's downbeat, the notes between the
    // octave on the and, the octave on the next count, then the next chord's
    // octave pushed in on its and.
    const step = e % 4;
    if (step === 1) this.keys(t, ch.inner, 0.125);
    else if (step >= 2) this.keys(t, [ch.top, ch.top + 12], step === 3 ? 0.165 : 0.14);
    // Horns in three voices.
    for (const [at, m, len] of HORNS[part]) if (at === e) {
      const m2 = below(m, ch.pcs), m3 = below(m2, ch.pcs), dur = len * n * (len > 1 ? 0.9 : 0.6);
      this.lead(t, m, dur, 0.13);
      this.lead(t, m2, dur, 0.09);
      this.lead(t, m3, dur, 0.07);
    }
  }

  // ------------------------------------------------------------- voices
  // FM piano: the hammer brightens the attack and fades out of the tone.
  keys(t, notes, v) {
    for (const m of notes) {
      const f = hz(m), car = this.wave('sine', f, t, 0.9, this.env(t, v, 0.9, 0.003));
      const mg = this.ctx.createGain();
      mg.gain.setValueAtTime(f * 2.6, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.3, t + 0.35);
      this.wave('sine', f, t, 0.9, mg);
      mg.connect(car.frequency);
    }
  }

  // Baby bass: a round pluck that settles and holds until the next note.
  bajo(t, m, len) {
    const f = hz(m), g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.006);
    g.gain.setTargetAtTime(0.12, t + 0.006, 0.1);
    g.gain.setTargetAtTime(0, t + len, 0.025);
    g.connect(this.out);
    const car = this.wave('sine', f, t, len + 0.2, g);
    const mg = this.ctx.createGain();
    mg.gain.setValueAtTime(f * 2, t);
    mg.gain.setTargetAtTime(f * 0.7, t, 0.06);
    this.wave('sine', f, t, len + 0.2, mg);
    mg.connect(car.frequency);
  }

  conga(t, stroke) {
    const tone = (f0, f1, v, decay) => this.wave('sine', f0, t, decay, this.env(t, v, decay)).frequency.exponentialRampToValueAtTime(f1, t + 0.07);
    const noise = (f, q, v, decay) => this.noiseHit(t, this.noise, decay, v, 1, ['bandpass', f, q]);
    if (stroke === 'h') tone(120, 92, 0.18, 0.07); // heel: a muted thump
    else if (stroke === 't') noise(1300, 1.2, 0.065, 0.025); // toe: a tap
    else if (stroke === 's') { noise(2100, 0.9, 0.4, 0.07); tone(420, 390, 0.14, 0.06); } // slap
    else if (stroke === 'o') { tone(330, 296, 0.38, 0.32); noise(900, 1, 0.07, 0.02); } // open tone on the conga
    else if (stroke === 'O') { tone(238, 212, 0.43, 0.38); noise(700, 1, 0.07, 0.02); } // open tone on the tumba
  }

  campana(t, open) {
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = open ? 860 : 1060; bp.Q.value = 1.8;
    bp.connect(this.env(t, open ? 0.24 : 0.135, open ? 0.24 : 0.07));
    for (const f of open ? [562, 838] : [702, 1046]) this.wave('square', f, t, open ? 0.26 : 0.09, bp);
  }

  // Noise run over the ridges: a fast tremolo on a band of hiss.
  guiro(t, long, eighth) {
    const dur = long ? eighth * 1.1 : 0.05, g = this.ctx.createGain(), am = this.ctx.createGain(), lg = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(long ? 0.25 : 0.19, t + (long ? dur * 0.8 : 0.004));
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(this.out);
    am.gain.value = 0.5; lg.gain.value = 0.5;
    am.connect(g);
    this.wave('square', long ? 64 : 90, t, dur, lg);
    lg.connect(am.gain);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 0.9;
    bp.connect(am);
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.connect(bp);
    s.start(t, Math.random() * 0.5, dur + 0.02);
  }

  timbal(t, high, v) {
    this.wave('sine', high ? 720 : 500, t, 0.16, this.env(t, 0.26 * v, 0.16)).frequency.exponentialRampToValueAtTime(high ? 660 : 450, t + 0.1);
    this.noiseHit(t, this.noise, 0.07, 0.3 * v, 1, ['bandpass', 3600, 0.8]);
  }

  crash(t) {
    this.noiseHit(t, this.noise, 1.1, 0.13, 1, ['highpass', 5200, 0.7]);
    this.noiseHit(t, this.noise, 0.4, 0.08, 1, ['bandpass', 8500, 1]);
  }
}
