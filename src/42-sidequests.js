/* ================= Side quests, the way the original does them =================
   People who walk behind you (an old man lost in the snow, a sealed chest that hops after you), a wishing pond that
   makes your bags bigger, a jester who wants a joke, and two small treasures: the Lucky Clover and the Merchant's Seal.
   The side quests you've finished are counted on the items screen and in your completion. */
LV.NEWGEAR.luckyclover = { name: 'Lucky Clover', icon: 'it_heart', text: ['You got the Lucky Clover!', 'Foes drop hearts far more often. Tam swears by it.'] };
LV.NEWGEAR.merchantseal = { name: "Merchant's Seal", icon: 'it_mirror', text: ["You got the Merchant's Seal!", 'Every shop gives you a quarter off. The Guild will not say why. Do not ask.'] };
LV.GEAR_TEXT.ring = ['You dug up a gold ring!', 'Engraved inside: "To the finest trader in the Sunscar. From the Merchants Guild." Someone will want this back.'];
// what counts as a finished side quest
LV.SIDEQUESTS = [['tradedone', 'The plushie trade'], ['dogdone', 'Biscuit the dog'], ['starsdone', 'The star chart'], ['plushie_back', 'The stolen plushie'], ['raceWon', 'The Northreach race'],
  ['pell_home', 'Lost on Skyridge'], ['tam_done', 'Tam and the fairy'], ['well_used', 'The Wishing Pond'], ['wedge_done', 'The Hollow Oak'], ['ring_done', 'The buried ring'],
  ['hide_done', 'Hide and seek'], ['ghost_done', "Old Gruff's last wish"], ['chest_open', 'The sealed chest'], ['jester_done', 'The Shadow Jester'], ['stash_done', "The thief's stash"]];
LV.sideDone = function (s) { const f = (s && s.flags) || {}; return LV.SIDEQUESTS.filter(function (q) { return f[q[0]]; }).length; };

/* ---------- followers ---------- */
(function () {
  const SAY = { pell: ['PELL: Not so fast, young one. These are knees, not wheels.', 'PELL: Is it much further? I could murder a cup of tea.'], chest: ['The chest hums happily and bumps into your heels.'] };
  function makeFollower(g, f) {
    const h = g.hero;
    const e = f.who === 'Chest' ? new LV.Actor({ x: h.x, y: h.y, hp: 99, contact: 0, body: [-5, -6, 10, 6], hurt: [-6, -14, 12, 14], kind: 'follower' }) : LV.makeVillager(h.x, h.y, { look: f.look, who: f.who, roam: 0 });
    e.npc = true; e.follower = true; e.invuln = true; e.kind = 'follower'; e.quest = null; e.onTalk = null; e.t = 0;
    e.lines = function () { const l = SAY[f.id] || ['...']; return [l[Math.floor(Math.random() * l.length)]]; };
    e.update = function (g2, dt) {
      this.t += dt; const tr = g2.trail || [], back = tr[Math.max(0, tr.length - 14)];
      if (!back) return;
      const dx = back.x - this.x, dy = back.y - this.y, d = Math.hypot(dx, dy);
      if (d > 0.5) { this.x += dx * Math.min(1, dt * 10); this.y += dy * Math.min(1, dt * 10); this.dir = LV.dirFromVec(dx, dy, this.dir); this.anim = (this.anim || 0) + dt * 7; this.goal = d > 1 ? back : null; } else this.goal = null;
    };
    if (f.who === 'Chest') e.draw = function (ctx, ox, oy) {
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy) - (this.goal ? Math.abs(Math.round(Math.sin(this.t * 14) * 3)) : 0);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 6, Math.round(this.y - oy) - 2, 12, 3);
      ctx.fillStyle = '#1a0e20'; ctx.fillRect(X - 7, Y - 12, 14, 11);
      ctx.fillStyle = '#7a3aa8'; ctx.fillRect(X - 6, Y - 11, 12, 9); ctx.fillStyle = '#a860d8'; ctx.fillRect(X - 6, Y - 11, 12, 3);
      ctx.fillStyle = '#f0c040'; ctx.fillRect(X - 6, Y - 8, 12, 1); ctx.fillRect(X - 1, Y - 9, 2, 4); ctx.fillStyle = '#1a0e20'; ctx.fillRect(X, Y - 7, 1, 1);
    };
    return e;
  }
  LV.followerStart = function (g, id, npc) {
    const q = npc.quest; g.save.follower = { id: id, who: npc.who, look: npc.look, shadow: !!g.world.def.shadow };
    g.trail = []; LV.poof(g, npc);
    const e = makeFollower(g, g.save.follower); e.x = npc.x; e.y = npc.y; g.actors.push(e); void q;
  };
  LV.followerHome = function (g) { delete g.save.follower; g.actors.forEach(function (a) { if (a.follower) a.dead = true; }); };
  const NAMES = { pell: 'Pell', chest: 'The chest' };
  const QUEST_OF = { pell: 'pell_go', chest: 'chest_go' };
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const g = this, d = this.world.def, f = this.save.follower;
    // people sent away by a flag (found, following you, or gone home)
    this.actors = this.actors.filter(function (a) { return !(a.quest && a.quest.hide && a.quest.hide.some(function (k) { return LV.flagTrue(g, k); })); });
    if (!f) return;
    // a follower won't go into dungeons, or through the Twin Mirror: they go back to where you found them
    if (d.dungeon || !!d.shadow !== f.shadow) {
      delete this.save.follower; delete this.save.flags[QUEST_OF[f.id]];
      const self = this; setTimeout(function () { if (!self.dialog) self.say([(NAMES[f.id] || 'They') + (f.id === 'chest' ? ' will not follow you there. It hops off back to where you found it.' : ' will not follow you there, and heads back to where you found him.')]); }, 50);
      return;
    }
    this.trail = []; const e = makeFollower(this, f); e.x = x; e.y = y; this.actors.push(e);
  };
  // the hero leaves a trail of footsteps for the follower to walk in
  const upd = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    upd.call(this, dt);
    if (!this.save || !this.save.follower || !this.hero || this.mode === 'title' || this.mode === 'ending') return;
    const tr = this.trail = this.trail || [], h = this.hero, last = tr[tr.length - 1];
    if (!last || Math.hypot(h.x - last.x, h.y - last.y) >= 1.5) { tr.push({ x: h.x, y: h.y }); if (tr.length > 40) tr.shift(); }
  };
})();

