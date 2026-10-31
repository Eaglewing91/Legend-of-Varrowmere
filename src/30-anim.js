/* ================= Ninja Adventure animation: the hero, effects and particles =================
   The hero is the pack's fully animated character (32 x 32 cells, feet 24 px down; columns face down, up, left, right).
   Effects are the pack's FX strips; particles are single frames that fly, fall and fade. */
LV.HCOL = [1, 3, 0, 2];                       // our dir (up, right, down, left) -> sheet column
LV.heroCell = function (ctx, key, col, row, X, Y) { const im = LV.IMG['h_' + key]; if (im) ctx.drawImage(im, col * 32, row * 32, 32, 32, X - 16, Y - 24, 32, 32); };
LV.Hero.prototype.draw = function (ctx, ox, oy) {
  const g = LV.game, X = Math.round(this.x - ox), Y = Math.round(this.y - oy), c = LV.HCOL[this.dir], st = this.state;
  if (this.inv > 0 && Math.floor(this.inv * 20) % 2 && st !== 'fall' && !this.flashT) return;
  if (g && g.cloak) ctx.globalAlpha = 0.3;
  try {
    if (st === 'fall') {                       // shrink away into the pit
      const s = Math.max(0, 1 - this.st / 0.6), im = LV.IMG.h_hit; if (!im) return;
      ctx.drawImage(im, c * 32, 0, 32, 32, X - 16 * s, Y - 24 * s, 32 * s, 32 * s); return;
    }
    if (st === 'attack' || st === 'spin' || st === 'charge') {
      let f = st === 'charge' ? 3 : Math.min(3, Math.floor(this.st / LV.SWING_T * 4)), d = this.dir;
      if (st === 'spin') { d = [2, 1, 0, 3][Math.floor(this.st / 0.42 * 4) % 4]; f = 2; }
      const cc = LV.HCOL[d], kat = LV.IMG.h_katana;
      const blade = function () { if (kat) ctx.drawImage(kat, cc * 64, f * 64, 64, 64, X - 32, Y - 40, 64, 64); };
      if (d === 0) blade();                    // facing away: the blade is behind
      LV.heroCell(ctx, 'attack', cc, f, X, Y);
      if (d !== 0) blade();
      if (st === 'spin' && LV.IMG.fx_spin) { const k = Math.min(3, Math.floor(this.st / 0.42 * 4)); ctx.drawImage(LV.IMG.fx_spin, k * 32, 0, 32, 32, X - 32, Y - 40, 64, 64); }
      if (st === 'charge' && this.charge >= 0.8 && Math.floor(this.t * 16) % 2) { ctx.fillStyle = '#ffffff'; const D = LV.DIRS[d]; ctx.fillRect(X + D.x * 14 - 1, Y - 10 + D.y * 14 - 1, 3, 3); }
      return;
    }
    if (st === 'item' || st === 'grapple') { LV.heroCell(ctx, 'item', 0, this.st < 0.1 ? 0 : 1, X, Y); return; }
    if (st === 'dash') {
      LV.heroCell(ctx, 'roll', c, Math.floor(this.st * 14) % 3, X, Y);
      if (g && Math.floor(this.st * 20) % 3 === 0 && this.st > 0.22) g.effects.push(new LV.Fx('dust', this.x, this.y + 2, { scale: 1 }));
      return;
    }
    if (this.kb > 0) { LV.heroCell(ctx, 'hit', c, 0, X, Y); return; }
    if (this.swimming && st === 'walk') { LV.heroCell(ctx, 'swim', c, Math.floor(this.anim) % 4, X, Y + 2); return; }
    if (this.pushing && st === 'walk') { LV.heroCell(ctx, 'push', c, Math.floor(this.anim) % 4, X, Y); return; }
    if (st === 'lift') { LV.heroCell(ctx, 'pickup', 0, 1, X, Y); return; }
    if (this.moving) { LV.heroCell(ctx, 'walk', c, Math.floor(this.anim) % 4, X, Y); return; }
    LV.heroCell(ctx, 'idle', c, Math.floor((this.t || 0) * 2) % 4 === 3 ? 1 : 0, X, Y);
  } finally {
    ctx.globalAlpha = 1;
    if (g && g.riot) for (let k = 0; k < 3; k++) { const a = g.riot.t * 5 + k * 2.09, im = LV.IMG.fx_energy, px = Math.round(this.x - ox + Math.cos(a) * 18), py = Math.round(this.y - oy - 10 + Math.sin(a) * 18); if (im) ctx.drawImage(im, (Math.floor(g.riot.t * 12) + k) % 4 * 16, 0, 16, 16, px - 6, py - 6, 12, 12); }
  }
};

/* ---------- effects: name -> [frame width, frames, fps, first frame, draw scale] ---------- */
LV.FX = { explosion: [40, 9, 22, 2], smoke: [32, 6, 18, 0], dust: [16, 15, 40, 0, 0.8], spin: [32, 4, 12, 0], cutx: [32, 4, 16, 0],
  sparkle: [45, 6, 14, 0], splash: [40, 11, 22, 0], ice: [32, 10, 20, 0], flam: [25, 8, 18, 0], thunder: [20, 8, 18, 0], spirit: [32, 5, 10, 0] };
