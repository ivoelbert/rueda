// Neon: a near-top-down view of the whole rueda. Bodies are neon tubes, steps
// leave glowing footprints and turns draw arrows on the floor, so the footwork
// and turn directions read like a dance diagram.
import { Game } from '../shared/game.js';
import { D } from '../shared/dance.js';

const RADIUS = 1.45;
const game = (window.game = new Game({ couples: 4, ringOffset: -90, radius: RADIUS, subtitle: 'Neon · top-down' }));
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

const TILT = (36 * Math.PI) / 180, CT = Math.cos(TILT), ST = Math.sin(TILT);
const DEG = Math.PI / 180;
const LEAD = ['#3df5ff', '#5aa8ff', '#5aa8ff', '#5aa8ff'];
const FOLLOW = ['#ff3df5', '#ff7ad9', '#ff7ad9', '#ff7ad9'];
let W, H, S, MID, S_RING;
// Camera: a focus point on the floor and a scale, eased toward the chosen view.
const view = { x: 0, y: 0, z: 0.75, s: 0 };

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const top = 64, bottom = H - 96, R = RADIUS + D + 0.45;
  S_RING = Math.min((W * 0.47) / R, (bottom - top) / (2 * R * CT + 1.7 * ST));
  MID = (top + bottom) / 2;
}
addEventListener('resize', resize);
resize();

function aimCamera(frame, dt) {
  let target = { x: 0, y: 0, z: 0.75, s: S_RING };
  if (frame.cam === 'close') {
    const c = frame.couples[frame.player.couple];
    target = { x: (c.lead.j.pelvis.x + c.follow.j.pelvis.x) / 2, y: (c.lead.j.pelvis.y + c.follow.j.pelvis.y) / 2, z: 0.9, s: S_RING * 2.3 };
  }
  const k = view.s ? 1 - Math.exp(-dt * 5) : 1;
  for (const key of ['x', 'y', 'z', 's']) view[key] += (target[key] - view[key]) * k;
  S = view.s;
}

const proj = (p) => [W / 2 + S * (p.x - view.x), MID - S * ((p.y - view.y) * CT + ((p.z || 0) - view.z) * ST)];

function tube(points, color, width, glow = 14) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = width * 0.3;
  ctx.stroke();
}

// Ground-plane ellipse helper (a circle on the floor seen at the tilt).
function floorCircle(x, y, r) {
  const [sx, sy] = proj({ x, y, z: 0 });
  ctx.beginPath();
  ctx.ellipse(sx, sy, r * S, r * S * CT, 0, 0, Math.PI * 2);
}

// ---------------------------------------------------------------- effects state
const footprints = [];
const lastLanding = new Map();
const rings = [];
const sparks = [];
let shake = 0;

function burst(x, y, colors, n = 40, speed = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 1, color: colors[i % colors.length] });
  }
}

function trackFeet(id, b, frame, color) {
  for (const f of ['L', 'R']) {
    const ft = b.feet[f];
    const g = frame.measure * 8 + ft.landed;
    const key = id + f;
    if (lastLanding.get(key) !== g) {
      if (lastLanding.has(key) && frame.beat - g < 0.6) footprints.push({ x: ft.x, y: ft.y, th: b.th, foot: f, beat: g, color });
      lastLanding.set(key, g);
    }
  }
}

// ------------------------------------------------------------------- drawing

