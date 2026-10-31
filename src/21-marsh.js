/* ================= Shovel and digging, bottles and potions, the dig field ================= */
LV.ITEMS.push({ id: 'shovel', name: 'Shovel', need: function (s) { return s.items.shovel; } });
LV.ITEMS.push({ id: 'bottle', name: 'Bottle', need: function (s) { return (s.bottles || []).length > 0; } });
LV.BOTTLE_NAMES = { empty: 'Empty Bottle', red: 'Red Potion', green: 'Green Potion', fairy: 'Fairy in a Bottle' };
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) {
    if (id === 'shovel') { ctx.fillStyle = '#5a3a1a'; for (let i = 0; i < 9; i++) ctx.fillRect(x + 4 + i, y + 2 + i, 2, 2); ctx.fillStyle = '#b8b8c8'; ctx.fillRect(x + 10, y + 9, 5, 5); ctx.fillStyle = '#e0e0ec'; ctx.fillRect(x + 11, y + 10, 2, 2); return; }
    if (id === 'bottle') {
      const b = (LV.game && LV.game.save.bottles || [])[0] || 'empty', fill = { red: '#e83040', green: '#40c050', fairy: '#f8b0f0' }[b];
      ctx.fillStyle = '#171717'; ctx.fillRect(x + 5, y + 2, 6, 3); ctx.fillRect(x + 3, y + 5, 10, 10); ctx.fillStyle = '#c8e0f0'; ctx.fillRect(x + 6, y + 3, 4, 2); ctx.fillRect(x + 4, y + 6, 8, 8);
      if (fill) { ctx.fillStyle = fill; ctx.fillRect(x + 4, y + 9, 8, 5); }
      return;
    }
    return orig(ctx, id, x, y);
  };
})(LV.itemIcon);

/* ---------- digging: soft ground anywhere outdoors; buried treasure at marked spots ---------- */
LV.Game.prototype.dig = function (h) {
  const w = this.world, d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), key = tx + ',' + ty;
  h.state = 'item'; h.st = 0;
  if (w.indoor || w.c(tx, ty) !== LV.C.OPEN) { this.sfx('clink'); return; }
  const dug = this.save.dug = this.save.dug || {}, k = w.id + ':' + key;
  if (dug[k] && !this.digField) { this.sfx('clink'); return; }
  dug[k] = 1; this.sfx('cut'); this.effects.push(new LV.Effect(tx * 16 + 8, ty * 16 + 14, 'leaves'));
  w.layers.deco[ty * w.w + tx] = (2 << 16) | (0 << 8) | 0;          // a little hole of dark earth
  const hidden = (w.def.digs || {})[key];
  if (hidden && !this.save.opened[w.id + ':dig:' + key]) {
    this.save.opened[w.id + ':dig:' + key] = 1;
    this.openChest(w.id, 'dig:' + key, tx, ty, { item: hidden });
    w.layers.deco[ty * w.w + tx] = (2 << 16) | (0 << 8) | 0;
    return;
  }
  if (this.digField) { this.digPrize(tx, ty); return; }
  if (this.rng() < 0.12) this.pickups.push(new LV.Pickup(tx * 16 + 8, ty * 16 + 12, this.rng() < 0.3 ? 'cash5' : 'cash1'));
};
(function () {
  const use = LV.Game.prototype.useItem;
  LV.Game.prototype.useItem = function (h) {
    const id = this.save.equip;
    if (id === 'shovel') { this.dig(h); return; }
    if (id === 'bottle') { this.useBottle(); return; }
    return use.call(this, h);
  };
  // dug holes are remembered on outdoor maps
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const w = this.world, dug = this.save.dug || {};
    Object.keys(dug).forEach(function (k) { const p = k.split(':'); if (p[0] !== mapId) return; const xy = p[1].split(','); const i = +xy[1] * w.w + +xy[0]; if (w.col[i] === LV.C.OPEN && w.layers.deco[i] < 0) w.layers.deco[i] = (2 << 16); });
  };
})();
LV.Game.prototype.openChest = (function (orig) {
  return function (mapId, key, tx, ty, ch) {
    const self = this, s = this.save, it = ch.item;
    const quiet = function () { orig.call(self, mapId, key, tx, ty, Object.assign({}, ch, { item: '__q' })); delete s.items.__q; self.dialog = null; };
    if (key.indexOf('dig:') === 0) {
      // dug-up treasure has no chest lid to swing open
      const fake = { layers: { deco: [] }, w: 1 }; void fake;
    }
    if (it === 'shovel') { if (key.indexOf('dig:') < 0) quiet(); s.items.shovel = 1; s.equip = 'shovel'; this.say(['You got the Shovel!', 'Select it and press X to dig. Soft ground hides all sorts.', 'Old Mole says the best holes are the ones you did not expect.']); return; }
    if (key.indexOf('dig:') === 0) {
      // treasure from the ground: give it without a chest
      const w = this.world, i = ty * w.w + tx, keepDeco = w.layers.deco[i];
      const m = /^cash(\d+)$/.exec(it);
      if (m) { s.cash = Math.min(999, s.cash + +m[1]); this.sfx('cash'); this.say(['You dug up ' + m[1] + ' cash!']); return; }
      if (it === 'heart_shard') { s.shards++; if (s.shards % 4 === 0) { s.maxHp += 4; this.hero.maxHp = s.maxHp; this.hero.hp = s.maxHp; } this.sfx('chest'); this.say(['You dug up a Heart Shard!', 'Shards collected: ' + (s.shards % 4) + '/4.']); return; }
      if (it === 'bombs') { s.bombs = Math.min(10, s.bombs + 5); this.sfx('cash'); this.say(['You dug up some bombs. Probably still good.']); return; }
      if (it === 'arrows') { s.arrows = Math.min(30, s.arrows + 10); this.sfx('cash'); this.say(['You dug up a bundle of arrows.']); return; }
      void keepDeco;
    }
    return orig.call(this, mapId, key, tx, ty, ch);
  };
})(LV.Game.prototype.openChest);

