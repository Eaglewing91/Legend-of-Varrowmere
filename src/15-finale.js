/* ================= The Dawnblade, the barrier, Chancellor Vex, and the ending ================= */
LV.C.PEDESTAL = 22; LV.C.BARRIER = 23;
(function () {
  const blocks = LV.World.prototype.blocks;
  LV.World.prototype.blocks = function (code, mode) { return code === LV.C.PEDESTAL || code === LV.C.BARRIER ? true : blocks.call(this, code, mode); };
  // the Dawnblade doubles the blade's power and, at full health, fires a beam with every swing (as in the original)
  const start = LV.Hero.prototype.startAttack;
  LV.Hero.prototype.startAttack = function (g) {
    this.blade = g.save.items.dawnblade ? 2 : 1;
    start.call(this, g);
    if (g.save.items.dawnblade && this.hp >= this.maxHp && !g.shots.some(function (s) { return s.kind === 'beam'; })) g.shots.push(new LV.Beam(this));
  };
  const interact = LV.Game.prototype.interact;
  LV.Game.prototype.interact = function (h) {
    const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), c = this.world.c(tx, ty);
    if (c === LV.C.PEDESTAL) { this.pedestal(); return true; }
    if (c === LV.C.BARRIER && !this.save.items.dawnblade) { this.say(['A wall of violet light seals the gate. Your blade would only bounce off it.', 'Something stronger is needed.']); return true; }
    return interact.call(this, h);
  };
  // the Dawnblade cuts the castle barrier
  const resolve = LV.Game.prototype.resolveHit;
  LV.Game.prototype.resolveHit = function (hit, fromHero, poke) {
    resolve.call(this, hit, fromHero, poke);
    // reflect Vex's orbs with the blade
    if (fromHero && (hit.kind === 'blade' || hit.kind === 'spin')) for (const s of this.shots) if (s.kind === 'orb' && !s.dead && s.team === 'enemy' && LV.overlap(hit.box, s.box())) s.reflect(this);
    if (!fromHero || !this.save.items.dawnblade || (hit.kind !== 'blade' && hit.kind !== 'spin')) return;
    const T = 16, b = hit.box, w = this.world; let cut = false;
    for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 1) / T); ty++) for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 1) / T); tx++) if (w.c(tx, ty) === LV.C.BARRIER) cut = true;
    if (cut && !this.save.flags.barrier) {
      this.save.flags.barrier = 1; const self = this;
      for (let i = 0; i < w.col.length; i++) if (w.col[i] === LV.C.BARRIER) w.col[i] = LV.C.OPEN;
      (w.def.variants || []).forEach(function (v) { if (v.when === 'barrier') LV.applyVariant(w, v); });
      this.shake = 0.6; this.sfx('spin'); this.say(['The Dawnblade blazes! The barrier shatters like glass.']); void self;
    }
  };
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    if (this.save.flags.barrier) { const w = this.world; for (let i = 0; i < w.col.length; i++) if (w.col[i] === LV.C.BARRIER) w.col[i] = LV.C.OPEN; }
    if (this.save.items.dawnblade) this.hero.blade = 2;
  };
})();
LV.Game.prototype.pedestal = function () {
  const s = this.save, n = ['pendant_ruins1', 'pendant_shrine', 'pendant_forge'].filter(function (k) { return s.items[k]; }).length;
  if (s.items.dawnblade) { this.say(['The pedestal is empty now. The grove is very quiet.']); return; }
  if (n < 3) { this.say(['A sword of pale gold rests in the stone. Three hollows are carved round its base.', 'You hold ' + n + ' of the three Pendants. The blade will not move.']); return; }
  s.items.dawnblade = 1; this.hero.blade = 2; this.shake = 1; this.sfx('chest');
  this.say(['The three Pendants rise and spin round the stone...', 'You drew the Dawnblade!', 'Its edge cuts deeper, and while your health is full, every swing sends out a beam of light.', 'Now: Ashford Castle, and the Chancellor.']);
};
LV.Beam = function (h) { this.kind = 'beam'; this.dir = h.dir; const d = LV.DIRS[h.dir]; this.x = h.x + d.x * 12; this.y = h.y - 8 + d.y * 12; this.t = 0; this.dead = false; this.done = new Set(); };
LV.Beam.prototype.update = function (g, dt) {
  this.t += dt; const d = LV.DIRS[this.dir]; if (this.t < 0.12) return;
  this.x += d.x * 240 * dt; this.y += d.y * 240 * dt;
  const b = { x: this.x - 5, y: this.y - 5, w: 10, h: 10 };
  for (const a of g.actors) if (!a.dead && LV.overlap(b, a.hurtBox())) { LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'beam', power: 2, from: { x: this.x - d.x * 10, y: this.y - d.y * 10 }, box: b, done: this.done }), a); this.dead = true; g.effects.push(new LV.Effect(this.x, this.y + 8, 'poof')); return; }
  if (g.world.boxBlocked({ x: this.x - 2, y: this.y + 4, w: 4, h: 4 }, 'shot') || this.t > 1.2) { this.dead = true; g.effects.push(new LV.Effect(this.x, this.y + 8, 'poof')); }
};
LV.Beam.prototype.draw = function (ctx, ox, oy) {
  if (this.t < 0.12) return;
  const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), d = LV.DIRS[this.dir], f = Math.floor(this.t * 24) % 2;
  ctx.fillStyle = f ? '#a8e0ff' : '#ffffff';
  if (d.x) { ctx.fillRect(X - 7, Y - 1, 14, 3); ctx.fillStyle = '#f8d040'; ctx.fillRect(X - 7 + (d.x > 0 ? 10 : 0), Y - 2, 4, 5); }
  else { ctx.fillRect(X - 1, Y - 7, 3, 14); ctx.fillStyle = '#f8d040'; ctx.fillRect(X - 2, Y - 7 + (d.y > 0 ? 10 : 0), 5, 4); }
};
// pedestal and barrier art
LV.drawSpecialTiles = (function (orig) {
  return function (ctx, g, ox, oy) {
    orig(ctx, g, ox, oy);
    const w = g.world;
    for (let i = 0; i < w.col.length; i++) {
      const c = w.col[i]; if (c !== LV.C.PEDESTAL && c !== LV.C.BARRIER) continue;
      const X = (i % w.w) * 16 - ox, Y = Math.floor(i / w.w) * 16 - oy; if (X < -16 || Y < -32 || X > 256 || Y > 224) continue;
      if (c === LV.C.PEDESTAL) {
        ctx.fillStyle = '#2a2a32'; ctx.fillRect(X, Y + 4, 16, 12); ctx.fillStyle = '#9a9aa8'; ctx.fillRect(X + 1, Y + 5, 14, 10); ctx.fillStyle = '#c8c8d4'; ctx.fillRect(X + 1, Y + 5, 14, 2);
        const n = ['pendant_ruins1', 'pendant_shrine', 'pendant_forge'], cols = ['#3ac050', '#3a8ae8', '#e84a10'];
        n.forEach(function (k, j) { ctx.fillStyle = g.save.items[k] ? cols[j] : '#4a4a58'; ctx.fillRect(X + 3 + j * 4, Y + 11, 2, 2); });
        if (!g.save.items.dawnblade) {
          ctx.fillStyle = '#1a1418'; ctx.fillRect(X + 6, Y - 14, 4, 20); ctx.fillRect(X + 2, Y - 2, 12, 4);
          ctx.fillStyle = '#e8eef8'; ctx.fillRect(X + 7, Y - 13, 2, 14); ctx.fillStyle = '#f8d040'; ctx.fillRect(X + 3, Y - 1, 10, 2); ctx.fillStyle = '#4060c0'; ctx.fillRect(X + 7, Y + 1, 2, 4);
          if (Math.floor(g.t * 3) % 3 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 8, Y - 12 + Math.floor(g.t * 9) % 12, 1, 2); }
        }
      } else {
        const a = 0.55 + Math.sin(g.t * 5 + i) * 0.2; ctx.globalAlpha = a;
        ctx.fillStyle = '#7a3ad0'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#c89af8';
        for (let k = 0; k < 4; k++) ctx.fillRect(X + ((k * 5 + Math.floor(g.t * 12)) % 16), Y + k * 4, 2, 3);
        ctx.globalAlpha = 1;
      }
    }
  };
})(LV.drawSpecialTiles);

