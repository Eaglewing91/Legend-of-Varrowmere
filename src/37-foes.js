/* ================= More foes: tinted cousins of the pack's monsters, traps, and a boss for every dungeon =================
   Variants reuse the Ninja Adventure monster sheets with a colour shift, as ALttP does with its red and blue soldiers. */

// a coloured orb (fire, ice, thorn, spore...) that flies straight
LV.Bolt = function (x, y, vx, vy, cols, power) { this.kind = 'bolt'; this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.cols = cols; this.power = power || 2; this.t = 0; this.dead = false; this.done = new Set(); };
LV.Bolt.prototype.update = function (g, dt) {
  this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt;
  const b = { x: this.x - 3, y: this.y - 3, w: 6, h: 6 };
  if (LV.overlap(b, g.hero.hurtBox())) { const r = LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'spit', power: this.power, tier: 1, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b, done: this.done }), g.hero); if (r) { this.dead = true; return; } }
  if (this.t > 3 || g.world.boxBlocked({ x: this.x - 1, y: this.y + 4, w: 2, h: 2 }, 'shot')) this.dead = true;
};
LV.Bolt.prototype.draw = function (ctx, ox, oy) { ctx.drawImage(LV.ball(3, this.cols), Math.round(this.x - ox) - 4, Math.round(this.y - oy) - 4); };
LV.BOLT = { fire: ['#2a0800', '#d84010', '#f8a030', '#fff0a0'], ice: ['#0a1830', '#3a7ad0', '#a8e0ff', '#ffffff'], thorn: ['#0a1a08', '#3a7a20', '#8ad040', '#e0ffb0'],
  spore: ['#1a0a20', '#8a3ab0', '#d08af0', '#ffe0ff'], dark: ['#08040c', '#3a1a5a', '#8a5ad0', '#e0c8ff'], gold: ['#2a1a00', '#b88a10', '#f8d040', '#fffbd0'], rock: ['#141010', '#5a4a3a', '#8a7a6a', '#c8b8a8'] };
// a rock (or icicle) falling from the ceiling: a shadow grows, then it lands
LV.Fall = function (x, y, cols) { this.kind = 'fall'; this.x = x; this.y = y; this.t = 0; this.dead = false; this.cols = cols || LV.BOLT.rock; this.done = new Set(); };
LV.Fall.prototype.update = function (g, dt) {
  this.t += dt;
  if (this.t >= 0.9 && !this.hit) { this.hit = true; g.shake = 0.12; const h = g.hero; if (Math.hypot(h.x - this.x, h.y - this.y) < 13) LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'rock', power: 2, tier: 2, from: { x: this.x, y: this.y - 20 }, box: { x: this.x - 8, y: this.y - 8, w: 16, h: 16 }, done: this.done }), h); }
  if (this.t > 1.1) this.dead = true;
};
LV.Fall.prototype.draw = function (ctx, ox, oy) {
  const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), k = Math.min(1, this.t / 0.9);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.15 + k * 0.3) + ')'; ctx.fillRect(X - 3 - k * 4, Y - 2, 6 + k * 8, 3);
  if (this.t < 0.9) ctx.drawImage(LV.ball(4, this.cols), X - 5, Y - 6 - Math.round((1 - k) * 90));
};

