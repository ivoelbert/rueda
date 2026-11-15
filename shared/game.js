// Game layer shared by every version: beat clock, the call queue, input and
// scoring. Renderers call game.update() each frame and draw its result.
// With html: false (the arcade cabinets) there is no HTML HUD or input here;
// the cabinet draws the HUD in its own canvas and forwards input.
import { FIGURES, CALLS, MEASURE, couplePose } from './dance.js';
import { Music } from './audio.js';

const BPM = 180;
const GRADES = [ // timing window in ms around the nearest count
  { max: 55, name: 'PERFECT', key: 'perfect', points: 300 },
  { max: 105, name: 'GREAT', key: 'great', points: 200 },
  { max: 165, name: 'GOOD', key: 'good', points: 100 },
  { max: Infinity, name: 'OFF BEAT', key: 'miss', points: 0 },
];

const HUD = `
  <div class="hud-score"><div class="lbl">SCORE</div><div class="val" data-score>000000</div><div class="combo" data-combo></div></div>
  <div class="hud-beats"><div class="beats">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<div class="beat" data-beat="${n}">${n}</div>`).join('')}</div><div class="phase" data-phase></div></div>
  <nav class="hud-nav"><a href="../neon/">Neon</a><a href="../pixel/">Pixel</a><a href="../toon/">Toon 3D</a></nav>
  <div class="caller" data-caller></div>
  <div class="judge" data-judge></div>
  <div class="hud-controls">
    <button class="side-btn" data-role title="R">YOU: LEAD</button>
    <button class="call-btn" data-call>¡ENCHUFLA DOBLE!<small>SPACE</small></button>
    <button class="side-btn" data-speed title="S">SPEED 1×</button>
    <button class="side-btn" data-cam title="C">CAM: RING</button>
  </div>
  <div class="start" data-start><div class="start-card"><h1>RUEDA</h1><p class="sub" data-sub></p><button class="start-btn" data-go>PLAY ▶</button><p class="hint">Hit <b>¡ENCHUFLA DOBLE!</b> on any count. The move starts on the next 1.</p></div></div>`;

export class Game {
  constructor({ couples = 4, ringOffset = -90, radius = 1.45, subtitle = '', html = true, music = null, callerCouple = null } = {}) {
    const q = new URLSearchParams(location.search);
    this.music = music || new Music(BPM);
    this.frozen = q.has('beat') ? parseFloat(q.get('beat')) : null;
    this.role = q.get('role') === 'follow' ? 'follow' : 'lead';
    this.speed = 1;
    this.cam = q.get('cam') === 'close' ? 'close' : 'ring';
    this.score = 0;
    this.combo = 0;
    this.timeline = new Map(); // measure -> { call, part }
    this.callerCouple = callerCouple ?? Math.floor(couples / 2);
    this.signal = null; // beats during which the caller signals
    this.ui = { judge: null, caller: null, phase: '' };
    this.lastBeat = null;
    this.events = [];
    this.frames = Array.from({ length: couples }, (_, i) => {
      const phi = ringOffset + (i * 360) / couples;
      const r = (phi * Math.PI) / 180;
      return { ox: radius * Math.cos(r), oy: radius * Math.sin(r), rot: phi - 90, phi };
    });
    if (q.has('demo') || this.frozen !== null) this.queue('enchuflaDoble', 1);
    this.$ = null;
    if (html) this.buildHud(q, subtitle);
  }

  buildHud(q, subtitle) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = HUD;
    document.body.appendChild(this.el);
    const $ = (s) => this.el.querySelector(`[data-${s}]`);
    this.$ = { score: $('score'), combo: $('combo'), phase: $('phase'), caller: $('caller'), judge: $('judge'), call: $('call'), role: $('role'), speed: $('speed'), cam: $('cam'), start: $('start') };
    this.$beats = [...this.el.querySelectorAll('[data-beat]')];
    $('sub').textContent = subtitle;
    for (const a of this.el.querySelectorAll('.hud-nav a')) if (location.pathname.includes(a.getAttribute('href').slice(2))) a.classList.add('here');
    $('go').addEventListener('click', () => this.start());
    if (q.has('autoplay') || this.frozen !== null) this.$.start.remove();

    this.$.call.addEventListener('pointerdown', (e) => { e.preventDefault(); this.call(); });
    this.$.role.addEventListener('click', (e) => { e.currentTarget.blur(); this.toggleRole(); });
    this.$.speed.addEventListener('click', (e) => { e.currentTarget.blur(); this.toggleSpeed(); });
    this.$.cam.addEventListener('click', (e) => { e.currentTarget.blur(); this.toggleCam(); });
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.$.start.isConnected ? this.start() : this.call(); }
      if (e.code === 'KeyR') this.toggleRole();
      if (e.code === 'KeyS') this.toggleSpeed();
      if (e.code === 'KeyC') this.toggleCam();
    });
    this.syncButtons();
  }

  start() {
    this.music.start();
    this.$.start.remove();
  }

  toggleRole() { this.role = this.role === 'lead' ? 'follow' : 'lead'; this.syncButtons(); }
  toggleSpeed() { this.speed = this.speed === 1 ? 0.5 : 1; this.music.setBpm(BPM * this.speed); this.syncButtons(); }
  toggleCam() { this.cam = this.cam === 'ring' ? 'close' : 'ring'; this.syncButtons(); }
  syncButtons() {
    if (!this.$) return;
    this.$.role.textContent = this.role === 'lead' ? 'YOU: LEAD' : 'YOU: FOLLOW';
    this.$.speed.textContent = this.speed === 1 ? 'SPEED 1×' : 'SPEED ½×';
    this.$.cam.textContent = this.cam === 'ring' ? 'CAM: RING' : 'CAM: CLOSE';
  }

  queue(callName, measure, demo = false) {
    CALLS[callName].parts.forEach((part, i) => this.timeline.set(measure + i, { call: callName, part, index: i, demo }));
  }

  // Drops queued measures after the current figure, keeping whatever is needed
  // to get back to open position (an enchufla ends in caída, so its dile que no
  // stays). What is left scores nothing.
  trim(beat) {
    const m = Math.floor((beat + 0.5) / MEASURE);
    const keep = this.timeline.get(m)?.part === 'enchufla' ? m + 1 : m;
    for (const [k, v] of [...this.timeline]) {
      if (k > keep) this.timeline.delete(k);
      else v.demo = true;
    }
  }

  busy(beat) {
    const m = Math.floor((beat + 0.5) / MEASURE);
    for (const k of this.timeline.keys()) if (k >= m) return true;
    return false;
  }

  // Returns the timing grade, or null while a move is still running.
  call() {
    if (this.$?.start.isConnected) this.start();
    const beat = this.music.beat();
    if (this.busy(beat)) {
      if (this.$) {
        this.$.call.classList.remove('nope');
        void this.$.call.offsetWidth;
        this.$.call.classList.add('nope');
      }
      return null;
    }
    const errMs = (Math.abs(beat - Math.round(beat)) * 60000) / this.music.bpm * this.speed;
    const grade = GRADES.find((g) => errMs < g.max);
    this.combo = grade.points ? this.combo + 1 : 0;
    this.score += grade.points * Math.max(1, this.combo);
    this.flash('judge', grade.name, grade.key);
    this.music.sfx(grade.key);
    this.queue('enchuflaDoble', Math.floor(beat / MEASURE) + 1);
    this.signal = [beat, beat + 2.5];
    this.flash('caller', CALLS.enchuflaDoble.name, 'call');
    this.events.push({ type: 'judge', grade: grade.key });
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('¡Enchufla doble!');
      const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'));
      if (voice) u.voice = voice;
      u.lang = 'es-ES';
      u.rate = 1.3;
      u.pitch = 1.1;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
    return grade;
  }

  flash(kind, text, cls) {
    this.ui[kind] = { text, cls, at: performance.now() };
    if (!this.$) return;
    const el = this.$[kind];
    el.textContent = text;
    el.className = `${kind} ${cls}`;
    void el.offsetWidth;
    el.classList.add('show');
  }

  segment(measure) {
    const s = this.timeline.get(measure);
    return s ? { ...s, fig: FIGURES[s.part] } : { fig: FIGURES.guapea };
  }

  update() {
    const events = this.events;
    this.events = [];
    const beat = this.frozen ?? this.music.beat();
    const measure = Math.floor((beat + 0.5) / MEASURE);
    const t = beat - measure * MEASURE;
    const seg = this.segment(measure);
    const prev = this.segment(measure - 1);

    if (this.lastBeat !== null && Math.floor(beat) > Math.floor(this.lastBeat)) {
      const count = ((Math.floor(beat) % 8) + 8) % 8 + 1;
      events.push({ type: 'beat', count });
      if (seg.call && count === 3) this.music.sfx('whoosh');
    }
    // The call is complete once its last measure is behind us (even if frames are slow).
    const m = Math.floor(beat / MEASURE), last = this.timeline.get(m - 1);
    if (last && !last.demo && last.index === CALLS[last.call].parts.length - 1 && !this.timeline.get(m) && this.completed !== last && this.frozen === null) {
      this.completed = last;
      this.score += 1000 * Math.max(1, this.combo);
      this.flash('judge', '¡SABROSO!', 'complete');
      this.music.sfx('complete');
      events.push({ type: 'complete' });
    }
    this.lastBeat = beat;
    for (const k of [...this.timeline.keys()]) if (k < measure - 1) this.timeline.delete(k);

    const signal = this.signal && beat >= this.signal[0] && beat <= this.signal[1];
    const couples = this.frames.map((frame, i) => couplePose(prev.fig, seg.fig, t, frame, beat, { signal: signal && i === this.callerCouple }));

    // HUD
    const count = ((Math.floor(beat) % 8) + 8) % 8 + 1;
    const pulse = 1 - (beat - Math.floor(beat));
    const next = this.timeline.get(measure + 1);
    const phase = seg.call
      ? `${seg.fig.label.toUpperCase()}  ${seg.index + 1}/${CALLS[seg.call].parts.length}`
      : next ? `NEXT: ${FIGURES[next.part].label.toUpperCase()}…` : 'GUAPEA';
    const phaseChanged = phase !== this.ui.phase;
    this.ui.phase = phase;
    if (this.$) {
      this.$beats.forEach((el, i) => el.classList.toggle('on', i + 1 === count));
      if (phaseChanged) this.$.phase.textContent = phase;
      this.$.score.textContent = String(this.score).padStart(6, '0');
      this.$.combo.textContent = this.combo > 1 ? `${this.combo}× COMBO` : '';
      this.$.call.classList.toggle('busy', this.busy(beat));
    }

    return {
      beat, count, pulse, measure, t, seg, events, couples,
      frames: this.frames,
      player: { couple: 0, role: this.role },
      cam: this.cam,
      caller: this.callerCouple,
      ui: this.ui,
      score: this.score,
      combo: this.combo,
    };
  }
}
