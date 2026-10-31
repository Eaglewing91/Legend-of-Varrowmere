/* ================= The game: state, camera, rules, drawing =================
   One Game owns the canvas, the current world, the hero and everything in it. */
LV.Game = function (canvas, opts) {
  opts = opts || {};
  this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
  this.input = new LV.Input(); this.store = opts.store || LV.memoryStore();
  this.save = this.store.get() || LV.newSave();
  this.actors = []; this.pickups = []; this.effects = []; this.shots = [];
  this.cam = { x: 0, y: 0 }; this.scroll = null; this.fade = 0; this.fadeTo = null;
  this.dialog = null; this.paused = false; this.t = 0; this.rng = LV.rng(opts.seed || 1234);
  this.muted = !!opts.muted; this.audio = null;
  this.enter(this.save.map, this.save.x, this.save.y, this.save.dir, true);
};
LV.newSave = function () {
  return { map: 'meadow', x: 8 * 16 + 8, y: 8 * 16 + 12, dir: 2, hp: 12, maxHp: 12, cash: 0, bombs: 0, arrows: 0, keys: {},
    items: {}, opened: {}, cut: {}, flags: {}, shards: 0, time: 0 };
};
LV.memoryStore = function () { let d = null; return { get: function () { return d && JSON.parse(d); }, set: function (v) { d = JSON.stringify(v); } }; };

/* ---------- moving between maps ---------- */
LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
  const def = LV.MAPS[mapId]; this.world = new LV.World(def);
  // things already opened or cut stay that way
  const self = this;
  Object.keys(this.save.opened).forEach(function (k) { const p = k.split(':'); if (p[0] === mapId) { const xy = p[1].split(','); self.world.layers.deco[+xy[1] * self.world.w + +xy[0]] = LV.CHEST_OPEN; } });
  if (!this.hero) this.hero = new LV.Hero(x, y);
  const h = this.hero; h.x = x; h.y = y; h.dir = dir === undefined ? h.dir : dir; h.safe = { x: x, y: y }; h.state = 'walk'; h.kb = 0;
  if (first) { h.hp = this.save.hp; h.maxHp = this.save.maxHp; }
  this.actors = []; this.pickups = []; this.effects = []; this.shots = [];
  def.spawns.forEach(function (s) { const mk = LV.ENEMIES[s.kind]; if (mk) self.actors.push(mk(s.x * 16 + 8, s.y * 16 + 14)); });
  this.area = this.world.areaAt(h.x, h.y - 8); this.cam = this.camFor(this.area);
  this.save.map = mapId;
};
LV.Game.prototype.camFor = function (a) {
  const T = LV.TILE, h = this.hero;
  const x = LV.clamp(h.x - LV.VIEW_W / 2, a[0] * T, (a[0] + a[2]) * T - LV.VIEW_W), y = LV.clamp(h.y - 8 - LV.VIEW_H / 2, a[1] * T, (a[1] + a[3]) * T - LV.VIEW_H);
  return { x: x, y: y };
};
LV.CHEST_OPEN = (3 << 16) | (0 << 8) | 1;

/* ---------- one simulation step ---------- */
LV.Game.prototype.update = function (dt) {
  this.input.beginStep(); this.t += dt; this.save.time += dt;
  if (this.fadeTo) { this.fade += dt * 4; if (this.fade >= 1) { const f = this.fadeTo; this.fadeTo = null; f(); } return; }
  if (this.fade > 0) { this.fade = Math.max(0, this.fade - dt * 4); }
  if (this.dialog) { if (this.input.pressed.attack || this.input.pressed.action) this.nextDialog(); return; }
  if (this.paused) { this.menuUpdate(); return; }
  if (this.input.pressed.menu) { this.paused = true; this.menu = null; this.sfx('door'); return; }
  if (this.shake > 0) this.shake -= dt;
  if (this.scroll) { this.stepScroll(dt); return; }
  const h = this.hero;
  h.update(this, dt);
  for (const a of this.actors) a.update(this, dt);
  for (const s of this.shots) s.update(this, dt);
  for (const p of this.pickups) p.update(this, dt);
  for (const e of this.effects) e.update(this, dt);
  // enemies touching the hero
  if (h.inv <= 0 && h.state !== 'fall') for (const a of this.actors) if (!a.dead && a.contact && LV.overlap(a.hurtBox(), h.hurtBox()))
    LV.applyHit(this, new LV.Hit({ team: 'enemy', kind: 'contact', power: a.contact, from: { x: a.x, y: a.y - 8 } }), h);
  // pick things up
  for (const p of this.pickups) if (!p.dead && LV.overlap(p.box(), h.hurtBox())) this.collect(p);
  this.actors = this.actors.filter(function (a) { return !a.dead; });
  this.pickups = this.pickups.filter(function (p) { return !p.dead; });
  this.effects = this.effects.filter(function (e) { return !e.dead; });
  this.shots = this.shots.filter(function (s) { return !s.dead; });
  this.checkEdges(); this.checkWarp();
  this.cam = this.camFor(this.area);
};

