/* ================= Side quests: people who want something, and give something back =================
   A quest villager has quest = {id, need, set, reward, before, after}: once you have the flag it needs (if any),
   talking to them sets their flag and pays the reward; after that they say their 'after' lines. */
/* What a quest can need: a flag or item ('hammer'), several ('kid1','kid2'), something in a bottle ('bottle:fairy'),
   or someone walking behind you ('follow:pell'). Rewards: 'cash150', 'heart_shard', 'bottle', any gear id, or a list. */
LV.questNeed = function (g, need) {
  if (!need) return true;
  if (Array.isArray(need)) return need.every(function (n) { return LV.questNeed(g, n); });
  if (need.indexOf('bottle:') === 0) return (g.save.bottles || []).indexOf(need.slice(7)) >= 0;
  if (need.indexOf('follow:') === 0) { const f = g.save.follower; return !!(f && f.id === need.slice(7) && g.actors.some(function (a) { return a.follower && !a.dead; })); }
  return LV.flagTrue(g, need);
};
LV.questTake = function (g, take) {
  if (!take) return;
  const s = g.save;
  if (take.indexOf('bottle:') === 0) { const i = (s.bottles || []).indexOf(take.slice(7)); if (i >= 0) s.bottles[i] = 'empty'; return; }
  delete s.items[take];
};
LV.giveReward = function (g, r) {
  if (!r) return [];
  if (Array.isArray(r)) return r.reduce(function (out, x) { return out.concat(LV.giveReward(g, x)); }, []);
  const s = g.save, m = /^cash(\d+)$/.exec(r);
  if (m) { s.cash = Math.min(999, s.cash + +m[1]); g.sfx('cash'); return ['You got ' + m[1] + ' cash!']; }
  g.sfx('chest');
  if (r === 'heart_shard') {
    s.shards = (s.shards || 0) + 1;
    if (s.shards % 4 === 0 && s.maxHp < 80) { s.maxHp += 4; g.hero.maxHp = s.maxHp; g.hero.hp = s.maxHp; return ['You got a Heart Shard!', 'That makes four: your life grows by one heart!']; }
    return ['You got a Heart Shard! (' + (s.shards % 4) + '/4)'];
  }
  if (r === 'bottle') { s.bottles = s.bottles || []; s.bottles.push('empty'); return LV.GEAR_TEXT.bottle.slice(); }
  const G = LV.NEWGEAR && LV.NEWGEAR[r];
  if (G) { s.items[r] = 1; if (G.get) G.get(s); return G.text.slice(); }
  s.items[r] = 1; return (LV.GEAR_TEXT[r] || ['You got something!']).slice();
};
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s), q = s && s.quest; if (!q) return e;
    e.quest = q;
    // the newer quests explain themselves; the old trade chain waits quietly until you bring the thing
    const fresh = !!(q.thanks || q.follow || q.kind || q.hide);
    e.lines = function (g) {
      const f = g.save.flags;
      if (f[q.set] && q.kind !== 'well') return q.after;
      if (q.need && !LV.questNeed(g, q.need)) return fresh ? q.before : ['Hmm. I am waiting on something, and you have not got it. Yet.'];
      return q.thanks && !q.kind ? q.thanks : q.before;
    };
    const talk = e.onTalk;
    e.onTalk = function (g) {
      if (talk) talk.call(this, g);
      const f = g.save.flags, self = this;
      if (q.kind && LV.QUEST_KINDS[q.kind]) { if (!f[q.set] || q.kind === 'well') LV.QUEST_KINDS[q.kind](g, this, q); return; }
      if (f[q.set] || !LV.questNeed(g, q.need)) return;
      f[q.set] = 1; if (q.need && !Array.isArray(q.need)) f[q.need + '_used'] = 1;
      LV.questTake(g, q.take);
      if (q.need && /^follow:/.test(q.need)) LV.followerHome(g);
      if (q.follow) { LV.followerStart(g, q.follow, this); return; }
      const lines = LV.giveReward(g, q.reward);
      if (lines.length) g.say(lines);
      // someone who was hiding runs home
      if (q.hide && q.hide.indexOf(q.set) >= 0) LV.poof(g, self);
    };
    return e;
  };
})(LV.makeVillager);
LV.ENEMIES.villager = LV.makeVillager;
LV.QUEST_KINDS = {};
LV.poof = function (g, a) { a.dead = true; g.effects.push(new LV.Effect(a.x, a.y, 'poof')); };

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
