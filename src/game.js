import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';
import { Park }             from './park.js';
import { Economy }          from './economy.js';
import { InvestmentSystem } from './investment.js';
import { UI }               from './ui.js';
import { Visitor, Builder, Staff } from './character.js';
import { createVisitor, createBuilder, createInvestor, createStaff, createPlayerAvatar, createInvestorOffice, animateCharacter, animateAttraction, createAttractionModel, createCar, createCityBuilding } from './models.js';
import { TILE, GRID_W, GRID_H, T3D, BUILDER_COST, BUILDER_SAL, MAX_BUILDERS, STAFF_COST, STAFF_SAL, MAX_STAFF, ATTRACTIONS, SKIN_TONES, HAIR_COLORS, SHIRT_COLS, PANT_COLS, TICKET_PRICE } from './data.js';
import { rnd, rndInt, fmt$, pick, lerp, uid } from './utils.js';
import { evaluatePitch } from './negotiation.js';

class Game {
  constructor() {
    this._detectDevice();

    // ── Three.js ──
    this.canvas   = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isSmallScreen ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.resize();

    this.scene  = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 90, 140);

    // Camera (tycoon top-down angle, fixed pitch) — tuned per detected device
    this.camera = new THREE.PerspectiveCamera(this._fov, this.canvas.width / this.canvas.height, 0.1, 500);
    this.camTarget = new THREE.Vector3(GRID_W * T3D / 2, 0, GRID_H * T3D / 2);
    this.camDist   = this._initCamDist;
    this._updateCamera();

    this._setupLights();
    this._setupGround();
    this._setupCity();
    this._setupInvestorOffice();

    // ── Systems ──
    this.park       = new Park(this);
    this.economy    = new Economy(this);
    this.investment = new InvestmentSystem(this);
    this.ui         = new UI(this);

    this.visitors = [];
    this.builders = [];
    this.staff    = [];
    this.cars     = [];

    // ── State ──
    this.mode          = 'normal';
    this.selectedBuild = null;
    this.gameSpeed     = 1;
    this.paused        = false;
    this._visSpawn     = 0;
    this._lastTime     = 0;
    this._hoverGround  = new THREE.Vector3();
    this._hoverGx      = -1;
    this._hoverGy      = -1;
    this._preview      = null;
    this.pendingBlueprint = null;

    this._setupAvatar();

    // Raycaster for tile selection
    this._ray   = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Input
    this._setupInput();

