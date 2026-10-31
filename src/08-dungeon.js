/* ================= Dungeons: keys, locked doors, shutters, push blocks, floor switches, bosses =================
   Rules as in the original: Small Keys only work in their own dungeon; the Big Key opens the Big Chest and the
   boss door; shutters open when a room is cleared, a switch is pressed or its torches are lit. */
LV.C.LOCKED = 12; LV.C.BIGLOCK = 13; LV.C.BLOCK = 14; LV.C.PLATE = 15; LV.C.SHUTTER = 16; LV.C.BIGCHEST = 17;
(function () {
  const blocks = LV.World.prototype.blocks;
  LV.World.prototype.blocks = function (code, mode) {
    const C = LV.C;
    if (code === C.LOCKED || code === C.BIGLOCK || code === C.BLOCK || code === C.SHUTTER || code === C.BIGCHEST) return true;
    if (code === C.PLATE) return false;
    return blocks.call(this, code, mode);
  };
})();
LV.Game.prototype.dungeon = function () { return this.world.def.dungeon || null; };
LV.Game.prototype.dflag = function (k) { return !!this.save.flags[this.world.id + ':' + k]; };
LV.Game.prototype.setDflag = function (k) { this.save.flags[this.world.id + ':' + k] = 1; };

/* Restore the state of a dungeon map when entering it: opened doors, moved blocks, opened shutters, beaten boss */
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const w = this.world, s = this.save, self = this;
    Object.keys(s.flags).forEach(function (k) {
      const p = k.split(':'); if (p[0] !== mapId) return;
      if (p[1] === 'door' || p[1] === 'block-from') { const xy = p[2].split(','); w.setC(+xy[0], +xy[1], (w.def.plates || []).some(function (q) { return q[0] === +xy[0] && q[1] === +xy[1]; }) ? LV.C.PLATE : LV.C.OPEN); }
      if (p[1] === 'block-to') { const xy = p[2].split(','); w.setC(+xy[0], +xy[1], LV.C.BLOCK); }
      if (p[1] === 'open') self.openShutters(p[2], true);
    });
    if (w.def.boss && s.flags[mapId + ':boss']) this.actors = this.actors.filter(function (a) { return !a.boss; });
    this.checkTriggers(true);
  };
})();

/* ---------- pushing: locked doors open with keys, blocks slide one tile ---------- */
LV.Game.prototype.tryPush = function (h, dt) {
  const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 9) / 16), ty = Math.floor((h.y - 3 + d.y * 6) / 16), w = this.world, c = w.c(tx, ty), s = this.save, dg = this.dungeon();
  if (c === LV.C.LOCKED && dg) {
    if ((s.keys[dg] || 0) > 0) { s.keys[dg]--; this.openDoorAt(tx, ty, LV.C.LOCKED); this.sfx('chest'); }
    else if (!this.saidLocked) { this.saidLocked = true; this.say(['This door is locked. You need a Small Key.']); }
    return;
  }
  if (c === LV.C.BIGLOCK && dg) {
    if (s.items['bigkey_' + dg]) { this.openDoorAt(tx, ty, LV.C.BIGLOCK); this.sfx('chest'); }
    else if (!this.saidLocked) { this.saidLocked = true; this.say(['A huge lock. You need the Big Key.']); }
    return;
  }
  if (c === LV.C.BLOCK) {
    h.pushT = (h.pushT || 0) + dt;
    if (h.pushT < 0.3) return;
    h.pushT = 0;
    const nx = tx + d.x, ny = ty + d.y, nc = w.c(nx, ny);
    if ((nc !== LV.C.OPEN && nc !== LV.C.PLATE) || this.actors.some(function (a) { return Math.floor(a.x / 16) === nx && Math.floor((a.y - 3) / 16) === ny; })) return;
    const plate = (w.def.plates || []).some(function (q) { return q[0] === tx && q[1] === ty; });
    w.setC(tx, ty, plate ? LV.C.PLATE : LV.C.OPEN); w.setC(nx, ny, LV.C.BLOCK);
    if (w.def.oneShotBlocks !== false) { this.setDflag('block-from:' + tx + ',' + ty); delete this.save.flags[w.id + ':block-to:' + tx + ',' + ty]; this.setDflag('block-to:' + nx + ',' + ny); }
    this.effects.push({ x: tx * 16, y: ty * 16, t: 0, dead: false, dx: d.x, dy: d.y, update: function (g, dt2) { this.t += dt2; if (this.t > 0.15) this.dead = true; }, draw: function (ctx, ox, oy) { LV.drawBlock(ctx, this.x + this.dx * 16 * this.t / 0.15 - ox, this.y + this.dy * 16 * this.t / 0.15 - oy); } });
    this.movingBlock = { x: nx, y: ny, t: 0.15 };
    this.sfx('lift'); this.checkTriggers();
  } else h.pushT = 0;
};
LV.Game.prototype.openDoorAt = function (tx, ty, code) {
  // doors are two tiles wide: open the matching neighbour too
  const w = this.world, self = this;
  const open = function (cx, cy) {
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) {
      const x = cx + o[0], y = cy + o[1];
      if (w.c(x, y) === code) { w.setC(x, y, LV.C.OPEN); self.setDflag('door:' + x + ',' + y); }
    });
  };
  open(tx, ty);
  // the same door's other half, across the doorway (a door between two rooms is one door: one key)
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
    for (let n = 1; n <= 4; n++) { const c = w.c(tx + d[0] * n, ty + d[1] * n); if (c === code) { open(tx + d[0] * n, ty + d[1] * n); open(tx + d[0] * n + (d[1] ? 1 : 0), ty + d[1] * n + (d[0] ? 1 : 0)); open(tx + d[0] * n - (d[1] ? 1 : 0), ty + d[1] * n - (d[0] ? 1 : 0)); break; } if (c !== LV.C.OPEN) break; }
  });
};