/* ---------- Chancellor Vex ----------
   He blinks between four spots, then hurls an orb of dark light. Strike the orb back with your blade:
   only his own magic can wound him. Past half health he also throws a fan of flames you must dodge. */
(function () {
  const look = { '#432e27': '#1a1a24', '#6a4834': '#3a3a4a', '#c43c3c': '#4a1a6a', '#882e2e': '#30104a', '#681c1c': '#1e0a30', '#65659b': '#1a1a24' };
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () { prep(); LV.IMG.vex = LV.recolour(LV.IMG.hero, look); };
})();
LV.ENEMIES.vex = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 8, contact: 4, body: [-5, -6, 10, 6], hurt: [-7, -26, 14, 26], kind: 'vex' });
  e.boss = true; e.heavy = true; e.drop = false; e.name = 'Chancellor Vex'; e.state = 'intro'; e.st = 0; e.spot = 0; e.cast = 0;
  e.immune = ['blade', 'spin', 'arrow', 'fire', 'thrown', 'dice', 'bomb', 'beam'];
  e.update = function (g, dt) {
    this.t += dt; this.st += dt; if (this.inv > 0) this.inv -= dt;
    const a = g.area, T = 16, spots = [[a[0] + 4, a[1] + 5], [a[0] + 11, a[1] + 5], [a[0] + 4, a[1] + 10], [a[0] + 11, a[1] + 10]];
    if (this.state === 'intro') {
      const ar = g.world.areaAt(this.x, this.y - 8); if (g.area !== ar || g.scroll) { this.st = 0; return; }
      if (!this.said) { this.said = true; g.say(['VEX: So, the farm hand from Thistledown found a sword.', 'VEX: Do you know how many forms I signed to take this kingdom? Do you know the paperwork?', 'VEX: I will not have it undone by a child with a pointy stick.']); }
      if (this.st > 0.5) { this.state = 'fade'; this.st = 0; }
      return;
    }
    if (this.stun > 0) { this.stun -= dt; return; }
    if (this.state === 'fade') { if (this.st > 0.5) { let n; do { n = Math.floor(g.rng() * 4); } while (n === this.spot); this.spot = n; this.x = spots[n][0] * T + 8; this.y = spots[n][1] * T + 12; this.state = 'appear'; this.st = 0; } return; }
    if (this.state === 'appear') { if (this.st > 0.5) { this.state = 'cast'; this.st = 0; } return; }
    if (this.state === 'cast') {
      if (this.st > 0.7) {
        const h = g.hero;
        if (this.hp <= 4 && this.cast % 2 === 1) { for (let k = -1; k <= 1; k++) { const f = new LV.Fireball(this.x, this.y - 14, 0, 'enemy'), dx = h.x - this.x, dy = h.y - 8 - (this.y - 14), ang = Math.atan2(dy, dx) + k * 0.35; f.vx = Math.cos(ang) * 120; f.vy = Math.sin(ang) * 120; g.shots.push(f); } g.sfx('throw'); }
        else { g.shots.push(new LV.Orb(this, h)); g.sfx('spin'); }
        this.cast++; this.state = 'wait'; this.st = 0;
      }
      return;
    }
    if (this.state === 'wait') { if (this.st > 1.4) { this.state = 'fade'; this.st = 0; } }
  };
  e.hurtBox = function () { return this.state === 'fade' || this.state === 'intro' ? { x: -999, y: -999, w: 0, h: 0 } : LV.Actor.prototype.hurtBox.call(this); };
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
    if (this.state === 'fade' && Math.floor(this.st * 20) % 2) return;
    if (this.state === 'appear' && Math.floor(this.st * 20) % 2) return;
    // a cloak behind him
    ctx.fillStyle = '#1e0a30'; ctx.fillRect(X - 8, Y - 18, 16, 16); ctx.fillStyle = '#4a1a6a'; ctx.fillRect(X - 7, Y - 17, 14, 14);
    ctx.drawImage(LV.IMG.vex, (this.state === 'cast' ? 1 : 0) * 16, LV.HERO_ROW[2] * 32, 16, 32, X - 8, Y - 28, 16, 32);
    ctx.fillStyle = '#e0b030'; ctx.fillRect(X - 4, Y - 31, 8, 3); ctx.fillRect(X - 4, Y - 33, 2, 2); ctx.fillRect(X - 1, Y - 34, 2, 3); ctx.fillRect(X + 2, Y - 33, 2, 2);
    if (this.state === 'cast') { const r = 3 + Math.floor(this.st * 8) % 3; ctx.fillStyle = '#c89af8'; ctx.fillRect(X - r, Y - 40 - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, Y - 41, 2, 2); }
  };
  return e;
};
LV.Orb = function (vex, h) { this.kind = 'orb'; this.vex = vex; this.x = vex.x; this.y = vex.y - 16; this.team = 'enemy'; this.t = 0; this.dead = false; this.aim(h.x, h.y - 8, 105); this.done = new Set(); this.volleys = 0; };
LV.Orb.prototype.aim = function (tx, ty, sp) { const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1; this.vx = dx / d * sp; this.vy = dy / d * sp; };
LV.Orb.prototype.box = function () { return { x: this.x - 5, y: this.y - 5, w: 10, h: 10 }; };
LV.Orb.prototype.reflect = function (g) { this.team = 'hero'; this.volleys++; this.aim(this.vex.x, this.vex.y - 14, 150 + this.volleys * 15); this.done = new Set(); g.sfx('clink'); };
LV.Orb.prototype.update = function (g, dt) {
  this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt; const b = this.box(), v = this.vex;
  if (this.team === 'enemy') { if (LV.overlap(b, g.hero.hurtBox()) && LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'orb', power: 4, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b, done: this.done }), g.hero)) { this.dead = true; return; } }
  else if (!v.dead && LV.overlap(b, LV.Actor.prototype.hurtBox.call(v))) {
    // sometimes Vex bats it back; you have to return it again
    if (this.volleys < 2 && g.rng() < 0.35) { this.team = 'enemy'; this.aim(g.hero.x, g.hero.y - 8, 140 + this.volleys * 15); g.sfx('clink'); return; }
    this.dead = true; v.immune = null; LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'orb', power: 1, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b }), v); v.immune = ['blade', 'spin', 'arrow', 'fire', 'thrown', 'dice', 'bomb', 'beam']; if (!v.dead) { v.state = 'fade'; v.st = 0; } return;
  }
  if (this.t > 6 || (this.t > 0.2 && g.world.boxBlocked({ x: this.x - 2, y: this.y + 4, w: 4, h: 4 }, 'shot'))) { this.dead = true; g.effects.push(new LV.Effect(this.x, this.y + 8, 'poof')); }
};
LV.Orb.prototype.draw = function (ctx, ox, oy) {
  const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), f = Math.floor(this.t * 16) % 2;
  ctx.drawImage(LV.ball(5, this.team === 'enemy' ? ['#140a20', '#4a1a6a', '#8a4ad0', f ? '#ffffff' : '#e0c8ff'] : ['#140a20', '#2a6ab0', '#7ac0f8', '#ffffff']), X - 6, Y - 6);
};

