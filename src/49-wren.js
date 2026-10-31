/* ================= Wren in Mana Seed =================
   Character art: Mana Seed Character Base, Forester outfit, Sword & Shield and Bow combat by Seliel the Shaper,
   used with the artist's permission (not covered by this game's licence; don't copy it out of the script).
   Wren is one atlas (LV.IMG.ms_hero, index in LV.MS.hero): walk, run, push, sword slash and thrust, bow, lift,
   throw, hurt. Drawn at three quarters size like the townsfolk. Her tunic colour swaps the outfit's own colours.
   Gameplay (hit boxes, timings) is unchanged; only the drawing is new. */
LV.wrenOn = function () { return !!(LV.MS && LV.MS.hero && LV.IMG.ms_hero); };
// ---------- tunic colours: the green outfit's colours turned to each tunic's hue ----------
(function () {
  const cache = {};
  const hsl = function (r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h / 6, s, l]; };
  const rgb = function (h, s, l) { if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; };
  LV.wrenImg = function (t) {
    const im = LV.IMG.ms_hero, T = LV.TUNICS && LV.TUNICS[t];
    if (!t || !T || !T.main) return im;
    if (cache[t]) return cache[t];
    const want = hsl(T.main[0], T.main[1], T.main[2]), dark = want[1] < 0.15, map = {};
    LV.MS.hero.recol.forEach(function (c) {
      const h = hsl(c[0], c[1], c[2]);
      const o = dark ? rgb(0, 0, h[2] * 0.7) : rgb(want[0], Math.min(1, h[1] * (0.6 + want[1])), h[2] * (0.85 + want[2] * 0.3));
      map[(c[0] << 16) | (c[1] << 8) | c[2]] = o.map(Math.round);
    });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const o = map[(p[i] << 16) | (p[i + 1] << 8) | p[i + 2]]; if (o) { p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2]; } }
    x.putImageData(d, 0, 0); return (cache[t] = c);
  };
})();
LV.WREN_K = 0.75;
LV.WREN_ROW = [1, 2, 0, 3];                     // our dir (up, right, down, left) -> atlas row (down, up, right, left)
// one frame of an animation, feet at (X, Y); clipH cuts it off that many game pixels above the feet (swimming)
LV.wrenFrame = function (ctx, anim, dir, f, X, Y, o) {
  o = o || {};
  const A = LV.MS.hero[anim]; if (!A) return;
  const g = LV.game, im = LV.wrenImg(o.tunic !== undefined ? o.tunic : (g && g.save && g.save.tunic) || 0), K = (o.k || 1) * LV.WREN_K;
  const sx = (f % A.n) * A.w, sy = A.y + LV.WREN_ROW[dir] * A.h;
  let h = A.h; if (o.clip) h = Math.min(A.h, A.fy - o.clip / LV.WREN_K);
  ctx.drawImage(im, sx, sy, A.w, h, X - A.fx * K, Y - A.fy * K, A.w * K, h * K);
};
LV.CARRY_Y = 41;
(function () {
  const prev = LV.Hero.prototype.draw;
  LV.Hero.prototype.draw = function (ctx, ox, oy) {
    if (!LV.wrenOn()) return prev.call(this, ctx, ox, oy);
    const g = LV.game, X = Math.round(this.x - ox), Y = Math.round(this.y - oy), d = this.dir, st = this.state, F = LV.wrenFrame;
    // asleep in the opening scene: just her head on the pillow
    if (g && g.scene && g.scene.inBed && LV.WREN_BED) {
      const b = LV.WREN_BED, bx = Math.round(b.x - ox), by = Math.round(b.y - oy);
      ctx.save(); ctx.beginPath(); ctx.rect(bx - 10, by - 30, 20, 17); ctx.clip(); F(ctx, 'idle', 2, 0, bx, by - 3); ctx.restore(); return;
    }
    if (this.inv > 0 && Math.floor(this.inv * 20) % 2 && st !== 'fall' && !this.flashT) return;
    if (g && g.cloak) ctx.globalAlpha = 0.3;
    try {
      if (st === 'fall') { const s = Math.max(0, 1 - this.st / 0.6); if (s > 0) F(ctx, 'hurt', d, 0, X, Y, { k: s }); return; }
      if (st === 'attack') { F(ctx, 'slash', d, Math.min(3, Math.floor(this.st / LV.SWING_T * 4)), X, Y); return; }
      if (st === 'spin') {
        const dd = [2, 1, 0, 3][Math.floor(this.st / 0.42 * 4) % 4]; F(ctx, 'slash', dd, 2, X, Y);
        if (LV.IMG.fx_spin) { const k = Math.min(3, Math.floor(this.st / 0.42 * 4)); ctx.drawImage(LV.IMG.fx_spin, k * 32, 0, 32, 32, X - 32, Y - 40, 64, 64); }
        return;
      }
      if (st === 'charge') {
        F(ctx, 'thrust', d, 0, X, Y);
        if (this.charge >= 0.8 && Math.floor(this.t * 16) % 2) { ctx.fillStyle = '#ffffff'; const D = LV.DIRS[d]; ctx.fillRect(X + D.x * 14 - 1, Y - 10 + D.y * 14 - 1, 3, 3); }
        return;
      }
      if (st === 'item' || st === 'grapple') {
        if (g && g.save.equip === 'bow') F(ctx, 'bow', d, 4 + Math.min(3, Math.floor(this.st / 0.2 * 4)), X, Y);
        else F(ctx, 'throw', d, Math.min(3, 1 + Math.floor(this.st / 0.2 * 3)), X, Y);
        return;
      }
      if (st === 'dash') {
        F(ctx, 'run', d, Math.floor(this.st * 14) % 6, X, Y);
        if (g && Math.floor(this.st * 20) % 3 === 0 && this.st > 0.22) g.effects.push(new LV.Fx('dust', this.x, this.y + 2, { scale: 1 }));
        return;
      }
      if (this.kb > 0) { F(ctx, 'hurt', d, 0, X, Y); return; }
      if (this.swimming && st === 'walk') {
        F(ctx, 'walk', d, Math.floor(this.anim) % 6, X, Y + 6, { clip: 4 });
        ctx.fillStyle = 'rgba(220,240,255,.8)'; const k = Math.floor(this.t * 6) % 2;
        ctx.fillRect(X - 9 + k, Y + 1, 5, 1); ctx.fillRect(X + 4 - k, Y + 1, 5, 1); ctx.fillRect(X - 6, Y + 2, 12, 1);
        return;
      }
      if (this.pushing && st === 'walk') { F(ctx, 'push', d, Math.floor(this.anim / 2) % 2, X, Y); return; }
      if (st === 'lift') { F(ctx, 'lift', 2, 3, X, Y); return; }
      if (st === 'carry') { F(ctx, 'lift', d, this.moving ? 2 + Math.floor(this.anim) % 2 : 3, X, Y); return; }
      if (this.moving) { F(ctx, 'walk', d, Math.floor(this.anim * 1.1) % 6, X, Y); return; }
      F(ctx, 'idle', d, 0, X, Y);
    } finally {
      ctx.globalAlpha = 1;
      if (g && g.riot) for (let k = 0; k < 3; k++) { const a = g.riot.t * 5 + k * 2.09, im = LV.IMG.fx_energy, px = Math.round(this.x - ox + Math.cos(a) * 18), py = Math.round(this.y - oy - 10 + Math.sin(a) * 18); if (im) ctx.drawImage(im, (Math.floor(g.riot.t * 12) + k) % 4 * 16, 0, 16, 16, px - 6, py - 6, 12, 12); }
    }
  };
  // the file select and new-file screens show her too
  const hf = LV.heroFrame;
  LV.heroFrame = function (ctx, t, dir, frame, X, Y) {
    if (!LV.wrenOn()) return hf(ctx, t, dir, frame, X, Y);
    LV.wrenFrame(ctx, 'walk', dir, frame % 6, X, Y + 2, { tunic: t });
  };
})();
