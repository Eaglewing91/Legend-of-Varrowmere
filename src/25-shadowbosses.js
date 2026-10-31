/* ================= The five new Shadow bosses, seven Crystals for the Keep, the Arcade Vault ================= */
LV.crystals = function (s) { return Object.keys(s.items).filter(function (k) { return k.indexOf('crystal_') === 0 && k !== 'crystal_arcadevault'; }).length; };
// the Keep's gate now wants all seven Crystals
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { const s = this.save; if (LV.crystals(s) >= 7) s.flags.crystals = 1; else delete s.flags.crystals; enter.call(this, mapId, x, y, dir, first); };
  const collect = LV.Game.prototype.collect;
  LV.Game.prototype.collect = function (p) { collect.call(this, p); const s = this.save; if (LV.crystals(s) >= 7) s.flags.crystals = 1; else delete s.flags.crystals; };
})();
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s);
    if (s && s.vault) e.onTalk = function (g) {
      if (LV.crystals(g.save) < 7) return;
      g.ask(['Seven Crystals. You are a member. Go down?'], ['Down we go', 'Not yet'], function (i) { if (i) return; g.fadeTo = function () { g.enter('arcadevault', LV.MAPS.arcadevault.entry[0] * 16 + 8, LV.MAPS.arcadevault.entry[1] * 16 + 12, 0); g.fade = 1; }; });
    };
    return e;
  };
})(LV.makeVillager);

/* ---------- the Hollow King (Bonehollow): a huge dark knight. Like Brask, only a charge into the wall leaves him
   open; he also calls up Cinder Wisps. Fire stuns him too. ---------- */
LV.ENEMIES.hollowking = function (x, y) {
  const e = LV.brutelike('soldier_black', 16, 'the Hollow King')(x, y); e.boss = true; e.summon = 5;
  const upd = e.update; e.update = function (g, dt) {
    upd.call(this, g, dt); this.summon -= dt;
    if (this.summon <= 0 && g.actors.filter(function (a) { return a.kind === 'wisp' && !a.dead; }).length < 3) { this.summon = 6; g.actors.push(LV.ENEMIES.wisp(this.x + 20, this.y - 10)); g.actors.push(LV.ENEMIES.wisp(this.x - 20, this.y - 10)); g.sfx('spin'); }
  };
  return e;
};
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (t.name === 'the Hollow King' && hit.kind === 'fire' && t.state !== 'dazed') { t.state = 'dazed'; t.st = 0; } return ah(game, hit, t); };
})();

/* ---------- the Bandit Queen (Thieves' Den): she blinks round the room and throws a fan of daggers.
   Anything lands while she is visible. ---------- */
LV.ENEMIES.banditqueen = function (x, y) {
  const e = LV.ENEMIES.vex(x, y); e.hp = 12; e.immune = null; e.name = 'the Bandit Queen'; e.state = 'fade'; e.said = true; e.queen = true;
  const upd = e.update;
  e.update = function (g, dt) {
    if (this.state === 'cast' && this.st > 0.6) {
      const h = g.hero; for (let k = -2; k <= 2; k++) { const a = new LV.Arrow(this.x, this.y - 12, 2, 'enemy'), ang = Math.atan2(h.y - 8 - this.y + 12, h.x - this.x) + k * 0.25; a.vx = Math.cos(ang); a.vy = Math.sin(ang); a.update = LV.Dagger; g.shots.push(a); }
      g.sfx('throw'); this.state = 'wait'; this.st = 0; return;
    }
    upd.call(this, g, dt);
  };
  const draw = e.draw; e.draw = function (ctx, ox, oy) { const v = LV.IMG.vex; LV.IMG.vex = LV.IMG.soldier_red || v; draw.call(this, ctx, ox, oy); LV.IMG.vex = v; };
  return e;
};
// daggers fly at an angle (arrows only fly straight)
LV.Dagger = function (g, dt) {
  this.t += dt; this.x += this.vx * 150 * dt; this.y += this.vy * 150 * dt;
  const b = { x: this.x - 3, y: this.y - 3, w: 6, h: 6 };
  if (LV.overlap(b, g.hero.hurtBox())) { const r = LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'arrow', power: 2, tier: 1, from: { x: this.x - this.vx * 10, y: this.y - this.vy * 10 }, box: b, done: this.done }), g.hero); if (r) { this.dead = true; return; } }
  if (this.t > 2.5 || g.world.boxBlocked({ x: this.x - 1, y: this.y + 4, w: 2, h: 2 }, 'shot')) this.dead = true;
};
// the queen doesn't bat orbs or turn into a shade: a normal boss death
LV.Game.prototype.kill = (function (orig) {
  return function (a) { if (a.queen) { a.kind = 'banditqueen'; } return orig.call(this, a); };
})(LV.Game.prototype.kill);

