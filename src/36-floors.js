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

/* ================= Crystal switches: strike one and the blue and orange blocks trade places (the whole dungeon) ================= */
LV.C.CBLUE = 26; LV.C.CORANGE = 27; LV.C.CRYSTAL = 28;
(function () {
  const C = LV.C;
  const blocks = LV.World.prototype.blocks;
  LV.World.prototype.blocks = function (code, mode) {
    if (code === C.CRYSTAL) return true;
    if (code === C.CBLUE) return !this.crys;
    if (code === C.CORANGE) return !!this.crys;
    return blocks.call(this, code, mode);
  };
  const enter = LV.Game.prototype.enter;
  LV.Game.prototype.enter = function (mapId, x, y, dir, first) {
    enter.call(this, mapId, x, y, dir, first);
    const d = this.world.def; this.world.crys = !!(d.dungeon && this.save.flags[d.dungeon + ':crys']);
    this.applyDark();
  };
  LV.Game.prototype.toggleCrystal = function () {
    if (this.crysCool > 0) return; this.crysCool = 0.5;
    const d = this.world.def, k = d.dungeon + ':crys';
    if (this.save.flags[k]) delete this.save.flags[k]; else this.save.flags[k] = 1;
    this.world.crys = !!this.save.flags[k]; this.sfx('clink'); this.shake = 0.15;
    // anyone standing where a block just rose is lifted onto the nearest free floor
    const h = this.hero, w = this.world, tx = Math.floor(h.x / 16), ty = Math.floor((h.y - 3) / 16);
    if (w.blocks(w.c(tx, ty), 'hero')) {
      for (let r = 1; r < 4; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const c = w.c(tx + i, ty + j);
        if ((c === C.OPEN || c === C.PLATE) && !w.blocks(c, 'hero')) { h.x = (tx + i) * 16 + 8; h.y = (ty + j) * 16 + 12; return; }
      }
    }
  };
  const resolve = LV.Game.prototype.resolveHit;
  LV.Game.prototype.resolveHit = function (hit, fromHero, poke) {
    resolve.call(this, hit, fromHero, poke);
    if (!fromHero || !hit.box) return;
    const T = 16, b = hit.box, w = this.world;
    for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 1) / T); ty++) for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 1) / T); tx++) if (w.c(tx, ty) === C.CRYSTAL) { this.toggleCrystal(); return; }
  };
  const aup = LV.Arrow.prototype.update;
  LV.Arrow.prototype.update = function (g, dt) {
    const was = this.stuck; aup.call(this, g, dt);
    if (!was && this.stuck && this.team === 'hero' && g.world.cAt(this.x, this.y + 5) === C.CRYSTAL) g.toggleCrystal();
  };
  // rooms that are dark: the lantern's glow and lit torches are all the light there is
  LV.Game.prototype.applyDark = function () {
    const w = this.world, d = w.def; if (!d.darkAreas) return;
    w.dark = !!d.dark || d.darkAreas.indexOf(w.areas.indexOf(this.area)) >= 0;
  };
  const upd = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) { upd.call(this, dt); if (this.crysCool > 0) this.crysCool -= dt; if (this.world) this.applyDark(); };
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, g, ox, oy) {
    special(ctx, g, ox, oy);
    const w = g.world; if (!w.def.dungeon) return;
    const x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = w.c(tx, ty); if (c !== C.CBLUE && c !== C.CORANGE && c !== C.CRYSTAL) continue;
      const X = tx * 16 - ox, Y = ty * 16 - oy;
      if (c === C.CRYSTAL) {
        const t = g.t || 0, glow = 0.7 + Math.sin(t * 5) * 0.3, col = w.crys ? ['#c85a10', '#f89838', '#ffd8a0'] : ['#1a4ab0', '#4a90f0', '#c8e8ff'];
        ctx.fillStyle = '#2a2430'; ctx.fillRect(X + 3, Y + 12, 10, 4);
        ctx.fillStyle = '#0c0a14'; ctx.beginPath(); ctx.moveTo(X + 8, Y); ctx.lineTo(X + 15, Y + 7); ctx.lineTo(X + 8, Y + 14); ctx.lineTo(X + 1, Y + 7); ctx.fill();
        ctx.fillStyle = col[0]; ctx.beginPath(); ctx.moveTo(X + 8, Y + 1); ctx.lineTo(X + 14, Y + 7); ctx.lineTo(X + 8, Y + 13); ctx.lineTo(X + 2, Y + 7); ctx.fill();
        ctx.fillStyle = col[1]; ctx.beginPath(); ctx.moveTo(X + 8, Y + 1); ctx.lineTo(X + 14, Y + 7); ctx.lineTo(X + 8, Y + 7); ctx.fill();
        ctx.globalAlpha = glow; ctx.fillStyle = col[2]; ctx.fillRect(X + 6, Y + 4, 2, 2); ctx.globalAlpha = 1;
        continue;
      }
      const up = c === C.CBLUE ? !w.crys : !!w.crys, base = c === C.CBLUE ? ['#123a8a', '#3a78e0', '#8ac0ff'] : ['#8a3a08', '#e07a20', '#ffc070'];
      if (up) {
        ctx.fillStyle = '#0c0a10'; ctx.fillRect(X, Y, 16, 16);
        ctx.fillStyle = base[0]; ctx.fillRect(X + 1, Y + 1, 14, 14);
        ctx.fillStyle = base[1]; ctx.fillRect(X + 1, Y + 1, 14, 10);
        ctx.fillStyle = base[2]; ctx.fillRect(X + 2, Y + 2, 12, 2); ctx.fillRect(X + 2, Y + 2, 2, 8);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + 1, Y + 1, 14, 14);
        ctx.fillStyle = base[0]; ctx.fillRect(X + 2, Y + 2, 12, 1); ctx.fillRect(X + 2, Y + 13, 12, 1); ctx.fillRect(X + 2, Y + 2, 1, 12); ctx.fillRect(X + 13, Y + 2, 1, 12);
      }
    }
  };
})();
