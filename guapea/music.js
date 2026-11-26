// The casino band, on a 2-operator FM sound chip like an early-90s arcade
// board: 2-3 son clave, campana, conga tumbao, anticipated slap bass,
// electric piano montuno and a brass hook. Also the sound effects, and the
// beat clock everything reads. One count = one quarter note.

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [ // one chord per 4-count bar: C | F | G | F
  { root: 48, tones: [60, 64, 67] },
  { root: 53, tones: [60, 65, 69] },
  { root: 55, tones: [59, 62, 67] },
  { root: 53, tones: [60, 65, 69] },
];
// Brass hook over 8 bars: [eighth, midi, length in eighths].
const HOOK = new Map([
  [0, 72, 1], [1, 76, 1], [3, 79, 2], [5, 81, 1], [6, 79, 2],
  [9, 77, 1], [10, 81, 1], [11, 84, 2], [14, 81, 1], [15, 77, 1],
  [16, 74, 1], [17, 79, 1], [19, 83, 2], [21, 81, 1], [22, 79, 2],
  [25, 81, 1], [26, 79, 1], [27, 77, 1], [28, 76, 2], [30, 74, 1], [31, 72, 1],
  [32, 76, 3], [35, 79, 1], [36, 84, 2], [38, 83, 1], [39, 84, 1],
  [41, 81, 2], [43, 77, 1], [44, 81, 1], [45, 84, 3],
  [48, 83, 1], [49, 86, 2], [51, 83, 1], [52, 79, 2], [54, 81, 1], [55, 83, 1],
  [56, 84, 4],
].map(([e, m, l]) => [e, [m, l]]));
const MONTUNO = [0, 1, -1, 2, 1, -1, 0, 2];

export class Music {
  constructor(bpm) {
    this.bpm = bpm;
    this.ctx = null;
    this.anchorTime = performance.now() / 1000;
    this.anchorBeat = -2;
    this.nextEighth = 0;
  }

  // ---------------------------------------------------------- the clock
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