/* Beating Vex ends the game: no Pendant this time, the ending and credits instead */
(function () {
  const kill = LV.Game.prototype.kill;
  LV.Game.prototype.kill = function (a) {
    if (a.kind !== 'vex') return kill.call(this, a);
    a.dead = true; this.effects.push(new LV.Effect(a.x, a.y, 'poof')); this.sfx('kill'); this.shots = [];
    this.save.flags.won = 1; this.save.wins = (this.save.wins || 0) + 1; this.store.set(this.save);
    const self = this;
    this.say(['VEX: No... the forms... I had them all in triplicate...', 'Chancellor Vex crumbles into a pile of unpaid invoices and is gone.', 'The Gilded Hand throw down their swords. Across Varrowmere, the morning comes up gold.'], function () { self.startEnding(); });
  };
})();
LV.Game.prototype.startEnding = function () { this.mode = 'ending'; this.endT = 0; this.sfx('chest'); };
LV.CREDITS = [
  ['THE LEGEND OF VARROWMERE', '#f8d040'], ['', ''],
  ['Wren of Thistledown', '#fff'], ['carried the Dawnblade home.', '#fff'], ['', ''],
  ['The Pendants rest in the grove again,', '#c8c8d8'], ['and the market is open every day', '#c8c8d8'], ['except when it rains, or when it is sunny.', '#c8c8d8'], ['', ''], ['', ''],
  ['A Torn Arcade adventure', '#f8d040'], ['', ''],
  ['Created by', '#a0a0c0'], ['Eaglewing', '#fff'], ['', ''],
  ['Built with', '#a0a0c0'], ['Claude', '#fff'], ['', ''],
  ['Art', '#a0a0c0'], ['ArMM1998 (CC0 pack)', '#fff'], ['Pixel-boy and AAA (Ninja Adventure, CC0)', '#fff'], ['', ''], ['', ''],
  ['THANKS FOR PLAYING', '#f8d040']
];
(function () {
  const update = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    if (this.mode === 'ending') {
      this.input.beginStep(); this.endT += dt;
      if (this.endT > 4 && (this.input.pressed.menu || this.input.pressed.attack || this.input.pressed.action) || this.endT > 60) { this.store.set(this.save); this.showTitle(); }
      return;
    }
    update.call(this, dt);
  };
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () {
    if (this.mode !== 'ending') return render.call(this);
    const ctx = this.ctx, t = this.endT;
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 3 ? '#6a6a90' : '#ffffff'; ctx.fillRect((i * 67 + 13) % 256, (i * 41 + 7) % 224, 1, 1); }
    LV.drawSword(ctx, 128, 20 - Math.max(0, 3 - t) * 10);
    ctx.textAlign = 'center';
    LV.CREDITS.forEach(function (l, i) { const y = 230 + i * 14 - t * 16; if (y > -10 && y < 230 && l[0]) LV.text(ctx, l[0], 128, y, l[1]); });
    const s = this.save, m = Math.floor((s.time || 0) / 60);
    if (t > 26) { LV.text(ctx, 'Time ' + Math.floor(m / 60) + 'h ' + ('0' + m % 60).slice(-2) + 'm   Hearts ' + s.maxHp / 4 + '   Heart Shards ' + (s.shards || 0), 128, 196, '#a0a0c0'); }
    ctx.textAlign = 'left';
  };
})();
// Nurses heal you fully when you talk to them
LV.makeVillager = (function (orig) {
  return function (x, y, s) { const e = orig(x, y, s); if (s && s.heal) e.onTalk = function (g) { g.hero.hp = g.hero.maxHp; g.sfx('heart'); }; return e; };
})(LV.makeVillager);
