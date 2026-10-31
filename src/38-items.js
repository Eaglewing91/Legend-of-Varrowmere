/* ================= Items cross-checked against ALttP: the missing Fire Shield, Magic Powder and Magic Boomerang
   arrive as the Ember Shield, Pepper Spray and Ninja Stars; two medals take Torn names. ================= */

// ALttP's Bombos and Ether medallions: here the Molotov Cocktail and the Flash Grenade (same effects as before)
(function () {
  LV.ITEMS.forEach(function (it) { if (it.id === 'flame') it.name = 'Molotov Cocktail'; if (it.id === 'storm') it.name = 'Flash Grenade'; });
  LV.GEAR_TEXT.flame = ['You got the Molotov Cocktail!', 'A ring of fire scorches every enemy on screen. Uses half your energy.'];
  LV.GEAR_TEXT.storm = ['You got the Flash Grenade!', 'A blinding, freezing blast turns every enemy on screen to ice. Uses half your energy.'];
  LV.ICONS.flame = [['#171717', 5, 1, 6, 14], ['#3a7a3a', 6, 5, 4, 9], ['#8ad08a', 6, 5, 1, 9], ['#e8e0c0', 7, 2, 2, 3], ['#f8a030', 6, 0, 4, 2], ['#f8e060', 7, 0, 2, 1]];
  LV.ICONS.storm = [['#171717', 4, 4, 9, 11], ['#5a6a4a', 5, 5, 7, 9], ['#8a9a7a', 5, 5, 2, 9], ['#171717', 7, 1, 3, 4], ['#c8c8d0', 8, 2, 1, 2], ['#c8c8d0', 10, 2, 3, 1]];
})();

// ALttP's Fire Shield: the Ember Shield blocks fireballs and falling rocks as well as arrows
LV.GEAR_TEXT.fireshield = ['You got the Ember Shield!', 'Forged hot and never cooled. It turns aside fireballs and falling rocks, not just arrows.'];
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { enter.call(this, mapId, x, y, dir, first); if (this.save.items.fireshield && this.hero.shield < 2) this.hero.shield = 2; };
})();

// ALttP's Magic Powder: Pepper Spray. A choking cloud in front of you: foes are left helpless for a while, and the small
// ones sneeze themselves into a heart
LV.ITEMS.push({ id: 'pepper', name: 'Pepper Spray', need: function (s) { return s.items.pepper; } });
LV.ICONS.pepper = [['#171717', 5, 3, 6, 12], ['#c83030', 6, 6, 4, 8], ['#f08070', 6, 6, 1, 8], ['#171717', 6, 1, 4, 3], ['#e8e8f0', 7, 1, 2, 2], ['#f8a030', 11, 1, 3, 1], ['#f8a030', 12, 3, 2, 1]];
LV.GEAR_TEXT.pepper = ['You got the Pepper Spray!', 'A cloud of fire in a can. Foes caught in it are helpless for a while; small ones sneeze themselves away.'];
LV.ROD_COST.pepper = 1 / 12;
(function () {
  const SMALL = ['larva', 'mouse', 'slime', 'snake', 'mushroom', 'bluebat', 'butterfly', 'log'];
  const use = LV.Game.prototype.useItem;
  LV.Game.prototype.useItem = function (h) {
    if (this.save.equip !== 'pepper') return use.call(this, h);
    if (!LV.spend(this, LV.ROD_COST.pepper)) { this.sfx('clink'); return; }
    const d = LV.DIRS[h.dir], cx = h.x + d.x * 22, cy = h.y - 8 + d.y * 22, self = this;
    h.state = 'item'; h.st = 0; this.sfx('spin');
    for (const a of this.actors) {
      if (a.dead || a.npc || a.boss || a.invuln || Math.hypot(a.x - cx, a.y - 8 - cy) > 22) continue;
      if (SMALL.indexOf(a.key || a.kind) >= 0) { a.dead = true; this.save.kills = (this.save.kills || 0) + 1; this.pickups.push(new LV.Pickup(a.x, a.y, 'heart')); continue; }
      a.stun = Math.max(a.stun || 0, 3.5);
    }
    // the cloud
    const puffs = []; for (let k = 0; k < 14; k++) puffs.push([(this.rng() - 0.5) * 30, (this.rng() - 0.5) * 30, 2 + this.rng() * 3]);
    this.effects.push({ x: cx, y: cy, t: 0, dead: false, update: function (g, dt) { this.t += dt; if (this.t > 0.7) this.dead = true; },
      draw: function (ctx, ox, oy) { const k = this.t / 0.7; ctx.globalAlpha = 1 - k; puffs.forEach(function (p) { ctx.fillStyle = p[2] > 3.5 ? '#f8a030' : '#e05020'; const r = p[2] * (1 + k); ctx.fillRect(Math.round(cx + p[0] * (0.6 + k) - ox - r / 2), Math.round(cy + p[1] * (0.6 + k) - oy - r / 2), r, r); }); ctx.globalAlpha = 1; } });
    void self;
  };
})();