/* ---------- regular foes: colour-shifted cousins with new habits ---------- */
LV.VARIANTS = {
  skullred:    { base: 'skull', tint: 'hue-rotate(-50deg) saturate(1.8)', hp: 4, dmg: 3, sp: 60, ai: 'chase' },
  batfire:     { base: 'bluebat', tint: 'hue-rotate(170deg) saturate(2)', hp: 2, dmg: 4, sp: 85, ai: 'flyer' },
  slimered:    { base: 'slime', tint: 'hue-rotate(-110deg) saturate(1.6)', hp: 4, dmg: 2, sp: 60, ai: 'hopper', split: 'slime' },
  slimeblue:   { base: 'slime3', tint: 'hue-rotate(120deg)', hp: 5, dmg: 3, sp: 70, ai: 'hopper', split: 'slime3' },
  eyered:      { base: 'eye', tint: 'hue-rotate(-60deg) saturate(1.8)', hp: 4, dmg: 3, sp: 30, ai: 'blinker', bolt: 'fire' },
  cyclopered:  { base: 'cyclope', tint: 'hue-rotate(-40deg) saturate(1.7)', hp: 10, dmg: 6, sp: 34, ai: 'chase', heavy: true },
  cyclopeice:  { base: 'cyclope', tint: 'hue-rotate(160deg) saturate(1.4)', hp: 9, dmg: 5, sp: 30, ai: 'chase', heavy: true },
  beastgold:   { base: 'beast', tint: 'hue-rotate(40deg) saturate(2) brightness(1.15)', hp: 6, dmg: 4, sp: 50, ai: 'charger' },
  lizardice:   { base: 'lizard', tint: 'hue-rotate(150deg)', hp: 5, dmg: 3, sp: 50, ai: 'shooter', bolt: 'ice' },
  molefire:    { base: 'mole', tint: 'hue-rotate(-30deg) saturate(2)', hp: 5, dmg: 4, sp: 55, ai: 'burrow' },
  moledirt:    { base: 'mole', tint: '', hp: 4, dmg: 3, sp: 50, ai: 'burrow' },
  spiderblue:  { base: 'spiderred', tint: 'hue-rotate(200deg) saturate(1.5)', hp: 3, dmg: 3, sp: 95, ai: 'chase' },
  reptilegold: { base: 'reptile2', tint: 'hue-rotate(50deg) saturate(1.7)', hp: 7, dmg: 4, sp: 50, ai: 'charger' },
  snakefire:   { base: 'snake', tint: 'hue-rotate(-90deg) saturate(2)', hp: 3, dmg: 3, sp: 55, ai: 'shooter', bolt: 'fire' },
  octopusblue: { base: 'octopus', tint: 'hue-rotate(180deg)', hp: 4, dmg: 3, sp: 30, ai: 'shooter', bolt: 'ice', triple: true },
  shroomspore: { base: 'mushroom', tint: 'hue-rotate(250deg) saturate(1.8)', hp: 3, dmg: 2, sp: 25, ai: 'shooter', bolt: 'spore', ring: true },
  owlnight:    { base: 'owl', tint: 'hue-rotate(230deg) brightness(0.8)', hp: 3, dmg: 3, sp: 70, ai: 'flyer' },
  larvatoxic:  { base: 'larva', tint: 'hue-rotate(80deg) saturate(2)', hp: 2, dmg: 3, sp: 30, ai: 'wander' },
  mousegray:   { base: 'mouse', tint: 'grayscale(0.6) brightness(0.9)', hp: 2, dmg: 2, sp: 80, ai: 'chase' },
  bamboowild:  { base: 'bamboo', tint: 'hue-rotate(-30deg)', hp: 5, dmg: 3, sp: 35, ai: 'blinker', bolt: 'thorn' }
};
(function () {
  Object.keys(LV.VARIANTS).forEach(function (k) {
    const V = LV.VARIANTS[k], B = LV.CRITTERS[V.base];
    LV.CRITTERS[k] = { hp: V.hp, dmg: V.dmg, sp: V.sp, ai: ['charger', 'burrow', 'blinker'].indexOf(V.ai) >= 0 ? 'wander' : V.ai };
    const mk = LV.makeCritter(k);
    LV.ENEMIES[k] = function (x, y) {
      const e = mk(x, y); e.vkey = k; e.heavy = !!V.heavy; const upd = e.update, draw = e.draw;
      e.update = function (g, dt) {
        const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1;
        if (V.ai === 'charger') {
          // lines up, stamps, then runs at you until it hits a wall (and is dizzy for a moment)
          if (this.stun > 0 || this.kb > 0) return upd.call(this, g, dt);
          if (this.rush) { const px = this.x, py = this.y; LV.move(this, g.world, this.rush[0] * 170 * dt, this.rush[1] * 170 * dt, 'enemy'); this.anim += dt * 14; if (Math.abs(this.x - px) + Math.abs(this.y - py) < 0.5) { this.rush = null; this.stun = 1.2; g.sfx('clink'); } return; }
          if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) this.rush = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; return; }
          if ((Math.abs(dx) < 10 || Math.abs(dy) < 10) && d < 120 && this.cool <= 0) { this.wind = 0.45; this.cool = 2; this.dir = LV.dirFromVec(dx, dy, this.dir); return; }
          return upd.call(this, g, dt);
        }
        if (V.ai === 'burrow') {
          // underground (a moving mound, can't be hit) until close, then pops up for a while
          this.t += dt; if (this.inv > 0) this.inv -= dt; this.cool -= dt;
          if (this.kb > 0) { this.kb -= dt; LV.move(this, g.world, this.kbx * dt, this.kby * dt, 'enemy'); return; }
          if (this.under === undefined) { this.under = true; this.cool = 1; }
          if (this.under) { this.contact = 0; LV.move(this, g.world, dx / d * V.sp * dt, dy / d * V.sp * dt, 'enemy'); if (d < 24 && this.cool <= 0) { this.under = false; this.cool = 2.2; g.sfx('lift'); } return; }
          this.contact = V.dmg; this.anim += dt * 6; if (this.cool <= 0) { this.under = true; this.cool = 1.5; } return;
        }
        if (V.ai === 'blinker') {
          // vanishes and reappears somewhere else in the room, then fires
          this.t += dt; if (this.inv > 0) this.inv -= dt; this.cool -= dt;
          if (this.cool <= 0) {
            const a = g.world.areaAt(this.x, this.y - 8), w = g.world;
            for (let n = 0; n < 12; n++) { const tx = a[0] + 1 + Math.floor(g.rng() * (a[2] - 2)), ty = a[1] + 3 + Math.floor(g.rng() * (a[3] - 4)); if (w.c(tx, ty) === LV.C.OPEN && Math.hypot(tx * 16 - h.x, ty * 16 - h.y) > 40) { this.x = tx * 16 + 8; this.y = ty * 16 + 14; break; } }
            this.cool = 2.4; this.fire = 0.6; this.anim = 0;
          }
          if (this.fire > 0) { this.fire -= dt; if (this.fire <= 0) { g.shots.push(new LV.Bolt(this.x, this.y - 8, dx / d * 110, dy / d * 110, LV.BOLT[V.bolt])); g.sfx('throw'); } }
          this.anim += dt * 6; return;
        }
        if (V.ai === 'shooter' && this.cool <= 0.05 && d < 130 && !g.cloak) {
          this.cool = 99; upd.call(this, g, dt); this.cool = 2.2;
          const shoot = function (ang) { g.shots.push(new LV.Bolt(e.x, e.y - 8, Math.cos(ang) * 100, Math.sin(ang) * 100, LV.BOLT[V.bolt])); };
          const a0 = Math.atan2(dy, dx);
          if (V.ring) for (let k2 = 0; k2 < 6; k2++) shoot(k2 * Math.PI / 3); else if (V.triple) { shoot(a0 - 0.3); shoot(a0); shoot(a0 + 0.3); } else shoot(a0);
          g.sfx('throw'); return;
        }
        return upd.call(this, g, dt);
      };
      e.draw = function (ctx, ox, oy) {
        if (V.ai === 'burrow' && this.under) { const X = Math.round(this.x - ox), Y = Math.round(this.y - oy); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(X - 6, Y - 4, 12, 4); ctx.fillStyle = '#6a5a3a'; ctx.fillRect(X - 4, Y - 6, 8, 3); return; }
        if (V.ai === 'blinker' && this.cool > 2.1) return;
        const img = LV.IMG['m_' + this.key]; LV.IMG['m_' + this.key] = LV.IMG['m_' + V.base];
        ctx.save(); if (V.tint) ctx.filter = V.tint; draw.call(this, ctx, ox, oy); ctx.restore();
        LV.IMG['m_' + this.key] = img;
      };
      return e;
    };
  });
  // the shooters' own spit is replaced by bolts above; under-ground foes can't be hit
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (t.under) return null; return ah(game, hit, t); };
  // splitters break into two smaller ones
  const kill = LV.Game.prototype.kill;
  LV.Game.prototype.kill = function (a) {
    kill.call(this, a);
    const V = a.vkey && LV.VARIANTS[a.vkey];
    if (V && V.split && LV.ENEMIES[V.split]) for (let k = -1; k <= 1; k += 2) this.actors.push(LV.ENEMIES[V.split](a.x + k * 8, a.y));
  };
})();

