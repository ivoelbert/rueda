// Drawing a dancer as pixel sprites: limbs, skirt, head and hat, with the
// skirts and hats lagging behind on springs.

import { BAND, DRESS, EYE, FLOWER, HAIR, HAT, HEAD_R, HEELS, MOUTH, OUTLINE, PANTS, SHIRT, SHOES, SKIN, TRIM } from './body.js';
import { P } from './knobs.js';
import { H, TAU, TO_CAM, W, clamp, depth, lerp, mix, mod, proj, v3 } from './math.js';
import { Sprites, hull } from './sprite.js';

export const spr = new Sprites(W, H, [SKIN, HAIR, SHIRT, PANTS, DRESS, [HAT], [BAND], [SHOES], [HEELS], [FLOWER], [[EYE, MOUTH, TRIM]]].flat(3), { outline: OUTLINE, shade: 1, line: 1 });

// Skirt hems and hats trail the body on a damped spring; the spring also
// tracks how fast she turns, so a spin flares the skirt.
export function spring(d, B, dt) {
  const s = d.spr || (d.spr = { x: B.pelvis.x, y: B.pelvis.y, vx: 0, vy: 0, z: B.head.z, vz: 0, h: B.h, w: 0 });
  const K = 160, C = 11, h = dt / 2;
  for (let i = 0; i < 2; i++) {
    s.vx += (K * (B.pelvis.x - s.x) - C * s.vx) * h; s.x += s.vx * h;
    s.vy += (K * (B.pelvis.y - s.y) - C * s.vy) * h; s.y += s.vy * h;
    s.vz += (K * 1.4 * (B.head.z - s.z) - C * s.vz) * h; s.z += s.vz * h;
  }
  if (dt > 0) s.w = lerp(s.w, (mod(B.h - s.h + Math.PI, TAU) - Math.PI) / dt, 1 - Math.exp(-dt * 10));
  s.h = B.h;
}

// ------------------------------------------------------------ drawing
export function drawDancer(d, B, A) {
  const look = d.look, lead = d.lead, Pp = proj;
  const legs = [];
  for (const n of ['O', 'I']) {
    legs.push({ z: depth(B['knee' + n]), draw: () => {
      spr.chain([Pp(B['hip' + n]), Pp(B['knee' + n]), Pp(B['ankle' + n])], lead ? [3.6, 3.2] : [2.6, 2.3], lead ? look.pants : look.skin);
      spr.chain([Pp(B['ankle' + n]), Pp(B['toe' + n])], [2.6], look.shoes);
    } });
  }
  legs.sort((a, b) => b.z - a.z).forEach((p) => p.draw());

  const chest = depth(B.neck);
  const items = [];
  if (!lead) items.push({ z: chest + 0.002, draw: () => skirt(d, B) });
  items.push({ z: chest + 0.001, draw: () => {
    const color = lead ? look.shirt : look.dress;
    spr.poly(hull([B.shO, B.shI, B.waistO, B.waistI, B.neck].map(Pp)), color);
    spr.chain([Pp(mix(B.waistO, B.waistI, 0.5)), Pp(B.neck)], [lead ? 7 : 5], color, false);
  } });
  for (const n of ['O', 'I']) {
    const a = A[n];
    // Around a partner, or on top in crossed hands, the forearm and hand are
    // drawn later (render); the upper arm stays with the body.
    if (B.around?.[n]?.w > 0.5 || B.top?.n === n) items.push({ z: (depth(a.sh) + depth(a.el)) / 2, draw: () => arm(d, a, 'upper') });
    else items.push({ z: (depth(a.el) + depth(a.hand)) / 2, draw: () => arm(d, a) });
  }
  items.sort((a, b) => b.z - a.z).forEach((p) => p.draw());
  head(d, B);
}

// part: 'upper' (shoulder to elbow), 'fore' (elbow to hand) or both.
export function arm(d, a, part) {
  const look = d.look, w = d.lead ? [3.2, 2.7] : [2.5, 2.2], c = d.lead ? [look.shirt, look.skin] : [look.skin, look.skin];
  if (part === 'upper') return spr.limb([proj(a.sh), proj(a.el)], [w[0]], [c[0]]);
  if (part === 'fore') spr.limb([proj(a.el), proj(a.hand)], [w[1]], [c[1]]);
  else spr.limb([proj(a.sh), proj(a.el), proj(a.hand)], w, c);
  spr.blob(proj(a.hand), 1.35, look.skin);
}

