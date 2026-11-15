// Chiptune versions of the casino band for the arcade cabinets. Same groove as
// audio.js (2-3 son clave, campana, conga tumbao, anticipated bass, piano
// montuno) plus a brass hook, played on one of three sound chips:
//   namco: 4-bit wavetable voices, no noise channel (early 80s Namco boards)
//   nes:   pulse waves, triangle bass and LFSR noise drums (mid 80s)
//   fm:    2-operator FM bass, piano and brass with sampled-style drums (early 90s)
import { Music } from './audio.js';

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

// 32-step 4-bit wavetables in the style of the Namco WSG.
const WSG = {
  lead: [8, 11, 13, 14, 15, 15, 14, 13, 11, 9, 8, 8, 9, 10, 10, 9, 7, 5, 4, 4, 5, 6, 6, 5, 3, 2, 1, 0, 0, 1, 3, 5],
  bass: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
};

export class ChipMusic extends Music {
  constructor(bpm, flavor = 'nes') {
    super(bpm);
    this.flavor = flavor;
    this.layers = { melody: false, band: true };
    this.waves = {};
  }

  start() {
    if (this.ctx) return;
    super.start();
    const c = this.ctx;
    const fourier = (table) => {
      const n = table.length, mean = table.reduce((a, b) => a + b) / n, H = 16;
      const re = new Float32Array(H), im = new Float32Array(H);
      for (let h = 1; h < H; h++) for (let k = 0; k < n; k++) {
        re[h] += ((table[k] - mean) / 8) * Math.cos((2 * Math.PI * h * k) / n) * (2 / n);
        im[h] += ((table[k] - mean) / 8) * Math.sin((2 * Math.PI * h * k) / n) * (2 / n);
      }
      return c.createPeriodicWave(re, im);
    };
    const pulse = (duty) => {
      const H = 48, re = new Float32Array(H), im = new Float32Array(H);
      for (let h = 1; h < H; h++) re[h] = ((2 / (h * Math.PI)) * Math.sin(h * Math.PI * duty)) * 0.8;
      return c.createPeriodicWave(re, im);
    };
    this.waves = { wsgLead: fourier(WSG.lead), wsgBass: fourier(WSG.bass), p12: pulse(0.125), p25: pulse(0.25), p50: pulse(0.5) };
    // NES-style LFSR noise: long mode hisses, short mode rings like metal.
    const lfsr = (short, rate) => {
      const sr = c.sampleRate, buf = c.createBuffer(1, sr, sr), d = buf.getChannelData(0);
      let reg = 1, acc = 0;
      for (let i = 0; i < sr; i++) {
        acc += rate / sr;
        while (acc >= 1) { acc--; const fb = (reg ^ (reg >> (short ? 6 : 1))) & 1; reg = (reg >> 1) | (fb << 14); }
        d[i] = reg & 1 ? 0.6 : -0.6;
      }
      return buf;
    };
    this.noiseLong = lfsr(false, 220000);
    this.noiseShort = lfsr(true, 56000);
    this.out.gain.value = this.flavor === 'fm' ? 0.7 : 0.6;
  }

