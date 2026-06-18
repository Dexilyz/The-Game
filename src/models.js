import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';

// ─── PBR Material factory ─────────────────────────────────────────────────────
const M   = (color, r=0.65, m=0.0)  => new THREE.MeshStandardMaterial({ color, roughness:r, metalness:m });
const Mm  = (color, r=0.22)          => new THREE.MeshStandardMaterial({ color, roughness:r, metalness:0.9 });
const Me  = (color, i=1.0)           => new THREE.MeshStandardMaterial({ color, emissive:new THREE.Color(color), emissiveIntensity:i, roughness:0.45 });
const Mg  = (color, op=0.5)          => new THREE.MeshStandardMaterial({ color, roughness:0.04, metalness:0.05, transparent:true, opacity:op });
const Mtr = (color, op=0.82)         => new THREE.MeshStandardMaterial({ color, roughness:0.7, transparent:true, opacity:op });

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function mk(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function box(w, h, d, mat) { return mk(new THREE.BoxGeometry(w, h, d), mat); }
function cyl(rt, rb, h, mat, s=12) { return mk(new THREE.CylinderGeometry(rt, rb, h, s), mat); }
function sph(r, mat, sw=20, sh=16) { return mk(new THREE.SphereGeometry(r, sw, sh), mat); }
function tor(r, tube, mat, rs=8, ts=24) { return mk(new THREE.TorusGeometry(r, tube, rs, ts), mat); }
function place(parent, child, x=0, y=0, z=0) {
  child.position.set(x, y, z);
  parent.add(child);
  return child;
}
function grp(parent, x=0, y=0, z=0, name) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (name) g.name = name;
  if (parent) parent.add(g);
  return g;
}

// ─── VISITOR ─────────────────────────────────────────────────────────────────
export function createVisitor(app) {
  const root = new THREE.Group();

  // Shadow blob
  const shadow = mk(new THREE.CircleGeometry(0.52, 16), Mg(0x000000, 0.18));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.008;
  root.add(shadow);

  const skinM  = M(app.skin, 0.7, 0.0);
  const pantsM = M(app.pants, 0.8, 0.0);
  const shirtM = M(app.shirt, 0.75, 0.0);
  const shoeM  = M(0x222222, 0.5, 0.1);
  const hairM  = M(app.hair, 0.9, 0.0);

  // Shoes
  const shoeL = box(0.26, 0.11, 0.38, shoeM);
  shoeL.position.set(-0.16, 0.055, 0.03);
  root.add(shoeL);
  const shoeR = box(0.26, 0.11, 0.38, shoeM);
  shoeR.position.set( 0.16, 0.055, 0.03);
  root.add(shoeR);

  // Legs (tapered cylinder for pants)
  const lLeg = grp(root, -0.16, 0.72, 0, 'lLeg');
  place(lLeg, mk(new THREE.CylinderGeometry(0.13, 0.15, 0.70, 12), pantsM), 0, -0.35, 0);
  const rLeg = grp(root,  0.16, 0.72, 0, 'rLeg');
  place(rLeg, mk(new THREE.CylinderGeometry(0.13, 0.15, 0.70, 12), pantsM), 0, -0.35, 0);

  // Torso: tapered cylinder
  place(root, mk(new THREE.CylinderGeometry(0.28, 0.24, 0.78, 14), shirtM), 0, 1.02, 0);
  // Shoulder plate
  place(root, mk(new THREE.CylinderGeometry(0.32, 0.28, 0.18, 14), shirtM), 0, 1.48, 0);

  // Arms
  const lArm = grp(root, -0.42, 1.38, 0, 'lArm');
  place(lArm, mk(new THREE.CylinderGeometry(0.09, 0.11, 0.52, 10), shirtM), 0, -0.22, 0);
  place(lArm, mk(new THREE.CylinderGeometry(0.08, 0.09, 0.22, 10), skinM), 0, -0.58, 0);
  place(lArm, sph(0.10, skinM, 10, 8), 0, -0.72, 0);

  const rArm = grp(root,  0.42, 1.38, 0, 'rArm');
  place(rArm, mk(new THREE.CylinderGeometry(0.09, 0.11, 0.52, 10), shirtM), 0, -0.22, 0);
  place(rArm, mk(new THREE.CylinderGeometry(0.08, 0.09, 0.22, 10), skinM), 0, -0.58, 0);
  place(rArm, sph(0.10, skinM, 10, 8), 0, -0.72, 0);

  // Neck
  place(root, mk(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 10), skinM), 0, 1.62, 0);

  // Head group
  const head = grp(root, 0, 1.84, 0, 'head');
  place(head, sph(0.44, skinM, 24, 20));

  // Hair dome
  const hStyle = app.hairStyle || 0;
  if (hStyle === 0) {
    const dome = mk(new THREE.SphereGeometry(0.46, 20, 10, 0, Math.PI*2, 0, Math.PI*0.55), hairM);
    place(head, dome, 0, 0.02, 0);
  } else if (hStyle === 1) {
    const dome = mk(new THREE.SphereGeometry(0.46, 20, 10, 0, Math.PI*2, 0, Math.PI*0.55), hairM);
    place(head, dome, 0, 0.02, 0);
    place(head, mk(new THREE.CylinderGeometry(0.12, 0.18, 0.42, 8), hairM), -0.32, -0.14, 0);
    place(head, mk(new THREE.CylinderGeometry(0.12, 0.18, 0.42, 8), hairM),  0.32, -0.14, 0);
  } else if (hStyle === 2) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      place(head, sph(0.16, hairM, 8, 6), Math.cos(a) * 0.30, 0.16 + Math.abs(Math.sin(i * 1.3)) * 0.1, Math.sin(a) * 0.22);
    }
    place(head, sph(0.20, hairM, 8, 6), 0, 0.38, 0);
  } else {
    const dome = mk(new THREE.SphereGeometry(0.46, 20, 10, 0, Math.PI*2, 0, Math.PI*0.5), hairM);
    place(head, dome, 0, 0.02, 0);
    place(head, sph(0.20, hairM, 12, 10), 0, 0.46, -0.12);
  }

  // Eyes - whites + iris + pupil + highlight
  for (const sx of [-0.16, 0.16]) {
    const eGrp = grp(head, sx, 0.06, 0.39);
    place(eGrp, sph(0.095, M(0xffffff, 0.3), 12, 10));
    place(eGrp, sph(0.062, M(0x3a6fa8, 0.5), 10, 8), 0, 0, 0.04);
    place(eGrp, sph(0.038, M(0x0a0a0a, 0.3), 8, 6), 0, 0, 0.065);
    place(eGrp, sph(0.016, M(0xffffff, 0.1), 6, 4), 0.022, 0.022, 0.082);
  }

  // Eyebrows
  place(head, box(0.14, 0.032, 0.04, hairM), -0.16, 0.18, 0.40);
  place(head, box(0.14, 0.032, 0.04, hairM),  0.16, 0.18, 0.40);

  // Nose
  place(head, sph(0.045, skinM, 8, 6), 0, -0.04, 0.43);

  // Mouth - small spheres in a smile arc
  const mouthM = M(0x662211, 0.8);
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + (i / 4) * 1.0;
    place(head, sph(0.030, mouthM, 6, 4),
      Math.sin(a) * 0.10,
      -0.16 - Math.cos(a) * 0.03,
      0.42
    );
  }

  // Cheeks
  const cheekM = Mtr(0xffaaaa, 0.40);
  const chkL = mk(new THREE.CircleGeometry(0.09, 10), cheekM);
  chkL.position.set(-0.26, -0.07, 0.36); chkL.rotation.y = 0.35;
  head.add(chkL);
  const chkR = mk(new THREE.CircleGeometry(0.09, 10), cheekM);
  chkR.position.set( 0.26, -0.07, 0.36); chkR.rotation.y = -0.35;
  head.add(chkR);

  // Ears
  place(head, sph(0.092, skinM, 10, 8), -0.43, -0.02, 0);
  place(head, sph(0.092, skinM, 10, 8),  0.43, -0.02, 0);

  // Accessory
  if (app.acc === 'balloon') {
    place(root, mk(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 4), Mm(0xaaaaaa, 0.4)), 0.44, 2.0, 0);
    const bal = sph(0.30, M(app.accCol || 0xe74c3c, 0.5), 14, 10);
    bal.scale.y = 1.2;
    place(root, bal, 0.44, 2.68, 0);
    const balHi = sph(0.12, Mg(0xffffff, 0.25), 8, 6);
    balHi.position.set(0.52, 2.80, 0.18);
    root.add(balHi);
  } else if (app.acc === 'hat') {
    const hatCol = app.hatCol || 0xe74c3c;
    place(head, box(0.66, 0.055, 0.66, M(hatCol, 0.7)), 0, 0.46, 0);
    place(head, mk(new THREE.CylinderGeometry(0.28, 0.32, 0.38, 12), M(hatCol, 0.7)), 0, 0.66, 0);
    place(head, mk(new THREE.CylinderGeometry(0.325, 0.325, 0.045, 12), M(0xffffff, 0.6)), 0, 0.52, 0);
  } else if (app.acc === 'ice_cream') {
    place(root, mk(new THREE.ConeGeometry(0.11, 0.36, 8), M(0xd4a96a, 0.8)), 0.44, 0.60, 0);
    place(root, sph(0.14, M(0xFF69B4, 0.6), 10, 8), 0.44, 0.84, 0);
    place(root, sph(0.10, M(0xf1c40f, 0.6), 10, 8), 0.50, 0.97, 0);
  }

  return root;
}

