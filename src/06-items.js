/* ================= Items: the menu, bombs, the Bow, the Ricochet Dice, the Lantern =================
   Item use works as in the original: pick one in the menu, press the item button to use it. */
LV.capB = function (s) { return 10 + 5 * (s.bombUp || 0); };
LV.capA = function (s) { return 30 + 10 * (s.arrowUp || 0); };
LV.C.CRACK = 9; LV.C.TORCH = 10; LV.C.TORCH_LIT = 11;
(function () {
  const blocks = LV.World.prototype.blocks;
  LV.World.prototype.blocks = function (code, mode) { if (code === LV.C.CRACK || code === LV.C.TORCH || code === LV.C.TORCH_LIT) return true; return blocks.call(this, code, mode); };
})();
// Menu order (only owned items are shown), with how each is drawn in the item box
LV.ITEMS = [
  { id: 'bow', name: 'Bow', need: function (s) { return s.items.bow; } },
  { id: 'dice', name: 'Ricochet Dice', need: function (s) { return s.items.dice; } },
  { id: 'bombs', name: 'Bombs', need: function (s) { return s.bombs > 0 || s.items.bombbag; } },
  { id: 'lantern', name: 'Lantern', need: function (s) { return s.items.lantern; } }
];
LV.itemIcon = function (ctx, id, x, y) {
  if (id === 'bow') { ctx.fillStyle = '#8a5a30'; for (let i = 0; i < 12; i++) ctx.fillRect(x + 4 + Math.round(Math.sin(i / 11 * Math.PI) * 5), y + 2 + i, 2, 1); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 4, y + 2, 1, 12); }
  else if (id === 'dice') { ctx.fillStyle = '#171717'; ctx.fillRect(x + 3, y + 3, 10, 10); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x + 4, y + 4, 8, 8); ctx.fillStyle = '#c43c3c'; ctx.fillRect(x + 5, y + 5, 2, 2); ctx.fillRect(x + 9, y + 9, 2, 2); ctx.fillRect(x + 7, y + 7, 2, 2); }
  else if (id === 'bombs') { ctx.fillStyle = '#171717'; ctx.fillRect(x + 3, y + 5, 10, 10); ctx.fillStyle = '#28408c'; ctx.fillRect(x + 4, y + 6, 8, 8); ctx.fillStyle = '#7a9ae0'; ctx.fillRect(x + 5, y + 7, 2, 2); ctx.fillStyle = '#a08060'; ctx.fillRect(x + 8, y + 2, 2, 3); }
  else if (id === 'lantern') { ctx.fillStyle = '#171717'; ctx.fillRect(x + 4, y + 3, 8, 11); ctx.fillStyle = '#e0b040'; ctx.fillRect(x + 5, y + 4, 6, 9); ctx.fillStyle = '#fff6c0'; ctx.fillRect(x + 6, y + 6, 4, 5); }
};
LV.Game.prototype.ownedItems = function () { const s = this.save; return LV.ITEMS.filter(function (it) { return it.need(s); }); };

/* ---------- the item menu (Enter) ---------- */
LV.Game.prototype.menuUpdate = function () {
  const inp = this.input, list = this.ownedItems(), s = this.save;
  if (!this.menu) { this.menu = { i: Math.max(0, list.findIndex(function (it) { return it.id === s.equip; })) }; }
  const m = this.menu;
  if (inp.pressed.right) m.i = Math.min(list.length - 1, m.i + 1);
  if (inp.pressed.left) m.i = Math.max(0, m.i - 1);
  if (inp.pressed.down) m.i = Math.min(list.length - 1, m.i + 4);
  if (inp.pressed.up) m.i = Math.max(0, m.i - 4);
  if (list[m.i]) s.equip = list[m.i].id;
  if (inp.pressed.menu) { this.paused = false; this.menu = null; this.sfx('door'); }
};
LV.drawMenu = function (ctx, g) {
  const list = g.ownedItems(), m = g.menu || { i: 0 };
  ctx.fillStyle = 'rgba(8,8,20,.92)'; ctx.fillRect(16, 40, 224, 150);
  ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 2; ctx.strokeRect(17, 41, 222, 148);
  LV.text(ctx, 'ITEMS', 24, 46, '#f8d040');
  list.forEach(function (it, k) {
    const x = 28 + (k % 4) * 30, y = 62 + Math.floor(k / 4) * 30;
    ctx.fillStyle = '#20203a'; ctx.fillRect(x, y, 22, 22);
    LV.itemIcon(ctx, it.id, x + 3, y + 3);
    if (k === m.i) { ctx.strokeStyle = '#f8d040'; ctx.strokeRect(x - 1, y - 1, 24, 24); }
  });
  const sel = list[m.i];
  if (sel) LV.text(ctx, sel.name, 28, 130, '#fff');
  if (!list.length) LV.text(ctx, 'No items yet.', 28, 70, '#aaa');
  LV.text(ctx, 'Heart Shards ' + (g.save.shards % 4) + '/4', 150, 130, '#f88');
  LV.text(ctx, 'Enter: back', 160, 174, '#888');
};