/* ---------- traps: blades that slide when you line up with them, statues that spit fire. Neither can be hurt. ---------- */
LV.ENEMIES.blade = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 99, contact: 4, body: [-6, -6, 12, 6], hurt: [-7, -14, 14, 14], kind: 'trap' });
  e.invuln = true; e.trap = true; e.drop = false; e.home = { x: x, y: y }; e.go = null; e.back = false;
  e.update = function (g, dt) {
    this.t += dt; const h = g.hero, dx = h.x - this.x, dy = h.y - this.y;
    if (!this.go && !this.back && Math.hypot(dx, dy) < 150) {
      if (Math.abs(dy) < 10) this.go = [Math.sign(dx), 0]; else if (Math.abs(dx) < 10) this.go = [0, Math.sign(dy)];
    }
    if (this.go) { const px = this.x, py = this.y; LV.move(this, g.world, this.go[0] * 190 * dt, this.go[1] * 190 * dt, 'enemy'); if (Math.abs(this.x - px) + Math.abs(this.y - py) < 0.5) { this.go = null; this.back = true; g.sfx('clink'); } }
    else if (this.back) { const vx = this.home.x - this.x, vy = this.home.y - this.y, d = Math.hypot(vx, vy); if (d < 2) { this.x = this.home.x; this.y = this.home.y; this.back = false; } else LV.move(this, g.world, vx / d * 60 * dt, vy / d * 60 * dt, 'enemy'); }
  };
  e.draw = function (ctx, ox, oy) {
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy) - 8, s = this.go ? 1 : 0;
    ctx.fillStyle = '#101018'; ctx.fillRect(X - 7, Y - 7, 14, 14);
    ctx.fillStyle = '#7a7a90'; ctx.fillRect(X - 6, Y - 6, 12, 12); ctx.fillStyle = '#c8c8e0'; ctx.fillRect(X - 6, Y - 6, 12, 2);
    ctx.fillStyle = s ? '#f04040' : '#3a3a50'; ctx.fillRect(X - 2, Y - 2, 4, 4);
    ctx.fillStyle = '#e8e8f8'; [[-8, 0], [8, 0], [0, -8], [0, 8]].forEach(function (p) { ctx.fillRect(X + p[0] - (p[0] ? 1 : 2), Y + p[1] - (p[1] ? 1 : 2), p[0] ? 2 : 4, p[1] ? 2 : 4); });
  };
  return e;
};
LV.ENEMIES.turret = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 99, contact: 0, body: [-6, -6, 12, 6], hurt: [-7, -18, 14, 18], kind: 'trap' });
  e.invuln = true; e.trap = true; e.drop = false; e.cool = 1.5 + (x % 3) * 0.4;
  e.update = function (g, dt) {
    this.t += dt; this.cool -= dt; const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1;
    if (this.cool <= 0 && d < 140 && g.world.areaAt(this.x, this.y - 8) === g.area) { this.cool = 2.6; g.shots.push(new LV.Bolt(this.x, this.y - 12, dx / d * 95, dy / d * 95, LV.BOLT.fire)); g.sfx('throw'); }
  };
  e.draw = function (ctx, ox, oy) {
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), glow = this.cool < 0.5;
    ctx.fillStyle = '#101018'; ctx.fillRect(X - 7, Y - 20, 14, 20);
    ctx.fillStyle = '#6a6a7a'; ctx.fillRect(X - 6, Y - 19, 12, 18); ctx.fillStyle = '#9a9aac'; ctx.fillRect(X - 6, Y - 19, 12, 3);
    ctx.fillStyle = glow ? '#f8a030' : '#3a2a20'; ctx.fillRect(X - 4, Y - 14, 3, 3); ctx.fillRect(X + 1, Y - 14, 3, 3);
    ctx.fillStyle = '#2a2a34'; ctx.fillRect(X - 3, Y - 8, 6, 3);
  };
  return e;
};
// traps don't count as enemies for "clear the room"
(function () {
  const check = LV.Game.prototype.checkTriggers;
  LV.Game.prototype.checkTriggers = function (quiet) { const keep = this.actors; this.actors = keep.filter(function (a) { return !a.trap; }); try { check.call(this, quiet); } finally { this.actors = keep; } };
})();