// ─── BUILDER ─────────────────────────────────────────────────────────────────
export function createBuilder(app) {
  const g = createVisitor({ ...app, shirt: app.vest });

  const head = g.getObjectByName('head');
  if (head) {
    const hardM = M(app.hard, 0.4, 0.05);
    place(head, box(0.62, 0.055, 0.62, hardM), 0, 0.46, 0);
    const dome = mk(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI*2, 0, Math.PI/2), hardM);
    place(head, dome, 0, 0.46, 0);
    place(head, mk(new THREE.CylinderGeometry(0.33, 0.33, 0.040, 14), M(0xffffff, 0.5)), 0, 0.52, 0);
  }

  const stripeM = Me(0xf1c40f, 0.5);
  place(g, box(0.60, 0.055, 0.44, stripeM), 0, 1.14, 0);
  place(g, box(0.60, 0.055, 0.44, stripeM), 0, 0.86, 0);

  const wrenchM = Mm(0x7f8c8d);
  place(g, mk(new THREE.CylinderGeometry(0.045, 0.045, 0.52, 8), wrenchM), -0.52, 0.66, 0);
  place(g, box(0.28, 0.08, 0.08, wrenchM), -0.52, 0.92, 0);

  return g;
}

// ─── STAFF ───────────────────────────────────────────────────────────────────
export function createStaff(app) {
  const g = createVisitor({ ...app, shirt: app.vest });

  const head = g.getObjectByName('head');
  if (head) {
    const capM = M(app.vest, 0.5, 0.05);
    const cap = mk(new THREE.SphereGeometry(0.30, 14, 8, 0, Math.PI*2, 0, Math.PI/2.4), capM);
    place(head, cap, 0, 0.40, 0);
    place(head, mk(new THREE.CylinderGeometry(0.31, 0.31, 0.035, 14), capM), 0, 0.44, 0);
  }

  const badgeM = Mm(0xf1c40f, 0.3);
  place(g, box(0.16, 0.20, 0.04, badgeM), -0.18, 1.10, 0.23);

  const clipM = Mm(0xecf0f1, 0.4);
  const board = grp(g, 0.30, 0.92, 0.05, 'board');
  place(board, box(0.26, 0.34, 0.03, clipM));
  place(board, box(0.26, 0.04, 0.03, Mm(0x95a5a6)), 0, 0.16, 0.01);

  return g;
}