/* ---------- triggers: switches, cleared rooms, lit torches open shutters ---------- */
LV.Game.prototype.openShutters = function (group, quiet) {
  const w = this.world, list = (w.def.shutters || {})[group] || [];
  let any = false;
  list.forEach(function (p) { if (w.c(p[0], p[1]) === LV.C.SHUTTER) { w.setC(p[0], p[1], LV.C.OPEN); any = true; } });
  if (w.def.reveal && w.def.reveal[group]) w.def.reveal[group].forEach(function (p) { w.setC(p[0], p[1], LV.C.SOLID); w.layers.deco[p[1] * w.w + p[0]] = (3 << 16); });
  this.setDflag('open:' + group);
  if (any && !quiet) this.sfx('chest');
};
LV.Game.prototype.checkTriggers = function (quiet) {
  const w = this.world, trig = w.def.triggers || [], self = this, h = this.hero;
  trig.forEach(function (t) {
    if (self.dflag('open:' + t.open)) return;
    let ok = false;
    if (t.type === 'plate') ok = t.at.every(function (p) { return w.c(p[0], p[1]) === LV.C.BLOCK || (Math.floor(h.x / 16) === p[0] && Math.floor((h.y - 3) / 16) === p[1]); });
    if (t.type === 'torches') ok = t.at.every(function (p) { return w.c(p[0], p[1]) === LV.C.TORCH_LIT; });
    if (t.type === 'clear') { const a = w.areas[t.area], T = 16; ok = !quiet && self.area === a && !self.actors.some(function (e) { return !e.dead && !e.npc && e.x >= a[0] * T && e.x < (a[0] + a[2]) * T && e.y >= a[1] * T && e.y < (a[1] + a[3]) * T; }); }
    if (ok) self.openShutters(t.open, quiet);
  });
};
(function () {
  const update = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    update.call(this, dt);
    if (this.paused || this.dialog || this.scroll || this.fadeTo) return;
    const h = this.hero;
    if (h.state === 'walk' && h.pushing) this.tryPush(h, dt); else { h.pushT = 0; if (!h.pushing) this.saidLocked = false; }
    if (this.world.def.triggers) this.checkTriggers();
  };
  const torch = LV.Game.prototype.lightTorch;
  LV.Game.prototype.lightTorch = function (tx, ty) { torch.call(this, tx, ty); this.checkTriggers(); };
  // Small Keys, the Big Key, the map and compass, Big Chests
  const open = LV.Game.prototype.openChest;
  LV.Game.prototype.openChest = function (mapId, key, tx, ty, ch) {
    const s = this.save, dg = this.dungeon(), it = ch.item;
    if (ch.big && !s.items['bigkey_' + dg]) { this.say(['This Big Chest is locked tight. You need the Big Key.']); return; }
    if (it === 'key' || it === 'bigkey' || it === 'map' || it === 'compass') {
      s.opened[mapId + ':' + key] = 1; this.world.layers.deco[ty * this.world.w + tx] = LV.CHEST_OPEN; this.sfx('chest');
      if (it === 'key') { s.keys[dg] = (s.keys[dg] || 0) + 1; this.say(['You got a Small Key!', 'It opens one locked door in this dungeon.']); }
      else { s.items[it + '_' + dg] = 1; this.say({ bigkey: ['You got the Big Key!', 'It opens the Big Chest and the boss door.'], map: ['You got the Dungeon Map!'], compass: ['You got the Compass!', 'It shows where the boss lurks.'] }[it]); }
      return;
    }
    if (ch.big) { const w = this.world; s.opened[mapId + ':' + key] = 1; w.layers.deco[ty * w.w + tx] = (3 << 16) | 11; w.layers.deco[ty * w.w + tx + 1] = (3 << 16) | 12; }
    open.call(this, mapId, key, tx, ty, ch);
  };
})();
// Chests are opened from below (facing up); a Big Chest spans two tiles, so check the left half too
(function () {
  const inter = LV.Game.prototype.interact;
  LV.Game.prototype.interact = function (h) {
    const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), w = this.world;
    if (h.dir === 0 && !w.chests[tx + ',' + ty] && w.chests[(tx - 1) + ',' + ty] && w.chests[(tx - 1) + ',' + ty].big && !this.save.opened[w.id + ':' + (tx - 1) + ',' + ty]) { this.openChest(w.id, (tx - 1) + ',' + ty, tx - 1, ty, w.chests[(tx - 1) + ',' + ty]); return true; }
    return inter.call(this, h);
  };
})();

