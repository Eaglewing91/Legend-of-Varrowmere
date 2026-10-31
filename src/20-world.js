/* ================= The wider world: regions joined edge to edge, the chest game, the shooting gallery =================
   Regions carry world = [screen x, screen y]. Walking off the edge of a region (where no screen of its own lies)
   carries you into whichever region covers that spot in the same world (light or shadow), as one continuous land. */
LV.regionAt = function (wpx, wpy, shadow) {
  const T = 16;
  for (const id in LV.MAPS) {
    const d = LV.MAPS[id]; if (!d.world || !!d.shadow !== !!shadow) continue;
    const x0 = d.world[0] * 256, y0 = d.world[1] * 224;
    if (wpx >= x0 && wpy >= y0 && wpx < x0 + d.w * T && wpy < y0 + d.h * T) return d;
  }
  return null;
};
LV.Game.prototype.checkEdges = (function (orig) {
  return function () {
    const h = this.hero, a = this.area, T = LV.TILE, def = this.world.def;
    if (def.world) {
      // at the map's own border the walls of the world stop you a few pixels short, so look a little further in
      let dir = -1;
      const atL = h.x < 8, atR = h.x > this.world.w * T - 8, atT = h.y < 10, atB = h.y > this.world.h * T - 3;
      if (atL && h.dir === 3) dir = 3; else if (atR && h.dir === 1) dir = 1; else if (atT && h.dir === 0) dir = 0; else if (atB && h.dir === 2) dir = 2;
      if (dir >= 0) {
        const d = LV.DIRS[dir], nx = h.x + d.x * 10, ny = h.y + d.y * 12;
        const inside = nx >= 0 && ny - 3 >= 0 && nx < this.world.w * T && ny - 3 < this.world.h * T && !(dir === 0 && atT) && !(dir === 2 && atB) && !(dir === 1 && atR) && !(dir === 3 && atL);
        if (!inside) {
          const wx = def.world[0] * 256 + nx, wy = def.world[1] * 224 + ny + (dir === 0 ? -8 : 0), to = LV.regionAt(wx, wy - 3, def.shadow);
          if (to) {
            const lx = wx - to.world[0] * 256 + d.x * 8, ly = wy - to.world[1] * 224 + d.y * 8, self = this, keepDir = h.dir;
            if (!this.fadeTo) this.fadeTo = function () { self.enter(to.id, lx, ly, keepDir); self.fade = 1; };
            return;
          }
        }
      }
    }
    return orig.call(this);
  };
})(LV.Game.prototype.checkEdges);

/* ---------- Lucky Lids: pay 20, open two of six chests ---------- */
LV.Game.prototype.chestGame = function () {
  const self = this;
  this.ask(['Twenty cash for two lids. Play?'], ['Play', 'No thanks'], function (i) {
    if (i) { self.say(['Your loss. Literally, if you had played.']); return; }
    if (self.save.cash < 20) { self.say(['Twenty cash. You have ' + self.save.cash + '. I can count, friend.']); return; }
    self.save.cash -= 20; self.sfx('cash');
    // prizes shuffled each round; the heart piece is in there until you win it once
    const pool = [1, 5, 5, 10, 20, 50]; if (!self.save.flags.chestShard) pool[0] = 'shard';
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(self.rng() * (k + 1)); const t = pool[k]; pool[k] = pool[j]; pool[j] = t; }
    self.chestPick = { pool: pool, left: 2, opened: [] };
    self.pickChest();
  });
};
LV.Game.prototype.pickChest = function () {
  const self = this, P = this.chestPick;
  const opts = [0, 1, 2, 3, 4, 5].map(function (i) { return P.opened.indexOf(i) >= 0 ? 'Lid ' + (i + 1) + ': opened' : 'Lid ' + (i + 1); });
  this.ask(['Pick a lid. (' + P.left + ' left)'], opts, function (i) {
    if (P.opened.indexOf(i) >= 0) { self.say(['That one is open already. Nice try.'], function () { self.pickChest(); }); return; }
    P.opened.push(i); P.left--; const prize = P.pool[i];
    const next = function () { if (P.left > 0) self.pickChest(); else self.say(['That is your two. Come again!']); };
    if (prize === 'shard') { self.save.flags.chestShard = 1; self.save.shards++; if (self.save.shards % 4 === 0) { self.save.maxHp += 4; self.hero.maxHp = self.save.maxHp; self.hero.hp = self.save.maxHp; } self.sfx('chest'); self.say(['A Heart Shard! Well, that one was not supposed to be in there.'], next); return; }
    self.save.cash = Math.min(999, self.save.cash + prize); self.sfx(prize >= 20 ? 'chest' : 'cash'); self.say([prize + ' cash' + (prize === 1 ? '. Inflation is brutal.' : '!')], next);
  });
};

