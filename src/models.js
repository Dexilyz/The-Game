import * as THREE from 'three';

// ─── helpers ─────────────────────────────────────────────────────────────────
const M = (color, opts = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

function B(w, h, d, col) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(col));
  m.castShadow = true;
  return m;
}
function C(rt, rb, h, col, s = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), M(col));
  m.castShadow = true;
  return m;
}
function S(r, col, s = 10) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), M(col));
  m.castShadow = true;
  return m;
}
function add(parent, child, x = 0, y = 0, z = 0) {
  child.position.set(x, y, z);
  parent.add(child);
  return child;
}
function pivot(parent, x, y, z, name) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (name) g.name = name;
  parent.add(g);
  return g;
}

// ─── VISITOR ─────────────────────────────────────────────────────────────────
export function createVisitor(app) {
  const g = new THREE.Group();

  // Shadow blob
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 12),
    M(0x000000, { transparent: true, opacity: 0.2 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);

  // Shoes
  add(g, B(0.28, 0.12, 0.36, 0x1a1a1a), -0.17, 0.06, 0.04);
  add(g, B(0.28, 0.12, 0.36, 0x1a1a1a),  0.17, 0.06, 0.04);

  // Legs (pivot at hip)
  const lL = pivot(g, -0.17, 0.68, 0, 'lLeg');
  add(lL, B(0.24, 0.66, 0.24, app.pants), 0, -0.33, 0);
  const rL = pivot(g,  0.17, 0.68, 0, 'rLeg');
  add(rL, B(0.24, 0.66, 0.24, app.pants), 0, -0.33, 0);

  // Torso
  add(g, B(0.56, 0.68, 0.4, app.shirt), 0, 0.98, 0);

  // Arms (pivot at shoulder)
  const lA = pivot(g, -0.44, 1.24, 0, 'lArm');
  add(lA, B(0.2, 0.62, 0.2, app.skin), 0, -0.31, 0);
  add(lA, B(0.19, 0.19, 0.19, app.skin), 0, -0.66, 0); // hand
  const rA = pivot(g,  0.44, 1.24, 0, 'rArm');
  add(rA, B(0.2, 0.62, 0.2, app.skin), 0, -0.31, 0);
  add(rA, B(0.19, 0.19, 0.19, app.skin), 0, -0.66, 0);

  // Neck
  add(g, B(0.2, 0.18, 0.18, app.skin), 0, 1.41, 0);

  // Head group (for bob animation)
  const head = pivot(g, 0, 1.6, 0, 'head');
  add(head, B(0.5, 0.5, 0.48, app.skin));

  // Hair
  const hairStyle = app.hairStyle;
  if (hairStyle === 0) {
    // Short
    add(head, B(0.52, 0.2, 0.5, app.hair), 0, 0.2, 0);
  } else if (hairStyle === 1) {
    // Long
    add(head, B(0.52, 0.2, 0.5, app.hair), 0, 0.2, 0);
    add(head, B(0.14, 0.38, 0.5, app.hair), -0.33, -0.02, 0);
    add(head, B(0.14, 0.38, 0.5, app.hair),  0.33, -0.02, 0);
  } else if (hairStyle === 2) {
    // Curly
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      add(head, S(0.13, app.hair, 6),
        Math.cos(a) * 0.22, 0.18 + Math.sin(i) * 0.04, Math.sin(a) * 0.14);
    }
  } else {
    // Bun
    add(head, B(0.52, 0.18, 0.5, app.hair), 0, 0.18, 0);
    add(head, S(0.18, app.hair, 8), 0, 0.36, 0);
  }

  // Eyes
  add(head, B(0.1, 0.08, 0.06, 0x111111), -0.14, 0.02, 0.25);
  add(head, B(0.1, 0.08, 0.06, 0x111111),  0.14, 0.02, 0.25);
  // Eye whites
  add(head, B(0.06, 0.05, 0.04, 0xffffff), -0.15, 0.04, 0.255);
  add(head, B(0.06, 0.05, 0.04, 0xffffff),  0.15, 0.04, 0.255);
  // Mouth
  add(head, B(0.22, 0.05, 0.04, 0x553311), 0, -0.1, 0.25);
  // Cheeks
  const cheekM = M(0xffaaaa, { transparent: true, opacity: 0.45 });
  add(head, new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), cheekM), -0.2, -0.05, 0.247);
  add(head, new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), cheekM),  0.2, -0.05, 0.247);

  // Accessory
  if (app.acc === 'balloon') {
    const rArm2 = g.getObjectByName('rArm');
    add(g, C(0.01, 0.01, 0.9, 0xaaaaaa, 4), 0.46, 1.9, 0);
    const bal = S(0.28, app.accCol, 8);
    bal.scale.y = 1.2;
    add(g, bal, 0.46, 2.6, 0);
  } else if (app.acc === 'hat') {
    add(head, B(0.62, 0.06, 0.62, app.hatCol), 0, 0.29, 0);
    add(head, B(0.4, 0.32, 0.4, app.hatCol), 0, 0.47, 0);
  } else if (app.acc === 'ice_cream') {
    const rhand = g.getObjectByName('rArm');
    add(g, B(0.12, 0.38, 0.12, 0xd4a96a), 0.46, 0.62, 0); // cone
    const sc = S(0.14, 0xFF69B4, 8);
    add(g, sc, 0.46, 0.86, 0);
  }

  return g;
}

