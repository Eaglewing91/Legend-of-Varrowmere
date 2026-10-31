/* ================= Treasures of the six new dungeons ================= */
LV.NEWGEAR = {
  bombbag2: { name: 'Big Bomb Bag', icon: 'it_bombs', text: ['You got the Big Bomb Bag!', 'You can carry ten more bombs. Please do not carry them all at once in a crowd.'], get: function (s) { s.bombUp = (s.bombUp || 0) + 2; } },
  quiver2: { name: "Hunter's Quiver", icon: 'it_arrow', text: ["You got the Hunter's Quiver!", 'Twenty more arrows fit in it. The hunter will not be needing it. Long story.'], get: function (s) { s.arrowUp = (s.arrowUp || 0) + 2; } },
  charm: { name: 'Fairy Charm', icon: 'it_heart', text: ['You got the Fairy Charm!', 'Hearts you pick up heal twice as much. The fairies are furious about it.'] },
  speedcharm: { name: 'Storm Boots', icon: 'it_cloak', text: ['You got the Storm Boots!', 'You move faster everywhere. Late for nothing ever again.'] },
  guardring: { name: 'Guard Ring', icon: 'it_mirror', text: ['You got the Guard Ring!', 'Every hit you take hurts a fifth less. It also matches nothing you own.'] },
  powerring: { name: 'Power Ring', icon: 'it_lantern', text: ['You got the Power Ring!', 'Your sword hits harder. Someone in the gym spent a lot of energy on this.'] }
};
(function () {
  const open = LV.Game.prototype.openChest;
  LV.Game.prototype.openChest = function (mapId, key, tx, ty, ch) {
    const G = LV.NEWGEAR[ch.item]; if (!G) return open.call(this, mapId, key, tx, ty, ch);
    open.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__q' })); delete this.save.items.__q; this.dialog = null;
    this.save.items[ch.item] = 1; if (G.get) G.get(this.save); this.sfx('chest'); this.say(G.text.slice());
  };
  const icon = LV.itemIcon;
  LV.itemIcon = function (ctx, id, x, y) { const G = LV.NEWGEAR[id]; return icon(ctx, G ? G.icon.replace('it_', '') : id, x, y); };
  // effects
  const collect = LV.Game.prototype.collect;
  LV.Game.prototype.collect = function (p) { const before = this.hero.hp; collect.call(this, p); if (p.kind === 'heart' && this.save.items.charm) this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + (this.hero.hp - before)); };
  const move = LV.move;
  LV.move = function (a, w, dx, dy, mode, nudge) { if (a && a.isHero && LV.game && LV.game.save.items.speedcharm && a.state === 'walk') { dx *= 1.18; dy *= 1.18; } return move(a, w, dx, dy, mode, nudge); };
  const armour = LV.Hero.prototype.armour;
  LV.Hero.prototype.armour = function () { const a = armour.call(this); return LV.game && LV.game.save.items.guardring ? a * 0.8 : a; };
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (hit.team === 'hero' && (hit.kind === 'blade' || hit.kind === 'spin') && game.save.items.powerring && !hit.ringed) { hit.ringed = true; hit.power += 1; } return ah(game, hit, t); };
})();