// ─── INVESTOR ────────────────────────────────────────────────────────────────
export function createInvestor(app) {
  const g = createVisitor({ ...app, shirt: 0xffffff });

  const suitM = M(app.suit, 0.65);
  const tieM  = M(app.tie, 0.7);

  place(g, mk(new THREE.CylinderGeometry(0.30, 0.26, 0.80, 14), suitM), 0, 1.02, 0);
  place(g, mk(new THREE.CylinderGeometry(0.32, 0.29, 0.18, 14), suitM), 0, 1.50, 0);
  place(g, box(0.12, 0.46, 0.44, suitM), -0.18, 1.0, 0);
  place(g, box(0.12, 0.46, 0.44, suitM),  0.18, 1.0, 0);
  place(g, box(0.16, 0.44, 0.44, M(0xfafafa, 0.5)), 0, 0.97, 0);
  place(g, box(0.10, 0.40, 0.44, tieM), 0, 0.94, 0);
  place(g, box(0.05, 0.07, 0.44, Me(0xf1c40f, 0.3)), 0.22, 1.22, 0);

  const bc = grp(g, 0.58, 0.74, 0, 'briefcase');
  place(bc, box(0.44, 0.32, 0.16, M(0x8B6914, 0.5)));
  place(bc, box(0.20, 0.06, 0.08, M(0x6a4f10, 0.4)), 0, 0.19, 0);
  place(bc, box(0.06, 0.10, 0.12, Mm(0xf1c40f)));

  const aura = mk(new THREE.SphereGeometry(1.4, 16, 14), Mg(0xffd700, 0.07));
  aura.material.side = THREE.BackSide;
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
  if (rA) rA.rotation.x = isWorking ? (-0.9 + Math.sin(t * 8) * 0.9) : -swing;
  if (hd) hd.position.y = 1.84 + bob;

  root.position.y = bob;

  const aura = root.getObjectByName('aura');
  if (aura) {
    aura.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    aura.material.opacity = 0.05 + Math.sin(t * 2) * 0.03;
  }
}

// ─── FERRIS WHEEL ────────────────────────────────────────────────────────────
export function createFerrisWheel(col) {
  const g = new THREE.Group();

  // Concrete base
  place(g, mk(new THREE.BoxGeometry(5.0, 0.40, 3.8), M(0x8a9bb0, 0.9)), 0, 0.20, 0);
  place(g, mk(new THREE.BoxGeometry(4.6, 0.22, 3.4), M(0xaabbc8, 0.85)), 0, 0.51, 0);

  // Steel A-frame legs
  const legM = Mm(0x7a8fa0, 0.28);
  for (const [lx, rz] of [[-2.0, 0.26], [2.0, -0.26]]) {
    const leg = mk(new THREE.CylinderGeometry(0.13, 0.18, 7.4, 10), legM);
    leg.rotation.z = rz;
    leg.position.set(lx, 4.1, 0);
    g.add(leg);
    place(g, mk(new THREE.BoxGeometry(0.5, 0.14, 0.5), M(0x6a7f8c, 0.7)), lx + Math.sign(lx) * 0.9, 0.45, 0);
  }
  // Crossbar
  const crossbar = mk(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8), legM);
  crossbar.rotation.z = Math.PI/2;
  crossbar.position.set(0, 7.2, 0);
  g.add(crossbar);

  // Hub center
  const hub = mk(new THREE.CylinderGeometry(0.28, 0.28, 0.46, 14), Mm(0xc0c0c0));
  hub.rotation.x = Math.PI/2;
  hub.position.set(0, 7.2, 0);
  g.add(hub);

  // Wheel group (named for animation)
  const wheel = grp(g, 0, 7.2, 0, 'wheel');

  // Outer rim torus
  place(wheel, tor(3.2, 0.12, M(col, 0.3, 0.7), 10, 36));
  // Inner ring
  place(wheel, tor(1.55, 0.07, Mm(0xb0c0cc, 0.35), 8, 24));

  // 12 spokes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spk = mk(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6), Mm(0xbbc8d4, 0.4));
    spk.rotation.z = a + Math.PI/2;
    spk.position.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0);
    wheel.add(spk);
  }

  // 8 gondolas - counter-rotating mounts to stay upright
  const gondCols = [0xe74c3c, 0x3498db, 0xf39c12, 0x2ecc71, 0x9b59b6, 0xe91e63, 0x00bcd4, 0xff5722];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cx = Math.cos(a) * 3.2;
    const cy = Math.sin(a) * 3.2;

    const mount = grp(wheel, cx, cy, 0);
    mount.rotation.z = -a;

    const gCol = gondCols[i];
    place(mount, mk(new THREE.CylinderGeometry(0.28, 0.24, 0.50, 10), M(gCol, 0.5)), 0, -0.30, 0);
    place(mount, mk(new THREE.TorusGeometry(0.28, 0.04, 6, 10), M(gCol, 0.4, 0.3)), 0, -0.06, 0);
    place(mount, mk(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 4), Mm(0xaaaaaa, 0.4)), 0, 0.14, 0);
    place(mount, sph(0.12, M(0xFDDBB4, 0.7), 10, 8), 0, -0.22, 0);
  }

  // 24 LED rim lights
  const ledCols = [0xff4444, 0xffff44, 0x44ff44, 0x44aaff];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const lt = mk(new THREE.SphereGeometry(0.065, 6, 5), Me(ledCols[i % ledCols.length], 1.2));
    lt.position.set(Math.cos(a) * 3.23, Math.sin(a) * 3.23, 0.08);
    wheel.add(lt);
  }

  return g;
}

// ─── HORSE ───────────────────────────────────────────────────────────────────
function createHorse(col) {
  const g = new THREE.Group();
  const horseM = M(col, 0.65);

  const body = mk(new THREE.SphereGeometry(0.38, 12, 8), horseM);
  body.scale.set(1.0, 0.68, 0.5);
  place(g, body);

  const neck = mk(new THREE.CylinderGeometry(0.15, 0.18, 0.34, 10), horseM);
  neck.rotation.z = 0.4;
  place(g, neck, 0.34, 0.22, 0);

  const hd = mk(new THREE.SphereGeometry(0.18, 12, 8), horseM);
  hd.scale.set(1.1, 0.85, 0.7);
  place(g, hd, 0.52, 0.38, 0);

  place(g, mk(new THREE.SphereGeometry(0.10, 8, 6), horseM), 0.65, 0.30, 0);
  place(g, mk(new THREE.ConeGeometry(0.05, 0.12, 6), horseM), 0.48, 0.54, 0.06);
  place(g, mk(new THREE.ConeGeometry(0.05, 0.12, 6), horseM), 0.48, 0.54, -0.06);
  place(g, sph(0.04, M(0x111111, 0.3), 6, 5), 0.64, 0.38, 0.12);

  const legM = M(col, 0.75);
  for (const [lx, lz] of [[-0.22, 0.11], [0.18, 0.11], [-0.22, -0.11], [0.18, -0.11]]) {
    place(g, mk(new THREE.CylinderGeometry(0.065, 0.07, 0.48, 8), legM), lx, -0.44, lz);
    place(g, mk(new THREE.BoxGeometry(0.12, 0.09, 0.16), M(0x2a2a2a, 0.5)), lx, -0.71, lz);
  }

  const tailM = M(0xe67e22, 0.85);
  place(g, mk(new THREE.CylinderGeometry(0.04, 0.02, 0.38, 6), tailM), -0.38, -0.08, 0);
  for (let i = 0; i < 3; i++) {
    place(g, sph(0.08, tailM, 6, 4), 0.40 - i * 0.14, 0.30 + i * 0.04, 0.0);
  }

  place(g, mk(new THREE.CylinderGeometry(0.038, 0.038, 1.6, 8), Mm(0xc0392b, 0.3)), 0, 0.8, 0);

  return g;
}

