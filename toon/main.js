// Toon 3D: cel-shaded dancers with ink outlines on a Havana rooftop at sunset.
// Every limb is a capsule placed between two joints of the shared skeleton, so
// the bodies move exactly as the dance engine says.
import * as THREE from 'three';
import { Game } from '../shared/game.js';
import { BODY } from '../shared/dance.js';

const RADIUS = 1.45;
const game = (window.game = new Game({ couples: 4, ringOffset: -125, radius: RADIUS, subtitle: 'Toon 3D · Havana rooftop' }));

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf3a37a, 26, 75);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 52 : 36;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Dance space (x, y ground, z up) to three.js (x, y up, -z).
const V = (p, out = new THREE.Vector3()) => out.set(p.x, p.z, -p.y);

// ------------------------------------------------------------- materials
const ramp = new THREE.DataTexture(new Uint8Array([150, 205, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
const mats = new Map();
const toon = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra }));
  return mats.get(key);
};
const INK = new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.BackSide });
const OUT = 0.013;

function inked(geo, ink, material) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  g.add(m);
  if (ink) g.add(new THREE.Mesh(ink, INK));
  return g;
}
const capsule = (r, len, color) => inked(new THREE.CapsuleGeometry(r, len, 4, 12), new THREE.CapsuleGeometry(r + OUT, len, 4, 12), toon(color));
const ball = (r, color, ink = true) => inked(new THREE.SphereGeometry(r, 18, 14), ink && new THREE.SphereGeometry(r + OUT, 18, 14), toon(color));
const box = (x, y, z, color) => inked(new THREE.BoxGeometry(x, y, z), new THREE.BoxGeometry(x + OUT * 2, y + OUT * 2, z + OUT * 2), toon(color));

const UP = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Matrix4();
function place(obj, pa, pb, axis = UP) {
  V(pa, _a); V(pb, _b);
  obj.position.copy(_a).add(_b).multiplyScalar(0.5);
  obj.quaternion.setFromUnitVectors(axis, _d.copy(_b).sub(_a).normalize());
}

// ---------------------------------------------------------------- dancers
const SKIN = ['#8d5524', '#c68642', '#5c3a21', '#e0ac69', '#7a4b2a', '#b07a4a', '#4a2e1a', '#d49a6a'];
const LOOKS = [
  { lead: { skin: SKIN[0], shirt: '#f6efe0', pants: '#2b2a4a', hat: '#e8c070' }, follow: { skin: SKIN[1], dress: '#e8283c', hair: '#24141a' } },
  { lead: { skin: SKIN[2], shirt: '#9fd8f0', pants: '#f0e4c4', hat: '#f6efe0' }, follow: { skin: SKIN[3], dress: '#ffc928', hair: '#3a2014' } },
  { lead: { skin: SKIN[4], shirt: '#f6efe0', pants: '#3a5a8a', hat: '#e8c070' }, follow: { skin: SKIN[5], dress: '#1fb5a5', hair: '#24141a' } },
  { lead: { skin: SKIN[6], shirt: '#ff9b5a', pants: '#2b2a4a', hat: '#2b2a4a' }, follow: { skin: SKIN[7], dress: '#9b4fd1', hair: '#5a2a1a' } },
];

