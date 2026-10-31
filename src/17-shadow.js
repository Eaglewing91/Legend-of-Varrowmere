/* ================= Shadow Varrowmere: the mirror world, the Twin Mirror, swimming, the Power Glove =================
   Shadow maps are copies of the overworld maps (ids start 's_') drawn with a darker, twisted palette.
   The Twin Mirror swaps you between a map and its shadow at the same spot, if the ground there is clear. */
LV.shadowSheet = function (img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d');
  x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    let r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const dd = mx - mn; s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h /= 6; }
    // greens turn sickly olive and teal, blues go inky violet, everything darker
    if (h > 0.18 && h < 0.45) h = h - 0.12; else if (h >= 0.5 && h < 0.72) h = h + 0.13;
    s *= 0.8; const L = l * 0.78;
    const q = L < 0.5 ? L * (1 + s) : L + s - L * s, pp = 2 * L - q;
    const f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    r = f(h + 1 / 3); g = f(h); b = f(h - 1 / 3);
    p[i] = Math.round((r * 0.85 + 0.27 * 0.15) * 255); p[i + 1] = Math.round((g * 0.85 + 0.12 * 0.15) * 255); p[i + 2] = Math.round((b * 0.85 + 0.36 * 0.15) * 255);
  }
  x.putImageData(d, 0, 0); return c;
};
(function () {
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () { prep(); LV.IMG.overworld_s = LV.shadowSheet(LV.IMG.overworld); LV.IMG.cave_s = LV.shadowSheet(LV.IMG.cave); LV.IMG.inner_s = LV.shadowSheet(LV.IMG.inner); if (LV.IMG.nafloor) LV.IMG.nafloor_s = LV.shadowSheet(LV.IMG.nafloor); if (LV.IMG.nanature) LV.IMG.nanature_s = LV.shadowSheet(LV.IMG.nanature); if (LV.IMG.blend) LV.IMG.blend_s = LV.shadowSheet(LV.IMG.blend); };
  // shadow maps draw from the shadowed sheets
  const dl = LV.drawLayer;
  LV.drawLayer = function (ctx, world, name, ox, oy) {
    if (!world.def.shadow) return dl(ctx, world, name, ox, oy);
    const keep = [LV.IMG.overworld, LV.IMG.cave, LV.IMG.inner, LV.IMG.nafloor, LV.IMG.nanature, LV.IMG.blend];
    LV.IMG.overworld = LV.IMG.overworld_s || keep[0]; LV.IMG.cave = LV.IMG.cave_s || keep[1]; LV.IMG.inner = LV.IMG.inner_s || keep[2]; LV.IMG.nafloor = LV.IMG.nafloor_s || keep[3]; LV.IMG.nanature = LV.IMG.nanature_s || keep[4]; LV.IMG.blend = LV.IMG.blend_s || keep[5];
    try { dl(ctx, world, name, ox, oy); } finally { LV.IMG.overworld = keep[0]; LV.IMG.cave = keep[1]; LV.IMG.inner = keep[2]; LV.IMG.nafloor = keep[3]; LV.IMG.nanature = keep[4]; LV.IMG.blend = keep[5]; }
  };
})();

