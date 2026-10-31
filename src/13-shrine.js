/* ================= The Sunken Shrine: water levels, the Grapple, Snapjaws, the Mire Kraken =================
   Water switches (crystal orbs) raise or lower the water through the whole dungeon, as in the original's
   water dungeon. 'flood' tiles are water while the level is high; 'spill' tiles fill when it is drained.
   Hit a switch with the blade, an arrow or the Grapple. */
LV.C.SWITCH = 19; LV.C.POST = 20;
(function () {
  const blocks = LV.World.prototype.blocks;
  LV.World.prototype.blocks = function (code, mode) { return code === LV.C.SWITCH || code === LV.C.POST ? true : blocks.call(this, code, mode); };
})();
LV.Game.prototype.drained = function () { return !!this.save.flags[this.world.id + ':drained']; };
// Set collision for the current water level; a hero caught by rising water is washed back to safety by checkGround
LV.Game.prototype.applyWater = function () {
  const w = this.world, d = w.def; if (!d.flood && !d.spill) return;
  const dry = this.drained();
  (d.flood || []).forEach(function (i) { w.col[i] = dry ? LV.C.OPEN : LV.C.DEEP; });
  (d.spill || []).forEach(function (i) { w.col[i] = dry ? LV.C.DEEP : LV.C.OPEN; });
};
LV.Game.prototype.toggleWater = function () {
  if (this.waterCool > 0) return; this.waterCool = 0.6;
  const k = this.world.id + ':drained';
  if (this.save.flags[k]) delete this.save.flags[k]; else this.save.flags[k] = 1;
  this.applyWater(); this.sfx('chest'); this.shake = 0.4;
  if (this.hero.state === 'walk') this.hero.checkGround(this);
};
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) { enter.call(this, mapId, x, y, dir, first); this.applyWater(); };
  const update = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) { if (this.waterCool > 0) this.waterCool -= dt; update.call(this, dt); };
  // the blade hits switches
  const resolve = LV.Game.prototype.resolveHit;
  LV.Game.prototype.resolveHit = function (hit, fromHero, poke) {
    resolve.call(this, hit, fromHero, poke);
    if (!fromHero) return;
    const T = 16, b = hit.box, w = this.world;
    for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 1) / T); ty++) for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 1) / T); tx++) if (w.c(tx, ty) === LV.C.SWITCH) { this.toggleWater(); return; }
  };
  // arrows hit switches
  const aup = LV.Arrow.prototype.update;
  LV.Arrow.prototype.update = function (g, dt) {
    const was = this.stuck; aup.call(this, g, dt);
    if (!was && this.stuck && this.team === 'hero' && g.world.cAt(this.x, this.y + 5) === LV.C.SWITCH) g.toggleWater();
  };
})();
// Water and switches are drawn from the collision grid, so they always match the current level
LV.drawSpecialTiles = (function (orig) {
  return function (ctx, g, ox, oy) {
    const w = g.world, d = w.def;
    if (d.flood || d.spill) {
      const wet = function (tx, ty) { const c = w.c(tx, ty), i = ty * w.w + tx; return c === LV.C.DEEP && ((d.flood || []).indexOf(i) >= 0 || (d.spill || []).indexOf(i) >= 0 || true); };
      const x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (w.c(tx, ty) !== LV.C.DEEP) continue;
        const cx = !wet(tx - 1, ty) ? 0 : !wet(tx + 1, ty) ? 2 : 1, cy = !wet(tx, ty - 1) ? 0 : !wet(tx, ty + 1) ? 2 : 1;
        ctx.drawImage(LV.IMG.cave, cx * 16, (7 + cy) * 16, 16, 16, tx * 16 - ox, ty * 16 - oy, 16, 16);
        if (cx === 1 && cy === 1 && (tx * 7 + ty * 3) % 9 === 0) ctx.drawImage(LV.IMG.cave, (5 + Math.floor(g.t * 3 + tx) % 4) * 16, 7 * 16, 16, 16, tx * 16 - ox, ty * 16 - oy, 16, 16);
      }
    }
    orig(ctx, g, ox, oy);
    for (let i = 0; i < w.col.length; i++) {
      const c = w.col[i]; if (c !== LV.C.SWITCH && c !== LV.C.POST) continue;
      const X = (i % w.w) * 16 - ox, Y = Math.floor(i / w.w) * 16 - oy; if (X < -16 || Y < -16 || X > 256 || Y > 224) continue;
      if (c === LV.C.POST) { ctx.fillStyle = '#2a2018'; ctx.fillRect(X + 4, Y + 2, 8, 14); ctx.fillStyle = '#8a6a40'; ctx.fillRect(X + 5, Y + 3, 6, 12); ctx.fillStyle = '#b8945a'; ctx.fillRect(X + 5, Y + 3, 6, 2); ctx.fillStyle = '#c8c8d0'; ctx.fillRect(X + 3, Y + 6, 10, 2); continue; }
      const dry = g.drained(), glow = 0.6 + Math.sin(g.t * 4) * 0.2;
      ctx.fillStyle = '#2a2a32'; ctx.fillRect(X + 3, Y + 11, 10, 5); ctx.fillStyle = '#6a6a78'; ctx.fillRect(X + 4, Y + 12, 8, 3);
      ctx.fillStyle = '#10101a'; ctx.fillRect(X + 3, Y + 1, 10, 11);
      ctx.fillStyle = dry ? '#e88a30' : '#3a8ae8'; ctx.fillRect(X + 4, Y + 2, 8, 9);
      ctx.globalAlpha = glow; ctx.fillStyle = dry ? '#ffd090' : '#a8e0ff'; ctx.fillRect(X + 5, Y + 3, 3, 3); ctx.globalAlpha = 1;
    }
  };
})(LV.drawSpecialTiles);