/* ---------- big foes: one engine, many temperaments. cfg:
   art: ['m', sheet] (a pack monster drawn big) or ['b', boss strip]; scale; tint
   move: chase | dash | burrow | teleport | orbit | bounce | fly      weak: always | dazed | ranged
   attacks: [[kind, every, ...]]  aim n spread bolt | ring n bolt | summon kind max | rain n | stomp ---------- */
LV.makeBigFoe = function (cfg) {
  return function (x, y) {
    const sc = cfg.scale || 2, big = Math.round(8 * sc);
    const e = new LV.Actor({ x: x, y: y, hp: cfg.hp, contact: cfg.dmg || 4, body: [-big + 2, -8, big * 2 - 4, 8], hurt: [-big, -big * 2, big * 2, big * 2], kind: cfg.kind || 'bigfoe' });
    e.name = cfg.name; e.boss = !!cfg.boss; e.heavy = true; e.bigfoe = cfg; e.drop = false; e.state = 'move'; e.st = 0; e.anim = 0;
    e.timers = (cfg.attacks || []).map(function (a, i) { return a[1] * (0.6 + i * 0.3); });
    e.vx = 1; e.vy = 0.7; e.dir = 2;
    e.update = function (g, dt) {
      this.t += dt; this.st += dt; if (this.inv > 0) this.inv -= dt;
      const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1, w = g.world, a = w.areaAt(this.x, this.y - 8), self = this;
      if (!this.home) this.home = a;
      if (this.kb > 0) { this.kb -= dt; return; }
      const mv = cfg.move;
      const freeTile = function () { for (let n = 0; n < 30; n++) { const tx = a[0] + 2 + Math.floor(g.rng() * (a[2] - 4)), ty = a[1] + 4 + Math.floor(g.rng() * (a[3] - 6)); if (w.c(tx, ty) === LV.C.OPEN && w.c(tx - 1, ty) === LV.C.OPEN && w.c(tx + 1, ty) === LV.C.OPEN && Math.hypot(tx * 16 - h.x, ty * 16 - h.y) > 48) return [tx * 16 + 8, ty * 16 + 14]; } return [self.x, self.y]; };
      const clamp = function () { self.x = Math.max((a[0] + 1.5) * 16, Math.min((a[0] + a[2] - 1.5) * 16, self.x)); self.y = Math.max((a[1] + 4) * 16, Math.min((a[1] + a[3] - 1) * 16, self.y)); };
      // movement
      if (this.state === 'dazed') { if (this.st > (cfg.daze || 2)) { this.state = 'move'; this.st = 0; } return; }
      if (mv === 'chase') { LV.move(this, w, dx / d * cfg.sp * dt, dy / d * cfg.sp * dt, 'enemy'); this.anim += dt * 6; }
      else if (mv === 'dash') {
        if (this.state === 'move') { LV.move(this, w, dx / d * cfg.sp * 0.5 * dt, dy / d * cfg.sp * 0.5 * dt, 'enemy'); this.anim += dt * 5; if (this.st > 1.6 && (Math.abs(dx) < 14 || Math.abs(dy) < 14)) { this.state = 'wind'; this.st = 0; } }
        else if (this.state === 'wind') { if (this.st > 0.5) { this.state = 'rush'; this.st = 0; this.rush = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; } }
        else if (this.state === 'rush') { const px = this.x, py = this.y; LV.move(this, w, this.rush[0] * cfg.sp * 3 * dt, this.rush[1] * cfg.sp * 3 * dt, 'enemy'); this.anim += dt * 16; if (Math.abs(this.x - px) + Math.abs(this.y - py) < 0.5 || this.st > 2) { this.state = 'dazed'; this.st = 0; g.shake = 0.3; g.sfx('clink'); if (cfg.rainOnHit) for (let k = 0; k < cfg.rainOnHit; k++) { const p = freeTile(); g.shots.push(new LV.Fall(p[0], p[1])); } } }
      } else if (mv === 'burrow') {
        if (this.state === 'move') { this.under = true; LV.move(this, w, dx / d * cfg.sp * dt, dy / d * cfg.sp * dt, 'enemy'); if (this.st > 2.5 || d < 20) { this.state = 'emerge'; this.st = 0; this.under = false; g.shake = 0.25; g.sfx('lift'); } }
        else if (this.state === 'emerge') { if (this.st > 0.4) { this.state = 'dazed'; this.st = 0; this.fireAll(g, true); } }
      } else if (mv === 'teleport') {
        if (this.st > (cfg.blink || 2.6)) { const p = freeTile(); this.x = p[0]; this.y = p[1]; this.st = 0; this.fade = 0.5; g.sfx('spin'); }
        if (this.fade > 0) this.fade -= dt; this.anim += dt * 5;
      } else if (mv === 'orbit' || mv === 'fly') {
        const cx = (a[0] + a[2] / 2) * 16, cy = (a[1] + a[3] / 2 + 1) * 16, r = mv === 'orbit' ? 48 : 40 + Math.sin(this.t) * 20;
        const tx = cx + Math.cos(this.t * (cfg.sp / 60)) * r * 1.3, ty = cy + Math.sin(this.t * (cfg.sp / 60)) * r * 0.8;
        if (this.state === 'dive') { this.x += this.dv[0] * dt; this.y += this.dv[1] * dt; clamp(); if (this.st > 0.7) { this.state = 'dazed'; this.st = 0; g.shake = 0.2; } }
        else { this.x += (tx - this.x) * dt * 2; this.y += (ty - this.y) * dt * 2; clamp(); if (cfg.dive && this.st > cfg.dive) { this.state = 'dive'; this.st = 0; this.dv = [dx / d * 170, dy / d * 170]; } }
        this.anim += dt * 8;
      } else if (mv === 'bounce') {
        const px = this.x, py = this.y; this.x += this.vx * cfg.sp * dt; if (w.boxBlocked(this.bodyBox(), 'enemy')) { this.x = px; this.vx *= -1; } this.y += this.vy * cfg.sp * dt; if (w.boxBlocked(this.bodyBox(), 'enemy')) { this.y = py; this.vy *= -1; } clamp(); this.anim += dt * 6;
      }
      if (Math.abs(dx) + Math.abs(dy) > 1) this.dir = LV.dirFromVec(dx, dy, this.dir);
      if (this.under) return;
      // attacks
      this.timers = this.timers.map(function (t, i) { t -= dt; if (t <= 0) { self.attack(g, cfg.attacks[i]); t = cfg.attacks[i][1] * (self.hp < cfg.hp / 2 ? 0.7 : 1); } return t; });
    };
    e.fireAll = function (g, burst) { (cfg.attacks || []).forEach(function (at) { if (at[0] === 'ring' || burst && at[0] === 'aim') e.attack(g, at); }); };
    e.attack = function (g, at) {
      const h = g.hero, a0 = Math.atan2(h.y - 8 - (this.y - big), h.x - this.x), self = this, ox = this.x, oy = this.y - big;
      const bolt = function (ang, sp) { g.shots.push(new LV.Bolt(ox, oy, Math.cos(ang) * (sp || 105), Math.sin(ang) * (sp || 105), LV.BOLT[at[4] || at[3] || 'fire'], cfg.boltDmg || 2)); };
      if (at[0] === 'aim') { const n = at[2] || 1, sp = at[3] || 0.25; for (let k = 0; k < n; k++) bolt(a0 + (k - (n - 1) / 2) * sp); g.sfx('throw'); }
      else if (at[0] === 'ring') { const n = at[2] || 8, off = (this.t * 0.7) % 1; for (let k = 0; k < n; k++) bolt((k + off) * Math.PI * 2 / n, 80); g.sfx('spin'); }
      else if (at[0] === 'summon') { const max = at[3] || 3, kind = at[2]; if (g.actors.filter(function (x) { return x.summoned === self && !x.dead; }).length < max && LV.ENEMIES[kind]) { const m = LV.ENEMIES[kind](this.x + (g.rng() - 0.5) * 40, this.y + 12); m.summoned = this; m.drop = false; g.actors.push(m); g.sfx('spin'); } }
      else if (at[0] === 'rain') { const ar = g.world.areaAt(this.x, this.y - 8); for (let k = 0; k < (at[2] || 4); k++) { const px = (ar[0] + 1.5 + g.rng() * (ar[2] - 3)) * 16, py = (ar[1] + 4 + g.rng() * (ar[3] - 5)) * 16; g.shots.push(new LV.Fall(k === 0 ? h.x : px, k === 0 ? h.y : py, LV.BOLT[at[3] || 'rock'])); } g.shake = 0.2; }
      else if (at[0] === 'stomp') { g.shake = 0.4; g.sfx('down'); const n = 12; for (let k = 0; k < n; k++) g.shots.push(new LV.Bolt(this.x, this.y - 4, Math.cos(k * Math.PI * 2 / n) * 70, Math.sin(k * Math.PI * 2 / n) * 70, LV.BOLT.rock, 2)); }
    };
    e.draw = function (ctx, ox, oy) {
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
      if (this.under) { ctx.fillStyle = '#2a1e14'; ctx.fillRect(X - big, Y - 6, big * 2, 6); ctx.fillStyle = '#5a4a32'; ctx.fillRect(X - big + 4, Y - 10, big * 2 - 8, 5); ctx.fillStyle = '#7a6a4a'; ctx.fillRect(X - 4, Y - 13, 8, 3); return; }
      if (this.fade > 0 && Math.floor(this.fade * 20) % 2) return;
      const flash = this.inv > 0 && Math.floor(this.inv * 30) % 2, lift = (cfg.move === 'orbit' || cfg.move === 'fly') && this.state !== 'dazed' ? 10 + Math.round(Math.sin(this.t * 5) * 3) : 0;
      const shake = this.state === 'wind' ? Math.round(Math.sin(this.t * 60)) : 0;
      ctx.save(); ctx.filter = flash ? 'brightness(3)' : (cfg.tint || 'none');
      if (cfg.art[0] === 'm') {
        const img = LV.IMG['m_' + cfg.art[1]];
        if (img) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - big * 0.7, Y - 3, big * 1.4, 4); const col = [1, 3, 0, 2][this.dir], row = Math.floor(this.anim) % 4; ctx.drawImage(img, col * 16, row * 16, 16, 16, X - big + shake, Y - big * 2 - lift, big * 2, big * 2); }
      } else LV.drawBoss(ctx, cfg.art[1], X + shake, Y - lift, this.t, { scale: sc, filter: ctx.filter });
      ctx.restore();
      if (this.state === 'dazed') LV.stunStars(ctx, X, Y - big * 2 + 10, this.t);
      if (this.state === 'wind') { ctx.fillStyle = '#f8f8f8'; ctx.fillRect(X - 1, Y - big * 2 - 8 - lift, 2, 5); }
    };
    return e;
  };
};
// who can be hurt when: 'dazed' only after a charge into a wall, a dive or coming up from the ground; 'ranged' only by arrows, bombs and fire
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    const c = t.bigfoe;
    if (c && t.team !== hit.team) {
      if (t.under) return null;
      if (c.weak === 'dazed' && t.state !== 'dazed' && hit.kind !== 'bomb') { if (!hit.done.has(t)) { hit.done.add(t); game.sfx('clink'); } return 'immune'; }
      if (c.weak === 'ranged' && ['arrow', 'bomb', 'fire', 'beam'].indexOf(hit.kind) < 0) { if (!hit.done.has(t)) { hit.done.add(t); game.sfx('clink'); } return 'immune'; }
    }
    return ah(game, hit, t);
  };
})();