/* ---------- the Twin Mirror ---------- */
LV.ITEMS.push({ id: 'mirror', name: 'Twin Mirror', need: function (s) { return s.items.mirror; } });
LV.ITEMS.push({ id: 'glove', name: 'Power Glove', need: function (s) { return s.items.glove; } });
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) {
    if (id === 'mirror') { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 7, y + 10, 2, 5); ctx.fillStyle = '#e0b030'; ctx.fillRect(x + 3, y + 1, 10, 10); ctx.fillStyle = '#7a3ad0'; ctx.fillRect(x + 4, y + 2, 8, 8); ctx.fillStyle = '#c8a8f8'; ctx.fillRect(x + 5, y + 3, 3, 3); return; }
    if (id === 'glove') { ctx.fillStyle = '#171717'; ctx.fillRect(x + 3, y + 3, 10, 11); ctx.fillStyle = '#c89040'; ctx.fillRect(x + 4, y + 4, 8, 9); ctx.fillStyle = '#e8b860'; ctx.fillRect(x + 4, y + 4, 2, 6); ctx.fillRect(x + 7, y + 4, 2, 6); ctx.fillRect(x + 10, y + 4, 2, 6); return; }
    return orig(ctx, id, x, y);
  };
})(LV.itemIcon);
LV.Game.prototype.useMirror = function () {
  const w = this.world, h = this.hero;
  if (w.indoor) { this.sfx('clink'); this.say(['The mirror shows only stone walls. It works under the open sky.']); return; }
  const to = w.id.indexOf('s_') === 0 ? w.id.slice(2) : 's_' + w.id;
  if (!LV.MAPS[to]) { this.sfx('clink'); return; }
  // is the same spot clear in the other world?
  const probe = new LV.World(LV.MAPS[to]), self = this;
  (LV.MAPS[to].variants || []).forEach(function (v) { if (LV.flagTrue(self, v.when)) LV.applyVariant(probe, v); });
  if (probe.boxBlocked(h.bodyBox(), 'hero') || [LV.C.DEEP, LV.C.PIT].indexOf(probe.cAt(h.x, h.y - 3)) >= 0 && !(probe.cAt(h.x, h.y - 3) === LV.C.DEEP && this.save.items.fins)) { this.sfx('clink'); this.say(['The mirror clouds over. Something solid stands in that spot on the other side.']); return; }
  const x = h.x, y = h.y, dir = h.dir; this.sfx('spin'); this.shake = 0.3;
  this.fadeTo = function () { self.enter(to, x, y, dir); self.fade = 1; };
};
(function () {
  const use = LV.Game.prototype.useItem;
  LV.Game.prototype.useItem = function (h) {
    if (this.save.equip === 'mirror') { this.useMirror(); return; }
    if (this.save.equip === 'glove') { this.sfx('clink'); return; }
    return use.call(this, h);
  };
})();

/* ---------- Flippers: swim in deep water. Slower, no sword, the hero shows from the chest up ---------- */
(function () {
  const upd = LV.Hero.prototype.update;
  LV.Hero.prototype.update = function (g, dt) {
    const c = g.world.cAt(this.x, this.y - 3);
    this.swimming = c === LV.C.DEEP && g.save.items.fins;
    if (this.swimming && this.state === 'walk') {
      // the sword and items stay dry: only movement while swimming
      const inp = g.input, ax = inp.axis(); this.t += dt; if (this.inv > 0) this.inv -= dt;
      if (this.kb > 0) { this.kb -= dt; LV.move(this, g.world, this.kbx * dt, this.kby * dt, 'hero'); return; }
      this.moving = !!(ax.x || ax.y);
      if (this.moving) { const len = Math.hypot(ax.x, ax.y); this.dir = LV.dirFromVec(ax.x, ax.y, this.dir); LV.move(this, g.world, ax.x / len * 52 * dt, ax.y / len * 52 * dt, 'hero', true); this.anim += dt * 4; }
      if (inp.pressed.action) g.interact(this);
      return;
    }
    return upd.call(this, g, dt);
  };
  const draw = LV.Hero.prototype.draw;
  LV.Hero.prototype.draw = function (ctx, ox, oy) {
    if (!this.swimming || this.state !== 'walk') return draw.call(this, ctx, ox, oy);
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), col = Math.floor(this.anim) % 4;
    ctx.drawImage(LV.IMG.hero, col * 16, LV.HERO_ROW[this.dir] * 32, 16, 20, X - 8, Y - 22, 16, 20);
    ctx.fillStyle = 'rgba(220,240,255,.8)'; const f = Math.floor(this.t * 6) % 2;
    ctx.fillRect(X - 9 + f, Y - 3, 5, 1); ctx.fillRect(X + 4 - f, Y - 3, 5, 1); ctx.fillRect(X - 6, Y - 2, 12, 1);
  };
})();

