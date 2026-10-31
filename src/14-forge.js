/* ================= The Ember Forge: lava, fire bars, Cinder Wisps, the Ember Rod, the Pyrewyrm =================
   Lava works like the original's pits with a sting: fall in and you're burned and set back where you were safe. */
(function () {
  // lava tiles are pits drawn as molten rock
  const hu = LV.Hero.prototype.checkGround;
  LV.Hero.prototype.checkGround = function (g) {
    const w = g.world, i = Math.floor((this.y - 3) / 16) * w.w + Math.floor(this.x / 16);
    if (w.def.lava && w.def.lava.indexOf(i) >= 0 && w.col[i] === LV.C.PIT) { this.lavaBurn = true; }
    return hu.call(this, g);
  };
  const upd = LV.Hero.prototype.update;
  LV.Hero.prototype.update = function (g, dt) {
    const was = this.state; upd.call(this, g, dt);
    // a lava fall costs a whole heart instead of half
    if (was === 'fall' && this.state !== 'fall' && this.lavaBurn) { this.lavaBurn = false; this.hp = Math.max(1, this.hp - 2); g.sfx('hurt'); }
  };
})();
LV.drawSpecialTiles = (function (orig) {
  return function (ctx, g, ox, oy) {
    const w = g.world, lava = w.def.lava;
    if (lava) {
      const set = w.lavaSet || (w.lavaSet = new Set(lava));
      const x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        const i = ty * w.w + tx; if (!set.has(i) || w.col[i] !== LV.C.PIT) continue;
        const X = tx * 16 - ox, Y = ty * 16 - oy;
        ctx.fillStyle = '#7a1808'; ctx.fillRect(X, Y, 16, 16);
        for (let k = 0; k < 4; k++) {
          const ph = g.t * 1.6 + tx * 0.9 + ty * 1.7 + k * 1.3, yy = (Math.sin(ph) * 0.5 + 0.5) * 12;
          ctx.fillStyle = k % 2 ? '#e84a10' : '#c83010'; ctx.fillRect(X + (k * 5 + tx * 3) % 13, Y + Math.round(yy), 4, 3);
        }
        ctx.fillStyle = '#f8b030'; ctx.fillRect(X + (tx * 7 + Math.floor(g.t * 2)) % 14, Y + (ty * 5 + Math.floor(g.t * 3)) % 14, 2, 2);
        // dark crust where lava meets floor
        if (!set.has(i - w.w)) { ctx.fillStyle = '#2a0c06'; ctx.fillRect(X, Y, 16, 2); }
      }
    }
    orig(ctx, g, ox, oy);
  };
})(LV.drawSpecialTiles);