// ─── CAROUSEL ────────────────────────────────────────────────────────────────
export function createCarousel(col) {
  const g = new THREE.Group();

  const baseM = M(0xd0c4b0, 0.85);
  place(g, mk(new THREE.CylinderGeometry(2.4, 2.5, 0.32, 8), baseM), 0, 0.16, 0);
  place(g, mk(new THREE.CylinderGeometry(2.22, 2.24, 0.14, 8), M(0xbcb0a0, 0.8)), 0, 0.37, 0);
  place(g, mk(new THREE.TorusGeometry(2.1, 0.08, 6, 20), Mm(0xd4af37, 0.3)), 0, 0.44, 0);

  const poleM = M(0x8B4513, 0.6);
  place(g, mk(new THREE.CylinderGeometry(0.17, 0.20, 4.8, 12), poleM), 0, 2.76, 0);
  for (let i = 0; i < 9; i++) {
    const ringM = i % 2 === 0 ? M(0xe74c3c, 0.5) : M(0xffffff, 0.4);
    place(g, mk(new THREE.TorusGeometry(0.20, 0.04, 5, 14), ringM), 0, 0.72 + i * 0.48, 0);
  }

  const top = grp(g, 0, 5.3, 0, 'top');

  const cCols = [col, 0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c];
  for (let i = 0; i < 8; i++) {
    const cone = mk(
      new THREE.ConeGeometry(2.6, 2.0, 2, 1, false, (i/8)*Math.PI*2, Math.PI*2/8),
      M(cCols[i], 0.5)
    );
    top.add(cone);
  }

  // Scalloped edge
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    place(top, sph(0.14, M(cCols[i % 8], 0.5), 8, 6), Math.cos(a)*2.55, -0.95, Math.sin(a)*2.55);
  }

  // Fairy lights
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    place(top, sph(0.06, Me(0xffeedd, 1.2), 6, 5), Math.cos(a)*2.52, -1.0, Math.sin(a)*2.52);
  }

  // Golden finial
  place(top, sph(0.28, M(0xd4af37, 0.2, 0.8), 14, 10), 0, 1.08, 0);
  place(top, mk(new THREE.ConeGeometry(0.14, 0.42, 8), M(0xd4af37, 0.2, 0.8)), 0, 1.58, 0);

  // 5 horses
  for (let i = 0; i < 5; i++) {
    const a   = (i / 5) * Math.PI * 2;
    const rx  = Math.cos(a) * 2.0;
    const rz  = Math.sin(a) * 2.0;
    const rod = mk(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6), Mm(0x9b7940, 0.35));
    place(top, rod, rx, -1.1, rz);
    const horse = createHorse(i % 2 === 0 ? 0xfafafa : 0xf5e0b4);
    horse.position.set(rx, -2.35, rz);
    horse.userData.phase = (i / 5) * Math.PI * 2;
    horse.name = `horse_${i}`;
    top.add(horse);
  }

  // Pennant flags
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const flag = mk(new THREE.ConeGeometry(0.10, 0.22, 3), M(cCols[i], 0.5));
    flag.rotation.z = -Math.PI/2;
    place(top, flag, Math.cos(a)*2.60, -0.82, Math.sin(a)*2.60);
  }

  return g;
}

// ─── ROLLER COASTER ──────────────────────────────────────────────────────────
export function createRollerCoaster(col) {
  const g = new THREE.Group();

  const steelM = Mm(0x8899aa, 0.25);

  // Support pillars
  for (let i = 0; i <= 6; i++) {
    const f = i / 6;
    const h = 1.6 + Math.sin(f * Math.PI) * 5.8;
    const x = -7 + f * 14;
    const pillar = mk(new THREE.CylinderGeometry(0.12, 0.16, h, 8), steelM);
    pillar.position.set(x, h/2, 0);
    g.add(pillar);
    place(g, mk(new THREE.BoxGeometry(0.5, 0.08, 0.5), M(0x6a7a8a, 0.7)), x, 0.04, 0);
  }

  // Track curve
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const f = i / 48;
    pts.push(new THREE.Vector3(
      -7 + f * 14,
      1.5 + Math.sin(f * Math.PI) * 5.8 + Math.sin(f * Math.PI * 3) * 0.85,
      Math.sin(f * Math.PI * 2) * 0.8
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false);

  // Two parallel rails
  for (const off of [-0.22, 0.22]) {
    const railPts = pts.map((p, i) => {
      const tan   = curve.getTangent(i / 48);
      const right = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0,1,0)).normalize();
      return new THREE.Vector3(p.x + right.x * off, p.y, p.z + right.z * off);
    });
    const rc  = new THREE.CatmullRomCurve3(railPts);
    const geo = new THREE.TubeGeometry(rc, 80, 0.06, 6, false);
    g.add(mk(geo, Mm(0xaabbcc, 0.25)));
  }

  // Cross-ties
  const tieM = M(0x8B6914, 0.7);
  for (let i = 0; i < 24; i++) {
    const t  = i / 24;
    const p  = curve.getPoint(t);
    const tn = curve.getTangent(t);
    const tie = mk(new THREE.BoxGeometry(0.56, 0.07, 0.07), tieM);
    tie.position.copy(p);
    tie.lookAt(p.clone().add(tn));
    g.add(tie);
  }

  // Car (animated)
  const car = grp(null, 0, 0, 0);
  car.name = 'car';

  place(car, mk(new THREE.BoxGeometry(1.4, 0.55, 0.88), M(0xe74c3c, 0.45, 0.1)), 0, 0.275, 0);
  place(car, mk(new THREE.BoxGeometry(0.40, 0.32, 0.06), Mg(0x87ceeb, 0.65)), -0.42, 0.50, 0.45);
  for (let s = 0; s < 2; s++) {
    place(car, mk(new THREE.BoxGeometry(0.26, 0.24, 0.06), Mg(0x87ceeb, 0.60)), -0.06 + s*0.40, 0.46, 0.46);
  }
  for (let s = 0; s < 3; s++) {
    place(car, sph(0.12, M(0xFDDBB4, 0.7), 10, 8), -0.38 + s * 0.38, 0.56, 0.38);
  }
  const wheelM = Mm(0x2a2a2a, 0.5);
  const hubM   = Mm(0xcccccc, 0.2);
  for (const [wx, wz] of [[-0.44, 0.44],[0.44, 0.44],[-0.44,-0.44],[0.44,-0.44]]) {
    const wh = mk(new THREE.CylinderGeometry(0.16, 0.16, 0.10, 10), wheelM);
    wh.rotation.x = Math.PI/2;
    place(car, wh, wx, 0.06, wz);
    place(car, sph(0.07, hubM, 8, 6), wx, 0.06, wz + (wz > 0 ? 0.07 : -0.07));
  }
  place(car, mk(new THREE.BoxGeometry(1.2, 0.06, 0.06), M(0xf1c40f, 0.4, 0.3)), 0, 0.60, 0.40);

  g.add(car);
  g.userData.curve = curve;
  g.userData.carT  = 0;

  return g;
}

