/* ================= Dungeon floors: stairs, holes that drop you to the floor below, the floor banner and map ================= */
(function () {
  // falling into a hole: land on the floor below instead of climbing back out
  const ground = LV.Hero.prototype.checkGround;
  LV.Hero.prototype.checkGround = function (g) {
    const was = this.state; ground.call(this, g);
    if (this.state === 'fall' && was !== 'fall') this.fallAt = [Math.floor(this.x / 16), Math.floor((this.y - 3) / 16)];
  };
  const update = LV.Hero.prototype.update;
  LV.Hero.prototype.update = function (g, dt) {
    const d = g.world.def;
    if (this.state === 'fall' && d.drops && d.drops.length && this.fallAt && this.st + dt > 0.55) {
      const fx = this.fallAt[0], fy = this.fallAt[1], i = fy * g.world.w + fx;
      const drop = (d.lava || []).indexOf(i) < 0 && d.drops.find(function (q) { return fx >= q[0] && fx < q[0] + q[2] && fy >= q[1] && fy < q[1] + q[3]; });
      if (drop) {
        this.fallAt = null; this.state = 'walk'; this.st = 0;
        g.enter(drop[4], drop[5] * 16 + 8, drop[6] * 16 + 12, 2);
        g.hero.inv = 0.6; g.sfx('lift'); g.shake = 0.3; g.floorBanner = 1.6;
        return;
      }
    }
    update.call(this, g, dt);
  };
  // a banner with the floor's name whenever it changes
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    const before = this.world && this.world.def.floorName;
    enter.call(this, mapId, x, y, dir, first);
    const f = this.world.def.floorName;
    if (f && f !== before) this.floorBanner = 1.6;
  };
  const upd = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    upd.call(this, dt); if (this.floorBanner > 0) this.floorBanner -= dt;
    // just off the stairs: don't climb straight back while the arrow is still held from the trip
    if (this.stairLock > 0) { const hd = this.input.held; this.stairLock -= dt; if (!(hd.up || hd.down || hd.left || hd.right)) this.stairLock = 0; }
  };
  const warp = LV.Game.prototype.checkWarp;
  LV.Game.prototype.checkWarp = function () {
    const st = this.world.def.stairs, h = this.hero, tx = Math.floor(h.x / 16), ty = Math.floor((h.y - 3) / 16);
    const onStairs = st && st.some(function (s) { return s[0] === tx && s[1] === ty; });
    if (onStairs && this.stairLock > 0) return;
    if (onStairs && h.state === 'walk' && !this.fadeTo) { this.stairLock = 0.9; this.floorBanner = 1.6; }
    warp.call(this);
  };
  const render = LV.Game.prototype.render;
  LV.Game.prototype.render = function () {
    render.call(this);
    const d = this.world && this.world.def;
    if (this.mode !== 'title' && !this.mapOpen && d && d.floorName && this.floorBanner > 0) {
      const ctx = this.ctx, a = Math.min(1, this.floorBanner * 2);
      ctx.globalAlpha = a; LV.drawPanel(ctx, 96, 52, 64, 22); ctx.textAlign = 'center'; LV.text(ctx, d.floorName, 128, 59, '#f8d040'); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  };
  // stairs: drawn steps going up (lighter at the top) or down (into the dark)
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, g, ox, oy) {
    special(ctx, g, ox, oy);
    const st = g.world.def.stairs; if (!st) return;
    st.forEach(function (s) {
      const X = s[0] * 16 - ox, Y = s[1] * 16 - oy; if (X < -16 || Y < -16 || X > LV.VIEW_W || Y > LV.VIEW_H) return;
      ctx.fillStyle = '#1a1420'; ctx.fillRect(X, Y, 16, 16);
      for (let k = 0; k < 4; k++) {
        const up = s[2] === 1, shade = up ? 150 - k * 22 : 40 + k * 24;
        ctx.fillStyle = 'rgb(' + shade + ',' + (shade - 12) + ',' + (shade - 20) + ')';
        const inset = up ? k : 3 - k;
        ctx.fillRect(X + 1 + inset, Y + 1 + k * 4, 14 - inset * 2, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(X + 1 + inset, Y + 4 + k * 4, 14 - inset * 2, 1);
      }
      ctx.fillStyle = '#0c0a10'; ctx.fillRect(X, Y, 1, 16); ctx.fillRect(X + 15, Y, 1, 16);
    });
  };
  // the dungeon map: this floor's name and the floors of the dungeon, keys counted for the whole dungeon
  const drawMap = LV.Game.prototype.drawMap;
  LV.Game.prototype.drawMap = function () {
    drawMap.call(this);
    const d = this.world.def; if (!d.dungeon) return;
    const ctx = this.ctx;
    if (d.floors) {
      const list = d.floors.slice().sort(function (a, b) { const n = function (f) { return f[0] === 'B' ? -+f.slice(1) : +f.slice(0, -1); }; return n(b) - n(a); });
      list.forEach(function (f, i) { LV.text(ctx, f, 222, 40 + i * 12, f === d.floorName ? '#f8d040' : '#5a6090'); });
    }
  };
})();
