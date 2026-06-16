import { TILE, GRID_W, GRID_H, SKIN_TONES, HAIR_COLORS, SHIRT_COLS, PANT_COLS, BUILDER_SPD, BUILDER_RATE, ATTRACTIONS } from './data.js';
import { uid, pick, rnd, rndInt, aStar, dist, lerp } from './utils.js';

// ---- Base Character ----
class Character {
  constructor(type, px, py) {
    this.id    = uid();
    this.type  = type;
    this.px    = px;  // pixel x
    this.py    = py;  // pixel y
    this.tx    = px;  // target pixel x
    this.ty    = py;  // target pixel y
    this.speed = BUILDER_SPD;
    this.path  = [];  // [{gx,gy}]
    this.state = 'idle';
    this.age   = 0;
    this.animT = Math.random() * Math.PI * 2;
    this.facing = 1; // 1 = right, -1 = left
    this.alpha  = 1;
  }

  get gx() { return Math.floor(this.px / TILE); }
  get gy() { return Math.floor(this.py / TILE); }

  moveToward(dt) {
    if (this.path.length === 0) return true;
    const next = this.path[0];
    const nx = next.gx * TILE + TILE / 2;
    const ny = next.gy * TILE + TILE / 2;
    const dx = nx - this.px, dy = ny - this.py;
    const d  = Math.hypot(dx, dy);
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
    if (d < 2) {
      this.px = nx;
      this.py = ny;
      this.path.shift();
      return this.path.length === 0;
    }
    const spd = this.speed * dt;
    this.px += (dx / d) * spd;
    this.py += (dy / d) * spd;
    return false;
  }

  update(dt, game) {
    this.age   += dt;
    this.animT += dt * 6;
  }
}

// ---- Visitor ----
export class Visitor extends Character {
  constructor(px, py, game) {
    super('visitor', px, py);
    this.game     = game;
    this.speed    = rnd(55, 80);
    this.happiness = rnd(0.6, 1.0);
    this.money    = rndInt(20, 80);
    this.target   = null;  // attraction id
    this.waitTime = 0;
    this.leaveDelay = rnd(60, 180);
    this.app = {
      skin:  pick(SKIN_TONES),
      hair:  pick(HAIR_COLORS),
      shirt: pick(SHIRT_COLS),
      pants: pick(PANT_COLS),
      acc:   rnd(0, 1) < 0.4 ? pick(['balloon', 'ice_cream', 'hat', 'bag']) : null,
      accCol: pick(['#e74c3c','#3498db','#f39c12','#9b59b6','#2ecc71','#ff6b6b']),
      hatCol: pick(['#e74c3c','#1a1a2e','#2c3e50','#f39c12','#8B4513']),
      hairStyle: rndInt(0, 3), // 0=short, 1=long, 2=curly, 3=bun
      bodyScale: rnd(0.85, 1.1),
      name: pick(['Alex','Sam','Jordan','Casey','Morgan','Riley','Taylor','Pat','Blake','Avery']),
    };
    this.state = 'entering';
  }

  findNextAttraction() {
    const open = this.game.park.getOpenAttractions();
    if (open.length === 0) return null;
    // Weight by queue size (prefer shorter queues)
    const candidates = open.filter(a => a.queue.length < ATTRACTIONS[a.typeId].capacity);
    if (candidates.length === 0) return null;
    return pick(candidates);
  }

  update(dt, game) {
    super.update(dt, game);
    const park = game.park;

    switch (this.state) {
      case 'entering': {
        const arrived = this.moveToward(dt);
        if (arrived || this.path.length === 0) this._pickTarget();
        break;
      }
      case 'walking': {
        const arrived = this.moveToward(dt);
        if (arrived) {
          if (this.target) {
            const attr = park.attractions.get(this.target);
            if (attr && attr.state === 'open') {
              this.state = 'queuing';
              attr.queue.push(this.id);
            } else {
              this._pickTarget();
            }
          } else {
            this.state = 'wandering';
          }
        }
        break;
      }
      case 'queuing': {
        const attr = park.attractions.get(this.target);
        if (!attr || attr.state !== 'open') { this._pickTarget(); break; }
        const idx = attr.queue.indexOf(this.id);
        if (idx === 0) {
          // At front of queue — enter attraction
          attr.queue.shift();
          attr.visitors.push(this.id);
          this.state = 'riding';
          this.waitTime = ATTRACTIONS[attr.typeId].capacity * 3 + rnd(2, 5);
          park.totalVisitors++;
          game.economy.earn(ATTRACTIONS[attr.typeId].incomePerVisit);
          attr.totalVisited++;
          this.happiness = Math.min(1, this.happiness + 0.05);
        } else {
          // Wait in queue
          this.waitTime += dt;
          if (this.waitTime > 20) { // Too long, leave queue
            attr.queue.splice(idx, 1);
            this.waitTime = 0;
            this.happiness -= 0.05;
            this._pickTarget();
          }
        }
        break;
      }
      case 'riding': {
        this.waitTime -= dt;
        if (this.waitTime <= 0) {
          const attr = park.attractions.get(this.target);
          if (attr) {
            const idx = attr.visitors.indexOf(this.id);
            if (idx >= 0) attr.visitors.splice(idx, 1);
          }
          this.target = null;
          this._pickTarget();
        }
        break;
      }
      case 'wandering': {
        const arrived = this.moveToward(dt);
        if (arrived) {
          this.waitTime += dt;
          if (this.waitTime > 3) {
            this.waitTime = 0;
            if (this.age > this.leaveDelay) {
              this._leave(game);
            } else {
              this._pickTarget();
            }
          }
        }
        break;
      }
      case 'leaving': {
        this.moveToward(dt);
        this.alpha = Math.max(0, this.alpha - dt * 0.5);
        if (this.alpha <= 0) this.state = 'dead';
        break;
      }
    }
  }