/* ---------- the Grapple: shoots a hook up to 7 tiles; latches onto posts, chests, blocks and torches and
   pulls you over water and pits; stuns enemies; plucks the Kraken's bubbles ---------- */
LV.ITEMS.splice(1, 0, { id: 'grapple', name: 'Grapple', need: function (s) { return s.items.grapple; } });
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) {
    if (id !== 'grapple') return orig(ctx, id, x, y);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 3, y + 9, 6, 5); ctx.fillStyle = '#b8b8c8'; ctx.fillRect(x + 7, y + 4, 2, 7); ctx.fillRect(x + 5, y + 3, 6, 2); ctx.fillRect(x + 4, y + 1, 2, 3); ctx.fillRect(x + 10, y + 1, 2, 3);
  };
})(LV.itemIcon);
LV.GRAB = [LV.C.POST, LV.C.BLOCK, LV.C.TORCH, LV.C.TORCH_LIT, LV.C.BIGCHEST, LV.C.SWITCH, LV.C.LEVER];
LV.Grapple = function (h) { this.kind = 'grapple'; this.h = h; this.dir = h.dir; const d = LV.DIRS[h.dir]; this.x = h.x + d.x * 8; this.y = h.y - 8 + d.y * 8; this.len = 0; this.phase = 'out'; this.dead = false; this.grab = null; this.carry = null; };
LV.Grapple.prototype.update = function (g, dt) {
  const h = this.h, d = LV.DIRS[this.dir];
  if (this.phase === 'out') {
    this.len += 260 * dt; this.x = h.x + d.x * (8 + this.len); this.y = h.y - 8 + d.y * (8 + this.len);
    const b = { x: this.x - 4, y: this.y - 4, w: 8, h: 8 };
    for (const a of g.actors) if (!a.dead && LV.overlap(b, a.hurtBox())) {
      if (a.onGrapple && a.onGrapple(g, this)) { this.phase = 'back'; return; }
      a.stun = 2; g.sfx('clink'); this.phase = 'back'; return;
    }
    const tx = Math.floor(this.x / 16), ty = Math.floor((this.y + 6) / 16), c = g.world.c(tx, ty), w = g.world;
    const chest = w.chests[tx + ',' + ty] && c === LV.C.SOLID;
    if (LV.GRAB.indexOf(c) >= 0 || chest) {
      if (c === LV.C.SWITCH) g.toggleWater();
      this.phase = 'pull'; this.grab = { x: tx * 16 + 8 - d.x * 16, y: ty * 16 + 12 - d.y * 16 }; h.state = 'grapple'; g.sfx('clink'); return;
    }
    if (w.boxBlocked({ x: this.x - 2, y: this.y + 4, w: 4, h: 4 }, 'shot')) { this.phase = 'back'; g.sfx('clink'); return; }
    if (this.len >= 112) this.phase = 'back';
  } else if (this.phase === 'back') {
    this.len -= 320 * dt; this.x = h.x + d.x * (8 + this.len); this.y = h.y - 8 + d.y * (8 + this.len);
    if (this.len <= 0) { this.dead = true; if (h.state === 'grapple') h.state = 'walk'; }
  } else if (this.phase === 'pull') {
    // fly the hero to the tile in front of the hook, over water and pits
    const gx = this.grab.x, gy = this.grab.y, dx = gx - h.x, dy = gy - h.y, dist = Math.hypot(dx, dy);
    if (dist < 4) { h.x = gx; h.y = gy; h.state = 'walk'; this.dead = true; h.safe = { x: gx, y: gy }; return; }
    const st = Math.min(dist, 260 * dt); h.x += dx / dist * st; h.y += dy / dist * st; h.inv = Math.max(h.inv, 0.04);
  }
};
LV.Grapple.prototype.draw = function (ctx, ox, oy) {
  const h = this.h, X = Math.round(this.x - ox), Y = Math.round(this.y - oy), sx = Math.round(h.x - ox), sy = Math.round(h.y - 8 - oy);
  ctx.fillStyle = '#9a9aa8'; const n = Math.max(1, Math.floor(Math.hypot(X - sx, Y - sy) / 4));
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(sx + (X - sx) * i / n) - 1, Math.round(sy + (Y - sy) * i / n) - 1, 2, 2);
  ctx.fillStyle = '#171717'; ctx.fillRect(X - 4, Y - 4, 8, 8); ctx.fillStyle = '#d0d0dc'; ctx.fillRect(X - 3, Y - 3, 6, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 2, Y - 2, 2, 2);
};
(function () {
  const use = LV.Game.prototype.useItem;
  LV.Game.prototype.useItem = function (h) {
    if (this.save.equip !== 'grapple') return use.call(this, h);
    if (this.shots.some(function (x) { return x.kind === 'grapple'; })) return;
    this.shots.push(new LV.Grapple(h)); h.state = 'grapple'; h.st = 0; this.sfx('throw');
  };
  // the hero stands still (and can't fall) while the hook is out or pulling
  const hu = LV.Hero.prototype.update;
  LV.Hero.prototype.update = function (g, dt) {
    if (this.state === 'grapple') { this.t += dt; if (this.inv > 0) this.inv -= dt; if (!g.shots.some(function (s) { return s.kind === 'grapple'; })) this.state = 'walk'; return; }
    hu.call(this, g, dt);
  };
  const hd = LV.Hero.prototype.draw;
  LV.Hero.prototype.draw = function (ctx, ox, oy) {
    if (this.state !== 'grapple') return hd.call(this, ctx, ox, oy);
    const s = this.state; this.state = 'item'; hd.call(this, ctx, ox, oy); this.state = s;
  };
  const open = LV.Game.prototype.openChest;
  LV.Game.prototype.openChest = function (mapId, key, tx, ty, ch) {
    if (ch.item === 'grapple') { open.call(this, mapId, key, tx, ty, Object.assign({}, ch, { item: '__grapple' })); delete this.save.items.__grapple; this.save.items.grapple = 1; this.save.equip = 'grapple'; this.dialog = null; this.say(['You got the Grapple!', 'Press X to fire it. It latches onto posts, chests and blocks and pulls you across water and pits.', 'It stuns enemies too. Handy for anyone with a debt collector problem.']); return; }
    open.call(this, mapId, key, tx, ty, ch);
  };
})();

