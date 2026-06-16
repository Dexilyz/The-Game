import { TILE, GRID_W, GRID_H, T, ATTRACTIONS } from './data.js';
import { roundRect } from './utils.js';

const GRASS_COL   = '#7ec850';
const GRASS_DARK  = '#6ab540';
const PATH_COL    = '#c8b89a';
const PATH_DARK   = '#b5a58a';
const TREE_COL    = '#2d8a4e';
const TREE_TRUNK  = '#8B6914';
const WATER_COL   = '#5dade2';
const ENT_COL     = '#f39c12';

export class Renderer {
  constructor(canvas, game) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.game    = game;
    this.camX    = 0;
    this.camY    = 0;
    this.zoom    = 1;
    this.dpr     = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width  = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.vw = w;
    this.vh = h;
    // Center camera on park
    this.camX = (GRID_W * TILE * -0.5 + w * 0.5);
    this.camY = (GRID_H * TILE * -0.5 + h * 0.5);
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx + this.camX) * this.zoom,
      y: (wy + this.camY) * this.zoom,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: sx / this.zoom - this.camX,
      y: sy / this.zoom - this.camY,
    };
  }

  screenToGrid(sx, sy) {
    const w = this.screenToWorld(sx, sy);
    return { gx: Math.floor(w.x / TILE), gy: Math.floor(w.y / TILE) };
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.vw, this.vh);

    // Sky background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.vh);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(1, '#b8e4f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.vw, this.vh);

    ctx.translate(this.camX * this.zoom, this.camY * this.zoom);
    ctx.scale(this.zoom, this.zoom);

    this._drawGrid();
    this._drawAttractions();
    this._drawCharacters();
    this._drawBuildPreview();

    ctx.restore();
  }

  _drawGrid() {
    const ctx = this.ctx;
    const park = this.game.park;
    // Visible tile range
    const wx0 = -this.camX, wy0 = -this.camY;
    const wx1 = wx0 + this.vw / this.zoom, wy1 = wy0 + this.vh / this.zoom;
    const gx0 = Math.max(0, Math.floor(wx0 / TILE));
    const gy0 = Math.max(0, Math.floor(wy0 / TILE));
    const gx1 = Math.min(GRID_W - 1, Math.ceil(wx1 / TILE));
    const gy1 = Math.min(GRID_H - 1, Math.ceil(wy1 / TILE));

    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const px = gx * TILE, py = gy * TILE;
        const type = park.grid[gy]?.[gx];
        this._drawTile(ctx, px, py, type, gx, gy);
      }
    }
  }

  _drawTile(ctx, px, py, type, gx, gy) {
    const S = TILE;
    switch (type) {
      case T.GRASS: {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? GRASS_COL : GRASS_DARK;
        ctx.fillRect(px, py, S, S);
        // Random tiny grass tufts (seeded by position)
        const seed = (gx * 31 + gy * 17) % 100;
        if (seed < 30) {
          ctx.fillStyle = '#5a9e38';
          const bx = px + (seed % 5) * 9 + 4, by = py + Math.floor(seed / 5) * 9 + 4;
          ctx.fillRect(bx, by, 2, 4);
          ctx.fillRect(bx - 2, by + 1, 2, 3);
          ctx.fillRect(bx + 2, by + 1, 2, 3);
        }
        break;
      }
      case T.PATH: {
        ctx.fillStyle = PATH_COL;
        ctx.fillRect(px, py, S, S);
        // Path texture lines
        ctx.strokeStyle = PATH_DARK;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + 8, py); ctx.lineTo(px + 8, py + S);
        ctx.moveTo(px + S - 8, py); ctx.lineTo(px + S - 8, py + S);
        ctx.stroke();
        break;
      }
      case T.ENTRANCE: {
        ctx.fillStyle = '#d4b483';
        ctx.fillRect(px, py, S, S);
        // Yellow stripes
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#f39c12' : '#d4b483';
          ctx.fillRect(px + i * 14, py, 14, S);
        }
        break;
      }
      case T.TREE: {
        ctx.fillStyle = '#558B40';
        ctx.fillRect(px, py, S, S);
        // Draw tree
        ctx.fillStyle = TREE_TRUNK;
        ctx.fillRect(px + S/2 - 4, py + S * 0.55, 8, S * 0.45);
        ctx.fillStyle = TREE_COL;
        ctx.beginPath();
        ctx.arc(px + S/2, py + S * 0.45, S * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3da85e';
        ctx.beginPath();
        ctx.arc(px + S/2 - 5, py + S * 0.38, S * 0.22, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case T.ATTRACTION: {
        // Drawn separately in _drawAttractions
        break;
      }
      default: {
        ctx.fillStyle = GRASS_COL;
        ctx.fillRect(px, py, S, S);
      }
    }
    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, S, S);
  }

  _drawAttractions() {
    const ctx = this.ctx;
    for (const attr of this.game.park.attractions.values()) {
      ctx.save();
      ctx.globalAlpha = attr.state === 'planned' ? 0.5 : 1;
      this._drawAttrBase(ctx, attr);
      this._drawAttrDetail(ctx, attr);
      if (attr.state === 'building') this._drawProgress(ctx, attr);
      if (attr.state === 'open' && attr.queue.length > 0) this._drawQueue(ctx, attr);
      ctx.restore();
    }
  }

  _drawAttrBase(ctx, attr) {
    const { px, py, w, h } = attr;
    const W = w * TILE, H = h * TILE;
    // Base ground
    ctx.fillStyle = '#e8d5a3';
    ctx.fillRect(px, py, W, H);
    ctx.strokeStyle = '#c4a265';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, W, H);
  }

  _drawAttrDetail(ctx, attr) {
    const def = ATTRACTIONS[attr.typeId];
    const { px, py, w, h } = attr;
    const W = w * TILE, H = h * TILE;
    const cx = px + W / 2, cy = py + H / 2;
    const t  = attr.animAngle;

    ctx.save();
    ctx.translate(cx, cy);

    switch (attr.typeId) {
      case 'ferris_wheel':    this._drawFerrisWheel(ctx, t, def.col, W, H); break;
      case 'carousel':        this._drawCarousel(ctx, t, def.col, W, H); break;
      case 'roller_coaster':  this._drawRollerCoaster(ctx, t, def.col, W, H, attr); break;
      case 'food_stall':      this._drawFoodStall(ctx, def.col, W, H); break;
      case 'game_booth':      this._drawGameBooth(ctx, def.col, W, H); break;
      case 'ice_cream':       this._drawIceCreamCart(ctx, def.col, W, H); break;
      case 'haunted_house':   this._drawHauntedHouse(ctx, t, def.col, W, H); break;
      case 'balloon_ride':    this._drawBalloonRide(ctx, t, def.col, W, H); break;
      default:                this._drawGenericAttr(ctx, def, W, H); break;
    }

    ctx.restore();

    // Name label
    if (attr.state === 'open' || attr.state === 'building') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, px + 2, py + H - 18, W - 4, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(11, W * 0.12)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.name, cx, py + H - 10);
    }
  }

  _drawFerrisWheel(ctx, t, col, W, H) {
    const r = Math.min(W, H) * 0.38;
    // Support frame
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, r); ctx.lineTo(-r * 0.5, H / 2 + 5);
    ctx.moveTo( r * 0.15, r); ctx.lineTo( r * 0.5, H / 2 + 5);
    ctx.stroke();
    // Platform
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(-r * 0.6, H / 2, r * 1.2, 6);

    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.stroke();
    // Inner ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#bdc3c7';
    ctx.fill();

    // Spokes + gondolas
    const spokes = 8;
    for (let i = 0; i < spokes; i++) {
      const a = t + (i / spokes) * Math.PI * 2;
      const sx = Math.cos(a) * r, sy = Math.sin(a) * r;
      // Spoke
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Gondola (keep level)
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = i % 2 === 0 ? '#e74c3c' : '#3498db';
      roundRect(ctx, -6, -2, 12, 10, 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Person in gondola
      ctx.fillStyle = '#FDDBB4';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Light dots on rim
    for (let i = 0; i < 16; i++) {
      const a = t * 2 + (i / 16) * Math.PI * 2;
      const lx = Math.cos(a) * r, ly = Math.sin(a) * r;
      ctx.beginPath();
      ctx.arc(lx, ly, 2, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? '#f1c40f' : (i % 3 === 1 ? '#e74c3c' : '#fff');
      ctx.fill();
    }
  }

  _drawCarousel(ctx, t, col, W, H) {
    const r = Math.min(W, H) * 0.38;
    // Base platform
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.ellipse(0, H * 0.15, r, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pole
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(-4, -H * 0.35, 8, H * 0.5);

    // Canopy segments (rotating)
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const a0 = t + (i / segs) * Math.PI * 2;
      const a1 = t + ((i + 1) / segs) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, -H * 0.35);
      ctx.lineTo(Math.cos(a0) * r * 0.85, -H * 0.35 + r * 0.5);
      ctx.lineTo(Math.cos(a1) * r * 0.85, -H * 0.35 + r * 0.5);
      ctx.closePath();
      const colors = [col, '#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
    }
    // Canopy top ball
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, -H * 0.35, 6, 0, Math.PI * 2);
    ctx.fill();

    // Horses (rotating)
    const horses = 4;
    for (let i = 0; i < horses; i++) {
      const a = t + (i / horses) * Math.PI * 2;
      const hx = Math.cos(a) * r * 0.6;
      const hy = Math.sin(a) * r * 0.2 + H * 0.05;
      const bob = Math.sin(t * 2 + i * Math.PI / 2) * 6;
      ctx.save();
      ctx.translate(hx, hy + bob);
      this._drawHorseSimple(ctx, i % 2 === 0 ? '#fff' : '#f4d03f');
      ctx.restore();
    }
    // Decorative lights on canopy edge
    for (let i = 0; i < 12; i++) {
      const a = t + (i / 12) * Math.PI * 2;
      const lx = Math.cos(a) * r * 0.85;
      const ly = -H * 0.35 + r * 0.5 - 2;
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#f1c40f' : '#e74c3c';
      ctx.fill();
    }
  }

  _drawHorseSimple(ctx, col) {
    ctx.fillStyle = col;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Head
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(10, -5, 5, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Legs
    ctx.strokeStyle = col === '#fff' ? '#ddd' : '#c8a000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const lx = (i % 2 === 0 ? -4 : 4) + (i < 2 ? -2 : 2);
      ctx.beginPath();
      ctx.moveTo(lx, 5);
      ctx.lineTo(lx + (i % 2 === 0 ? -1 : 1), 12);
      ctx.stroke();
    }
    // Mane
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.ellipse(8, -8, 3, 2, -0.8, 0, Math.PI * 2);
    ctx.fill();
    // Pole
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 15);
    ctx.stroke();
  }

  _drawRollerCoaster(ctx, t, col, W, H, attr) {
    const sx = -W / 2 + 8, ex = W / 2 - 8;
    // Track supports
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const tx = sx + (i / 4) * (ex - sx);
      ctx.beginPath();
      ctx.moveTo(tx, H / 2 - 5);
      ctx.lineTo(tx, H / 2 - 15 - Math.sin((i / 4) * Math.PI) * H * 0.4);
      ctx.stroke();
    }
    // Track (3D-ish path)
    const trackPoints = [];
    for (let i = 0; i <= 20; i++) {
      const f  = i / 20;
      const tx = sx + f * (ex - sx);
      const ty = H * 0.1 - Math.sin(f * Math.PI) * H * 0.45 + Math.sin(f * Math.PI * 2) * H * 0.08;
      trackPoints.push({ x: tx, y: ty });
    }
    // Shadow track
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < trackPoints.length; i++) {
      i === 0 ? ctx.moveTo(trackPoints[i].x, trackPoints[i].y + 3) : ctx.lineTo(trackPoints[i].x, trackPoints[i].y + 3);
    }
    ctx.stroke();
    // Main track rails
    for (let rail = -3; rail <= 3; rail += 6) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < trackPoints.length; i++) {
        i === 0 ? ctx.moveTo(trackPoints[i].x, trackPoints[i].y + rail) : ctx.lineTo(trackPoints[i].x, trackPoints[i].y + rail);
      }
      ctx.stroke();
    }
    // Cross ties
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    for (let i = 0; i < trackPoints.length; i += 2) {
      const p = trackPoints[i];
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y - 3);
      ctx.lineTo(p.x + 4, p.y + 3);
      ctx.stroke();
    }
    // Moving car
    const carPos = (t * 0.4) % 1;
    const carIdx = Math.floor(carPos * (trackPoints.length - 1));
    const cp = trackPoints[Math.min(carIdx, trackPoints.length - 1)];
    ctx.save();
    ctx.translate(cp.x, cp.y);
    // Car body
    ctx.fillStyle = '#e74c3c';
    roundRect(ctx, -18, -10, 36, 14, 4);
    ctx.fill();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Windows
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(-13 + s * 12, -8, 8, 7);
    }
    // Tiny heads in windows
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = '#FDDBB4';
      ctx.beginPath();
      ctx.arc(-9 + s * 12, -5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Start/end ramp
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(sx - 5, H * 0.1, 10, H * 0.38);
  }

  _drawFoodStall(ctx, col, W, H) {
    // Booth body
    ctx.fillStyle = '#d4a96a';
    roundRect(ctx, -W * 0.45, -H * 0.2, W * 0.9, H * 0.45, 6);
    ctx.fill();
    // Striped awning
    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? col : '#fff';
      ctx.beginPath();
      ctx.moveTo(-W * 0.48 + (i / stripes) * W * 0.96, -H * 0.2);
      ctx.lineTo(-W * 0.48 + ((i + 1) / stripes) * W * 0.96, -H * 0.2);
      ctx.lineTo(-W * 0.48 + ((i + 0.5) / stripes) * W * 0.96 + W * 0.96 / stripes * 0.5, -H * 0.35);
      ctx.closePath();
      ctx.fill();
    }
    // Counter
    ctx.fillStyle = '#a67c52';
    ctx.fillRect(-W * 0.45, -H * 0.02, W * 0.9, 8);
    // Food items
    const items = ['🍔', '🌮', '🍕', '🥤'];
    ctx.font = `${Math.min(14, W * 0.13)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < Math.min(3, items.length); i++) {
      ctx.fillText(items[i], -W * 0.2 + i * W * 0.2, -H * 0.1);
    }
    // Sign
    ctx.fillStyle = '#e74c3c';
    roundRect(ctx, -W * 0.3, -H * 0.42, W * 0.6, H * 0.15, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(9, W * 0.1)}px Arial`;
    ctx.fillText('FOOD', 0, -H * 0.35);
  }

  _drawGameBooth(ctx, col, W, H) {
    // Booth
    ctx.fillStyle = '#e8d5a3';
    roundRect(ctx, -W * 0.42, -H * 0.4, W * 0.84, H * 0.55, 5);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Awning
    ctx.fillStyle = col;
    ctx.fillRect(-W * 0.45, -H * 0.45, W * 0.9, H * 0.1);
    // Targets
    const tColors = ['#e74c3c', '#fff', '#3498db'];
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(-W * 0.15 + i * W * 0.15, -H * 0.15);
      for (let ring = 2; ring >= 0; ring--) {
        ctx.beginPath();
        ctx.arc(0, 0, (ring + 1) * 5, 0, Math.PI * 2);
        ctx.fillStyle = tColors[ring];
        ctx.fill();
      }
      ctx.restore();
    }
    // Prizes (stuffed animals)
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧸', -W * 0.2, H * 0.05);
    ctx.fillText('🎃', W * 0.2, H * 0.05);
    // "WIN!" sign
    ctx.fillStyle = '#f1c40f';
    ctx.font = `bold ${Math.min(10, W * 0.12)}px Arial`;
    ctx.fillText('WIN!', 0, -H * 0.38);
  }

  _drawIceCreamCart(ctx, col, W, H) {
    // Cart wheels
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(-W * 0.25, H * 0.2, 8, 0, Math.PI * 2);
    ctx.arc( W * 0.25, H * 0.2, 8, 0, Math.PI * 2);
    ctx.fill();
    // Cart body
    ctx.fillStyle = '#ecf0f1';
    roundRect(ctx, -W * 0.4, -H * 0.2, W * 0.8, H * 0.38, 6);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Ice cream scoops graphic
    const scColors = ['#FF69B4', '#87ceeb', '#90ee90', '#ffd700'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = scColors[i % scColors.length];
      ctx.beginPath();
      ctx.arc(-W * 0.12 + i * W * 0.12, -H * 0.08, W * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cone
    ctx.fillStyle = '#d4a96a';
    ctx.beginPath();
    ctx.moveTo(-W * 0.08, H * 0.0);
    ctx.lineTo(W * 0.08, H * 0.0);
    ctx.lineTo(0, H * 0.2);
    ctx.closePath();
    ctx.fill();
    // Parasol
    const pColors = [col, '#f1c40f', '#e74c3c'];
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.2);
    ctx.lineTo(0, -H * 0.5);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * W * 0.35, py = Math.sin(a) * H * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, -H * 0.5);
      ctx.lineTo(px, -H * 0.35 + py);
      ctx.strokeStyle = pColors[i % pColors.length];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -H * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawHauntedHouse(ctx, t, col, W, H) {
    // Dark sky behind house
    ctx.fillStyle = '#1a0530';
    ctx.fillRect(-W / 2, -H / 2, W, H);

    // House body
    ctx.fillStyle = '#2c3e50';
    roundRect(ctx, -W * 0.38, -H * 0.25, W * 0.76, H * 0.5, 4);
    ctx.fill();
    ctx.strokeStyle = '#6c3483';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Roof
    ctx.fillStyle = '#1a252f';
    ctx.beginPath();
    ctx.moveTo(-W * 0.45, -H * 0.25);
    ctx.lineTo(0, -H * 0.5);
    ctx.lineTo(W * 0.45, -H * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spire
    ctx.strokeStyle = '#6c3483';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.5);
    ctx.lineTo(0, -H * 0.62);
    ctx.stroke();

    // Glowing windows (flickering)
    const glow = 0.6 + Math.sin(t * 3) * 0.4;
    ctx.fillStyle = `rgba(255, 200, 0, ${glow})`;
    ctx.fillRect(-W * 0.28, -H * 0.18, W * 0.18, H * 0.16);
    ctx.fillRect( W * 0.1,  -H * 0.18, W * 0.18, H * 0.16);

    // Cross window above door
    const cglow = 0.5 + Math.sin(t * 2 + 1) * 0.5;
    ctx.fillStyle = `rgba(150, 0, 255, ${cglow})`;
    ctx.fillRect(-W * 0.07, -H * 0.42, W * 0.14, H * 0.12);

    // Door
    ctx.fillStyle = '#111';
    roundRect(ctx, -W * 0.1, H * 0.05, W * 0.2, H * 0.2, 8);
    ctx.fill();

    // Ghost floating (animated)
    const ghostY = -H * 0.55 + Math.sin(t * 1.5) * 8;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.translate(W * 0.3, ghostY);
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.arc(0, 0, 10, Math.PI, 0);
    ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(5, 4, 0, 8);
    ctx.quadraticCurveTo(-5, 4, -10, 8);
    ctx.closePath();
    ctx.fill();
    // Ghost eyes
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(-4, -2, 2, 0, Math.PI * 2);
    ctx.arc(4, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bats
    for (let i = 0; i < 2; i++) {
      const ba = t * (1 + i * 0.3) + i * Math.PI;
      const bx = Math.cos(ba) * W * 0.35;
      const by = -H * 0.4 + Math.sin(ba * 2) * H * 0.08;
      ctx.save();
      ctx.translate(bx, by);
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-8, -6, -14, -2, -16, 2);
      ctx.lineTo(-10, 1);
      ctx.bezierCurveTo(-6, -1, 0, 3, 0, 3);
      ctx.bezierCurveTo(6, -1, 10, 1, 10, 1);
      ctx.lineTo(16, 2);
      ctx.bezierCurveTo(14, -2, 8, -6, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawBalloonRide(ctx, t, col, W, H) {
    // Platform
    ctx.fillStyle = '#95a5a6';
    roundRect(ctx, -W * 0.35, H * 0.15, W * 0.7, H * 0.2, 4);
    ctx.fill();
    // Center pole
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.15);
    ctx.lineTo(0, -H * 0.4);
    ctx.stroke();

    // Gondola basket
    const gx = Math.cos(t * 0.4) * W * 0.25;
    const gy = Math.sin(t * 0.8) * H * 0.04;
    ctx.save();
    ctx.translate(gx, H * 0.05 + gy);
    // Basket
    ctx.fillStyle = '#d4a96a';
    roundRect(ctx, -18, 0, 36, 20, 4);
    ctx.fill();
    ctx.strokeStyle = '#a0785a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Basket weave
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-18 + i * 9, 0);
      ctx.lineTo(-18 + i * 9, 20);
      ctx.strokeStyle = '#a0785a';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    // Ropes
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const bx = -14 + i * 9, rx = -20 + i * 13;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(rx, -40);
      ctx.stroke();
    }
    // Balloon envelope
    const bColors = [col, '#f1c40f', '#e74c3c', '#3498db'];
    for (let seg = 0; seg < 4; seg++) {
      const sa = (seg / 4) * Math.PI * 2;
      const ea = ((seg + 1) / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.arc(0, -55, 30, sa - Math.PI / 2, ea - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = bColors[seg % bColors.length];
      ctx.fill();
    }
    // Balloon outline
    ctx.beginPath();
    ctx.arc(0, -55, 30, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Balloon highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-8, -65, 10, 8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Passengers
    ctx.fillStyle = '#FDDBB4';
    ctx.beginPath();
    ctx.arc(-6, 8, 6, 0, Math.PI * 2);
    ctx.arc( 6, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Anchor rope
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.4);
    ctx.lineTo(gx, H * 0.05 + gy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawGenericAttr(ctx, def, W, H) {
    ctx.fillStyle = def.col;
    roundRect(ctx, -W * 0.35, -H * 0.35, W * 0.7, H * 0.7, 8);
    ctx.fill();
    ctx.font = `${Math.min(36, W * 0.4)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, 0, 0);
  }

  _drawProgress(ctx, attr) {
    const { px, py, w, h } = attr;
    const W = w * TILE, bx = px + 8, by = py + h * TILE - 12;
    const bw = W - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, bx, by, bw, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#f39c12';
    roundRect(ctx, bx, by, bw * attr.progress, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Building ${Math.floor(attr.progress * 100)}%`, bx + bw / 2, by + 5);
  }

  _drawQueue(ctx, attr) {
    const { px, py, w, h } = attr;
    const spot = this.game.park.getNearbyPath(attr);
    if (!spot) return;
    const qx = spot.x * TILE + TILE / 2;
    const qy = spot.y * TILE + TILE / 2;
    // Small queue dots
    const q = Math.min(attr.queue.length, 6);
    for (let i = 0; i < q; i++) {
      const ox = (i % 3 - 1) * 10, oy = Math.floor(i / 3) * 10;
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(qx + ox, qy - 16 + oy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCharacters() {
    const all = [
      ...this.game.visitors,
      ...this.game.builders,
      ...this.game.investment.pending,
    ].sort((a, b) => a.py - b.py);

    for (const c of all) {
      if (c.state === 'dead') continue;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = c.alpha;
      if (c.type === 'visitor')  this._drawVisitor(ctx, c);
      if (c.type === 'builder')  this._drawBuilder(ctx, c);
      if (c.type === 'investor') this._drawInvestor(ctx, c);
      ctx.restore();
    }
  }

  _drawVisitor(ctx, v) {
    const { px, py, app, state, animT, facing } = v;
    const walk = state === 'walking' || state === 'wandering' || state === 'entering';
    const bob  = walk ? Math.sin(animT) : 0;
    const leg  = walk ? Math.sin(animT) * 6 : 0;
    const arm  = walk ? Math.sin(animT + Math.PI) * 8 : 0;
    const s    = app.bodyScale;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(facing * s, s);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = app.pants;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -6);
    ctx.lineTo(-4 + leg * 0.5, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -6);
    ctx.lineTo(4 - leg * 0.5, 4);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.ellipse(-4 + leg * 0.5, 4, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse( 4 - leg * 0.5, 4, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = app.shirt;
    roundRect(ctx, -8, -24 + bob, 16, 20, 4);
    ctx.fill();

    // Arms
    ctx.strokeStyle = app.skin;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -20 + bob);
    ctx.lineTo(-13 - arm * 0.6, -12 + bob + arm * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -20 + bob);
    ctx.lineTo(13 + arm * 0.6, -12 + bob - arm * 0.3);
    ctx.stroke();

    // Hands
    ctx.fillStyle = app.skin;
    ctx.beginPath();
    ctx.arc(-13 - arm * 0.6, -12 + bob + arm * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(13 + arm * 0.6, -12 + bob - arm * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = app.skin;
    ctx.fillRect(-3, -30 + bob, 6, 8);

    // Head
    ctx.fillStyle = app.skin;
    ctx.beginPath();
    ctx.arc(0, -38 + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    this._drawHair(ctx, app.hairStyle, app.hair, bob);

    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-4, -39 + bob, 2, 0, Math.PI * 2);
    ctx.arc(4,  -39 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(-4, -39 + bob, 1, 0, Math.PI * 2);
    ctx.fill();
    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4.5, -39.5 + bob, 0.8, 0, Math.PI * 2);
    ctx.arc(3.5, -39.5 + bob, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Smile (happiness-based)
    const happiness = v.happiness;
    ctx.beginPath();
    ctx.arc(0, -35 + bob, 5, happiness > 0.5 ? 0.1 : -0.3, happiness > 0.5 ? Math.PI - 0.1 : Math.PI + 0.3);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cheeks
    ctx.fillStyle = 'rgba(255,150,150,0.35)';
    ctx.beginPath();
    ctx.ellipse(-8, -37 + bob, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(8, -37 + bob, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Accessories
    if (app.acc === 'balloon') {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, -18 + bob);
      ctx.bezierCurveTo(14, -38 + bob, 10, -55, 15, -60);
      ctx.stroke();
      ctx.fillStyle = app.accCol;
      ctx.beginPath();
      ctx.arc(15, -65, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(11, -69, 4, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (app.acc === 'ice_cream') {
      ctx.fillStyle = '#d4a96a';
      ctx.beginPath();
      ctx.moveTo(10, -14 + bob);
      ctx.lineTo(14, -14 + bob);
      ctx.lineTo(12, -8 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FF69B4';
      ctx.beginPath();
      ctx.arc(12, -16 + bob, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (app.acc === 'hat') {
      ctx.fillStyle = app.hatCol;
      ctx.fillRect(-10, -48 + bob, 20, 6);
      ctx.fillRect(-7, -56 + bob, 14, 8);
    } else if (app.acc === 'bag') {
      ctx.fillStyle = '#a0785a';
      roundRect(ctx, -17, -18 + bob, 8, 10, 2);
      ctx.fill();
      ctx.strokeStyle = '#7a5c42';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-13, -18 + bob);
      ctx.lineTo(-9, -21 + bob);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawHair(ctx, style, color, bob) {
    ctx.fillStyle = color;
    switch (style) {
      case 0: // Short
        ctx.beginPath();
        ctx.arc(0, -38 + bob, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-12, -44 + bob, 24, 8);
        break;
      case 1: // Long
        ctx.beginPath();
        ctx.arc(0, -38 + bob, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-12, -44 + bob, 24, 8);
        ctx.beginPath();
        ctx.ellipse(-11, -34 + bob, 3, 10, 0.2, 0, Math.PI * 2);
        ctx.ellipse(11, -34 + bob, 3, 10, -0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 2: // Curly
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 9, -38 + bob + Math.sin(a) * 9, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 3: // Bun
        ctx.beginPath();
        ctx.arc(0, -38 + bob, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-12, -44 + bob, 24, 8);
        ctx.beginPath();
        ctx.arc(0, -50 + bob, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  _drawBuilder(ctx, b) {
    const { px, py, app, state, animT, facing } = b;
    const work = state === 'building';
    const walk = state === 'going' || state === 'returning';
    const bob  = walk ? Math.sin(animT) : (work ? Math.sin(animT * 3) * 2 : 0);
    const leg  = walk ? Math.sin(animT) * 6 : 0;
    const toolY = work ? Math.sin(animT * 4) * 12 : 0;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(facing, 1);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = app.pants;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -6); ctx.lineTo(-4 + leg * 0.5, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -6); ctx.lineTo(4 - leg * 0.5, 4);
    ctx.stroke();

    // Boots
    ctx.fillStyle = '#4a3728';
    ctx.beginPath();
    ctx.ellipse(-4 + leg * 0.5, 4, 6, 3, 0, 0, Math.PI * 2);
    ctx.ellipse( 4 - leg * 0.5, 4, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body/vest
    ctx.fillStyle = '#ecf0f1';
    roundRect(ctx, -8, -24 + bob, 16, 20, 3);
    ctx.fill();
    ctx.fillStyle = app.vest;
    ctx.fillRect(-8, -24 + bob, 4, 20);
    ctx.fillRect(4, -24 + bob, 4, 20);

    // Safety stripes on vest
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-8, -16 + bob, 16, 3);
    ctx.fillRect(-8, -10 + bob, 16, 3);

    // Arms
    ctx.strokeStyle = app.skin;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    // Left arm (tool holding)
    ctx.beginPath();
    ctx.moveTo(-8, -20 + bob);
    ctx.lineTo(-14, -14 + bob + toolY * 0.5);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(8, -20 + bob);
    ctx.lineTo(14, -14 + bob);
    ctx.stroke();

    // Tool (wrench or hammer)
    if (work) {
      ctx.save();
      ctx.translate(-14, -14 + bob + toolY);
      ctx.strokeStyle = '#7f8c8d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-8, -8);
      ctx.stroke();
      ctx.strokeStyle = '#95a5a6';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(-10, -10, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(-16, -16 + bob, 4, 12);
    }

    // Neck
    ctx.fillStyle = app.skin;
    ctx.fillRect(-3, -30 + bob, 6, 7);

    // Head
    ctx.fillStyle = app.skin;
    ctx.beginPath();
    ctx.arc(0, -38 + bob, 11, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = app.hair;
    ctx.beginPath();
    ctx.arc(0, -38 + bob, 11, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-11, -43 + bob, 22, 7);

    // Hard hat
    ctx.fillStyle = app.hard;
    roundRect(ctx, -13, -50 + bob, 26, 10, 3);
    ctx.fill();
    ctx.fillRect(-11, -55 + bob, 22, 7);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-13, -50 + bob, 26, 10);
    // Hard hat brim
    ctx.fillStyle = app.hard;
    ctx.fillRect(-15, -50 + bob, 30, 4);

    // Face
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-4, -39 + bob, 1.8, 0, Math.PI * 2);
    ctx.arc(4, -39 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Determined expression
    ctx.beginPath();
    ctx.moveTo(-4, -35 + bob);
    ctx.lineTo(4, -35 + bob);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Eyebrows
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -41 + bob); ctx.lineTo(-2, -42 + bob);
    ctx.moveTo(2, -42 + bob);  ctx.lineTo(6, -41 + bob);
    ctx.stroke();

    ctx.restore();
  }

  _drawInvestor(ctx, inv) {
    const { px, py, app, state, animT, facing } = inv;
    const walk = state === 'approaching' || state === 'leaving';
    const bob  = walk ? Math.sin(animT) * 1.5 : 0;
    const leg  = walk ? Math.sin(animT) * 5 : 0;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(facing, 1);

    // Glow aura (investor is special)
    const grd = ctx.createRadialGradient(0, -25, 5, 0, -25, 35);
    grd.addColorStop(0, 'rgba(255,215,0,0.15)');
    grd.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, -25, 35, 0, Math.PI * 2);
    ctx.fill();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (suit trousers)
    ctx.strokeStyle = app.suit;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -6); ctx.lineTo(-4 + leg * 0.5, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -6); ctx.lineTo(4 - leg * 0.5, 4);
    ctx.stroke();

    // Dress shoes (shiny)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(-4 + leg * 0.5, 5, 7, 3, 0.2, 0, Math.PI * 2);
    ctx.ellipse( 4 - leg * 0.5, 5, 7, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-5 + leg * 0.5, 4, 3, 1.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Suit body (jacket)
    ctx.fillStyle = app.suit;
    roundRect(ctx, -9, -26 + bob, 18, 22, 3);
    ctx.fill();

    // Shirt collar / tie
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-4, -26 + bob);
    ctx.lineTo(-4, -14 + bob);
    ctx.lineTo(0, -10 + bob);
    ctx.lineTo(4, -14 + bob);
    ctx.lineTo(4, -26 + bob);
    ctx.closePath();
    ctx.fill();
    // Tie
    ctx.fillStyle = app.tie;
    ctx.beginPath();
    ctx.moveTo(-2, -25 + bob);
    ctx.lineTo(2, -25 + bob);
    ctx.lineTo(3, -14 + bob);
    ctx.lineTo(0, -10 + bob);
    ctx.lineTo(-3, -14 + bob);
    ctx.closePath();
    ctx.fill();
    // Tie knot
    ctx.fillStyle = app.tie;
    ctx.fillRect(-2, -27 + bob, 4, 3);

    // Suit lapels
    ctx.fillStyle = app.suit;
    ctx.beginPath();
    ctx.moveTo(-9, -26 + bob);
    ctx.lineTo(-4, -26 + bob);
    ctx.lineTo(-4, -18 + bob);
    ctx.lineTo(-9, -22 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -26 + bob);
    ctx.lineTo(4, -26 + bob);
    ctx.lineTo(4, -18 + bob);
    ctx.lineTo(9, -22 + bob);
    ctx.closePath();
    ctx.fill();

    // Pocket square
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(4, -24 + bob, 5, 4);

    // Arms
    ctx.strokeStyle = app.suit;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, -22 + bob);
    ctx.lineTo(-14, -14 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, -22 + bob);
    ctx.lineTo(16, -14 + bob);
    ctx.stroke();

    // Briefcase
    ctx.save();
    ctx.translate(16, -12 + bob);
    ctx.fillStyle = '#8B6914';
    roundRect(ctx, 0, -5, 16, 12, 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4f10';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#6a4f10';
    ctx.fillRect(4, -5, 8, 2);
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(8, 1, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Neck
    ctx.fillStyle = app.skin;
    ctx.fillRect(-3, -32 + bob, 6, 8);

    // Head
    ctx.fillStyle = app.skin;
    ctx.beginPath();
    ctx.arc(0, -40 + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    // Hair (business style)
    ctx.fillStyle = app.hair;
    ctx.beginPath();
    ctx.arc(0, -40 + bob, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-12, -47 + bob, 24, 8);
    // Parting
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -47 + bob);
    ctx.lineTo(-3, -40 + bob);
    ctx.stroke();

    // Face - confident expression
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-4, -41 + bob, 2, 0, Math.PI * 2);
    ctx.arc(4, -41 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    // Slight confident smile
    ctx.beginPath();
    ctx.arc(1, -37 + bob, 5, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Eyebrows (strong)
    ctx.strokeStyle = app.hair;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -44 + bob); ctx.lineTo(-2, -43 + bob);
    ctx.moveTo(2, -43 + bob);  ctx.lineTo(7, -44 + bob);
    ctx.stroke();

    // "💼" badge
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText(inv.data.avatar, 0, -60 + bob);

    ctx.restore();
  }

  _drawBuildPreview() {
    const game = this.game;
    if (game.mode !== 'build' && game.mode !== 'path') return;
    const { hoverGx, hoverGy } = game;
    if (hoverGx < 0 || hoverGy < 0) return;

    const ctx = this.ctx;
    if (game.mode === 'path') {
      const can = game.park.canPlacePath(hoverGx, hoverGy);
      ctx.fillStyle = can ? 'rgba(0,200,100,0.4)' : 'rgba(200,50,50,0.4)';
      ctx.strokeStyle = can ? '#00cc66' : '#cc0000';
      ctx.lineWidth = 2;
      ctx.fillRect(hoverGx * TILE, hoverGy * TILE, TILE, TILE);
      ctx.strokeRect(hoverGx * TILE, hoverGy * TILE, TILE, TILE);
      return;
    }

    const type = game.selectedBuild;
    if (!type) return;
    const def = ATTRACTIONS[type];
    if (!def) return;
    const [w, h] = def.size;
    const can = game.park.canPlace(hoverGx, hoverGy, type);
    ctx.fillStyle = can ? 'rgba(0,200,100,0.35)' : 'rgba(200,50,50,0.35)';
    ctx.strokeStyle = can ? '#00cc66' : '#cc0000';
    ctx.lineWidth = 2;
    ctx.fillRect(hoverGx * TILE, hoverGy * TILE, w * TILE, h * TILE);
    ctx.strokeRect(hoverGx * TILE, hoverGy * TILE, w * TILE, h * TILE);
  }
}
