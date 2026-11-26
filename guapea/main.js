// RUEDA · Guapea. An isometric pixel rueda dancing the guapea in unison.
//
// Tuned for feel rather than accuracy: feet land on the beat, the weight and
// hips settle just after, knees dip on every step and lift on 4 and 8, skirts
// and hats lag behind, the joined hands swing out on 1, and the whole circle
// presses palms on 5. You are one dancer. Pick a move in the moves library and
// press Space: the whole rueda dances it from the next 1, then goes back to
// the guapea.
//
// This file runs the game: the beat, the calls, each frame, the HUD, the
// moves list, the keys and the tune panel. The moves are in moves.js and
// figures/, the bodies in body.js, the hands in hands.js.

import { centerText, drawText, textWidth } from '../shared/font.js';
import { ChipMusic } from '../shared/chip.js';
import { OUTLINE, body, build, dancers, follows, leads } from './body.js';
import { arm, drawDancer, spr, spring } from './draw.js';
import { GUAPEA } from './figures/guapea.js';
import { clapHands, crossPrep, hands, palms, reach, shineHands, sparks } from './hands.js';
import { P, SPEC, q } from './knobs.js';
import { H, OY, TAU, TO_CAM, W, depth, mod, proj, v3 } from './math.js';
import { MOVES } from './moves.js';
import { CREAM, FLASH, GOLD, bg, buildPlaza, pack, ringPixels, strands } from './plaza.js';
import { callAt, callableFrom, figureAt, fold, nextState, shiftBefore, stateAt, timeline } from './timeline.js';

// ------------------------------------------------------------ game state
const music = new ChipMusic(P.bpm, 'fm');
music.layers = { band: true, melody: true };
let frozen = q.has('beat') ? +q.get('beat') : null;
let only = null; // for the tools (window.rueda.only): draw just the dancers it picks
const beatNow = () => frozen ?? music.beat();
const state = {
  mode: q.has('play') || frozen !== null ? 'play' : 'title',
  role: q.get('role') === 'follow' ? 'follow' : 'lead',
  move: MOVES[q.get('move')] ? q.get('move') : 'dame',
  startedAt: -99, calledAt: -99, half: false, muted: false,
};
let particles = [];
let shake = 0;

const player = () => (state.role === 'lead' ? leads : follows)[0];

function puff(p, n, color = '#d8b088', speed = 14) {
  const s = proj(p);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    particles.push({ x: s.x, y: s.y, vx: Math.cos(a) * speed * (0.5 + Math.random()), vy: Math.sin(a) * speed * 0.4 - 4, g: 10, life: 0.35 + Math.random() * 0.2, c: color });
  }
}

// Things that happen on a count: dust under the feet, and in a move, the
// whoosh of its big turn and the landing on the 1 after it.
function onBeat(k) {
  const c = mod(k, 8), m = Math.floor(k / 8), fig = figureAt(m), me = player();
  for (const d of dancers()) {
    const mine = d === me && state.mode === 'play';
    if (c === 0 || c === 4 || (mine && [1, 2, 5, 6].includes(c))) puff(c === 0 || c === 2 || c === 5 ? d.pose.ankleO : d.pose.ankleI, mine ? 4 : 2);
  }
  if (fig.whoosh?.includes(c)) music.sfx('whoosh');
  const done = callAt(m - 1);
  if (c === 0 && done && done.bar === MOVES[done.id].bars.length - 1) {
    music.sfx('perfect');
    shake = 0.6;
    for (const d of [me, me.lead ? follows[mod(shiftBefore(m), leads.length)] : leads[mod(-shiftBefore(m), leads.length)]]) puff(d.pose.ankleO, 10, '#f0d0a0', 30);
  }
}

