/* ================= The last pieces in Ninja Adventure art: HUD hearts, bombs, projectiles, lava,
   and the enemies that used to be drawn in code ================= */
(function () {
  const IM = function (k) { return LV.IMG[k]; };
  // HUD hearts: the pack's heart in five fill steps (empty .. full), shrunk to the HUD's 8 px grid
  const heart = LV.heart;
  LV.heart = function (ctx, x, y, q) { const im = IM('ui_hearts'); if (!im) return heart(ctx, x, y, q); ctx.drawImage(im, Math.round(q) * 16, 0, 16, 16, x - 1, y - 1, 9, 9); };
  // a placed bomb: the pack's bomb, blinking red before it goes off
  const bomb = LV.Bomb.prototype.draw;
  LV.Bomb.prototype.draw = function (ctx, ox, oy) {
    const im = IM('it_bombs'); if (this.boom || !im) return bomb.call(this, ctx, ox, oy);
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), flash = this.t > 1.1 && Math.floor(this.t * 14) % 2, s = flash ? 1.15 : 1;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 5, Y - 2, 10, 3);
    if (flash) { ctx.save(); ctx.filter = 'sepia(1) saturate(6) hue-rotate(-30deg)'; }
    ctx.drawImage(im, X - im.width * s / 2, Y - im.height * s - 1, im.width * s, im.height * s);
    if (flash) ctx.restore();
  };
  // arrows, daggers (the Bandit Queen's kunai) and anything else flying in a straight line
  const spin = function (ctx, im, X, Y, ang) { ctx.save(); ctx.translate(X, Y); ctx.rotate(ang); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore(); };
  const arrow = LV.Arrow.prototype.draw;
  LV.Arrow.prototype.draw = function (ctx, ox, oy) {
    const dagger = this.update === LV.Dagger, im = IM(dagger ? 'fx_kunai' : 'fx_arrow'); if (!im) return arrow.call(this, ctx, ox, oy);
    const d = LV.DIRS[this.dir], ang = dagger ? Math.atan2(this.vy, this.vx) + (im.width > im.height ? 0 : -Math.PI / 2) : Math.atan2(d.y, d.x);
    spin(ctx, im, Math.round(this.x - ox), Math.round(this.y - oy), ang);
  };
  // Vex's orbs, the Ember Rod's fireballs, the snapjaw's spit: the pack's energy balls and fireballs
  const ball = function (key, x, y, t, s) { const im = IM(key); if (!im) return false; const f = Math.floor(t * 12) % 4; s = s || 1; ctx_draw(im, f, x, y, s); return true; };
  let CTX = null; const ctx_draw = function (im, f, x, y, s) { CTX.drawImage(im, f * 16, 0, 16, 16, Math.round(x - 8 * s), Math.round(y - 8 * s), 16 * s, 16 * s); };
  const orb = LV.Orb.prototype.draw;
  LV.Orb.prototype.draw = function (ctx, ox, oy) { CTX = ctx; if (this.team !== 'enemy') { ctx.save(); ctx.filter = 'hue-rotate(180deg)'; } const ok = ball('fx_energy', this.x - ox, this.y - oy, this.t, 1); if (this.team !== 'enemy') ctx.restore(); if (!ok) orb.call(this, ctx, ox, oy); };
  const fire = LV.Fireball.prototype.draw;
  LV.Fireball.prototype.draw = function (ctx, ox, oy) { CTX = ctx; if (!ball('fx_fireball', this.x - ox, this.y - oy - 6, this.t, 1)) fire.call(this, ctx, ox, oy); };
  const spit = LV.Spit.prototype.draw;
  LV.Spit.prototype.draw = function (ctx, ox, oy) { CTX = ctx; if (!ball('fx_energy', this.x - ox, this.y - oy - 4, this.t || 0, 0.7)) spit.call(this, ctx, ox, oy); };
  // the grapple: a chain of links and the pack's kunai as the hook
  const grap = LV.Grapple.prototype.draw;
  LV.Grapple.prototype.draw = function (ctx, ox, oy) {
    const im = IM('fx_kunai'); if (!im) return grap.call(this, ctx, ox, oy);
    const h = this.h, X = Math.round(this.x - ox), Y = Math.round(this.y - oy), sx = Math.round(h.x - ox), sy = Math.round(h.y - 8 - oy), n = Math.max(1, Math.floor(Math.hypot(X - sx, Y - sy) / 4));
    for (let i = 0; i <= n; i++) { const px = Math.round(sx + (X - sx) * i / n), py = Math.round(sy + (Y - sy) * i / n); ctx.fillStyle = '#2a2a32'; ctx.fillRect(px - 2, py - 2, 4, 4); ctx.fillStyle = '#b8b8c8'; ctx.fillRect(px - 1, py - 1, 2, 2); }
    spin(ctx, im, X, Y, Math.atan2(Y - sy, X - sx) + (im.width > im.height ? 0 : Math.PI / 2));
  };
  // lava: molten pack water with rolling ripples
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, g, ox, oy) {
    special(ctx, g, ox, oy);
    const w = g.world, lava = w.def.lava, im = IM('lava'); if (!lava || !im) return;
    const set = w.lavaSet || (w.lavaSet = new Set(lava)), x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * w.w + tx; if (!set.has(i) || w.col[i] !== LV.C.PIT) continue;
      const f = Math.floor(g.t * 3 + tx * 2 + ty) % 4, X = tx * 16 - ox, Y = ty * 16 - oy;
      ctx.drawImage(im, f * 16, 0, 16, 16, X, Y, 16, 16);
      if (!set.has(i - w.w)) { ctx.fillStyle = 'rgba(40,10,4,.7)'; ctx.fillRect(X, Y, 16, 2); }
    }
  };
  // enemies that were drawn in code
  const sprite = function (key, cols) { return function (ctx, ox, oy) { const im = IM(key); if (!im) return false;
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return true;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), c = LV.HCOL[this.dir || 2], r = Math.floor((this.t || 0) * 6) % 4, s = this.drawScale || 1;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 6 * s, Y - 2, 12 * s, 3);
    ctx.drawImage(im, (cols ? c : 0) * 16, (this.still ? 0 : r) * 16, 16, 16, X - 8 * s, Y - 16 * s - (this.lift || 0), 16 * s, 16 * s); return true; }; };
  const wrap = function (name, key, opt) {
    const make = LV.ENEMIES[name]; if (!make) return;
    LV.ENEMIES[name] = function (x, y, s) { const e = make(x, y, s), old = e.draw, nd = sprite(key, true); Object.assign(e, opt || {});
      e.draw = function (ctx, ox, oy) { if (!nd.call(this, ctx, ox, oy)) old.call(this, ctx, ox, oy); }; return e; };
  };
  wrap('snapjaw', 'm_lizard');
  // the stone sentinels are the pack's statues; the colossus a giant one
  const ms = LV.makeSentinel;
  LV.makeSentinel = function (x, y, k) { const e = ms(x, y, k), old = e.draw, nd = sprite(k % 2 ? 'c_GoldStatue' : 'c_Statue', true); e.drawScale = 2;
    e.draw = function (ctx, ox, oy) { this.lift = this.hop > 0 ? Math.round(Math.sin(this.hop * Math.PI) * 10) : 0; if (!nd.call(this, ctx, ox, oy)) old.call(this, ctx, ox, oy); }; return e; };
  const col = LV.ENEMIES.colossus;
  LV.ENEMIES.colossus = function (x, y) { const e = col(x, y), old = e.draw, nd = sprite('c_Statue', true); e.drawScale = 3;
    e.draw = function (ctx, ox, oy) { if (this.name === 'Shellback') return old.call(this, ctx, ox, oy); this.lift = this.stomp > 0 ? Math.round(Math.sin((0.5 - this.stomp) / 0.5 * Math.PI) * 6) : 0; if (!nd.call(this, ctx, ox, oy)) old.call(this, ctx, ox, oy); }; return e; };
  // Cinder Wisps: a living pack flame
  const wisp = LV.ENEMIES.wisp;
  LV.ENEMIES.wisp = function (x, y) { const e = wisp(x, y), old = e.draw;
    e.draw = function (ctx, ox, oy) { const im = IM('fx_flam'); if (!im) return old.call(this, ctx, ox, oy); if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy - 6 + Math.sin(this.t * 6) * 2), f = 2 + Math.floor(this.t * 12) % 4;
      ctx.globalAlpha = this.dim && this.dim() ? 0.35 : 1; ctx.drawImage(im, f * 25, 0, 25, 30, X - 12, Y - 26, 25, 30); ctx.globalAlpha = 1; }; return e; };
  // fire bars: a spinning chain of pack fireballs round an iron post
  const bar = LV.ENEMIES.firebar;
  LV.ENEMIES.firebar = function (x, y, s) { const e = bar(x, y, s), old = e.draw;
    e.draw = function (ctx, ox, oy) { const im = IM('fx_fireball'), post = IM('nadungeon'); if (!im || !post) return old.call(this, ctx, ox, oy);
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy); ctx.drawImage(post, 8 * 16, 3 * 16, 16, 16, X - 8, Y - 16, 16, 16); CTX = ctx;
      for (let k = 1; k <= this.len; k++) ctx_draw(im, (Math.floor(this.t * 12) + k) % 4, X + Math.cos(this.ang) * k * 9, Y - 8 + Math.sin(this.ang) * k * 9, 0.75); }; return e; };
  // the Kraken's bubbles: blue pack energy balls
  const mb = LV.makeBubble;
  LV.makeBubble = function (k, i) { const e = mb(k, i), old = e.draw;
    e.draw = function (ctx, ox, oy) { CTX = ctx; if (!ball('fx_energy', this.x - ox, this.y - oy - 6 + (this.attached ? 0 : Math.sin(this.t * 8)), this.t, 0.8)) old.call(this, ctx, ox, oy); }; return e; };
  // shooting gallery targets: the pack's crystal orbs on stands
  const mt = LV.makeTarget;
  LV.makeTarget = function (x, y, k) { const e = mt(x, y, k), old = e.draw;
    e.draw = function (ctx, ox, oy) { const im = IM('nadungeon'); if (!im) return old.call(this, ctx, ox, oy); ctx.drawImage(im, (4 + (k % 4)) * 16, 32, 16, 16, Math.round(this.x - ox - 8), Math.round(this.y - oy - 16), 16, 16); }; return e; };
})();
// the title's sword is the pack's katana, drawn large
(function () {
  const sw = LV.drawSword;
  LV.drawSword = function (ctx, x, y) { const im = LV.IMG.it_katana; if (!im) return sw(ctx, x, y); const s = 3; ctx.save(); ctx.translate(x, y + 18); ctx.rotate(Math.PI / 4 * (im.width > im.height ? -1 : 0)); ctx.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); ctx.restore(); };
})();
// stun: little pack sparks circling the head
LV.stunStars = function (ctx, X, Y, t) {
  const im = LV.IMG.fx_spark; if (!im) return;
  for (let k = 0; k < 2; k++) { const a = t * 8 + k * Math.PI; ctx.drawImage(im, (Math.floor(t * 10) + k) % 7 * 10, 0, 10, 8, Math.round(X + Math.cos(a) * 7) - 5, Math.round(Y - 22 + Math.sin(a) * 2) - 4, 10, 8); }
};
(function () {
  const IM = function (k) { return LV.IMG[k]; };
  // thrown dice: the pack's die, tumbling
  const dice = LV.Dice.prototype.draw;
  LV.Dice.prototype.draw = function (ctx, ox, oy) { const im = IM('it_dice'); if (!im) return dice.call(this, ctx, ox, oy);
    ctx.save(); ctx.translate(Math.round(this.x - ox), Math.round(this.y - oy)); ctx.rotate(Math.floor(this.t * 16) * Math.PI / 4); ctx.drawImage(im, -6, -6, 12, 12); ctx.restore(); };
  // the Dawnblade's beam: a bright pack energy bolt
  const beam = LV.Beam.prototype.draw;
  LV.Beam.prototype.draw = function (ctx, ox, oy) { if (this.t < 0.12) return; const im = IM('fx_energy'); if (!im) return beam.call(this, ctx, ox, oy);
    ctx.save(); ctx.filter = 'hue-rotate(200deg) brightness(1.6)'; ctx.drawImage(im, Math.floor(this.t * 16) % 4 * 16, 0, 16, 16, Math.round(this.x - ox) - 10, Math.round(this.y - oy) - 10, 20, 20); ctx.restore(); };
  // archers hold the pack's bow
  const ms = LV.makeSoldier;
  LV.makeSoldier = function (rank, archer) { const f = ms(rank, archer); return function (x, y) { const e = f(x, y), old = e.draw;
    if (e.archer) e.draw = function (ctx, ox, oy) { old.call(this, ctx, ox, oy); const im = IM('it_bow'); if (!im || (this.inv > 0 && Math.floor(this.inv * 30) % 2)) return;
      const d = LV.DIRS[this.dir], X = Math.round(this.x - ox) + d.x * 7, Y = Math.round(this.y - oy) - 8 + d.y * 4; ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.atan2(d.y, d.x) - Math.PI / 2); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore(); };
    return e; }; };
  // shutter doors: the pack's iron bars
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, g, ox, oy) {
    special(ctx, g, ox, oy); const im = IM('nahouse'); if (!im) return;
    const w = g.world, x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (w.col[ty * w.w + tx] === LV.C.SHUTTER) { const X = tx * 16 - ox, Y = ty * 16 - oy; ctx.fillStyle = '#1a1418'; ctx.fillRect(X, Y, 16, 16); ctx.drawImage(im, 9 * 16, 10 * 16, 16, 16, X, Y, 16, 16); }
  };
})();
