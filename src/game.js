import { Park }             from './park.js';
import { Economy }          from './economy.js';
import { InvestmentSystem } from './investment.js';
import { Renderer }         from './renderer.js';
import { UI }               from './ui.js';
import { Visitor, Builder } from './character.js';
import { TILE, GRID_W, GRID_H, BUILDER_COST, BUILDER_SAL, MAX_BUILDERS, ATTRACTIONS } from './data.js';
import { rnd, rndInt, fmt$ } from './utils.js';

class Game {
  constructor() {
    this.canvas     = document.getElementById('gameCanvas');
    this.park       = new Park(this);
    this.economy    = new Economy(this);
    this.investment = new InvestmentSystem(this);
    this.renderer   = new Renderer(this.canvas, this);
    this.ui         = new UI(this);

    this.visitors   = [];
    this.builders   = [];

    this.mode         = 'normal'; // normal | build | path | inspect
    this.selectedBuild = null;
    this.hoverGx      = -1;
    this.hoverGy      = -1;
    this.gameSpeed    = 1;

    this._lastTime   = 0;
    this._visSpawn   = 0;
    this._camDrag    = null;

    this._bindInput();
    this._loop(0);
    this.ui.notify('🎡 Welcome to Park Tycoon! Tap Build to start.', 'info');
  }

  _loop(ts) {
    const dt = Math.min((ts - this._lastTime) / 1000, 0.1) * this.gameSpeed;
    this._lastTime = ts;
    this._update(dt);
    this.renderer.render();
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this.park.update(dt);
    this.economy.update(dt);
    this.investment.update(dt);
    this._updateVisitors(dt);
    this._updateBuilders(dt);
    this._spawnVisitors(dt);
    this.ui.update();
  }

  _updateVisitors(dt) {
    for (let i = this.visitors.length - 1; i >= 0; i--) {
      this.visitors[i].update(dt, this);
      if (this.visitors[i].state === 'dead') this.visitors.splice(i, 1);
    }
  }

  _updateBuilders(dt) {
    for (const b of this.builders) b.update(dt, this);
  }

  _spawnVisitors(dt) {
    const openCount = this.park.getAttractionCount();
    if (openCount === 0) return;
    const maxVisitors = Math.min(8 + openCount * 4, 60);
    if (this.visitors.length >= maxVisitors) return;

    const spawnRate = 0.5 + openCount * 0.3; // visitors per second
    this._visSpawn += dt * spawnRate;
    while (this._visSpawn >= 1) {
      this._visSpawn -= 1;
      this._spawnOneVisitor();
    }
  }

  _spawnOneVisitor() {
    const ex = this.park.entranceX;
    const ey = this.park.entranceY;
    const px = ex * TILE + TILE / 2 + rnd(-10, 10);
    const py = (ey + 2) * TILE;
    const v  = new Visitor(px, py, this);
    // Walk from entrance to first path tile
    v.path = [{ gx: ex, gy: ey }];
    v.state = 'entering';
    this.visitors.push(v);
  }

  onHireBuilder() {
    if (this.builders.length >= MAX_BUILDERS) {
      this.ui.notify(`⚠️ Max ${MAX_BUILDERS} builders allowed!`, 'warn');
      return;
    }
    if (!this.economy.canAfford(BUILDER_COST)) {
      this.ui.notify(`❌ Need ${fmt$(BUILDER_COST)} to hire a builder`, 'error');
      return;
    }
    this.economy.spend(BUILDER_COST);
    const ex = this.park.entranceX;
    const ey = this.park.entranceY;
    const px = ex * TILE + TILE / 2 + rnd(-15, 15);
    const py = ey * TILE + TILE / 2;
    const b  = new Builder(px, py, this);
    b.depot  = { gx: ex, gy: ey };
    this.builders.push(b);
    this.ui.notify(`👷 Builder hired! (${this.builders.length}/${MAX_BUILDERS}) — ${fmt$(BUILDER_SAL)}/day salary`, 'success');
  }

  onToolAction(action) {
    this.mode = 'normal';
    this.selectedBuild = null;
    this.ui.hideAll();

    switch (action) {
      case 'build':
        this.ui.showPanel('build-panel');
        break;
      case 'path':
        this.mode = 'path';
        this.ui.notify(`🛤️ Path mode — click tiles to lay paths (${fmt$(20)} each)`, 'info');
        break;
      case 'hire':
        this.ui.showPanel('hire-panel');
        break;
      case 'invest':
        this.ui.showPanel('invest-panel');
        break;
      case 'info':
        this._showParkInfo();
        break;
    }
  }

  _showParkInfo() {
    const eco  = this.economy;
    const park = this.park;
    const openAttrs  = park.getAttractionCount();
    const totalAttrs = park.attractions.size;
    document.getElementById('info-content').innerHTML = `
      <div class="info-grid">
        <div class="info-item"><span class="info-icon">💰</span><div><strong>${fmt$(eco.money)}</strong><small>Cash</small></div></div>
        <div class="info-item"><span class="info-icon">📅</span><div><strong>Day ${eco.day}</strong><small>Current Day</small></div></div>
        <div class="info-item"><span class="info-icon">⭐</span><div><strong>${eco.rating} Stars</strong><small>Park Rating</small></div></div>
        <div class="info-item"><span class="info-icon">👥</span><div><strong>${park.totalVisitors}</strong><small>Total Visitors</small></div></div>
        <div class="info-item"><span class="info-icon">🎢</span><div><strong>${openAttrs}/${totalAttrs}</strong><small>Attractions Open</small></div></div>
        <div class="info-item"><span class="info-icon">👷</span><div><strong>${this.builders.length}</strong><small>Builders</small></div></div>
        <div class="info-item"><span class="info-icon">📈</span><div><strong>${fmt$(eco.avgNet)}/day</strong><small>Avg Net Income</small></div></div>
        <div class="info-item"><span class="info-icon">💼</span><div><strong>${eco.investors.length}</strong><small>Active Investors</small></div></div>
      </div>
      <div class="info-hint">💡 Tip: ${this._randomTip()}</div>
    `;
    this.ui.showPanel('info-panel');
  }