LV.Fx = function (name, x, y, o) { this.name = name; this.x = x; this.y = y; this.t = 0; this.dead = false; this.o = o || {}; };
LV.Fx.prototype.update = function (g, dt) { const F = LV.FX[this.name]; this.t += dt; if (this.t * F[2] >= F[1] - F[3]) this.dead = true; };
LV.Fx.prototype.draw = function (ctx, ox, oy) {
  const F = LV.FX[this.name], im = LV.IMG['fx_' + this.name]; if (!im) return;
  const f = Math.min(F[1] - 1, F[3] + Math.floor(this.t * F[2])), s = this.o.scale || F[4] || 1, w = F[0] * s, h = im.height * s;
  ctx.drawImage(im, f * F[0], 0, F[0], im.height, Math.round(this.x - ox - w / 2), Math.round(this.y - oy - h + 4), w, h);
};
// particles: one frame of a strip, flung outwards, falling and fading
LV.PART = { leaf: 12, grass: 12, rock: 16, rockgray: 16, vase: 14, spark: 10, snow: 8, rain: 8 };
LV.Particle = function (key, x, y, vx, vy, o) { o = o || {}; this.key = key; this.x = x; this.y = y; this.z = o.z || 8; this.vx = vx; this.vy = vy; this.vz = o.vz == null ? 60 : o.vz; this.t = 0; this.life = o.life || 0.6; this.dead = false; this.f = o.f == null ? Math.floor(Math.random() * 6) : o.f; this.grav = o.grav == null ? 260 : o.grav; };
LV.Particle.prototype.update = function (g, dt) { this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt; this.vz -= this.grav * dt; this.z = Math.max(0, this.z + this.vz * dt); if (this.t > this.life) this.dead = true; };
LV.Particle.prototype.draw = function (ctx, ox, oy) {
  const im = LV.IMG['fx_' + this.key]; if (!im) return; const fw = LV.PART[this.key], n = Math.max(1, Math.floor(im.width / fw)), f = this.f % n;
  ctx.globalAlpha = Math.max(0, Math.min(1, (this.life - this.t) / 0.25));
  ctx.drawImage(im, f * fw, 0, fw, im.height, Math.round(this.x - ox - fw / 2), Math.round(this.y - oy - this.z - im.height / 2), fw, im.height);
  ctx.globalAlpha = 1;
};
LV.burst = function (g, key, x, y, n, speed) {
  for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, v = (speed || 50) * (0.5 + Math.random() * 0.7); g.effects.push(new LV.Particle(key, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6, { vz: 50 + Math.random() * 50 })); }
};
// the old effect kinds now use the pack: a poof is a smoke puff, leaves are a burst of leaves and grass
LV.Effect.prototype.update = function (g, dt) {
  if (!this.spawned) { this.spawned = true; if (this.kind === 'leaves') { LV.burst(g, 'leaf', this.x, this.y - 6, 4, 50); LV.burst(g, 'grass', this.x, this.y - 6, 3, 40); this.dead = true; return; } }
  this.t += dt; if (this.t > 6 / 18) this.dead = true;
};
LV.Effect.prototype.draw = function (ctx, ox, oy) {
  const im = LV.IMG.fx_smoke; if (!im) return; const f = Math.min(5, Math.floor(this.t * 18));
  ctx.drawImage(im, f * 32, 0, 32, 32, Math.round(this.x - ox - 16), Math.round(this.y - oy - 26), 32, 32);
};
// bombs explode with the pack's explosion (and throw up rock chips)
(function () {
  const draw = LV.Bomb.prototype.draw;
  LV.Bomb.prototype.draw = function (ctx, ox, oy) {
    if (!this.boom || !LV.IMG.fx_explosion) return draw.call(this, ctx, ox, oy);
    if (!this.chips && LV.game) { this.chips = true; LV.burst(LV.game, 'rock', this.x, this.y - 6, 6, 80); }
    const f = Math.min(8, 2 + Math.floor(this.t / 0.35 * 7)), X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
    ctx.drawImage(LV.IMG.fx_explosion, f * 40, 0, 40, 40, X - 30, Y - 52, 60, 60);
  };
})();
// sounds that happen somewhere visible get a matching effect
(function () {
  const sfx = LV.Game.prototype.sfx;
  LV.Game.prototype.sfx = function (name) {
    sfx.call(this, name);
    const h = this.hero; if (!h || !this.effects) return;
    if (name === 'splash') this.effects.push(new LV.Fx('splash', h.x, h.y + 6));
    else if (name === 'clink') { const d = LV.DIRS[h.dir]; LV.burst(this, 'spark', h.x + d.x * 14, h.y - 8 + d.y * 12, 4, 40); }
    else if (name === 'chest' || name === 'heart') this.effects.push(new LV.Fx('sparkle', h.x, h.y - 6));
  };
})();
