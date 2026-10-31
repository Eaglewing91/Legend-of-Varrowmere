/* ================= Living scenery: water ripples and weather (all Ninja Adventure art) ================= */
LV.WEATHER = { frostspire: 'snow', skyridge: 'snow', icemere: 'snow', s_frostspire: 'snow', s_skyridge: 'snow', s_icemere: 'snow',
  willowfen: 'rain', willowfen_s: 'rain', s_willowfen: 'rain', s_willowfen_s: 'rain', whisperwood: 'leaf', grove: 'leaf', s_whisperwood: 'leaf' };
LV.sceneTime = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; };
(function () {
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, game, ox, oy) {
    special(ctx, game, ox, oy);
    const w = game.world, im = LV.IMG.an_ripples; if (!im || w.indoor) return;
    const t = LV.sceneTime(), x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (w.col[y * w.w + x] !== LV.C.DEEP || (x * 7 + y * 11) % 6) continue;
      const f = Math.floor(t * 4 + x * 3 + y) % 8; if (f > 3) continue;     // ripple, then calm for a moment
      ctx.drawImage(im, f * 16, 0, 16, 16, x * 16 - ox, y * 16 - oy, 16, 16);
    }
  };
  // weather drifts over everything in the world (under the HUD): snow, rain, falling leaves
  const dl = LV.drawLayer;
  LV.drawLayer = function (ctx, world, name, ox, oy) {
    dl(ctx, world, name, ox, oy);
    if (name !== 'over') return;
    const kind = LV.WEATHER[world.id], g = LV.game; if (!kind || !g) return;
    const W = g.weather = g.weather && g.weather.kind === kind ? g.weather : { kind: kind, p: [], last: LV.sceneTime() };
    const now = LV.sceneTime(), dt = Math.min(0.05, now - W.last); W.last = now;
    const want = kind === 'rain' ? 70 : kind === 'snow' ? 55 : 12, key = kind === 'leaf' ? 'leaf' : kind, im = LV.IMG['fx_' + key]; if (!im) return;
    while (W.p.length < want) W.p.push({ x: Math.random() * 272, y: Math.random() * 240 - 16, f: Math.floor(Math.random() * 6), s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6 });
    const fw = LV.PART[key], n = Math.max(1, Math.floor(im.width / fw));
    ctx.globalAlpha = kind === 'rain' ? 0.6 : 0.9;
    for (const p of W.p) {
      if (kind === 'rain') { p.x -= 40 * dt; p.y += 260 * dt * p.s; }
      else if (kind === 'snow') { p.x += Math.sin(now * 1.5 + p.ph) * 12 * dt - 6 * dt; p.y += 26 * dt * p.s; }
      else { p.x += (Math.sin(now + p.ph) * 20 - 10) * dt; p.y += 18 * dt * p.s; }
      if (p.y > 230 || p.x < -16) { p.y = -10; p.x = Math.random() * 300; }
      const f = kind === 'leaf' ? Math.floor(now * 6 + p.ph) % n : p.f % n;
      ctx.drawImage(im, f * fw, 0, fw, im.height, Math.round(p.x), Math.round(p.y), fw, im.height);
    }
    ctx.globalAlpha = 1;
  };
})();

/* ================= Item icons from the pack (centred in the 16 x 16 item box) ================= */
LV.itemIcon = (function (orig) {
  return function (ctx, id, x, y) {
    let key = 'it_' + id;
    if (id === 'bottle') { const b = (LV.game && LV.game.save.bottles || [])[0]; if (b && b !== 'empty') key = 'it_bottle_' + b; }
    const im = LV.IMG[key]; if (!im) return orig(ctx, id, x, y);
    const s = Math.min(1, 14 / Math.max(im.width, im.height));
    if (id === 'bow') { ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(-Math.PI / 4); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore(); return; }
    ctx.drawImage(im, Math.round(x + 8 - im.width * s / 2), Math.round(y + 8 - im.height * s / 2), im.width * s, im.height * s);
  };
})(LV.itemIcon);

/* ================= The sleeping log enemy is now the pack's bamboo creature ================= */
(function () {
  const make = LV.ENEMIES.log;
  LV.ENEMIES.log = function (x, y) {
    const e = make(x, y), old = e.draw;
    e.draw = function (ctx, ox, oy) {
      const im = LV.IMG.m_bamboo; if (!im) return old.call(this, ctx, ox, oy);
      if (this.inv > 0 && Math.floor(this.inv * 30) % 2) return;
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), asleep = this.state === 'sleep';
      const col = LV.HCOL[this.dir], row = asleep ? 0 : this.state === 'wake' ? 1 : Math.floor(this.t * 6) % 4;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 6, Y - 2, 12, 3);
      ctx.drawImage(im, (asleep ? 0 : col) * 16, row * 16, 16, 16, X - 8, Y - 16, 16, 16);
      if (asleep && Math.floor(this.t * 2) % 2) LV.text(ctx, 'z', X + 5, Y - 22, '#ffffff');
    };
    return e;
  };
})();

/* ================= Dungeon furniture from the pack: braziers, pressure plates, push blocks, locked doors, pegs ================= */
(function () {
  const D = function (ctx, tx, ty, X, Y) { const im = LV.IMG.nadungeon; if (im) ctx.drawImage(im, tx * 16, ty * 16, 16, 16, X, Y, 16, 16); };
  const block = LV.drawBlock;
  LV.drawBlock = function (ctx, X, Y) { if (LV.IMG.nadungeon) D(ctx, 2, 1, X, Y); else block(ctx, X, Y); };
  const special = LV.drawSpecialTiles;
  LV.drawSpecialTiles = function (ctx, g, ox, oy) {
    special(ctx, g, ox, oy);
    if (!LV.IMG.nadungeon) return;
    const w = g.world, C = LV.C, x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
    for (const p of (w.def.plates || [])) { if (w.c(p[0], p[1]) !== C.BLOCK) D(ctx, 0, 1, p[0] * 16 - ox, p[1] * 16 - oy); }
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = w.col[ty * w.w + tx], X = tx * 16 - ox, Y = ty * 16 - oy;
      if (c === C.TORCH) D(ctx, 2, 3, X, Y);
      else if (c === C.TORCH_LIT) { D(ctx, 2, 2, X, Y); const fl = LV.IMG.fx_flam; if (fl) { const f = 2 + Math.floor(g.t * 12 + tx) % 3; ctx.drawImage(fl, f * 25, 0, 25, 30, X - 4, Y - 20, 25, 30); } }
      else if (c === C.LOCKED) D(ctx, 0, 0, X, Y);
      else if (c === C.BIGLOCK) D(ctx, 1, 0, X, Y);
      else if (c === C.PEG) D(ctx, 0, 3, X, Y);
    }
  };
})();
