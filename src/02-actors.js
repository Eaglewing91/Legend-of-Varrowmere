/* ================= Actors, movement and combat =================
   Every actor: x, y = centre of its feet (px). body = box for walls (at the feet). hurt = box that takes damage.
   Attacks are boxes checked each step against hurt boxes. Damage is in quarter hearts (4 = one heart). */
LV.box = function (e, r) { return { x: e.x + r[0], y: e.y + r[1], w: r[2], h: r[3] }; };

LV.Actor = function (o) {
  this.x = o.x; this.y = o.y; this.dir = o.dir === undefined ? 2 : o.dir;
  this.body = o.body || [-6, -6, 12, 6]; this.hurt = o.hurt || [-6, -18, 12, 18];
  this.hp = o.hp || 1; this.maxHp = this.hp; this.team = o.team || 'enemy';
  this.inv = 0; this.kb = 0; this.kbx = 0; this.kby = 0; this.dead = false; this.t = 0; this.stun = 0;
  this.contact = o.contact || 0; this.kind = o.kind || 'actor';
};
LV.Actor.prototype.bodyBox = function () { return LV.box(this, this.body); };
LV.Actor.prototype.hurtBox = function () { return LV.box(this, this.hurt); };

/* Move with tile collision one axis at a time (slide along walls).
   With nudge, walking straight into a wall corner slips you round it, as in the original. */
LV.move = function (e, world, dx, dy, mode, nudge) {
  const one = function (ax, d) {
    if (!d) return true;
    const n = Math.max(1, Math.ceil(Math.abs(d))), part = d / n;
    for (let i = 0; i < n; i++) {
      if (ax === 'x') e.x += part; else e.y += part;
      if (world.boxBlocked(e.bodyBox(), mode)) { if (ax === 'x') e.x -= part; else e.y -= part; return false; }
    }
    return true;
  };
  const okx = one('x', dx), oky = one('y', dy);
  if (nudge && ((!okx && dx && !dy) || (!oky && dy && !dx))) {
    for (let s = 1; s <= 7; s++) for (const sg of [-1, 1]) {
      const b = e.bodyBox();
      if (dx) { b.y += sg * s; } else { b.x += sg * s; }
      const ahead = { x: b.x + (dx ? LV.sign(dx) : 0), y: b.y + (dy ? LV.sign(dy) : 0), w: b.w, h: b.h };
      if (!world.boxBlocked(b, mode) && !world.boxBlocked(ahead, mode)) {
        if (dx) e.y += sg; else e.x += sg;
        return { x: okx, y: oky, nudged: true };
      }
    }
  }
  return { x: okx, y: oky };
};

/* An attack. kind: blade spin arrow bomb fire contact thrown; power in quarter hearts (or hits for enemies);
   tier: shield level needed to block it (0 = can't be blocked). from: point used for knockback and shield facing. */
LV.Hit = function (o) {
  this.team = o.team; this.kind = o.kind; this.power = o.power || 1; this.tier = o.tier || 0;
  this.box = o.box; this.from = o.from; this.done = o.done || new Set(); this.knock = o.knock === undefined ? 1 : o.knock;
};

LV.applyHit = function (game, hit, t) {
  if (t.dead || t.team === hit.team || hit.done.has(t) || t.inv > 0) return null;
  hit.done.add(t);
  if (t.isHero && hit.tier && t.blocks(hit)) { game.sfx('clink'); return 'blocked'; }
  if (t.immune && t.immune.indexOf(hit.kind) >= 0) { game.sfx('clink'); return 'immune'; }
  const dmg = t.isHero ? Math.max(1, Math.round(hit.power * t.armour())) : hit.power;
  t.hp -= dmg;
  const ax = t.x - hit.from.x, ay = (t.y - 8) - hit.from.y, len = Math.hypot(ax, ay) || 1;
  if (hit.knock && !t.heavy) { t.kb = t.isHero ? 0.16 : 0.14; t.kbx = ax / len * 220; t.kby = ay / len * 220; }
  t.inv = t.isHero ? 1.0 : 0.25;
  if (t.hp <= 0) { t.hp = 0; if (t.isHero) game.heroDown(); else game.kill(t); }
  else game.sfx(t.isHero ? 'hurt' : 'hit');
  return 'hit';
};

/* ---------- the hero ----------
   States: walk, attack, charge (blade held), spin, hurt (knockback), fall (pit/deep water), lift, carry, read. */
