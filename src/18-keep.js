/* ================= The Shadow Keep: Sunfire Arrows, Brask's return, Vex's Shadow, the true ending ================= */
// Both Crystals open the Keep gate in the Shadow Grove (a story flag the map variant watches)
LV.Game.prototype.collect = (function (orig) {
  return function (p) {
    orig.call(this, p);
    const s = this.save; if (s.items.crystal_vault && s.items.crystal_quarry) s.flags.crystals = 1;
  };
})(LV.Game.prototype.collect);
LV.Game.prototype.enter = (function (orig) {
  return function (mapId, x, y, dir, first) { const s = this.save; if (s.items.crystal_vault && s.items.crystal_quarry) s.flags.crystals = 1; orig.call(this, mapId, x, y, dir, first); };
})(LV.Game.prototype.enter);

/* ---------- Sunfire Arrows: golden arrows that hit twice as hard; the only thing that wounds Vex's true form ---------- */
LV.Game.prototype.openChest = (function (orig) {
  return function (mapId, key, tx, ty, ch) {
    if (ch.item !== 'sunarrows') return orig.call(this, mapId, key, tx, ty, ch);
    orig.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__s' })); delete this.save.items.__s; this.dialog = null;
    this.save.items.sunarrows = 1; this.save.items.bow = 1; this.save.arrows = Math.max(this.save.arrows, 20); this.save.equip = 'bow';
    this.say(['You got the Sunfire Arrows!', 'Your arrows now burn gold and strike twice as hard.', 'An old rhyme says the dark at the end of the world can only be pierced by sunlight.']);
  };
})(LV.Game.prototype.openChest);
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (hit.kind === 'arrow' && hit.team === 'hero' && game.save.items.sunarrows && !hit.sun) { hit.sun = true; hit.power *= 2; } return ah(game, hit, t); };
  const ad = LV.Arrow.prototype.draw;
  LV.Arrow.prototype.draw = function (ctx, ox, oy) {
    ad.call(this, ctx, ox, oy);
    if (this.team === 'hero' && LV.game && LV.game.save.items.sunarrows) { const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), d = LV.DIRS[this.dir]; ctx.fillStyle = '#f8d040'; ctx.fillRect(X + d.x * 6 - 2, Y + d.y * 6 - 2, 4, 4); ctx.fillStyle = 'rgba(248,208,64,.4)'; ctx.fillRect(X - d.x * 6 - 2, Y - d.y * 6 - 2, 4, 4); }
  };
})();
LV.ITEMS.forEach(function (it) { if (it.id === 'bow') it.name = 'Bow'; });
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) { orig(ctx, id, x, y); if (id === 'bow' && LV.game && LV.game.save.items.sunarrows) { ctx.fillStyle = '#f8d040'; ctx.fillRect(x + 11, y + 1, 3, 3); } };
})(LV.itemIcon);

// Brask, back for more, in shadow-black armour
(function () {
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () { prep(); LV.IMG.soldier_black = LV.recolour(LV.IMG.hero, { '#432e27': '#2a2a34', '#6a4834': '#5a5a6a', '#c43c3c': '#3a2a4a', '#882e2e': '#2a1a3a', '#681c1c': '#1a0e26', '#65659b': '#1a1a24' }); };
})();
LV.ENEMIES.brask2 = function (x, y) {
  const e = LV.brutelike('soldier_black', 16, 'Captain Brask')(x, y); e.said = false;
  const upd = e.update; e.update = function (g, dt) {
    if (!this.said && g.area === g.world.areaAt(this.x, this.y - 8) && !g.scroll) { this.said = true; g.say(['BRASK: You again! The Chancellor gave me a second chance.', 'BRASK: And a much bigger helmet.']); }
    upd.call(this, g, dt);
  };
  return e;
};

/* ---------- Vex's Shadow ----------
   Phase one: the Chancellor as you know him, darker, faster. Return his orbs.
   Phase two: he sheds the disguise. A great shade circles the room hurling fire;
   only Sunfire Arrows stagger it, and a staggered shade can be cut. */
