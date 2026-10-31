/* ================= Vex's people in Mana Seed =================
   Character art: Mana Seed Character Base with its Sword & Shield and Bow combat add-ons by Seliel the Shaper, used
   with the artist's permission (not covered by this game's licence; don't copy it out of the script).
   The Gilded Hand soldiers (sword and shield), their archers, the brutes and captains, Chancellor Vex and the Bandit
   Queen. One soldier sheet is dyed for each rank. Behaviour and hit boxes are unchanged; only the drawing is new.
   Monsters stay as they are (Mana Seed has none in these packs). */
LV.msFoe = function (n) { return LV.MS && LV.MS[n] && LV.IMG['ms_' + n] ? LV.MS[n] : null; };
// a sheet with its clothes dyed towards one colour (cached); null colour = as drawn
(function () {
  const cache = {};
  const hsl = function (r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h / 6, s, l]; };
  const rgb = function (h, s, l) { if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; };
  LV.msDyed = function (n, col) {
    const im = LV.IMG['ms_' + n], M = LV.MS[n]; if (!col) return im;
    const key = n + ':' + col.join(','); if (cache[key]) return cache[key];
    const want = hsl(col[0], col[1], col[2]), dark = want[1] < 0.12 || want[2] < 0.25, map = {};
    M.recol.forEach(function (c) { const h = hsl(c[0], c[1], c[2]); const o = dark ? rgb(want[0], want[1] * 0.5, h[2] * (0.25 + want[2] * 1.4)) : rgb(want[0], Math.min(1, 0.35 + want[1] * 0.75), h[2] * (0.8 + want[2] * 0.4)); map[(c[0] << 16) | (c[1] << 8) | c[2]] = o.map(Math.round); });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const o = map[(p[i] << 16) | (p[i + 1] << 8) | p[i + 2]]; if (o) { p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2]; } }
    x.putImageData(d, 0, 0); return (cache[key] = c);
  };
})();
// rank colours: the Gilded Hand wear gold; officers and the named captains have their own
LV.RANK_DYE = { green: [200, 160, 52], blue: [70, 110, 196], purple: [132, 82, 176], red: [190, 56, 46], teal: [40, 132, 132], grey: [96, 96, 108], black: [40, 38, 50] };
LV.msFoeFrame = function (ctx, n, dye, anim, dir, f, X, Y, k) {
  const M = LV.MS[n], A = M[anim]; if (!A) return;
  const im = LV.msDyed(n, dye), K = k || 0.75;
  ctx.drawImage(im, (f % A.n) * A.w, A.y + LV.WREN_ROW[dir] * A.h, A.w, A.h, X - A.fx * K, Y - A.fy * K, A.w * K, A.h * K);
};
// which rank's picture is in a slot right now (the captains borrow each other's: see LV.brutelike)
LV.rankIn = function (slot) {
  const cur = LV.IMG[slot]; const order = ['red', 'blue', 'teal', 'grey', 'black', 'green', 'purple'];
  for (const r of order) if (('soldier_' + r) !== slot && LV.IMG['soldier_' + r] === cur) return r;
  return slot.replace('soldier_', '');
};
(function () {
  // soldiers and archers
  ['soldier', 'soldierBlue', 'captain', 'archer'].forEach(function (k) {
    const make = LV.ENEMIES[k]; if (!make) return;
    LV.ENEMIES[k] = function (x, y) {
      const e = make(x, y), old = e.draw;
      e.draw = function (ctx, ox, oy) {
        const n = this.archer ? 'archer' : 'soldier'; if (!LV.msFoe(n)) return old.call(this, ctx, ox, oy);
        if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
        const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), dye = LV.RANK_DYE[this.rank] || null;
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(X - 5, Y - 2, 10, 3);
        if (this.archer && this.cool > 1.25) LV.msFoeFrame(ctx, n, dye, 'shoot', this.dir, Math.min(3, Math.floor((1.6 - this.cool) / 0.35 * 4)), X, Y);
        else if (this.state === 'swing') LV.msFoeFrame(ctx, n, dye, 'slash', this.dir, Math.min(3, Math.floor(this.st / 0.3 * 4)), X, Y);
        else LV.msFoeFrame(ctx, n, dye, 'walk', this.dir, Math.floor(this.anim) % 4, X, Y);
        if (this.stun > 0 && LV.stunStars) LV.stunStars(ctx, X, Y, this.t);
      };
      return e;
    };
  });
  // the captains and named bosses: full size and a half (3 x 3 real pixels each, so they stay crisp)
  const captain = function (kind, rank, o) {
    const make = LV.ENEMIES[kind]; if (!make) return;
    o = o || {};
    LV.ENEMIES[kind] = function (x, y, s) {
      const e = make(x, y, s), old = e.draw;
      e.draw = function (ctx, ox, oy) {
        if (!LV.msFoe('soldier')) return old.call(this, ctx, ox, oy);
        if ((this.state === 'fade' || this.state === 'appear') && Math.floor((this.st || 0) * 20) % 2) return;
        const flash = this.inv > 0 && Math.floor(this.inv * 30) % 2;
        const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), dye = LV.RANK_DYE[rank], K = o.k || 1.5;
        const shake = this.state === 'wind' ? Math.round(Math.sin(this.t * 60)) : 0;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 10, Y - 2, 20, 4);
        ctx.save(); if (flash) ctx.filter = 'brightness(3)'; if (o.alpha) ctx.globalAlpha = o.alpha + Math.sin((this.t || 0) * 3) * 0.1;
        const st = this.state;
        if (st === 'dazed' || this.stun > 0) LV.msFoeFrame(ctx, 'soldier', dye, 'hurt', this.dir, 0, X, Y, K);
        else if (st === 'wind') LV.msFoeFrame(ctx, 'soldier', dye, 'stance', this.dir, 0, X + shake, Y, K);
        else if (st === 'charge' || st === 'swing' || st === 'slam') LV.msFoeFrame(ctx, 'soldier', dye, 'slash', this.dir, Math.min(3, Math.floor((this.st || 0) * 8) % 4), X, Y, K);
        else LV.msFoeFrame(ctx, 'soldier', dye, 'walk', this.dir, Math.floor(this.anim || this.t * 6) % 4, X, Y, K);
        ctx.restore();
        if (o.crown) { const top = Y - Math.round(LV.MS.soldier.walk.fy * K) + 4; ctx.fillStyle = '#c8b060'; ctx.fillRect(X - 6, top, 12, 3); ctx.fillRect(X - 6, top - 3, 2, 3); ctx.fillRect(X - 1, top - 4, 2, 4); ctx.fillRect(X + 4, top - 3, 2, 3); }
        if (st === 'dazed' || this.stun > 0) { ctx.fillStyle = '#f8d040'; const a = this.t * 8; ctx.fillRect(X + Math.cos(a) * 12, Y - 52, 2, 2); ctx.fillRect(X - Math.cos(a) * 12, Y - 52, 2, 2); }
      };
      return e;
    };
  };
  captain('brute', 'purple');                         // Captain Brask
  captain('garrow', 'blue');                          // Lieutenant Garrow
  captain('hald', 'red');                             // Forgemaster Hald
  captain('drowned', 'teal', { alpha: 0.75 });        // the Drowned Knight
  captain('quarryboss', 'grey');                      // the Quarry Boss
  captain('brask2', 'black');                         // Captain Brask returns
  captain('hollowking', 'black', { crown: true });    // the Hollow King
  // Chancellor Vex (and the Bandit Queen, who borrows his moves)
  const vex = LV.ENEMIES.vex;
  LV.ENEMIES.vex = function (x, y) {
    const e = vex(x, y), old = e.draw;
    e.draw = function (ctx, ox, oy) {
      const queen = !!this.queen || LV.IMG.vex === LV.IMG.soldier_red, n = queen ? 'queen' : 'vex';
      if (!LV.msFoe(n)) return old.call(this, ctx, ox, oy);
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      if ((this.state === 'fade' || this.state === 'appear') && Math.floor(this.st * 20) % 2) return;
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), A = LV.MS[n].idle, top = Y - Math.round(A.fy * 1.5) + 4;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 6, Y - 2, 12, 3);
      LV.msFoeFrame(ctx, n, null, this.state === 'cast' ? 'cast' : 'idle', 2, 0, X, Y, 1.5);
      if (!queen) { ctx.fillStyle = '#e0b030'; ctx.fillRect(X - 4, top, 8, 3); ctx.fillRect(X - 4, top - 2, 2, 2); ctx.fillRect(X - 1, top - 3, 2, 3); ctx.fillRect(X + 2, top - 2, 2, 2); }
      if (this.state === 'cast') { const r = 3 + Math.floor(this.st * 8) % 3; ctx.fillStyle = queen ? '#f0a070' : '#c89af8'; ctx.fillRect(X - r, top - 8 - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, top - 9, 2, 2); }
    };
    return e;
  };
  // the Bandit Queen (she was a tengu): Vex's moves, her own look
  const bq = LV.ENEMIES.banditqueen;
  if (bq) LV.ENEMIES.banditqueen = function (x, y, s) {
    const e = bq(x, y, s), old = e.draw;
    e.draw = function (ctx, ox, oy) {
      if (!LV.msFoe('queen')) return old.call(this, ctx, ox, oy);
      if ((this.state === 'fade' || this.state === 'appear') && Math.floor((this.st || 0) * 20) % 2) return;
      const flash = this.inv > 0 && Math.floor(this.inv * 30) % 2, X = Math.round(this.x - ox), Y = Math.round(this.y - oy), h = LV.game && LV.game.hero;
      const dir = h ? LV.dirFromVec(h.x - this.x, h.y - this.y, 2) : 2;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 8, Y - 2, 16, 4);
      ctx.save(); if (flash) ctx.filter = 'brightness(3)';
      LV.msFoeFrame(ctx, 'queen', null, this.state === 'cast' ? 'cast' : 'idle', dir, 0, X, Y, 1.5); ctx.restore();
    };
    return e;
  };
})();