/* ---------- Power Glove: lift grey boulders (ROCK) and throw them for heavy damage ---------- */
LV.ROCK_REF = (2 << 16) | (4 << 8) | 5;
(function () {
  const interact = LV.Game.prototype.interact;
  LV.Game.prototype.interact = function (h) {
    const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), w = this.world;
    if (w.c(tx, ty) === LV.C.ROCK) {
      if (!this.save.items.glove) { this.say(['This boulder is far too heavy to lift with bare hands.']); return true; }
      w.clearTile(tx, ty); this.save.cut[w.id + ':' + tx + ',' + ty] = 1; h.state = 'carry'; h.carry = 'rock'; this.sfx('lift'); return true;
    }
    return interact.call(this, h);
  };
  const thr = LV.Game.prototype.throwCarried;
  LV.Game.prototype.throwCarried = function (h) {
    const was = h.carry; thr.call(this, h);
    if (was === 'rock') { const s = this.shots[this.shots.length - 1]; s.rock = true; const up = s.update; s.update = function (g, dt) { const n = g.actors.slice(); up.call(this, g, dt); void n; }; s.draw = function (ctx, ox, oy) { ctx.drawImage(LV.IMG.cave, 5 * 16, 4 * 16, 16, 16, Math.round(this.x - ox - 8), Math.round(this.y - oy - 8), 16, 16); }; }
  };
  // a thrown rock hits for double
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (hit.kind === 'thrown' && game.hero.lastCarry === 'rock') hit.power = 4; return ah(game, hit, t); };
  const tc = LV.Game.prototype.throwCarried;
  LV.Game.prototype.throwCarried = function (h) { h.lastCarry = h.carry; return tc.call(this, h); };
  // lifted rocks stay gone (like cut bushes) until you leave the map
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () {
    if (this.hero && this.hero.carry === 'rock' && this.mode !== 'title' && this.mode !== 'ending') {
      this.hero.carry = null; render.call(this); this.hero.carry = 'rock';
      const ctx = this.ctx, ox = Math.round(this.cam.x), oy = Math.round(this.cam.y);
      ctx.drawImage(LV.IMG.cave, 5 * 16, 4 * 16, 16, 16, Math.round(this.hero.x - ox - 8), Math.round(this.hero.y - oy - 36), 16, 16);
      return;
    }
    render.call(this);
  };
})();
LV.Game.prototype.openChest = (function (orig) {
  return function (mapId, key, tx, ty, ch) {
    const names = { glove: ['You got the Power Glove!', 'Now you can lift grey boulders with the action button, and throw them.', 'Finally, a use for all those hours at the gym.'],
      shield2: ['You got the Mirror Shield!', 'It turns aside fireballs, spit and dark orbs, not just arrows.'] };
    if (names[ch.item]) {
      orig.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__x' })); delete this.save.items.__x; this.dialog = null;
      if (ch.item === 'shield2') { this.save.items.shield2 = 1; this.hero.shield = 3; } else this.save.items[ch.item] = 1;
      this.say(names[ch.item]); return;
    }
    return orig.call(this, mapId, key, tx, ty, ch);
  };
})(LV.Game.prototype.openChest);
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { enter.call(this, mapId, x, y, dir, first); if (this.save.items.shield2) this.hero.shield = 3; };
})();

