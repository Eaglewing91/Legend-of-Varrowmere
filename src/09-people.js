/* ================= Villagers =================
   Townsfolk are palette swaps of the pack's hero sheet (all grown-ups: different hair, clothes, a few grey heads).
   Like the original they mill about, turn to face you and talk when you press the action button in front of them.
   A villager's lines can change with story flags: talk is a list of [flag, lines] pairs, first match wins. */
LV.VILLAGER_LOOKS = {
  elder:   { '#432e27': '#8c8c94', '#6a4834': '#c8c8d0', '#c43c3c': '#5a4a8a', '#882e2e': '#3e3266', '#681c1c': '#2a2048', '#65659b': '#4a3a2a' },
  farmer:  { '#432e27': '#5a3a14', '#6a4834': '#8c5a20', '#c43c3c': '#6a8a3a', '#882e2e': '#4a6a24', '#681c1c': '#324a18', '#65659b': '#6a4a2a' },
  trader:  { '#432e27': '#1e1e24', '#6a4834': '#34343e', '#c43c3c': '#c89030', '#882e2e': '#9a6a1c', '#681c1c': '#6a4410', '#65659b': '#3a2a4a' },
  fisher:  { '#432e27': '#a05a20', '#6a4834': '#d08038', '#c43c3c': '#3a7ab0', '#882e2e': '#285a88', '#681c1c': '#183c5e', '#65659b': '#5a5a64' },
  guard:   { '#432e27': '#7a5a10', '#6a4834': '#b8b8c0', '#c43c3c': '#8a3030', '#882e2e': '#5e2020', '#681c1c': '#401414', '#65659b': '#3a3a52' },
  scholar: { '#432e27': '#6a6a72', '#6a4834': '#a0a0a8', '#c43c3c': '#2a6a6a', '#882e2e': '#1c4a4a', '#681c1c': '#103232', '#65659b': '#2a2a3a' },
  baker:   { '#432e27': '#c8b070', '#6a4834': '#f0d890', '#c43c3c': '#e8e0d0', '#882e2e': '#c0b8a8', '#681c1c': '#908878', '#65659b': '#6a5a4a' }
};
(function () {
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () { prep(); Object.keys(LV.VILLAGER_LOOKS).forEach(function (k) { LV.IMG['villager_' + k] = LV.recolour(LV.IMG.hero, LV.VILLAGER_LOOKS[k]); }); };
})();
LV.makeVillager = function (x, y, s) {
  s = s || {};
  const e = new LV.Actor({ x: x, y: y, hp: 99, contact: 0, body: [-5, -6, 10, 6], hurt: [-6, -18, 12, 18], kind: 'villager' });
  e.npc = true; e.sets = s.sets; e.look = s.look || 'farmer'; e.talk = s.talk || [[null, ['Nice weather.']]]; e.home = { x: x, y: y };
  e.roam = s.roam === undefined ? 16 : s.roam; e.dir = s.dir === undefined ? 2 : s.dir; e.anim = 0; e.wait = 1 + (x % 7) / 3; e.goal = null; e.facing = 0;
  e.update = function (g, dt) {
    this.t += dt;
    if (this.facing > 0) { this.facing -= dt; return; }
    if (!this.roam) return;
    if (this.goal) {
      const dx = this.goal.x - this.x, dy = this.goal.y - this.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { this.goal = null; this.wait = 1.2 + g.rng() * 2.5; return; }
      this.dir = LV.dirFromVec(dx, dy, this.dir); this.anim += dt * 6;
      const r = LV.move(this, g.world, dx / d * 22 * dt, dy / d * 22 * dt, 'enemy');
      if (!r.x && !r.y) this.goal = null;
      // never walk into the hero
      if (LV.overlap(this.bodyBox(), g.hero.bodyBox())) { LV.move(this, g.world, -dx / d * 22 * dt, -dy / d * 22 * dt, 'enemy'); this.goal = null; }
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) {
      const a = g.rng() * Math.PI * 2;
      this.goal = { x: this.home.x + Math.cos(a) * this.roam * g.rng(), y: this.home.y + Math.sin(a) * this.roam * g.rng() };
    }
  };
  e.draw = function (ctx, ox, oy) {
    const img = LV.IMG['villager_' + this.look], X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
    const col = this.goal ? Math.floor(this.anim) % 4 : 0;
    ctx.drawImage(img, col * 16, LV.HERO_ROW[this.dir] * 32, 16, 32, X - 8, Y - 28, 16, 32);
  };
  e.lines = function (g) {
    for (const p of this.talk) if (!p[0] || LV.flagTrue(g, p[0])) return p[1];
    return this.talk[this.talk.length - 1][1];
  };
  return e;
};
// flags: 'name' = set, '!name' = not set
LV.flagTrue = function (g, f) { const s = g.save, k = f[0] === '!' ? f.slice(1) : f, on = !!(s.flags[k] || s.items[k]); return f[0] === '!' ? !on : on; };
LV.ENEMIES.villager = LV.makeVillager;

// Villagers can't be hurt
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (t.npc) return null; return ah(game, hit, t); };
})();

// Spawns pass their full definition so villagers get their look and lines
LV.Game.prototype.enter = (function (orig) {
  return function (mapId, x, y, dir, first) {
    orig.call(this, mapId, x, y, dir, first);
    const self = this, def = LV.MAPS[mapId];
    this.actors = this.actors.filter(function (a) { return a.kind !== 'villager'; });
    def.spawns.forEach(function (s) { if (s.kind === 'villager' && (!s.when || LV.flagTrue(self, s.when))) self.actors.push(LV.makeVillager(s.x * 16 + 8, s.y * 16 + 14, s)); });
  };
})(LV.Game.prototype.enter);

// Villagers are solid: the hero is pushed back out of them
LV.Game.prototype.update = (function (orig) {
  return function (dt) {
    const h = this.hero, px = h.x, py = h.y;
    orig.call(this, dt);
    if (this.scroll || this.dialog || this.paused) return;
    for (const a of this.actors) if (a.npc && LV.overlap(a.bodyBox(), h.bodyBox())) {
      const tx = h.x, ty = h.y;
      h.x = px; if (LV.overlap(a.bodyBox(), h.bodyBox())) { h.x = tx; h.y = py; if (LV.overlap(a.bodyBox(), h.bodyBox())) h.x = px; }
    }
  };
})(LV.Game.prototype.update);

// Talk: the action button in front of a villager
LV.Game.prototype.interact = (function (orig) {
  return function (h) {
    // talk across a counter: if the tile in front is solid, reach one tile further
    const d = LV.DIRS[h.dir], near = { x: h.x + d.x * 12 - 6, y: h.y - 10 + d.y * 12, w: 12, h: 12 };
    const far = { x: near.x + d.x * 16, y: near.y + d.y * 16, w: 12, h: 12 }, nc = this.world.c(Math.floor((near.x + 6) / 16), Math.floor((near.y + 6) / 16)), solid = nc === LV.C.SOLID || nc === LV.C.LOW;
    for (const a of this.actors) if (a.npc && (LV.overlap(near, a.hurtBox()) || (solid && LV.overlap(far, a.hurtBox())))) {
      a.dir = (h.dir + 2) % 4; a.goal = null; a.facing = 1.5;
      const self = this, lines = a.lines(this);
      const out = lines.map(function (l) { return typeof l === 'function' ? l(self) : l; });
      this.say(out, function () { if (a.onTalk) a.onTalk(self); });
      if (a.sets) this.save.flags[a.sets] = 1;
      return true;
    }
    return orig.call(this, h);
  };
})(LV.Game.prototype.interact);