/* ---------- drawing the dungeon pieces ---------- */
LV.drawBlock = function (ctx, X, Y) {
  X = Math.round(X); Y = Math.round(Y);
  ctx.fillStyle = '#171717'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#8a8a9e'; ctx.fillRect(X + 1, Y + 1, 14, 14);
  ctx.fillStyle = '#b4b4c8'; ctx.fillRect(X + 1, Y + 1, 14, 2); ctx.fillRect(X + 1, Y + 1, 2, 14); ctx.fillStyle = '#5a5a70'; ctx.fillRect(X + 1, Y + 13, 14, 2); ctx.fillRect(X + 13, Y + 1, 2, 14);
  ctx.fillStyle = '#6e6e86'; ctx.fillRect(X + 5, Y + 5, 6, 6);
};
(function () {
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, g, ox, oy) {
    special(ctx, g, ox, oy);
    const w = g.world, x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15), C = LV.C;
    for (const p of (w.def.plates || [])) { const X = p[0] * 16 - ox, Y = p[1] * 16 - oy, down = w.c(p[0], p[1]) === C.BLOCK; ctx.fillStyle = '#171717'; ctx.fillRect(X + 2, Y + 2, 12, 12); ctx.fillStyle = down ? '#6a5a20' : '#c8a030'; ctx.fillRect(X + 3, Y + 3, 10, 10); ctx.fillStyle = '#f0d060'; ctx.fillRect(X + 3, Y + 3, 10, 2); }
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = w.col[ty * w.w + tx], X = tx * 16 - ox, Y = ty * 16 - oy;
      if (c === C.BLOCK) { if (!(g.movingBlock && g.movingBlock.x === tx && g.movingBlock.y === ty && g.effects.some(function (e) { return e.dx !== undefined; }))) LV.drawBlock(ctx, X, Y); }
      else if (c === C.LOCKED || c === C.BIGLOCK) {
        ctx.fillStyle = '#171717'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#7a4a24'; ctx.fillRect(X + 1, Y + 1, 14, 14); ctx.fillStyle = '#9a6234'; for (let i = 0; i < 3; i++) ctx.fillRect(X + 1 + i * 5, Y + 1, 3, 14);
        ctx.fillStyle = c === C.BIGLOCK ? '#f0c040' : '#c8c8d0'; ctx.fillRect(X + 5, Y + 5, 6, c === C.BIGLOCK ? 7 : 5); ctx.fillStyle = '#171717'; ctx.fillRect(X + 7, Y + 7, 2, 3);
      } else if (c === C.SHUTTER) {
        ctx.fillStyle = '#2a2a36'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#9a9ab0'; for (let i = 0; i < 4; i++) ctx.fillRect(X + 1 + i * 4, Y, 2, 16); ctx.fillStyle = '#6a6a80'; ctx.fillRect(X, Y + 6, 16, 2);
      }
    }
  };
})();