/* ---------- Snapjaw: an eel that lurks underwater, surfaces near you, spits, and dives again ---------- */
LV.ENEMIES.snapjaw = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 3, contact: 2, body: [-5, -6, 10, 6], hurt: [-7, -14, 14, 14], kind: 'snapjaw' });
  e.state = 'under'; e.st = 1 + (x % 5) / 3; e.drop = true; e.weakToDice = true;
  e.update = function (g, dt) {
    this.t += dt; this.st -= dt; if (this.inv > 0) this.inv -= dt;
    if (this.stun > 0) { this.stun -= dt; return; }
    const w = g.world, h = g.hero;
    if (this.state !== 'beached' && w.cAt(this.x, this.y - 4) !== LV.C.DEEP) { this.state = 'beached'; }
    if (this.state === 'beached') { this.contact = 2; if (w.cAt(this.x, this.y - 4) === LV.C.DEEP) { this.state = 'under'; this.st = 1; } return; }      // stranded when the water drains: easy prey
    if (this.state === 'under') {
      this.contact = 0;
      if (!this.room) this.room = w.areaAt(this.x, this.y - 4);
      const rm = this.room, inRoom = function (tx, ty) { return tx >= rm[0] && ty >= rm[1] && tx < rm[0] + rm[2] && ty < rm[1] + rm[3]; };
      if (g.area !== rm) { this.st = Math.max(this.st, 0.5); return; }
      if (this.st <= 0) {
        // pick a water tile near the hero (in its own room) to come up at
        for (let k = 0; k < 12; k++) { const a = g.rng() * 6.28, r = 24 + g.rng() * 40, tx = Math.floor((h.x + Math.cos(a) * r) / 16), ty = Math.floor((h.y + Math.sin(a) * r) / 16); if (w.c(tx, ty) === LV.C.DEEP && inRoom(tx, ty)) { this.x = tx * 16 + 8; this.y = ty * 16 + 12; break; } }
        this.state = 'up'; this.st = 1.6; g.sfx('splash'); this.spat = false;
      }
    } else if (this.state === 'up') {
      this.contact = 2;
      if (!this.spat && this.st < 1.0) { this.spat = true; g.shots.push(new LV.Spit(this.x, this.y - 10, h.x, h.y - 8)); g.sfx('throw'); }
      if (this.st <= 0) { this.state = 'under'; this.st = 1.4 + g.rng(); }
    }
  };
  e.hurtBox = function () { return this.state === 'under' ? { x: -999, y: -999, w: 0, h: 0 } : LV.Actor.prototype.hurtBox.call(this); };
  e.draw = function (ctx, ox, oy) {
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
    if (this.state === 'under') { if (Math.floor(this.t * 3) % 2) { ctx.fillStyle = 'rgba(200,230,255,.6)'; ctx.fillRect(X - 4, Y - 4, 3, 1); ctx.fillRect(X + 2, Y - 3, 3, 1); } return; }
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    LV.drawPix(ctx, LV.PIX.snapjaw, X - 8, Y - 16 + (this.state === 'up' ? Math.round(Math.sin(this.t * 10)) : 0), this.state === 'up' && this.st < 1.1 && this.st > 0.9 ? 1 : 0);
  };
  return e;
};
LV.Spit = function (x, y, tx, ty) { this.kind = 'spit'; this.x = x; this.y = y; const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1; this.vx = dx / d * 110; this.vy = dy / d * 110; this.t = 0; this.dead = false; this.done = new Set(); };
LV.Spit.prototype.update = function (g, dt) {
  this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt;
  const b = { x: this.x - 3, y: this.y - 3, w: 6, h: 6 };
  if (LV.overlap(b, g.hero.hurtBox())) { const r = LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'spit', power: 2, tier: 1, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b, done: this.done }), g.hero); if (r) this.dead = true; }
  if (this.t > 2.5 || g.world.boxBlocked({ x: this.x - 1, y: this.y + 4, w: 2, h: 2 }, 'shot')) this.dead = true;
};
LV.Spit.prototype.draw = function (ctx, ox, oy) { const X = Math.round(this.x - ox), Y = Math.round(this.y - oy); ctx.fillStyle = '#1a3a5a'; ctx.fillRect(X - 3, Y - 3, 6, 6); ctx.fillStyle = '#7ad0f0'; ctx.fillRect(X - 2, Y - 2, 4, 4); ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, Y - 2, 1, 1); };