  // Audio can only start from a key press or a click.
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
    this.out.gain.value = 0.7;
    // A limiter last, so a loud effect on top of the band (the claps, which
    // skip the compressor) can't clip. At 0 dB it adds no makeup gain, so
    // the band alone comes out as it would without it.
    this.master = this.ctx.createDynamicsCompressor();
    this.master.threshold.value = 0;
    this.master.knee.value = 0;
    this.master.ratio.value = 20;
    this.master.attack.value = 0.002;
    this.master.release.value = 0.12;
    this.out.connect(comp).connect(this.master).connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(() => this.schedule(), 25);
  }

  // Plays the eighths coming up in the next 0.15 s.
  schedule() {
    const ahead = this.ctx.currentTime + 0.15;
    while (this.timeOf(this.nextEighth / 2) < ahead) {
      const e = this.nextEighth, t = this.timeOf(e / 2);
      // Skip notes that are already late (e.g. after the tab was in the background).
      if (t > this.ctx.currentTime - 0.03) this.playEighth(((e % 16) + 16) % 16, Math.floor(e / 8), Math.max(this.ctx.currentTime, t));
      this.nextEighth++;
    }
  }

  // ------------------------------------------------------------- voices
  // A gain that decays exponentially from peak.
  env(t, peak, decay, attack = 0.002) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(this.out);
    return g;
  }

  // A gain that holds peak for dur and then releases.
  gate(t, peak, dur, attack = 0.004, release = 0.04) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
    g.gain.linearRampToValueAtTime(0, t + dur);
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

  // Two-operator FM: a sine modulator drives the carrier's frequency.
  fm(t, f, dur, vol, ratio, index, indexEnd, decay) {
    const g = this.gate(t, vol, dur, 0.004, Math.min(dur * 0.5, 0.08));
    const car = this.osc('sine', f, t, dur + 0.02, g);
    const mg = this.ctx.createGain();
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, f * indexEnd), t + decay);
    const mod = this.osc('sine', f * ratio, t, dur + 0.02, mg);
    mg.connect(car.frequency);
    return mod;
  }

  // A burst of the noise buffer from a random spot in it.
  noiseSrc(t, dur, dest) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.connect(dest);
    s.start(t, Math.random() * 0.5, dur);
  }

  noiseHit(t, dur, vol, filter = null, dest = this.out) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest);
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter[0]; f.frequency.value = filter[1]; f.Q.value = filter[2] || 1;
      s.connect(f).connect(g);
    } else s.connect(g);
    s.start(t, Math.random() * 0.4, dur + 0.05);
  }

  // Pitched voices. len is in seconds.
  lead(t, m, len, vol = 0.16) { this.fm(t, hz(m), len, vol * 0.9, 1, 1.2, 3.2, 0.06); } // brass: the index swells
  piano(t, m, len, vol) { this.fm(t, hz(m), len, vol, 1, 2.2, 0.3, 0.25); } // electric piano
  bass(t, m, len) { this.fm(t, hz(m - 12), len, 0.42, 1, 6, 0.6, 0.12); } // slap bass

  // Percussion.
  clave(t) { this.osc('sine', 2500, t, 0.08, this.env(t, 0.4, 0.06)); }

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
    if (kind === 'soft') return this.noiseHit(t, 0.03, 0.05, ['highpass', 6000]);
    if (kind === 'slap') {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1;
      bp.connect(this.env(t, 0.35, 0.06));
      this.noiseSrc(t, 0.06, bp);
      this.osc('sine', 420, t, 0.08, this.env(t, 0.2, 0.07));
      return;
    }
    const o = this.osc('sine', 330, t, 0.3, this.env(t, 0.5, 0.25));
    o.frequency.exponentialRampToValueAtTime(290, t + 0.08);
  }

  // ---------------------------------------------------------- arrangement
  // e: eighth within the 8-count measure (0..15), bar: absolute 4-count bar.
  playEighth(e, bar, t) {
    const E = bar * 8 + (e % 8), inBar = e % 8, eighth = 30 / this.bpm;
    const chord = CHORDS[((bar % 4) + 4) % 4], next = CHORDS[(((bar + 1) % 4) + 4) % 4];
    // 2-3 son clave: counts 2, 3 | 5, 6&, 8.
    if ([2, 4, 8, 11, 14].includes(e)) this.clave(t);
    // Campana on every count, accented on 1 and 5.
    if (e % 2 === 0) this.bell(t, (e === 0 || e === 8 ? 1 : 0.6) * 0.9);
    // Conga tumbao: slap on 2, open tones on 4 and 4&.
    this.conga(t, inBar === 2 ? 'slap' : inBar === 6 || inBar === 7 ? 'open' : 'soft');
    // Anticipated bass: fifth on 2&, next chord's root on 4.
    if (inBar === 3) this.bass(t, chord.root + 7, eighth * 1.6);
    if (inBar === 6) this.bass(t, next.root, eighth * 3.6);
    if (MONTUNO[inBar] >= 0) this.piano(t, chord.tones[MONTUNO[inBar]] + (inBar % 3 === 0 ? 12 : 0), eighth * 0.9, inBar === 0 ? 0.12 : 0.09);
    const h = HOOK.get(((E % 64) + 64) % 64);
    if (h) this.lead(t, h[0], eighth * h[1] * 0.92);
  }

  // ------------------------------------------------------------ effects
  // at: when to play it, in audio time (default: right away).
  sfx(kind, at) {
    if (!this.ctx) return;
    const t = Math.max(this.ctx.currentTime, at ?? this.ctx.currentTime + 0.01);
    const arp = (notes, step, len, vol = 0.14) => notes.forEach((m, i) => this.lead(t + i * step, m, len, vol));
    switch (kind) {
      case 'select': arp([84], 0, 0.05, 0.1); break;
      case 'perfect': arp([84, 88, 91, 96], 0.045, 0.06); break;
      case 'nope': {
        const o = this.osc('sawtooth', 220, t, 0.24, this.gate(t, 0.14, 0.22));
        o.frequency.exponentialRampToValueAtTime(90, t + 0.22);
        break;
      }
      case 'clap': {
        // The whole rueda clapping: a few hands a few ms apart, each three
        // quick bursts of noise and a short ring. It skips the band's
        // compressor, which would squash it back to the band's level, and
        // goes straight to the limiter; muted, it stays quiet.
        if (!this.out.gain.value) break;
        for (const [dt, f] of [[0, 1200], [0.004, 1700], [0.009, 950], [0.013, 2300]]) {
          for (const b of [0, 0.008, 0.016]) this.noiseHit(t + dt + b, 0.011, 1.6, ['bandpass', f, 0.6], this.master);
          this.noiseHit(t + dt + 0.02, 0.16, 1.1, ['bandpass', f * 0.9, 0.6], this.master);
        }
        break;
      }
      case 'whoosh': this.noiseHit(t, 0.25, 0.08, ['bandpass', 1800, 2]); break;
    }
  }
}
