/* ================= Monsters from the Ninja Adventure pack (CC0) =================
   Sheets are 4 x 4 frames of 16 px: columns face down, up, left, right; rows are the walk cycle.
   Behaviours: chase, wander, flyer (crosses water and pits, flits about), hopper (springs at you), shooter (keeps away, spits). */
LV.CRITTERS = {
  skull: { hp: 3, dmg: 2, sp: 40, ai: 'chase' }, skullblue: { hp: 5, dmg: 4, sp: 55, ai: 'chase' }, bluebat: { hp: 1, dmg: 2, sp: 70, ai: 'flyer' },
  slime: { hp: 2, dmg: 2, sp: 60, ai: 'hopper' }, slime3: { hp: 4, dmg: 2, sp: 70, ai: 'hopper' }, mushroom: { hp: 2, dmg: 2, sp: 25, ai: 'wander' },
  eye: { hp: 3, dmg: 2, sp: 30, ai: 'shooter' }, cyclope: { hp: 6, dmg: 4, sp: 30, ai: 'chase' }, beast: { hp: 5, dmg: 4, sp: 50, ai: 'chase' },
  snake: { hp: 2, dmg: 2, sp: 60, ai: 'wander' }, octopus: { hp: 3, dmg: 2, sp: 30, ai: 'shooter' }, owl: { hp: 2, dmg: 2, sp: 60, ai: 'flyer' },
  lizard: { hp: 3, dmg: 2, sp: 45, ai: 'chase' }, mole: { hp: 3, dmg: 2, sp: 40, ai: 'chase' }, spiderred: { hp: 2, dmg: 2, sp: 75, ai: 'chase' },
  larva: { hp: 1, dmg: 1, sp: 20, ai: 'wander' }, mouse: { hp: 1, dmg: 1, sp: 70, ai: 'wander' }, reptile2: { hp: 4, dmg: 4, sp: 45, ai: 'chase' },
  bamboo: { hp: 4, dmg: 2, sp: 30, ai: 'wander' }, butterfly: { hp: 1, dmg: 0, sp: 30, ai: 'ambient' }
};
LV.makeCritter = function (key) {
  const D = LV.CRITTERS[key];
  return function (x, y) {
    const e = new LV.Actor({ x: x, y: y, hp: D.hp, contact: D.dmg, body: [-5, -5, 10, 5], hurt: [-6, -14, 12, 14], kind: 'critter' });
    e.key = key; e.ai = D.ai; e.anim = 0; e.wx = 0; e.wy = 0; e.wt = 0; e.cool = 1 + (x % 3); e.drop = D.ai !== 'ambient'; e.weakToDice = true; e.hop = 0;
    if (D.ai === 'ambient') { e.invuln = true; e.contact = 0; }
    e.update = function (g, dt) {
      this.t += dt; if (this.inv > 0) this.inv -= dt; this.cool -= dt;
      if (this.kb > 0) { this.kb -= dt; LV.move(this, g.world, this.kbx * dt, this.kby * dt, 'enemy'); return; }
      if (this.stun > 0) { this.stun -= dt; return; }
      const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1, cloaked = g.cloak;
      const fly = this.ai === 'flyer' || this.ai === 'ambient';
      const go = function (self, vx, vy) {
        if (fly) { const c1 = g.world.cAt(self.x + vx, self.y - 4), c2 = g.world.cAt(self.x, self.y - 4 + vy); const wall = function (c) { return c === LV.C.SOLID || c === LV.C.SHUTTER || c === LV.C.LOCKED || c === LV.C.BIGLOCK; }; if (!wall(c1)) self.x += vx; if (!wall(c2)) self.y += vy; return; }
        LV.move(self, g.world, vx, vy, 'enemy');
      };
      this.wt -= dt; if (this.wt <= 0) { const a = g.rng() * 6.28; this.wx = Math.cos(a); this.wy = Math.sin(a); this.wt = 0.8 + g.rng() * 1.5; }
      let vx = this.wx, vy = this.wy;
      if (this.ai === 'chase' && d < 110 && !cloaked) { vx = dx / d; vy = dy / d; }
      if (this.ai === 'flyer') { vx = (d < 120 && !cloaked ? dx / d : this.wx) + Math.sin(this.t * 7) * 0.8; vy = (d < 120 && !cloaked ? dy / d : this.wy) + Math.cos(this.t * 5) * 0.8; }
      if (this.ai === 'shooter') {
        const want = d < 50 ? -1 : d > 90 ? 1 : 0; vx = want * dx / d + this.wx * 0.4; vy = want * dy / d + this.wy * 0.4;
        if (this.cool <= 0 && d < 130 && !cloaked) { this.cool = 2.2; g.shots.push(new LV.Spit(this.x, this.y - 8, h.x, h.y - 8)); g.sfx('throw'); }
      }
      if (this.ai === 'hopper') {
        this.hop -= dt; if (this.hop > 0.3) { go(this, this.hx * D.sp * 2.2 * dt, this.hy * D.sp * 2.2 * dt); this.anim += dt * 10; return; }
        if (this.hop <= -0.6) { this.hop = 0.6; if (d < 110 && !cloaked) { this.hx = dx / d; this.hy = dy / d; } else { this.hx = this.wx; this.hy = this.wy; } }
        return;
      }
      go(this, vx * D.sp * dt, vy * D.sp * dt); this.anim += dt * 7;
      if (Math.abs(vx) + Math.abs(vy) > 0.1) this.dir = LV.dirFromVec(vx, vy, this.dir);
    };
    e.draw = function (ctx, ox, oy) {
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const img = LV.IMG['m_' + this.key]; if (!img) return;
      const col = [1, 3, 0, 2][this.dir], row = Math.floor(this.anim) % 4, X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
      const air = this.ai === 'flyer' || this.ai === 'ambient' ? 6 + Math.round(Math.sin(this.t * 6) * 2) : this.ai === 'hopper' && this.hop > 0.3 ? Math.round(Math.sin((0.6 - this.hop) / 0.3 * Math.PI) * 6) : 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 5, Y - 2, 10, 2);
      ctx.drawImage(img, col * 16, row * 16, 16, 16, X - 8, Y - 16 - air, 16, 16);
      if (this.stun > 0) { ctx.fillStyle = '#f8d040'; const a = this.t * 8; ctx.fillRect(X + Math.cos(a) * 6, Y - 22, 2, 2); ctx.fillRect(X - Math.cos(a) * 6, Y - 22, 2, 2); }
    };
    return e;
  };
};
Object.keys(LV.CRITTERS).forEach(function (k) { LV.ENEMIES[k] = LV.makeCritter(k); });