LV.Hero = function (x, y) {
  LV.Actor.call(this, { x: x, y: y, team: 'hero', hp: 12, body: [-5, -6, 10, 6], hurt: [-6, -18, 12, 18] });
  this.isHero = true; this.kind = 'hero'; this.state = 'walk'; this.st = 0; this.anim = 0; this.moving = false;
  this.blade = 1; this.shield = 1; this.armourLv = 0; this.charge = 0; this.hitSet = null; this.carry = null;
  this.safe = { x: x, y: y };    // last safe spot (respawn after pits)
};
LV.Hero.prototype = Object.create(LV.Actor.prototype);
LV.Hero.prototype.armour = function () { return [1, 0.5, 0.25][this.armourLv]; };
LV.Hero.prototype.canShield = function () { return this.shield > 0 && (this.state === 'walk' || this.state === 'charge'); };
// Shield blocks projectiles hitting from the front (within the facing half), as in the original
LV.Hero.prototype.blocks = function (hit) {
  if (!this.canShield() || this.shield < hit.tier) return false;
  const d = LV.DIRS[this.dir], fx = hit.from.x - this.x, fy = hit.from.y - (this.y - 8);
  return fx * d.x + fy * d.y > Math.abs(d.x ? fy : fx) * 0.5;
};
// Blade: angle (degrees, 0 = right, 90 = down) for each of the 4 swing frames, per facing (0 up,1 right,2 down,3 left)
LV.SWING = [[0, -45, -90, -90], [90, 45, 0, 0], [180, 135, 90, 90], [90, 135, 180, 180]];
LV.SWING_T = 0.24;
LV.Hero.prototype.bladeBox = function (angleDeg, reach) {
  const a = angleDeg * Math.PI / 180, cx = this.x + Math.cos(a) * reach, cy = this.y - 8 + Math.sin(a) * reach;
  return { x: cx - 7, y: cy - 7, w: 14, h: 14 };
};
LV.Hero.prototype.update = function (g, dt) {
  const inp = g.input; this.t += dt; this.st += dt;
  if (this.inv > 0) this.inv -= dt;
  if (this.kb > 0) { this.kb -= dt; LV.move(this, g.world, this.kbx * dt, this.kby * dt, 'hero'); if (this.kb <= 0 && this.state === 'hurt') this.state = 'walk'; return; }
  const ax = inp.axis();
  switch (this.state) {
    case 'walk': {
      if (inp.pressed.attack) { this.startAttack(g); return; }
      if (inp.pressed.action) { if (g.interact(this)) return; }
      if (inp.pressed.item) { g.useItem(this); if (this.state !== 'walk') return; }
      const sp = 84, len = Math.hypot(ax.x, ax.y) || 1;
      this.moving = !!(ax.x || ax.y);
      if (this.moving) {
        this.dir = LV.dirFromVec(ax.x, ax.y, this.dir);
        const r = LV.move(this, g.world, ax.x / len * sp * dt, ax.y / len * sp * dt, 'hero', true);
        this.pushing = (!r.x && ax.x && !ax.y) || (!r.y && ax.y && !ax.x);
        this.anim += dt * 8;
      } else { this.anim = 0; this.pushing = false; }
      this.checkGround(g);
      break;
    }
    case 'attack': {
      const f = Math.min(3, Math.floor(this.st / LV.SWING_T * 4));
      const hit = new LV.Hit({ team: 'hero', kind: 'blade', power: this.blade, from: { x: this.x, y: this.y - 8 }, box: this.bladeBox(LV.SWING[this.dir][f], 13), done: this.hitSet });
      g.resolveHit(hit, true);
      if (this.st >= LV.SWING_T) {
        if (inp.held.attack) { this.state = 'charge'; this.st = 0; this.charge = 0; }
        else { this.state = 'walk'; this.st = 0; }
      }
      break;
    }
    case 'charge': {   // blade held out: walk slowly without turning, release when charged for a Spin Attack
      this.charge += dt;
      const sp = 50, len = Math.hypot(ax.x, ax.y) || 1;
      if (ax.x || ax.y) { LV.move(this, g.world, ax.x / len * sp * dt, ax.y / len * sp * dt, 'hero', true); this.anim += dt * 6; }
      // poke: the held blade still hurts what it touches
      g.resolveHit(new LV.Hit({ team: 'hero', kind: 'blade', power: this.blade, from: { x: this.x, y: this.y - 8 }, box: this.bladeBox(LV.SWING[this.dir][3], 12), done: new Set() }), true, true);
      if (!inp.held.attack) {
        if (this.charge >= 0.8) { this.state = 'spin'; this.st = 0; this.hitSet = new Set(); g.sfx('spin'); }
        else { this.state = 'walk'; this.st = 0; }
      }
      this.checkGround(g);
      break;
    }
    case 'spin': {
      const T = 0.42, a = (LV.SWING[this.dir][2] + this.st / T * 360);
      g.resolveHit(new LV.Hit({ team: 'hero', kind: 'spin', power: this.blade * 2, from: { x: this.x, y: this.y - 8 }, box: this.bladeBox(a, 15), done: this.hitSet }), true);
      if (this.st >= T) { this.state = 'walk'; this.st = 0; }
      break;
    }
    case 'item': { if (this.st > 0.2) { this.state = 'walk'; this.st = 0; } break; }
    case 'fall': {
      if (this.st > 0.6) { this.x = this.safe.x; this.y = this.safe.y; this.state = 'walk'; this.st = 0; this.hp -= 2; this.inv = 0.8; g.sfx('hurt'); if (this.hp <= 0) { this.hp = 0; g.heroDown(); } }
      break;
    }
    case 'carry': {
      if (inp.pressed.action || inp.pressed.attack) { g.throwCarried(this); this.state = 'walk'; break; }
      const sp = 70, len = Math.hypot(ax.x, ax.y) || 1;
      this.moving = !!(ax.x || ax.y);
      if (this.moving) { this.dir = LV.dirFromVec(ax.x, ax.y, this.dir); LV.move(this, g.world, ax.x / len * sp * dt, ax.y / len * sp * dt, 'hero', true); this.anim += dt * 7; }
      this.checkGround(g);
      break;
    }
  }
};
LV.Hero.prototype.startAttack = function (g) {
  this.state = 'attack'; this.st = 0; this.hitSet = new Set(); g.sfx('swing');
};
// Pits and deep water: fall in and come back at the last safe spot. Otherwise remember this spot as safe.
LV.Hero.prototype.checkGround = function (g) {
  const c = g.world.cAt(this.x, this.y - 3);
  if (c === LV.C.PIT || (c === LV.C.DEEP && !g.save.items.fins)) { this.state = 'fall'; this.st = 0; g.sfx(c === LV.C.PIT ? 'fall' : 'splash'); return; }
  const cs = [g.world.cAt(this.x - 5, this.y - 6), g.world.cAt(this.x + 5, this.y - 6), g.world.cAt(this.x - 5, this.y - 1), g.world.cAt(this.x + 5, this.y - 1)];
  if (cs.every(function (v) { return v === LV.C.OPEN || v === LV.C.SHALLOW; })) { this.safe.x = this.x; this.safe.y = this.y; }
};
// Sprite frame from the pack sheet: walk rows 0 down,1 right,2 up,3 left (16x32); attack rows 4 down,5 up,6 right,7 left (32x32)
LV.HERO_ROW = [2, 1, 0, 3];
LV.ATK_ROW = [1, 2, 0, 3];   // index into the 4 attack rows (sheet rows 4 down, 5 up, 6 right, 7 left)
LV.Hero.prototype.draw = function (ctx, ox, oy) {
  if (this.inv > 0 && Math.floor(this.inv * 20) % 2 && this.state !== 'fall') return;
  const img = LV.IMG.hero, X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
  if (this.state === 'fall') { const s = Math.max(0, 1 - this.st / 0.6); const w = 16 * s, h = 32 * s; ctx.drawImage(img, 0, 0, 16, 32, X - w / 2, Y - h * 0.9, w, h); return; }
  if (this.state === 'attack' || this.state === 'spin') {
    let f = Math.min(3, Math.floor(this.st / LV.SWING_T * 4)), d = this.dir;
    if (this.state === 'spin') { d = [2, 1, 0, 3][Math.floor(this.st / 0.42 * 4) % 4]; f = 2; }
    ctx.drawImage(img, f * 32, 128 + LV.ATK_ROW[d] * 32, 32, 32, X - 16, Y - 28, 32, 32);
    return;
  }
  if (this.state === 'item') { ctx.drawImage(img, 0, LV.HERO_ROW[this.dir] * 32, 16, 32, X - 8, Y - 28, 16, 32); return; }
  if (this.state === 'charge') { ctx.drawImage(img, 3 * 32, 128 + LV.ATK_ROW[this.dir] * 32, 32, 32, X - 16, Y - 28, 32, 32); if (this.charge >= 0.8 && Math.floor(this.t * 16) % 2) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(X - 1, Y - 30, 2, 2); } return; }
  let col = this.moving ? Math.floor(this.anim) % 4 : 0;
  if (this.state === 'carry') col = 9 + (this.moving ? Math.floor(this.anim) % 4 : 0);
  else if (this.pushing) col = 5 + Math.floor(this.anim / 2) % 3;
  ctx.drawImage(img, col * 16, LV.HERO_ROW[this.dir] * 32, 16, 32, X - 8, Y - 28, 16, 32);
};