// ALttP's Magic Boomerang: Ninja Stars replace the Ricochet Dice. Faster, further, and they cut
LV.GEAR_TEXT.ninjastars = ['You got the Ninja Stars!', 'They fly further and faster than the dice, cut what they hit, and still come back to you.'];
LV.Game.prototype.renameDice = function () { const s = this.save; LV.ITEMS.forEach(function (it) { if (it.id === 'dice') it.name = s.items.ninjastars ? 'Ninja Stars' : 'Ricochet Dice'; }); if (s.items.ninjastars) s.items.dice = 1; };
(function () {
  const D = LV.Dice;
  LV.Dice = function (h) { D.call(this, h); if (LV.game && LV.game.save.items.ninjastars) { this.vx *= 1.4; this.vy *= 1.4; this.stars = true; } };
  LV.Dice.prototype = D.prototype;
  const dd = D.prototype.draw;
  D.prototype.draw = function (ctx, ox, oy) {
    if (!this.stars) return dd.call(this, ctx, ox, oy);
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), a = this.t * 20;
    ctx.fillStyle = '#171717'; ctx.fillRect(X - 4, Y - 4, 8, 8);
    ctx.fillStyle = '#c8c8d8'; for (let k = 0; k < 4; k++) { const ang = a + k * Math.PI / 2; ctx.fillRect(Math.round(X + Math.cos(ang) * 4) - 1, Math.round(Y + Math.sin(ang) * 4) - 1, 2, 2); }
    ctx.fillStyle = '#e8e8f8'; ctx.fillRect(X - 1, Y - 1, 2, 2);
  };
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (hit.kind === 'dice' && game.save && game.save.items.ninjastars && !hit.cut) { hit.cut = true; hit.power = 2; t.weakToDice = true; } return ah(game, hit, t); };
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { enter.call(this, mapId, x, y, dir, first); this.renameDice(); };
  const icon = LV.itemIcon;
  LV.itemIcon = function (ctx, id, x, y) {
    if (id === 'dice' && LV.game && LV.game.save.items.ninjastars) { ctx.fillStyle = '#171717'; ctx.fillRect(x + 6, y + 2, 4, 12); ctx.fillRect(x + 2, y + 6, 12, 4); ctx.fillStyle = '#c8c8d8'; ctx.fillRect(x + 7, y + 3, 2, 10); ctx.fillRect(x + 3, y + 7, 10, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 7, y + 7, 2, 2); return; }
    return icon(ctx, id, x, y);
  };
})();
// the new treasures arrive through the normal "You got..." chest text
(function () {
  const open = LV.Game.prototype.openChest;
  LV.Game.prototype.openChest = function (mapId, key, tx, ty, ch) {
    const it = ch.item;
    if (it === 'fireshield' || it === 'pepper' || it === 'ninjastars') {
      if (this.save.opened[mapId + ':' + key]) return;
      this.save.opened[mapId + ':' + key] = 1; this.world.layers.deco[ty * this.world.w + tx] = LV.CHEST_OPEN; this.save.items[it] = 1;
      if (it === 'fireshield' && this.hero.shield < 2) this.hero.shield = 2;
      if (it === 'ninjastars') this.renameDice();
      if (it === 'pepper' && !this.save.equip) this.save.equip = 'pepper';
      this.sfx('chest'); this.say(LV.GEAR_TEXT[it]); return;
    }
    return open.call(this, mapId, key, tx, ty, ch);
  };
})();