// ─── BUILDER ─────────────────────────────────────────────────────────────────
export function createBuilder(app) {
  const g = createVisitor({ ...app, shirt: app.vest });

  // Hard hat on head
  const head = g.getObjectByName('head');
  if (head) {
    add(head, B(0.58, 0.06, 0.58, app.hard), 0, 0.28, 0); // brim
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      M(app.hard)
    );
    dome.castShadow = true;
    add(head, dome, 0, 0.28, 0);
    add(head, B(0.52, 0.06, 0.44, 0xffffff), 0, 0.16, 0); // safety stripe
  }

  // Yellow safety stripes on vest
  add(g, B(0.58, 0.06, 0.42, 0xf1c40f), 0, 1.12, 0);
  add(g, B(0.58, 0.06, 0.42, 0xf1c40f), 0, 0.84, 0);

  // Tool (wrench) in hand
  add(g, B(0.1, 0.5, 0.1, 0x7f8c8d), -0.5, 0.7, 0);
  add(g, B(0.3, 0.1, 0.1, 0x95a5a6), -0.5, 0.95, 0);

  return g;
}

// ─── INVESTOR ────────────────────────────────────────────────────────────────
export function createInvestor(app) {
  const g = createVisitor({ ...app, shirt: 0xffffff });

  // Suit jacket
  add(g, B(0.6, 0.7, 0.43, app.suit), 0, 0.97, 0);
  // Lapels
  add(g, B(0.14, 0.5, 0.44, app.suit), -0.2, 1.0, 0);
  add(g, B(0.14, 0.5, 0.44, app.suit),  0.2, 1.0, 0);
  // White shirt
  add(g, B(0.2, 0.44, 0.44, 0xffffff), 0, 0.97, 0);
  // Tie
  add(g, B(0.12, 0.44, 0.44, app.tie), 0, 0.97, 0);
  // Pocket square
  add(g, B(0.06, 0.08, 0.44, 0xf1c40f), 0.24, 1.2, 0);

  // Briefcase
  const bc = pivot(g, 0.56, 0.75, 0, 'briefcase');
  add(bc, B(0.42, 0.32, 0.16, 0x8B6914));
  add(bc, B(0.22, 0.06, 0.08, 0x6a4f10), 0, 0.19, 0); // handle
  add(bc, B(0.06, 0.09, 0.12, 0xf1c40f)); // clasp

  // Golden aura glow
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 16, 16),
    M(0xffd700, { transparent: true, opacity: 0.07, side: THREE.BackSide })
  );
  aura.position.y = 1.0;
  aura.name = 'aura';
  g.add(aura);

  return g;
}