  _pickTarget() {
    const attr = this.findNextAttraction();
    if (attr && this.age < this.leaveDelay) {
      const spot = this.game.park.getNearbyPath(attr);
      if (spot) {
        const path = aStar(
          (gx, gy) => this.game.park.isWalkable(gx, gy),
          GRID_W, GRID_H,
          this.gx, this.gy,
          spot.x, spot.y
        );
        if (path) {
          this.path = path;
          this.target = attr.id;
          this.state = 'walking';
          return;
        }
      }
    }
    // Wander randomly on paths
    this._wander();
  }

  _wander() {
    const gx = this.gx, gy = this.gy;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const valid = dirs.map(([dx,dy]) => ({gx: gx+dx, gy: gy+dy}))
      .filter(p => this.game.park.isWalkable(p.gx, p.gy));
    if (valid.length > 0) {
      const t = pick(valid);
      this.path = [t];
    }
    this.state = 'wandering';
    this.waitTime = 0;
  }

  _leave(game) {
    const en = game.park.entranceX;
    const ey = game.park.entranceY + 3;
    const path = aStar(
      (gx, gy) => game.park.isWalkable(gx, gy),
      GRID_W, GRID_H,
      this.gx, this.gy, en, ey
    );
    this.path  = path || [];
    this.state = 'leaving';
  }
}

// ---- Builder ----
export class Builder extends Character {
  constructor(px, py, game) {
    super('builder', px, py);
    this.game  = game;
    this.speed = BUILDER_SPD;
    this.job   = null; // attraction id
    this.app = {
      skin:  pick(SKIN_TONES),
      hair:  pick(HAIR_COLORS),
      vest:  pick(['#f39c12','#e67e22','#e74c3c','#27ae60']),
      hard:  pick(['#f1c40f','#e74c3c','#3498db','#ffffff']),
      pants: '#1a1a2e',
      name:  pick(['Mike','Dave','Steve','Jake','Lena','Sara','Pam','Tomo','Nico','Fred']),
    };
    this.state = 'idle';
    this.depot = { gx: px / TILE, gy: py / TILE };
  }

  assignJob(attrId) {
    this.job   = attrId;
    this.state = 'going';
    const attr = this.game.park.attractions.get(attrId);
    if (!attr) return;
    const spot = this.game.park.getNearbyPath(attr);
    if (!spot) return;
    const path = aStar(
      (gx, gy) => this.game.park.isWalkable(gx, gy),
      GRID_W, GRID_H,
      this.gx, this.gy,
      spot.x, spot.y
    );
    if (path) {
      this.path = path;
      attr.buildersHere.push(this.id);
    }
  }

  update(dt, game) {
    super.update(dt, game);
    switch (this.state) {
      case 'idle': {
        // Look for work
        for (const attr of game.park.attractions.values()) {
          const def = ATTRACTIONS[attr.typeId];
          if ((attr.state === 'planned' || attr.state === 'building') &&
              attr.buildersHere.length < def.buildersNeeded &&
              !attr.buildersHere.includes(this.id)) {
            this.assignJob(attr.id);
            return;
          }
        }
        break;
      }
      case 'going': {
        const arrived = this.moveToward(dt);
        if (arrived) this.state = 'building';
        break;
      }
      case 'building': {
        const attr = game.park.attractions.get(this.job);
        if (!attr || attr.state === 'open') {
          this._returnToDepot(game);
          return;
        }
        // Progress handled in park.update
        break;
      }
      case 'returning': {
        const arrived = this.moveToward(dt);
        if (arrived) {
          this.state = 'idle';
          this.job   = null;
        }
        break;
      }
    }
  }

  _returnToDepot(game) {
    if (this.job) {
      const attr = game.park.attractions.get(this.job);
      if (attr) {
        const idx = attr.buildersHere.indexOf(this.id);
        if (idx >= 0) attr.buildersHere.splice(idx, 1);
      }
      this.job = null;
    }
    const path = aStar(
      (gx, gy) => game.park.isWalkable(gx, gy),
      GRID_W, GRID_H,
      this.gx, this.gy,
      this.depot.gx, this.depot.gy
    );
    this.path  = path || [];
    this.state = 'returning';
  }
}

// ---- Investor ----
export class Investor extends Character {
  constructor(px, py, data, game) {
    super('investor', px, py);
    this.game    = game;
    this.data    = data;
    this.speed   = 50;
    this.state   = 'approaching';
    this.alpha   = 0;
    this.app = {
      skin:  pick(SKIN_TONES),
      hair:  pick(['#1a1a1a','#444','#808080']),
      suit:  pick(['#2c3e50','#1a252f','#4a235a','#154360']),
      tie:   pick(['#e74c3c','#3498db','#f39c12','#2ecc71']),
      name:  data.name,
    };
    // Walk toward a random spot near entrance
    const en = game.park.entranceX;
    this.path = [{ gx: en, gy: game.park.entranceY }];
  }

  update(dt, game) {
    super.update(dt, game);
    if (this.state === 'approaching') {
      this.alpha = Math.min(1, this.alpha + dt * 2);
      this.moveToward(dt);
      if (this.path.length === 0) this.state = 'waiting';
    }
    if (this.state === 'leaving') {
      this.moveToward(dt);
      this.alpha = Math.max(0, this.alpha - dt * 1.5);
      if (this.alpha <= 0) this.state = 'dead';
    }
  }

  dismiss() {
    this.path  = [{ gx: this.game.park.entranceX, gy: this.game.park.entranceY + 3 }];
    this.state = 'leaving';
  }
}