// ─── FOOD STALL ──────────────────────────────────────────────────────────────
export function createFoodStall(col) {
  const g = new THREE.Group();

  const wallM    = M(0xfcf3e4, 0.9);
  const woodM    = M(0xb5835a, 0.7);
  const counterM = M(0x8B6914, 0.5);

  place(g, mk(new THREE.BoxGeometry(3.8, 2.6, 0.18), wallM), 0, 1.62, -0.94);
  place(g, mk(new THREE.BoxGeometry(0.18, 2.6, 2.0), wallM), -1.86, 1.62, 0);
  place(g, mk(new THREE.BoxGeometry(0.18, 2.6, 2.0), wallM),  1.86, 1.62, 0);
  place(g, mk(new THREE.BoxGeometry(3.8, 0.10, 2.0), M(0xc8b89a, 0.85)), 0, 0.05, 0);
  place(g, mk(new THREE.BoxGeometry(3.6, 0.84, 1.84), woodM), 0, 0.42, 0);
  place(g, mk(new THREE.BoxGeometry(3.66, 0.10, 1.90), counterM), 0, 0.90, 0);
  place(g, mk(new THREE.BoxGeometry(4.3, 0.16, 2.6), M(0x8B4513, 0.7)), 0, 3.0, 0);
  place(g, mk(new THREE.BoxGeometry(4.3, 0.10, 0.20), M(0x6a3410, 0.6)), 0, 2.93, 1.4);

  for (let i = 0; i < 5; i++) {
    const awM = M(i % 2 === 0 ? col : 0xfafafa, 0.6);
    const panel = mk(new THREE.BoxGeometry(0.74, 0.08, 1.3), awM);
    panel.rotation.x = -0.32;
    place(g, panel, -1.48 + i * 0.74, 2.88, 1.14);
  }

  for (const cx of [-1.72, 1.72]) {
    place(g, mk(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8), woodM), cx, 1.98, 0.88);
  }

  place(g, mk(new THREE.BoxGeometry(2.2, 0.52, 0.12), Me(col, 0.60)), 0, 3.32, -0.88);
  place(g, mk(new THREE.BoxGeometry(2.34, 0.66, 0.10), Mm(0xd4af37, 0.3)), 0, 3.32, -0.89);
  place(g, mk(new THREE.BoxGeometry(1.7, 1.0, 0.10), M(0x1a2a3a, 0.3)), 0, 1.92, -0.90);
  place(g, mk(new THREE.BoxGeometry(2.0, 0.12, 0.18), woodM), 0, 1.45, 0.92);

  const fCols = [0xFF69B4, 0x3aacff, 0xf4ea5a, 0x82c552];
  for (let i = 0; i < 4; i++) {
    place(g, mk(new THREE.CylinderGeometry(0.13, 0.10, 0.22, 8), M(0xf0ece0, 0.7)), -0.54 + i * 0.36, 1.06, 0.50);
    place(g, sph(0.16, M(fCols[i], 0.5), 10, 8), -0.54 + i * 0.36, 1.26, 0.50);
  }

  return g;
}

// ─── GAME BOOTH ──────────────────────────────────────────────────────────────
export function createGameBooth(col) {
  const g = new THREE.Group();

  const wallM = M(0xfcf3e4, 0.9);
  const woodM = M(0xb5835a, 0.7);

  place(g, mk(new THREE.BoxGeometry(2.0, 2.5, 0.14), wallM), 0, 1.25, -0.78);
  place(g, mk(new THREE.BoxGeometry(0.14, 2.5, 1.6), wallM), -0.97, 1.25, 0);
  place(g, mk(new THREE.BoxGeometry(0.14, 2.5, 1.6), wallM),  0.97, 1.25, 0);
  place(g, mk(new THREE.BoxGeometry(2.0, 0.08, 1.6), M(0xc8b89a, 0.85)), 0, 0.04, 0);
  place(g, mk(new THREE.BoxGeometry(2.0, 0.12, 0.68), woodM), 0, 1.06, 0.52);

  for (let i = 0; i < 3; i++) {
    const awM = M(i % 2 === 0 ? col : 0xfafafa, 0.5);
    const panel = mk(new THREE.BoxGeometry(0.66, 0.08, 0.86), awM);
    panel.rotation.x = -0.22;
    place(g, panel, -0.66 + i * 0.66, 2.50, 0.62);
  }

  place(g, mk(new THREE.BoxGeometry(2.3, 0.14, 1.1), M(0x8B4513, 0.7)), 0, 2.60, 0.16);

  for (let i = 0; i < 3; i++) {
    const tx = -0.52 + i * 0.52;
    for (const [r, c] of [[0.16, 0xe74c3c],[0.10, 0xffffff],[0.045, 0xe74c3c]]) {
      const tgt = mk(new THREE.CircleGeometry(r, 14), M(c, 0.5));
      tgt.position.set(tx, 1.88, -0.71);
      g.add(tgt);
    }
  }

  const prizeCols = [0xe74c3c, 0xf39c12, 0x3498db];
  for (let i = 0; i < 3; i++) {
    const px = -0.44 + i * 0.44;
    place(g, sph(0.19, M(prizeCols[i], 0.6), 10, 8), px, 2.14, -0.66);
    place(g, mk(new THREE.BoxGeometry(0.24, 0.30, 0.20), M(prizeCols[i], 0.65)), px, 1.86, -0.66);
  }

  place(g, mk(new THREE.BoxGeometry(1.8, 0.44, 0.10), Me(col, 0.5)), 0, 2.36, -0.73);

  return g;
}

