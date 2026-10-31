/* ================= The rest of the gear: energy, Kazoo and the bird, Sledgehammer and pegs, Frost Rod, the three
   Medals, Invisibility Cloak, Riot Shield, Brick Wand, Boxing Gloves and dark boulders, Bug Net and fairies,
   mail upgrades, wishing wells (bomb and quiver upgrades), the Golden Blade ================= */
LV.C.PEG = 24; LV.C.DARKROCK = 25;
(function () {
  const blocks = LV.World.prototype.blocks;
  LV.World.prototype.blocks = function (code, mode) { return code === LV.C.PEG || code === LV.C.DARKROCK ? true : blocks.call(this, code, mode); };
})();
// energy: 0..1. Rods, wands, medals and the cloak use it; jars refill it
LV.energy = function (g) { const s = g.save; if (s.energy === undefined) s.energy = 1; return s.energy; };
LV.spend = function (g, amt) {
  const s = g.save; if (LV.energy(g) < amt - 1e-6) { g.sfx('clink'); if (!g.saidEnergy) { g.saidEnergy = true; g.say(['Not enough energy. Energy jars drop from enemies, and Green Potions refill it.']); } return false; }
  s.energy = Math.max(0, s.energy - amt * (s.items.halfEnergy ? 0.5 : 1)); return true;
};
LV.ITEMS.push(
  { id: 'kazoo', name: 'Kazoo', need: function (s) { return s.items.kazoo; } },
  { id: 'hammer', name: 'Sledgehammer', need: function (s) { return s.items.hammer; } },
  { id: 'frost', name: 'Frost Rod', need: function (s) { return s.items.frost; } },
  { id: 'quake', name: 'Quake Medal', need: function (s) { return s.items.quake; } },
  { id: 'flame', name: 'Flame Medal', need: function (s) { return s.items.flame; } },
  { id: 'storm', name: 'Storm Medal', need: function (s) { return s.items.storm; } },
  { id: 'cloak', name: 'Invisibility Cloak', need: function (s) { return s.items.cloak; } },
  { id: 'riot', name: 'Riot Shield', need: function (s) { return s.items.riot; } },
  { id: 'wand', name: 'Brick Wand', need: function (s) { return s.items.wand; } },
  { id: 'net', name: 'Bug Net', need: function (s) { return s.items.net; } }
);
LV.ICONS = {
  kazoo: [['#171717', 3, 6, 11, 5], ['#e0b030', 4, 7, 9, 3], ['#f0e0a0', 5, 7, 2, 1], ['#171717', 11, 4, 3, 3]],
  hammer: [['#5a3a1a', 7, 6, 2, 9], ['#171717', 3, 2, 10, 5], ['#9a9aa8', 4, 3, 8, 3], ['#d0d0dc', 4, 3, 8, 1]],
  frost: [['#5a3a1a', 3, 9, 2, 6], ['#5a3a1a', 5, 7, 2, 3], ['#2a8ae0', 9, 1, 5, 5], ['#c8f0ff', 10, 2, 2, 2]],
  quake: [['#171717', 3, 3, 10, 10], ['#c89040', 4, 4, 8, 8], ['#5a3a1a', 7, 4, 1, 8], ['#5a3a1a', 4, 7, 8, 1]],
  flame: [['#171717', 3, 3, 10, 10], ['#c89040', 4, 4, 8, 8], ['#e84a10', 6, 5, 4, 6], ['#f8d040', 7, 7, 2, 3]],
  storm: [['#171717', 3, 3, 10, 10], ['#c89040', 4, 4, 8, 8], ['#3a8ae8', 5, 5, 6, 3], ['#f0f0f0', 7, 8, 2, 3]],
  cloak: [['#171717', 4, 2, 8, 12], ['#3a2a6a', 5, 3, 6, 10], ['#6a5aa0', 5, 3, 2, 10]],
  riot: [['#171717', 3, 2, 10, 12], ['#3a5ab8', 4, 3, 8, 10], ['#c8d8f0', 5, 4, 6, 2], ['#e0b030', 7, 8, 2, 4]],
  wand: [['#5a3a1a', 4, 7, 2, 8], ['#171717', 7, 1, 7, 7], ['#c83030', 8, 2, 5, 5], ['#f08070', 8, 2, 2, 2]],
  net: [['#5a3a1a', 3, 8, 2, 7], ['#171717', 6, 1, 8, 8], ['#e8e8f0', 7, 2, 6, 6], ['#9a9aa8', 9, 2, 1, 6], ['#9a9aa8', 7, 5, 6, 1]]
};
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) { const ic = LV.ICONS[id]; if (!ic) return orig(ctx, id, x, y); ic.forEach(function (r) { ctx.fillStyle = r[0]; ctx.fillRect(x + r[1], y + r[2], r[3], r[4]); }); };
})(LV.itemIcon);