/* ---------- boss: the Stone Sentinels (three statues that hop in formation, then hunt you) ---------- */
LV.ENEMIES.sentinels = function (x, y) { return LV.makeSentinel(x, y, 0); };
LV.makeSentinel = function (x, y, k) {
  const e = new LV.Actor({ x: x, y: y, hp: 6, contact: 4, body: [-6, -6, 12, 6], hurt: [-7, -38, 14, 38], kind: 'sentinel' });
  e.boss = true; e.k = k; e.heavy = false; e.hop = 0; e.phase = 'wake'; e.cx = x; e.cy = y;
  e.update = function (g, dt) {
    this.t += dt; if (this.inv > 0) this.inv -= dt;
    if (this.kb > 0) { this.kb -= dt * 2; LV.move(this, g.world, this.kbx * dt * 0.4, this.kby * dt * 0.4, 'enemy'); }
    const all = g.actors.filter(function (a) { return a.kind === 'sentinel' && !a.dead; });
    this.hop = Math.abs(Math.sin(this.t * 6)) * 6;
    if (this.phase === 'wake') { if (this.t > 1.2) this.phase = all.length > 1 ? 'circle' : 'hunt'; return; }
    if (all.length === 1) this.phase = 'hunt';
    if (this.phase === 'circle') {
      const a = g.world.areaAt(this.cx, this.cy - 8), mx = (a[0] + a[2] / 2) * 16, my = (a[1] + a[3] / 2) * 16 + 8;
      const ang = this.t * 0.9 + this.k * Math.PI * 2 / 3, tx = mx + Math.cos(ang) * 52, ty = my + Math.sin(ang) * 34;
      LV.move(this, g.world, (tx - this.x) * dt * 3, (ty - this.y) * dt * 3, 'enemy');
    } else {
      const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1;
      LV.move(this, g.world, dx / d * 52 * dt, dy / d * 52 * dt, 'enemy');
    }
  };
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - 6, Y - 2, 12, 3);
    ctx.drawImage(LV.IMG.cave, (6 + this.k) * 16, 0, 16, 48, X - 8, Y - 46 - Math.round(this.hop), 16, 48);
  };
  return e;
};
LV.ENEMIES.sentinel0 = function (x, y) { return LV.makeSentinel(x, y, 0); };
LV.ENEMIES.sentinel1 = function (x, y) { return LV.makeSentinel(x, y, 1); };
LV.ENEMIES.sentinel2 = function (x, y) { return LV.makeSentinel(x, y, 2); };
(function () {
  const kill = LV.Game.prototype.kill;
  LV.Game.prototype.kill = function (a) {
    kill.call(this, a);
    if (a.boss && !this.actors.some(function (b) { return b.boss && !b.dead; })) {
      this.setDflag('boss'); const ar = this.area, T = 16;
      this.pickups.push(Object.assign(new LV.Pickup((ar[0] + 7.5) * T, (ar[1] + 7) * T, 'container'), { life: 1e9 }));
      this.openShutters('boss'); this.sfx('chest');
    }
  };
  const collect = LV.Game.prototype.collect;
  LV.Game.prototype.collect = function (p) {
    if (p.kind === 'container') {
      p.dead = true; const s = this.save, dg = this.dungeon(); s.maxHp += 4; this.hero.maxHp = s.maxHp; this.hero.hp = s.maxHp; s.items['pendant_' + dg] = 1; this.sfx('chest');
      const self = this;
      this.say(['You got a Life Container! Your life grows by one heart.', 'And the ' + (this.world.def.pendant || 'Pendant of Valor') + ' shines on the dais!', 'One of three Pendants. The legend of the Dawnblade stirs...'], function () { self.fadeTo = function () { const ex = self.world.def.exit; self.enter(ex[0], ex[1] * 16 + 8, ex[2] * 16 + 12, 2); self.fade = 1; }; });
      return;
    }
    collect.call(this, p);
  };
  const pdraw = LV.Pickup.prototype.draw;
  LV.Pickup.prototype.draw = function (ctx, ox, oy) { if (this.kind === 'container') { ctx.drawImage(LV.IMG.objects, 64, 0, 16, 16, Math.round(this.x - ox - 8), Math.round(this.y - oy - 14 - Math.sin(this.t * 3) * 2), 16, 16); return; } pdraw.call(this, ctx, ox, oy); };
})();
