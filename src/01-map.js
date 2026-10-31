/* ================= Tiles and maps =================
   A map is a grid of tile ids (one layer) plus objects (entities, doors, warps).
   Tile properties drive all collision and interaction, like the original. */

// Tile kinds. solid: blocks walking. Other flags describe how the hero and items interact.
LV.T = {};
LV.TILES = [];
LV.defTile = function (name, props) { const id = LV.TILES.length; props.name = name; props.id = id; LV.TILES.push(props); LV.T[name] = id; return id; };
LV.defTile('void', { solid: true });
LV.defTile('grass', {});
LV.defTile('path', {});
LV.defTile('floor', {});                                  // dungeon floor
LV.defTile('wall', { solid: true });
LV.defTile('crack', { solid: true, bombable: true, becomes: 'floor' });   // cracked wall, opened by bombs
LV.defTile('hollow', { solid: true, bombable: true, becomes: 'floor' });  // looks like a wall; sounds hollow when struck
LV.defTile('tree', { solid: true, dashable: true });
LV.defTile('bush', { solid: true, cuttable: true, liftable: 1, becomes: 'grass' });
LV.defTile('rock', { solid: true, liftable: 1, heavy: false, becomes: 'grass' });
LV.defTile('boulder', { solid: true, liftable: 2, becomes: 'grass' });    // needs the Giant's Gauntlets
LV.defTile('pot', { solid: true, liftable: 1, becomes: 'floor' });
LV.defTile('pit', { pit: true });
LV.defTile('water', { water: true });                     // deep water: swim with fins, else you fall in
LV.defTile('shallow', { shallow: true });
LV.defTile('ledgeS', { solid: true, ledge: 2 });          // one-way ledge: jump down (south) only
LV.defTile('fence', { solid: true, lowWall: true });      // blocks walking, not projectiles
LV.defTile('peg', { solid: true, hammer: true, becomes: 'floor' });       // pounded flat by the Sledgehammer
LV.defTile('torch', { solid: true, torch: true });
LV.defTile('torchLit', { solid: true, torch: true, lit: true });
LV.defTile('chest', { solid: true, chest: true });
LV.defTile('chestOpen', { solid: true });
LV.defTile('doorLocked', { solid: true, locked: 1, becomes: 'floor' });   // small key
LV.defTile('doorBoss', { solid: true, locked: 2, becomes: 'floor' });     // big key
LV.defTile('stairs', { stairs: true });
LV.defTile('sign', { solid: true, sign: true });
LV.defTile('spikes', { hurt: 1 });
LV.defTile('dig', { diggable: true });                     // soft ground for the shovel

LV.Map = function (def) {
  this.id = def.id; this.name = def.name || def.id;
  this.w = def.w; this.h = def.h;                          // in tiles
  this.tiles = new Uint8Array(this.w * this.h);
  this.areas = def.areas || [{ x: 0, y: 0, w: this.w, h: this.h }];   // camera regions (in tiles), like the original's areas and rooms
  this.signs = def.signs || {};                            // 'x,y' -> text
  this.chests = def.chests || {};                          // 'x,y' -> item id
  this.spawns = def.spawns || [];                          // [{ kind, x, y }] in tiles
  this.warps = def.warps || [];                            // [{ x, y, to, tx, ty }]
  this.entry = def.entry || { x: 2, y: 2 };
  this.dark = !!def.dark; this.indoor = !!def.indoor;
  if (def.rows) this.load(def.rows, def.legend);
};
LV.Map.prototype.load = function (rows, legend) {
  for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
    const ch = (rows[y] || '')[x] || ' ';
    const name = legend[ch] || 'void';
    this.tiles[y * this.w + x] = LV.T[name];
  }
};
LV.Map.prototype.inside = function (tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; };
LV.Map.prototype.get = function (tx, ty) { return this.inside(tx, ty) ? this.tiles[ty * this.w + tx] : LV.T.void; };
LV.Map.prototype.set = function (tx, ty, id) { if (this.inside(tx, ty)) this.tiles[ty * this.w + tx] = id; };
LV.Map.prototype.prop = function (tx, ty) { return LV.TILES[this.get(tx, ty)]; };
LV.Map.prototype.tileAt = function (px, py) { return this.prop(Math.floor(px / LV.TILE), Math.floor(py / LV.TILE)); };
// Does a box hit any solid tile? (flying things and projectiles pass low walls)
LV.Map.prototype.boxSolid = function (b, opts) {
  const T = LV.TILE, x0 = Math.floor(b.x / T), y0 = Math.floor(b.y / T), x1 = Math.floor((b.x + b.w - 0.001) / T), y1 = Math.floor((b.y + b.h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const p = this.prop(tx, ty);
    if (p.solid && !(opts && opts.overLow && p.lowWall)) return true;
    if (opts && opts.avoid && (p.pit || p.water) ) return true;
  }
  return false;
};
// Which area (camera region) holds a world point?
LV.Map.prototype.areaAt = function (px, py) {
  const tx = px / LV.TILE, ty = py / LV.TILE;
  for (const a of this.areas) if (tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h) return a;
  return this.areas[0];
};