// Space: the rueda dances the selected move from the next 1.
function call() {
  if (state.mode === 'title') return start();
  // Moves are called on 5. A call once the move's preparation has started
  // (on 7) is too late; it waits for the 1 after. A call during a longer
  // move waits for it to end.
  // Out of adentro y afuera the couples head on from the 7 to wherever the
  // next move needs them, so a call must come by the 5.
  const mv = MOVES[state.move], first = mv.bars[0], b = music.beat();
  const early = Math.max(-Math.min(0, first.lead.root[0][0], first.follow.root[0][0]), nextState(b) === 'adentro' ? 3 : 0);
  let m = Math.floor((b + early) / 8) + 1;
  const running = callAt(m);
  if (running?.bar > 0 && !running.loop) m += MOVES[running.id].bars.length - running.bar;
  // A loop (arriba) goes on only until the next call.
  if (mv.bars.some((_, j) => callAt(m + j) && !callAt(m + j).loop) || !callableFrom(mv, stateAt(m))) return music.sfx('nope');
  timeline.set(m, state.move);
  state.calledAt = b;
  music.sfx('select');
  shout(MOVES[state.move].say);
}

// The caller shouts the move.
function shout(text) {
  if (state.muted || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'));
  if (voice) u.voice = voice;
  u.lang = 'es-ES';
  u.rate = 1.25;
  u.pitch = 1.1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function start() {
  music.start();
  state.mode = 'play';
  state.startedAt = music.beat();
  if (state.muted) music.out.gain.value = 0;
}

// ------------------------------------------------------------ frame
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let last = performance.now(), lastB = null, warmedFor = null;

function poseAll(b, dt) {
  for (const d of dancers()) d.pose = body(d, b);
  hands(b);
  crossPrep(b);
  shineHands(b);
  clapHands(b);
  for (const d of dancers()) { reach(d.pose); spring(d, d.pose, dt); }
}

// The clap sounds are scheduled ahead, like the band's notes, so they are
// heard right on the count: once the listener hears a beat it is too late to
// start a sound for it.
let clapsUpTo = -Infinity;
function scheduleClaps(b) {
  const m = Math.floor(b / 8);
  for (let mm = m; mm <= m + 1; mm++) for (const c of figureAt(mm).claps ?? []) {
    const k = mm * 8 + c, at = music.timeOf(k);
    if (k <= clapsUpTo || at > music.ctx.currentTime + 0.15) continue;
    clapsUpTo = k;
    if (at > music.ctx.currentTime - 0.03) music.sfx('clap', at);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const b = beatNow();
  if (frozen === null) fold(b);
  else if (warmedFor !== frozen) {
    // Run the springs up to the frozen beat so stills match live play.
    for (let s = frozen - 2; s < frozen; s += (music.bpm / 60) / 60) poseAll(s, 1 / 60);
    warmedFor = frozen;
  }
  poseAll(b, frozen !== null ? 0 : dt);
  if (frozen === null && lastB !== null && b - lastB < 4) for (let k = Math.floor(lastB) + 1; k <= Math.floor(b); k++) onBeat(k);
  if (frozen === null && music.ctx) scheduleClaps(b);
  lastB = b;
  render(b, dt);
  syncLibrary(b);
}

function render(b, dt) {
  const t = mod(b, 8), cnt = Math.floor(t), shown = dancers().filter((d) => !only || only(d));
  ctx.drawImage(bg, 0, 0);
  const img = ctx.getImageData(0, 0, W, H), out = new Uint32Array(img.data.buffer);
  // The ring lights up on every 1.
  if (t < 0.3) for (const [i, idx] of ringPixels.entries()) if (t < 0.15 || (i & 1)) out[idx] = FLASH;
  // Shadows, and a gold ring under you.
  const me = player();
  for (const d of shown) {
    const B = d.pose, c = proj(v3(B.pelvis.x, B.pelvis.y, 0)), rx = 7.5 + B.dp * 0.4, ry = rx * 0.45;
    if (d === me) ellipse(out, c.x, c.y, 12 + (t % 1 < 0.15 ? 1 : 0), 5.5 + (t % 1 < 0.15 ? 0.5 : 0), pack(GOLD[2]));
    for (let y = Math.floor(c.y - ry); y <= c.y + ry; y++) for (let x = Math.floor(c.x - rx); x <= c.x + rx; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || (x + y) & 1) continue;
      if (((x - c.x) / rx) ** 2 + ((y - c.y) / ry) ** 2 > 1) continue;
      const v = out[y * W + x];
      out[y * W + x] = ((255 << 24) | (((v >> 17) & 0x7f) << 16) | (((v >> 9) & 0x7f) << 8) | ((v >> 1) & 0x7f)) >>> 0;
    }
  }
  spr.clear();
  // A hand on someone's back shows over them when their back is to the
  // camera, and hides behind them when it isn't.
  const around = new Map();
  for (const d of shown) for (const [n, { on, w }] of Object.entries(d.pose.around || {})) {
    if (w <= 0.5) continue;
    const k = on.f.x * TO_CAM.x + on.f.y * TO_CAM.y < 0 ? 'after' : 'before';
    if (!around.has(on)) around.set(on, { before: [], after: [] });
    around.get(on)[k].push(() => arm(d, d.pose.arms[n], 'fore'));
  }
  // In crossed hands, the top pair's forearms show over both partners.
  const drawn = new Set();
  shown.sort((a, c) => depth(c.pose.pelvis) - depth(a.pose.pelvis)).forEach((d) => {
    const w = around.get(d.pose), top = d.pose.top;
    w?.before.forEach((f) => f());
    drawDancer(d, d.pose, d.pose.arms);
    w?.after.forEach((f) => f());
    if (top && drawn.has(top.mate)) for (const B of [d.pose, top.mate]) arm(B.d, B.arms[B.top.n], 'fore');
    drawn.add(d.pose);
  });
  spr.commit(out);
  const sh = shake > 0.05 ? Math.round((Math.random() - 0.5) * 2 * shake) : 0;
  shake *= Math.pow(0.001, dt);
  ctx.putImageData(img, sh, 0);

  // Palms meet on 5: a little spark between every couple. Claps spark too.
  for (const [palm, age] of [...(t >= 4 && t < 4.22 ? palms.map((p) => [p, t - 4]) : []), ...sparks]) {
    const p = proj(palm), r = age < 0.08 ? 2 : 1;
    ctx.fillStyle = '#fff8d0';
    ctx.fillRect(Math.round(p.x) - r, Math.round(p.y), r * 2 + 1, 1);
    ctx.fillRect(Math.round(p.x), Math.round(p.y) - r, 1, r * 2 + 1);
  }
  // Bulbs brighten on 1 and 5.
  const glow = Math.max(0, 1 - (t % 4) / 0.5);
  strands.forEach((bulbs, si) => bulbs.forEach((p, i) => {
    const warm = (i + si) % 3 === 0 ? '#ffd890' : (i + si) % 3 === 1 ? '#ffe8b0' : '#ffc070';
    ctx.fillStyle = glow > 0.3 ? '#fffbe8' : warm;
    ctx.fillRect(p.x - 1, p.y, 2, 2);
    if (glow > 0.6) { ctx.fillStyle = 'rgba(255, 230, 160, 0.35)'; ctx.fillRect(p.x - 2, p.y - 1, 4, 4); }
  }));
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.92;
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  hud(b, t, cnt);
}

function ellipse(out, cx, cy, rx, ry, color) {
  for (let a = 0; a < TAU; a += 0.02) {
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = color;
  }
}

// ------------------------------------------------------------ HUD
function hud(b, t, cnt) {
  const me = player(), B = me.pose, m = Math.floor(b / 8), now = callAt(m), next = timeline.get(m + 1);
  drawText(ctx, 'RUEDA', 8, 6, GOLD, 2, OUTLINE, { shadow: OUTLINE });
  // The big name over the circle on a move's 1 says it instead.
  if (!(now?.bar === 0 && t < 1.2)) drawText(ctx, now ? MOVES[now.id].name : GUAPEA.name, 9, 24, now ? GOLD[2] : CREAM, 1, OUTLINE);

  // Marker over your head.
  const hp = proj(v3(B.head.x, B.head.y, B.head.z + (me.lead ? 13 : 9)));
  const bob = t % 1 < 0.2 ? 1 : 0;
  drawText(ctx, '1P', Math.round(hp.x) - 5, Math.round(hp.y) - 9 + bob, GOLD[2], 1, OUTLINE);
  drawText(ctx, '▼', Math.round(hp.x) - 2, Math.round(hp.y) - 1 + bob, GOLD[2], 1, OUTLINE);

  if (state.mode === 'title') return title(b);

  // The call waiting for the next 1.
  if (next) {
    const text = `¡${MOVES[next].name}!`, left = Math.ceil(8 - t);
    drawText(ctx, 'NEXT', W - 8 - textWidth(text, 2) - textWidth('NEXT ') , 10, CREAM, 1, OUTLINE);
    if (left > 1 || Math.floor(b * 4) % 2 === 0) drawText(ctx, text, W - 8 - textWidth(text, 2), 6, GOLD, 2, OUTLINE, { shadow: OUTLINE });
    drawText(ctx, `IN ${left}`, W - 8 - textWidth(`IN ${left}`), 24, '#c0a888', 1, OUTLINE);
  }

  // The move's name over the circle on its 1; otherwise a big 1 and 5 in
  // the middle of the circle.
  if (now?.bar === 0 && t < 1.2) {
    // A long name goes on two lines so it clears the corners of the HUD.
    // Split at the space that leaves the shorter longest line.
    const text = `¡${MOVES[now.id].name}!`, cuts = [...text.matchAll(/ /g)].map((c) => c.index);
    const longest = (cut) => Math.max(cut, text.length - cut - 1), cut = cuts.reduce((a, c) => (longest(c) < longest(a) ? c : a), cuts[0]);
    const lines = textWidth(text, 4) > W - 140 && cut > 0 ? [text.slice(0, cut), text.slice(cut + 1)] : [text];
    const s = t < 0.08 && lines.length === 1 ? 5 : 4;
    if (t < 0.6 || Math.floor(b * 6) % 2 === 0) lines.forEach((line, i) => centerText(ctx, line, 12 - (s - 4) * 2 + i * (7 * s + 4), GOLD, s, OUTLINE, { shadow: OUTLINE }));
  } else if ((cnt === 0 || cnt === 4) && t % 4 < 0.45) {
    const s = t % 4 < 0.08 ? 5 : 4;
    centerText(ctx, String(cnt + 1), OY - 28 - (s - 4) * 3, cnt === 0 ? GOLD : CREAM, s, OUTLINE, { shadow: OUTLINE });
  }

  // The count strip.
  const cw = 18, x0 = Math.round(W / 2 - (cw * 8) / 2), y0 = H - 22;
  for (let n = 0; n < 8; n++) {
    const x = x0 + n * cw, cur = n === cnt, key = n === 0 || n === 4, pause = n === 3 || n === 7;
    ctx.fillStyle = OUTLINE; ctx.fillRect(x, y0 - (cur ? 2 : 0), cw - 2, 19);
    ctx.fillStyle = cur ? (key ? '#f8d040' : '#f2e6cc') : key ? '#5a3a1a' : '#2e1c20';
    ctx.fillRect(x + 1, y0 + 1 - (cur ? 2 : 0), cw - 4, 17);
    if (key && !cur) { ctx.fillStyle = '#f0b020'; ctx.fillRect(x + 1, y0 + 16, cw - 4, 2); }
    drawText(ctx, String(n + 1), x + 3, y0 + 2 - (cur ? 2 : 0), cur ? OUTLINE : pause ? '#7a6060' : key ? '#f8d040' : CREAM, 2, null);
  }
  drawText(ctx, `1P ${state.role === 'lead' ? 'LEAD' : 'FOLLOW'}`, 8, H - 20, GOLD[2], 1, OUTLINE);
  drawText(ctx, state.half ? '½× PRÁCTICA' : '', 8, H - 10, '#a8e878', 1, OUTLINE);
  const idle = !next && (!now || now.loop) && b - Math.max(state.calledAt, state.startedAt) > 12;
  if (idle && Math.floor(b * 2) % 2 === 0) centerText(ctx, `SPACE: CALL ¡${MOVES[state.move].name}!`, H - 33, CREAM, 1, OUTLINE);
  if (b - state.startedAt < 4 && b - state.startedAt >= 0) centerText(ctx, '¡A BAILAR!', 12, GOLD, 4, OUTLINE, { shadow: OUTLINE });
}

const ROLE_HIT = { lead: [W / 2 - 92, W / 2 - 28], follow: [W / 2 + 22, W / 2 + 96] };
function title(b) {
  // Above and below the circle, so the dancers show.
  centerText(ctx, 'RUEDA', 4, GOLD, 5, OUTLINE, { shadow: OUTLINE });
  centerText(ctx, 'DE CASINO', H - 56, CREAM, 2, OUTLINE);
  const blink = Math.floor(b) % 2 === 0;
  const sel = (role, text, x) => drawText(ctx, text, x, H - 34, state.role === role ? (blink ? GOLD : '#f8d040') : '#7a6a60', 2, OUTLINE);
  sel('lead', '◄ LEAD', ROLE_HIT.lead[0]);
  sel('follow', 'FOLLOW ►', ROLE_HIT.follow[0]);
  if (blink) centerText(ctx, 'PRESS SPACE OR CLICK TO DANCE', H - 12, CREAM, 1, OUTLINE);
  drawText(ctx, 'T: TUNE THE FEEL', W - 8 - textWidth('T: TUNE THE FEEL'), 8, '#c0a888', 1, OUTLINE);
}

// ------------------------------------------------------------ moves library
const lib = document.getElementById('moves');
let libKey = '', libMove = '', libState = '';
// The list shows only the moves that can be called next: from the guapea,
// from arriba or from adentro y afuera. Each keeps its own pick, so after a
// dile que no the pick from before arriba is back.
const picks = {};

const available = (st) => Object.values(MOVES).filter((mv) => callableFrom(mv, st)).map((mv) => mv.id);
const STATE_NAME = { guapea: 'Guapea', arriba: 'Arriba', adentro: 'Adentro y afuera' };

function buildLibrary(st) {
  if (libState) picks[libState] = state.move;
  libState = st;
  const ids = available(st);
  state.move = ids.includes(picks[st]) ? picks[st] : ids.includes(state.move) ? state.move : ids[0];
  lib.querySelector('#avail').textContent = `${STATE_NAME[st]} – available moves`;
  const list = lib.querySelector('ol');
  list.innerHTML = '';
  ids.map((id) => MOVES[id]).forEach((mv, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" data-move="${mv.id}"><kbd${i < 10 ? '' : ' class="none"'}>${i < 10 ? (i + 1) % 10 : '&nbsp;'}</kbd><b>${mv.name}</b><i></i><small>${mv.blurb}</small></button>`;
    li.querySelector('button').addEventListener('click', (e) => { e.currentTarget.blur(); select(mv.id); });
    list.appendChild(li);
  });
  libKey = ''; libMove = '';
}
function select(id) {
  if (id !== state.move) music.sfx('select');
  state.move = id;
}
// Marks the selected move, and the one dancing now or next.
function syncLibrary(b) {
  const st = nextState(b);
  if (st !== libState) buildLibrary(st);
  const m = Math.floor(b / 8), now = callAt(m)?.id, next = timeline.get(m + 1), key = `${state.move}|${now}|${next}`;
  if (key === libKey) return;
  libKey = key;
  // A move picked with a key may be below the fold of the list.
  if (state.move !== libMove) lib.querySelector(`button[data-move="${(libMove = state.move)}"]`)?.scrollIntoView({ block: 'nearest' });
  for (const btn of lib.querySelectorAll('button[data-move]')) {
    const id = btn.dataset.move;
    btn.classList.toggle('on', id === state.move);
    btn.querySelector('i').textContent = id === now ? 'NOW' : id === next ? 'NEXT' : '';
  }
}

// ------------------------------------------------------------ input
function setRole(role) { state.role = role; }
addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'INPUT') return;
  const k = e.code, ids = available(libState);
  if (k === 'Space' || k === 'Enter' || k === 'KeyZ') { e.preventDefault(); call(); }
  else if (k === 'ArrowLeft' || k === 'KeyA') setRole('lead');
  else if (k === 'ArrowRight' || k === 'KeyD') setRole('follow');
  else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); select(ids[mod(ids.indexOf(state.move) + (k === 'ArrowUp' ? -1 : 1), ids.length)]); }
  else if (/^Digit[0-9]$/.test(k) && ids[(+k.slice(5) + 9) % 10]) select(ids[(+k.slice(5) + 9) % 10]); // 0 is the tenth
  else if (k === 'KeyT') toggleTune();
  else if (k === 'KeyM') {
    state.muted = !state.muted;
    if (music.out) music.out.gain.value = state.muted ? 0 : 0.7;
    if (state.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  }
  else if (k === 'KeyS') { state.half = !state.half; music.setBpm(P.bpm * (state.half ? 0.5 : 1)); }
});
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  if (state.mode === 'title' && y > H - 48) {
    for (const [role, [x0, x1]] of Object.entries(ROLE_HIT)) if (x >= x0 && x <= x1) return setRole(role);
  }
  call();
});

