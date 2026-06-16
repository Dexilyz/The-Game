import { TILE, T3D, GRID_W, GRID_H, T, ATTRACTIONS, PATH_COST } from './data.js';
import { uid } from './utils.js';
import { createPathTile, createEntranceTile, createTree } from './models.js';

export class Park {
  constructor(game) {
    this.game       = game;
    this.grid       = [];
    this.attrMap    = [];
    this.attractions  = new Map();
    this.tileMeshes   = new Map(); // key='gx,gy' -> THREE mesh
    this.totalVisitors = 0;
    this.totalDays     = 0;
    this._initGrid();
  }

  _initGrid() {
    for (let gy = 0; gy < GRID_H; gy++) {
      this.grid[gy]    = [];
      this.attrMap[gy] = [];
      for (let gx = 0; gx < GRID_W; gx++) {
        const edge = (gx === 0 || gy === 0 || gx === GRID_W - 1 || gy === GRID_H - 1);
        this.grid[gy][gx]    = edge ? T.TREE : T.GRASS;
        this.attrMap[gy][gx] = null;
      }
    }
    // Entrance tiles at bottom center
    const ex = Math.floor(GRID_W / 2);
    const ey = GRID_H - 1;
    for (let dx = -1; dx <= 1; dx++) this.grid[ey][ex + dx] = T.ENTRANCE;
    for (let dy = 1; dy <= 4;  dy++) this.grid[ey - dy][ex] = T.PATH;
    this.entranceX = ex;
    this.entranceY = ey - 1;

    // Build initial 3D tiles
    this._buildAll3D();
  }

  _buildAll3D() {
    const scene = this.game.scene;
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const t = this.grid[gy][gx];
        if (t === T.PATH)     this._add3DTile(gx, gy, 'path');
        if (t === T.ENTRANCE) this._add3DTile(gx, gy, 'entrance');
        if (t === T.TREE)     this._add3DTile(gx, gy, 'tree');
      }
    }
  }

  _add3DTile(gx, gy, kind) {
    const key = `${gx},${gy}`;
    const old = this.tileMeshes.get(key);
    if (old) this.game.scene.remove(old);

    let mesh;
    if (kind === 'path')     mesh = createPathTile(T3D);
    else if (kind === 'entrance') mesh = createEntranceTile(T3D);
    else if (kind === 'tree')    mesh = createTree();
    else return;

    mesh.position.set(gx * T3D + T3D / 2, 0, gy * T3D + T3D / 2);
    this.game.scene.add(mesh);
    this.tileMeshes.set(key, mesh);
    return mesh;
  }

  // ── Placement ─────────────────────────────────────────────────────────────
  canPlace(gx, gy, typeId) {
    const def = ATTRACTIONS[typeId];
    if (!def) return false;
    const [w, h] = def.size;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = gx + dx, ty = gy + dy;
        if (tx < 1 || ty < 1 || tx >= GRID_W - 1 || ty >= GRID_H - 1) return false;
        if (this.grid[ty][tx] !== T.GRASS) return false;
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
    if (!this.game.economy.canAfford(PATH_COST)) return false;
    this.game.economy.spend(PATH_COST);
    this.grid[gy][gx] = T.PATH;
    this._add3DTile(gx, gy, 'path');
    return true;
  }

  placeAttraction(gx, gy, typeId) {
    if (!this.canPlace(gx, gy, typeId)) return null;
    const def = ATTRACTIONS[typeId];
    if (!this.game.economy.canAfford(def.cost)) return null;
    this.game.economy.spend(def.cost);

    const id = uid();
    const [w, h] = def.size;
    const attr = {
      id, typeId, gx, gy, w, h,
      // 2D pixel coords for pathfinding
      px: gx * TILE, py: gy * TILE,
      state: 'planned',
      progress: 0,
      buildersHere: [],
      queue: [],
      visitors: [],
      totalEarned: 0,
      totalVisited: 0,
      mesh: null,
      progressBar: null,
    };
    this.attractions.set(id, attr);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.grid[gy + dy][gx + dx]    = T.ATTRACTION;
        this.attrMap[gy + dy][gx + dx] = id;
      }
    }
    // Create 3D model
    this.game.onAttractionPlaced(attr);
    this.game.ui.notify(`🔨 Строим ${def.name}…`, 'info');
    return attr;
  }

  isWalkable(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return false;
    const t = this.grid[gy][gx];
    return t === T.PATH || t === T.ENTRANCE || t === T.GRASS;
  }

  getNearbyPath(attr) {
    const { gx, gy, w, h } = attr;
    const cands = [];
    for (let dx = 0; dx < w; dx++) {
      if (gy + h < GRID_H && this.isWalkable(gx + dx, gy + h)) cands.push({ x: gx + dx, y: gy + h });
      if (gy - 1 >= 0     && this.isWalkable(gx + dx, gy - 1)) cands.push({ x: gx + dx, y: gy - 1 });
    }
    for (let dy = 0; dy < h; dy++) {
      if (gx + w < GRID_W && this.isWalkable(gx + w, gy + dy)) cands.push({ x: gx + w, y: gy + dy });
      if (gx - 1 >= 0     && this.isWalkable(gx - 1, gy + dy)) cands.push({ x: gx - 1, y: gy + dy });
    }
    // Prefer path tiles
    const onPath = cands.filter(c => this.grid[c.y][c.x] === T.PATH || this.grid[c.y][c.x] === T.ENTRANCE);
    const pool   = onPath.length > 0 ? onPath : cands;
    return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  getOpenAttractions() {
    return [...this.attractions.values()].filter(a => a.state === 'open');
  }

  getAttractionCount() {
    return this.getOpenAttractions().length;
  }

  attrAt(gx, gy) {
    const id = this.attrMap[gy]?.[gx];
    return id ? this.attractions.get(id) : null;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(dt) {
    for (const attr of this.attractions.values()) {
      if (attr.state === 'planned' && attr.buildersHere.length > 0) {
        attr.state = 'building';
      }
      if (attr.state === 'building') {
        const rate = attr.buildersHere.length * 0.018;
        attr.progress += rate * dt;
        if (attr.progress >= 1) {
          attr.progress = 1;
          attr.state    = 'open';
          this.game.onAttractionBuilt(attr);
          const def = ATTRACTIONS[attr.typeId];
          this.game.ui.notify(`🎉 ${def.name} открыт!`, 'success');
        }
        // Update progress bar scale
        if (attr.progressBar) {
          attr.progressBar.scale.x = attr.progress;
          attr.progressBar.position.x = (attr.gx + attr.w / 2) * T3D - (1 - attr.progress) * attr.w * T3D / 2;
        }
      }
      // Passive income while visitors are inside
      if (attr.state === 'open' && attr.visitors.length > 0) {
        const def = ATTRACTIONS[attr.typeId];
        const inc = def.incomePerVisit * attr.visitors.length * dt * 0.06;
        this.game.economy.earn(inc);
        attr.totalEarned += inc;
      }
    }
  }
}