// ─── CHARACTER ANIMATION ─────────────────────────────────────────────────────
export function animateCharacter(root, dt, isWalking, isWorking = false) {
  const d = root.userData;
  d.t = (d.t || 0) + dt;

  const t     = d.t;
  const swing = isWalking ? Math.sin(t * 5) * 0.55 : (isWorking ? 0 : Math.sin(t * 0.8) * 0.02);
  const bob   = isWalking ? Math.abs(Math.sin(t * 5)) * 0.04 : 0;

  const lL = root.getObjectByName('lLeg');
  const rL = root.getObjectByName('rLeg');
  const lA = root.getObjectByName('lArm');
  const rA = root.getObjectByName('rArm');
  const hd = root.getObjectByName('head');

  if (lL) lL.rotation.x = -swing;
  if (rL) rL.rotation.x =  swing;
  if (lA) lA.rotation.x =  swing;
  if (rA) rA.rotation.x =  isWorking ? (-0.9 + Math.sin(t * 8) * 0.9) : -swing;
  if (hd) hd.position.y = 1.6 + bob;

  root.position.y = bob;

  // Aura pulse for investors
  const aura = root.getObjectByName('aura');
  if (aura) {
    aura.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    aura.material.opacity = 0.05 + Math.sin(t * 2) * 0.03;
  }
}

// ─── FERRIS WHEEL ────────────────────────────────────────────────────────────
export function createFerrisWheel(col) {
  const g = new THREE.Group();

  // Base platform
  add(g, B(4.5, 0.3, 3.5, 0x95a5a6), 0, 0.15, 0);

  // Support legs
  const legM = M(0x7f8c8d);
  for (const [x, rz] of [[-1.8, 0.28], [1.8, -0.28]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7, 8), legM);
    leg.castShadow = true;
    add(g, leg, x, 3.8, 0);
    leg.rotation.z = rz;
  }
  // Crossbar
  add(g, B(4, 0.18, 0.18, 0x7f8c8d), 0, 6.7, 0);

  // Hub (pivot for rotation)
  const hub = pivot(g, 0, 6.7, 0, 'wheel');

  // Outer rim (torus)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.14, 8, 30), M(col));
  rim.castShadow = true;
  hub.add(rim);
  // Inner ring
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 8, 20), M(col));
  hub.add(rim2);

  // Spokes + gondolas
  for (let i = 0; i < 8; i++) {
    const a  = (i / 8) * Math.PI * 2;
    const sp = pivot(hub, 0, 0, 0);
    sp.rotation.z = a;
    add(sp, B(0.1, 3.0, 0.1, col), 0, 1.5, 0);

    const gondMount = pivot(hub, Math.cos(a) * 3.0, Math.sin(a) * 3.0, 0);
    gondMount.rotation.z = -a; // keep level
    add(gondMount, B(0.55, 0.4, 0.55, i % 2 === 0 ? 0xe74c3c : 0x3498db), 0, -0.35, 0);
    add(gondMount, B(0.03, 0.35, 0.03, 0x888888), 0, -0.17, 0);
    const pass = S(0.13, 0xFDDBB4, 6);
    add(gondMount, pass, 0, -0.48, 0);
  }

  // Decorative lights
  const lightM = M(0xf1c40f, { emissive: 0xf1c40f, emissiveIntensity: 0.8 });
  for (let i = 0; i < 16; i++) {
    const a  = (i / 16) * Math.PI * 2;
    const lt = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), lightM);
    lt.position.set(Math.cos(a) * 3.05, Math.sin(a) * 3.05, 0);
    hub.add(lt);
  }

  return g;
}