/* ---------- the new masters and mini-bosses ---------- */
LV.BIG = {
  // bosses
  grindmaw:     { name: 'Old Grindmaw', boss: true, art: ['m', 'mole'], scale: 3, hp: 14, sp: 60, move: 'burrow', weak: 'dazed', daze: 2.2, attacks: [['ring', 99, 10, 'rock']] },
  cairnskull:   { name: 'the Cairn Skull', boss: true, art: ['m', 'skullblue'], scale: 3, tint: 'grayscale(0.7) brightness(1.2)', hp: 14, sp: 55, move: 'bounce', attacks: [['ring', 3.2, 8, 'dark'], ['summon', 6, 'skull', 2]] },
  thornelder:   { name: 'the Thornwood Elder', boss: true, art: ['m', 'bamboo'], scale: 3, tint: 'hue-rotate(-20deg) saturate(1.4)', hp: 16, move: 'teleport', blink: 3, attacks: [['aim', 1.6, 5, 0.22, 'thorn'], ['summon', 7, 'larvatoxic', 3]] },
  stormowl:     { name: 'the Storm Owl', boss: true, art: ['m', 'owl'], scale: 3, tint: 'hue-rotate(190deg) saturate(1.5)', hp: 14, sp: 70, move: 'fly', dive: 3, weak: 'dazed', daze: 1.8, attacks: [['aim', 2.2, 3, 0.35, 'ice'], ['rain', 5, 3, 'ice']] },
  mirrorshade:  { name: 'the Mirror Shade', boss: true, art: ['b', 'spirit'], scale: 1.5, tint: 'hue-rotate(140deg) saturate(1.3) brightness(1.2)', hp: 16, move: 'teleport', blink: 2.2, attacks: [['aim', 1.4, 3, 0.3, 'dark'], ['summon', 5, 'mirrorecho', 2]] },
  glasseye:     { name: 'the Glass Eye', boss: true, art: ['m', 'eye'], scale: 3, tint: 'hue-rotate(160deg) brightness(1.3) saturate(0.7)', hp: 12, sp: 70, move: 'bounce', weak: 'ranged', attacks: [['ring', 2.6, 10, 'gold'], ['aim', 1.5, 1, 0, 'gold']] },
  pitboss:      { name: 'the Pit Boss', boss: true, art: ['m', 'cyclope'], scale: 3, tint: 'hue-rotate(40deg) saturate(2) brightness(1.1)', hp: 22, dmg: 6, sp: 70, move: 'dash', weak: 'dazed', daze: 1.8, rainOnHit: 6, attacks: [['summon', 6, 'beastgold', 2], ['aim', 2, 5, 0.25, 'gold']] },
  // mini-bosses
  gravekeeper:  { name: 'the Gravekeeper', art: ['m', 'skull'], scale: 2.2, hp: 10, sp: 45, move: 'chase', attacks: [['summon', 4, 'bluebat', 2]] },
  ratfence:     { name: 'the Fence', art: ['m', 'mouse'], scale: 2.4, tint: 'grayscale(0.4)', hp: 10, sp: 60, move: 'dash', weak: 'dazed', attacks: [['aim', 2.5, 3, 0.3, 'dark']] },
  rimelizard:   { name: 'the Rime Lizard', art: ['m', 'lizard'], scale: 2.4, tint: 'hue-rotate(150deg)', hp: 10, sp: 45, move: 'chase', attacks: [['aim', 2, 3, 0.25, 'ice']] },
  mireoctopus:  { name: 'the Mire Octopus', art: ['m', 'octopus'], scale: 2.4, hp: 10, sp: 40, move: 'teleport', blink: 3, attacks: [['ring', 2.4, 8, 'thorn']] },
  magmagecko:   { name: 'the Magma Gecko', art: ['m', 'reptile2'], scale: 2.4, tint: 'hue-rotate(-40deg) saturate(2)', hp: 12, sp: 60, move: 'dash', weak: 'dazed', attacks: [['aim', 3, 3, 0.3, 'fire']] },
  bouncer:      { name: 'the Bouncer', art: ['m', 'beast'], scale: 2.6, tint: 'hue-rotate(40deg) saturate(2)', hp: 14, sp: 60, move: 'dash', weak: 'dazed', attacks: [['stomp', 4]] },
  tunnelspider: { name: 'the Tunnel Spider', art: ['m', 'spiderred'], scale: 2.4, hp: 10, sp: 70, move: 'chase', attacks: [['summon', 4, 'spiderred', 3]] },
  barrowshroom: { name: 'the Barrow Shroom', art: ['m', 'mushroom'], scale: 2.4, tint: 'hue-rotate(250deg) saturate(1.6)', hp: 10, sp: 25, move: 'chase', attacks: [['ring', 2.8, 8, 'spore']] },
  thorngrub:    { name: 'the Thorn Grub', art: ['m', 'larva'], scale: 2.6, tint: 'hue-rotate(60deg) saturate(1.8)', hp: 10, sp: 50, move: 'burrow', weak: 'dazed', attacks: [['ring', 99, 8, 'thorn']] },
  galebat:      { name: 'the Gale Bat', art: ['m', 'bluebat'], scale: 2.4, hp: 8, sp: 80, move: 'fly', dive: 2.5, attacks: [['aim', 2.5, 2, 0.4, 'ice']] },
  twinsnake:    { name: 'the Twin Snake', art: ['m', 'snake'], scale: 2.4, tint: 'hue-rotate(120deg)', hp: 10, sp: 50, move: 'chase', attacks: [['aim', 1.8, 2, 0.5, 'dark'], ['summon', 6, 'snake', 2]] },
  glassslime:   { name: 'the Glass Slime', art: ['m', 'slime3'], scale: 2.6, tint: 'hue-rotate(170deg) brightness(1.3) saturate(0.6)', hp: 12, sp: 55, move: 'bounce', attacks: [['summon', 3.5, 'slime3', 3]] },
  // the Mirror Shade's reflections: one hit and they shatter
  mirrorecho:   { name: 'a reflection', art: ['b', 'spirit'], scale: 1.2, tint: 'hue-rotate(140deg) brightness(1.6) opacity(0.6)', hp: 1, move: 'teleport', blink: 1.8, attacks: [['aim', 2, 1, 0, 'dark']] }
};
Object.keys(LV.BIG).forEach(function (k) { LV.ENEMIES[k] = LV.makeBigFoe(LV.BIG[k]); });