LV.ENEMIES.shadowvex = function (x, y) {
  const e = LV.ENEMIES.vex(x, y); e.hp = 6; e.shadowForm = true; e.name = "Vex's Shadow";
  const upd = e.update;
  e.update = function (g, dt) {
    if (this.state === 'intro' && !this.said) {
      const ar = g.world.areaAt(this.x, this.y - 8); if (g.area !== ar || g.scroll) { this.st = 0; return; }
      this.said = true; g.say(['VEX: You followed me into the glass? Into MY Varrowmere?', 'VEX: Here, I am not a Chancellor. Here, I am what the Chancellor was hiding.']);
    }
    upd.call(this, g, dt);
  };
  const draw = e.draw;
  e.draw = function (ctx, ox, oy) { ctx.globalAlpha = 0.85; draw.call(this, ctx, ox, oy); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(122,58,208,.35)'; ctx.fillRect(Math.round(this.x - ox) - 9, Math.round(this.y - oy) - 30, 18, 30); };
  return e;
};
LV.ENEMIES.shade = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 10, contact: 4, body: [-12, -8, 24, 8], hurt: [-14, -30, 28, 30], kind: 'shade' });
  e.boss = true; e.heavy = true; e.drop = false; e.name = 'the Shade of Vex'; e.ang = 0; e.st = 0; e.stagger = 0; e.cx = x; e.cy = y;
  e.update = function (g, dt) {
    this.t += dt; this.st += dt; if (this.inv > 0) this.inv -= dt; this.stun = 0;
    if (this.stagger > 0) { this.stagger -= dt; return; }
    const a = g.area, cx = (a[0] + 8) * 16, cy = (a[1] + 8) * 16;
    this.ang += dt * (0.9 + (10 - this.hp) * 0.08);
    this.x = cx + Math.cos(this.ang) * 70; this.y = cy + Math.sin(this.ang) * 40;
    if (this.st > 1.5) {
      this.st = 0; const h = g.hero;
      for (let k = -2; k <= 2; k++) { const f = new LV.Fireball(this.x, this.y - 16, 0, 'enemy'), ang = Math.atan2(h.y - 8 - (this.y - 16), h.x - this.x) + k * 0.28; f.vx = Math.cos(ang) * 110; f.vy = Math.sin(ang) * 110; g.shots.push(f); }
      g.sfx('throw');
    }
  };
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), w = Math.sin(this.t * 4) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X - 14, Y - 3, 28, 4);
    ctx.drawImage(LV.ball(14, this.stagger > 0 ? ['#0a0610', '#5a5a6a', '#9a9aa8', '#ffffff'] : ['#0a0610', '#2a0e40', '#5a2a8a', '#9a5ad0']), X - 15, Y - 40 + Math.round(w));
    for (let k = 0; k < 5; k++) { ctx.fillStyle = '#2a0e40'; ctx.fillRect(X - 13 + k * 6, Y - 14 + Math.round(Math.sin(this.t * 6 + k) * 2), 4, 10); }
    ctx.fillStyle = this.stagger > 0 ? '#ffffff' : '#f8d040'; ctx.fillRect(X - 7, Y - 30 + Math.round(w), 4, 3); ctx.fillRect(X + 3, Y - 30 + Math.round(w), 4, 3);
    ctx.fillStyle = '#e0b030'; ctx.fillRect(X - 6, Y - 44 + Math.round(w), 12, 3); ctx.fillRect(X - 6, Y - 47 + Math.round(w), 2, 3); ctx.fillRect(X - 1, Y - 48 + Math.round(w), 2, 4); ctx.fillRect(X + 4, Y - 47 + Math.round(w), 2, 3);
    if (this.stagger > 0) { ctx.fillStyle = '#f8d040'; const a = this.t * 8; ctx.fillRect(X + Math.cos(a) * 12, Y - 50, 2, 2); ctx.fillRect(X - Math.cos(a) * 12, Y - 50, 2, 2); }
  };
  return e;
};
(function () {
  // the Shade: Sunfire Arrows stagger it (and wound it); while staggered the blade bites
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.kind !== 'shade' || hit.team !== 'hero') return ah(game, hit, t);
    if (hit.kind === 'arrow' && game.save.items.sunarrows) { const r = ah(game, hit, t); if (!t.dead) { t.stagger = 2.2; t.inv = 0; } return r; }
    if (t.stagger > 0 && (hit.kind === 'blade' || hit.kind === 'spin' || hit.kind === 'beam')) return ah(game, hit, t);
    if (!hit.done.has(t)) { hit.done.add(t); game.sfx('clink'); } return 'immune';
  };
  const kill = LV.Game.prototype.kill;
  LV.Game.prototype.kill = function (a) {
    if (a.kind === 'vex' && a.shadowForm) {
      a.dead = true; this.effects.push(new LV.Effect(a.x, a.y, 'poof')); this.sfx('kill'); this.shots = []; this.shake = 1;
      const self = this, x = a.x, y = a.y;
      this.say(['VEX: Ha... ha... You think THAT was me?', 'The Chancellor\'s robes fall empty. Something vast and dark pours out of them.'], function () { self.actors.push(LV.ENEMIES.shade(x, y)); });
      return;
    }
    if (a.kind === 'shade') {
      a.dead = true; this.effects.push(new LV.Effect(a.x, a.y, 'poof')); this.sfx('kill'); this.shots = []; this.shake = 1.5;
      this.save.flags.won = 1; this.save.wins = (this.save.wins || 0) + 1; this.store.set(this.save); const self = this;
      this.say(['The Shade shrieks as the sunlight burns through it...', 'VEX: The paperwork... was never... finished...', 'The Twin Mirror cracks from edge to edge. The shadow realm folds away like a letter.', 'Wren wakes in the Dawn Grove. The sun is up. Somewhere, a market is open.'], function () { self.startEnding(); });
      return;
    }
    return kill.call(this, a);
  };
})();

/* ---------- balance: the shadow world hits harder; the Shadow Mail (hidden in a grotto there) halves damage ---------- */
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.isHero && hit.team === 'enemy' && game.world && game.world.def.shadow && !hit.scaled) { hit.scaled = true; hit.power = Math.ceil(hit.power * 1.5); }
    return ah(game, hit, t);
  };
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { enter.call(this, mapId, x, y, dir, first); this.hero.armourLv = this.save.items.mail ? 1 : 0; };
})();
LV.Game.prototype.openChest = (function (orig) {
  return function (mapId, key, tx, ty, ch) {
    if (ch.item !== 'mail') return orig.call(this, mapId, key, tx, ty, ch);
    orig.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__m' })); delete this.save.items.__m; this.dialog = null;
    this.save.items.mail = 1; this.hero.armourLv = 1; this.say(['You got the Shadow Mail!', 'Dark chainmail, light as a shirt. You take half damage from now on.', 'Previous owner: "lost in a duel over a parking space."']);
  };
})(LV.Game.prototype.openChest);