/* ---------- the Ember Rod: shoots a fireball. Lights torches at range, burns bushes, hurts most things ---------- */
LV.ITEMS.splice(2, 0, { id: 'rod', name: 'Ember Rod', need: function (s) { return s.items.rod; } });
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) {
    if (id !== 'rod') return orig(ctx, id, x, y);
    ctx.fillStyle = '#5a3a1a'; for (let i = 0; i < 10; i++) ctx.fillRect(x + 3 + i, y + 13 - i, 2, 2);
    ctx.fillStyle = '#c83010'; ctx.fillRect(x + 11, y + 1, 4, 4); ctx.fillStyle = '#f8b030'; ctx.fillRect(x + 12, y + 2, 2, 2);
  };
})(LV.itemIcon);
LV.Fireball = function (x, y, dir, team) { this.kind = 'fireball'; this.x = x; this.y = y; const d = LV.DIRS[dir]; this.vx = d.x * 200; this.vy = d.y * 200; this.team = team || 'hero'; this.t = 0; this.dead = false; this.done = new Set(); };
LV.Fireball.prototype.update = function (g, dt) {
  this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt;
  const b = { x: this.x - 4, y: this.y - 4, w: 8, h: 8 }, w = g.world;
  if (this.team === 'hero') {
    for (const a of g.actors) if (!a.dead && LV.overlap(b, a.hurtBox())) { LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'fire', power: 3, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b, done: this.done }), a); this.pop(g); return; }
  } else if (LV.overlap(b, g.hero.hurtBox())) { if (LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'fire', power: 2, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b, done: this.done }), g.hero)) { this.pop(g); return; } }
  const tx = Math.floor(this.x / 16), ty = Math.floor((this.y + 6) / 16), c = w.c(tx, ty);
  if (this.team === 'hero' && c === LV.C.TORCH) { g.lightTorch(tx, ty); this.pop(g); return; }
  if (this.team === 'hero' && c === LV.C.BUSH) { g.cutBush(tx, ty); this.pop(g); return; }
  if (w.boxBlocked({ x: this.x - 2, y: this.y + 4, w: 4, h: 4 }, 'shot') || this.t > 1.6) this.pop(g);
};
LV.Fireball.prototype.pop = function (g) { this.dead = true; g.effects.push(new LV.Effect(this.x, this.y + 8, 'poof')); g.sfx('cut'); };
LV.Fireball.prototype.draw = function (ctx, ox, oy) {
  const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), f = Math.floor(this.t * 20) % 2;
  ctx.fillStyle = '#7a1808'; ctx.fillRect(X - 4, Y - 4, 8, 8); ctx.fillStyle = '#e84a10'; ctx.fillRect(X - 3, Y - 3, 6, 6); ctx.fillStyle = f ? '#f8d040' : '#f8b030'; ctx.fillRect(X - 2, Y - 2, 4, 4);
  ctx.fillStyle = 'rgba(232,74,16,.5)'; ctx.fillRect(X - this.vx / 50 - 2, Y - this.vy / 50 - 2, 4, 4);
};
(function () {
  const use = LV.Game.prototype.useItem;
  LV.Game.prototype.useItem = function (h) {
    if (this.save.equip !== 'rod') return use.call(this, h);
    if (this.shots.filter(function (x) { return x.kind === 'fireball' && x.team === 'hero'; }).length >= 2) return;
    const d = LV.DIRS[h.dir]; this.shots.push(new LV.Fireball(h.x + d.x * 8, h.y - 8 + d.y * 8, h.dir, 'hero')); this.sfx('throw'); h.state = 'item'; h.st = 0;
  };
  const open = LV.Game.prototype.openChest;
  LV.Game.prototype.openChest = function (mapId, key, tx, ty, ch) {
    if (ch.item === 'rod') { open.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__rod' })); delete this.save.items.__rod; this.save.items.rod = 1; this.save.equip = 'rod'; this.dialog = null; this.say(['You got the Ember Rod!', 'Press X to hurl a fireball. It lights torches from afar and burns through brush.', 'Not to be used to "settle disputes" in the market. Again.']); return; }
    open.call(this, mapId, key, tx, ty, ch);
  };
})();

/* ---------- Fire bar: a spinning chain of fireballs round a block, as in the original's fire dungeons ---------- */
LV.ENEMIES.firebar = function (x, y, s) {
  const e = new LV.Actor({ x: x, y: y, hp: 99, contact: 0, body: [-6, -6, 12, 6], hurt: [-999, -999, 0, 0], kind: 'firebar' });
  e.len = (s && s.len) || 4; e.sp = (s && s.sp) || 1.6; e.ang = (s && s.ang) || 0; e.invuln = true;
  e.update = function (g, dt) {
    this.ang += this.sp * dt; const h = g.hero;
    for (let k = 1; k <= this.len; k++) {
      const bx = this.x + Math.cos(this.ang) * k * 9, by = this.y - 8 + Math.sin(this.ang) * k * 9;
      if (h.inv <= 0 && LV.overlap({ x: bx - 3, y: by - 3, w: 6, h: 6 }, h.hurtBox())) LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'fire', power: 2, from: { x: this.x, y: this.y - 8 } }), h);
    }
  };
  e.draw = function (ctx, ox, oy) {
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
    ctx.fillStyle = '#2a2a32'; ctx.fillRect(X - 7, Y - 14, 14, 14); ctx.fillStyle = '#6a6a78'; ctx.fillRect(X - 6, Y - 13, 12, 12); ctx.fillStyle = '#9a9aa8'; ctx.fillRect(X - 6, Y - 13, 12, 2);
    for (let k = 1; k <= this.len; k++) { const bx = X + Math.cos(this.ang) * k * 9, by = Y - 8 + Math.sin(this.ang) * k * 9; ctx.fillStyle = '#c83010'; ctx.fillRect(bx - 3, by - 3, 6, 6); ctx.fillStyle = '#f8d040'; ctx.fillRect(bx - 1, by - 1, 2, 2); }
  };
  return e;
};
// fire bars and other hazards don't count as enemies for "clear the room"
LV.Game.prototype.checkTriggers = (function (orig) {
  return function (quiet) { const keep = this.actors; this.actors = keep.filter(function (a) { return !a.invuln && !a.npc; }); try { orig.call(this, quiet); } finally { this.actors = keep; } };
})(LV.Game.prototype.checkTriggers);
(function () { const ah = LV.applyHit; LV.applyHit = function (game, hit, t) { if (t.invuln) return null; return ah(game, hit, t); }; })();
// spawns that carry options (fire bar length, speed...) get them
LV.Game.prototype.enter = (function (orig) {
  return function (mapId, x, y, dir, first) {
    orig.call(this, mapId, x, y, dir, first);
    const self = this, def = LV.MAPS[mapId];
    this.actors = this.actors.filter(function (a) { return a.kind !== 'firebar'; });
    def.spawns.forEach(function (s) { if (s.kind === 'firebar') self.actors.push(LV.ENEMIES.firebar(s.x * 16 + 8, s.y * 16 + 14, s)); });
  };
})(LV.Game.prototype.enter);