/* ---------- energy jars from enemies ---------- */
LV.Game.prototype.dropLoot = (function (orig) {
  return function (x, y, chance) {
    if (LV.energy(this) < 1 && this.save.items.rod && this.rng() < chance * 0.35) { this.pickups.push(new LV.Pickup(x, y, 'jar')); return; }
    return orig.call(this, x, y, chance);
  };
})(LV.Game.prototype.dropLoot);
LV.Game.prototype.collect = (function (orig) {
  return function (p) {
    if (p.kind === 'jar') { p.dead = true; this.save.energy = Math.min(1, LV.energy(this) + 0.25); this.sfx('heart'); return; }
    if (p.kind === 'fairy') { p.dead = true; this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 28); this.sfx('heart'); return; }
    return orig.call(this, p);
  };
})(LV.Game.prototype.collect);
LV.Pickup.prototype.draw = (function (orig) {
  return function (ctx, ox, oy) {
    if (this.kind !== 'jar') return orig.call(this, ctx, ox, oy);
    if (this.t > this.life - 2 && Math.floor(this.t * 10) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
    ctx.fillStyle = '#171717'; ctx.fillRect(X - 4, Y - 12, 8, 10); ctx.fillStyle = '#3cbe50'; ctx.fillRect(X - 3, Y - 9, 6, 6); ctx.fillStyle = '#c8e0f0'; ctx.fillRect(X - 2, Y - 11, 4, 2);
  };
})(LV.Pickup.prototype.draw);
// the Ember Rod now costs a little energy
LV.ROD_COST = { rod: 1 / 16, frost: 1 / 16, wand: 1 / 10, quake: 1 / 2, flame: 1 / 2, storm: 1 / 2 };

/* ---------- using the new items ---------- */
(function () {
  const use = LV.Game.prototype.useItem;
  LV.Game.prototype.useItem = function (h) {
    const id = this.save.equip, d = LV.DIRS[h.dir], self = this;
    if (id === 'rod') { if (!LV.spend(this, LV.ROD_COST.rod)) return; return use.call(this, h); }
    if (id === 'kazoo') { this.playKazoo(); return; }
    if (id === 'hammer') { this.swingHammer(h); return; }
    if (id === 'frost') {
      if (this.shots.some(function (s) { return s.kind === 'frostball'; }) || !LV.spend(this, LV.ROD_COST.frost)) return;
      const f = new LV.Fireball(h.x + d.x * 8, h.y - 8 + d.y * 8, h.dir, 'hero'); f.kind = 'frostball'; f.frost = true; this.shots.push(f); this.sfx('throw'); h.state = 'item'; h.st = 0; return;
    }
    if (id === 'quake' || id === 'flame' || id === 'storm') { if (this.world.indoor && this.world.def.boss && this.actors.some(function (a) { return a.boss; }) && id !== 'flame') { /* medals work on bosses too */ } if (!LV.spend(this, LV.ROD_COST[id])) return; this.medal(id); return; }
    if (id === 'cloak') { if (this.cloak) { this.cloak = false; this.sfx('door'); } else if (LV.energy(this) > 0.02) { this.cloak = true; this.sfx('spin'); } return; }
    if (id === 'riot') { if (this.riot) { this.riot = null; } else if (LV.energy(this) > 0.02) { this.riot = { t: 0 }; this.sfx('spin'); } return; }
    if (id === 'wand') {
      const tx = Math.floor((h.x + d.x * 16) / 16), ty = Math.floor((h.y - 4 + d.y * 16) / 16), w = this.world;
      if (this.brick) { w.setC(this.brick.x, this.brick.y, this.brick.was); this.brick = null; this.sfx('door'); return; }
      const c = w.c(tx, ty); if ((c !== LV.C.OPEN && c !== LV.C.PLATE) || !LV.spend(this, LV.ROD_COST.wand)) { this.sfx('clink'); return; }
      this.brick = { x: tx, y: ty, was: c }; w.setC(tx, ty, LV.C.BLOCK); this.sfx('lift'); this.checkTriggers(); h.state = 'item'; h.st = 0; return;
    }
    if (id === 'net') { this.swingNet(h); return; }
    return use.call(this, h);
  };
  // the frost ball freezes enemies solid (frozen enemies shatter when hit) and doesn't burn things
  const fu = LV.Fireball.prototype.update;
  LV.Fireball.prototype.update = function (g, dt) {
    if (!this.frost) return fu.call(this, g, dt);
    this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt;
    const b = { x: this.x - 4, y: this.y - 4, w: 8, h: 8 };
    for (const a of g.actors) if (!a.dead && !a.npc && !a.boss && !a.invuln && LV.overlap(b, a.hurtBox())) { a.frozen = 4; a.stun = 4; g.sfx('clink'); this.pop(g); return; }
    for (const a of g.actors) if (!a.dead && a.boss && LV.overlap(b, a.hurtBox())) { LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'frost', power: 2, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b, done: this.done }), a); this.pop(g); return; }
    if (g.world.boxBlocked({ x: this.x - 2, y: this.y + 4, w: 4, h: 4 }, 'shot') || this.t > 1.6) this.pop(g);
  };
  const fd = LV.Fireball.prototype.draw;
  LV.Fireball.prototype.draw = function (ctx, ox, oy) {
    if (!this.frost) return fd.call(this, ctx, ox, oy);
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy); ctx.fillStyle = '#1a3a5a'; ctx.fillRect(X - 4, Y - 4, 8, 8); ctx.fillStyle = '#7ad0f0'; ctx.fillRect(X - 3, Y - 3, 6, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 1, Y - 2, 2, 2);
  };
  // a frozen enemy shatters into a sparkle (and drops an energy jar) when struck
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.frozen > 0 && hit.team === 'hero' && !t.boss) { t.frozen = 0; t.hp = 0; game.kill(t); if (game.rng() < 0.5) game.pickups.push(new LV.Pickup(t.x, t.y, 'jar')); return 'hit'; }
    // while cloaked or behind the Riot Shield the hero can't be touched
    if (t.isHero && (game.cloak || game.riot) && hit.team === 'enemy') return null;
    return ah(game, hit, t);
  };
  const upd = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    upd.call(this, dt);
    if (this.mode === 'title' || this.paused || this.dialog) return;
    for (const a of this.actors) if (a.frozen > 0) { a.frozen -= dt; a.stun = Math.max(a.stun || 0, a.frozen); }
    if (this.cloak) { this.save.energy = Math.max(0, LV.energy(this) - dt / 16 * (this.save.items.halfEnergy ? 0.5 : 1)); if (this.save.energy <= 0) this.cloak = false; }
    if (this.riot) {
      this.riot.t += dt; this.save.energy = Math.max(0, LV.energy(this) - dt / 12 * (this.save.items.halfEnergy ? 0.5 : 1)); if (this.save.energy <= 0) this.riot = null;
      else { const h = this.hero; for (let k = 0; k < 3; k++) { const a = this.riot.t * 5 + k * 2.09, b = { x: h.x + Math.cos(a) * 18 - 4, y: h.y - 10 + Math.sin(a) * 18 - 4, w: 8, h: 8 }; this.resolveHit(new LV.Hit({ team: 'hero', kind: 'blade', power: 2, from: { x: h.x, y: h.y - 8 }, box: b, done: new Set() }), true, true); } }
    }
    if (this.brick && this.world.c(this.brick.x, this.brick.y) !== LV.C.BLOCK) this.brick = null;
  };
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { this.brick = null; enter.call(this, mapId, x, y, dir, first); this.hero.armourLv = this.save.items.redmail ? 3 : this.save.items.bluemail ? 2 : this.save.items.mail ? 1 : 0; this.hero.blade = 1 + (this.save.items.dawnblade ? 1 : 0) + (this.save.items.tempered ? 1 : 0) + (this.save.items.golden ? 1 : 0); };
  const start = LV.Hero.prototype.startAttack;
  LV.Hero.prototype.startAttack = function (g) { start.call(this, g); if (g.save.items.golden) this.blade += 1; };
  LV.Hero.prototype.armour = function () { return [1, 0.75, 0.5, 0.25][this.armourLv || 0]; };
  // draw the cloak and the shield ring
  const hd = LV.Hero.prototype.draw;
  LV.Hero.prototype.draw = function (ctx, ox, oy) {
    const g = LV.game;
    if (g && g.cloak) { ctx.globalAlpha = 0.3; hd.call(this, ctx, ox, oy); ctx.globalAlpha = 1; } else hd.call(this, ctx, ox, oy);
    if (g && g.riot) for (let k = 0; k < 3; k++) { const a = g.riot.t * 5 + k * 2.09; ctx.drawImage(LV.ball(4, ['#171717', '#3a5ab8', '#7aa0f0', '#ffffff']), Math.round(this.x - ox + Math.cos(a) * 18) - 5, Math.round(this.y - oy - 10 + Math.sin(a) * 18) - 5); }
  };
  // enemies can't find a cloaked hero: they lose interest
  const kill = LV.Game.prototype.kill; void kill;
})();
// frozen enemies are drawn in ice
(function () {
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () {
    render.call(this);
    if (this.mode === 'title' || this.mode === 'ending') return;
    const ctx = this.ctx, ox = Math.round(this.cam.x), oy = Math.round(this.cam.y);
    for (const a of this.actors) if (a.frozen > 0) { const im = LV.IMG.fx_ice, X = Math.round(a.x - ox), Y = Math.round(a.y - oy); if (im) { ctx.globalAlpha = 0.85; ctx.drawImage(im, 5 * 32, 0, 32, 32, X - 14, Y - 26, 28, 28); ctx.globalAlpha = 1; } }
    if (this.medalFx > 0) { ctx.fillStyle = this.medalFx > 0.3 ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,' + this.medalFx + ')'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H); }
  };
})();

