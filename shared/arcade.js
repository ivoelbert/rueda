// Coin-op shell shared by the arcade cabinets: the cabinet (marquee, bezel
// cards, control panel), the low-res CRT screen, input, and the arcade loop
//   ATTRACT -> (coin) -> SELECT -> READY -> PLAY -> GAME OVER -> ATTRACT
// with credits and a saved hi-score. Each cabinet only draws: it gets
// draw(ctx, frame) every frame, with frame.arcade describing the loop state.
import { Game } from './game.js';
import { ChipMusic } from './chip.js';
import { MEASURE } from './dance.js';

const PLAY_SECONDS = 99;
const PAGE_SECONDS = { title: 9, demo: 17 };
const SELECT_SECONDS = 10, OVER_SECONDS = 5;
const HEAT = { perfect: 0.28, great: 0.2, good: 0.1, miss: -0.3 };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const CARDS = [
  `<h3>HOW TO PLAY</h3>
   <ol><li>Insert coin.</li><li>Pick your dancer: <b>LEAD</b> or <b>FOLLOW</b>.</li>
   <li>Hit <b>¡ENCHUFLA DOBLE!</b> on any count. The rueda starts the move on the next <b>1</b>.</li>
   <li>Land the press on the beat for <b>PERFECT</b>. Finish the move for <b>¡SABROSO!</b></li></ol>`,
  `<h3>CONTROLS</h3>
   <dl><dt>SPACE</dt><dd>¡ENCHUFLA DOBLE!</dd><dt>5</dt><dd>INSERT COIN</dd><dt>◄ ►</dt><dd>LEAD / FOLLOW</dd><dt>S</dt><dd>½× PRÁCTICA</dd></dl>
   <p class="fine">1 COIN 1 PLAY · 99 SEC</p>`,
];

