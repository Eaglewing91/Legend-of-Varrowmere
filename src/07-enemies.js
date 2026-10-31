/* ================= More enemies: the Gilded Hand =================
   Soldiers are palette swaps of the pack's hero (gold helmet hair, purple tunic), so they share every walk
   and sword frame. Like the original's soldiers: they patrol, spot you, chase, and swing their swords. */
LV.recolour = function (img, map) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
  x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const m = {}; Object.keys(map).forEach(function (k) { m[parseInt(k.slice(1), 16)] = parseInt(map[k].slice(1), 16); });
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const v = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2], to = m[v]; if (to !== undefined) { p[i] = to >> 16; p[i + 1] = (to >> 8) & 255; p[i + 2] = to & 255; } }
  x.putImageData(d, 0, 0); return c;
};
LV.SOLDIER_RANKS = {
  green: { hp: 4, sp: 38, look: 90, dmg: 2, map: { '#432e27': '#7a5a10', '#6a4834': '#e0b030', '#c43c3c': '#3e8a3c', '#882e2e': '#245a28', '#681c1c': '#163c1a', '#65659b': '#3a3a52' } },
  blue: { hp: 6, sp: 46, look: 110, dmg: 4, map: { '#432e27': '#7a5a10', '#6a4834': '#e0b030', '#c43c3c': '#3a5ab8', '#882e2e': '#243a80', '#681c1c': '#16245a', '#65659b': '#3a3a52' } },
  purple: { hp: 8, sp: 52, look: 130, dmg: 4, map: { '#432e27': '#7a5a10', '#6a4834': '#e0b030', '#c43c3c': '#6a34a0', '#882e2e': '#45206e', '#681c1c': '#2e1450', '#65659b': '#2a1d40' } }
};
LV.prepareEnemyArt = function () {
  Object.keys(LV.SOLDIER_RANKS).forEach(function (k) { LV.IMG['soldier_' + k] = LV.recolour(LV.IMG.hero, LV.SOLDIER_RANKS[k].map); });
};
LV.makeSoldier = function (rank, archer) {
  return function (x, y) {
    const R = LV.SOLDIER_RANKS[rank];
    const e = new LV.Actor({ x: x, y: y, hp: R.hp, contact: R.dmg, body: [-5, -6, 10, 6], hurt: [-6, -18, 12, 18], kind: 'soldier' });
    e.rank = rank; e.archer = !!archer; e.state = 'patrol'; e.home = { x: x, y: y }; e.pd = 1; e.anim = 0; e.cool = 1; e.drop = true; e.weakToDice = false;
    e.update = function (g, dt) {
      this.t += dt; if (this.inv > 0) this.inv -= dt; this.cool -= dt;
      if (this.kb > 0) { this.kb -= dt; LV.move(this, g.world, this.kbx * dt, this.kby * dt, 'enemy'); return; }
      if (this.stun > 0) { this.stun -= dt; return; }
      const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy);
      const facing = LV.DIRS[this.dir], sees = d < R.look && (dx * facing.x + dy * facing.y > -8 || d < 40);
      if (this.state === 'patrol') {
        // walk back and forth along a short line; turn at walls
        const r = LV.move(this, g.world, this.pd * R.sp * 0.5 * dt, 0, 'enemy'); this.dir = this.pd > 0 ? 1 : 3; this.anim += dt * 5;
        if (!r.x || Math.abs(this.x - this.home.x) > 40) this.pd = -this.pd;
        if (sees) { this.state = 'chase'; g.sfx('clink'); }
        return;
      }
      if (this.state === 'swing') {
        this.st += dt; const f = Math.min(3, Math.floor(this.st / 0.3 * 4));
        const a = LV.SWING[this.dir][f] * Math.PI / 180, b = { x: this.x + Math.cos(a) * 12 - 6, y: this.y - 8 + Math.sin(a) * 12 - 6, w: 12, h: 12 };
        if (LV.overlap(b, h.hurtBox())) LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'blade', power: R.dmg, from: { x: this.x, y: this.y - 8 }, done: this.swingSet }), h);
        if (this.st > 0.3) { this.state = 'chase'; this.cool = 0.9; }
        return;
      }
      if (d > R.look * 1.6) { this.state = 'patrol'; this.home = { x: this.x, y: this.y }; return; }
      this.dir = LV.dirFromVec(dx, dy, this.dir); this.anim += dt * 7;
      if (this.archer) {
        // keep a distance and shoot when lined up
        const aligned = Math.abs(dx) < 6 || Math.abs(dy) < 6;
        if (aligned && this.cool <= 0) { this.dir = Math.abs(dx) < 6 ? (dy > 0 ? 2 : 0) : (dx > 0 ? 1 : 3); g.shots.push(new LV.Arrow(this.x, this.y - 8, this.dir, 'enemy')); this.cool = 1.6; g.sfx('throw'); return; }
        const want = d < 48 ? -1 : d > 80 ? 1 : 0, ax = Math.abs(dx) < Math.abs(dy) ? dx : 0, ay = Math.abs(dx) < Math.abs(dy) ? 0 : dy;
        LV.move(this, g.world, (want * dx / (d || 1) + (ax ? LV.sign(ax) * 0.6 : 0)) * R.sp * dt, (want * dy / (d || 1) + (ay ? LV.sign(ay) * 0.6 : 0)) * R.sp * dt, 'enemy');
        return;
      }
      if (d < 22 && this.cool <= 0) { this.state = 'swing'; this.st = 0; this.swingSet = new Set(); g.sfx('swing'); return; }
      LV.move(this, g.world, dx / (d || 1) * R.sp * dt, dy / (d || 1) * R.sp * dt, 'enemy');
    };
    e.draw = function (ctx, ox, oy) {
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const img = LV.IMG['soldier_' + this.rank], X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
      if (this.state === 'swing') { const f = Math.min(3, Math.floor(this.st / 0.3 * 4)); ctx.drawImage(img, f * 32, 128 + LV.ATK_ROW[this.dir] * 32, 32, 32, X - 16, Y - 28, 32, 32); return; }
      const col = Math.floor(this.anim) % 4;
      ctx.drawImage(img, col * 16, LV.HERO_ROW[this.dir] * 32, 16, 32, X - 8, Y - 28, 16, 32);
      if (this.archer) { ctx.fillStyle = '#8a5a30'; ctx.fillRect(X + (this.dir === 3 ? -9 : 6), Y - 18, 2, 10); }
      if (this.stun > 0) LV.stunStars(ctx, X, Y, this.t);
    };
    return e;
  };
};
LV.ENEMIES.soldier = LV.makeSoldier('green');
LV.ENEMIES.soldierBlue = LV.makeSoldier('blue');
LV.ENEMIES.captain = LV.makeSoldier('purple');
LV.ENEMIES.archer = LV.makeSoldier('green', true);