/* ---------- the Wishing Pond and the Shadow Jester ---------- */
LV.QUEST_KINDS.well = function (g, npc, q) {
  const s = g.save, f = s.flags, nb = f.wellB || 0, na = f.wellA || 0;
  const opts = [nb < 3 ? 'Bigger bomb bag  $100' : 'Bomb bag (as big as it gets)', na < 3 ? 'Bigger quiver  $100' : 'Quiver (as big as it gets)', 'Just looking'];
  g.ask(['Throw in 100 cash and wish. What for?'], opts, function (i) {
    if (i === 2) { g.say(['The pond goes back to sulking.']); return; }
    if ((i === 0 && nb >= 3) || (i === 1 && na >= 3)) { g.say(['The pond can stretch it no further.']); return; }
    if (i === 0 && !s.items.bombbag) { g.say(['You need a bomb bag before the pond can make it bigger.']); return; }
    if (i === 1 && !s.items.bow) { g.say(['You need a bow before the pond can give you a bigger quiver.']); return; }
    if (s.cash < 100) { g.sfx('clink'); g.say(['The pond wants 100 cash. Ponds are not cheap.']); return; }
    s.cash -= 100; f.well_used = 1; g.sfx('chest'); g.shake = 0.2;
    if (i === 0) { f.wellB = nb + 1; s.bombUp = (s.bombUp || 0) + 1; g.say(['The water glows... your bomb bag grows!', 'You can carry ' + LV.capB(s) + ' bombs now.']); }
    else { f.wellA = na + 1; s.arrowUp = (s.arrowUp || 0) + 1; g.say(['The water glows... your quiver grows!', 'You can carry ' + LV.capA(s) + ' arrows now.']); }
  });
};
LV.QUEST_KINDS.joke = function (g, npc, q) {
  const opts = ['Why did the skeleton not fight? No guts.', 'A Chancellor with no castle? Vex-ed.', 'Knock knock.'];
  g.ask(['Go on then. Make me laugh.'], opts, function (i) {
    if (i === 0) { g.say(['Heard it. In the year 1204. From a skeleton.']); return; }
    if (i === 2) { g.say(['Who is there? Nobody. Nobody is ever there. This is the Shadow.', 'Try again.']); return; }
    g.save.flags[q.set] = 1; g.shake = 0.3;
    g.say(['...', 'Pfff... HA! HAHAHA! VEX-ED! Oh, that is wicked. A hundred years I waited for that.'].concat(LV.giveReward(g, q.reward)));
  });
};

/* ---------- the Lucky Clover and the Merchant's Seal ---------- */
(function () {
  const drop = LV.Game.prototype.dropLoot;
  LV.Game.prototype.dropLoot = function (x, y, chance) {
    if (this.save.items.luckyclover && this.rng() < chance * 0.5) { this.pickups.push(new LV.Pickup(x, y, 'heart')); return; }
    return drop.call(this, x, y, chance);
  };
  LV.price = function (g, p) { return g && g.save && g.save.items.merchantseal ? Math.ceil(p * 0.75) : p; };
})();
