/* ================= Story changes to maps, the sluice lever, Captain Brask (mini-boss) ================= */
LV.C.LEVER = 18;
(function () {
  const blocks = LV.World.prototype.blocks;
  LV.World.prototype.blocks = function (code, mode) { return code === LV.C.LEVER ? true : blocks.call(this, code, mode); };
  // Maps can carry variants: tile, collision and warp changes that apply once a story flag is set
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const w = this.world, self = this;
    (w.def.variants || []).forEach(function (v) { if (LV.flagTrue(self, v.when)) LV.applyVariant(w, v); });
    // revealed chests that were already opened stay open
    Object.keys((w.def.reveal || {})).forEach(function (g) { w.def.reveal[g].forEach(function (p) { if (self.save.opened[w.id + ':' + p[0] + ',' + p[1]] && w.c(p[0], p[1]) !== LV.C.OPEN) w.layers.deco[p[1] * w.w + p[0]] = LV.CHEST_OPEN; }); });
  };
  // A hidden chest can't be opened before it appears
  const interact = LV.Game.prototype.interact;
  LV.Game.prototype.interact = function (h) {
    const d = LV.DIRS[h.dir], tx = Math.floor((h.x + d.x * 12) / 16), ty = Math.floor((h.y - 4 + d.y * 12) / 16), w = this.world;
    if (w.chests[tx + ',' + ty] && w.c(tx, ty) === LV.C.OPEN) return false;
    if (w.c(tx, ty) === LV.C.LEVER) { this.pullLever(tx, ty); return true; }
    return interact.call(this, h);
  };
})();
LV.applyVariant = function (w, v) {
  // the World's layers and collision are its own copies, so changing them never touches the map definition
  v.tiles.forEach(function (t) { w.layers[t[0]][t[1]] = t[2]; });
  v.col.forEach(function (c) { w.col[c[0]] = c[1]; });
  if (v.warps.length) w.warps = w.warps.concat(v.warps);
};
LV.Game.prototype.pullLever = function () {
  const s = this.save;
  if (s.flags.sluice) { this.say(['The lever will not budge. The gate is already shut.']); return; }
  s.flags.sluice = 1; this.sfx('chest'); this.shake = 0.8;
  this.say(['You heave the rusty lever...', 'CLUNK! The sluice gate slams shut. Somewhere downstream, water is rushing away.']);
};
LV.drawSpecialTiles = (function (orig) {
  return function (ctx, g, ox, oy) {
    orig(ctx, g, ox, oy);
    const w = g.world;
    for (let i = 0; i < w.col.length; i++) if (w.col[i] === LV.C.LEVER) {
      const X = (i % w.w) * 16 - ox, Y = Math.floor(i / w.w) * 16 - oy; if (X < -16 || Y < -16 || X > 256 || Y > 224) continue;
      ctx.fillStyle = '#2a2a32'; ctx.fillRect(X + 2, Y + 9, 12, 6); ctx.fillStyle = '#7a7a88'; ctx.fillRect(X + 3, Y + 10, 10, 4);
      const on = !!g.save.flags.sluice; ctx.fillStyle = '#5a3a1a';
      for (let k = 0; k < 9; k++) ctx.fillRect(X + 7 + (on ? -k * 0.5 : k * 0.5), Y + 10 - k, 2, 1);
      ctx.fillStyle = '#d83030'; ctx.fillRect(X + 6 + (on ? -5 : 4), Y - 1, 4, 3);
    }
  };
})(LV.drawSpecialTiles);

/* ---------- Captain Brask: a hulking Gilded Hand officer guarding the Big Key ----------
   Twice the size of a soldier, too heavy to knock back. He stalks you, then lines up and charges;
   if he slams into a wall he is dazed for a moment, which is the time to strike. */
LV.ENEMIES.brute = function (x, y) {
  const e = new LV.Actor({ x: x, y: y, hp: 12, contact: 4, body: [-9, -8, 18, 8], hurt: [-10, -40, 20, 40], kind: 'brute' });
  e.heavy = true; e.state = 'stalk'; e.st = 0; e.anim = 0; e.drop = false; e.name = 'Captain Brask'; e.weakToDice = false;
  e.update = function (g, dt) {
    this.t += dt; this.st += dt; if (this.inv > 0) this.inv -= dt;
    if (this.stun > 0) { this.stun -= dt; return; }
    const h = g.hero, dx = h.x - this.x, dy = h.y - this.y, d = Math.hypot(dx, dy) || 1;
    if (this.state === 'stalk') {
      this.dir = LV.dirFromVec(dx, dy, this.dir); this.anim += dt * 4;
      LV.move(this, g.world, dx / d * 22 * dt, dy / d * 22 * dt, 'enemy');
      if (this.st > 1.6 && (Math.abs(dx) < 10 || Math.abs(dy) < 10)) { this.state = 'wind'; this.st = 0; this.dir = Math.abs(dx) < 10 ? (dy > 0 ? 2 : 0) : (dx > 0 ? 1 : 3); g.sfx('clink'); }
    } else if (this.state === 'wind') {
      if (this.st > 0.5) { this.state = 'charge'; this.st = 0; g.sfx('swing'); }
    } else if (this.state === 'charge') {
      const v = LV.DIRS[this.dir]; this.anim += dt * 12;
      const r = LV.move(this, g.world, v.x * 150 * dt, v.y * 150 * dt, 'enemy');
      if ((v.x && !r.x) || (v.y && !r.y)) { this.state = 'dazed'; this.st = 0; this.stun = 0; g.shake = 0.3; g.sfx('kill'); }
      else if (this.st > 1.4) { this.state = 'stalk'; this.st = 0; }
    } else if (this.state === 'dazed') {
      if (this.st > 1.6) { this.state = 'stalk'; this.st = 0; }
    }
  };
  e.draw = function (ctx, ox, oy) {
    if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
    const img = LV.IMG.soldier_purple, X = Math.round(this.x - ox), Y = Math.round(this.y - oy), col = this.state === 'dazed' ? 0 : Math.floor(this.anim) % 4;
    const shake = this.state === 'wind' ? Math.round(Math.sin(this.t * 60)) : 0;
    ctx.drawImage(img, col * 16, LV.HERO_ROW[this.dir] * 32, 16, 32, X - 12 + shake, Y - 44, 24, 48);
    if (this.state === 'dazed') { ctx.fillStyle = '#f8d040'; const a = this.t * 8; ctx.fillRect(X + Math.cos(a) * 9, Y - 48, 2, 2); ctx.fillRect(X - Math.cos(a) * 9, Y - 48, 2, 2); }
  };
  return e;
};
// Brask only takes real damage while dazed; otherwise the blade glances off his armour
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) {
    if (t.kind === 'brute' && t.state !== 'dazed' && hit.team === 'hero' && !t.inv) { if (!hit.done.has(t)) { hit.done.add(t); game.sfx('clink'); } return 'immune'; }
    return ah(game, hit, t);
  };
})();