    // Start
    this._loop(0);
    this.ui.notify('🎡 Добро пожаловать в Park Tycoon 3D! Нажми Строить.', 'info');
  }

  // ── Device / screen adaptation ──────────────────────────────────────────
  _detectDevice() {
    this.isTouch       = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const w = window.innerWidth, h = window.innerHeight;
    this.isSmallScreen  = Math.min(w, h) < 480;
    this.isNarrow       = w / h < 0.62; // tall phone aspect ratio
    document.body.classList.toggle('touch-device', this.isTouch);
    document.body.classList.toggle('small-screen', this.isSmallScreen);
    document.body.classList.toggle('narrow-screen', this.isNarrow);

    // Wider FOV and slightly farther camera on small/tall phone screens so
    // more of the park is visible without feeling cramped.
    this._fov         = this.isNarrow ? 56 : (this.isSmallScreen ? 52 : 48);
    this._initCamDist = this.isNarrow ? 48 : (this.isSmallScreen ? 44 : 40);
  }

  // ── Scene setup ──────────────────────────────────────────────────────────
  _setupLights() {
    this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x4a7c33, 0.9));

    const sun = new THREE.DirectionalLight(0xfffaee, 2.0);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near  = 0.5;
    sun.shadow.camera.far   = 200;
    sun.shadow.camera.left  = -80;
    sun.shadow.camera.right =  80;
    sun.shadow.camera.top   =  80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    // Fill light from opposite side
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-20, 20, -10);
    this.scene.add(fill);
  }

  _setupGround() {
    const W = GRID_W * T3D, H = GRID_H * T3D;

    // Outer "wilderness" plane, much larger than the park itself, so the
    // camera (even at its clamped extremes) never sees bare sky/void
    // beyond the playable territory.
    const outer = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 6, H * 6),
      new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: 0.9 })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(W / 2, -0.02, H / 2);
    outer.receiveShadow = true;
    this.scene.add(outer);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ color: 0x5a9e3a, roughness: 0.85 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W / 2, 0, H / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Subtle checker pattern (darker squares)
    for (let gy = 1; gy < GRID_H - 1; gy++) {
      for (let gx = 1; gx < GRID_W - 1; gx++) {
        if ((gx + gy) % 2 === 0) continue;
        const sq = new THREE.Mesh(
          new THREE.PlaneGeometry(T3D - 0.06, T3D - 0.06),
          new THREE.MeshStandardMaterial({ color: 0x4d8a2e, roughness: 0.88 })
        );
        sq.rotation.x = -Math.PI / 2;
        sq.position.set(gx * T3D + T3D / 2, 0.005, gy * T3D + T3D / 2);
        sq.receiveShadow = true;
        this.scene.add(sq);
      }
    }
  }

  // Surround the park with a simple skyline + road grid so the camera never
  // sees the park floating in an empty void — it reads as "a park inside a city".
  _setupCity() {
    const W = GRID_W * T3D, H = GRID_H * T3D;
    const cx = W / 2, cz = H / 2;
    const roadM  = new THREE.MeshStandardMaterial({ color: 0x44464a, roughness: 0.95 });
    const lineM  = new THREE.MeshStandardMaterial({ color: 0xe0d27a, roughness: 0.7 });

    // Ring road around the park
    const ringPad = 10;
    const ring = new THREE.Mesh(new THREE.RingGeometry(
      Math.max(W, H) / 2 + ringPad, Math.max(W, H) / 2 + ringPad + 4.5, 48
    ), roadM);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, 0.01, cz);
    ring.receiveShadow = true;
    this.scene.add(ring);

    // A handful of straight avenues radiating outward, for visual variety
    const blockCount = 40;
    let seed = 7;
    const rngBuilding = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    const innerR = Math.max(W, H) / 2 + ringPad + 8;
    for (let i = 0; i < blockCount; i++) {
      const a  = (i / blockCount) * Math.PI * 2 + rngBuilding() * 0.15;
      const r  = innerR + rngBuilding() * 55;
      const bx = cx + Math.cos(a) * r;
      const bz = cz + Math.sin(a) * r;
      const b  = createCityBuilding(Math.floor(rngBuilding() * 1000) + i);
      b.position.set(bx, 0, bz);
      b.rotation.y = rngBuilding() * Math.PI * 2;
      this.scene.add(b);
    }

    // Lane markings along the ring road
    const laneCount = 64;
    for (let i = 0; i < laneCount; i++) {
      const a = (i / laneCount) * Math.PI * 2;
      const r = Math.max(W, H) / 2 + ringPad + 2.25;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.18), lineM);
      seg.position.set(cx + Math.cos(a) * r, 0.03, cz + Math.sin(a) * r);
      seg.rotation.y = a;
      this.scene.add(seg);
    }
  }

  // Investor office sits outside the park, south of the entrance, past the
  // ring road, so the avatar has to physically walk there to pitch a project.
  _setupInvestorOffice() {
    const W = GRID_W * T3D, H = GRID_H * T3D;
    const x = W / 2, z = H / 2 + Math.max(W, H) / 2 + 10 + 4.5 + 18;
    const mesh = createInvestorOffice();
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.investorOffice = { mesh, x, z };
  }

  // ── Player avatar ────────────────────────────────────────────────────────
  _setupAvatar() {
    const ex = this.park.entranceX, ey = this.park.entranceY;
    const x = ex * T3D + T3D / 2, z = ey * T3D - T3D / 2;
    const mesh = createPlayerAvatar({ skin: pick(SKIN_TONES), hair: pick(HAIR_COLORS), hairStyle: 1 });
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.avatar = { mesh, x, z, tx: x, tz: z, moving: false, speed: 8 };
  }

  _moveAvatarTo(x, z) {
    if (!this.avatar) return;
    this.avatar.tx = x;
    this.avatar.tz = z;
  }

  _updateAvatar(dt) {
    const a = this.avatar;
    if (!a) return;
    const dx = a.tx - a.x, dz = a.tz - a.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.08) {
      const step = Math.min(d, a.speed * dt);
      a.x += (dx / d) * step;
      a.z += (dz / d) * step;
      a.mesh.rotation.y = Math.atan2(dx, dz);
      a.moving = true;
    } else {
      a.moving = false;
    }
    a.mesh.position.set(a.x, 0, a.z);
    animateCharacter(a.mesh, dt, a.moving, false);
    this._checkAvatarProximity();
  }

  _checkAvatarProximity() {
    if (!this.pendingBlueprint || this._negotiationOpened) return;
    const a = this.avatar, o = this.investorOffice;
    if (!a || !o) return;
    if (Math.hypot(a.x - o.x, a.z - o.z) < 6) {
      this._negotiationOpened = true;
      this.ui.openNegotiation(this.pendingBlueprint);
    }
  }

  // Player has chosen a build site + type but wants investor funding instead
  // of paying out of pocket. Park the blueprint, send the avatar walking to
  // the investor's office; the negotiation modal opens on arrival.
  requestBlueprint(gx, gy, typeId) {
    const def = ATTRACTIONS[typeId];
    if (!def) return;
    this.pendingBlueprint = { id: uid(), gx, gy, typeId, name: def.name, emoji: def.emoji, cost: def.cost };
    this._negotiationOpened = false;
    this.ui.hideAll();
    document.getElementById('build-modal').classList.add('hidden');
    document.getElementById('modebar').classList.add('hidden');
    document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
    this.mode = 'normal';
    this.selectedBuild = null;
    this._moveAvatarTo(this.investorOffice.x, this.investorOffice.z);
    this.ui.notify('🚶 Идём к инвестору с чертежом проекта…', 'info');
  }

  async submitPitch(chosenIds) {
    const bp = this.pendingBlueprint;
    if (!bp) return;
    this.ui.notify('💼 Инвестор изучает предложение…', 'info');
    const result = await evaluatePitch(bp, chosenIds, this);
    if (result.approved) {
      this.economy.addInvestment({
        id: uid(), name: 'Инвестор', amount: bp.cost,
        equity: rndInt(8, 18), daysLeft: 30,
      });
      const attr = this.park.placeAttraction(bp.gx, bp.gy, bp.typeId);
      if (attr) this.ui.notify(`✅ Инвестор одобрил проект! ${result.reason}`, 'success');
      else this.ui.notify('⚠️ Инвестор согласился, но место уже занято.', 'warn');
    } else {
      this.ui.notify(`❌ Инвестор отказал: ${result.reason}`, 'error');
    }
    this.pendingBlueprint = null;
    this._negotiationOpened = false;
    this.ui.closeNegotiation();
    this._moveAvatarTo(this.park.entranceX * T3D + T3D / 2, this.park.entranceY * T3D - T3D / 2);
  }

  // ── Camera ───────────────────────────────────────────────────────────────
  _clampCamTarget() {
    const margin = T3D * 2;
    const maxX = GRID_W * T3D - margin, maxZ = GRID_H * T3D - margin;
    this.camTarget.x = Math.max(margin, Math.min(maxX, this.camTarget.x));
    this.camTarget.z = Math.max(margin, Math.min(maxZ, this.camTarget.z));
  }

  _updateCamera() {
    const pitch = 0.72; // radians from horizontal (~41 deg)
    const t = this.camTarget;
    const d = this.camDist;
    this.camera.position.set(
      t.x,
      Math.sin(pitch) * d,
      t.z + Math.cos(pitch) * d
    );
    this.camera.lookAt(t);
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  _loop(ts) {
    const dt = Math.min((ts - this._lastTime) / 1000, 0.12) * this.gameSpeed;
    this._lastTime = ts;
    if (!this.paused) this._update(dt, ts / 1000);
    else this.ui.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(t => this._loop(t));
  }

  togglePause() {
    this.paused = !this.paused;
    this.ui.notify(this.paused ? '⏸️ Игра на паузе' : '▶️ Игра продолжается', 'info');
    this.ui.updatePauseButton();
  }

  _update(dt, t) {
    this.park.update(dt);
    this.economy.update(dt);
    this.investment.update(dt);
    this._updateVisitors(dt, t);
    this._updateBuilders(dt, t);
    this._updateStaff(dt, t);
    this._updateCars(dt);
    this._updateAvatar(dt);
    this._spawnVisitors(dt);
    this._animateAttractions(dt);
    this._updateInvestorModels(dt, t);
    this.ui.update();
  }

  _animateAttractions(dt) {
    for (const attr of this.park.attractions.values()) {
      if (attr.mesh) animateAttraction(attr.mesh, dt, attr.state);
    }
  }

  _updateVisitors(dt, t) {
    for (let i = this.visitors.length - 1; i >= 0; i--) {
      const v = this.visitors[i];
      v.update(dt, this);
      if (v.mesh) {
        const wx = (v.px / TILE) * T3D;
        const wz = (v.py / TILE) * T3D;
        v.mesh.position.x = wx;
        v.mesh.position.z = wz;
        // Face direction of movement
        if (Math.abs(v.px - (v.mesh.userData.lastPx || v.px)) > 0.5 ||
            Math.abs(v.py - (v.mesh.userData.lastPy || v.py)) > 0.5) {
          const dx = v.px - (v.mesh.userData.lastPx || v.px);
          const dz = v.py - (v.mesh.userData.lastPy || v.py);
          if (Math.abs(dx) + Math.abs(dz) > 0.1) {
            v.mesh.rotation.y = Math.atan2(dx, dz);
          }
        }
        v.mesh.userData.lastPx = v.px;
        v.mesh.userData.lastPy = v.py;
        // Fade out when leaving
        if (v.state === 'leaving') {
          v.mesh.children.forEach(c => { if (c.material) c.material.opacity = v.alpha; });
        }
        const walking = v.state === 'walking' || v.state === 'wandering' || v.state === 'entering';
        animateCharacter(v.mesh, dt, walking, false);
      }
      if (v.state === 'dead') {
        if (v.mesh) this.scene.remove(v.mesh);
        this.visitors.splice(i, 1);
      }
    }
  }

  _updateBuilders(dt, t) {
    for (const b of this.builders) {
      b.update(dt, this);
      if (b.mesh) {
        const wx = (b.px / TILE) * T3D;
        const wz = (b.py / TILE) * T3D;
        b.mesh.position.x = wx;
        b.mesh.position.z = wz;
        const dx = b.px - (b.mesh.userData.lastPx || b.px);
        const dz = b.py - (b.mesh.userData.lastPy || b.py);
        if (Math.abs(dx) + Math.abs(dz) > 0.1) b.mesh.rotation.y = Math.atan2(dx, dz);
        b.mesh.userData.lastPx = b.px;
        b.mesh.userData.lastPy = b.py;
        const walking = b.state === 'going' || b.state === 'returning';
        animateCharacter(b.mesh, dt, walking, b.state === 'building');
      }
    }
  }

  _updateStaff(dt, t) {
    for (const s of this.staff) {
      s.update(dt, this);
      if (s.mesh) {
        const wx = (s.px / TILE) * T3D;
        const wz = (s.py / TILE) * T3D;
        s.mesh.position.x = wx;
        s.mesh.position.z = wz;
        const dx = s.px - (s.mesh.userData.lastPx || s.px);
        const dz = s.py - (s.mesh.userData.lastPy || s.py);
        if (Math.abs(dx) + Math.abs(dz) > 0.1) s.mesh.rotation.y = Math.atan2(dx, dz);
        s.mesh.userData.lastPx = s.px;
        s.mesh.userData.lastPy = s.py;
        const walking = s.state === 'going' || s.state === 'returning';
        animateCharacter(s.mesh, dt, walking, s.state === 'working');
      }
    }
  }

  // ── Cars (parking arrivals + worker taxis) ──────────────────────────────
  _spawnCarToPoint(targetGx, targetGy, color, isTaxi, onArrive) {
    const tx = targetGx * T3D + T3D / 2;
    const tz = targetGy * T3D + T3D / 2;
    // Drive in from whichever grid edge is nearest the target, so cars take
    // the shortest path in from the surrounding city roads.
    const distN = targetGy, distS = GRID_H - targetGy, distW = targetGx, distE = GRID_W - targetGx;
    const minD = Math.min(distN, distS, distW, distE);
    let fx = tx, fz = tz;
    if (minD === distS)      fz = GRID_H * T3D + 24;
    else if (minD === distN) fz = -24;
    else if (minD === distW) fx = -24;
    else                     fx = GRID_W * T3D + 24;
    const mesh = createCar(color, isTaxi);
    mesh.position.set(fx, 0, fz);
    mesh.rotation.y = Math.atan2(tx - fx, tz - fz);
    this.scene.add(mesh);
    this.cars.push({ mesh, fx, fz, tx, tz, t: 0, dur: rnd(2.2, 3.0), onArrive });
  }

  _updateCars(dt) {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      c.t += dt / c.dur;
      const k = Math.min(1, c.t);
      c.mesh.position.x = lerp(c.fx, c.tx, k);
      c.mesh.position.z = lerp(c.fz, c.tz, k);
      if (k >= 1) {
        this.scene.remove(c.mesh);
        this.cars.splice(i, 1);
        if (c.onArrive) c.onArrive();
      }
    }
  }

  _updateInvestorModels(dt, t) {
    for (const inv of this.investment.pending) {
      if (!inv.mesh) {
        inv.mesh = createInvestor({
          skin: pick(SKIN_TONES), hair: ['#1a1a1a','#444','#808080'][rndInt(0,2)],
          hairStyle: 0, suit: pick([0x2c3e50,0x1a252f,0x4a235a,0x154360]),
          tie: pick([0xe74c3c,0x3498db,0xf39c12,0x2ecc71]),
          acc: null,
        });
        this.scene.add(inv.mesh);
      }
      const wx = (inv.px / TILE) * T3D;
      const wz = (inv.py / TILE) * T3D;
      inv.mesh.position.x = wx;
      inv.mesh.position.z = wz;
      inv.mesh.position.y = 0;
      const walking = inv.state === 'approaching' || inv.state === 'leaving';
      animateCharacter(inv.mesh, dt, walking, false);
      if (inv.state === 'dead') {
        this.scene.remove(inv.mesh);
        inv.mesh = null;
      }
    }
  }

  _spawnVisitors(dt) {
    const open = this.park.getAttractionCount();
    if (open === 0) return;
    let bonus = 1;
    for (const attr of this.park.getOpenAttractions()) {
      const def = ATTRACTIONS[attr.typeId];
      if (def.visitorBonus) bonus += def.visitorBonus;
    }
    const max  = Math.min(6 + open * 3, 45) * bonus;
    if (this.visitors.length >= max) return;
    this._visSpawn += dt * (0.4 + open * 0.2) * bonus;
    while (this._visSpawn >= 1) {
      this._visSpawn--;
      this._spawnOneVisitor();
    }
  }

  _spawnOneVisitor() {
    const openParking = this.park.getOpenOfType('parking');
    if (openParking.length > 0 && Math.random() < 0.8) {
      this._spawnVisitorByCar(pick(openParking));
      return;
    }
    const ex = this.park.entranceX;
    const ey = this.park.entranceY;
    const px = ex * TILE + TILE / 2 + rnd(-6, 6);
    const py = (ey + 2) * TILE;
    this._placeVisitor(px, py, [{ gx: ex, gy: ey }]);
  }

  // Visitor drives in by car to a parking lot, then walks into the park on foot.
  _spawnVisitorByCar(parkingAttr) {
    const spot = this.park.getNearbyPath(parkingAttr);
    if (!spot) { this._spawnOneVisitor(); return; }
    const carCol = pick([0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1]);
    this._spawnCarToPoint(spot.x, spot.y, carCol, false, () => {
      const px = spot.x * TILE + TILE / 2;
      const py = spot.y * TILE + TILE / 2;
      this._placeVisitor(px, py, []);
    });
  }

  _placeVisitor(px, py, initialPath) {
    const v = new Visitor(px, py, this);
    v.path  = initialPath;
    v.state = 'entering';

    const app = {
      skin:      pick(SKIN_TONES),
      hair:      pick(HAIR_COLORS),
      shirt:     pick(SHIRT_COLS),
      pants:     pick(PANT_COLS),
      hairStyle: rndInt(0, 3),
      acc:       Math.random() < 0.38 ? pick(['balloon','hat','ice_cream']) : null,
      accCol:    pick(['#e74c3c','#3498db','#f39c12','#9b59b6','#2ecc71']),
      hatCol:    pick(['#e74c3c','#1a1a2e','#2c3e50','#f39c12']),
    };
    v.app   = { ...v.app, ...app };
    v.mesh  = createVisitor(app);
    v.mesh.position.set((px / TILE) * T3D, 0, (py / TILE) * T3D);
    this.scene.add(v.mesh);
    this.visitors.push(v);

    // Ticket booth: visitors pay for entry if one is open
    if (this.park.getOpenOfType('ticket_booth').length > 0) {
      this.economy.earn(TICKET_PRICE);
    }
  }

  // ── Public actions ────────────────────────────────────────────────────────
  onHireBuilder() {
    if (this.builders.length >= MAX_BUILDERS) {
      this.ui.notify(`⚠️ Максимум ${MAX_BUILDERS} строителей`, 'warn'); return;
    }
    if (!this.economy.canAfford(BUILDER_COST)) {
      this.ui.notify(`❌ Нужно ${fmt$(BUILDER_COST)} для найма`, 'error'); return;
    }
    this.economy.spend(BUILDER_COST);
    this.ui.notify('🚕 Такси едет со строителем…', 'info');
    const ex = this.park.entranceX;
    const ey = this.park.entranceY;
    this._spawnCarToPoint(ex, ey, 0xf1c40f, true, () => {
      const px = ex * TILE + TILE / 2 + rnd(-10, 10);
      const py = ey * TILE + TILE / 2;
      const b  = new Builder(px, py, this);
      b.depot  = { gx: ex, gy: ey };

      const app = {
        skin:  pick(SKIN_TONES),
        hair:  pick(HAIR_COLORS),
        vest:  pick([0xf39c12, 0xe67e22, 0xe74c3c, 0x27ae60]),
        hard:  pick([0xf1c40f, 0xe74c3c, 0x3498db, 0xffffff]),
        pants: 0x1a1a2e,
        acc:   null,
      };
      b.app   = { ...b.app, ...app };
      b.mesh  = createBuilder(app);
      b.mesh.position.set((px / TILE) * T3D, 0, (py / TILE) * T3D);
      this.scene.add(b.mesh);
      this.builders.push(b);
      this.ui.notify(`👷 Строитель нанят! (${this.builders.length}/${MAX_BUILDERS}) — $${BUILDER_SAL}/день`, 'success');
    });
  }

  onHireStaff() {
    if (this.staff.length >= MAX_STAFF) {
      this.ui.notify(`⚠️ Максимум ${MAX_STAFF} сотрудников`, 'warn'); return;
    }
    if (!this.economy.canAfford(STAFF_COST)) {
      this.ui.notify(`❌ Нужно ${fmt$(STAFF_COST)} для найма`, 'error'); return;
    }
    this.economy.spend(STAFF_COST);
    this.ui.notify('🚕 Такси едет с сотрудником…', 'info');
    const ex = this.park.entranceX;
    const ey = this.park.entranceY;
    this._spawnCarToPoint(ex, ey, 0xf1c40f, true, () => {
      const px = ex * TILE + TILE / 2 + rnd(-10, 10);
      const py = ey * TILE + TILE / 2;
      const s  = new Staff(px, py, this);

      const app = {
        skin: pick(SKIN_TONES),
        hair: pick(HAIR_COLORS),
        vest: s.app.vest,
        pants: '#1a1a2e',
        acc: null,
      };
      s.app  = { ...s.app, ...app };
      s.mesh = createStaff(app);
      s.mesh.position.set((px / TILE) * T3D, 0, (py / TILE) * T3D);
      this.scene.add(s.mesh);
      this.staff.push(s);
      this.ui.notify(`🧑‍💼 Сотрудник нанят! (${this.staff.length}/${MAX_STAFF}) — $${STAFF_SAL}/день`, 'success');
    });
  }

  // Called from park when attraction is placed to create 3D model
  onAttractionPlaced(attr) {
    const def = ATTRACTIONS[attr.typeId];
    const model = createAttractionModel(attr.typeId, def.col);
    // Center of attraction in world space
    const cx = (attr.gx + attr.w / 2) * T3D;
    const cz = (attr.gy + attr.h / 2) * T3D;
    model.position.set(cx, 0, cz);
    attr.mesh = model;
    this.scene.add(model);

    // Build progress label (3D text substitute: a glowing plane)
    const planeGeo = new THREE.PlaneGeometry(attr.w * T3D * 0.9, 0.5);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xf39c12, side: THREE.DoubleSide });
    const progressBar = new THREE.Mesh(planeGeo, planeMat);
    progressBar.rotation.x = -Math.PI / 2;
    progressBar.position.set(cx, 0.16, cz + attr.h * T3D / 2 - 0.4);
    progressBar.name = 'progressBar_' + attr.id;
    attr.progressBar = progressBar;
    this.scene.add(progressBar);
  }

  onAttractionBuilt(attr) {
    // Remove progress bar
    if (attr.progressBar) {
      this.scene.remove(attr.progressBar);
      attr.progressBar = null;
    }
    if (attr.mesh) {
      attr.mesh.traverse(c => { if (c.isMesh) c.visible = true; });
      attr.mesh.scale.y = 1;
    }
  }

  // Reveal the building's parts gradually as construction progresses —
  // children were ordered bottom-up when modeled, so revealing them in
  // order makes the facade visibly rise rather than popping in at once.
  onAttractionProgress(attr) {
    if (!attr.mesh) return;
    const parts = attr.mesh.children.filter(c => c.isMesh || c.isGroup);
    if (!attr.mesh.userData.partsSorted) {
      parts.sort((a, b) => a.position.y - b.position.y);
      attr.mesh.userData.partsSorted = true;
      attr.mesh.userData.parts = parts;
    }
    const ordered = attr.mesh.userData.parts || parts;
    const visibleCount = Math.max(1, Math.round(ordered.length * attr.progress));
    ordered.forEach((c, i) => { c.visible = i < visibleCount; });
    attr.mesh.scale.y = 0.15 + attr.progress * 0.85;
  }

  onAttractionUpgraded(attr) {
    if (!attr.mesh) return;
    const s = attr.mesh.scale;
    const pulse = () => {
      let t = 0;
      const dur = 0.4;
      const step = () => {
        t += 1 / 60;
        const k = Math.min(1, t / dur);
        const bump = 1 + Math.sin(k * Math.PI) * 0.12;
        s.set(bump, bump, bump);
        if (k < 1) requestAnimationFrame(step); else s.set(1, 1, 1);
      };
      step();
    };
    pulse();
  }

  // ── Build mode tile selection ─────────────────────────────────────────────
  _getGroundTile(screenX, screenY) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const ndc = { x: (screenX / w) * 2 - 1, y: -(screenY / h) * 2 + 1 };
    this._ray.setFromCamera(ndc, this.camera);
    this._ray.ray.intersectPlane(this._plane, this._hoverGround);
    const gx = Math.floor(this._hoverGround.x / T3D);
    const gy = Math.floor(this._hoverGround.z / T3D);
    return { gx, gy };
  }

  _handleTap(sx, sy) {
    const { gx, gy } = this._getGroundTile(sx, sy);
    if (this.mode === 'build' && this.selectedBuild) {
      if (!this.park.canPlace(gx, gy, this.selectedBuild)) {
        this.ui.notify('❌ Нельзя построить здесь', 'error');
        return;
      }
      this.ui.showBuildConfirm(gx, gy, this.selectedBuild);
    } else if (this.mode === 'path') {
      if (!this.park.placePath(gx, gy)) {
        this.ui.notify('❌ Нельзя или нет денег', 'error');
      }
    } else if (this.mode === 'normal') {
      const attr = this.park.attrAt(gx, gy);
      if (attr && attr.state === 'open') { this.ui.showAttrInfo(attr.id); return; }
      this._moveAvatarTo(this._hoverGround.x, this._hoverGround.z);
    }
  }

  _updatePreview(gx, gy) {
    if (this._preview) { this.scene.remove(this._preview); this._preview = null; }
    if (this.mode !== 'build' || !this.selectedBuild) return;
    const def = ATTRACTIONS[this.selectedBuild];
    if (!def) return;
    const [w, h] = def.size;
    const can    = this.park.canPlace(gx, gy, this.selectedBuild);
    const mat    = new THREE.MeshBasicMaterial({
      color: can ? 0x00cc66 : 0xcc2200,
      transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const geo = new THREE.BoxGeometry(w * T3D - 0.1, 0.2, h * T3D - 0.1);
    this._preview = new THREE.Mesh(geo, mat);
    this._preview.position.set(
      (gx + w / 2) * T3D,
      0.12,
      (gy + h / 2) * T3D
    );
    this.scene.add(this._preview);

    if (this.mode === 'path') {
      const can2 = this.park.canPlacePath(gx, gy);
      const mat2 = new THREE.MeshBasicMaterial({ color: can2 ? 0x00cc66 : 0xcc2200, transparent: true, opacity: 0.35 });
      this._preview = new THREE.Mesh(new THREE.BoxGeometry(T3D - 0.1, 0.2, T3D - 0.1), mat2);
      this._preview.position.set((gx + 0.5) * T3D, 0.12, (gy + 0.5) * T3D);
      this.scene.add(this._preview);
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────
  _setupInput() {
    const c = this.canvas;
    let dragStart = null, camStart = null, didDrag = false;
    let pinchDist = 0, lastPinch = 0;

    const getXY = e => {
      const r = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };

    // Mouse
    c.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const p = getXY(e);
      dragStart = p; camStart = { x: this.camTarget.x, z: this.camTarget.z }; didDrag = false;
    });
    c.addEventListener('mousemove', e => {
      const p = getXY(e);
      const { gx, gy } = this._getGroundTile(p.x, p.y);
      this._hoverGx = gx; this._hoverGy = gy;
      this._updatePreview(gx, gy);
      if (dragStart) {
        const dx = p.x - dragStart.x, dy = p.y - dragStart.y;
        if (Math.hypot(dx, dy) > 5) {
          didDrag = true;
          const f = this.camDist / 35;
          this.camTarget.x = camStart.x - dx * 0.05 * f;
          this.camTarget.z = camStart.z - dy * 0.05 * f;
          this._clampCamTarget();
          this._updateCamera();
        }
      }
    });
    c.addEventListener('mouseup', e => {
      if (!didDrag && dragStart) {
        const p = getXY(e);
        this._handleTap(p.x, p.y);
      }
      dragStart = null; didDrag = false;
    });
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.camDist = Math.max(12, Math.min(80, this.camDist + e.deltaY * 0.06));
      this._updateCamera();
    }, { passive: false });

    // Touch
    let touchStart = null, camTouchStart = null, touchMoved = false;
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        touchStart    = getXY(e);
        camTouchStart = { x: this.camTarget.x, z: this.camTarget.z };
        touchMoved    = false;
      }
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        lastPinch = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }
    }, { passive: false });
    c.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStart) {
        const p  = getXY(e);
        const dx = p.x - touchStart.x, dy = p.y - touchStart.y;
        const { gx, gy } = this._getGroundTile(p.x, p.y);
        this._hoverGx = gx; this._hoverGy = gy;
        this._updatePreview(gx, gy);
        if (Math.hypot(dx, dy) > 10) {
          touchMoved = true;
          const f = this.camDist / 35;
          this.camTarget.x = camTouchStart.x - dx * 0.055 * f;
          this.camTarget.z = camTouchStart.z - dy * 0.055 * f;
          this._clampCamTarget();
          this._updateCamera();
        }
      }
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const d  = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (lastPinch > 0) {
          this.camDist = Math.max(12, Math.min(80, this.camDist * (lastPinch / d)));
          this._updateCamera();
        }
        lastPinch = d;
      }
    }, { passive: false });
    c.addEventListener('touchend', e => {
      if (!touchMoved && touchStart && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const r = c.getBoundingClientRect();
        this._handleTap(t.clientX - r.left, t.clientY - r.top);
      }
      touchStart = null; lastPinch = 0;
    }, { passive: false });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.mode = 'normal'; this.selectedBuild = null; this.ui.hideAll(); }
    });
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    this.renderer.setSize(w, h);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  // ── Info panel ────────────────────────────────────────────────────────────
  showStats() {
    const eco = this.economy, park = this.park;
    document.getElementById('stats-body').innerHTML = `
      <div class="sgrid">
        <div class="sitem"><span class="s-ico">💰</span><div><strong>${fmt$(eco.money)}</strong><small>Касса</small></div></div>
        <div class="sitem"><span class="s-ico">📅</span><div><strong>День ${eco.day}</strong><small>Текущий день</small></div></div>
        <div class="sitem"><span class="s-ico">⭐</span><div><strong>${eco.rating} ⭐</strong><small>Рейтинг</small></div></div>
        <div class="sitem"><span class="s-ico">👥</span><div><strong>${park.totalVisitors}</strong><small>Всего посетителей</small></div></div>
        <div class="sitem"><span class="s-ico">🎢</span><div><strong>${park.getAttractionCount()}/${park.attractions.size}</strong><small>Аттракционов открыто</small></div></div>
        <div class="sitem"><span class="s-ico">👷</span><div><strong>${this.builders.length}/${MAX_BUILDERS}</strong><small>Строителей</small></div></div>
        <div class="sitem"><span class="s-ico">📈</span><div><strong>${fmt$(eco.avgNet)}/день</strong><small>Ср. доход</small></div></div>
        <div class="sitem"><span class="s-ico">💼</span><div><strong>${eco.investors.length}</strong><small>Активных инвесторов</small></div></div>
      </div>
      <div class="stip">💡 Совет: ${this._randomTip()}</div>
    `;
    this.ui.showSheet('sh-stats');
  }

  _randomTip() {
    return [
      'Прокладывай дорожки, чтобы посетители могли дойти до аттракционов!',
      'Больше строителей = быстрее стройка.',
      'Инвесторы дают капитал, но забирают долю дохода.',
      'Ларьки с едой повышают настроение посетителей!',
      'Американские горки резко увеличивают поток посетителей.',
      'Более высокий рейтинг привлекает крупных инвесторов.',
    ][Math.floor(Math.random() * 6)];
  }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new Game(); });