/* ---------- the Frost Wyrm (Frostmere): the Pyrewyrm's icy cousin. Only its tail can be hurt, and fire hurts double. ---------- */
LV.ENEMIES.frostwyrm = function (x, y) {
  const e = LV.ENEMIES.pyrewyrm(x, y); e.name = 'the Frost Wyrm'; e.hp = 8; e.icy = true;
  e.draw = function (ctx, ox, oy) {
    for (let k = 5; k >= 0; k--) {
      const p = this.seg(k), X = Math.round(p.x - ox), Y = Math.round(p.y - oy) - 8, r = k === 0 ? 9 : k === 5 ? 6 : 7;
      const flash = k === 5 && this.inv > 0 && Math.floor(this.inv * 30) % 2;
      ctx.drawImage(LV.ball(r, k === 5 ? (flash ? ['#0a1018', '#ffffff', '#ffffff', '#ffffff'] : ['#0a1018', '#3a8ae0', '#a8e0ff', '#ffffff']) : ['#0a1018', '#1a3a7a', '#3a7ad0', '#a8d0ff']), X - r - 1, Y - r - 1);
      if (k === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X + Math.cos(this.ang - 0.6) * 5) - 1, Math.round(Y + Math.sin(this.ang - 0.6) * 5) - 1, 3, 3); ctx.fillRect(Math.round(X + Math.cos(this.ang + 0.6) * 5) - 1, Math.round(Y + Math.sin(this.ang + 0.6) * 5) - 1, 3, 3); }
    }
  };
  return e;
};
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { if (t.icy && hit.kind === 'fire' && !hit.doubled) { hit.doubled = true; hit.power *= 2; } if (t.icy && hit.kind === 'frost') return 'immune'; return ah(game, hit, t); };
})();

/* ---------- the Bog Maw (Mirefen): a swamp kraken. Grapple its bubbles off as before; it also spits up Snapjaws. ---------- */
LV.ENEMIES.bogmaw = function (x, y) {
  const e = LV.ENEMIES.kraken(x, y); e.name = 'the Bog Maw'; e.hp = 10; e.spawnT = 6;
  const upd = e.update; e.update = function (g, dt) {
    upd.call(this, g, dt); this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 7; const s = LV.ENEMIES.log(this.x + (g.rng() - 0.5) * 60, this.y + 30); s.state = 'chase'; g.actors.push(s); g.sfx('splash'); }
  };
  const draw = e.draw; e.draw = function (ctx, ox, oy) { const k = LV.IMG.na_kraken; LV.IMG.na_kraken = LV.IMG.na_snap || k; draw.call(this, ctx, ox, oy); LV.IMG.na_kraken = k; };
  return e;
};

/* ---------- Shellback (Turtleback): a lumbering stone turtle. Only boulders or bombs crack its shell. ---------- */
LV.ENEMIES.shellback = function (x, y) {
  const e = LV.ENEMIES.colossus(x, y); e.name = 'Shellback';  // drawn as the pack's giant toad e.hp = 16; e.immune = ['blade', 'spin', 'arrow', 'fire', 'dice', 'beam', 'frost'];
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), bob = this.stomp > 0 ? Math.round(Math.sin((0.5 - this.stomp) / 0.5 * Math.PI) * 4) : 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 16, Y - 3, 32, 5);
    ctx.drawImage(LV.ball(15, ['#141010', '#4a5a2a', '#7a8a3a', '#b8c86a']), X - 16, Y - 34 - bob);
    ctx.fillStyle = '#2a3018'; for (let k = 0; k < 3; k++) ctx.fillRect(X - 10 + k * 7, Y - 26 - bob, 5, 5);
    ctx.fillStyle = '#6a5a3a'; ctx.fillRect(X - 6, Y - 10 - bob, 12, 8); ctx.fillStyle = '#f85050'; ctx.fillRect(X - 4, Y - 8 - bob, 2, 2); ctx.fillRect(X + 2, Y - 8 - bob, 2, 2);
  };
  return e;
};
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.name === 'Shellback' && hit.kind === 'bomb') { t.immune = null; const r = ah(game, hit, t); t.immune = ['blade', 'spin', 'arrow', 'fire', 'dice', 'beam', 'frost']; return r; }
    return ah(game, hit, t);
  };
})();
