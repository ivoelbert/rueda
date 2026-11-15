// Synthesized casino band (clave, campana, congas, shaker, bass tumbao, piano
// montuno) and the beat clock everything else reads. One count = one quarter note.

const CHORDS = [ // one chord per 4-count bar: C | F | G | F
  { root: 48, tones: [60, 64, 67] },
  { root: 53, tones: [60, 65, 69] },
  { root: 55, tones: [59, 62, 67] },
  { root: 53, tones: [60, 65, 69] },
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Music {
  constructor(bpm) {
    this.bpm = bpm;
    this.ctx = null;
    this.anchorTime = performance.now() / 1000;
    this.anchorBeat = -2;
    this.nextEighth = 0;
  }

  now() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }

  // The beat the listener hears right now (output latency removed).
  beat() {
    const lat = this.ctx ? (this.ctx.outputLatency || this.ctx.baseLatency || 0) : 0;
    return this.anchorBeat + (this.now() - lat - this.anchorTime) * this.bpm / 60;
  }

  timeOf(beat) { return this.anchorTime + (beat - this.anchorBeat) * 60 / this.bpm; }

  setBpm(bpm) {
    const b = this.beat();
    this.anchorTime = this.now();
    this.anchorBeat = b;
    this.bpm = bpm;
  }

  start() {
    if (this.ctx) return;
    const b = this.beat();
    this.ctx = new AudioContext();
    this.anchorTime = this.ctx.currentTime + 0.05;
    this.anchorBeat = b;
    this.nextEighth = Math.ceil(b * 2);
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.8;
    this.out.connect(comp).connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(() => this.schedule(), 25);
  }

  schedule() {
    const ahead = this.ctx.currentTime + 0.15;
    while (this.timeOf(this.nextEighth / 2) < ahead) {
      const e = this.nextEighth, t = this.timeOf(e / 2);
      // Skip notes that are already late (e.g. after the tab was in the background).
      if (t > this.ctx.currentTime - 0.03) this.playEighth(((e % 16) + 16) % 16, Math.floor(e / 8), Math.max(this.ctx.currentTime, t));
      this.nextEighth++;
    }
  }

  // e: eighth within the 8-count measure (0..15), bar: absolute 4-count bar.
  playEighth(e, bar, t) {
    const inBar = e % 8;
    const chord = CHORDS[((bar % 4) + 4) % 4], next = CHORDS[(((bar + 1) % 4) + 4) % 4];
    // 2-3 son clave: counts 2, 3 | 5, 6&, 8.
    if ([2, 4, 8, 11, 14].includes(e)) this.clave(t);
    // Campana on every count, accented on 1 and 5.
    if (e % 2 === 0) this.bell(t, e === 0 || e === 8 ? 1 : 0.55);
    // Conga tumbao: slap on 2, open tones on 4 and 4&.
    if (inBar === 2) this.conga(t, 'slap');
    else if (inBar === 6 || inBar === 7) this.conga(t, 'open');
    else this.conga(t, 'soft');
    this.shaker(t, e % 2 === 0 ? 0.5 : 0.28);
    // Anticipated bass: fifth on 2&, next chord's root on 4.
    if (inBar === 3) this.bass(t, chord.root + 7);
    if (inBar === 6) this.bass(t, next.root);
    // Piano montuno.
    const pat = [0, 1, -1, 2, 1, -1, 0, 2];
    if (pat[inBar] >= 0) this.piano(t, chord.tones[pat[inBar]] + (inBar % 3 === 0 ? 12 : 0), inBar === 0 ? 0.13 : 0.09);
  }

  env(t, peak, decay, attack = 0.002) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(this.out);
    return g;
  }

  osc(type, f, t, dur, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur);
    return o;
  }

  noiseSrc(t, dur, dest) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.connect(dest);
    s.start(t, Math.random() * 0.5, dur);
  }

  clave(t) {
    const g = this.env(t, 0.5, 0.07);
    this.osc('sine', 2400, t, 0.08, g);
    this.osc('sine', 3600, t, 0.05, this.env(t, 0.12, 0.03));
  }

  bell(t, v) {
    const g = this.env(t, 0.16 * v, 0.12);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 2;
    bp.connect(g);
    this.osc('square', 545, t, 0.13, bp);
    this.osc('square', 815, t, 0.13, bp);
  }

  conga(t, kind) {
    if (kind === 'slap') {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1;
      bp.connect(this.env(t, 0.35, 0.06));
      this.noiseSrc(t, 0.06, bp);
      this.osc('sine', 420, t, 0.08, this.env(t, 0.2, 0.07));
      return;
    }
    const open = kind === 'open';
    const o = this.osc('sine', open ? 330 : 240, t, 0.3, this.env(t, open ? 0.5 : 0.12, open ? 0.25 : 0.08));
    o.frequency.exponentialRampToValueAtTime(open ? 290 : 200, t + 0.08);
  }

  shaker(t, v) {
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 6500;
    hp.connect(this.env(t, 0.09 * v, 0.05, 0.01));
    this.noiseSrc(t, 0.06, hp);
  }

  bass(t, midi) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = this.env(t, 0.42, 0.55, 0.01);
    lp.connect(g);
    this.osc('sawtooth', hz(midi - 12), t, 0.6, lp);
    this.osc('sine', hz(midi - 12), t, 0.6, this.env(t, 0.35, 0.55, 0.01));
  }

  piano(t, midi, v) {
    const g = this.env(t, v, 0.35);
    this.osc('triangle', hz(midi), t, 0.4, g);
    this.osc('sine', hz(midi + 12), t, 0.2, this.env(t, v * 0.3, 0.15));
  }

  // Sound effects.
  sfx(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    if (kind === 'perfect' || kind === 'great') {
      [0, 4, 7, 12].forEach((n, i) => this.osc('square', hz(76 + n), t + i * 0.05, 0.09, this.env(t + i * 0.05, 0.07, 0.09)));
    } else if (kind === 'good') {
      [0, 7].forEach((n, i) => this.osc('square', hz(72 + n), t + i * 0.06, 0.09, this.env(t + i * 0.06, 0.06, 0.09)));
    } else if (kind === 'miss') {
      const o = this.osc('sawtooth', 160, t, 0.25, this.env(t, 0.12, 0.25));
      o.frequency.exponentialRampToValueAtTime(80, t + 0.25);
    } else if (kind === 'complete') {
      [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => this.osc('square', hz(72 + n), t + i * 0.045, 0.12, this.env(t + i * 0.045, 0.06, 0.12)));
    } else if (kind === 'whoosh') {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(2500, t + 0.25);
      bp.connect(this.env(t, 0.25, 0.3, 0.08));
      this.noiseSrc(t, 0.3, bp);
    }
  }
}