function drawFloor(frame) {
  const [ox, oy] = proj({ x: 0, y: 0, z: 0 });
  const g = ctx.createRadialGradient(ox, oy - 40, 30, ox, oy, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#1d0838');
  g.addColorStop(0.55, '#0b0320');
  g.addColorStop(1, '#030008');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Perspective grid, brighter on the downbeats.
  const glow = 0.1 + 0.18 * Math.pow(frame.pulse, 3) * (frame.count === 1 || frame.count === 5 ? 1.6 : 1);
  ctx.save();
  floorCircle(0, 0, RADIUS + D + 1.6);
  ctx.clip();
  ctx.strokeStyle = `rgba(160, 60, 255, ${glow})`;
  ctx.lineWidth = 1;
  for (let i = -8; i <= 8; i++) {
    const a = proj({ x: i * 0.6, y: -6 }), b = proj({ x: i * 0.6, y: 6 });
    const c = proj({ x: -6, y: i * 0.6 }), d = proj({ x: 6, y: i * 0.6 });
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.moveTo(...c); ctx.lineTo(...d); ctx.stroke();
  }
  ctx.restore();

  // Rueda guide rings: leads inside, follows outside.
  ctx.setLineDash([4, 10]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(61, 245, 255, 0.22)';
  floorCircle(0, 0, RADIUS); ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 61, 245, 0.22)';
  floorCircle(0, 0, RADIUS + D); ctx.stroke();
  ctx.setLineDash([]);

  // Floor logo.
  const [lx, ly] = proj({ x: 0, y: 0 });
  ctx.save();
  ctx.translate(lx, ly);
  ctx.scale(1, CT);
  ctx.font = `italic 900 ${S * 0.42}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff3df5';
  ctx.shadowBlur = 20;
  ctx.fillStyle = `rgba(255, 61, 245, ${(0.14 + 0.22 * Math.pow(frame.pulse, 2)) * Math.min(1, S_RING / S) ** 2})`;
  ctx.fillText('RUEDA', 0, 0);
  ctx.restore();

  // Beat rings.
  for (const r of rings) {
    const age = frame.beat - r.beat;
    if (age < 0 || age > 1.2) continue;
    ctx.strokeStyle = r.strong ? `rgba(255, 226, 61, ${0.6 * (1 - age / 1.2)})` : `rgba(61, 245, 255, ${0.35 * (1 - age / 1.2)})`;
    ctx.lineWidth = r.strong ? 3 : 2;
    floorCircle(0, 0, 0.4 + age * 3);
    ctx.stroke();
  }
}

function drawPalm(x, y, s, flip, color, pulse) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * s, s);
  ctx.globalAlpha = 0.55 + 0.25 * pulse;
  const trunk = [[0, 0], [8, -60], [10, -120], [6, -180]];
  tube(trunk, '#3dff9a', 5, 16);
  for (const [a, l] of [[-150, 90], [-120, 110], [-80, 100], [-40, 110], [-10, 90], [-170, 70]]) {
    const r = a * DEG, pts = [];
    for (let k = 0; k <= 8; k++) {
      const s2 = k / 8;
      pts.push([6 + Math.cos(r) * l * s2, -180 + Math.sin(r) * l * s2 + 40 * s2 * s2]);
    }
    tube(pts, color, 4, 16);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFootprints(beat) {
  for (let i = footprints.length - 1; i >= 0; i--) {
    const fp = footprints[i];
    const age = beat - fp.beat;
    if (age > 6) { footprints.splice(i, 1); continue; }
    const a = Math.max(0, 1 - age / 6) * (fp.dim ? 0.4 : 0.9);
    const r = fp.th * DEG;
    const [sx, sy] = proj({ x: fp.x, y: fp.y, z: 0 });
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, CT);
    ctx.rotate(-r);
    ctx.globalAlpha = a;
    ctx.shadowColor = fp.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = fp.color;
    // Sole and heel of a shoe pointing along the heading.
    ctx.beginPath(); ctx.ellipse(S * 0.05, 0, S * 0.075, S * 0.042, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-S * 0.075, 0, S * 0.035, S * 0.032, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#05010d';
    ctx.font = `900 ${S * 0.06}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.rotate(Math.PI / 2);
    ctx.fillText(fp.foot, 0, -S * 0.05);
    ctx.restore();
  }
}