/* ---------- Cinder Wisp: a floating flame. Drifts over lava, swoops at you; the blade can't touch it while it
   blazes, but arrows, the Grapple's stun or a well-timed hit while it dims will do ---------- */
LV.ENEMIES.wisp = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 2, contact: 2, body: [-4, -4, 8, 4], hurt: [-6, -14, 12, 12], kind: 'wisp' });
  e.drop = true; e.weakToDice = true; e.ph = x % 7;
  e.update = function (g, dt) {
    this.t += dt; if (this.inv > 0) this.inv -= dt;
    if (this.kb > 0) { this.kb -= dt; this.x += this.kbx * dt; this.y += this.kby * dt; return; }
    if (this.stun > 0) { this.stun -= dt; return; }
    const h = g.hero, dx = h.x - this.x, dy = h.y - 4 - this.y, d = Math.hypot(dx, dy) || 1;
    // flies: only walls stop it
    const sp = this.dim() ? 18 : 42, nx = this.x + dx / d * sp * dt + Math.cos(this.t * 3 + this.ph) * 20 * dt, ny = this.y + dy / d * sp * dt + Math.sin(this.t * 2.3 + this.ph) * 20 * dt;
    const blocked = function (px, py) { const c = g.world.cAt(px, py); return c === LV.C.SOLID || c === LV.C.SHUTTER || c === LV.C.LOCKED || c === LV.C.BIGLOCK; };
    if (!blocked(nx, this.y)) this.x = nx; if (!blocked(this.x, ny)) this.y = ny;
  };
  e.dim = function () { return Math.sin(this.t * 1.4 + this.ph) < -0.3; };
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy - 6 + Math.sin(this.t * 6) * 2), f = Math.floor(this.t * 10) % 2, dim = this.dim();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 4, Math.round(this.y - oy) - 2, 8, 2);
    ctx.fillStyle = dim ? '#5a2a20' : '#c83010'; ctx.fillRect(X - 5, Y - 5, 10, 9); ctx.fillRect(X - 3, Y - 8 - f, 6, 4);
    ctx.fillStyle = dim ? '#8a4a30' : '#f8b030'; ctx.fillRect(X - 3, Y - 3, 6, 6); ctx.fillStyle = dim ? '#aa6a40' : '#fff0a0'; ctx.fillRect(X - 1, Y - 1, 2, 3);
    ctx.fillStyle = '#1a0a08'; ctx.fillRect(X - 3, Y - 2, 1, 2); ctx.fillRect(X + 2, Y - 2, 1, 2);
  };
  return e;
};
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.kind === 'wisp' && (hit.kind === 'fire' || ((hit.kind === 'blade' || hit.kind === 'spin') && !t.dim()))) { if (!hit.done.has(t)) { hit.done.add(t); game.sfx('clink'); } return 'immune'; }
    return ah(game, hit, t);
  };
})();

/* ---------- Forgemaster Hald: the Forge's mini-boss, a red-armoured brute who also hurls fireballs ---------- */
(function () {
  const red = { '#432e27': '#7a5a10', '#6a4834': '#e0b030', '#c43c3c': '#b83018', '#882e2e': '#7a1c10', '#681c1c': '#4a0e08', '#65659b': '#3a2a2a' };
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () { prep(); LV.IMG.soldier_red = LV.recolour(LV.IMG.hero, red); };
})();
LV.ENEMIES.hald = function (x, y) {
  const e = LV.ENEMIES.brute(x, y); e.hp = 12; e.name = 'Forgemaster Hald'; e.throwT = 2;
  const upd = e.update; e.update = function (g, dt) {
    upd.call(this, g, dt); this.throwT -= dt;
    if (this.state === 'stalk' && this.throwT <= 0) { this.throwT = 2.4; const h = g.hero; const f = new LV.Fireball(this.x, this.y - 16, 0, 'enemy'); const dx = h.x - this.x, dy = h.y - 16 - this.y, d = Math.hypot(dx, dy) || 1; f.vx = dx / d * 120; f.vy = dy / d * 120; g.shots.push(f); g.sfx('throw'); }
  };
  const draw = e.draw; e.draw = function (ctx, ox, oy) { const p = LV.IMG.soldier_purple; LV.IMG.soldier_purple = LV.IMG.soldier_red; draw.call(this, ctx, ox, oy); LV.IMG.soldier_purple = p; };
  return e;
};