  _randomTip() {
    const tips = [
      'Build paths to connect attractions and guide visitors!',
      'More builders = faster construction time.',
      'Investors provide capital but take a cut of your income.',
      'Food stalls boost visitor happiness and spending!',
      'A roller coaster dramatically increases visitor flow.',
      'Higher star rating attracts better investors.',
      'Operating costs increase with more attractions — watch your finances!',
      'Visitors leave if queues are too long. Build more capacity!',
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  _bindInput() {
    const canvas = this.canvas;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const onClick = (sx, sy) => {
      const { gx, gy } = this.renderer.screenToGrid(sx, sy);
      if (this.mode === 'build' && this.selectedBuild) {
        const attr = this.park.placeAttraction(gx, gy, this.selectedBuild);
        if (!attr) {
          if (!this.economy.canAfford(0)) {
            this.ui.notify('❌ Not enough money!', 'error');
          } else {
            this.ui.notify('❌ Cannot build here — check tile size and borders', 'error');
          }
        }
      } else if (this.mode === 'path') {
        const ok = this.park.placePath(gx, gy);
        if (!ok) {
          if (!this.economy.canAfford(20)) this.ui.notify('❌ Not enough money!', 'error');
        }
      } else {
        // Inspect attraction
        const attr = this.park.attrAt(gx, gy);
        if (attr) this._inspectAttraction(attr);
      }
    };

    // Mouse
    let mouseDown = false;
    let dragStart = null;
    let camStart  = null;
    let didDrag   = false;

    canvas.addEventListener('mousedown', e => {
      mouseDown  = true;
      dragStart  = { x: e.clientX, y: e.clientY };
      camStart   = { x: this.renderer.camX, y: this.renderer.camY };
      didDrag    = false;
    });
    canvas.addEventListener('mousemove', e => {
      const pos = getPos(e);
      const g   = this.renderer.screenToGrid(pos.x, pos.y);
      this.hoverGx = g.gx;
      this.hoverGy = g.gy;
      if (mouseDown && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        if (Math.hypot(dx, dy) > 5) {
          didDrag = true;
          this.renderer.camX = camStart.x + dx / this.renderer.zoom;
          this.renderer.camY = camStart.y + dy / this.renderer.zoom;
        }
      }
    });
    canvas.addEventListener('mouseup', e => {
      if (!didDrag) {
        const pos = getPos(e);
        onClick(pos.x, pos.y);
      }
      mouseDown = false;
      didDrag   = false;
    });

    // Zoom
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = -e.deltaY / 600;
      const newZ  = Math.max(0.4, Math.min(2, this.renderer.zoom + delta));
      const pos   = getPos(e);
      const wx    = pos.x / this.renderer.zoom - this.renderer.camX;
      const wy    = pos.y / this.renderer.zoom - this.renderer.camY;
      this.renderer.zoom = newZ;
      this.renderer.camX = pos.x / newZ - wx;
      this.renderer.camY = pos.y / newZ - wy;
    }, { passive: false });

    // Touch
    let touchStart = null;
    let camTouchStart = null;
    let touchMoved = false;

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        touchStart     = getPos(e);
        camTouchStart  = { x: this.renderer.camX, y: this.renderer.camY };
        touchMoved     = false;
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStart) {
        const pos = getPos(e);
        const dx  = pos.x - touchStart.x;
        const dy  = pos.y - touchStart.y;
        const g   = this.renderer.screenToGrid(pos.x, pos.y);
        this.hoverGx = g.gx;
        this.hoverGy = g.gy;
        if (Math.hypot(dx, dy) > 8) {
          touchMoved = true;
          this.renderer.camX = camTouchStart.x + dx / this.renderer.zoom;
          this.renderer.camY = camTouchStart.y + dy / this.renderer.zoom;
        }
      }
      if (e.touches.length === 2) {
        // Pinch zoom
        const t1 = e.touches[0], t2 = e.touches[1];
        const d  = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (this._lastPinch) {
          const delta = (d - this._lastPinch) / 200;
          const cx = (t1.clientX + t2.clientX) / 2;
          const cy = (t1.clientY + t2.clientY) / 2;
          const newZ = Math.max(0.4, Math.min(2, this.renderer.zoom + delta));
          const wx = cx / this.renderer.zoom - this.renderer.camX;
          const wy = cy / this.renderer.zoom - this.renderer.camY;
          this.renderer.zoom = newZ;
          this.renderer.camX = cx / newZ - wx;
          this.renderer.camY = cy / newZ - wy;
        }
        this._lastPinch = d;
      }
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      this._lastPinch = null;
      if (!touchMoved && touchStart) {
        onClick(touchStart.x, touchStart.y);
      }
      touchStart = null;
    }, { passive: false });

    // Escape to cancel build mode
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.mode = 'normal';
        this.selectedBuild = null;
        this.ui.hideAll();
      }
    });
  }

  _inspectAttraction(attr) {
    const def = ATTRACTIONS[attr.typeId];
    const stateLabel = {
      planned: '🔴 Planned',
      building: `🔨 Building ${Math.floor(attr.progress * 100)}%`,
      open: '🟢 Open',
      closed: '⭕ Closed',
    }[attr.state] || attr.state;
    this.ui.notify(
      `${def.emoji} ${def.name} — ${stateLabel} | Earned: ${fmt$(attr.totalEarned)} | Visits: ${attr.totalVisited}`,
      'info'
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