/* ---------- using the selected item ---------- */
LV.Game.prototype.useItem = function (h) {
  const id = this.save.equip, s = this.save, d = LV.DIRS[h.dir];
  if (id === 'bombs') {
    if (s.bombs <= 0) { this.sfx('clink'); return; }
    if (this.shots.some(function (x) { return x.kind === 'bomb'; }) && this.shots.filter(function (x) { return x.kind === 'bomb'; }).length >= 2) return;
    s.bombs--; this.shots.push(new LV.Bomb(h.x + d.x * 12, h.y + d.y * 10)); this.sfx('lift');
  } else if (id === 'bow') {
    if (s.arrows <= 0) { this.sfx('clink'); return; }
    s.arrows--; this.shots.push(new LV.Arrow(h.x + d.x * 6, h.y - 8 + d.y * 6, h.dir, 'hero')); this.sfx('throw');
    h.state = 'item'; h.st = 0;
  } else if (id === 'dice') {
    if (this.shots.some(function (x) { return x.kind === 'dice'; })) return;
    this.shots.push(new LV.Dice(h)); this.sfx('throw'); h.state = 'item'; h.st = 0;
  } else if (id === 'lantern') {
    const tx = Math.floor((h.x + d.x * 14) / 16), ty = Math.floor((h.y - 6 + d.y * 14) / 16);
    if (this.world.c(tx, ty) === LV.C.TORCH) this.lightTorch(tx, ty); else this.sfx('clink');
    h.state = 'item'; h.st = 0;
  }
};
LV.Game.prototype.lightTorch = function (tx, ty) {
  this.world.setC(tx, ty, LV.C.TORCH_LIT); this.sfx('heart');
  const key = this.world.id + ':' + tx + ',' + ty; this.save.lit = this.save.lit || {}; this.save.lit[key] = 1;
  if (this.onTorch) this.onTorch(tx, ty);
};