class Skirt {
  constructor(color) {
    this.n = 28;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((this.n + 1) * 3 * 3), idx = [];
    for (let r = 0; r < 2; r++) for (let k = 0; k < this.n; k++) {
      const a = r * (this.n + 1) + k, b = a + 1, c = a + this.n + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, toon(color, { side: THREE.DoubleSide }));
    this.mesh.castShadow = true;
    this.ink = new THREE.Mesh(geo, INK);
    this.ink.scale.set(1.05, 1.01, 1.05);
    this.group = new THREE.Group();
    this.group.add(this.mesh, this.ink);
  }
  update(flare, spin) {
    const p = this.geo.attributes.position.array, n = this.n;
    const rings = [
      (a) => [0.15, 0.04],
      (a) => [0.2 + flare * 0.14, -0.17 + flare * 0.04],
      (a) => [(0.27 + flare * 0.24) * (1 + 0.06 * Math.sin(a * 6 + spin)), -0.4 + flare * 0.13 + 0.03 * Math.cos(a * 6 + spin)],
    ];
    rings.forEach((ring, r) => {
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2, [rad, y] = ring(a), i = (r * (n + 1) + k) * 3;
        p[i] = Math.cos(a) * rad; p[i + 1] = y; p[i + 2] = Math.sin(a) * rad;
      }
    });
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

class Dancer {
  constructor(role, look) {
    const P = BODY[role], lead = role === 'lead';
    this.role = role; this.P = P;
    const g = (this.group = new THREE.Group());
    scene.add(g);
    const add = (o) => (g.add(o), o);
    this.thigh = [0, 1].map(() => add(capsule(lead ? 0.075 : 0.066, P.thigh, lead ? look.pants : look.skin)));
    this.shin = [0, 1].map(() => add(capsule(lead ? 0.065 : 0.055, P.shin, lead ? look.pants : look.skin)));
    this.upper = [0, 1].map(() => add(capsule(lead ? 0.06 : 0.048, P.upper, lead ? look.shirt : look.skin)));
    this.fore = [0, 1].map(() => add(capsule(lead ? 0.047 : 0.04, P.fore, look.skin)));
    this.hand = [0, 1].map(() => add(ball(lead ? 0.052 : 0.045, look.skin)));
    this.shoe = [0, 1].map(() => add(box(P.foot, 0.07, lead ? 0.1 : 0.08, lead ? '#2a1a14' : look.dress)));
    const torsoLen = P.spine + P.neck * 0.5 + 0.06;
    this.torso = add(capsule(P.chestR, Math.max(0.05, torsoLen - 2 * P.chestR), lead ? look.shirt : look.dress));
    this.torso.scale.set(lead ? 1.3 : 1.25, 1, 0.8);
    this.neck = add(capsule(0.05, 0.08, look.skin));
    this.hips = add(ball(P.hipW * 1.55, lead ? look.pants : look.dress));
    this.hips.scale.set(1, 0.75, 0.8);
    this.head = add(new THREE.Group());
    const hr = P.headR;
    this.head.add(ball(hr, look.skin));
    for (const s of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), INK.clone());
      eye.material.side = THREE.FrontSide;
      eye.position.set(hr * 0.9, 0.015, s * 0.04);
      this.head.add(eye);
    }
    const hair = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.06, 18, 12, -Math.PI / 2, Math.PI, 0, Math.PI * 0.62), toon(lead ? '#1e1218' : look.hair, { side: THREE.DoubleSide }));
    hair.position.x = -0.005;
    this.head.add(hair);
    if (lead) {
      const brim = inked(new THREE.CylinderGeometry(0.19, 0.19, 0.016, 24), new THREE.CylinderGeometry(0.19 + OUT, 0.19 + OUT, 0.016 + OUT * 2, 24), toon(look.hat));
      brim.position.y = hr * 0.6;
      const crown = inked(new THREE.CylinderGeometry(0.1, 0.12, 0.11, 20), new THREE.CylinderGeometry(0.1 + OUT, 0.12 + OUT, 0.11 + OUT, 20), toon(look.hat));
      crown.position.y = hr * 0.6 + 0.06;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.121, 0.123, 0.03, 20), toon('#7a2a1a'));
      band.position.y = hr * 0.6 + 0.025;
      this.head.add(brim, crown, band);
    } else {
      const bun = ball(0.065, look.hair);
      bun.position.set(-0.1, 0.06, 0);
      const flower = ball(0.035, '#ff4d6d');
      flower.position.set(-0.04, 0.09, 0.08);
      this.head.add(bun, flower);
      this.skirt = new Skirt(look.dress);
      add(this.skirt.group);
    }
  }

  update(b) {
    const j = b.j, P = this.P;
    ['L', 'R'].forEach((s, i) => {
      place(this.thigh[i], j['hip' + s], j['knee' + s]);
      place(this.shin[i], j['knee' + s], j['ankle' + s]);
      place(this.upper[i], j['sh' + s], j['el' + s]);
      place(this.fore[i], j['el' + s], j['wr' + s]);
      V(j['wr' + s], this.hand[i].position);
      place(this.shoe[i], { ...j['ankle' + s], z: j['ankle' + s].z - 0.035 }, { ...j['toe' + s], z: j['ankle' + s].z - 0.035 }, X);
    });
    // Torso: a flattened capsule aligned to spine and shoulders.
    V(j.pelvis, _a); V(j.neck, _b);
    const up = _c.copy(_b).sub(_a).normalize();
    const right = V(j.shR, new THREE.Vector3()).sub(V(j.shL, _d)).projectOnPlane(up).normalize();
    const back = new THREE.Vector3().crossVectors(right, up);
    _m.makeBasis(right, up, back);
    this.torso.quaternion.setFromRotationMatrix(_m);
    this.torso.position.copy(_a).lerp(_b, 0.5);
    this.hips.position.copy(_a).addScaledVector(up, 0.02);
    this.hips.quaternion.copy(this.torso.quaternion);
    place(this.neck, j.neck, { ...j.head, z: j.head.z - P.headR * 0.6 });
    V(j.head, this.head.position);
    this.head.rotation.set(0, (b.headYaw * Math.PI) / 180, 0);
    if (this.skirt) {
      this.skirt.update(b.flare, (b.th * Math.PI) / 180 * 1.4);
      V(j.pelvis, this.skirt.group.position);
      this.skirt.group.rotation.y = (b.th * Math.PI) / 180;
    }
  }
}

