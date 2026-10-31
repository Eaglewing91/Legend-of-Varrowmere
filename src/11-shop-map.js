/* ================= Choices, the shop, and the map screen ================= */
// A question at the end of a dialog: up/down choose, attack/action confirms. cb(index).
LV.Game.prototype.ask = function (lines, choices, cb) { this.say(lines); this.dialog.choices = choices; this.dialog.sel = 0; this.dialog.cb = cb; };
LV.Game.prototype.update = (function (orig) {
  return function (dt) {
    const d = this.dialog;
    if (this.mode !== 'title' && d && d.choices && d.i === d.lines.length - 1) {
      this.input.beginStep(); const p = this.input.pressed, n = d.choices.length;
      if (p.up) { d.sel = (d.sel + n - 1) % n; this.sfx('cursor'); }
      if (p.down) { d.sel = (d.sel + 1) % n; this.sfx('cursor'); }
      if (p.attack || p.action) { this.dialog = null; d.cb(d.sel); }
      return;
    }
    if (this.mode !== 'title' && this.mapOpen) {
      this.input.beginStep(); const p = this.input.pressed;
      if (p.map || p.menu || p.attack || p.action) { this.mapOpen = false; this.sfx('door'); }
      return;
    }
    orig.call(this, dt);
    if (this.mode !== 'title' && !this.dialog && !this.paused && this.input.pressed.map) { this.mapOpen = true; this.sfx('door'); }
    this.markSeen();
  };
})(LV.Game.prototype.update);
LV.drawDialog = (function (orig) {
  return function (ctx, d) {
    if (!d.choices || d.i !== d.lines.length - 1) return orig(ctx, d);
    const x = 24, h = 20 + d.choices.length * 12, y = 210 - h - 0, w = 208;
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#18183a'; ctx.fillRect(x, y, w, h);
    LV.text(ctx, d.lines[d.i], x + 8, y + 6);
    d.choices.forEach(function (c, i) { LV.text(ctx, c, x + 20, y + 20 + i * 12, d.sel === i ? '#f8d040' : '#fff'); });
    ctx.fillStyle = '#f8d040'; ctx.fillRect(x + 10, y + 23 + d.sel * 12, 4, 4);
  };
})(LV.drawDialog);

/* ---------- the shop: talk to the trader ---------- */
LV.SHOP = [
  { label: 'First Aid Kit (3 hearts)', price: 20, buy: function (g) { const h = g.hero; if (h.hp >= h.maxHp) return 'You are already in good shape.'; h.hp = Math.min(h.maxHp, h.hp + 12); g.sfx('heart'); } },
  { label: '10 Arrows', price: 30, buy: function (g) { const s = g.save; if (!s.items.bow) return 'You have no bow to shoot them with.'; if (s.arrows >= 30) return 'Your quiver is full.'; s.arrows = Math.min(30, s.arrows + 10); } },
  { label: '5 Bombs', price: 50, buy: function (g) { const s = g.save; if (!s.items.bombbag) return 'You need a bomb bag first.'; if (s.bombs >= 10) return 'Your bomb bag is full.'; s.bombs = Math.min(10, s.bombs + 5); } }
];
LV.Game.prototype.openShop = function () {
  const self = this, opts = LV.SHOP.map(function (it) { return it.label + '  $' + it.price; }).concat(['Nothing, thanks']);
  this.ask(['What will it be?'], opts, function (i) {
    const it = LV.SHOP[i]; if (!it) { self.say(['Come back when your pockets are heavier.']); return; }
    if (self.save.cash < it.price) { self.sfx('clink'); self.say(['You are short of cash. I do not do loans. Last time I did, the fellow moved abroad.']); return; }
    const no = it.buy(self); if (no) { self.say([no]); return; }
    self.save.cash -= it.price; self.sfx('cash'); self.say(['Thank you kindly! No refunds.']);
  });
};
LV.makeVillager = (function (orig) {
  return function (x, y, s) { const e = orig(x, y, s); if (s && s.shop) e.onTalk = function (g) { g.openShop(); }; return e; };
})(LV.makeVillager);

/* ---------- map screen (M) ----------
   Outdoors: the whole overworld map, shrunk, with screen names and a blinking marker.
   In a dungeon: the room grid. Rooms you've been in are shown; the Map shows every room;
   the Compass marks the boss room and rooms with unopened chests. */