/* ---------- bombs: 1.6 s fuse, blast hurts everyone close (the hero too) and opens cracked walls ---------- */
LV.Bomb = function (x, y) { this.kind = 'bomb'; this.x = x; this.y = y; this.t = 0; this.dead = false; this.boom = false; };
LV.Bomb.prototype.update = function (g, dt) {
  this.t += dt;
  if (!this.boom && this.t >= 1.6) {
    this.boom = true; this.t = 0; g.sfx('kill'); g.shake = 0.25;
    const blast = { x: this.x - 22, y: this.y - 30, w: 44, h: 40 };
    const hit = new LV.Hit({ team: 'bomb', kind: 'bomb', power: 4, from: { x: this.x, y: this.y - 8 }, box: blast });
    for (const a of g.actors) if (!a.dead && LV.overlap(blast, a.hurtBox())) LV.applyHit(g, hit, a);
    if (LV.overlap(blast, g.hero.hurtBox())) LV.applyHit(g, new LV.Hit({ team: 'bomb', kind: 'bomb', power: 4, from: { x: this.x, y: this.y - 8 } }), g.hero);
    const T = 16;
    for (let ty = Math.floor(blast.y / T); ty <= Math.floor((blast.y + blast.h) / T); ty++) for (let tx = Math.floor(blast.x / T); tx <= Math.floor((blast.x + blast.w) / T); tx++) {
      const c = g.world.c(tx, ty);
      if (c === LV.C.CRACK) { g.world.setC(tx, ty, LV.C.OPEN); g.world.layers.deco[ty * g.world.w + tx] = -1; g.save.flags['crack:' + g.world.id + ':' + tx + ',' + ty] = 1; g.sfx('chest'); }
      else if (c === LV.C.BUSH) g.cutBush(tx, ty);
    }
  }
  if (this.boom && this.t > 0.35) this.dead = true;
};
LV.Bomb.prototype.draw = function (ctx, ox, oy) {
  const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
  if (this.boom) { const r = 8 + this.t * 60; ctx.fillStyle = 'rgba(255,240,180,' + (1 - this.t * 2.5) + ')'; ctx.beginPath(); ctx.arc(X, Y - 8, r, 0, 7); ctx.fill(); ctx.drawImage(LV.IMG.objects, 64 + Math.min(5, Math.floor(this.t / 0.35 * 6)) * 32, 64, 32, 32, X - 16, Y - 24, 32, 32); return; }
  const flash = this.t > 1.1 && Math.floor(this.t * 14) % 2;
  ctx.fillStyle = '#171717'; ctx.fillRect(X - 6, Y - 11, 12, 11); ctx.fillStyle = flash ? '#e84040' : '#28408c'; ctx.fillRect(X - 5, Y - 10, 10, 9); ctx.fillStyle = '#7a9ae0'; ctx.fillRect(X - 3, Y - 8, 2, 2);
  ctx.fillStyle = '#a08060'; ctx.fillRect(X - 1, Y - 14, 2, 3); if (Math.floor(this.t * 20) % 2) { ctx.fillStyle = '#ffd040'; ctx.fillRect(X - 1, Y - 16, 2, 2); }
};

/* ---------- arrows (hero or enemy archers): blocked by the shield (tier 1), stop at walls ---------- */
LV.Arrow = function (x, y, dir, team) { this.kind = 'arrow'; this.x = x; this.y = y; this.dir = dir; this.team = team; this.t = 0; this.dead = false; this.stuck = 0; this.done = new Set(); };
LV.Arrow.prototype.update = function (g, dt) {
  if (this.stuck) { this.stuck -= dt; if (this.stuck <= 0) this.dead = true; return; }
  this.t += dt; const d = LV.DIRS[this.dir], sp = this.team === 'hero' ? 230 : 140;
  this.x += d.x * sp * dt; this.y += d.y * sp * dt;
  const b = { x: this.x - 3, y: this.y - 3, w: 6, h: 6 };
  const hit = new LV.Hit({ team: this.team, kind: 'arrow', power: this.team === 'hero' ? 2 : 2, tier: 1, from: { x: this.x - d.x * 10, y: this.y - d.y * 10 }, box: b, done: this.done });
  if (this.team === 'hero') { for (const a of g.actors) if (!a.dead && LV.overlap(b, a.hurtBox())) { LV.applyHit(g, hit, a); this.dead = true; return; } }
  else if (LV.overlap(b, g.hero.hurtBox())) { const r = LV.applyHit(g, hit, g.hero); if (r) { this.dead = true; if (r === 'blocked') g.effects.push(new LV.Effect(this.x, this.y + 8, 'poof')); return; } }
  if (g.world.boxBlocked({ x: this.x - 1, y: this.y + 4, w: 2, h: 2 }, 'shot')) { this.stuck = 0.6; g.sfx('clink'); }
  if (this.t > 2) this.dead = true;
};
LV.Arrow.prototype.draw = function (ctx, ox, oy) {
  const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), d = LV.DIRS[this.dir];
  ctx.fillStyle = '#c8a064'; if (d.x) ctx.fillRect(X - 6, Y, 12, 1); else ctx.fillRect(X, Y - 6, 1, 12);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(X + d.x * 6 - 1, Y + d.y * 6 - 1, 3, 3);
};