/* ---------- The Pyrewyrm: a molten serpent of six segments that races round the room, bouncing off walls.
   Only its glowing tail can be hurt. Each hit makes it faster and angrier. ---------- */
LV.ENEMIES.pyrewyrm = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 6, contact: 4, body: [-7, -7, 14, 7], hurt: [-999, -999, 0, 0], kind: 'pyrewyrm' });
  e.boss = true; e.heavy = true; e.drop = false; e.name = 'the Pyrewyrm'; e.ang = 0.7; e.trail = []; e.turn = 0; e.st = 0;
  for (let i = 0; i < 60; i++) e.trail.push({ x: x, y: y });
  e.seg = function (k) { const p = this.trail[Math.min(this.trail.length - 1, k * 6)]; return p; };
  e.tailBox = function () { const p = this.seg(5); return { x: p.x - 6, y: p.y - 14, w: 12, h: 12 }; };
  e.hurtBox = function () { return this.tailBox(); };
  e.update = function (g, dt) {
    this.t += dt; this.st += dt; if (this.inv > 0) this.inv -= dt;
    if (this.stun > 0) { this.stun = 0; }    // nothing stuns it
    const sp = 70 + (6 - this.hp) * 14;
    if (this.st > 0.8) { this.st = 0; this.turn = (g.rng() - 0.5) * 3; }
    this.ang += this.turn * dt;
    const vx = Math.cos(this.ang) * sp * dt, vy = Math.sin(this.ang) * sp * dt, r = LV.move(this, g.world, vx, vy, 'enemy');
    if (!r.x) this.ang = Math.PI - this.ang; if (!r.y) this.ang = -this.ang;
    this.trail.unshift({ x: this.x, y: this.y }); this.trail.length = 60;
    // every segment burns
    const h = g.hero;
    if (h.inv <= 0) for (let k = 0; k < 6; k++) { const p = this.seg(k), s = k === 0 ? 8 : 6; if (LV.overlap({ x: p.x - s, y: p.y - 8 - s, w: s * 2, h: s * 2 }, h.hurtBox())) { LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'contact', power: 4, from: { x: p.x, y: p.y - 8 } }), h); break; } }
  };
  e.contact = 0;
  e.draw = function (ctx, ox, oy) {
    for (let k = 5; k >= 0; k--) {
      const p = this.seg(k), X = Math.round(p.x - ox), Y = Math.round(p.y - oy) - 8, r = k === 0 ? 9 : k === 5 ? 6 : 8 - k * 0.4 | 0;
      const flash = k === 5 && this.inv > 0 && Math.floor(this.inv * 30) % 2;
      ctx.drawImage(LV.ball(r, k === 5 ? (flash ? ['#1a0806', '#ffffff', '#ffffff', '#ffffff'] : ['#1a0806', '#c87010', '#f8b030', '#fff0a0']) : ['#1a0806', '#7a1808', '#d03a10', '#f88a30']), X - r - 1, Y - r - 1);
      if (k === 0) { const a = this.ang; ctx.fillStyle = '#fff0a0'; ctx.fillRect(Math.round(X + Math.cos(a - 0.6) * 5) - 1, Math.round(Y + Math.sin(a - 0.6) * 5) - 1, 3, 3); ctx.fillRect(Math.round(X + Math.cos(a + 0.6) * 5) - 1, Math.round(Y + Math.sin(a + 0.6) * 5) - 1, 3, 3); ctx.fillStyle = '#1a0806'; ctx.fillRect(Math.round(X + Math.cos(a - 0.6) * 5), Math.round(Y + Math.sin(a - 0.6) * 5), 1, 1); ctx.fillRect(Math.round(X + Math.cos(a + 0.6) * 5), Math.round(Y + Math.sin(a + 0.6) * 5), 1, 1); }
    }
  };
  return e;
};

// A shaded pixel ball (outline, dark, mid, highlight), cached per size and colours
LV.ballCache = {};
LV.ball = function (r, c) {
  const key = r + c.join(''); if (LV.ballCache[key]) return LV.ballCache[key];
  const n = r * 2 + 2, cv = document.createElement('canvas'); cv.width = n; cv.height = n; const x = cv.getContext('2d');
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dx = i - r - 0.5, dy = j - r - 0.5, d = Math.hypot(dx, dy); if (d > r + 0.5) continue;
    const lx = Math.hypot(dx + r * 0.35, dy + r * 0.35);
    x.fillStyle = d > r - 0.7 ? c[0] : lx < r * 0.35 ? c[3] : (dx + dy > r * 0.5 ? c[1] : c[2]); x.fillRect(i, j, 1, 1);
  }
  return (LV.ballCache[key] = cv);
};
