/* ================= Boss and mini-boss art from the Ninja Adventure pack (Pixel-boy and AAA, CC0) =================
   Each strip is a row of square-ish frames; drawn with the feet on the actor's position. */
LV.BOSSART = {
  spirit: [50, 5], squidg: [76, 4], squidr: [76, 4], samblue: [48, 12], samred: [48, 12], tengu: [82, 6],
  frog: [40, 5], flam: [50, 5], racoon: [60, 6], racoongold: [60, 6], cyclop: [50, 5]
};
LV.drawBoss = function (ctx, key, x, y, t, opts) {
  const img = LV.IMG['b_' + key], a = LV.BOSSART[key]; if (!img || !a) return false;
  opts = opts || {}; const fw = a[0], n = a[1], fh = img.height, f = Math.floor(t * (opts.fps || 8)) % n, sc = opts.scale || 1;
  ctx.save();
  if (opts.flash) ctx.filter = 'brightness(3)'; else if (opts.filter) ctx.filter = opts.filter;
  if (opts.alpha) ctx.globalAlpha = opts.alpha;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(x - fw * sc * 0.3), Math.round(y - 3), Math.round(fw * sc * 0.6), 4);
  ctx.drawImage(img, f * fw, 0, fw, fh, Math.round(x - fw * sc / 2), Math.round(y - fh * sc + (opts.lift || 0)), fw * sc, fh * sc);
  ctx.restore(); return true;
};
LV.withBossArt = function (kind, key, opts) {
  const mk = LV.ENEMIES[kind]; if (!mk) return;
  LV.ENEMIES[kind] = function (x, y, s) {
    const e = mk(x, y, s), old = e.draw;
    e.draw = function (ctx, ox, oy) {
      if (!LV.IMG['b_' + key]) return old.call(this, ctx, ox, oy);
      const flash = this.inv > 0 && Math.floor(this.inv * 30) % 2;
      if (this.state === 'fade' && Math.floor((this.st || 0) * 20) % 2) return;
      const extra = typeof opts === 'function' ? opts.call(this) : (opts || {});
      LV.drawBoss(ctx, key, this.x - ox, this.y - oy, this.t, Object.assign({ flash: flash }, extra));
      if (this.state === 'dazed' || this.stun > 0) { ctx.fillStyle = '#f8d040'; const a = this.t * 8; ctx.fillRect(this.x - ox + Math.cos(a) * 12, this.y - oy - 50, 2, 2); ctx.fillRect(this.x - ox - Math.cos(a) * 12, this.y - oy - 50, 2, 2); }
      if (extra.after) extra.after.call(this, ctx, ox, oy);
    };
    return e;
  };
};
// mini-bosses
LV.withBossArt('brute', 'samred', function () { return { lift: this.state === 'wind' ? Math.round(Math.sin(this.t * 60)) : 0 }; });
LV.withBossArt('garrow', 'racoon');
LV.withBossArt('hald', 'flam');
LV.withBossArt('drowned', 'cyclop');
LV.withBossArt('quarryboss', 'racoongold');
LV.withBossArt('brask2', 'samred', { filter: 'brightness(0.55) saturate(0.6)' });
// bosses
LV.withBossArt('hollowking', 'samblue', { filter: 'brightness(0.75)' });
LV.withBossArt('banditqueen', 'tengu');
LV.withBossArt('shellback', 'frog', function () { return { scale: 1.4, lift: this.stomp > 0 ? -Math.round(Math.sin((0.5 - this.stomp) / 0.5 * Math.PI) * 10) : 0 }; });
LV.withBossArt('shade', 'spirit', function () { return { scale: 1.3, filter: this.stagger > 0 ? 'grayscale(1) brightness(1.5)' : 'hue-rotate(220deg) saturate(1.6) brightness(0.8)' }; });
// the krakens keep their bubble rings; the body is the pack's great squid
(function () {
  ['kraken', 'bogmaw'].forEach(function (k, i) {
    const mk = LV.ENEMIES[k];
    LV.ENEMIES[k] = function (x, y, s) {
      const e = mk(x, y, s), old = e.draw, key = i ? 'squidr' : 'squidg';
      e.draw = function (ctx, ox, oy) {
        if (!LV.IMG['b_' + key]) return old.call(this, ctx, ox, oy);
        LV.drawBoss(ctx, key, this.x - ox, this.y - oy + 6, this.t, { flash: this.inv > 0 && Math.floor(this.inv * 30) % 2, scale: 0.75, fps: 6 });
      };
      return e;
    };
  });
})();
// the wyrms become the pack's segmented dragons: head, two kinds of body segment, and the spiked tail (the weak point)
(function () {
  [['pyrewyrm', 'dg'], ['frostwyrm', 'db']].forEach(function (p) {
    const mk = LV.ENEMIES[p[0]];
    LV.ENEMIES[p[0]] = function (x, y, s) {
      const e = mk(x, y, s), old = e.draw, k = p[1];
      e.draw = function (ctx, ox, oy) {
        const H = LV.IMG['b_' + k + '_head']; if (!H) return old.call(this, ctx, ox, oy);
        for (let i = 5; i >= 0; i--) {
          const q = this.seg(i), X = Math.round(q.x - ox), Y = Math.round(q.y - oy) - 10;
          const img = i === 0 ? H : i === 5 ? LV.IMG['b_' + k + '_end'] : LV.IMG['b_' + k + (i % 2 ? '_body1' : '_body2')];
          ctx.save(); if (i === 5 && this.inv > 0 && Math.floor(this.inv * 30) % 2) ctx.filter = 'brightness(3)';
          ctx.drawImage(img, X - Math.round(img.width / 2), Y - Math.round(img.height / 2)); ctx.restore();
        }
      };
      return e;
    };
  });
})();
// Shellback is a giant toad now
LV.Game.prototype.kill = (function (orig) { return function (a) { return orig.call(this, a); }; })(LV.Game.prototype.kill);