// ─── ICE CREAM CART ──────────────────────────────────────────────────────────
export function createIceCreamCart(col) {
  const g = new THREE.Group();

  const cartM  = M(0xfafafa, 0.5);
  const metalM = Mm(0x9aacbb, 0.3);

  place(g, mk(new THREE.BoxGeometry(1.4, 1.0, 1.0), cartM), 0, 0.78, 0);
  place(g, mk(new THREE.BoxGeometry(1.42, 0.16, 1.02), M(col, 0.5)), 0, 0.98, 0);
  place(g, mk(new THREE.BoxGeometry(0.06, 0.46, 0.06), metalM), 0, 1.46, -0.50);
  place(g, mk(new THREE.BoxGeometry(0.60, 0.06, 0.06), metalM), 0, 1.68, -0.50);

  for (const wx of [-0.48, 0.48]) {
    const wh = mk(new THREE.CylinderGeometry(0.24, 0.24, 0.10, 14), Mm(0x555566, 0.4));
    wh.rotation.x = Math.PI/2;
    place(g, wh, wx, 0.26, 0.54);
    const wHub = mk(new THREE.CylinderGeometry(0.07, 0.07, 0.13, 8), Mm(0xdddddd, 0.2));
    wHub.rotation.x = Math.PI/2;
    place(g, wHub, wx, 0.26, 0.54);
  }
  place(g, mk(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 6), metalM), 0, 0.16, -0.48);
  place(g, mk(new THREE.BoxGeometry(1.38, 0.14, 0.96), M(0xd0e8f0, 0.3, 0.05)), 0, 1.35, 0);

  const scCols = [0xFF69B4, 0x87ceeb, 0x90ee90, 0xf9a825];
  for (let i = 0; i < 4; i++) {
    const scoop = sph(0.16, M(scCols[i], 0.5), 10, 8);
    scoop.scale.y = 0.88;
    place(g, scoop, -0.30 + (i%2)*0.38, 1.52 + Math.floor(i/2)*0.12, -0.14 + Math.floor(i/2)*0.26);
  }

  place(g, mk(new THREE.ConeGeometry(0.15, 0.40, 8), M(0xd4a96a, 0.7)), 0.30, 1.40, 0.28);
  place(g, mk(new THREE.CylinderGeometry(0.03, 0.03, 1.88, 6), metalM), 0.44, 1.80, -0.14);

  const pCols = [col, 0xf1c40f, 0xe74c3c, col, 0xf1c40f, 0xe74c3c];
  for (let i = 0; i < 6; i++) {
    const a   = (i / 6) * Math.PI * 2;
    const seg = mk(new THREE.BoxGeometry(0.44, 0.06, 0.10), M(pCols[i], 0.5));
    seg.position.set(0.44 + Math.cos(a) * 0.38, 2.68, -0.14 + Math.sin(a) * 0.14);
    seg.rotation.y = a; seg.rotation.z = 0.3;
    g.add(seg);
  }
  place(g, sph(0.09, M(0xffffff, 0.3), 8, 6), 0.44, 2.72, -0.14);

  return g;
}

// ─── HAUNTED HOUSE ───────────────────────────────────────────────────────────
export function createHauntedHouse(col) {
  const g = new THREE.Group();

  const darkM  = M(0x1e2d3a, 0.9);
  const dark2M = M(0x0f1a22, 0.95);
  const dark3M = M(0x162028, 0.9);

  place(g, mk(new THREE.BoxGeometry(5.2, 4.8, 4.8), darkM), 0, 2.40, 0);
  place(g, mk(new THREE.BoxGeometry(2.0, 3.2, 2.6), dark3M), -2.8, 1.60, 0.4);
  place(g, mk(new THREE.BoxGeometry(2.4, 7.2, 2.4), dark2M), -1.4, 3.60, 0);
  place(g, mk(new THREE.BoxGeometry(1.6, 5.4, 1.6), dark2M),  1.8, 2.70, 0);

  const mainRoof = mk(new THREE.ConeGeometry(4.0, 2.8, 4), M(0x0a1018, 0.95));
  mainRoof.rotation.y = Math.PI/4;
  place(g, mainRoof, 0, 6.2, 0);

  const ltRoof = mk(new THREE.ConeGeometry(1.65, 3.2, 4), M(0x070d12, 0.98));
  ltRoof.rotation.y = Math.PI/4;
  place(g, ltRoof, -1.4, 8.6, 0);

  const rtRoof = mk(new THREE.ConeGeometry(1.15, 2.6, 4), M(0x070d12, 0.98));
  rtRoof.rotation.y = Math.PI/4;
  place(g, rtRoof, 1.8, 6.4, 0);

  const swRoof = mk(new THREE.ConeGeometry(1.65, 2.0, 4), M(0x080f16, 0.97));
  swRoof.rotation.y = Math.PI/4;
  place(g, swRoof, -2.8, 5.2, 0.4);

  place(g, mk(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), M(0x444444, 0.4, 0.3)), -1.4, 10.6, 0);
  place(g, mk(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4), M(0x444444, 0.4, 0.3)),  1.8, 8.4, 0);

  const winM = Me(0xffcc00, 0.95);
  const winPositions = [
    [ 1.6, 2.8, 2.42], [-0.4, 2.8, 2.42],
    [ 1.6, 4.3, 2.42], [-0.4, 4.3, 2.42],
    [-1.4, 5.4, 1.24], [-1.4, 3.4, 1.24],
    [ 1.8, 2.2, 0.82],
    [-2.8, 2.2, 1.72],
  ];
  for (const [wx, wy, wz] of winPositions) {
    const win = mk(new THREE.BoxGeometry(0.64, 0.92, 0.18), winM);
    win.position.set(wx, wy, wz);
    g.add(win);
    const halo = mk(new THREE.PlaneGeometry(0.9, 1.1), Mg(0xffee88, 0.20));
    halo.position.set(wx, wy, wz + 0.12);
    g.add(halo);
  }

  const roseM = Me(0x9b59b6, 0.80);
  const rose  = mk(new THREE.CircleGeometry(0.52, 14), roseM);
  rose.position.set(0, 4.6, 2.43);
  g.add(rose);
  place(g, mk(new THREE.TorusGeometry(0.52, 0.06, 6, 14), M(0x333355, 0.5)), 0, 4.6, 2.44);

  place(g, mk(new THREE.BoxGeometry(0.96, 1.72, 0.20), M(0x050a0e, 0.95)), 0, 0.86, 2.44);
  place(g, mk(new THREE.BoxGeometry(1.10, 0.10, 0.22), M(0x2a1a0a, 0.8)), 0, 1.76, 2.44);
  place(g, mk(new THREE.BoxGeometry(0.10, 1.80, 0.22), M(0x2a1a0a, 0.8)), -0.53, 0.90, 2.44);
  place(g, mk(new THREE.BoxGeometry(0.10, 1.80, 0.22), M(0x2a1a0a, 0.8)),  0.53, 0.90, 2.44);

  for (let i = 0; i < 6; i++) {
    place(g, sph(0.14, M(0x182530, 0.9), 6, 5), -2.56 + i * 1.02, 4.82, 2.40);
  }
  for (let i = 0; i < 4; i++) {
    place(g, mk(new THREE.BoxGeometry(0.18, 0.18, 0.30), M(0x182530, 0.9)), -1.8 + i * 1.2, 6.16, 0);
  }

  const light = new THREE.PointLight(0xffaa33, 1.2, 9);
  light.position.set(0, 2.5, 1.8);
  g.add(light);

  const ghost = grp(null, 2.8, 7.4, 0);
  ghost.name = 'ghost';
  const ghostBodyM = Mtr(0xe8f0ff, 0.76);
  const ghostHead  = sph(0.40, ghostBodyM, 12, 10);
  ghostHead.position.y = 0.18;
  ghost.add(ghostHead);
  const ghostBody = mk(new THREE.ConeGeometry(0.40, 0.56, 10, 1, true), ghostBodyM);
  ghostBody.rotation.x = Math.PI;
  ghost.add(ghostBody);
  for (const ex of [-0.14, 0.14]) {
    place(ghost, sph(0.055, Me(0x88aaff, 1.0), 6, 5), ex, 0.22, 0.36);
  }
  const ghostGlow = mk(new THREE.SphereGeometry(0.7, 10, 8), Mg(0xaaccff, 0.10));
  ghostGlow.position.y = 0.1;
  ghost.add(ghostGlow);
  g.add(ghost);

  return g;
}