/* ---------- combat rules ---------- */
// A hero attack: hurts enemies, cuts bushes. poke = held blade (no bush cutting spam).
LV.Game.prototype.resolveHit = function (hit, fromHero, poke) {
  for (const a of this.actors) if (!a.dead && LV.overlap(hit.box, a.hurtBox())) LV.applyHit(this, hit, a);
  if (fromHero && !poke && (hit.kind === 'blade' || hit.kind === 'spin')) {
    const T = LV.TILE, b = hit.box, x0 = Math.floor(b.x / T), y0 = Math.floor(b.y / T), x1 = Math.floor((b.x + b.w - 1) / T), y1 = Math.floor((b.y + b.h - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.world.c(tx, ty) === LV.C.BUSH) this.cutBush(tx, ty);
  }
};
LV.Game.prototype.cutBush = function (tx, ty) {
  this.world.clearTile(tx, ty); this.effects.push(new LV.Effect(tx * 16 + 8, ty * 16 + 14, 'leaves')); this.sfx('cut');
  this.dropLoot(tx * 16 + 8, ty * 16 + 12, 0.35);
};
LV.Game.prototype.kill = function (a) {
  a.dead = true; this.effects.push(new LV.Effect(a.x, a.y, 'poof')); this.sfx('kill');
  if (a.drop) this.dropLoot(a.x, a.y, 0.6);
};
// The original's drop table, simplified: hearts when hurt, otherwise cash
LV.Game.prototype.dropLoot = function (x, y, chance) {
  const r = this.rng(); if (r > chance) return;
  const hurt = this.hero.hp < this.hero.maxHp;
  const kind = hurt && this.rng() < 0.5 ? 'heart' : this.rng() < 0.2 ? 'cash5' : 'cash1';
  this.pickups.push(new LV.Pickup(x, y, kind));
};
LV.Game.prototype.collect = function (p) {
  p.dead = true; const h = this.hero;
  if (p.kind === 'heart') { h.hp = Math.min(h.maxHp, h.hp + 4); this.sfx('heart'); }
  else { this.save.cash = Math.min(999, this.save.cash + (p.kind === 'cash5' ? 5 : 1)); this.sfx('cash'); }
};
LV.Game.prototype.heroDown = function () {
  const self = this; this.sfx('down');
  this.say(['You were hospitalized by a ' + (this.lastHitBy || 'nasty fall') + '.', 'The nurse patches you up. Your cash is safe... this time.'], function () {
    self.fadeTo = function () { self.hero.hp = 12; self.enter('home', 7 * 16 + 8, 11 * 16 + 12, 2); };
  });
};

/* ---------- talking, reading, chests, lifting ---------- */
LV.Game.prototype.interact = function (h) {
  const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), w = this.world;
  const key = tx + ',' + ty;
  if (w.signs[key]) { this.say(w.signs[key].split('|')); return true; }
  const ch = w.chests[key];
  if (ch && !this.save.opened[w.id + ':' + key] && h.dir === 0) { this.openChest(w.id, key, tx, ty, ch); return true; }
  const c = w.c(tx, ty);
  if (c === LV.C.BUSH) { w.clearTile(tx, ty); h.state = 'carry'; h.carry = 'bush'; this.sfx('lift'); this.dropLoot(tx * 16 + 8, ty * 16 + 12, 0.3); return true; }
  return false;
};
LV.ITEM_NAMES = { lantern: ['You got the Lantern!', 'Light up dark rooms and torches.'], heart_shard: ['You got a Heart Shard!', 'Collect four to gain a whole heart.'] };
LV.Game.prototype.openChest = function (mapId, key, tx, ty, ch) {
  this.save.opened[mapId + ':' + key] = 1; this.world.layers.deco[ty * this.world.w + tx] = LV.CHEST_OPEN; this.sfx('chest');
  const it = ch.item, s = this.save;
  if (it === 'heart_shard') { s.shards++; if (s.shards % 4 === 0) { s.maxHp += 4; this.hero.maxHp = s.maxHp; this.hero.hp = s.maxHp; } }
  else s.items[it] = 1;
  this.say(LV.ITEM_NAMES[it] || ['You got ' + it + '!']);
};
LV.Game.prototype.throwCarried = function (h) {
  const d = LV.DIRS[h.dir], g = this;
  const shot = { x: h.x, y: h.y - 14, vx: d.x * 180, vy: d.y * 180, t: 0, dead: false,
    update: function (game, dt) {
      this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt;
      const b = { x: this.x - 6, y: this.y - 6, w: 12, h: 12 };
      const hit = new LV.Hit({ team: 'hero', kind: 'thrown', power: 2, from: { x: this.x - this.vx, y: this.y - this.vy }, box: b });
      let hitSomething = false;
      for (const a of game.actors) if (!a.dead && LV.overlap(b, a.hurtBox())) { LV.applyHit(game, hit, a); hitSomething = true; }
      if (hitSomething || this.t > 0.32 || game.world.boxBlocked({ x: this.x - 2, y: this.y + 6, w: 4, h: 4 }, 'shot')) { this.dead = true; game.effects.push(new LV.Effect(this.x, this.y + 10, 'leaves')); game.sfx('cut'); }
    },
    draw: function (ctx, ox, oy) { ctx.drawImage(LV.IMG.overworld, 0, 16 * 16, 16, 16, Math.round(this.x - ox - 8), Math.round(this.y - oy - 8), 16, 16); } };
  this.shots.push(shot); h.carry = null; this.sfx('throw'); void g;
};

