// Utility functions

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
export const rndInt = (lo, hi) => Math.floor(rnd(lo, hi + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const uid = () => Math.random().toString(36).slice(2, 9);
export const fmt$ = n => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.floor(n)}`;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// A* pathfinding on grid
export function aStar(walkable, gw, gh, sx, sy, ex, ey) {
  if (sx === ex && sy === ey) return [];
  const key = (x, y) => y * gw + x;
  const h   = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);
  const open = new Map();
  const closed = new Set();
  const from  = new Map();
  const g     = new Map();

  g.set(key(sx, sy), 0);
  open.set(key(sx, sy), { x: sx, y: sy, f: h(sx, sy) });

  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  while (open.size) {
    let bestK = null, bestF = Infinity;
    for (const [k, n] of open) if (n.f < bestF) { bestF = n.f; bestK = k; }
    const cur = open.get(bestK);
    open.delete(bestK);
    closed.add(bestK);

    if (cur.x === ex && cur.y === ey) {
      const path = [];
      let c = key(cur.x, cur.y);
      while (from.has(c)) { const p = from.get(c); path.unshift({ gx: p.x, gy: p.y }); c = key(p.x, p.y); }
      path.push({ gx: ex, gy: ey });
      return path;
    }

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      if (!walkable(nx, ny)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = (g.get(bestK) || 0) + 1;
      if (!open.has(nk) || ng < (g.get(nk) || Infinity)) {
        g.set(nk, ng);
        from.set(nk, cur);
        open.set(nk, { x: nx, y: ny, f: ng + h(nx, ny) });
      }
    }
  }
  return null; // no path
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