// ─── BALLOON RIDE ────────────────────────────────────────────────────────────
export function createBalloonRide(col) {
  const g = new THREE.Group();

  place(g, mk(new THREE.CylinderGeometry(2.5, 2.7, 0.28, 18), M(0x8a9bb0, 0.8)), 0, 0.14, 0);
  place(g, mk(new THREE.CylinderGeometry(2.35, 2.36, 0.10, 18), M(0xd4af37, 0.3, 0.4)), 0, 0.30, 0);
  place(g, mk(new THREE.CylinderGeometry(0.22, 0.28, 4.4, 14), Mm(0x7a8c9a, 0.3)), 0, 2.48, 0);
  for (let i = 0; i < 5; i++) {
    place(g, mk(new THREE.TorusGeometry(0.26, 0.04, 5, 14), M(0xd4af37, 0.3, 0.4)), 0, 0.64 + i * 0.82, 0);
  }

  const arm = grp(g, 0, 4.7, 0, 'arm');
  place(arm, mk(new THREE.BoxGeometry(4.2, 0.14, 0.14), M(0xb08040, 0.5)), 2.1, 0, 0);
  place(arm, sph(0.30, M(0x6a7a8a, 0.5), 10, 8), -0.8, 0, 0);

  const gond = grp(arm, 4.2, -0.5, 0, 'gond');

  place(gond, mk(new THREE.CylinderGeometry(0.52, 0.46, 0.72, 10), M(0xc8a060, 0.8)), 0, -0.36, 0);
  for (let i = 0; i < 4; i++) {
    place(gond, mk(new THREE.TorusGeometry(0.52 - i*0.02, 0.022, 5, 14), M(0xa07840, 0.85)), 0, -0.18 + i * (-0.18), 0);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i/10) * Math.PI * 2;
    const vline = mk(new THREE.BoxGeometry(0.03, 0.72, 0.03), M(0xa07840, 0.85));
    vline.position.set(Math.cos(a)*0.50, -0.36, Math.sin(a)*0.50);
    vline.rotation.y = a;
    gond.add(vline);
  }
  place(gond, mk(new THREE.TorusGeometry(0.54, 0.045, 6, 14), M(0x7a5a30, 0.6)), 0, 0.0, 0);

  const bCols = [col, 0xf1c40f, 0xe74c3c, 0x3498db];
  for (let i = 0; i < 4; i++) {
    const seg = mk(
      new THREE.SphereGeometry(1.0, 10, 10, (i/4)*Math.PI*2, Math.PI/2),
      M(bCols[i], 0.4)
    );
    seg.position.y = 1.36;
    gond.add(seg);
  }
  place(gond, sph(0.28, M(0xfafafa, 0.4), 10, 8), 0, 2.35, 0);
  place(gond, mk(new THREE.TorusGeometry(0.42, 0.06, 6, 12), M(0x5a4020, 0.6)), 0, 0.38, 0);
  place(gond, sph(0.60, Mg(0xffeecc, 0.15), 8, 6), 0, 1.36, 0);

  const ropeM = Mm(0x9a8060, 0.45);
  for (let i = 0; i < 4; i++) {
    const a  = (i/4) * Math.PI * 2;
    const rp = mk(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 4), ropeM);
    rp.position.set(Math.cos(a)*0.48, 0.56, Math.sin(a)*0.48);
    rp.rotation.z = Math.cos(a)*0.36; rp.rotation.x = Math.sin(a)*0.36;
    gond.add(rp);
  }

  place(gond, sph(0.22, M(0xFDDBB4, 0.7), 10, 8), 0, 0.12, 0);
  place(gond, sph(0.14, M(0x8B6914, 0.8), 8, 6), 0, 0.28, 0);

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
    for (let i = 0; i < 5; i++) {
      const h = top.getObjectByName(`horse_${i}`);
      if (h) h.position.y = -2.35 + Math.sin(t * 2 + (h.userData.phase || 0)) * 0.38;
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
    ghost.position.y = 7.4 + Math.sin(t * 1.5) * 0.62;
    ghost.rotation.y = t * 0.35;
    ghost.traverse(c => {
      if (c.isMesh && c.material && c.material.opacity !== undefined) {
        c.material.opacity = 0.65 + Math.sin(t * 2) * 0.18;
      }
    });
  }

  // Haunted house inner light pulse
  const ptLight = g.children.find(c => c.isLight);
  if (ptLight) ptLight.intensity = 1.0 + Math.sin(t * 3) * 0.45;
}