/* ---------- Medals: hit every enemy on the screen ---------- */
LV.Game.prototype.medal = function (id) {
  const a = this.area, T = 16, self = this, power = id === 'flame' ? 6 : 4;
  this.shake = id === 'quake' ? 1 : 0.5; this.medalFx = 0.6; this.sfx(id === 'storm' ? 'spin' : 'kill');
  this.actors.slice().forEach(function (e) {
    if (e.dead || e.npc || e.invuln) return;
    if (e.x < a[0] * T || e.x > (a[0] + a[2]) * T || e.y < a[1] * T || e.y > (a[1] + a[3]) * T) return;
    if (id === 'storm') { e.frozen = 5; e.stun = 5; return; }
    e.inv = 0; LV.applyHit(self, new LV.Hit({ team: 'hero', kind: 'medal', power: power, from: { x: self.hero.x, y: self.hero.y }, box: { x: 0, y: 0, w: 1, h: 1 } }), e);
  });
  // the Quake Medal also cracks every cracked wall on screen
  if (id === 'quake') for (let ty = a[1]; ty < a[1] + a[3]; ty++) for (let tx = a[0]; tx < a[0] + a[2]; tx++) if (this.world.c(tx, ty) === LV.C.CRACK) { this.world.setC(tx, ty, LV.C.OPEN); this.world.layers.deco[ty * this.world.w + tx] = -1; }
};
(function () { const upd = LV.Game.prototype.update; LV.Game.prototype.update = function (dt) { upd.call(this, dt); if (this.medalFx > 0) this.medalFx -= dt; }; })();