/* ---------- dialog box ---------- */
LV.Game.prototype.say = function (lines, then) { this.dialog = { lines: lines.slice(), i: 0, then: then || null }; };
LV.Game.prototype.nextDialog = function () {
  const d = this.dialog; d.i++;
  if (d.i >= d.lines.length) { this.dialog = null; if (d.then) d.then(); }
};

/* ---------- screen edges, scrolling and warps ---------- */
LV.Game.prototype.checkEdges = function () {
  const h = this.hero, a = this.area, T = LV.TILE;
  let dir = -1;
  if (h.x < a[0] * T + 1) dir = 3; else if (h.x > (a[0] + a[2]) * T - 1) dir = 1;
  else if (h.y - 3 < a[1] * T + 1) dir = 0; else if (h.y > (a[1] + a[3]) * T - 1) dir = 2;
  if (dir < 0) return;
  const d = LV.DIRS[dir], nx = h.x + d.x * 10, ny = h.y + d.y * 12;
  const next = this.world.areaAt(nx, ny - 3);
  if (next === a || nx < 0 || ny < 0 || nx > this.world.w * T || ny > this.world.h * T) { h.x = LV.clamp(h.x, a[0] * T + 2, (a[0] + a[2]) * T - 2); h.y = LV.clamp(h.y, a[1] * T + 5, (a[1] + a[3]) * T - 1); return; }
  // slide the camera to the next screen, walking the hero across, as in the original
  const from = { x: this.cam.x, y: this.cam.y }; this.area = next;
  this.scroll = { t: 0, from: from, dir: dir, hx: h.x, hy: h.y, tx: h.x + d.x * 20, ty: h.y + d.y * 20 };
};
LV.Game.prototype.stepScroll = function (dt) {
  const s = this.scroll, h = this.hero; s.t += dt / 0.6;
  const k = Math.min(1, s.t);
  h.x = LV.lerp(s.hx, s.tx, k); h.y = LV.lerp(s.hy, s.ty, k); h.anim += dt * 8; h.moving = true;
  const to = this.camFor(this.area);
  this.cam = { x: LV.lerp(s.from.x, to.x, k), y: LV.lerp(s.from.y, to.y, k) };
  if (k >= 1) { this.scroll = null; h.safe = { x: h.x, y: h.y }; this.actors.forEach(function (a) { if (a.state === 'chase') a.state = 'sleep'; }); }
};
LV.Game.prototype.checkWarp = function () {
  const h = this.hero, w = this.world.warpAt(Math.floor(h.x / 16), Math.floor((h.y - 3) / 16));
  if (!w || h.state !== 'walk') return;
  const self = this; this.sfx('door');
  this.fadeTo = function () { self.enter(w.to, w.tx * 16 + 8, w.ty * 16 + 12, w.dir); self.fade = 1; };
};

