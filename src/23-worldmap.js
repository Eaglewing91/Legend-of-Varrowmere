/* ================= The world map: a cleanly drawn map of Varrowmere (or its shadow) =================
   The land is read tile by tile (water, forest, rock, path, sand, snow, buildings, grass), tidied so single trees and
   pebbles don't speckle it, and painted in flat colours with soft shorelines. Towns are named; dungeon doors are marked.
   Z zooms in round you (arrows look around); M, Enter or F closes. */
LV.MAPCOL = { light: ['#4aa8d8', '#3f7a32', '#8c7b66', '#c79a5e', '#f0d49a', '#eef3f8', '#b8573a', '#7fb547', '#2b2b2b'],
              shadow: ['#3a3a8a', '#2e4a2a', '#5c5048', '#7a5a3a', '#a08a5a', '#a8aab8', '#7a3a2a', '#4f6a30', '#141414'] };
LV.classifyWorld = function (shadow) {
  const regs = Object.values(LV.MAPS).filter(function (d) { return d.world && !!d.shadow === shadow; });
  const gw = Math.max.apply(null, regs.map(function (d) { return d.world[0] + d.w / 16; })), gh = Math.max.apply(null, regs.map(function (d) { return d.world[1] + d.h / 14; }));
  const W = gw * 16, H = gh * 14, k = new Uint8Array(W * H), C = LV.C, SH = LV.SHEETS;
  const sheet = function (r) { return r < 0 ? '' : SH[r >> 16]; }, tx = function (r) { return r & 255; }, ty = function (r) { return (r >> 8) & 255; };
  const doors = [];
  regs.forEach(function (d) {
    const ox = d.world[0] * 16, oy = d.world[1] * 14;
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const i = y * d.w + x, c = d.col[i], g = d.layers.ground[i], de = d.layers.deco[i], ov = d.layers.over[i];
      let v = 7;
      const gs = sheet(g);
      if (gs === 'nafloor') { const t = ty(g); v = t <= 6 ? 4 : t >= 14 && t <= 20 && tx(g) <= 9 ? 5 : (tx(g) === 12 && t === 8) ? 3 : 7; }
      else if (gs === 'blend') { const pair = ty(g) >> 4; v = pair === 0 ? 3 : pair === 1 ? 7 : pair === 2 ? 7 : pair >= 4 && pair <= 7 ? 0 : 7; }
      else if (gs === 'nawater') v = (ty(g) >= 12 && ty(g) <= 16) ? 3 : 0;
      if (c === C.DEEP) v = 0;
      else if (c === C.PIT) v = 8;
      else if (c === C.SOLID || c === C.ROCK || c === C.DARKROCK) {
        const s2 = sheet(de) || sheet(ov), r = de >= 0 ? de : ov;
        if (s2 === 'nanature') v = (ty(r) < 6 || ty(r) >= 18 || (ty(r) === 10 && tx(r) < 3)) ? 1 : 2;
        else if (s2 === 'nahouse' || s2 === 'overworld' || s2 === 'landmarks') v = 6;
        else if (v === 7 || v === 4 || v === 5) v = 2;
      }
      k[(oy + y) * W + ox + x] = v;
    }
    (d.warps || []).forEach(function (w) { const t = LV.MAPS[w.to]; if (t && t.dungeon) doors.push({ x: ox + w.x, y: oy + w.y, name: t.name }); });
  });
  // tidy: a lone tile of forest or rock in open land becomes the land round it, and gaps in a forest fill in
  const out = new Uint8Array(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const v = k[y * W + x]; if (v === 0 || v === 3 || v === 6) continue;
    const cnt = {}; let best = v, bn = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const u = k[(y + j) * W + x + i]; if (u === 3 || u === 6) continue; cnt[u] = (cnt[u] || 0) + 1; if (cnt[u] > bn) { bn = cnt[u]; best = u; } }
    if (bn >= 5) out[y * W + x] = best;
  }
  return { k: out, W: W, H: H, gw: gw, gh: gh, doors: doors };
};
LV.paintWorld = function (shadow) {
  const m = LV.classifyWorld(shadow), S = 3, c = document.createElement('canvas'); c.width = m.W * S; c.height = m.H * S;
  const x = c.getContext('2d'), pal = LV.MAPCOL[shadow ? 'shadow' : 'light'], k = m.k, W = m.W;
  for (let y = 0; y < m.H; y++) for (let xx = 0; xx < W; xx++) { x.fillStyle = pal[k[y * W + xx]]; x.fillRect(xx * S, y * S, S, S); }
  // soft edges: a darker rim where forest, rock or water meets anything else
  const rim = { 0: shadow ? '#24245a' : '#2f7fb0', 1: shadow ? '#1a2e18' : '#2c5a22', 2: shadow ? '#3a322c' : '#6a5c4c' };
  for (let y = 1; y < m.H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    const v = k[y * W + xx]; if (!(v in rim)) continue;
    if (k[y * W + xx - 1] !== v || k[y * W + xx + 1] !== v || k[(y - 1) * W + xx] !== v || k[(y + 1) * W + xx] !== v) { x.fillStyle = rim[v]; x.fillRect(xx * S, y * S, S, S); }
  }
  // blur once for a painted look, then sharpen the outline back with the crisp layer at low alpha
  const soft = document.createElement('canvas'); soft.width = c.width; soft.height = c.height; const sx = soft.getContext('2d');
  sx.filter = 'blur(1.5px)'; sx.drawImage(c, 0, 0); sx.filter = 'none'; sx.globalAlpha = 0.45; sx.drawImage(c, 0, 0); sx.globalAlpha = 1;
  return { canvas: soft, S: S, m: m };
};
LV.Game.prototype.drawMap = (function (orig) {
  return function () {
    const w = this.world, def = w.def;
    if (!def.world) return orig.call(this);
    const ctx = this.ctx, shadow = !!def.shadow, key = shadow ? 'shadow' : 'light', blink = Math.floor(this.t * 4) % 2;
    LV.worldMaps = LV.worldMaps || {};
    const P = LV.worldMaps[key] || (LV.worldMaps[key] = LV.paintWorld(shadow)), c = P.canvas, S = P.S;
    const hx = def.world[0] * 16 + this.hero.x / 16, hy = def.world[1] * 14 + (this.hero.y - 8) / 16;    // hero in world tiles
    const BX = 8, BY = 24, BW = 240, BH = 186;
    const fit = Math.min(BW / P.m.W, BH / P.m.H), z = this.mapZoom ? fit * 3 : fit;     // display pixels per world tile
    let cx = this.mapZoom ? (this.mapPan ? this.mapPan.x : hx) : P.m.W / 2, cy = this.mapZoom ? (this.mapPan ? this.mapPan.y : hy) : P.m.H / 2;
    if (this.mapZoom) { const hw = BW / 2 / z, hh = BH / 2 / z; cx = Math.max(hw, Math.min(P.m.W - hw, cx)); cy = Math.max(hh, Math.min(P.m.H - hh, cy)); this.mapPan = { x: cx, y: cy }; }
    const ox = BX + BW / 2 - cx * z, oy = BY + BH / 2 - cy * z;
    ctx.fillStyle = '#0c0c1c'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H); LV.drawPanel(ctx, 4, 20, 248, 194);
    ctx.save(); ctx.beginPath(); ctx.rect(BX, BY, BW, BH); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.drawImage(c, ox, oy, P.m.W * z, P.m.H * z); ctx.imageSmoothingEnabled = false;
    // dungeon doors
    const seen = {};
    for (const d of P.m.doors) { const k2 = d.name; if (seen[k2]) continue; seen[k2] = 1; const X = Math.round(ox + d.x * z), Y = Math.round(oy + d.y * z);
      ctx.fillStyle = '#1a1018'; ctx.fillRect(X - 3, Y - 3, 7, 7); ctx.fillStyle = shadow ? '#c070f0' : '#f0c040'; ctx.fillRect(X - 2, Y - 2, 5, 5); ctx.fillStyle = '#1a1018'; ctx.fillRect(X - 1, Y - 1, 3, 3);
      if (this.mapZoom) LV.text(ctx, d.name, X + 5, Y - 4, '#ffe8a0'); }
    // place names
    const WP = LV.WORLDPLAN || { towns: {}, regions: {} };
    if (!shadow) Object.keys(WP.towns).forEach(function (n) { const p = WP.towns[n], X = Math.round(ox + p[0] * 16 * z), Y = Math.round(oy + p[1] * 14 * z);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 1, Y - 1, 3, 3); LV.text(ctx, n, X - LV.textWidth(n) / 2, Y + 3, '#ffffff'); });
    if (this.mapZoom) Object.keys(WP.regions).forEach(function (n) { const p = WP.regions[n], X = Math.round(ox + p[0] * 16 * z), Y = Math.round(oy + p[1] * 14 * z);
      LV.text(ctx, (shadow ? 'Shadow ' : '') + n, X - LV.textWidth((shadow ? 'Shadow ' : '') + n) / 2, Y, '#e8f0ff'); });
    // you are here
    const px = Math.round(ox + hx * z), py = Math.round(oy + hy * z);
    if (blink) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 3, py - 3, 7, 7); ctx.fillStyle = '#e83040'; ctx.fillRect(px - 2, py - 2, 5, 5); }
    ctx.restore();
    LV.text(ctx, (shadow ? 'SHADOW ' : '') + 'VARROWMERE', 8, 6, '#f8d040');
    const ai = w.areas.indexOf(this.area), names = def.names || [];
    const here = names[ai] || def.name; LV.text(ctx, here, 248 - LV.textWidth(here), 6, '#fff');
    LV.text(ctx, this.mapZoom ? 'Z: whole map   Arrows: look round   M: close' : 'Z: zoom in   M: close', 8, 214, '#a0a0c0');
  };
})(LV.Game.prototype.drawMap);
// on the world map: Z zooms, the arrows look round when zoomed
(function () {
  const upd = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    if (this.mode !== 'title' && this.mapOpen && this.world && this.world.def.world) {
      this.input.beginStep(); const p = this.input.pressed, h = this.input.held;
      if (p.attack) { this.mapZoom = !this.mapZoom; this.mapPan = null; this.sfx('cursor'); return; }
      if (p.map || p.menu || p.action) { this.mapOpen = false; this.mapZoom = false; this.mapPan = null; this.sfx('door'); return; }
      if (this.mapZoom && this.mapPan) { const v = 60 * dt; if (h.left) this.mapPan.x -= v; if (h.right) this.mapPan.x += v; if (h.up) this.mapPan.y -= v; if (h.down) this.mapPan.y += v; }
      this.t += dt; return;
    }
    return upd.call(this, dt);
  };
})();