  // ------------------------------------------------------------- voices
  gate(t, peak, dur, attack = 0.004, release = 0.04) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(this.out);
    return g;
  }

  wave(kind, f, t, dur, dest) {
    const o = this.ctx.createOscillator();
    if (this.waves[kind]) o.setPeriodicWave(this.waves[kind]);
    else o.type = kind;
    o.frequency.setValueAtTime(f, t);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  // Two-operator FM: a sine modulator drives the carrier's frequency.
  fm(t, f, dur, vol, ratio, index, indexEnd, decay) {
    const g = this.gate(t, vol, dur, 0.004, Math.min(dur * 0.5, 0.08));
    const car = this.wave('sine', f, t, dur, g);
    const mg = this.ctx.createGain();
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, f * indexEnd), t + decay);
    const mod = this.wave('sine', f * ratio, t, dur, mg);
    mg.connect(car.frequency);
    return mod;
  }

  noiseHit(t, buf, dur, vol, rate = 1, filter = null) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.out);
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter[0]; f.frequency.value = filter[1]; f.Q.value = filter[2] || 1;
      s.connect(f).connect(g);
    } else s.connect(g);
    s.start(t, Math.random() * 0.4, dur + 0.05);
  }

  // Pitched voices by role. len is in seconds.
  lead(t, m, len, vol = 0.16) {
    if (this.flavor === 'namco') this.wave('wsgLead', hz(m), t, len, this.gate(t, vol * 1.1, len));
    else if (this.flavor === 'nes') {
      const o = this.wave('p50', hz(m), t, len, this.gate(t, vol * 0.8, len));
      if (len > 0.25) { // delayed vibrato on long notes
        const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
        lfo.frequency.value = 6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz(m) * 0.012, t + 0.25);
        lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + len);
      }
    } else this.fm(t, hz(m), len, vol * 0.9, 1, 1.2, 3.2, 0.06); // brass: index swells
  }

  comp(t, m, len, vol = 0.1) {
    if (this.flavor === 'namco') this.wave('wsgLead', hz(m), t, len, this.gate(t, vol * 0.7, len, 0.002, len * 0.7));
    else if (this.flavor === 'nes') this.wave('p25', hz(m), t, len, this.gate(t, vol * 0.65, len, 0.002, len * 0.6));
    else this.fm(t, hz(m), len, vol, 1, 2.2, 0.3, 0.25); // electric piano
  }

  bassNote(t, m, len) {
    if (this.flavor === 'namco') this.wave('wsgBass', hz(m - 12), t, len, this.gate(t, 0.34, len));
    else if (this.flavor === 'nes') this.wave('triangle', hz(m - 12), t, len, this.gate(t, 0.42, len));
    else this.fm(t, hz(m - 12), len, 0.42, 1, 6, 0.6, 0.12); // slap bass
  }

  // Percussion. Namco boards had no noise channel, so drums are pitch sweeps.
  sweep(t, f0, f1, dur, vol, kind = 'wsgBass') {
    const o = this.wave(kind, f0, t, dur, this.gate(t, vol, dur, 0.001, dur * 0.8));
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  }

  clave(t) {
    if (this.flavor === 'namco') this.sweep(t, 2600, 2400, 0.04, 0.22, 'wsgLead');
    else if (this.flavor === 'nes') this.wave('p50', 2100, t, 0.035, this.gate(t, 0.18, 0.035, 0.001, 0.03));
    else { this.wave('sine', 2500, t, 0.06, this.env(t, 0.4, 0.06)); }
  }

  bell(t, v) {
    if (this.flavor === 'namco') this.sweep(t, 1180, 1100, 0.05, 0.12 * v, 'wsgLead');
    else if (this.flavor === 'nes') this.noiseHit(t, this.noiseShort, 0.06, 0.18 * v, 1.6);
    else super.bell(t, v * 0.9);
  }

  congaHit(t, kind) {
    if (kind === 'soft') {
      if (this.flavor !== 'namco') this.noiseHit(t, this.flavor === 'nes' ? this.noiseLong : this.noise, 0.03, 0.05, 1, ['highpass', 6000]);
      return;
    }
    const open = kind === 'open';
    if (this.flavor === 'namco') this.sweep(t, open ? 340 : 520, open ? 220 : 300, open ? 0.14 : 0.06, open ? 0.3 : 0.24);
    else if (this.flavor === 'nes') {
      if (open) this.sweep(t, 330, 160, 0.13, 0.4, 'triangle');
      else this.noiseHit(t, this.noiseLong, 0.07, 0.3, 1);
    } else super.conga(t, kind);
  }

  // ---------------------------------------------------------- arrangement
  playEighth(e, bar, t) {
    if (!this.layers.band) return;
    const E = bar * 8 + (e % 8), inBar = e % 8, eighth = 30 / this.bpm;
    const chord = CHORDS[((bar % 4) + 4) % 4], next = CHORDS[(((bar + 1) % 4) + 4) % 4];
    if ([2, 4, 8, 11, 14].includes(e)) this.clave(t);
    if (e % 2 === 0) this.bell(t, e === 0 || e === 8 ? 1 : 0.6);
    this.congaHit(t, inBar === 2 ? 'slap' : inBar === 6 || inBar === 7 ? 'open' : 'soft');
    if (inBar === 3) this.bassNote(t, chord.root + 7, eighth * 1.6);
    if (inBar === 6) this.bassNote(t, next.root, eighth * 3.6);
    if (MONTUNO[inBar] >= 0) this.comp(t, chord.tones[MONTUNO[inBar]] + (inBar % 3 === 0 ? 12 : 0), eighth * 0.9, inBar === 0 ? 0.12 : 0.09);
    const h = this.layers.melody && HOOK.get(((E % 64) + 64) % 64);
    if (h) this.lead(t, h[0], eighth * h[1] * 0.92);
  }

  // ------------------------------------------------------------ effects
  sfx(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const arp = (notes, step, len, vol = 0.14) => notes.forEach((m, i) => this.lead(t + i * step, m, len, vol));
    switch (kind) {
      case 'coin': arp([83, 88], 0.07, 0.09); break;
      case 'select': arp([84], 0, 0.05, 0.1); break;
      case 'start': arp([72, 76, 79, 84, 79, 84], 0.07, 0.08); break;
      case 'perfect': case 'great': arp([84, 88, 91, 96], 0.045, 0.06); break;
      case 'good': arp([79, 84], 0.05, 0.06); break;
      case 'miss': case 'nope': {
        const o = this.wave(this.flavor === 'nes' ? 'p25' : this.flavor === 'namco' ? 'wsgBass' : 'sawtooth', 220, t, 0.22, this.gate(t, 0.14, 0.22));
        o.frequency.exponentialRampToValueAtTime(90, t + 0.22);
        break;
      }
      case 'complete': arp([72, 76, 79, 84, 79, 84, 88, 91, 96], 0.06, 0.07, 0.13); break;
      case 'ready': arp([72, 79, 84, 79, 84, 88], 0.11, 0.1, 0.13); break;
      case 'gameover': arp([79, 76, 72, 67, 64, 60], 0.16, 0.15, 0.13); break;
      case 'whoosh':
        if (this.flavor === 'namco') this.sweep(t, 200, 1600, 0.2, 0.06, 'wsgLead');
        else this.noiseHit(t, this.flavor === 'nes' ? this.noiseLong : this.noise, 0.25, 0.08, 1, ['bandpass', 1800, 2]);
        break;
    }
  }
}