/* ---------- drawing ---------- */
LV.Game.prototype.render = function () {
  const sh = this.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
  const ctx = this.ctx, ox = Math.round(this.cam.x) + sh, oy = Math.round(this.cam.y);
  ctx.fillStyle = this.world.indoor ? '#120c10' : '#000'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H);
  LV.drawLayer(ctx, this.world, 'ground', ox, oy);
  LV.drawLayer(ctx, this.world, 'deco', ox, oy);
  LV.drawSpecialTiles(ctx, this, ox, oy);
  // actors sorted by their feet so nearer things overlap farther ones
  const all = [this.hero].concat(this.actors, this.pickups, this.shots);
  all.sort(function (a, b) { return a.y - b.y; });
  for (const a of all) LV.drawActor(ctx, a, ox, oy);
  for (const e of this.effects) e.draw(ctx, ox, oy);
  if (this.hero.carry) ctx.drawImage(LV.IMG.overworld, 0, 16 * 16, 16, 16, Math.round(this.hero.x - ox - 8), Math.round(this.hero.y - oy - 30), 16, 16);
  LV.drawLayer(ctx, this.world, 'over', ox, oy);
  if (this.world.dark) this.drawDark(ctx, ox, oy);
  LV.drawHud(ctx, this);
  if (this.dialog) LV.drawDialog(ctx, this.dialog);
  if (this.paused) LV.drawMenu(ctx, this);
  if (this.fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, this.fade) + ')'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H); }
};
// Dark rooms: everything is dim except a glow round the hero (bigger with the Lantern), as in the original
LV.Game.prototype.drawDark = function (ctx, ox, oy) {
  const h = this.hero, lights = [[h.x - ox, h.y - oy - 10, this.save.items.lantern ? 64 : 30]], w = this.world;
  for (let i = 0; i < w.col.length; i++) if (w.col[i] === LV.C.TORCH_LIT) lights.push([(i % w.w) * 16 + 8 - ox, Math.floor(i / w.w) * 16 + 4 - oy, 56]);
  if (!this.darkCv) { this.darkCv = document.createElement('canvas'); this.darkCv.width = LV.VIEW_W; this.darkCv.height = LV.VIEW_H; }
  const d = this.darkCv.getContext('2d'); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, LV.VIEW_W, LV.VIEW_H);
  d.fillStyle = 'rgba(8,4,16,.88)'; d.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H); d.globalCompositeOperation = 'destination-out';
  for (const L of lights) { const gr = d.createRadialGradient(L[0], L[1], L[2] * 0.3, L[0], L[1], L[2]); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.fillRect(L[0] - L[2], L[1] - L[2], L[2] * 2, L[2] * 2); }
  ctx.drawImage(this.darkCv, 0, 0);
};

/* ---------- sound: tiny generated effects (no audio files) ---------- */
LV.SFX = { swing: [[620, 0.05, 'square', 0.03, 300]], spin: [[300, 0.25, 'sawtooth', 0.04, 900]], hit: [[180, 0.08, 'square', 0.05, 90]], kill: [[400, 0.12, 'square', 0.04, 60]],
  hurt: [[220, 0.15, 'sawtooth', 0.06, 110]], cut: [[900, 0.05, 'triangle', 0.04, 400]], cash: [[1320, 0.05, 'square', 0.03], [1760, 0.08, 'square', 0.03]], heart: [[880, 0.06, 'triangle', 0.05], [1320, 0.1, 'triangle', 0.05]],
  chest: [[523, 0.1, 'square', 0.04], [659, 0.1, 'square', 0.04], [784, 0.1, 'square', 0.04], [1047, 0.25, 'square', 0.04]], clink: [[2000, 0.04, 'square', 0.03]], fall: [[600, 0.5, 'triangle', 0.05, 80]], splash: [[300, 0.3, 'sawtooth', 0.03, 80]],
  door: [[200, 0.08, 'square', 0.03]], lift: [[300, 0.06, 'triangle', 0.04, 500]], throw: [[500, 0.08, 'triangle', 0.04, 200]], down: [[400, 0.6, 'triangle', 0.05, 100]] };
LV.Game.prototype.sfx = function (name) {
  this.lastSfx = name;
  if (this.muted || typeof AudioContext === 'undefined') return;
  try {
    if (!this.audio) this.audio = new AudioContext();
    const ac = this.audio, list = LV.SFX[name] || []; let t0 = ac.currentTime;
    for (const s of list) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = s[2]; o.frequency.setValueAtTime(s[0], t0);
      if (s[4]) o.frequency.exponentialRampToValueAtTime(s[4], t0 + s[1]);
      g.gain.setValueAtTime(s[3], t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + s[1]);
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + s[1] + 0.02); t0 += s[1] * 0.8;
    }
  } catch (e) {}
};
