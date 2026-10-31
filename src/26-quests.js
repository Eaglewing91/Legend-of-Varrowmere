/* ================= Side quests and minigames: the plushie, the Northreach race, fishing ================= */
LV.GEAR_TEXT.plushie = ['You found a Plushie!', 'Soft, smug and stolen. Someone in Marrowgate must be missing it.'];
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s);
    if (s && s.plushie) e.onTalk = function (g) {
      const S = g.save; if (!S.items.plushie || S.flags.plushie_back) return;
      delete S.items.plushie; S.flags.plushie_back = 1; S.cash = Math.min(999, S.cash + 150); g.sfx('chest');
      g.say(['You found the plushie! The stall owner will be beside himself. Here, from the town reward fund: 150 cash.', 'Do not tell the Mayor. He thinks the reward fund is a ribbon fund.']);
    };
    if (s && s.racer) e.onTalk = function (g) {
      const goal = g.world.def.race_goal; if (!goal) return;
      g.ask(['The flag is at the far side of the downs. Twenty five seconds. Go?'], ['Go!', 'Not now'], function (i) {
        if (i) return; g.race = { t: 25, goal: goal, map: g.world.id }; g.say(['Ready... GO!']);
      });
    };
    if (s && s.fishing) e.onTalk = function (g) {
      const S = g.save;
      g.ask(['Ten cash for a cast off my pier?'], ['Cast', 'No thanks'], function (i) {
        if (i) return; if (S.cash < 10) { g.say(['Ten cash. The fish do not take credit.']); return; }
        S.cash -= 10; const r = g.rng();
        if (r < 0.4) { g.sfx('clink'); g.say(['...Nothing. The fish are on strike.']); return; }
        if (r < 0.95) { const v = [5, 10, 20, 30, 40][Math.floor(g.rng() * 5)]; S.cash = Math.min(999, S.cash + v); g.sfx('cash'); g.say(['You caught a fish! The fisher buys it off you for ' + v + ' cash.']); return; }
        S.cash = Math.min(999, S.cash + 100); S.flags.goldenCarp = 1; g.sfx('chest'); g.say(['A Golden Carp! Worth a hundred cash, and a story you will tell far too often.']);
      });
    };
    return e;
  };
})(LV.makeVillager);
(function () {
  const update = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    update.call(this, dt);
    const R = this.race; if (!R || this.dialog || this.paused || this.mode !== 'play' && this.mode !== undefined) return;
    if (this.world.id !== R.map) { this.race = null; return; }
    R.t -= dt; const h = this.hero;
    if (Math.floor(h.x / 16) === R.goal[0] && Math.abs(Math.floor((h.y - 3) / 16) - R.goal[1]) <= 1) {
      this.race = null; const S = this.save, first = !S.flags.raceWon; S.flags.raceWon = 1; this.sfx('chest');
      if (first) { S.shards++; if (S.shards % 4 === 0) { S.maxHp += 4; h.maxHp = S.maxHp; h.hp = S.maxHp; } this.say(['You touched the flag with ' + Math.ceil(R.t) + ' seconds to spare!', 'A Heart Shard for the winner!']); }
      else { S.cash = Math.min(999, S.cash + 20); this.say(['Faster every time! Twenty cash.']); }
      return;
    }
    if (R.t <= 0) { this.race = null; this.say(['Too slow! The flag laughs at you. Flags can do that.']); }
  };
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () {
    render.call(this);
    const R = this.race; if (!R || this.mode === 'title') return;
    LV.text(this.ctx, 'RACE ' + Math.ceil(R.t), 108, 200, '#f8d040');
    const ox = Math.round(this.cam.x), oy = Math.round(this.cam.y), X = R.goal[0] * 16 - ox, Y = R.goal[1] * 16 - oy;
    this.ctx.fillStyle = '#5a3a1a'; this.ctx.fillRect(X + 7, Y - 8, 2, 22); this.ctx.fillStyle = '#e83040'; this.ctx.fillRect(X + 9, Y - 8, 7, 5);
  };
})();
