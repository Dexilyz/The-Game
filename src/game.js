import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';
import { Park }             from './park.js';
import { Economy }          from './economy.js';
import { InvestmentSystem } from './investment.js';
import { UI }               from './ui.js';
import { Visitor, Builder } from './character.js';
import { createVisitor, createBuilder, createInvestor, animateCharacter, animateAttraction, createAttractionModel } from './models.js';
import { TILE, GRID_W, GRID_H, T3D, BUILDER_COST, BUILDER_SAL, MAX_BUILDERS, ATTRACTIONS, SKIN_TONES, HAIR_COLORS, SHIRT_COLS, PANT_COLS } from './data.js';
import { rnd, rndInt, fmt$, pick } from './utils.js';

class Game {
  constructor() {
    // ── Three.js ──
    this.canvas   = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.resize();

    this.scene  = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 90, 140);

    // Camera (tycoon top-down angle, fixed pitch)
    this.camera = new THREE.PerspectiveCamera(48, this.canvas.width / this.canvas.height, 0.1, 500);
    this.camTarget = new THREE.Vector3(GRID_W * T3D / 2, 0, GRID_H * T3D / 2);
    this.camDist   = 40;
    this._updateCamera();

    this._setupLights();
    this._setupGround();

    // ── Systems ──
    this.park       = new Park(this);
    this.economy    = new Economy(this);
    this.investment = new InvestmentSystem(this);
    this.ui         = new UI(this);

    this.visitors = [];
    this.builders = [];

    // ── State ──
    this.mode          = 'normal';
    this.selectedBuild = null;
    this.gameSpeed     = 1;
    this._visSpawn     = 0;
    this._lastTime     = 0;
    this._hoverGround  = new THREE.Vector3();
    this._hoverGx      = -1;
    this._hoverGy      = -1;
    this._preview      = null;

    // Raycaster for tile selection
    this._ray   = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Input
    this._setupInput();

    // Start
    this._loop(0);
    this.ui.notify('🎡 Добро пожаловать в Park Tycoon 3D! Нажми Строить.', 'info');
  }

  // ── Scene setup ──────────────────────────────────────────────────────────
  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0x90c0ff, 0.6));

    const sun = new THREE.DirectionalLight(0xfff5d0, 1.4);
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
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshLambertMaterial({ color: 0x7ec850 })
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
          new THREE.MeshLambertMaterial({ color: 0x6ab540 })
        );
        sq.rotation.x = -Math.PI / 2;
        sq.position.set(gx * T3D + T3D / 2, 0.005, gy * T3D + T3D / 2);
        sq.receiveShadow = true;
        this.scene.add(sq);
      }
    }
  }

  // ── Camera ───────────────────────────────────────────────────────────────
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
    this._update(dt, ts / 1000);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt, t) {
    this.park.update(dt);
    this.economy.update(dt);
    this.investment.update(dt);
    this._updateVisitors(dt, t);
    this._updateBuilders(dt, t);
    this._spawnVisitors(dt);
    this._animateAttractions(dt);
    this._updateInvestorModels(dt, t);
    this.ui.update();
  }

  _animateAttractions() {
    for (const attr of this.park.attractions.values()) {
      if (attr.mesh) animateAttraction(attr.mesh, arguments[0], attr.state);
    }
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
    const max  = Math.min(6 + open * 3, 45);
    if (this.visitors.length >= max) return;
    this._visSpawn += dt * (0.4 + open * 0.2);
    while (this._visSpawn >= 1) {
      this._visSpawn--;
      this._spawnOneVisitor();
    }
  }

  _spawnOneVisitor() {
    const ex = this.park.entranceX;
    const ey = this.park.entranceY;
    const px = ex * TILE + TILE / 2 + rnd(-6, 6);
    const py = (ey + 2) * TILE;
    const v  = new Visitor(px, py, this);
    v.path   = [{ gx: ex, gy: ey }];
    v.state  = 'entering';

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
    const ex = this.park.entranceX;
    const ey = this.park.entranceY;
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
  }

  onPathPlaced(gx, gy, mesh) {
    this.scene.add(mesh);
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
      const attr = this.park.placeAttraction(gx, gy, this.selectedBuild);
      if (!attr) this.ui.notify('❌ Нельзя построить здесь', 'error');
    } else if (this.mode === 'path') {
      if (!this.park.placePath(gx, gy)) {
        this.ui.notify('❌ Нельзя или нет денег', 'error');
      }
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
    const w = window.innerWidth, h = window.innerHeight;
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
