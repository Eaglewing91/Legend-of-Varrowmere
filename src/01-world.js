/* ================= World: maps, collision, drawing tiles =================
   Maps come from tools/maps.py (src/data/maps.json). Art comes from the CC0 pack sheets in LV.IMG. */
LV.C = { OPEN: 0, SOLID: 1, DEEP: 2, PIT: 3, LEDGE: 4, LOW: 5, BUSH: 6, ROCK: 7, SHALLOW: 8 };
LV.SHEETS = ['overworld', 'inner', 'cave', 'objects', 'nafloor', 'nanature', 'blend', 'nawater', 'nahouse', 'narelief', 'naelem', 'nadetail', 'nainfloor'];

LV.World = function (def) {
  this.def = def; this.id = def.id; this.name = def.name; this.w = def.w; this.h = def.h;
  this.col = def.col.slice();
  this.layers = { ground: def.layers.ground.slice(), deco: def.layers.deco.slice(), over: def.layers.over.slice() };
  this.areas = def.areas; this.warps = def.warps; this.signs = def.signs; this.chests = def.chests;
  this.indoor = def.indoor; this.dark = def.dark; this.cache = {};
};
LV.World.prototype.inside = function (tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; };
LV.World.prototype.c = function (tx, ty) { return this.inside(tx, ty) ? this.col[ty * this.w + tx] : LV.C.SOLID; };
LV.World.prototype.setC = function (tx, ty, v) { if (this.inside(tx, ty)) this.col[ty * this.w + tx] = v; };
LV.World.prototype.cAt = function (px, py) { return this.c(Math.floor(px / LV.TILE), Math.floor(py / LV.TILE)); };
// Blocks walking? (flying things ignore pits and water; projectiles pass low walls)
LV.World.prototype.blocks = function (code, mode) {
  const C = LV.C;
  if (code === C.SOLID || code === C.BUSH || code === C.ROCK) return true;
  if (code === C.LOW) return mode !== 'shot';
  if (code === C.LEDGE) return mode === 'enemy';
  if (code === C.DEEP || code === C.PIT) return mode === 'enemy';
  return false;
};
LV.World.prototype.boxBlocked = function (b, mode) {
  const T = LV.TILE, x0 = Math.floor(b.x / T), y0 = Math.floor(b.y / T), x1 = Math.floor((b.x + b.w - 0.01) / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.blocks(this.c(tx, ty), mode)) return true;
  return false;
};
LV.World.prototype.areaAt = function (px, py) {
  const tx = px / LV.TILE, ty = py / LV.TILE;
  for (const a of this.areas) if (tx >= a[0] && ty >= a[1] && tx < a[0] + a[2] && ty < a[1] + a[3]) return a;
  return this.areas[0];
};
LV.World.prototype.warpAt = function (tx, ty) { return this.warps.find(function (w) { return w.x === tx && w.y === ty; }) || null; };
// Cutting a bush / lifting a rock leaves grass behind
LV.World.prototype.clearTile = function (tx, ty) {
  if (!this.inside(tx, ty)) return;
  const i = ty * this.w + tx; this.layers.deco[i] = -1; this.col[i] = LV.C.OPEN;
};

/* Draw one layer for the visible part of the map. ox, oy = camera position in px. */
LV.drawLayer = function (ctx, world, name, ox, oy) {
  const T = LV.TILE, L = world.layers[name], img = LV.IMG;
  const x0 = Math.max(0, Math.floor(ox / T)), y0 = Math.max(0, Math.floor(oy / T));
  const x1 = Math.min(world.w - 1, Math.floor((ox + LV.VIEW_W) / T)), y1 = Math.min(world.h - 1, Math.floor((oy + LV.VIEW_H) / T));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const r = L[ty * world.w + tx]; if (r < 0) continue;
    const sh = img[LV.SHEETS[r >> 16]]; if (!sh) continue;
    ctx.drawImage(sh, (r & 255) * T, ((r >> 8) & 255) * T, T, T, Math.round(tx * T - ox), Math.round(ty * T - oy), T, T);
  }
};