// ─── CAROUSEL ────────────────────────────────────────────────────────────────
export function createCarousel(col) {
  const g = new THREE.Group();

  // Platform
  add(g, B(4, 0.25, 4, 0x95a5a6), 0, 0.12, 0);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.25, 20), M(0xecf0f1));
  plat.receiveShadow = true;
  add(g, plat, 0, 0.38, 0);

  // Center pole
  add(g, C(0.16, 0.16, 4.5, 0x8B6914, 8), 0, 2.62, 0);

  // Rotating top
  const top = pivot(g, 0, 4.9, 0, 'top');

  // Segmented cone canopy
  const seg = 8;
  const colors = [col, 0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c];
  for (let i = 0; i < seg; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 1.8, 2, 1, false, (i / seg) * Math.PI * 2, Math.PI * 2 / seg),
      M(colors[i % colors.length])
    );
    cone.castShadow = true;
    top.add(cone);
  }
  add(top, S(0.24, 0xf1c40f, 8), 0, 0.9, 0);

  // Horses on arms
  for (let i = 0; i < 4; i++) {
    const a  = (i / 4) * Math.PI * 2;
    const rx = Math.cos(a) * 1.9, rz = Math.sin(a) * 1.9;
    add(top, C(0.04, 0.04, 1.2, 0x8B6914, 4), rx, -1.2, rz); // hanging rod
    const horse = createHorse(i % 2 === 0 ? 0xffffff : 0xf4d03f);
    horse.position.set(rx, -2.1, rz);
    horse.userData.phase = (i / 4) * Math.PI * 2;
    horse.name = `horse_${i}`;
    top.add(horse);
  }

  // Decorative flags
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(top, B(0.22, 0.2, 0.06, colors[i % colors.length]),
      Math.cos(a) * 2.35, -0.88, Math.sin(a) * 2.35);
  }

  return g;
}

function createHorse(col) {
  const g = new THREE.Group();
  add(g, B(0.72, 0.4, 0.36, col));
  const head = B(0.3, 0.34, 0.3, col);
  head.rotation.z = -0.4;
  add(g, head, 0.38, 0.22, 0);
  // Legs
  for (const [x, z] of [[-0.22, 0.1], [0.22, 0.1], [-0.22, -0.1], [0.22, -0.1]]) {
    add(g, B(0.12, 0.42, 0.12, col), x, -0.38, z);
    add(g, B(0.13, 0.1, 0.16, 0x3d3d3d), x, -0.62, z);
  }
  add(g, B(0.12, 0.36, 0.12, 0xe67e22), 0.3, 0.34, 0); // mane
  add(g, C(0.04, 0.04, 1.6, 0xc0392b, 4), 0, 0.8, 0); // pole
  return g;
}