const dancers = LOOKS.map((look) => ({ lead: new Dancer('lead', look.lead), follow: new Dancer('follow', look.follow) }));

// ------------------------------------------------------------------ set
function canvasTexture(size, paint, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

// Sky dome with a sunset gradient.
scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, fog: false, depthWrite: false,
  vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `varying vec3 vp; void main(){ float h = normalize(vp).y;
    vec3 c = mix(vec3(1.0,0.62,0.36), vec3(1.0,0.42,0.45), smoothstep(0.0,0.12,h));
    c = mix(c, vec3(0.42,0.24,0.55), smoothstep(0.1,0.42,h));
    c = mix(c, vec3(0.16,0.12,0.36), smoothstep(0.4,0.9,h));
    if (h < 0.0) c = vec3(0.95,0.55,0.4);
    gl_FragColor = vec4(c,1.0); }`,
})));
const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }));
sun.position.set(-70, 9, -150);
sun.lookAt(0, 2, 0);
scene.add(sun);

const roof = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), toon('#ffffff', { map: canvasTexture(256, (g, s) => {
  g.fillStyle = '#c4603c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) {
    g.fillStyle = ['#c86a44', '#b85636', '#d27650'][(i * 7 + k * 3) % 3];
    g.fillRect(i * 64 + 3, k * 64 + 3, 58, 58);
  }
}, 9) }));
roof.rotation.x = -Math.PI / 2;
roof.receiveShadow = true;
scene.add(roof);

const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), toon('#ffffff', { map: canvasTexture(512, (g, s) => {
  for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) { g.fillStyle = (i + k) % 2 ? '#2a2236' : '#f4ead8'; g.fillRect(i * 64, k * 64, 64, 64); }
}, 1.6) }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.004;
floor.receiveShadow = true;
scene.add(floor);
const rim = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.42, 64), toon('#ff8a3c'));
rim.rotation.x = -Math.PI / 2;
rim.position.y = 0.006;
scene.add(rim);

const BULB_COLORS = [0xffd23d, 0xff4f8b, 0x5fe0c8, 0xffffff].map((c) => new THREE.Color(c));
const bulbs = [];
for (let k = 0; k < 36; k++) {
  const a = (k / 36) * Math.PI * 2;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.position.set(Math.cos(a) * 3.31, 0.04, Math.sin(a) * 3.31);
  scene.add(m);
  bulbs.push(m);
}