/* ---------- the Ricochet Dice: thrown out and back; stuns enemies, fetches pickups ---------- */
LV.Dice = function (h) { this.kind = 'dice'; this.owner = h; const d = LV.DIRS[h.dir]; this.x = h.x; this.y = h.y - 10; this.vx = d.x * 190; this.vy = d.y * 190; this.t = 0; this.back = false; this.dead = false; this.done = new Set(); this.carry = null; };
LV.Dice.prototype.update = function (g, dt) {
  this.t += dt; const h = this.owner;
  if (!this.back) { this.x += this.vx * dt; this.y += this.vy * dt; if (this.t > 0.42 || g.world.boxBlocked({ x: this.x - 3, y: this.y + 2, w: 6, h: 6 }, 'shot')) this.back = true; }
  else { const dx = h.x - this.x, dy = h.y - 10 - this.y, d = Math.hypot(dx, dy); if (d < 8) { this.dead = true; if (this.carry) g.collect(this.carry); return; } this.x += dx / d * 220 * dt; this.y += dy / d * 220 * dt; }
  const b = { x: this.x - 5, y: this.y - 5, w: 10, h: 10 };
  for (const a of g.actors) if (!a.dead && !this.done.has(a) && LV.overlap(b, a.hurtBox())) { this.done.add(a); a.stun = 2; g.sfx('clink'); this.back = true; if (a.weakToDice) LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'dice', power: 1, from: { x: this.x, y: this.y } }), a); }
  if (!this.carry) for (const p of g.pickups) if (!p.dead && LV.overlap(b, p.box())) { this.carry = p; p.dead = true; this.back = true; }
};
LV.Dice.prototype.draw = function (ctx, ox, oy) {
  const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), f = Math.floor(this.t * 16) % 2;
  ctx.fillStyle = '#171717'; ctx.fillRect(X - 4, Y - 4, 9, 9); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(X - 3, Y - 3, 7, 7); ctx.fillStyle = '#c43c3c';
  if (f) { ctx.fillRect(X - 2, Y - 2, 2, 2); ctx.fillRect(X + 1, Y + 1, 2, 2); } else ctx.fillRect(X - 1, Y - 1, 2, 2);
};

/* ---------- remembering what was blown open or lit, and item chests ---------- */
(function () {
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const w = this.world, s = this.save;
    Object.keys(s.flags).forEach(function (k) { const p = k.split(':'); if (p[0] === 'crack' && p[1] === mapId) { const xy = p[2].split(','); w.setC(+xy[0], +xy[1], LV.C.OPEN); w.layers.deco[+xy[1] * w.w + +xy[0]] = -1; } });
    Object.keys(s.lit || {}).forEach(function (k) { const p = k.split(':'); if (p[0] === mapId) { const xy = p[1].split(','); w.setC(+xy[0], +xy[1], LV.C.TORCH_LIT); } });
  };
  const open = LV.Game.prototype.openChest;
  LV.Game.prototype.openChest = function (mapId, key, tx, ty, ch) {
    const s = this.save, it = ch.item;
    if (it === 'bombs') { s.items.bombbag = 1; s.bombs = Math.min(LV.capB(s), s.bombs + 10); }
    else if (it === 'bow') { s.items.bow = 1; s.arrows = Math.min(LV.capA(s), s.arrows + 20); }
    else if (it === 'dice') s.items.dice = 1;
    else if (it === 'arrows') s.arrows = Math.min(LV.capA(s), s.arrows + 10);
    if (['bombs', 'bow', 'dice', 'arrows'].indexOf(it) >= 0) {
      s.opened[mapId + ':' + key] = 1; this.world.layers.deco[ty * this.world.w + tx] = LV.CHEST_OPEN; this.sfx('chest');
      if (!s.equip && it !== 'arrows') s.equip = it;
      this.say(LV.ITEM_NAMES[it] || ['You got ' + it + '!']); return;
    }
    open.call(this, mapId, key, tx, ty, ch);
    if (it === 'lantern' && !s.equip) s.equip = 'lantern';
  };
  Object.assign(LV.ITEM_NAMES, {
    bombs: ['You got Bombs!', 'Set one with the item button. Stand back: they hurt you too.', 'Cracked walls hide secrets...'],
    bow: ['You got the Bow!', 'Fire arrows with the item button.'],
    dice: ['You got the Ricochet Dice!', 'Throw them to stun enemies and fetch things from afar.'],
    arrows: ['You got 10 arrows!']
  });
})();
