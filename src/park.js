import { TILE, GRID_W, GRID_H, T, ATTRACTIONS, PATH_COST } from './data.js';
import { uid } from './utils.js';

export class Park {
  constructor(game) {
    this.game = game;
    this.grid      = [];  // T.* values
    this.attrMap   = [];  // attractionId or null per tile
    this.attractions = new Map();
    this.totalVisitors = 0;
    this.totalDays     = 0;
    this._initGrid();
  }

  _initGrid() {
    for (let y = 0; y < GRID_H; y++) {
      this.grid[y]    = [];
      this.attrMap[y] = [];
      for (let x = 0; x < GRID_W; x++) {
        // Decorative trees around edges
        if (x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1) {
          this.grid[y][x] = T.TREE;
        } else {
          this.grid[y][x] = T.GRASS;
        }
        this.attrMap[y][x] = null;
      }
    }
    // Entrance at bottom center
    const ex = Math.floor(GRID_W / 2);
    const ey = GRID_H - 1;
    this.grid[ey][ex]     = T.ENTRANCE;
    this.grid[ey][ex - 1] = T.ENTRANCE;
    this.grid[ey][ex + 1] = T.ENTRANCE;
    // Initial path upward from entrance
    for (let dy = 1; dy <= 4; dy++) {
      this.grid[ey - dy][ex] = T.PATH;
    }
    this.entranceX = ex;
    this.entranceY = ey - 1;
  }

  canPlace(gx, gy, typeId) {
    const def = ATTRACTIONS[typeId];
    if (!def) return false;
    const [w, h] = def.size;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = gx + dx, ty = gy + dy;
        if (tx < 1 || ty < 1 || tx >= GRID_W - 1 || ty >= GRID_H - 1) return false;
        const t = this.grid[ty][tx];
        if (t !== T.GRASS) return false;
      }
    }
    return true;
  }

  canPlacePath(gx, gy) {
    if (gx < 1 || gy < 1 || gx >= GRID_W - 1 || gy >= GRID_H - 1) return false;
    return this.grid[gy][gx] === T.GRASS;
  }

  placePath(gx, gy) {
    if (!this.canPlacePath(gx, gy)) return false;
    if (this.game.economy.money < PATH_COST) return false;
    this.game.economy.spend(PATH_COST);
    this.grid[gy][gx] = T.PATH;
    return true;
  }

  placeAttraction(gx, gy, typeId) {
    if (!this.canPlace(gx, gy, typeId)) return null;
    const def  = ATTRACTIONS[typeId];
    const cost = def.cost;
    if (this.game.economy.money < cost) return null;

    this.game.economy.spend(cost);
    const id = uid();
    const [w, h] = def.size;
    const attr = {
      id, typeId,
      gx, gy, w, h,
      px: gx * TILE, py: gy * TILE,
      state: 'planned',
      progress: 0,
      buildersHere: [],
      queue: [],
      visitors: [],
      animAngle: 0,
      animPhase: 0,
      totalEarned: 0,
      totalVisited: 0,
    };
    this.attractions.set(id, attr);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.grid[gy + dy][gx + dx]    = T.ATTRACTION;
        this.attrMap[gy + dy][gx + dx] = id;
      }
    }
    this.game.ui.notify(`🔨 Building ${def.name}...`, 'info');
    return attr;
  }

  removeAttraction(id) {
    const attr = this.attractions.get(id);
    if (!attr) return;
    for (let dy = 0; dy < attr.h; dy++) {
      for (let dx = 0; dx < attr.w; dx++) {
        this.grid[attr.gy + dy][attr.gx + dx]    = T.GRASS;
        this.attrMap[attr.gy + dy][attr.gx + dx] = null;
      }
    }
    this.attractions.delete(id);
  }

  isWalkable(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return false;
    const t = this.grid[gy][gx];
    return t === T.PATH || t === T.ENTRANCE || t === T.GRASS;
  }

  getNearbyPath(attr) {
    // Return a path tile adjacent to an attraction
    const { gx, gy, w, h } = attr;
    const candidates = [];
    for (let dx = 0; dx < w; dx++) {
      const below = { x: gx + dx, y: gy + h };
      const above = { x: gx + dx, y: gy - 1 };
      if (below.y < GRID_H && this.isWalkable(below.x, below.y)) candidates.push(below);
      if (above.y >= 0    && this.isWalkable(above.x, above.y)) candidates.push(above);
    }
    for (let dy = 0; dy < h; dy++) {
      const right = { x: gx + w, y: gy + dy };
      const left  = { x: gx - 1, y: gy + dy };
      if (right.x < GRID_W && this.isWalkable(right.x, right.y)) candidates.push(right);
      if (left.x  >= 0     && this.isWalkable(left.x,  left.y))  candidates.push(left);
    }
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  }

  getOpenAttractions() {
    return [...this.attractions.values()].filter(a => a.state === 'open');
  }

  getAttractionCount() {
    return [...this.attractions.values()].filter(a => a.state === 'open').length;
  }

  attrAt(gx, gy) {
    const id = this.attrMap[gy]?.[gx];
    return id ? this.attractions.get(id) : null;
  }

  update(dt) {
    const now = performance.now() / 1000;
    for (const attr of this.attractions.values()) {
      // Update animation angles
      attr.animAngle += dt * (attr.state === 'open' ? 0.5 : 0.1);
      attr.animPhase  = now;

      if (attr.state === 'planned') {
        if (attr.buildersHere.length > 0) attr.state = 'building';
      }
      if (attr.state === 'building') {
        const rate = attr.buildersHere.length * 0.018;
        attr.progress += rate * dt;
        if (attr.progress >= 1) {
          attr.progress = 1;
          attr.state = 'open';
          const def = ATTRACTIONS[attr.typeId];
          this.game.ui.notify(`🎉 ${def.name} is now open!`, 'success');
        }
      }
      // Income from visitors using attraction
      if (attr.state === 'open' && attr.visitors.length > 0) {
        const def = ATTRACTIONS[attr.typeId];
        const income = def.incomePerVisit * attr.visitors.length * dt * 0.1;
        this.game.economy.earn(income);
        attr.totalEarned += income;
      }
    }
  }
}