/* Small pixel sprites for creatures the art pack doesn't have, drawn in its palette and outline style */
LV.PIX = {
  snapjaw: { pal: { k: '#1a1418', g: '#2e7a5a', l: '#4ab07a', y: '#e8d860', w: '#f0f0f0', r: '#c83838', d: '#1e5a40' }, rows: [
    '................', '.....kkkkk......', '....kgllgk......', '...kglllllk.....', '...kgwkllllk....', '...kglllllllk...', '..kgllllrrrrk...', '..kgllkwkwkwk...',
    '..kgdllllllllk..', '...kgdddllllk...', '....kkgddllk....', '.....kyykgk.....', '....kyyyyyk.....', '...kddddddk.....', '....kkkkkk......', '................'] },
  kraken: { pal: { k: '#140c18', p: '#5a2a7a', q: '#8a4ab0', m: '#b07ad0', w: '#f0f0f0', r: '#e83848', y: '#f0d040', d: '#3a1850' }, rows: [
    '..........kkkkkkkk..........', '.......kkkqqqqqqqqkkk.......', '.....kkqqqmmmmmmmmqqqkk.....', '....kqqmmmmmmmmmmmmmmqqk....',
    '...kqqmmmmmmmmmmmmmmmmqqk...', '..kpqmmmmkkkkmmkkkkmmmmqpk..', '..kpqmmmkwwwwkkwwwwkmmmqpk..', '.kppqmmmkwwrrkkwrrwkmmmqppk.',
    '.kppqmmmkwwrrkkwrrwkmmmqppk.', '.kppqqmmmkkkkmmkkkkmmmqqppk.', '.kpppqqmmmmmmmmmmmmmmqqpppk.', '.kpppqqqmmkkkkkkkkmmqqqpppk.',
    '.kdpppqqqkrrrrrrrrkqqqpppdk.', '.kdpppppqqkkkkkkkkqqpppppdk.', '..kdpppppppqqqqqqpppppppdk..', '..kddpppppppppppppppppppddk..',
    '...kdkpdkpdkpdkpdkpdkpdkdk..', '...kdkpdkpdkpdkpdkpdkpdkk...', '..kdk.kdk.kdk.kdk.kdk.kdk...', '..kk..kk..kk..kk..kk..kk....'] },
  bubble: { pal: { k: '#1a2a3a', b: '#5ab0e0', c: '#a8e0ff', w: '#ffffff', n: '#3a7ab0' }, rows: [
    '...kkkk...', '..kbbbbk..', '.kbcwwbbk.', 'kbcwcbbbnk', 'kbccbbbbnk', 'kbbbbbbbnk', 'kbbbbbbnnk', '.kbbbbnnk.', '..knnnnk..', '...kkkk...'] }
};
LV.pixCache = {};
LV.drawPix = function (ctx, spr, x, y, flash) {
  const key = spr.rows[0] + spr.rows.length + (flash ? 'f' : '');
  let c = LV.pixCache[key];
  if (!c) {
    c = document.createElement('canvas'); c.width = spr.rows[0].length; c.height = spr.rows.length; const cx = c.getContext('2d');
    spr.rows.forEach(function (row, j) { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; cx.fillStyle = flash && ch !== 'k' ? '#ffffff' : spr.pal[ch]; cx.fillRect(i, j, 1, 1); } });
    LV.pixCache[key] = c;
  }
  ctx.drawImage(c, Math.round(x), Math.round(y));
};