export class Arcade {
  constructor({ W, H, era, flavor, couples = 4, ringOffset = -90, radius = 1.45, callerCouple = null, draw, marquee, marqueeSize = [240, 40] }) {
    Object.assign(this, { W, H, era, drawFrame: draw });
    const q = new URLSearchParams(location.search);
    this.game = new Game({ couples, ringOffset, radius, html: false, music: new ChipMusic(180, flavor), callerCouple });
    this.music = this.game.music;
    this.frozen = this.game.frozen !== null;
    this.state = q.get('state') || (this.frozen ? 'play' : 'attract');
    this.page = q.get('page') || (this.frozen ? 'demo' : 'title');
    this.stateAt = this.pageAt = performance.now();
    this.credits = 0;
    this.hiKey = `rueda-hi-${era}`;
    this.hi = Math.max(50000, Number(localStorage.getItem(this.hiKey)) || 0);
    this.timeLeft = PLAY_SECONDS;
    this.cursor = this.game.role;
    this.heat = q.has('heat') ? parseFloat(q.get('heat')) : 0;
    this.newHi = false;
    this.playFrom = 0;
    this.demoFor = null;
    this.buildCabinet(marquee, marqueeSize);
    window.arcade = this;
    window.game = this.game;
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ------------------------------------------------------------- cabinet DOM
  buildCabinet(marquee, [mw, mh]) {
    document.body.classList.add('arcade', `era-${this.era}`);
    const cab = document.createElement('div');
    cab.className = 'cab';
    cab.innerHTML = `
      <header class="marquee"><canvas width="${mw}" height="${mh}"></canvas></header>
      <main class="mid">
        <aside class="bezel left"><div class="card">${CARDS[0]}</div></aside>
        <div class="screen"><canvas class="crt" width="${this.W}" height="${this.H}"></canvas><div class="scan"></div><div class="glass"></div></div>
        <aside class="bezel right"><div class="card">${CARDS[1]}</div></aside>
      </main>
      <footer class="panel">
        <button class="coin" data-k="coin" title="5"><i></i><span>INSERT<br>COIN</span></button>
        <div class="stick" data-k="stick" title="◄ ►"><b></b><i></i><span>LEAD · FOLLOW</span></div>
        <div class="bigwrap"><button class="big" data-k="A" title="SPACE" aria-label="¡Enchufla doble!"></button><span>¡ENCHUFLA DOBLE!</span></div>
        <div class="smallwrap"><button class="small" data-k="practice" title="S" aria-label="Práctica"></button><span>½× PRÁCTICA</span></div>
      </footer>
      <a class="back" href="../prototypes.html">◄ ALL VERSIONS</a>`;
    document.body.appendChild(cab);
    const $ = (s) => cab.querySelector(s);
    this.$ = { cab, mid: $('.mid'), screen: $('.screen'), scan: $('.scan'), stick: $('.stick'), big: $('.big'), small: $('.small') };
    this.$.stick.dataset.tilt = this.game.role;
    this.canvas = $('.crt');
    this.ctx = this.canvas.getContext('2d');
    if (marquee) marquee($('.marquee canvas').getContext('2d'), mw, mh);

    this.$.big.addEventListener('pointerdown', (e) => { e.preventDefault(); this.$.big.classList.add('down'); this.input('A'); });
    addEventListener('pointerup', () => this.$.big.classList.remove('down'));
    $('.coin').addEventListener('click', (e) => { e.currentTarget.blur(); this.input('coin'); });
    this.$.small.addEventListener('click', (e) => { e.currentTarget.blur(); this.input('practice'); });
    this.$.stick.addEventListener('pointerdown', (e) => {
      const r = this.$.stick.getBoundingClientRect();
      this.input(e.clientX < r.left + r.width / 2 ? 'left' : 'right');
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state === 'select') {
        const r = this.canvas.getBoundingClientRect();
        this.input(e.clientX < r.left + r.width / 2 ? 'left' : 'right');
      } else if (this.state === 'attract' || this.state === 'over') this.input('coin');
    });
    addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return;
      const k = { Space: 'A', Enter: 'A', KeyZ: 'A', KeyK: 'A', Digit5: 'coin', KeyC: 'coin', Digit1: 'start', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', KeyR: 'role', KeyS: 'practice' }[e.code];
      if (!k) return;
      e.preventDefault();
      if (k === 'A') { this.$.big.classList.add('down'); setTimeout(() => this.$.big.classList.remove('down'), 120); }
      this.input(k);
    });
    addEventListener('resize', () => this.fit());
    this.fit();
  }

  fit() {
    const m = this.$.mid.getBoundingClientRect(), pad = 14;
    let h = m.height - pad * 2, w = (h * this.W) / this.H;
    if (w > m.width - pad * 2) { w = m.width - pad * 2; h = (w * this.H) / this.W; }
    w = Math.floor(w); h = Math.floor(h);
    Object.assign(this.$.screen.style, { width: `${w}px`, height: `${h}px` });
    this.$.cab.style.setProperty('--sw', `${w}px`);
    this.$.cab.classList.toggle('nobezel', (m.width - w) / 2 < 190 || m.height < 340);
    // One dark scanline per buffer row, as on a real low-res CRT.
    this.$.scan.style.backgroundSize = `100% ${h / this.H}px`;
  }

  // ------------------------------------------------------------ state loop
  go(state) {
    this.state = state;
    this.stateAt = performance.now();
  }

  input(kind) {
    const g = this.game, m = this.music;
    if (kind === 'practice') { g.toggleSpeed(); this.$.small.classList.toggle('on', g.speed !== 1); return; }
    if (kind === 'coin' || ((this.state === 'attract' || this.state === 'over') && (kind === 'A' || kind === 'start'))) {
      m.start();
      this.credits = Math.min(9, this.credits + 1);
      m.sfx('coin');
      if (this.state === 'attract' || this.state === 'over') {
        this.cursor = g.role;
        m.layers = { band: true, melody: false };
        this.go('select');
      }
      return;
    }
    if (this.state === 'select') {
      const pick = (role) => { if (role !== this.cursor) { this.cursor = role; m.sfx('select'); } this.$.stick.dataset.tilt = role; };
      if (kind === 'left') pick('lead');
      else if (kind === 'right') pick('follow');
      else if (kind === 'role') pick(this.cursor === 'lead' ? 'follow' : 'lead');
      else if (kind === 'A' || kind === 'start') this.confirm();
      return;
    }
    if (this.state === 'play') {
      if (kind === 'A' && !g.call()) m.sfx('nope');
      if (kind === 'role' || kind === 'left' || kind === 'right') {
        g.role = kind === 'left' ? 'lead' : kind === 'right' ? 'follow' : g.role === 'lead' ? 'follow' : 'lead';
        this.$.stick.dataset.tilt = g.role;
      }
    }
  }

  confirm() {
    const g = this.game, beat = this.music.beat();
    this.credits = Math.max(0, this.credits - 1);
    g.role = this.cursor;
    g.score = 0;
    g.combo = 0;
    g.trim(beat);
    this.heat = 0;
    this.newHi = false;
    this.timeLeft = PLAY_SECONDS;
    this.playFrom = (Math.floor(beat / MEASURE) + 2) * MEASURE;
    this.music.sfx('ready');
    this.go('ready');
  }

  gameOver() {
    const score = this.game.score;
    if (score > this.hi) { this.hi = score; this.newHi = true; localStorage.setItem(this.hiKey, String(score)); }
    this.music.layers = { band: false, melody: false };
    this.music.sfx('gameover');
    this.go('over');
  }

  // In attract mode the rueda keeps calling enchufla doble by itself.
  autoDemo(beat) {
    const g = this.game, m = Math.floor(beat / MEASURE);
    if (this.frozen || g.busy(beat) || m % 2 || beat - m * MEASURE < 4 || this.demoFor === m) return;
    this.demoFor = m;
    g.queue('enchuflaDoble', m + 1, true);
    g.signal = [beat, beat + 2.5];
    g.flash('caller', '¡ENCHUFLA DOBLE!', 'call');
  }

  tick(dt, beat) {
    const now = performance.now(), age = (now - this.stateAt) / 1000;
    switch (this.state) {
      case 'attract':
        if ((now - this.pageAt) / 1000 > PAGE_SECONDS[this.page] && !this.frozen) {
          this.page = this.page === 'title' ? 'demo' : 'title';
          this.pageAt = now;
        }
        this.autoDemo(beat);
        break;
      case 'select':
        if (age > SELECT_SECONDS && !this.frozen) this.confirm();
        break;
      case 'ready':
        if (beat >= this.playFrom) { this.music.layers = { band: true, melody: true }; this.go('play'); }
        break;
      case 'play':
        if (this.frozen) break;
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        this.heat = Math.max(0, this.heat - dt * 0.012);
        if (this.timeLeft === 0) this.gameOver();
        break;
      case 'over':
        if (age > OVER_SECONDS && !this.frozen) { this.go('attract'); this.page = 'title'; this.pageAt = performance.now(); }
        break;
    }
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.tick(dt, this.game.frozen ?? this.music.beat());
    const f = this.game.update();
    for (const e of f.events) {
      if (e.type === 'judge') this.heat = clamp01(this.heat + HEAT[e.grade]);
      if (e.type === 'complete') this.heat = clamp01(this.heat + 0.2);
    }
    const age = (now - this.stateAt) / 1000;
    f.arcade = {
      state: this.state,
      page: this.page,
      age,
      credits: this.credits,
      hi: Math.max(this.hi, this.game.score),
      newHi: this.newHi,
      time: Math.ceil(this.timeLeft),
      cursor: this.cursor,
      selectLeft: Math.max(0, Math.ceil(SELECT_SECONDS - age)),
      heat: this.heat,
      practice: this.game.speed !== 1,
      playIn: this.playFrom - f.beat,
      blink: (hz = 2) => Math.floor((now / 1000) * hz * 2) % 2 === 0,
    };
    this.drawFrame(this.ctx, f, dt);
  }
}