// ─── ROLLER COASTER ──────────────────────────────────────────────────────────
export function createRollerCoaster(col) {
  const g = new THREE.Group();

  // Support pillars
  for (let i = 0; i <= 5; i++) {
    const f = i / 5;
    const h = 1.5 + Math.sin(f * Math.PI) * 5.5;
    const x = -7 + f * 14;
    add(g, C(0.13, 0.16, h, 0x95a5a6, 6), x, h / 2, 0);
  }

  // Build track curve
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const f = i / 40;
    pts.push(new THREE.Vector3(
      -7 + f * 14,
      1.4 + Math.sin(f * Math.PI) * 5.5 + Math.sin(f * Math.PI * 3) * 0.9,
      Math.sin(f * Math.PI * 2) * 0.6
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false);

  // Rails (2 parallel)
  for (const off of [-0.2, 0.2]) {
    const railPts = pts.map((p, i) => {
      const tan   = curve.getTangent(i / 40);
      const right = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
      return new THREE.Vector3(p.x + right.x * off, p.y, p.z + right.z * off);
    });
    const rc  = new THREE.CatmullRomCurve3(railPts);
    const geo = new THREE.TubeGeometry(rc, 80, 0.065, 6, false);
    const rail = new THREE.Mesh(geo, M(col));
    rail.castShadow = true;
    g.add(rail);
  }

  // Cross-ties
  for (let i = 0; i < 20; i++) {
    const t  = i / 20;
    const p  = curve.getPoint(t);
    const tn = curve.getTangent(t);
    const tie = B(0.5, 0.08, 0.08, 0x8B6914);
    tie.position.copy(p);
    tie.lookAt(p.clone().add(tn));
    g.add(tie);
  }

  // Car (animated along track)
  const car = new THREE.Group();
  car.name = 'car';
  add(car, B(1.3, 0.52, 0.84, 0xe74c3c), 0, 0.26, 0);
  // Windows
  for (let s = 0; s < 3; s++) {
    add(car, B(0.26, 0.26, 0.12, 0x87ceeb), -0.38 + s * 0.38, 0.36, 0.44);
    add(car, S(0.13, 0xFDDBB4, 6), -0.38 + s * 0.38, 0.52, 0.4);
  }
  // Wheels
  for (const [wx, wz] of [[-0.42, 0.42], [0.42, 0.42], [-0.42, -0.42], [0.42, -0.42]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), M(0x2c2c2c));
    wh.rotation.x = Math.PI / 2;
    add(car, wh, wx, 0.06, wz);
  }
  g.add(car);
  g.userData.curve = curve;
  g.userData.carT  = 0;

  return g;
}

// ─── FOOD STALL ──────────────────────────────────────────────────────────────
export function createFoodStall(col) {
  const g = new THREE.Group();
  add(g, B(3.6, 0.85, 1.85, 0xd4a96a), 0, 0.42, 0);
  add(g, B(3.65, 0.12, 1.9, 0x8B6914), 0, 0.9, 0); // counter top
  add(g, B(3.6, 2.1, 0.16, 0xc8a870), 0, 1.88, -0.92); // back wall

  // Striped awning
  for (let i = 0; i < 5; i++) {
    const stripe = B(0.7, 0.09, 1.25, i % 2 === 0 ? col : 0xffffff);
    stripe.rotation.x = -0.28;
    add(g, stripe, -1.4 + i * 0.7, 3.0, 0.5);
  }
  add(g, C(0.05, 0.05, 2.15, 0x888888), -1.72, 1.9, 0.84);
  add(g, C(0.05, 0.05, 2.15, 0x888888),  1.72, 1.9, 0.84);

  // Sign
  add(g, B(2.1, 0.48, 0.1, col), 0, 3.25, -0.87);
  // Menu board
  add(g, B(1.6, 0.95, 0.1, 0x2c3e50), 0, 2.2, -0.87);

  // Food items
  const fCols = [0xd4a96a, 0x3498db, 0xf1c40f];
  for (let i = 0; i < 3; i++) {
    add(g, B(0.32, 0.28, 0.32, fCols[i]), -0.72 + i * 0.72, 1.04, 0.36);
  }
  // Staff
  add(g, B(0.36, 0.72, 0.26, 0xffffff), 0, 1.6, -0.62);
  add(g, S(0.2, 0xF4A460, 8), 0, 2.12, -0.62);
  add(g, B(0.06, 0.06, 0.06, 0x1a1a1a), -0.06, 2.16, -0.44); // eye
  add(g, B(0.06, 0.06, 0.06, 0x1a1a1a),  0.06, 2.16, -0.44);

  return g;
}

