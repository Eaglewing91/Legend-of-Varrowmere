/* ================= Entities, movement and combat rules =================
   Every actor has:
     x, y      position of the centre of its feet (world px)
     body      collision box against tiles, relative to (x, y)
     hurt      box that can be damaged, relative to (x, y)
   Attacks are separate "hit" records with their own boxes, checked each step.
   This keeps walking collision (small, at the feet) apart from fighting (the whole body), as in the original. */

LV.Entity = function (o) {
  this.x = o.x || 0; this.y = o.y || 0; this.vx = 0; this.vy = 0;
  this.body = o.body || { x: -8, y: -6, w: 16, h: 12 };
  this.hurt = o.hurt || { x: -10, y: -26, w: 20, h: 28 };
  this.team = o.team || 'enemy';       // 'hero' | 'enemy' | 'neutral'
  this.hp = o.hp || 1; this.maxHp = this.hp;
  this.dir = o.dir === undefined ? 2 : o.dir;
  this.inv = 0;                        // invincibility timer (s)
  this.kb = 0; this.kbx = 0; this.kby = 0;   // knockback timer and velocity
  this.dead = false; this.t = 0;
  this.contact = o.contact || 0;       // damage dealt by touching the hero (in quarter hearts)
  this.weak = o.weak || null;          // only these attack kinds hurt it (e.g. ['arrow','bomb']), null = any
  this.flying = !!o.flying;
  this.kind = o.kind || 'thing';
};
LV.Entity.prototype.box = function (rel) { return { x: this.x + rel.x, y: this.y + rel.y, w: rel.w, h: rel.h }; };
LV.Entity.prototype.bodyBox = function () { return this.box(this.body); };
LV.Entity.prototype.hurtBox = function () { return this.box(this.hurt); };

/* Move with tile collision, one axis at a time (so you slide along walls).
   nudge: when walking straight into a wall corner, slip sideways round it (the original's forgiving corners). */
LV.moveEntity = function (e, map, dx, dy, opts) {
  opts = opts || {};
  const step = function (ax, d) {
    if (!d) return true;
    const n = Math.ceil(Math.abs(d) / 4), part = d / n;
    for (let i = 0; i < n; i++) {
      if (ax === 'x') e.x += part; else e.y += part;
      if (map.boxSolid(e.bodyBox(), opts)) { if (ax === 'x') e.x -= part; else e.y -= part; return false; }
    }
    return true;
  };
  const okx = step('x', dx), oky = step('y', dy);
  if (opts.nudge && ((!okx && dx && !dy) || (!oky && dy && !dx))) {
    // try sliding up to 10 px sideways to get round a corner
    const T = LV.TILE;
    for (let s = 1; s <= 10; s++) for (const sg of [1, -1]) {
      const ox = e.x, oy = e.y;
      if (dx) e.y += sg * s; else e.x += sg * s;
      const b = e.bodyBox(); if (dx) b.x += LV.sign(dx) * 2; else b.y += LV.sign(dy) * 2;
      if (!map.boxSolid(e.bodyBox(), opts) && !map.boxSolid(b, opts)) {
        e.x = ox; e.y = oy;
        if (dx) e.y += sg * Math.min(s, 1.5); else e.x += sg * Math.min(s, 1.5);
        return { x: okx, y: oky, nudged: true };
      }
      e.x = ox; e.y = oy;
    }
  }
  return { x: okx, y: oky };
};

/* A hit: an attack box that lasts while its owner keeps it alive.
   kind: 'blade' 'spin' 'arrow' 'bomb' 'fire' 'ice' 'hammer' 'thrown' 'dice' 'contact' 'beam'
   power: damage in quarter hearts; tier: what shield level it takes to block (0 = can't be blocked)
   from: source point used for knockback direction and shield facing. */
LV.Hit = function (o) {
  this.owner = o.owner; this.team = o.team; this.kind = o.kind; this.power = o.power || 1; this.tier = o.tier || 0;
  this.boxes = o.boxes || []; this.from = o.from; this.hitOnce = o.hitOnce !== false; this.done = new Set();
  this.knock = o.knock === undefined ? 1 : o.knock; this.stun = o.stun || 0;
};

/* Apply a hit to a target. Returns 'hit' | 'blocked' | 'immune' | null. */
LV.applyHit = function (game, hit, target) {
  if (target.dead || target.team === hit.team || hit.done.has(target)) return null;
  if (target.inv > 0) return null;
  // Shield: the hero blocks projectiles from the front while not attacking, if the shield tier is high enough.
  if (target.isHero && hit.tier && target.shieldTier >= hit.tier && target.canShield()) {
    const d = LV.DIRS[target.dir], fx = hit.from.x - target.x, fy = hit.from.y - (target.y - 14);
    if (fx * d.x + fy * d.y > 0 && Math.abs(d.x ? fy : fx) < Math.abs(d.x ? fx : fy) + 8) { hit.done.add(target); if (hit.onBlock) hit.onBlock(target); return 'blocked'; }
  }
  if (target.weak && target.weak.indexOf(hit.kind) < 0) { hit.done.add(target); if (target.onClank) target.onClank(hit); return 'immune'; }
  if (target.onHit && target.onHit(hit) === false) { hit.done.add(target); return 'immune'; }
  hit.done.add(target);
  let dmg = hit.power;
  if (target.isHero) dmg = Math.max(1, Math.round(dmg * target.armourMult()));
  target.hp -= dmg;
  // knockback away from the hit's source
  const c = { x: target.x, y: target.y - 12 }, ax = c.x - hit.from.x, ay = c.y - hit.from.y, len = Math.hypot(ax, ay) || 1;
  if (hit.knock && !target.heavy) { target.kb = target.isHero ? 0.2 : 0.18; target.kbx = ax / len * 260 * hit.knock; target.kby = ay / len * 260 * hit.knock; }
  target.inv = target.isHero ? 1.0 : 0.3;
  if (hit.stun) target.stunned = Math.max(target.stunned || 0, hit.stun);
  if (target.hp <= 0) { target.hp = 0; if (target.isHero) game.heroDown(); else game.kill(target, hit); }
  else if (game.sfx) game.sfx(target.isHero ? 'hurt' : 'hit');
  return 'hit';
};
