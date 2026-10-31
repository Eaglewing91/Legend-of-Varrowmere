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