// ─── GAME BOOTH ──────────────────────────────────────────────────────────────
export function createGameBooth(col) {
  const g = new THREE.Group();
  add(g, B(1.85, 2.25, 1.55, 0xd4a96a), 0, 1.12, 0);
  add(g, B(1.87, 2.28, 0.16, 0xc8a870), 0, 1.12, -0.78); // back
  add(g, B(1.9, 0.14, 0.65, 0x8B6914), 0, 1.06, 0.5);  // counter
  add(g, B(2.05, 0.1, 0.95, col), 0, 2.38, 0.22);    // awning
  // Targets
  for (let i = 0; i < 3; i++) {
    const x = -0.52 + i * 0.52;
    for (const [r, c] of [[0.14, 0xe74c3c], [0.09, 0xffffff], [0.04, 0xe74c3c]]) {
      const t = new THREE.Mesh(new THREE.CircleGeometry(r, 12), M(c));
      t.position.set(x, 1.88, -0.72);
      g.add(t);
    }
  }
  // Prizes
  for (let i = 0; i < 3; i++) {
    add(g, S(0.16, [0xe74c3c, 0xf1c40f, 0x3498db][i], 6), -0.44 + i * 0.44, 2.1, -0.64);
    add(g, B(0.22, 0.28, 0.22, [0xe74c3c, 0xf1c40f, 0x3498db][i]), -0.44 + i * 0.44, 1.84, -0.64);
  }
  return g;
}

// ─── ICE CREAM CART ──────────────────────────────────────────────────────────
export function createIceCreamCart(col) {
  const g = new THREE.Group();
  add(g, B(1.35, 0.95, 0.95, 0xecf0f1), 0, 0.78, 0);
  add(g, B(1.37, 0.16, 0.97, col), 0, 0.98, 0); // stripe
  // Wheels
  for (const wx of [-0.46, 0.46]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.12, 10), M(0x555555));
    wh.rotation.x = Math.PI / 2;
    add(g, wh, wx, 0.26, 0.5);
  }
  add(g, C(0.04, 0.04, 0.32, 0x888888, 4), 0, 0.16, -0.42); // back leg
  // Scoops
  const sc = [0xFF69B4, 0x87ceeb, 0x90ee90];
  for (let i = 0; i < 3; i++) {
    const s = S(0.2, sc[i], 8);
    s.scale.y = 0.9;
    add(g, s, -0.3 + i * 0.3, 1.42, 0);
  }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 8), M(0xd4a96a));
  add(g, cone, 0, 1.14, 0);
  // Parasol
  add(g, C(0.04, 0.04, 1.85, 0x888888, 4), 0.42, 1.7, -0.1);
  const pCols = [col, 0xf1c40f, 0xe74c3c, col, 0xf1c40f, 0xe74c3c];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const seg = B(0.42, 0.04, 0.08, pCols[i]);
    seg.position.set(0.42 + Math.cos(a) * 0.36, 2.6, -0.1 + Math.sin(a) * 0.13);
    seg.rotation.y = a; seg.rotation.z = 0.3;
    g.add(seg);
  }
  add(g, S(0.08, 0xffffff, 6), 0.42, 2.65, -0.1);
  return g;
}