/* ---------- shadow villagers: the River Spirit sells Flippers ---------- */
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s);
    if (s && s.sells) e.onTalk = function (g) {
      const it = s.sells, price = s.price;
      if (g.save.items[it]) { g.say(['Swim well, little fish.']); return; }
      g.ask(['Flippers, ' + price + ' cash. Interested?'], ['Buy them', 'Not now'], function (i) {
        if (i !== 0) { g.say(['The river will wait. It always does.']); return; }
        if (g.save.cash < price) { g.say(['You are short. Come back with ' + price + '. I do not haggle, I am a river.']); return; }
        g.save.cash -= price; g.save.items[it] = 1; g.sfx('chest'); g.say(['You got the Flippers!', 'Walk into deep water to swim. You cannot swing your sword while swimming.']);
      });
    };
    if (s && s.ghost) { const d = e.draw; e.draw = function (ctx, ox, oy) { ctx.globalAlpha = 0.6 + Math.sin(this.t * 3) * 0.15; d.call(this, ctx, ox, oy); ctx.globalAlpha = 1; }; }
    return e;
  };
})(LV.makeVillager);
// cut boulders: draw ROCK tiles from the collision grid (the deco layer gets cleared when they're lifted)
LV.drawSpecialTiles = (function (orig) {
  return function (ctx, g, ox, oy) {
    orig(ctx, g, ox, oy);
    const w = g.world, x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
    const img = w.def.shadow ? (LV.IMG.cave_s || LV.IMG.cave) : LV.IMG.cave;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (w.c(tx, ty) === LV.C.ROCK) ctx.drawImage(img, 5 * 16, 4 * 16, 16, 16, tx * 16 - ox, ty * 16 - oy, 16, 16);
  };
})(LV.drawSpecialTiles);

/* ---------- cash chests ---------- */
LV.Game.prototype.openChest = (function (orig) {
  return function (mapId, key, tx, ty, ch) {
    const m = /^cash(\d+)$/.exec(ch.item);
    if (m) { orig.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__c' })); delete this.save.items.__c; this.dialog = null; this.save.cash = Math.min(999, this.save.cash + +m[1]); this.sfx('cash'); this.say(['You found ' + m[1] + ' cash!', 'Somebody\'s savings, by the look of it. Finders keepers.']); return; }
    return orig.call(this, mapId, key, tx, ty, ch);
  };
})(LV.Game.prototype.openChest);

/* ---------- the shadow dungeons' minibosses: recoloured brutes ---------- */
(function () {
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () {
    prep();
    LV.IMG.soldier_teal = LV.recolour(LV.IMG.hero, { '#432e27': '#2a4a4a', '#6a4834': '#4a7a7a', '#c43c3c': '#2a7a7a', '#882e2e': '#1a5a5a', '#681c1c': '#0e3a3a', '#65659b': '#1a2a3a' });
    LV.IMG.soldier_grey = LV.recolour(LV.IMG.hero, { '#432e27': '#4a4a52', '#6a4834': '#8a8a94', '#c43c3c': '#6a6a74', '#882e2e': '#4a4a54', '#681c1c': '#2e2e36', '#65659b': '#3a3a42' });
  };
})();
LV.brutelike = function (img, hp, name) {
  return function (x, y) {
    const e = LV.ENEMIES.brute(x, y); e.hp = hp; e.name = name;
    const draw = e.draw; e.draw = function (ctx, ox, oy) { const p = LV.IMG.soldier_purple; LV.IMG.soldier_purple = LV.IMG[img]; draw.call(this, ctx, ox, oy); LV.IMG.soldier_purple = p; };
    return e;
  };
};
LV.ENEMIES.drowned = LV.brutelike('soldier_teal', 12, 'the Drowned Knight');
LV.ENEMIES.quarryboss = LV.brutelike('soldier_grey', 14, 'the Quarry Boss');

/* ---------- the Twin Maws: two great eels in the boss pool. They surface in turn and spit three ways;
   hit them while they're up. Arrows and the Grapple's stun work too ---------- */