LV.Game.prototype.markSeen = function () {
  if (!this.world || !this.area) return; const s = this.save; s.seen = s.seen || {};
  const k = this.world.id, i = this.world.areas.indexOf(this.area); if (i < 0) return;
  const l = s.seen[k] || (s.seen[k] = []); if (l.indexOf(i) < 0) l.push(i);
};
LV.Game.prototype.render = (function (orig) {
  return function () { orig.call(this); if (this.mode !== 'title' && this.mapOpen) this.drawMap(); };
})(LV.Game.prototype.render);
LV.Game.prototype.drawMap = function () {
  const ctx = this.ctx, w = this.world, def = w.def, blink = Math.floor(this.t * 4) % 2;
  ctx.fillStyle = '#0c0c1c'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H);
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(6, 6, 244, 212); ctx.fillStyle = '#18183a'; ctx.fillRect(8, 8, 240, 208);
  LV.text(ctx, (def.name || w.id).toUpperCase(), 16, 14, '#f8d040');
  if (def.dungeon) {
    // room grid
    const it = this.save.items, dg = def.dungeon, hasMap = !!it['map_' + dg], hasComp = !!it['compass_' + dg];
    const seen = (this.save.seen || {})[w.id] || [], A = w.areas;
    const cols = Math.max.apply(null, A.map(function (a) { return (a[0] + a[2]) / 16; })), rows = Math.max.apply(null, A.map(function (a) { return (a[1] + a[3]) / 14; }));
    const cw = Math.min(48, Math.floor(200 / cols)), ch = Math.min(40, Math.floor(150 / rows)), X0 = 128 - cols * cw / 2, Y0 = 40;
    const self = this;
    A.forEach(function (a, i) {
      const known = seen.indexOf(i) >= 0; if (!known && !hasMap) return;
      const x = X0 + a[0] / 16 * cw, y = Y0 + a[1] / 14 * ch, rw = a[2] / 16 * cw, rh = a[3] / 14 * ch;
      ctx.fillStyle = known ? '#5a6ab0' : '#2e3460'; ctx.fillRect(x + 2, y + 2, rw - 4, rh - 4);
      ctx.fillStyle = '#9aa8e8'; ctx.fillRect(x + 2, y + 2, rw - 4, 1);
      if (hasComp) {
        const boss = (def.spawns || []).some(function (s) { return /^sentinel|boss/.test(s.kind) && s.x >= a[0] && s.x < a[0] + a[2] && s.y >= a[1] && s.y < a[1] + a[3]; });
        if (boss && !self.dflag('boss') && blink) { ctx.fillStyle = '#f85050'; ctx.fillRect(x + rw / 2 - 3, y + rh / 2 - 3, 6, 6); }
        Object.keys(w.chests).forEach(function (k) { const p = k.split(',').map(Number); if (p[0] >= a[0] && p[0] < a[0] + a[2] && p[1] >= a[1] && p[1] < a[1] + a[3] && !self.save.opened[w.id + ':' + k]) { ctx.fillStyle = '#e8b030'; ctx.fillRect(x + 4 + (p[0] - a[0]) / a[2] * (rw - 10), y + 4 + (p[1] - a[1]) / a[3] * (rh - 10), 3, 3); } });
      }
      if (a === self.area && blink) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + (self.hero.x / 16 - a[0]) / a[2] * rw - 2, y + ((self.hero.y - 8) / 16 - a[1]) / a[3] * rh - 2, 4, 4); }
    });
    LV.text(ctx, (hasMap ? 'MAP ' : '') + (hasComp ? 'COMPASS ' : '') + 'KEYS ' + (this.save.keys[w.id] || 0), 16, 198, '#a0a0c0');
    return;
  }
  // overworld: shrink the map's ground and deco layers into the frame once, then draw it
  if (!this.mapCache || this.mapCache.id !== w.id) {
    const c = document.createElement('canvas'); c.width = w.w * 16; c.height = w.h * 16; const x = c.getContext('2d');
    for (let oy = 0; oy < c.height; oy += LV.VIEW_H) for (let ox = 0; ox < c.width; ox += LV.VIEW_W) { x.save(); x.translate(ox, oy); ['ground', 'deco', 'over'].forEach(function (L) { LV.drawLayer(x, w, L, ox, oy); }); x.restore(); }
    this.mapCache = { id: w.id, cv: c };
  }
  const c = this.mapCache.cv, sc = Math.min(232 / c.width, 160 / c.height), dw = c.width * sc, dh = c.height * sc, X = 128 - dw / 2, Y = 30;
  ctx.imageSmoothingEnabled = true; ctx.drawImage(c, X, Y, dw, dh); ctx.imageSmoothingEnabled = false;
  const names = def.names || [];
  w.areas.forEach(function (a, i) { if (names[i]) LV.text(ctx, names[i], X + a[0] * 16 * sc + 3, Y + a[1] * 16 * sc + 3, '#fff'); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.strokeRect(X + a[0] * 16 * sc + 0.5, Y + a[1] * 16 * sc + 0.5, a[2] * 16 * sc - 1, a[3] * 16 * sc - 1); });
  if (blink) { ctx.fillStyle = '#f85050'; ctx.fillRect(X + this.hero.x * sc - 3, Y + (this.hero.y - 8) * sc - 3, 6, 6); }
  LV.text(ctx, 'M or Enter to close', 16, 198, '#a0a0c0');
};