// ─── HAUNTED HOUSE ───────────────────────────────────────────────────────────
export function createHauntedHouse(col) {
  const g = new THREE.Group();

  // Main body
  add(g, B(5, 4.6, 4.6, 0x2c3e50), 0, 2.3, 0);
  // Tower
  add(g, B(2.3, 6.6, 2.3, 0x1a252f), -1.4, 3.3, 0);
  // Roofs
  const roof1 = new THREE.Mesh(new THREE.ConeGeometry(3.85, 2.6, 4), M(0x1a252f));
  roof1.rotation.y = Math.PI / 4;
  add(g, roof1, 0, 5.9, 0);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.45, 3.1, 4), M(0x0d1117));
  spire.rotation.y = Math.PI / 4;
  add(g, spire, -1.4, 7.85, 0);
  add(g, C(0.04, 0.04, 1.3, 0x555555, 4), -1.4, 10.0, 0); // spike

  // Glowing windows
  const winM = M(0xffcc00, { emissive: 0xffcc00, emissiveIntensity: 0.85 });
  for (const [x, y, z] of [[1.5,2.5,2.32],[-0.5,2.5,2.32],[1.5,4.0,2.32],[-1.4,5.1,1.22],[-1.4,3.2,1.22]]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.22), winM);
    win.position.set(x, y, z);
    g.add(win);
  }
  const roseM = M(0x9b59b6, { emissive: 0x9b59b6, emissiveIntensity: 0.7 });
  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.48, 12), roseM);
  rose.position.set(0, 4.55, 2.33);
  g.add(rose);

  // Door
  add(g, B(0.95, 1.65, 0.22, 0x0d1117), 0, 0.82, 2.32);

  // Inner light
  const light = new THREE.PointLight(0xffcc00, 0.9, 7);
  light.position.set(0, 2.5, 1.5);
  g.add(light);

  // Ghost
  const ghost = new THREE.Group();
  ghost.name = 'ghost';
  const ghostM = M(0xecf0f1, { transparent: true, opacity: 0.78 });
  const gb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), ghostM);
  gb.position.y = 0.15;
  ghost.add(gb);
  const gt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.52, 8, 1, true), ghostM);
  gt.rotation.x = Math.PI;
  ghost.add(gt);
  add(ghost, B(0.1, 0.08, 0.1, 0x2c3e50), -0.14, 0.18, 0.34);
  add(ghost, B(0.1, 0.08, 0.1, 0x2c3e50),  0.14, 0.18, 0.34);
  ghost.position.set(2.6, 7.2, 0);
  g.add(ghost);

  return g;
}

// ─── BALLOON RIDE ────────────────────────────────────────────────────────────
export function createBalloonRide(col) {
  const g = new THREE.Group();

  // Platform
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.3, 16), M(0x95a5a6));
  add(g, plat, 0, 0.15, 0);
  add(g, C(0.26, 0.26, 4.1, 0x7f8c8d), 0, 2.35, 0); // pole

  // Rotating arm
  const arm = pivot(g, 0, 4.4, 0, 'arm');
  add(arm, B(4, 0.15, 0.15, 0x8B6914), 2, 0, 0); // arm bar

  // Gondola at arm tip
  const gond = pivot(arm, 4, -0.5, 0, 'gond');
  add(gond, B(0.94, 0.72, 0.94, 0xd4a96a), 0, -0.36, 0); // basket
  for (let i = 0; i < 3; i++) {
    add(gond, B(0.02, 0.72, 0.96, 0xa0785a), -0.3 + i * 0.3, -0.36, 0); // weave
  }

  // Balloon envelope (4 colored sectors)
  const bCols = [col, 0xf1c40f, 0xe74c3c, 0x3498db];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 8, 8, (i / 4) * Math.PI * 2, Math.PI / 2),
      M(bCols[i])
    );
    seg.position.y = 1.25;
    gond.add(seg);
  }
  add(gond, S(0.26, 0xffffff, 8), 0, 2.15, 0); // top cap

  // Highlight
  const hiM = M(0xffffff, { transparent: true, opacity: 0.22 });
  const hi = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), hiM);
  hi.position.set(-0.3, 1.55, 0.55);
  gond.add(hi);

  // Ropes
  for (let i = 0; i < 4; i++) {
    const a  = (i / 4) * Math.PI * 2;
    const rp = C(0.02, 0.02, 1.52, 0x888888, 4);
    rp.position.set(Math.cos(a) * 0.5, 0.52, Math.sin(a) * 0.5);
    rp.rotation.z = Math.cos(a) * 0.38; rp.rotation.x = Math.sin(a) * 0.38;
    gond.add(rp);
  }
  // Passenger
  add(gond, S(0.22, 0xFDDBB4, 8), 0, 0.1, 0);

  return g;
}