// Parapet, water tank, laundry line and a Havana skyline with the Capitolio dome.
for (const [x, z, w, d] of [[0, -9, 18, 0.35], [0, 9, 18, 0.35], [-9, 0, 0.35, 18], [9, 0, 0.35, 18]]) {
  const wall = box(w, 0.9, d, '#5fc7b8');
  wall.position.set(x, 0.45, z);
  wall.children[0].receiveShadow = true;
  scene.add(wall);
}
const tank = new THREE.Group();
tank.add(inked(new THREE.CylinderGeometry(0.9, 0.9, 1.5, 24), new THREE.CylinderGeometry(0.9 + OUT * 2, 0.9 + OUT * 2, 1.5 + OUT * 2, 24), toon('#7aa0b8')));
tank.children[0].position.y = 2.1;
for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const leg = box(0.1, 1.4, 0.1, '#4a3a4a'); leg.position.set(x, 0.7, z); tank.add(leg); }
tank.position.set(-6.2, 0, -6);
scene.add(tank);
const cloths = [];
{
  const poles = [[4.5, -6.5], [8, -2.5]];
  for (const [x, z] of poles) { const p = box(0.08, 2.4, 0.08, '#4a3a4a'); p.position.set(x, 1.2, z); scene.add(p); }
  ['#ff4f8b', '#ffffff', '#ffd23d', '#5fc7b8', '#9b4fd1'].forEach((c, i) => {
    const t = (i + 0.7) / 5.4;
    const cloth = box(0.5, 0.65, 0.02, c);
    cloth.position.set(4.5 + 3.5 * t, 2.0, -6.5 + 4 * t);
    cloth.rotation.y = Math.atan2(-4, 3.5);
    scene.add(cloth);
    cloths.push(cloth);
  });
}
{
  const rand = (s) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
  const colors = ['#f093b0', '#6fd1bd', '#f4cc5a', '#b39ce8', '#f0aa7e', '#efe2cf'];
  for (let i = 0; i < 70; i++) {
    const a = Math.PI * (0.55 + 1.3 * rand(i)) + Math.PI * 0.1, r = 22 + 30 * rand(i + 50);
    const h = 3 + 12 * rand(i + 99), w = 3 + 5 * rand(i + 7);
    const b = box(w, h, w * (0.6 + rand(i + 3)), colors[i % colors.length]);
    b.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    b.rotation.y = rand(i + 1) * Math.PI;
    scene.add(b);
  }
  const cap = new THREE.Group();
  cap.add(box(14, 6, 6, '#efe2cf'));
  const drum = inked(new THREE.CylinderGeometry(2.4, 2.6, 3, 24), null, toon('#efe2cf'));
  drum.position.y = 4.5;
  const dome = inked(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), null, toon('#f6efe0'));
  dome.position.y = 6;
  const lantern = inked(new THREE.CylinderGeometry(0.4, 0.5, 1.6, 12), null, toon('#f4cc5a'));
  lantern.position.y = 9;
  cap.add(drum, dome, lantern);
  cap.position.set(-24, -1, -42);
  scene.add(cap);
}

scene.add(new THREE.HemisphereLight(0xffd8b0, 0x6a3a7a, 1.6));
const sunLight = new THREE.DirectionalLight(0xffc48a, 2.6);
sunLight.position.set(-7, 6, -9);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
sunLight.shadow.bias = -0.0008;
scene.add(sunLight);
const fill = new THREE.DirectionalLight(0xc8b8ff, 1.3);
fill.position.set(6, 4, 8);
scene.add(fill);

// Player markers.
const youRing = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 40), new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.95 }));
youRing.rotation.x = -Math.PI / 2;
scene.add(youRing);
const youArrow = inked(new THREE.ConeGeometry(0.1, 0.2, 4), new THREE.ConeGeometry(0.1 + OUT * 2, 0.2 + OUT * 3, 4), toon('#ffd23d'));
youArrow.rotation.x = Math.PI;
scene.add(youArrow);

// ----------------------------------------------------------------- effects
const confetti = [];
const confettiGeo = new THREE.PlaneGeometry(0.06, 0.1);
function burst(center, n, speed) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(confettiGeo, new THREE.MeshBasicMaterial({ color: BULB_COLORS[i % 4], side: THREE.DoubleSide }));
    m.position.copy(center);
    const a = Math.random() * Math.PI * 2;
    m.userData = { v: new THREE.Vector3(Math.cos(a) * speed * Math.random(), speed * (0.8 + Math.random()), Math.sin(a) * speed * Math.random()), spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0), life: 2.2 };
    scene.add(m);
    confetti.push(m);
  }
}