// ------------------------------------------------------------ tune panel
const panel = document.getElementById('tune');
function toggleTune() { panel.hidden = !panel.hidden; }
document.getElementById('tuneBtn').addEventListener('click', (e) => { e.currentTarget.blur(); toggleTune(); });
function saveUrl() {
  const u = new URLSearchParams();
  for (const [k, [d]] of Object.entries(SPEC)) if (P[k] !== d) u.set(k, P[k]);
  history.replaceState(null, '', u.size ? `?${u}` : location.pathname);
}
function buildPanel() {
  const rows = panel.querySelector('.rows');
  rows.innerHTML = '';
  for (const [k, [, lo, hi, st, label]] of Object.entries(SPEC)) {
    const row = document.createElement('label');
    row.innerHTML = `<span>${label}</span><b></b><input type="range" min="${lo}" max="${hi}" step="${st}">`;
    const input = row.querySelector('input'), val = row.querySelector('b');
    input.value = P[k]; val.textContent = P[k];
    input.addEventListener('input', () => {
      P[k] = +input.value; val.textContent = P[k];
      if (k === 'bpm') music.setBpm(P.bpm * (state.half ? 0.5 : 1));
      if (k === 'couples') { build(); buildPlaza(); }
      saveUrl();
    });
    rows.appendChild(row);
  }
}
panel.querySelector('[data-copy]').addEventListener('click', async (e) => {
  await navigator.clipboard.writeText(location.href).catch(() => {});
  e.currentTarget.textContent = 'COPIED ✓';
  setTimeout(() => (e.target.textContent = 'COPY LINK'), 1400);
});
panel.querySelector('[data-reset]').addEventListener('click', () => {
  for (const [k, [d]] of Object.entries(SPEC)) P[k] = d;
  music.setBpm(P.bpm * (state.half ? 0.5 : 1));
  build(); buildPlaza(); buildPanel(); saveUrl();
});