// Arc arrow on the floor showing which way a dancer is turning.
function drawTurn(b, color) {
  const w = b.omega;
  const a = Math.min(1, (Math.abs(w) - 110) / 250);
  if (a <= 0) return;
  const dir = Math.sign(w), r = 0.42, start = b.th * DEG - dir * 2.6, sweep = dir * 2.4;
  const pts = [];
  for (let k = 0; k <= 20; k++) {
    const ang = start + (sweep * k) / 20;
    pts.push(proj({ x: b.j.pelvis.x + Math.cos(ang) * r, y: b.j.pelvis.y + Math.sin(ang) * r, z: 0 }));
  }
  ctx.globalAlpha = a;
  tube(pts, color, 4, 18);
  const end = start + sweep, tip = proj({ x: b.j.pelvis.x + Math.cos(end) * r, y: b.j.pelvis.y + Math.sin(end) * r, z: 0 });
  const back = end - dir * 0.35;
  const l = proj({ x: b.j.pelvis.x + Math.cos(back) * (r + 0.1), y: b.j.pelvis.y + Math.sin(back) * (r + 0.1), z: 0 });
  const rr = proj({ x: b.j.pelvis.x + Math.cos(back) * (r - 0.1), y: b.j.pelvis.y + Math.sin(back) * (r - 0.1), z: 0 });
  tube([l, tip, rr], color, 4, 18);
  ctx.globalAlpha = 1;
}

