/* ================= The world map: all of Varrowmere (or its shadow) on one page ================= */
LV.Game.prototype.drawMap = (function (orig) {
  return function () {
    const w = this.world, def = w.def;
    if (!def.world) return orig.call(this);
    const ctx = this.ctx, shadow = !!def.shadow, key = shadow ? 'shadow' : 'light', blink = Math.floor(this.t * 4) % 2;
    LV.worldMaps = LV.worldMaps || {};
    if (!LV.worldMaps[key]) {
      // draw every region of this world into one big picture once, then shrink it
      const c = document.createElement('canvas'); c.width = 12 * 64; c.height = 8 * 56; const x = c.getContext('2d');
      x.fillStyle = '#1a2a1a'; x.fillRect(0, 0, c.width, c.height);
      Object.values(LV.MAPS).forEach(function (d) {
        if (!d.world || !!d.shadow !== shadow) return;
        const wd = new LV.World(d), big = document.createElement('canvas'); big.width = d.w * 16; big.height = d.h * 16; const bx = big.getContext('2d');
        for (let oy = 0; oy < big.height; oy += LV.VIEW_H) for (let ox = 0; ox < big.width; ox += LV.VIEW_W) { bx.save(); bx.translate(ox, oy); ['ground', 'deco', 'over'].forEach(function (L) { LV.drawLayer(bx, wd, L, ox, oy); }); bx.restore(); }
        x.imageSmoothingEnabled = true; x.drawImage(big, d.world[0] * 64, d.world[1] * 56, d.w * 4, d.h * 4);
      });
      LV.worldMaps[key] = c;
    }
    const c = LV.worldMaps[key], X = 8, Y = 24, sc = 240 / c.width;
    ctx.fillStyle = '#0c0c1c'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H); LV.drawPanel(ctx, 4, 20, 248, 200);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(c, X, Y, c.width * sc, c.height * sc); ctx.imageSmoothingEnabled = false;
    LV.text(ctx, (shadow ? 'SHADOW ' : '') + 'VARROWMERE', 8, 6, '#f8d040');
    const ai = w.areas.indexOf(this.area), names = def.names || [];
    LV.text(ctx, names[ai] || def.name, 120, 6, '#fff');
    const px = X + (def.world[0] * 256 + this.hero.x) / 4 * sc, py = Y + (def.world[1] * 224 + this.hero.y - 8) / 4 * sc;
    if (blink) { ctx.fillStyle = '#f85050'; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5); }
    LV.text(ctx, 'M or Enter to close', 8, 210, '#a0a0c0');
  };
})(LV.Game.prototype.drawMap);