/* ---------- Sledgehammer: pounds pegs flat, hits hard ---------- */
LV.Game.prototype.swingHammer = function (h) {
  const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), w = this.world;
  h.state = 'item'; h.st = 0; this.shake = 0.15;
  if (w.c(tx, ty) === LV.C.PEG) { w.setC(tx, ty, LV.C.OPEN); this.save.flags['peg:' + w.id + ':' + tx + ',' + ty] = 1; this.sfx('kill'); return; }
  this.sfx('clink');
  this.resolveHit(new LV.Hit({ team: 'hero', kind: 'hammer', power: 4, from: { x: h.x, y: h.y - 8 }, box: { x: h.x + d.x * 12 - 7, y: h.y - 15 + d.y * 12, w: 14, h: 14 }, done: new Set() }), true, true);
};
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const w = this.world, f = this.save.flags;
    Object.keys(f).forEach(function (k) { if (k.indexOf('peg:' + mapId + ':') === 0) { const xy = k.split(':')[2].split(','); w.setC(+xy[0], +xy[1], LV.C.OPEN); } });
  };
})();
// pegs and dark boulders are drawn from the collision grid
LV.drawSpecialTiles = (function (orig) {
  return function (ctx, g, ox, oy) {
    orig(ctx, g, ox, oy);
    const w = g.world, x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = w.c(tx, ty), X = tx * 16 - ox, Y = ty * 16 - oy;
      if (c === LV.C.PEG) { ctx.fillStyle = '#171717'; ctx.fillRect(X + 3, Y + 2, 10, 13); ctx.fillStyle = '#8a6a40'; ctx.fillRect(X + 4, Y + 3, 8, 11); ctx.fillStyle = '#c89a5a'; ctx.fillRect(X + 4, Y + 3, 8, 3); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(X + 4, Y + 12, 8, 2); }
      if (c === LV.C.DARKROCK) { ctx.save(); ctx.filter = 'brightness(0.55) saturate(0.6)'; ctx.drawImage(LV.IMG.cave, 5 * 16, 4 * 16, 16, 16, X, Y, 16, 16); ctx.restore(); }
    }
  };
})(LV.drawSpecialTiles);