/* ---------- Shooting gallery: ten cash, ten arrows, twenty seconds. Hit the moving targets. ---------- */
LV.Game.prototype.gallery = function () {
  const self = this;
  if (!this.save.items.bow) { this.say(['You will need a bow for this one, friend.']); return; }
  this.ask(['Ten cash a round. Ready?'], ['Shoot', 'Not now'], function (i) {
    if (i) return;
    if (self.save.cash < 10) { self.say(['Ten cash. Come back richer.']); return; }
    self.save.cash -= 10; self.galleryRun = { t: 20, hits: 0, arrows: self.save.arrows }; self.save.arrows = 10; self.save.equip = 'bow';
    for (let k = 0; k < 4; k++) self.actors.push(LV.makeTarget(3 * 16 + k * 40, 5 * 16 + 4, k));
    self.say(['Go! Stand back from the counter and shoot over it.']);
  });
};
LV.makeTarget = function (x, y, k) {
  const e = new LV.Actor({ x: x, y: y, hp: 1, contact: 0, body: [-5, -6, 10, 6], hurt: [-6, -14, 12, 14], kind: 'target' });
  e.vx = k % 2 ? 50 : -50; e.drop = false; e.invuln = false;
  e.update = function (g, dt) { this.t += dt; this.x += this.vx * dt; if (this.x < 2.5 * 16) this.x = 13.5 * 16; if (this.x > 13.5 * 16) this.x = 2.5 * 16; };
  e.draw = function (ctx, ox, oy) { const X = Math.round(this.x - ox), Y = Math.round(this.y - oy); ctx.drawImage(LV.ball(6, ['#1a1418', '#c83030', '#f0f0f0', '#ffffff']), X - 7, Y - 18); ctx.fillStyle = '#c83030'; ctx.fillRect(X - 1, Y - 13, 3, 3); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(X - 1, Y - 6, 2, 6); };
  return e;
};
(function () {
  const kill = LV.Game.prototype.kill;
  LV.Game.prototype.kill = function (a) {
    if (a.kind === 'target' && this.galleryRun) { this.galleryRun.hits++; this.sfx('cash'); const self = this, x = a.x, y = a.y, k = this.galleryRun.hits; a.dead = true; this.effects.push(new LV.Effect(x, y, 'poof')); setTimeout(function () { if (self.galleryRun) self.actors.push(LV.makeTarget(x, y, k)); }, 0); return; }
    return kill.call(this, a);
  };
  const update = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    update.call(this, dt);
    const R = this.galleryRun; if (!R || this.dialog || this.paused) return;
    R.t -= dt;
    if (R.t <= 0 || (this.save.arrows <= 0 && !this.shots.some(function (s) { return s.kind === 'arrow'; }))) {
      this.actors = this.actors.filter(function (a) { return a.kind !== 'target'; }); this.save.arrows = R.arrows; this.galleryRun = null;
      const s = this.save; let prize = R.hits * 2, extra = '';
      if (R.hits >= 8 && !s.flags.galleryShard) { s.flags.galleryShard = 1; s.shards++; if (s.shards % 4 === 0) { s.maxHp += 4; this.hero.maxHp = s.maxHp; this.hero.hp = s.maxHp; } extra = ' And a Heart Shard for a perfect eye!'; }
      s.cash = Math.min(999, s.cash + prize); this.sfx('chest');
      this.say(['Time! ' + R.hits + ' hits. That earns you ' + prize + ' cash.' + extra]);
    }
  };
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () { render.call(this); if (this.galleryRun && this.mode !== 'title') LV.text(this.ctx, 'TIME ' + Math.ceil(this.galleryRun.t) + '   HITS ' + this.galleryRun.hits, 80, 200, '#f8d040'); };
})();
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s);
    if (s && s.chestgame) e.onTalk = function (g) { g.chestGame(); };
    if (s && s.gallery) e.onTalk = function (g) { g.gallery(); };
    return e;
  };
})(LV.makeVillager);
