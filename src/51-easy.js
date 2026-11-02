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