LV.makeMaw = function (k) {
  return function (x, y) {
    const e = LV.ENEMIES.snapjaw(x, y); e.hp = 6; e.boss = true; e.drop = false; e.name = 'the Twin Maws'; e.kind = 'maw'; e.st = 1 + k * 1.6; e.hurt = [-12, -26, 24, 26];
    const upd = e.update;
    e.update = function (g, dt) {
      const was = this.spat; upd.call(this, g, dt);
      if (!was && this.spat) { const h = g.hero; for (let j = -1; j <= 1; j += 2) { const s = new LV.Spit(this.x, this.y - 18, h.x, h.y - 8), a = Math.atan2(s.vy, s.vx) + j * 0.4; s.vx = Math.cos(a) * 110; s.vy = Math.sin(a) * 110; g.shots.push(s); } }
      if (this.state === 'up') this.st = Math.max(this.st, this.st);   // stays up the full time
    };
    e.draw = function (ctx, ox, oy) {
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
      if (this.state === 'under') { if (Math.floor(this.t * 3) % 2) { ctx.fillStyle = 'rgba(200,230,255,.6)'; ctx.fillRect(X - 9, Y - 6, 6, 1); ctx.fillRect(X + 3, Y - 5, 6, 1); ctx.fillRect(X - 3, Y - 3, 6, 1); } return; }
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const c = document.createElement('canvas'); void c;
      ctx.save(); ctx.translate(X - 16, Y - 32 + (this.state === 'up' ? Math.round(Math.sin(this.t * 8)) : 0)); ctx.scale(2, 2); LV.drawPix(ctx, LV.PIX.snapjaw, 0, 0, this.state === 'up' && this.st < 1.1 && this.st > 0.9 ? 1 : 0); ctx.restore();
    };
    return e;
  };
};
LV.ENEMIES.maw0 = LV.makeMaw(0);
LV.ENEMIES.maw1 = LV.makeMaw(1);

/* ---------- the Stone Colossus: a walking statue. Swords and arrows ring off it; only boulders hurt.
   It stomps (stay clear!) and the quarry roof drops new boulders when you run out ---------- */
LV.ENEMIES.colossus = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 12, contact: 4, body: [-10, -8, 20, 8], hurt: [-12, -64, 24, 64], kind: 'colossus' });
  e.boss = true; e.heavy = true; e.drop = false; e.name = 'the Stone Colossus'; e.st = 0; e.stomp = 0;
  e.immune = ['blade', 'spin', 'arrow', 'fire', 'dice', 'bomb', 'beam'];
  e.update = function (g, dt) {
    this.t += dt; this.st += dt; if (this.inv > 0) this.inv -= dt; this.stun = 0;
    const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1;
    if (this.stomp > 0) { this.stomp -= dt; if (this.stomp <= 0) { g.shake = 0.4; g.sfx('kill'); if (d < 34 && h.inv <= 0) LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'stomp', power: 4, from: { x: this.x, y: this.y } }), h); } return; }
    const sp = 18 + (12 - this.hp) * 3; LV.move(this, g.world, dx / d * sp * dt, dy / d * sp * dt, 'enemy');
    if (this.st > 2.6) { this.st = 0; this.stomp = 0.5; }
    // keep at least two boulders in the room
    const a = g.area, w = g.world; let n = 0;
    for (let ty = a[1]; ty < a[1] + a[3]; ty++) for (let tx = a[0]; tx < a[0] + a[2]; tx++) if (w.c(tx, ty) === LV.C.ROCK) n++;
    if (n < 2 && !h.carry && !g.shots.some(function (s) { return s.rock; }) && g.rng() < dt * 1.5) {
      for (let k = 0; k < 20; k++) { const tx = a[0] + 2 + Math.floor(g.rng() * (a[2] - 4)), ty = a[1] + 4 + Math.floor(g.rng() * (a[3] - 6)); if (w.c(tx, ty) === LV.C.OPEN && Math.hypot(tx * 16 + 8 - h.x, ty * 16 + 8 - h.y) > 24) { w.setC(tx, ty, LV.C.ROCK); g.effects.push(new LV.Effect(tx * 16 + 8, ty * 16 + 14, 'poof')); g.sfx('lift'); break; } }
    }
  };
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), lift = this.stomp > 0 ? Math.round(Math.sin((0.5 - this.stomp) / 0.5 * Math.PI) * 6) : 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 12, Y - 3, 24, 4);
    const img = LV.IMG.cave_s || LV.IMG.cave; ctx.drawImage(img, 8 * 16, 0, 16, 48, X - 12, Y - 70 - lift, 24, 72);
    if (this.stomp > 0) { ctx.strokeStyle = 'rgba(255,240,200,.6)'; ctx.strokeRect(X - 34 + this.stomp * 20, Y - 10, 68 - this.stomp * 40, 12); }
    ctx.fillStyle = Math.floor(this.t * 4) % 2 ? '#f85050' : '#c83030'; ctx.fillRect(X - 4, Y - 58 - lift, 2, 2); ctx.fillRect(X + 2, Y - 58 - lift, 2, 2);
  };
  return e;
};
(function () {
  // thrown boulders are the only thing that hurts the Colossus
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.kind === 'colossus' && hit.kind === 'thrown' && game.hero.lastCarry !== 'rock') { if (!hit.done.has(t)) { hit.done.add(t); game.sfx('clink'); } return 'immune'; }
    return ah(game, hit, t);
  };
})();

