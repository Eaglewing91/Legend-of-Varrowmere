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