// ─── TILE MODELS ─────────────────────────────────────────────────────────────
export function createPathTile(T3D, conn = { n: true, e: true, s: true, w: true }) {
  const tileM  = M(0xcabfa6, 0.88);
  const groove = M(0xb5a891, 0.92);
  const curbM  = M(0x4d8a2e, 0.85);

  const g = new THREE.Group();
  const m = mk(new THREE.BoxGeometry(T3D - 0.06, 0.14, T3D - 0.06), tileM);
  m.receiveShadow = true;
  g.add(m);

  // Groove lines (decorative paving detail)
  for (const off of [-T3D * 0.24, T3D * 0.24]) {
    const l = mk(new THREE.BoxGeometry(0.04, 0.15, T3D - 0.08), groove);
    l.position.x = off;
    m.add(l);
  }
  for (const off of [-T3D * 0.24, T3D * 0.24]) {
    const l = mk(new THREE.BoxGeometry(T3D - 0.08, 0.15, 0.04), groove);
    l.position.z = off;
    m.add(l);
  }

  // Grass curb on edges that DON'T connect to another path/entrance tile —
  // this makes the path automatically look continuous through turns,
  // T-junctions and crossings without needing separate rotated models.
  const curbH = 0.22, curbW = 0.16;
  if (!conn.n) place(g, mk(new THREE.BoxGeometry(T3D, curbH, curbW), curbM), 0, curbH / 2 - 0.02, -(T3D / 2 - curbW / 2));
  if (!conn.s) place(g, mk(new THREE.BoxGeometry(T3D, curbH, curbW), curbM), 0, curbH / 2 - 0.02,  (T3D / 2 - curbW / 2));
  if (!conn.e) place(g, mk(new THREE.BoxGeometry(curbW, curbH, T3D), curbM),  (T3D / 2 - curbW / 2), curbH / 2 - 0.02, 0);
  if (!conn.w) place(g, mk(new THREE.BoxGeometry(curbW, curbH, T3D), curbM), -(T3D / 2 - curbW / 2), curbH / 2 - 0.02, 0);

  return g;
}

export function createEntranceTile(T3D) {
  const g = new THREE.Group();
  const stripes = 4;
  for (let i = 0; i < stripes; i++) {
    const s = mk(
      new THREE.BoxGeometry(T3D / stripes - 0.02, 0.15, T3D),
      M(i % 2 === 0 ? 0xf39c12 : 0xd4b483, 0.7)
    );
    s.position.x = -T3D/2 + (i + 0.5) * T3D / stripes;
    s.receiveShadow = true;
    g.add(s);
  }
  const borderM = M(0xe8a830, 0.6, 0.1);
  for (const bx of [-T3D/2 + 0.04, T3D/2 - 0.04]) {
    const border = mk(new THREE.BoxGeometry(0.08, 0.18, T3D), borderM);
    border.position.x = bx;
    g.add(border);
  }
  return g;
}

export function createTree() {
  const g = new THREE.Group();

  place(g, mk(new THREE.CylinderGeometry(0.18, 0.26, 1.3, 8), M(0x8B5e3c, 0.85)), 0, 0.65, 0);

  place(g, sph(0.76, M(0x2d8a4e, 0.8), 14, 10), 0, 2.02, 0);
  place(g, sph(0.55, M(0x3da85e, 0.75), 12, 8), -0.44, 1.72, 0.22);
  place(g, sph(0.52, M(0x3da85e, 0.75), 12, 8),  0.42, 1.62, -0.16);
  place(g, sph(0.42, M(0x4ab060, 0.7), 10, 8),  0.12, 2.52, 0.18);
  place(g, sph(0.36, M(0x2a7a44, 0.82), 10, 8), -0.20, 1.44, -0.28);

  const berryM = M(0xff4444, 0.6);
  for (let i = 0; i < 5; i++) {
    const a = (i/5) * Math.PI * 2;
    place(g, sph(0.06, berryM, 6, 5), Math.cos(a)*0.52, 1.90 + Math.sin(i)*0.15, Math.sin(a)*0.52);
  }

  return g;
}

export function createParkingLot(col) {
  const g = new THREE.Group();
  const asphaltM = M(0x3a3f44, 0.92);
  const lineM    = M(0xf4d35e, 0.6);
  const carCols  = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];

  place(g, mk(new THREE.BoxGeometry(8.8, 0.10, 5.8), asphaltM), 0, 0.05, 0);

  for (let i = 0; i < 6; i++) {
    place(g, mk(new THREE.BoxGeometry(0.08, 0.11, 2.2), lineM), -3.85 + i * 1.4, 0.10, -1.7);
    place(g, mk(new THREE.BoxGeometry(0.08, 0.11, 2.2), lineM), -3.85 + i * 1.4, 0.10,  1.7);
  }

  for (let i = 0; i < 4; i++) {
    const cg = new THREE.Group();
    const bodyM = M(carCols[i % carCols.length], 0.45, 0.15);
    place(cg, mk(new THREE.BoxGeometry(1.0, 0.34, 1.9), bodyM), 0, 0.32, 0);
    place(cg, mk(new THREE.BoxGeometry(0.78, 0.30, 1.0), Mg(carCols[i % carCols.length], 0.05)), 0, 0.62, -0.1);
    for (const wz of [-0.62, 0.62]) for (const wx of [-0.46, 0.46]) {
      const wheel = mk(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 10), Mm(0x222222, 0.4));
      wheel.rotation.z = Math.PI / 2;
      place(cg, wheel, wx, 0.18, wz);
    }
    cg.position.set(-2.8 + i * 1.9, 0, -1.7 + (i % 2) * 3.4);
    g.add(cg);
  }

  const signPost = mk(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), Mm(0x888888, 0.3));
  place(g, signPost, -4.0, 0.9, -2.5);
  place(g, mk(new THREE.BoxGeometry(0.6, 0.6, 0.06), M(0x2980b9, 0.5)), -4.0, 1.85, -2.5);

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
    case 'parking':        return createParkingLot(col);
    default: {
      const g = new THREE.Group();
      place(g, mk(new THREE.BoxGeometry(2, 2, 2), M(col, 0.6)), 0, 1, 0);
      return g;
    }
  }
}