/* ---------- shadow dungeon rewards are Crystals, not Pendants ---------- */
(function () {
  const collect = LV.Game.prototype.collect;
  LV.Game.prototype.collect = function (p) {
    if (p.kind !== 'container' || !this.world.def.shadow) return collect.call(this, p);
    p.dead = true; const s = this.save, dg = this.dungeon(), self = this; s.maxHp += 4; this.hero.maxHp = s.maxHp; this.hero.hp = s.maxHp; s.items['crystal_' + dg] = 1; this.sfx('chest');
    const n = Object.keys(s.items).filter(function (k) { return k.indexOf('crystal_') === 0; }).length;
    this.say(['You got a Life Container! Your life grows by one heart.', 'You found the ' + this.world.def.pendant + '!', 'Crystals: ' + n + '. Somewhere in the Shadow Keep, Vex is waiting for them to be gathered.'], function () { self.fadeTo = function () { const ex = self.world.def.exit; self.enter(ex[0], ex[1] * 16 + 8, ex[2] * 16 + 12, 2); self.fade = 1; }; });
  };
})();

/* ---------- Vex isn't finished: he flees through the Twin Mirror, and Wren follows ---------- */
LV.Game.prototype.kill = (function (orig) {
  return function (a) {
    if (a.kind !== 'vex') return orig.call(this, a);
    a.dead = true; this.effects.push(new LV.Effect(a.x, a.y, 'poof')); this.sfx('kill'); this.shots = [];
    const self = this; this.save.flags.vex1 = 1; this.save.items.mirror = 1; this.save.equip = 'mirror'; this.store.set(this.save);
    this.say(['VEX: Enough! You want the kingdom? Have half of it.', 'Vex smashes a tall mirror behind the throne... and steps into the shards.', 'The glass pulls at you too. You grab the frame as you fall.', 'You got the Twin Mirror! Use it outdoors to cross between Varrowmere and its shadow.', 'Wherever Vex has gone, it is on the other side of the glass.'],
      function () { self.fadeTo = function () { self.enter('s_grove', 7 * 16 + 8, 8 * 16 + 12, 2); self.fade = 1; }; });
  };
})(LV.Game.prototype.kill);
LV.TUNES.shadow = { bpm: 112, lead: 'D4 - F4 - A4 - - - G#4 - - - A4 - F4 - D4 - - - C#4 - - - D4 - E4 - F4 - G4 - A4 - - - A#4 - A4 - G4 - F4 - E4 - - - - - - -', bass: 'D2 . D2 . A2 . D2 . A#1 . A#1 . F2 . A#1 . G1 . G1 . D2 . G1 . A1 . A1 . E2 . A1 .' };