function drawDancer(b, color, alpha, width) {
  const j = b.j, P = (k) => proj(j[k]);
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = '#000';
  floorCircle(j.pelvis.x, j.pelvis.y, 0.22);
  ctx.fill();
  ctx.globalAlpha = alpha;

  if (b.role === 'follow') {
    // Skirt: scalloped hem that rises and widens with spin speed.
    const f = b.flare, hemZ = 0.48 + f * 0.14, spin = b.th * DEG * 1.5;
    const hem = [];
    for (let k = 0; k <= 36; k++) {
      const a = (k / 36) * Math.PI * 2;
      const rad = (0.22 + f * 0.2) * (1 + 0.06 * Math.sin(a * 7 + spin));
      hem.push(proj({ x: j.pelvis.x + Math.cos(a) * rad, y: j.pelvis.y + Math.sin(a) * rad, z: hemZ - 0.03 * Math.cos(a * 7 + spin) }));
    }
    ctx.beginPath();
    hem.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fillStyle = color + '40';
    ctx.fill();
    tube(hem, color, width * 0.6, 10);
    const waist = proj({ ...j.pelvis, z: j.pelvis.z + 0.04 });
    for (let k = 0; k < 36; k += 6) tube([waist, hem[k]], color, width * 0.35, 6);
  }

  for (const s of ['L', 'R']) tube([P('hip' + s), P('knee' + s), P('ankle' + s), P('toe' + s)], color, width);
  ctx.beginPath();
  [P('shL'), P('shR'), P('hipR'), P('hipL')].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = color + '38';
  ctx.fill();
  tube([P('hipL'), P('hipR')], color, width);
  tube([P('pelvis'), P('neck')], color, width);
  tube([P('shL'), P('shR')], color, width);
  for (const s of ['L', 'R']) tube([P('sh' + s), P('el' + s), P('wr' + s)], color, width);
  for (const s of ['L', 'R']) {
    const [x, y] = P('wr' + s);
    ctx.fillStyle = '#fff'; ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x, y, width * 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Head with a facing tick, hat for leads, bun for follows.
  const head = j.head, hr = b.P.headR * S, [hx, hy] = proj(head);
  const hy2 = b.headYaw * DEG;
  if (b.role === 'follow') {
    const bun = proj({ x: head.x - Math.cos(hy2) * 0.1, y: head.y - Math.sin(hy2) * 0.1, z: head.z + 0.05 });
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(bun[0], bun[1], hr * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = '#05010d';
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.strokeStyle = color; ctx.lineWidth = width * 0.8; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
  const nose = proj({ x: head.x + Math.cos(hy2) * 0.15, y: head.y + Math.sin(hy2) * 0.15, z: head.z });
  tube([[hx, hy], nose], '#fff', width * 0.6, 8);
  if (b.role === 'lead') {
    const [bx, by] = proj({ ...head, z: head.z + 0.09 });
    ctx.beginPath(); ctx.ellipse(bx, by, 0.17 * S, 0.17 * S * CT, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = width * 0.6; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    p.life -= dt * 1.2;
    if (p.life <= 0) { sparks.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.vx *= 0.98;
    ctx.globalAlpha = p.life;
    tube([[p.x, p.y], [p.x - p.vx * 0.03, p.y - p.vy * 0.03]], p.color, 3, 10);
  }
  ctx.globalAlpha = 1;
}

// ----------------------------------------------------------------------- loop
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const frame = game.update();
  const { couples, player } = frame;
  aimCamera(frame, dt);

  for (const e of frame.events) {
    if (e.type === 'beat') rings.push({ beat: Math.floor(frame.beat), strong: e.count === 1 || e.count === 5 });
    const pc = couples[player.couple];
    const [px, py] = proj({ x: (pc.lead.j.pelvis.x + pc.follow.j.pelvis.x) / 2, y: (pc.lead.j.pelvis.y + pc.follow.j.pelvis.y) / 2, z: 1.2 });
    if (e.type === 'judge' && e.grade !== 'miss') burst(px, py, ['#3df5ff', '#ff3df5', '#fff'], 36);
    if (e.type === 'complete') { burst(px, py, ['#ffe23d', '#3df5ff', '#ff3df5', '#3dff9a'], 90, 420); shake = 1; }
  }
  while (rings.length > 6) rings.shift();

  ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake); shake = Math.max(0, shake - dt * 3); }
  drawFloor(frame);
  const palmPulse = Math.pow(frame.pulse, 2);
  const palmScale = Math.min(1.4, Math.min(W, H) / 600);
  drawPalm(W * 0.06, H - 40, palmScale, 1, '#3dff9a', palmPulse);
  drawPalm(W * 0.94, H - 40, palmScale, -1, '#3dff9a', palmPulse);

  // Player marker ring under the dancer you control.
  const you = couples[player.couple][player.role];
  const youColor = player.role === 'lead' ? LEAD[0] : FOLLOW[0];
  ctx.lineWidth = 3;
  ctx.strokeStyle = youColor;
  ctx.shadowColor = youColor;
  ctx.shadowBlur = 16;
  floorCircle(you.j.pelvis.x, you.j.pelvis.y, 0.3 + 0.05 * Math.pow(frame.pulse, 3));
  ctx.stroke();
  ctx.shadowBlur = 0;

  couples.forEach((c, i) => {
    trackFeet(`${i}l`, c.lead, frame, LEAD[i]);
    trackFeet(`${i}f`, c.follow, frame, FOLLOW[i]);
  });
  for (const fp of footprints) fp.dim = !(fp.color === LEAD[0] || fp.color === FOLLOW[0]);
  drawFootprints(frame.beat);
  couples.forEach((c, i) => { drawTurn(c.lead, LEAD[i]); drawTurn(c.follow, FOLLOW[i]); });

  // Far dancers first.
  const dancers = [];
  couples.forEach((c, i) => {
    const a = i === player.couple ? 1 : 0.6;
    dancers.push({ b: c.lead, color: LEAD[i], a, w: i === player.couple ? 5 : 3.5 });
    dancers.push({ b: c.follow, color: FOLLOW[i], a, w: i === player.couple ? 5 : 3.5 });
  });
  dancers.sort((p, q) => q.b.j.pelvis.y - p.b.j.pelvis.y);
  for (const d of dancers) drawDancer(d.b, d.color, d.a, d.w * Math.min(1.3, S / 110));

  // Joined hands glow like a plug ("enchufar" = to plug in).
  couples.forEach((c, i) => {
    const [gx, gy] = proj(c.grip);
    ctx.fillStyle = '#ffe23d'; ctx.shadowColor = '#ffe23d'; ctx.shadowBlur = i === player.couple ? 24 : 10;
    ctx.beginPath(); ctx.arc(gx, gy, i === player.couple ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });

  // YOU tag.
  const [tx, ty] = proj({ ...you.j.head, z: you.j.head.z + 0.35 });
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = youColor; ctx.shadowColor = youColor; ctx.shadowBlur = 12;
  ctx.fillText('▼ YOU', tx, ty);
  ctx.shadowBlur = 0;

  // The caller's raised fist flashes while calling.
  if (game.signal && frame.beat < game.signal[1]) {
    const cb = couples[frame.caller].lead;
    const [cx, cy] = proj(cb.j.wrR);
    ctx.strokeStyle = '#ffe23d'; ctx.lineWidth = 3; ctx.shadowColor = '#ffe23d'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(cx, cy, 10 + 6 * frame.pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawSparks(dt);
  ctx.restore();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