/* ---------- in the big dungeons only the room you're in is awake (as in ALttP), so 70-room floors stay smooth ---------- */
(function () {
  const upd = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    const w = this.world, a = this.area;
    if (!w || !w.def.floorName || !a || this.scroll) return upd.call(this, dt);
    const T = 16, inside = function (e) { return e.x >= a[0] * T && e.x < (a[0] + a[2]) * T && e.y >= a[1] * T && e.y < (a[1] + a[3]) * T + 16; };
    const all = this.actors, awake = all.filter(inside), asleep = all.filter(function (e) { return !inside(e); });
    this.actors = awake;
    try { upd.call(this, dt); } finally { if (this.world === w) this.actors = this.actors.concat(asleep.filter(function (e) { return !e.dead; })); }
  };
})();
// and only what's on screen is drawn (tinted sprites are costly to draw, even off screen)
(function () {
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () {
    const all = this.actors; if (!all || !this.cam) return render.call(this);
    const cx = this.cam.x, cy = this.cam.y, W = LV.VIEW_W, H = LV.VIEW_H;
    this.actors = all.filter(function (e) { return e.x > cx - 48 && e.x < cx + W + 48 && e.y > cy - 32 && e.y < cy + H + 80; });
    try { render.call(this); } finally { this.actors = all; }
  };
})();