/* ---------- Boxing Gloves: lift the dark boulders too ---------- */
(function () {
  const interact = LV.Game.prototype.interact;
  LV.Game.prototype.interact = function (h) {
    const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), w = this.world;
    if (w.c(tx, ty) === LV.C.DARKROCK) {
      if (!this.save.items.gloves) { this.say(['This dark boulder will not budge. You would need something stronger than the Power Glove.']); return true; }
      w.setC(tx, ty, LV.C.OPEN); h.state = 'carry'; h.carry = 'rock'; this.sfx('lift'); return true;
    }
    return interact.call(this, h);
  };
})();

/* ---------- Kazoo: wake the bird on Eagle Crag, then call it to fly to any region you've visited ---------- */
LV.Game.prototype.playKazoo = function () {
  const self = this, s = this.save; this.sfx('cursor');
  if (this.world.indoor || this.world.def.shadow) { this.say(['Bzzzt. Nothing answers. The bird only hears the kazoo under the open sky of Varrowmere.']); return; }
  if (!s.flags.bird) {
    if (this.world.id === 'frostspire' && Math.abs(this.hero.x - 39 * 16) < 64 && this.hero.y < 10 * 16) { s.flags.bird = 1; this.say(['You play a wobbly tune on the kazoo...', 'A great bird swoops down onto the crag! It looks at you like you owe it money.', 'From now on, play the kazoo outdoors and the bird will carry you to any place you have been.']); return; }
    this.say(['Bzzzt. A sad, honking note. Nothing happens. Maybe somewhere high up...']); return;
  }
  const places = (s.visited || []).filter(function (id) { return LV.MAPS[id] && LV.MAPS[id].world && !LV.MAPS[id].shadow; });
  if (!places.length) return;
  const list = places.slice(0, 7);
  this.ask(['Where to?'], list.map(function (id) { return LV.MAPS[id].name; }).concat(['Stay here']), function (i) {
    const id = list[i]; if (!id) return; const e = LV.MAPS[id].entry;
    self.fadeTo = function () { self.enter(id, e[0] * 16 + 8, e[1] * 16 + 12, 2); self.fade = 1; };
  });
};
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const s = this.save, d = LV.MAPS[mapId]; s.visited = s.visited || [];
    if (d.world && !d.shadow) { const i = s.visited.indexOf(mapId); if (i >= 0) s.visited.splice(i, 1); s.visited.unshift(mapId); }
  };
})();

