/* ================= Side quests: people who want something, and give something back =================
   A quest villager has quest = {id, need, set, reward, before, after}: once you have the flag it needs (if any),
   talking to them sets their flag and pays the reward; after that they say their 'after' lines. */
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s), q = s && s.quest; if (!q) return e;
    e.lines = function (g) {
      const f = g.save.flags;
      if (f[q.set]) return q.after;
      if (q.need && !f[q.need]) return ['Hmm. I am waiting on something, and you have not got it. Yet.'];
      return q.before;
    };
    const talk = e.onTalk;
    e.onTalk = function (g) {
      if (talk) talk.call(this, g);
      const f = g.save.flags;
      if (f[q.set] || (q.need && !f[q.need])) return;
      f[q.set] = 1; if (q.need) f[q.need + '_used'] = 1;
      const m = q.reward && /^cash(\d+)$/.exec(q.reward);
      if (m) { g.save.cash = Math.min(999, g.save.cash + +m[1]); g.sfx('cash'); g.say(['You got ' + m[1] + ' cash!']); }
      else if (q.reward && LV.GEAR_TEXT[q.reward]) { g.save.items[q.reward] = 1; g.sfx('chest'); g.say(LV.GEAR_TEXT[q.reward]); }
      else g.sfx('chest');
    };
    return e;
  };
})(LV.makeVillager);
LV.ENEMIES.villager = LV.makeVillager;

/* ---------- windmills: the pack's propeller turning over the mill's roof ---------- */
(function () {
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, g, ox, oy) {
    special(ctx, g, ox, oy);
    const mills = g.world.def.mills, im = LV.IMG.an_mill; if (!mills || !im) return;
    const f = Math.floor(LV.sceneTime() * 6) % 4;
    for (const p of mills) ctx.drawImage(im, f * 64, 0, 64, 64, Math.round(p[0] - ox - 32), Math.round(p[1] - oy - 46), 64, 64);
  };
})();

/* ---------- wildlife gets tougher the further you roam from Thistledown (and tougher still in the Shadow world) ---------- */
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const t = this.world.def.tier || 1; if (t <= 1 && !this.world.def.dmgTier) return;
    for (const a of this.actors) if (!a.npc && !a.boss && !a.invuln && a.hp > 0 && a.hp < 50 && !a.tiered) { a.tiered = true; a.hp = Math.ceil(a.hp * t); if (a.contact) a.contact = Math.ceil(a.contact * (this.world.def.dmgTier || (1 + (t - 1) * 0.5))); }
  };
})();