/* ---------- bottles ---------- */
LV.Game.prototype.useBottle = function () {
  const s = this.save, b = s.bottles || [], h = this.hero; if (!b.length) return;
  const i = b.findIndex(function (x) { return x !== 'empty'; });
  if (i < 0) { this.sfx('clink'); this.say(['The bottle is empty. Shops sell potions to fill it.']); return; }
  const what = b[i]; b[i] = 'empty'; this.sfx('heart');
  if (what === 'red' || what === 'fairy') { h.hp = h.maxHp; this.say([what === 'red' ? 'You drink the Red Potion. Fully healed!' : 'The fairy heals you completely and flies off giggling.']); }
  else if (what === 'green') { s.energy = 1; this.say(['You drink the Green Potion. Energy refilled! It tastes exactly like an energy drink.']); }
};
// a fairy (or potion) in a bottle saves you once from being knocked out
LV.Game.prototype.heroDown = (function (orig) {
  return function () {
    const b = this.save.bottles || [], i = b.indexOf('fairy');
    if (i >= 0) { b[i] = 'empty'; this.hero.hp = Math.min(this.hero.maxHp, 28); this.sfx('heart'); this.say(['The fairy in your bottle springs out and revives you!']); return; }
    return orig.call(this);
  };
})(LV.Game.prototype.heroDown);
LV.Game.prototype.bottleShop = function () {
  const self = this, s = this.save; s.bottles = s.bottles || [];
  const opts = ['Empty Bottle  $100', 'Red Potion  $40', 'Green Potion  $30', 'Nothing'];
  this.ask(['Bottles and what goes in them. What will it be?'], opts, function (i) {
    if (i === 3) { self.say(['Come back when you are thirsty.']); return; }
    if (i === 0) {
      if (s.flags.bellamyBottle) { self.say(['One per customer. I am a bottle merchant, not a bottle charity.']); return; }
      if (s.cash < 100) { self.say(['A hundred cash. Bottles are an investment.']); return; }
      s.cash -= 100; s.flags.bellamyBottle = 1; s.bottles.push('empty'); self.sfx('chest'); self.say(['You got an Empty Bottle!', 'Fill it with a potion here or in town, or catch something in it later.']); return;
    }
    const kind = i === 1 ? 'red' : 'green', price = i === 1 ? 40 : 30, slot = s.bottles.indexOf('empty');
    if (slot < 0) { self.say([s.bottles.length ? 'Your bottles are all full.' : 'You will need a bottle to carry it in.']); return; }
    if (s.cash < price) { self.say(['That is ' + price + ' cash, friend.']); return; }
    s.cash -= price; s.bottles[slot] = kind; self.sfx('cash'); self.say(['Here you go: one ' + LV.BOTTLE_NAMES[kind] + '. Shake well. Actually, do not shake it.']);
  });
};
LV.makeVillager = (function (orig) {
  return function (x, y, s) { const e = orig(x, y, s); if (s && s.bottles) e.onTalk = function (g) { g.bottleShop(); }; if (s && s.digfield) e.onTalk = function (g) { g.digFieldStart(); }; return e; };
})(LV.makeVillager);

/* ---------- the Marrowgate dig field: 30 cash for 30 seconds of digging ---------- */
LV.Game.prototype.digFieldStart = function () {
  const self = this, s = this.save;
  if (!s.items.shovel) { this.say(['This is the dig field. Pay me, dig a hole, keep what you find.', 'No shovel? Old Mole out in Willowfen might lend you one.']); return; }
  this.ask(['Thirty cash for thirty seconds. Dig?'], ['Dig', 'Not now'], function (i) {
    if (i) return;
    if (s.cash < 30) { self.say(['Thirty cash. The ground does not dig itself. Well, not for free.']); return; }
    s.cash -= 30; self.digField = { t: 30 }; s.equip = 'shovel'; self.say(['Go! Dig anywhere inside the fence.']);
  });
};
LV.Game.prototype.digPrize = function (tx, ty) {
  if (tx < 12 || tx > 22 || ty < 22 || ty > 25) { this.sfx('clink'); return; }
  const r = this.rng(), s = this.save;
  if (!s.flags.digShard && r < 0.08) { s.flags.digShard = 1; this.pickups.push(Object.assign(new LV.Pickup(tx * 16 + 8, ty * 16 + 12, 'heart'), { shard: true })); s.shards++; if (s.shards % 4 === 0) { s.maxHp += 4; this.hero.maxHp = s.maxHp; } this.say(['A Heart Shard, buried in the field!']); return; }
  if (r < 0.55) this.pickups.push(new LV.Pickup(tx * 16 + 8, ty * 16 + 12, r < 0.2 ? 'cash5' : 'cash1'));
};
(function () {
  const update = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    update.call(this, dt);
    const F = this.digField; if (!F || this.dialog || this.paused) return;
    F.t -= dt; if (F.t <= 0 || this.world.id !== 'marrowgate') { this.digField = null; this.say(['Time is up! Thanks for digging. Come again.']); }
  };
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () { render.call(this); if (this.digField && this.mode !== 'title') LV.text(this.ctx, 'DIG TIME ' + Math.ceil(this.digField.t), 92, 200, '#f8d040'); };
})();