/* ---------- Bug Net and fairies ---------- */
LV.Game.prototype.swingNet = function (h) {
  const d = LV.DIRS[h.dir], box = { x: h.x + d.x * 14 - 8, y: h.y - 16 + d.y * 14, w: 16, h: 16 }, s = this.save;
  h.state = 'item'; h.st = 0; this.sfx('swing');
  for (const a of this.actors) if (a.kind === 'fairy' && !a.dead && LV.overlap(box, a.hurtBox())) {
    const i = (s.bottles || []).indexOf('empty');
    if (i < 0) { this.say(['You catch the fairy, but you have no empty bottle. It heals you and flies off.']); this.hero.hp = this.hero.maxHp; a.dead = true; return; }
    s.bottles[i] = 'fairy'; a.dead = true; this.sfx('chest'); this.say(['You caught a fairy in a bottle! It will revive you if you fall.']); return;
  }
};
LV.ENEMIES.fairy = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 99, contact: 0, body: [-3, -3, 6, 3], hurt: [-5, -12, 10, 10], kind: 'fairy' });
  e.invuln = true; e.cx = x; e.cy = y; e.ph = x % 5;
  e.update = function (g, dt) {
    this.t += dt; this.x = this.cx + Math.cos(this.t * 1.3 + this.ph) * 20; this.y = this.cy + Math.sin(this.t * 1.9 + this.ph) * 12;
    // touching a fairy heals you (as in the original) unless you catch it
    if (LV.overlap(this.hurtBox(), g.hero.hurtBox()) && g.hero.hp < g.hero.maxHp && !g.save.items.net) { g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + 28); g.sfx('heart'); this.dead = true; }
  };
  e.draw = function (ctx, ox, oy) {
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy - 10 + Math.sin(this.t * 8) * 2), f = Math.floor(this.t * 16) % 2;
    ctx.fillStyle = 'rgba(255,200,255,.6)'; ctx.fillRect(X - 5, Y - 3 - f, 4, 4); ctx.fillRect(X + 1, Y - 3 - f, 4, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 1, Y - 2, 3, 5); ctx.fillStyle = '#f8b0f0'; ctx.fillRect(X - 1, Y - 4, 3, 2);
  };
  return e;
};

/* ---------- wishing wells: throw in 100 cash for a bigger bomb bag or quiver ---------- */
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s);
    if (s && s.well) e.onTalk = function (g) {
      const S = g.save;
      g.ask(['Throw 100 cash into the well?'], ['Bigger bomb bag', 'Bigger quiver', 'Keep my cash'], function (i) {
        if (i === 2) return;
        if (S.cash < 100) { g.say(['The well gurgles. It wants 100.']); return; }
        const k = i === 0 ? 'bombUp' : 'arrowUp'; if ((S[k] || 0) >= 4) { g.say(['The well says: you are big enough. It is very wise for a well.']); return; }
        S.cash -= 100; S[k] = (S[k] || 0) + 1; g.sfx('chest'); g.say([i === 0 ? 'Your bomb bag now holds ' + LV.capB(S) + '!' : 'Your quiver now holds ' + LV.capA(S) + '!']);
      });
    };
    if (s && s.gives) e.onTalk = function (g) {
      const it = s.gives; if (g.save.items[it] || (s.need && !LV.flagTrue(g, s.need))) return;
      g.save.items[it] = 1; g.sfx('chest'); g.say(s.got || ['You got the ' + it + '!']);
    };
    return e;
  };
})(LV.makeVillager);
// fairies spawn from spawn lists like any actor
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { enter.call(this, mapId, x, y, dir, first); };
})();

