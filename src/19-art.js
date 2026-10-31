/* ================= Monster art from the Ninja Adventure pack (Pixel-boy and AAA, CC0) =================
   Sheet 'na': row 0 squid idle (5), row 1 squid move (4), row 2 spirit idle (4), row 3 spirit move (4), row 4 spirit attack (1).
   The squid becomes the Snapjaw (green), the Twin Maws (deep teal) and the Mire Kraken (violet, twice the size);
   the spirit is the Cinder Wisp (orange when blazing, its pale form when dim). */
(function () {
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () {
    prep();
    if (!LV.IMG.na) return;
    const sq = { '#f19f42': '#4ab07a', '#c8692e': '#2e7a5a', '#8a3a28': '#1e5a40', '#a94b38': '#245a40' };
    LV.IMG.na_snap = LV.recolourNear(LV.IMG.na, 0, 32, [[0.30, 0.9, 1.0]]);
    LV.IMG.na_maw = LV.recolourNear(LV.IMG.na, 0, 32, [[0.47, 0.7, 0.8]]);
    LV.IMG.na_kraken = LV.recolourNear(LV.IMG.na, 0, 32, [[0.78, 0.65, 0.95]]);
    void sq;
  };
})();
// Shift the hue of the orange/red pixels in rows y0..y1 of a sheet (keeps outlines, eyes and highlights)
LV.recolourNear = function (img, y0, y1, hs) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
  x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data, h2 = hs[0][0], sat = hs[0][1], lm = hs[0][2];
  for (let i = 0; i < p.length; i += 4) {
    const py = Math.floor(i / 4 / c.width); if (py < y0 || py >= y1 || !p[i + 3]) continue;
    let r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx - mn < 0.15) continue;   // greys, black outline, white eyes stay
    const s0 = l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn), s = Math.min(1, s0 * sat), L = l * lm;
    const q = L < 0.5 ? L * (1 + s) : L + s - L * s, pp = 2 * L - q;
    const f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    p[i] = Math.round(f(h2 + 1 / 3) * 255); p[i + 1] = Math.round(f(h2) * 255); p[i + 2] = Math.round(f(h2 - 1 / 3) * 255);
  }
  x.putImageData(d, 0, 0); return c;
};
LV.drawSquid = function (ctx, img, X, Y, t, moving, scale, flash) {
  const row = moving ? 1 : 0, n = moving ? 4 : 5, f = Math.floor(t * 8) % n, s = scale || 1;
  if (flash) { ctx.save(); ctx.filter = 'brightness(3)'; }
  ctx.drawImage(img, f * 16, row * 16, 16, 16, Math.round(X - 8 * s), Math.round(Y - 16 * s), 16 * s, 16 * s);
  if (flash) ctx.restore();
};
(function () {
  // Snapjaw
  const mk = LV.ENEMIES.snapjaw;
  LV.ENEMIES.snapjaw = function (x, y) {
    const e = mk(x, y), d = e.draw;
    e.draw = function (ctx, ox, oy) {
      if (this.state === 'under' || !LV.IMG.na_snap) return d.call(this, ctx, ox, oy);
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const X = this.x - ox, Y = this.y - oy + 2;
      LV.drawSquid(ctx, LV.IMG.na_snap, X, Y, this.t, this.state === 'beached', 1, this.state === 'up' && this.st < 1.1 && this.st > 0.9);
      if (this.state !== 'beached') { ctx.fillStyle = 'rgba(220,240,255,.7)'; ctx.fillRect(Math.round(X) - 8, Math.round(Y) - 3, 16, 1); }
    };
    return e;
  };
  // Twin Maws
  ['maw0', 'maw1'].forEach(function (k) {
    const mm = LV.ENEMIES[k];
    LV.ENEMIES[k] = function (x, y) {
      const e = mm(x, y), d = e.draw;
      e.draw = function (ctx, ox, oy) {
        if (this.state === 'under' || !LV.IMG.na_maw) return d.call(this, ctx, ox, oy);
        if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
        const X = this.x - ox, Y = this.y - oy + 4;
        LV.drawSquid(ctx, LV.IMG.na_maw, X, Y, this.t, false, 2, this.state === 'up' && this.st < 1.1 && this.st > 0.9);
        ctx.fillStyle = 'rgba(220,240,255,.7)'; ctx.fillRect(Math.round(X) - 15, Math.round(Y) - 4, 30, 1);
      };
      return e;
    };
  });
  // Mire Kraken
  const kk = LV.ENEMIES.kraken;
  LV.ENEMIES.kraken = function (x, y) {
    const e = kk(x, y), d = e.draw;
    e.draw = function (ctx, ox, oy) {
      if (!LV.IMG.na_kraken) return d.call(this, ctx, ox, oy);
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const bob = Math.sin(this.t * 3) * 2;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(this.x - ox) - 12, Math.round(this.y - oy) - 3, 24, 4);
      LV.drawSquid(ctx, LV.IMG.na_kraken, this.x - ox, this.y - oy + bob, this.t, this.phase !== 'shield', 2, false);
    };
    return e;
  };
  // Cinder Wisp
  const ww = LV.ENEMIES.wisp;
  LV.ENEMIES.wisp = function (x, y) {
    const e = ww(x, y), d = e.draw;
    e.draw = function (ctx, ox, oy) {
      if (!LV.IMG.na) return d.call(this, ctx, ox, oy);
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), f = Math.floor(this.t * 8) % 4, dim = this.dim();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 4, Y - 2, 8, 2);
      ctx.drawImage(LV.IMG.na, f * 16, (dim ? 2 : 3) * 16, 16, 16, X - 8, Y - 20 + Math.round(Math.sin(this.t * 6) * 2), 16, 16);
    };
    return e;
  };
})();