// ─── ANIMATE ATTRACTIONS ─────────────────────────────────────────────────────
export function animateAttraction(g, dt, state) {
  const d = g.userData;
  d.t = (d.t || 0) + dt;
  const speed = state === 'open' ? 1 : 0.08;
  const t     = d.t;

  // Ferris wheel
  const wheel = g.getObjectByName('wheel');
  if (wheel) wheel.rotation.z += dt * 0.38 * speed;

  // Carousel top
  const top = g.getObjectByName('top');
  if (top) {
    top.rotation.y += dt * 1.1 * speed;
    for (let i = 0; i < 4; i++) {
      const h = top.getObjectByName(`horse_${i}`);
      if (h) h.position.y = -2.1 + Math.sin(t * 2 + (h.userData.phase || 0)) * 0.32;
    }
  }

  // Roller coaster car
  const car = g.getObjectByName('car');
  if (car && g.userData.curve) {
    d.carT = ((d.carT || 0) + dt * 0.13 * speed) % 1;
    const p  = g.userData.curve.getPoint(d.carT);
    const tn = g.userData.curve.getTangent(d.carT);
    car.position.copy(p);
    car.lookAt(p.clone().add(tn));
  }

  // Balloon ride arm
  const arm = g.getObjectByName('arm');
  if (arm) arm.rotation.y += dt * 0.42 * speed;

  // Ghost float
  const ghost = g.getObjectByName('ghost');
  if (ghost) {
    ghost.position.y = 7.2 + Math.sin(t * 1.5) * 0.55;
    ghost.rotation.y = t * 0.3;
    ghost.children.forEach(c => { if (c.material?.opacity !== undefined) c.material.opacity = 0.65 + Math.sin(t * 2) * 0.18; });
  }

  // Aura on glow light in haunted house
  const light = g.children.find(c => c.isLight);
  if (light) light.intensity = 0.8 + Math.sin(t * 3) * 0.4;
}

// ─── TILE MODELS ─────────────────────────────────────────────────────────────
export function createPathTile(T3D) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(T3D - 0.06, 0.14, T3D - 0.06),
    M(0xc8b89a)
  );
  m.receiveShadow = true;
  // Groove lines
  const lineM = M(0xb5a58a);
  for (const off of [-T3D * 0.24, T3D * 0.24]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, T3D - 0.08), lineM);
    l.position.x = off;
    m.add(l);
  }
  return m;
}

export function createEntranceTile(T3D) {
  const g = new THREE.Group();
  const stripes = 4;
  for (let i = 0; i < stripes; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(T3D / stripes - 0.02, 0.15, T3D),
      M(i % 2 === 0 ? 0xf39c12 : 0xd4b483)
    );
    s.position.x = -T3D / 2 + (i + 0.5) * T3D / stripes;
    g.add(s);
  }
  g.receiveShadow = true;
  return g;
}

export function createTree() {
  const g = new THREE.Group();
  add(g, C(0.22, 0.28, 1.2, 0x8B6914, 6), 0, 0.6, 0); // trunk
  add(g, S(0.7, 0x2d8a4e, 8), 0, 1.85, 0);             // main crown
  add(g, S(0.44, 0x3da85e, 8), -0.38, 1.6, 0.2);       // side tuft L
  add(g, S(0.44, 0x3da85e, 8),  0.38, 1.5, -0.1);      // side tuft R
  add(g, S(0.3, 0x4ab060, 6), 0, 2.35, 0.15);          // top
  return g;
}

export function createAttractionModel(typeId, col) {
  switch (typeId) {
    case 'ferris_wheel':   return createFerrisWheel(col);
    case 'carousel':       return createCarousel(col);
    case 'roller_coaster': return createRollerCoaster(col);
    case 'food_stall':     return createFoodStall(col);
    case 'game_booth':     return createGameBooth(col);
    case 'ice_cream':      return createIceCreamCart(col);
    case 'haunted_house':  return createHauntedHouse(col);
    case 'balloon_ride':   return createBalloonRide(col);
    default: {
      const g = new THREE.Group();
      add(g, B(2, 2, 2, col), 0, 1, 0);
      return g;
    }
  }
}