/* ---------- chests for the new items ---------- */
LV.GEAR_TEXT = {
  hammer: ['You got the Sledgehammer!', 'Pound wooden pegs flat and give enemies a proper thump. Popular with home improvers and debt collectors alike.'],
  frost: ['You got the Frost Rod!', 'It freezes enemies solid. Strike a frozen enemy to shatter it. Uses a little energy.'],
  quake: ['You got the Quake Medal!', 'Use it to shake the whole screen: every enemy is hurt and cracked walls crumble. Uses half your energy.'],
  flame: ['You got the Flame Medal!', 'A ring of fire scorches every enemy on screen. Uses half your energy.'],
  storm: ['You got the Storm Medal!', 'A freezing gale turns every enemy on screen to ice. Uses half your energy.'],
  cloak: ['You got the Invisibility Cloak!', 'While you wear it nothing can touch you. It drains energy as long as it is on.'],
  riot: ['You got the Riot Shield!', 'Three spinning shields guard you and hurt anything they hit. Drains energy while it is up.'],
  wand: ['You got the Brick Wand!', 'Conjure a block in front of you (and make it vanish again). Blocks hold down switches.'],
  gloves: ['You got the Boxing Gloves!', 'Now you can lift even the dark boulders. Float like a butterfly, lift like a crane.'],
  net: ['You got the Bug Net!', 'Catch fairies (and bugs) in empty bottles.'],
  bluemail: ['You got the Blue Mail!', 'You take half damage.'],
  redmail: ['You got the Red Mail!', 'You take a quarter damage. Fashionable, too.'],
  golden: ['You got the Golden Blade!', 'The finest sword in Varrowmere. Your strikes are stronger than ever.'],
  kazoo: ['You got the Kazoo!', 'Play it high on Frostspire to call the great bird.'],
  halfEnergy: ['Your energy use is halved!', 'Rods, wands, medals and the cloak cost half as much.'],
  bottle: ['You got an Empty Bottle!']
};
LV.Game.prototype.openChest = (function (orig) {
  return function (mapId, key, tx, ty, ch) {
    const it = ch.item, txt = LV.GEAR_TEXT[it];
    if (!txt) return orig.call(this, mapId, key, tx, ty, ch);
    if (key.indexOf('dig:') < 0) { orig.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__g' })); delete this.save.items.__g; this.dialog = null; }
    if (it === 'bottle') { this.save.bottles = this.save.bottles || []; this.save.bottles.push('empty'); }
    else this.save.items[it] = 1;
    if (LV.ITEMS.some(function (x) { return x.id === it; })) this.save.equip = it;
    if (it === 'bluemail' || it === 'redmail') this.hero.armourLv = it === 'redmail' ? 3 : 2;
    this.sfx('chest'); this.say(txt);
  };
})(LV.Game.prototype.openChest);

/* ---------- bonk a marked gravestone with the Running Shoes: it slides aside onto steps below ---------- */
LV.Game.prototype.onBonk = (function (orig) {
  return function (h) {
    orig.call(this, h);
    const w = this.world, B = w.def.bonk; if (!B) return;
    const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), k = tx + ',' + ty;
    if (!B[k] || this.save.flags['bonk:' + w.id + ':' + k]) return;
    this.save.flags['bonk:' + w.id + ':' + k] = 1; LV.openBonk(w, k, B[k]); this.sfx('chest'); this.say(['The gravestone grinds aside... there are steps going down!']);
  };
})(LV.Game.prototype.onBonk);
LV.openBonk = function (w, k, to) {
  const xy = k.split(',').map(Number); w.setC(xy[0], xy[1], LV.C.OPEN); w.layers.deco[xy[1] * w.w + xy[0]] = (2 << 16) | (1 << 8) | 1;
  w.warps = w.warps.concat([{ x: xy[0], y: xy[1], to: to[0], tx: to[1], ty: to[2], dir: 0 }]);
};
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const w = this.world, B = w.def.bonk || {}, self = this;
    Object.keys(B).forEach(function (k) { if (self.save.flags['bonk:' + mapId + ':' + k]) LV.openBonk(w, k, B[k]); });
  };
})();
// reading old script with the Book
LV.Game.prototype.interact = (function (orig) {
  return function (h) {
    const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), k = tx + ',' + ty, O = this.world.def.oldscript;
    if (O && O[k] && this.save.items.book) { this.say(['You open the Book of Old Script and work out the carving:', O[k]]); return true; }
    return orig.call(this, h);
  };
})(LV.Game.prototype.interact);