function skirt(d, B) {
  const s = d.spr, k = P.springy;
  const lx = clamp(s.x - B.pelvis.x, -3, 3) * k, ly = clamp(s.y - B.pelvis.y, -3, 3) * k;
  const flare = 0.4 + (clamp(Math.hypot(s.vx, s.vy) * 0.07, 0, 1.6) + clamp(Math.abs(s.w) * 0.22, 0, 2.2)) * k;
  const hx = B.pelvis.x + lx, hy = B.pelvis.y + ly, wz = B.pz + 1.8, phase = (s.x + s.y) * 0.4 + B.h;
  const pts = [], hem = [];
  for (let n = 0; n < 18; n++) {
    const a = (n / 18) * TAU;
    pts.push(proj(v3(B.pelvis.x + Math.cos(a) * 3.1, B.pelvis.y + Math.sin(a) * 3.1, wz)));
    const r = 6 + flare, p = v3(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 4.3 + flare * 0.5 - 0.5 * Math.cos(a * 5 + phase));
    hem.push(p);
    pts.push(proj(p));
  }
  spr.poly(hull(pts), d.look.dress);
  const c = depth(B.pelvis);
  for (const p of hem) if (depth(p) < c - 1) spr.dot(proj(p), TRIM, 1);
}

// B.yaw turns the head on the shoulders (+ = to the left).
function head(d, B) {
  const look = d.look, h = B.head, R = HEAD_R, c = Math.cos(B.yaw || 0), sn = Math.sin(B.yaw || 0);
  const f = { x: B.f.x * c - B.f.y * sn, y: B.f.x * sn + B.f.y * c }, l = { x: -f.y, y: f.x };
  const W3 = (fw, sd, z) => v3(h.x + f.x * fw + l.x * sd, h.y + f.y * fw + l.y * sd, h.z + z);
  const facing = f.x * TO_CAM.x + f.y * TO_CAM.y;
  spr.chain([proj(B.neck), proj(W3(0, 0, -R * 0.7))], [2.6], look.skin, false);
  const bun = W3(-R * 0.62, 0, R * 0.55);
  if (!d.lead && depth(bun) > depth(h)) spr.blob(proj(bun), 2.4, look.hair);
  spr.blob(proj(h), R, look.hair);
  const eyes = () => {
    if (facing < -0.45) return;
    for (const side of [1, -1]) {
      const nx = f.x * 0.85 + l.x * side * 0.45, ny = f.y * 0.85 + l.y * side * 0.45;
      if (nx * TO_CAM.x + ny * TO_CAM.y < 0.05) continue;
      const e = proj(W3(R * 0.84, side * R * 0.42, -0.6));
      spr.dot(e, EYE, 1); spr.dot({ x: e.x, y: e.y + 1 }, EYE, 1);
    }
    if (facing > 0.15) spr.dot(proj(W3(R * 0.9, 0, -R * 0.45)), MOUTH, 1);
  };
  if (facing > -0.45) spr.blob(proj(W3(R * 0.34, 0, -0.5)), R * 0.8, look.skin, false);
  if (d.lead && look.hat) {
    const lag = clamp(d.spr.z - h.z, -2, 2.5) * P.springy, z0 = h.z + R * 0.7 + lag;
    const ring = (r, z) => Array.from({ length: 16 }, (_, n) => proj(v3(h.x + Math.cos((n / 16) * TAU) * r, h.y + Math.sin((n / 16) * TAU) * r, z)));
    spr.poly(ring(6.2, z0), look.hat);
    spr.poly(hull([...ring(4.3, z0 + 0.3), ...ring(3.7, z0 + 3.6)]), look.hat);
    spr.poly(hull([...ring(4.4, z0 + 0.4), ...ring(4.2, z0 + 1.6)]), look.band, false);
    spr.poly(ring(3.6, z0 + 3.6), look.hat, false);
    eyes();
  } else if (d.lead) {
    eyes();
  } else {
    eyes();
    if (depth(bun) <= depth(h)) spr.blob(proj(bun), 2.4, look.hair);
    spr.blob(proj(W3(-R * 0.4, d.sO * R * 0.6, R * 0.75)), 1.5, look.flower);
  }
}