// ------------------------------------------------------------------ camera
const camState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), ready: false };
function aimCamera(frame, dt) {
  const c = frame.couples[frame.player.couple];
  const mid = V({ x: (c.lead.j.pelvis.x + c.follow.j.pelvis.x) / 2, y: (c.lead.j.pelvis.y + c.follow.j.pelvis.y) / 2, z: 0.95 });
  let pos, look;
  if (frame.cam === 'close') {
    // Side-on to the couple's home axis so neither partner hides the other.
    const phi = (frame.frames[frame.player.couple].phi * Math.PI) / 180;
    const side = V({ x: -Math.sin(phi), y: Math.cos(phi), z: 0 });
    look = mid;
    pos = mid.clone().addScaledVector(side, 3.3).add(V({ x: Math.cos(phi) * 2.2, y: Math.sin(phi) * 2.2, z: 1.15 }));
  } else {
    look = new THREE.Vector3(0, 0.6, 0.9);
    pos = new THREE.Vector3(4.2, 3.6, 7.6);
  }
  const k = camState.ready ? 1 - Math.exp(-dt * 3) : 1;
  camState.pos.lerp(pos, k);
  camState.look.lerp(look, k);
  camState.ready = true;
  camera.position.copy(camState.pos);
  camera.position.y += Math.pow(frame.pulse, 4) * 0.025;
  camera.lookAt(camState.look);
}

function placeCallerBubble(frame) {
  const el = game.$.caller;
  if (!frame.ui.caller || performance.now() - frame.ui.caller.at > 2500) return;
  const p = V(frame.couples[frame.caller].lead.j.head).add(new THREE.Vector3(0, 0.5, 0)).project(camera);
  el.style.right = 'auto';
  el.style.left = `${Math.min(innerWidth - el.offsetWidth - 10, Math.max(10, ((p.x + 1) / 2) * innerWidth - el.offsetWidth / 2))}px`;
  el.style.top = `${Math.max(70, ((1 - p.y) / 2) * innerHeight - el.offsetHeight)}px`;
}

// -------------------------------------------------------------------- loop
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const frame = game.update();
  frame.couples.forEach((c, i) => { dancers[i].lead.update(c.lead); dancers[i].follow.update(c.follow); });

  const you = frame.couples[frame.player.couple][frame.player.role];
  V({ ...you.j.pelvis, z: 0.012 }, youRing.position);
  youRing.scale.setScalar(1 + 0.12 * Math.pow(frame.pulse, 3));
  V({ ...you.j.head, z: you.j.head.z + 0.42 + 0.04 * Math.sin(frame.beat * Math.PI) }, youArrow.position);
  youArrow.rotation.y += dt * 2;

  const n = Math.floor(frame.beat), strong = frame.count === 1 || frame.count === 5;
  bulbs.forEach((m, k) => {
    const on = strong ? frame.pulse > 0.5 : (k + n) % 3 === 0;
    m.material.color.copy(on ? BULB_COLORS[k % 4] : BULB_COLORS[k % 4].clone().multiplyScalar(0.25));
  });
  rim.material.emissive = rim.material.emissive || new THREE.Color();
  rim.material.emissive.setRGB(0.5, 0.2, 0.05).multiplyScalar(strong ? Math.pow(frame.pulse, 2) : 0);
  cloths.forEach((c, i) => { c.rotation.z = 0.08 * Math.sin(now / 600 + i); });

  for (const e of frame.events) {
    const center = V({ x: you.j.pelvis.x, y: you.j.pelvis.y, z: 1.6 });
    if (e.type === 'judge' && e.grade !== 'miss') burst(center, 40, 2.5);
    if (e.type === 'complete') burst(center, 160, 4.5);
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const m = confetti[i], u = m.userData;
    u.life -= dt;
    if (u.life <= 0 || m.position.y < 0) { scene.remove(m); m.material.dispose(); confetti.splice(i, 1); continue; }
    u.v.y -= 6 * dt;
    u.v.multiplyScalar(0.985);
    m.position.addScaledVector(u.v, dt);
    m.rotation.x += u.spin.x * dt;
    m.rotation.y += u.spin.y * dt;
  }

  aimCamera(frame, dt);
  renderer.render(scene, camera);
  placeCallerBubble(frame);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