/* ---------- enemies ---------- */
LV.ENEMIES = {};
// The living log: sleeps until you come close, then waddles after you. Touching it costs half a heart.
LV.ENEMIES.log = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 3, contact: 2, body: [-6, -6, 12, 6], hurt: [-7, -20, 14, 20], kind: 'log' });
  e.state = 'sleep'; e.speed = 34; e.wander = 0; e.wx = 0; e.wy = 0; e.drop = true; e.weakToDice = true;
  e.update = function (g, dt) {
    this.t += dt; if (this.inv > 0) this.inv -= dt;
    if (this.kb > 0) { this.kb -= dt; LV.move(this, g.world, this.kbx * dt, this.kby * dt, 'enemy'); return; }
    if (this.stun > 0) { this.stun -= dt; return; }
    const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy);
    if (this.state === 'sleep') { if (d < 56) { this.state = 'wake'; this.t = 0; } return; }
    if (this.state === 'wake') { if (this.t > 0.5) { this.state = 'chase'; this.t = 0; } return; }
    if (d > 120) { this.state = 'sleep'; return; }
    const vx = dx / (d || 1) * this.speed * dt, vy = dy / (d || 1) * this.speed * dt;
    LV.move(this, g.world, vx, vy, 'enemy');
    this.dir = LV.dirFromVec(dx, dy, this.dir);
  };
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const row = [1, 2, 0, 3][this.dir];
    const col = this.state === 'sleep' ? 4 : this.state === 'wake' ? 5 : Math.floor(this.t * 6) % 4;
    ctx.drawImage(LV.IMG.log, col * 32, (this.state === 'sleep' || this.state === 'wake' ? 0 : row) * 32, 32, 32, Math.round(this.x - ox - 16), Math.round(this.y - oy - 28), 32, 32);
  };
  return e;
};

