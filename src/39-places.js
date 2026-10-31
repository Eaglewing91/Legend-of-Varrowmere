/* ================= Inside places: shops with their own stock, Great Fairies, the secret caves ================= */

// everything a shop can sell; each shop keeper carries a list of these (tools/interiors.py SHOP_STOCK)
LV.STOCK = {
  firstaid: { label: 'First Aid Kit (3 hearts)', price: 20, buy: function (g) { const h = g.hero; if (h.hp >= h.maxHp) return 'You are already in good shape.'; h.hp = Math.min(h.maxHp, h.hp + 12); g.sfx('heart'); } },
  bigaid: { label: 'Big First Aid Kit (full)', price: 60, buy: function (g) { const h = g.hero; if (h.hp >= h.maxHp) return 'You are already in good shape.'; h.hp = h.maxHp; g.sfx('heart'); } },
  energy: { label: 'Energy Drink (full energy)', price: 40, buy: function (g) { if (LV.energy(g) >= 1) return 'You are already buzzing.'; g.save.energy = 1; g.sfx('heart'); } },
  arrows10: { label: '10 Arrows', price: 30, buy: function (g) { const s = g.save; if (!s.items.bow) return 'You have no bow to shoot them with.'; if (s.arrows >= LV.capA(s)) return 'Your quiver is full.'; s.arrows = Math.min(LV.capA(s), s.arrows + 10); } },
  arrows30: { label: '30 Arrows', price: 75, buy: function (g) { const s = g.save; if (!s.items.bow) return 'You have no bow to shoot them with.'; if (s.arrows >= LV.capA(s)) return 'Your quiver is full.'; s.arrows = Math.min(LV.capA(s), s.arrows + 30); } },
  bombs5: { label: '5 Bombs', price: 50, buy: function (g) { const s = g.save; if (!s.items.bombbag) return 'You need a bomb bag first.'; if (s.bombs >= LV.capB(s)) return 'Your bomb bag is full.'; s.bombs = Math.min(LV.capB(s), s.bombs + 5); } },
  bombs10: { label: '10 Bombs', price: 90, buy: function (g) { const s = g.save; if (!s.items.bombbag) return 'You need a bomb bag first.'; if (s.bombs >= LV.capB(s)) return 'Your bomb bag is full.'; s.bombs = Math.min(LV.capB(s), s.bombs + 10); } },
  redfill: { label: 'Red Potion (in a bottle)', price: 40, buy: function (g) { const b = g.save.bottles || []; const i = b.indexOf('empty'); if (i < 0) return 'You need an empty bottle to carry it.'; b[i] = 'red'; } },
  greenfill: { label: 'Green Potion (in a bottle)', price: 30, buy: function (g) { const b = g.save.bottles || []; const i = b.indexOf('empty'); if (i < 0) return 'You need an empty bottle to carry it.'; b[i] = 'green'; } },
  shieldfix: { label: 'Shield polish (just for show)', price: 5, buy: function (g) { g.sfx('chest'); } }
};
(function () {
  LV.Game.prototype.openShop = function (stock) {
    const list = (stock && stock.length ? stock : ['firstaid', 'arrows10', 'bombs5']).map(function (k) { return LV.STOCK[k]; }).filter(Boolean);
    const self = this, opts = list.map(function (it) { return it.label + '  $' + it.price; }).concat(['Nothing, thanks']);
    this.ask(['What will it be?'], opts, function (i) {
      const it = list[i]; if (!it) { self.say(['Come back when your pockets are heavier.']); return; }
      if (self.save.cash < it.price) { self.sfx('clink'); self.say(['You are short of cash. I do not do loans. Last time I did, the fellow moved abroad.']); return; }
      const no = it.buy(self); if (no) { self.say([no]); return; }
      self.save.cash -= it.price; self.sfx('cash'); self.say(['Thank you kindly! No refunds.']);
    });
  };
  const mk = LV.makeVillager;
  LV.makeVillager = function (x, y, s) {
    const e = mk(x, y, s);
    if (s && Array.isArray(s.shop)) { const talk = e.onTalk; e.onTalk = function (g) { void talk; g.openShop(s.shop); }; }
    if (s && s.greatfairy) greatFairy(e, s.greatfairy, s);
    return e;
  };
  LV.ENEMIES.villager = LV.makeVillager;

  /* ---------- Great Fairies: drawn as the pack's spirit in fairy colours; they grant a gift for cash thrown in ---------- */
  const GIFTS = {
    plenty: { price: 100, once: false, ask: 'Throw in 100 cash?', give: function (g) { const s = g.save; if (s.items.bombbag) s.bombs = LV.capB(s); if (s.items.bow) s.arrows = LV.capA(s); s.energy = 1; g.hero.hp = g.hero.maxHp; (s.bottles || []).forEach(function (b, i) { if (b === 'empty') s.bottles[i] = 'fairy'; }); return ['Your bombs, arrows and energy are full, and every empty bottle holds a fairy now.']; } },
    valour: { price: 300, once: true, ask: 'Throw in 300 cash?', give: function (g) { g.save.items.valour = 1; return ['Your spin attack will gather in half the time. Use it bravely, or at least often.']; } },
    fortune: { price: 200, once: true, ask: 'Throw in 200 cash?', give: function (g) { g.save.items.fortune = 1; return ['Fortune smiles on you. Foes will drop cash far more often.']; } }
  };
  function greatFairy(e, kind, sp) {
    const G = GIFTS[kind];
    e.onTalk = function (g) {
      const s = g.save;
      if (G.once && s.items[kind]) { g.hero.hp = g.hero.maxHp; g.sfx('heart'); g.say(['You already carry my blessing. Rest a while.']); return; }
      g.ask(((sp.talk && sp.talk[0] && sp.talk[0][1]) || []).concat([G.ask]), ['Throw it in', 'Not now'], function (i) {
        if (i) { g.say(['Come back when your heart, and your purse, are ready.']); return; }
        if (s.cash < G.price) { g.sfx('clink'); g.say(['Your purse is too light. The pool is not a charity, even for heroes.']); return; }
        s.cash -= G.price; g.sfx('chest'); g.shake = 0.3; g.say(G.give(g));
      });
    };
    const draw = e.draw;
    e.draw = function (ctx, ox, oy) {
      if (!LV.IMG.b_spirit) return draw.call(this, ctx, ox, oy);
      LV.drawBoss(ctx, 'spirit', this.x - ox, this.y - oy - 4 + Math.round(Math.sin(this.t * 2) * 3), this.t, { scale: 1.2, filter: 'sepia(0.6) hue-rotate(280deg) saturate(2.2) brightness(1.2)', fps: 6 });
    };
    const upd = e.update;
    e.update = function (g, dt) { this.t = (this.t || 0) + dt; if (upd) upd.call(this, g, dt); };
  }

  // the Fairy of Valour's gift: the spin attack charges twice as fast
  const hu = LV.Hero.prototype.update;
  LV.Hero.prototype.update = function (g, dt) { if (this.state === 'charge' && g.save.items.valour) this.charge += dt; return hu.call(this, g, dt); };
  // the Fairy of Fortune's gift: more cash from foes
  const drop = LV.Game.prototype.dropLoot;
  LV.Game.prototype.dropLoot = function (x, y, chance) {
    if (this.save.items.fortune && this.rng() < chance * 0.6) { this.pickups.push(new LV.Pickup(x, y, this.rng() < 0.3 ? 'cash5' : 'cash1')); return; }
    return drop.call(this, x, y, chance);
  };
})();