const stage = document.getElementById('stage');
function fit() {
  const dpr = devicePixelRatio || 1, w = stage.clientWidth - 12, h = stage.clientHeight - 12;
  // Whole device pixels per game pixel when that fills most of the space.
  const fill = Math.min(w / W, h / H), crisp = Math.floor(fill * dpr) / dpr;
  const k = crisp >= fill * 0.8 ? crisp : fill;
  canvas.style.width = `${W * k}px`;
  canvas.style.height = `${H * k}px`;
}
addEventListener('resize', fit);

build();
// ?call=enchufla, or several calls: ?call=arriba,dilequeno@5 (each one from
// the given measure, or right after the one before).
if (q.has('call')) {
  let at = 1;
  for (const c of q.get('call').split(',')) {
    const [id, from] = c.split('@'), mv = MOVES[id] ? id : state.move;
    if (from) at = +from;
    timeline.set(at, mv);
    at += MOVES[mv].bars.length;
  }
}
buildPlaza();
buildPanel();
buildLibrary(nextState(beatNow()));
fit();
// For the tools (tools/): pose poses everyone for a beat right away, without
// drawing; only picks the dancers to draw; proj is the screen position of a
// point on the floor plan.
window.rueda = { P, state, music, timeline, moves: MOVES, leads: () => leads, follows: () => follows, seek: (b) => { frozen = b; }, call, pose: (b) => poseAll(b, 0), only: (f) => { only = f; }, proj };
requestAnimationFrame(frame);
