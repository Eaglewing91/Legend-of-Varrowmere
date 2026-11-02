/* ================= A gentler start =================
   Until Wren wins her first Pendant (the Meadow Ruins), she has only a few hearts and no armour, so the first hours
   were a little too punishing. Until then:
   - an ordinary enemy's hit costs at most half a heart (a blue soldier's sword, a big monster's bite);
   - a boss's hits cost a quarter less (never under half a heart);
   - a defeated enemy leaves a heart more often when she is hurt.
   Everything is back to normal from the first Pendant on. Only damage to Wren changes, never what she deals. */
LV.earlyGame = function (g) { return !!(g && g.save && g.save.items && !g.save.items.pendant_ruins1); };
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (!t || !t.isHero || hit.team === 'hero' || hit.kind === 'bomb' || !LV.earlyGame(game) || (game.world && game.world.def.shadow)) return ah(game, hit, t);
    const was = hit.power, boss = game.actors && game.actors.some(function (a) { return a.boss && !a.dead; });
    hit.power = boss ? Math.max(Math.min(was, 2), Math.round(was * 0.75)) : Math.min(was, 2);
    try { return ah(game, hit, t); } finally { hit.power = was; }
  };
  const drop = LV.Game.prototype.dropLoot;
  LV.Game.prototype.dropLoot = function (x, y, chance) {
    if (LV.earlyGame(this) && this.hero && this.hero.hp < this.hero.maxHp && this.rng() < 0.35) {   // a heart, on top of the usual roll
      this.pickups.push(new LV.Pickup(x, y, 'heart')); return;
    }
    return drop.call(this, x, y, chance);
  };
})();

/* ---------- Knockback never throws you through a door or off the screen ----------
   As in the original, only walking takes you through a doorway, down stairs or across to the next screen. A hit that
   knocks Wren back stops short of any warp tile and at the edge of the current screen (room), so a monster by the
   entrance can no longer bounce you straight back outside or into the previous room. */
(function () {
  const upd = LV.Hero.prototype.update;
  LV.Hero.prototype.update = function (g, dt) {
    const knocked = this.kb > 0, x0 = this.x, y0 = this.y;
    upd.call(this, g, dt);
    if (!knocked || !g.world || g.scroll) return;
    const w = g.world, tile = function (x, y) { return w.warpAt(Math.floor(x / 16), Math.floor((y - 3) / 16)); };
    if (tile(this.x, this.y) && !tile(x0, y0)) { this.x = x0; this.y = y0; }
    const a = g.area, T = LV.TILE;
    if (a) { this.x = LV.clamp(this.x, a[0] * T + 4, (a[0] + a[2]) * T - 4); this.y = LV.clamp(this.y, a[1] * T + 8, (a[1] + a[3]) * T - 3); }
  };
  // and a doorway you were knocked next to (or were already standing in) only takes you while you walk
  const warp = LV.Game.prototype.checkWarp;
  LV.Game.prototype.checkWarp = function () { if (this.hero && this.hero.kb > 0) return; return warp.call(this); };
})();