/* ---------- pickups and effects ---------- */
LV.Pickup = function (x, y, kind) { this.x = x; this.y = y; this.kind = kind; this.t = 0; this.dead = false; this.life = 8; };
LV.Pickup.prototype.box = function () { return { x: this.x - 5, y: this.y - 8, w: 10, h: 9 }; };
LV.Pickup.prototype.update = function (g, dt) { this.t += dt; if (this.t > this.life) this.dead = true; };
LV.Pickup.prototype.draw = function (ctx, ox, oy) {
  if (this.t > this.life - 2 && Math.floor(this.t * 10) % 2) return;
  const b = Math.abs(Math.sin(Math.min(this.t, 0.6) * 8)) * Math.max(0, 4 - this.t * 7), X = Math.round(this.x - ox), Y = Math.round(this.y - oy - b);
  const o = LV.IMG.objects;
  if (this.kind === 'heart') ctx.drawImage(o, 0, 32, 16, 16, X - 8, Y - 12, 16, 16);
  else ctx.drawImage(o, this.kind === 'cash5' ? 16 : 0, 64, 16, 16, X - 8, Y - 12, 16, 16);
};
LV.Effect = function (x, y, kind) { this.x = x; this.y = y; this.kind = kind; this.t = 0; this.dead = false; };
LV.Effect.prototype.update = function (g, dt) { this.t += dt; if (this.t > 0.4) this.dead = true; };
LV.Effect.prototype.draw = function (ctx, ox, oy) {
  const f = Math.min(5, Math.floor(this.t / 0.4 * 6)), X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
  // poof: the pack's smoke frames (objects sheet row 4, 32 px apart)
  ctx.drawImage(LV.IMG.objects, 64 + f * 32, 64, 32, 32, X - 16, Y - 24, 32, 32);
};