/* ---------- Lieutenant Garrow: the Shrine's mini-boss, Brask's blue-armoured second ---------- */
LV.ENEMIES.garrow = function (x, y) {
  const e = LV.ENEMIES.brute(x, y); e.hp = 10; e.name = 'Lieutenant Garrow'; e.kind = 'brute';
  const draw = e.draw; e.draw = function (ctx, ox, oy) { const p = LV.IMG.soldier_purple; LV.IMG.soldier_purple = LV.IMG.soldier_blue; draw.call(this, ctx, ox, oy); LV.IMG.soldier_purple = p; };
  return e;
};

/* ---------- The Mire Kraken: a bloated jelly ringed by six bubbles. Grapple the bubbles off and pop them;
   once they're gone the Kraken bounds around the room and can be cut down. ---------- */
LV.ENEMIES.kraken = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 8, contact: 4, body: [-12, -8, 24, 8], hurt: [-13, -24, 26, 24], kind: 'kraken' });
  e.boss = true; e.heavy = true; e.drop = false; e.name = 'the Mire Kraken'; e.bubbles = []; e.phase = 'shield'; e.st = 0; e.vx = 40; e.vy = 30;
  e.update = function (g, dt) {
    this.t += dt; this.st += dt; if (this.inv > 0) this.inv -= dt;
    if (!this.bubbles.length && this.phase === 'shield' && !this.made) {
      this.made = true;
      for (let i = 0; i < 6; i++) { const b = LV.makeBubble(this, i); this.bubbles.push(b); g.actors.push(b); }
    }
    const h = g.hero;
    if (this.phase === 'shield') {
      // drift slowly after the hero
      const dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1;
      LV.move(this, g.world, dx / d * 14 * dt, dy / d * 14 * dt, 'enemy');
      if (this.made && this.bubbles.every(function (b) { return b.dead; })) { this.phase = 'bound'; this.st = 0; g.sfx('clink'); }
    } else {
      // bounce round the room, faster as it gets hurt
      const sp = 1 + (8 - this.hp) * 0.15, r = LV.move(this, g.world, this.vx * sp * dt, this.vy * sp * dt, 'enemy');
      if (!r.x) this.vx = -this.vx; if (!r.y) this.vy = -this.vy;
      if (this.st > 1.2) { this.st = 0; g.shots.push(new LV.Spit(this.x, this.y - 12, h.x, h.y - 8)); }
    }
  };
  e.immune = ['blade', 'spin', 'arrow', 'thrown', 'dice'];
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), bob = Math.round(Math.sin(this.t * 3) * 2);
    LV.drawPix(ctx, LV.PIX.kraken, X - 14, Y - 22 + bob, 0);
  };
  return e;
};
(function () {
  // the Kraken is immune until its bubbles are gone
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.kind === 'kraken') t.immune = t.phase === 'shield' ? ['blade', 'spin', 'arrow', 'thrown', 'dice', 'bomb'] : null;
    return ah(game, hit, t);
  };
})();
LV.makeBubble = function (k, i) {
  const e = new LV.Actor({ x: k.x, y: k.y, hp: 1, contact: 2, body: [-4, -4, 8, 4], hurt: [-5, -10, 10, 10], kind: 'bubble' });
  e.k = k; e.i = i; e.attached = true; e.drop = false;
  e.immune = ['blade', 'spin', 'arrow', 'thrown', 'dice', 'bomb'];
  e.update = function (g, dt) {
    this.t += dt; if (this.inv > 0) this.inv -= dt;
    if (this.attached) { const a = this.i / 6 * 6.283 + g.t * 1.4, r = 26 + Math.sin(g.t * 2 + this.i) * 3; this.x = this.k.x + Math.cos(a) * r; this.y = this.k.y - 6 + Math.sin(a) * r * 0.8; return; }
    // plucked: float to where the hook let go and wobble there, easy to pop
    if (this.pull) { const dx = this.pull.x - this.x, dy = this.pull.y - this.y, d = Math.hypot(dx, dy); if (d < 3) this.pull = null; else { this.x += dx / d * 200 * dt; this.y += dy / d * 200 * dt; } }
  };
  e.onGrapple = function (g, hook) {
    if (!this.attached) return false;
    this.attached = false; this.immune = null; this.contact = 0; const h = g.hero, d = LV.DIRS[h.dir];
    this.pull = { x: h.x + d.x * 20, y: h.y + d.y * 20 }; g.sfx('lift'); return true;
  };
  e.draw = function (ctx, ox, oy) { LV.drawPix(ctx, LV.PIX.bubble, Math.round(this.x - ox - 5), Math.round(this.y - oy - 10 + (this.attached ? 0 : Math.sin(this.t * 8) * 1)), 0); };
  return e;
};
