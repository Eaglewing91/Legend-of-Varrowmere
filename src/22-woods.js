/* ================= Whisperwood: the Tangle, Durn, the tempered blade, Running Shoes ================= */
// The Tangle: leave its screen any way but the allowed ones and you come out where you went in
LV.Game.prototype.checkEdges = (function (orig) {
  return function () {
    const L = this.world.def.loop;
    if (L && this.world.areas.indexOf(this.area) === L.area) {
      const h = this.hero, a = this.area, T = 16; let dir = -1;
      if (h.x < a[0] * T + 1) dir = 3; else if (h.x > (a[0] + a[2]) * T - 1) dir = 1; else if (h.y - 3 < a[1] * T + 1) dir = 0; else if (h.y > (a[1] + a[3]) * T - 1) dir = 2;
      if (dir >= 0 && L.ok.indexOf(dir) < 0) {
        const self = this, to = L.to;
        this.fadeTo = function () { h.x = to[0] * 16 + 8; h.y = to[1] * 16 + 12; h.dir = 1; self.cam = self.camFor(self.area); self.fade = 1; if (!self.save.flags.tangleSaid) { self.save.flags.tangleSaid = 1; self.say(['The trees all look the same... You are back where you started.']); } };
        return;
      }
    }
    return orig.call(this);
  };
})(LV.Game.prototype.checkEdges);

/* ---------- Durn and Brannock: rescue the brother, get the shoes, get the blade tempered ---------- */
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s);
    if (s && s.durn) e.onTalk = function (g) {
      if (g.save.flags.durn) return;
      g.save.flags.durn = 1; g.save.items.shoes = 1; g.sfx('chest');
      g.say(['Durn: The rare ore? Bandits got it. And me. And my dignity.', 'Here, take these. Stole them back off the bandits. Running Shoes!', 'You got the Running Shoes! Hold Shift (or V) to dash. Dash into things to knock them about.', 'Durn: I will make my own way home. Tell Brannock to put the kettle on.']);
    };
    if (s && s.smith) e.onTalk = function (g) {
      if (!g.save.flags.durn || g.save.items.tempered) return;
      g.save.items.tempered = 1; g.sfx('chest'); g.shake = 0.3;
      g.say(['*CLANG* *CLANG* *hiss*', 'Your blade has been tempered! It cuts deeper than before.', 'Brannock: No charge. Durn is paying. He just does not know it yet.']);
    };
    return e;
  };
})(LV.makeVillager);
(function () {
  const start = LV.Hero.prototype.startAttack;
  LV.Hero.prototype.startAttack = function (g) { start.call(this, g); this.blade = 1 + (g.save.items.dawnblade ? 1 : 0) + (g.save.items.tempered ? 1 : 0); };
})();

/* ---------- Running Shoes: Shift / V to dash. A short wind-up, then you charge until you hit something.
   The blade leads the charge; walls and trees give you a bonk (and sometimes shake loose what's on top). ---------- */
LV.Input.prototype.key = (function (orig) {
  return function (code, isDown) {
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyV') { if (isDown) this.down('dash'); else this.up('dash'); return true; }
    return orig.call(this, code, isDown);
  };
})(LV.Input.prototype.key);
(function () {
  const upd = LV.Hero.prototype.update;
  LV.Hero.prototype.update = function (g, dt) {
    if (this.state === 'walk' && g.input.pressed.dash && g.save.items.shoes && !this.swimming) { this.state = 'dash'; this.st = 0; this.dashSet = new Set(); g.sfx('swing'); }
    if (this.state !== 'dash') return upd.call(this, g, dt);
    this.st += dt; this.t += dt; if (this.inv > 0) this.inv -= dt; this.anim += dt * 16;
    if (this.st < 0.22) { if (Math.floor(this.st * 30) % 3 === 0) g.effects.push(new LV.Effect(this.x + (Math.random() - 0.5) * 8, this.y, 'leaves')); return; }
    const d = LV.DIRS[this.dir], r = LV.move(this, g.world, d.x * 190 * dt, d.y * 190 * dt, 'hero', true);
    // the blade out in front
    g.resolveHit(new LV.Hit({ team: 'hero', kind: 'blade', power: this.blade || 1, from: { x: this.x, y: this.y - 8 }, box: { x: this.x + d.x * 12 - 7, y: this.y - 15 + d.y * 12, w: 14, h: 14 }, done: this.dashSet }), true);
    const steer = g.input.axis();
    if ((d.x && !r.x) || (d.y && !r.y)) { this.bonk(g); return; }
    if ((steer.x || steer.y) && LV.dirFromVec(steer.x, steer.y, this.dir) === (this.dir + 2) % 4) { this.state = 'walk'; this.st = 0; return; }
    this.checkGround(g);
  };
  LV.Hero.prototype.bonk = function (g) {
    const d = LV.DIRS[this.dir]; this.state = 'walk'; this.st = 0; this.kb = 0.12; this.kbx = -d.x * 120; this.kby = -d.y * 120; g.shake = 0.25; g.sfx('kill');
    if (g.onBonk) g.onBonk(this);
  };
  const draw = LV.Hero.prototype.draw;
  LV.Hero.prototype.draw = function (ctx, ox, oy) {
    if (this.state !== 'dash') return draw.call(this, ctx, ox, oy);
    const s = this.state; this.state = 'walk'; this.moving = true; draw.call(this, ctx, ox, oy); this.state = s;
    if (this.st >= 0.22) { const d = LV.DIRS[this.dir], X = Math.round(this.x - ox), Y = Math.round(this.y - oy) - 10; ctx.fillStyle = '#e8eef8'; if (d.x) ctx.fillRect(X + d.x * 8, Y, d.x * 10, 2); else ctx.fillRect(X - 1, Y + d.y * 8, 2, d.y * 10); }
  };
})();
// bonk the library shelf: the Book of Old Script falls down
LV.Game.prototype.onBonk = function (h) {
  if (this.world.id === 'mg_library' && h.dir === 0 && h.y < 7 * 16 && !this.save.items.book) {
    this.save.items.book = 1; this.sfx('chest');
    this.say(['Thump! A heavy book falls from the top shelf.', 'You got the Book of Old Script! You can read ancient writing now.', 'Librarian: Shh! ...Oh. Well done. Please do not do that again.']);
  }
};
LV.ITEMS.push({ id: 'book', name: 'Book of Old Script', need: function (s) { return s.items.book; } });
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) {
    if (id === 'book') { ctx.fillStyle = '#171717'; ctx.fillRect(x + 3, y + 2, 11, 13); ctx.fillStyle = '#3a8a4a'; ctx.fillRect(x + 4, y + 3, 9, 11); ctx.fillStyle = '#e0c060'; ctx.fillRect(x + 6, y + 6, 5, 1); ctx.fillRect(x + 6, y + 9, 5, 1); return; }
    return orig(ctx, id, x, y);
  };
})(LV.itemIcon);
