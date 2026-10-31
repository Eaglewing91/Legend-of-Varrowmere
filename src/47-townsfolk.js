/* ================= Townsfolk from Mana Seed =================
   Character art: Mana Seed Character Base and add-ons by Seliel the Shaper (seliel-the-shaper.itch.io), used with
   the artist's permission. Not covered by this game's licence: please don't copy it out of the script.
   Each person is dressed from the Mana Seed parts in tools/manaseed.py and packed into one atlas (LV.IMG.ms_people,
   index in LV.MS). They're drawn at three quarters of their size (the canvas has 2 x 2 pixels per game pixel, so the
   detail survives). Anyone not in the atlas (animals, the chest, fairies) keeps the Ninja Adventure look. */
LV.MS_K = 0.75;
LV.MS_ROW = [1, 2, 0, 3];                      // our dir (up, right, down, left) -> atlas row (down, up, right, left)
LV.msIndex = function (who) { const m = LV.MS; return m && who && LV.IMG.ms_people ? m.names.indexOf(who) : -1; };
// spirits: the same people in pale blue light
LV.msGhostImg = function () {
  if (LV.msGhost) return LV.msGhost;
  const im = LV.IMG.ms_people, c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const l = (p[i] + p[i + 1] + p[i + 2]) / 3; p[i] = Math.min(255, l / 2 + 110); p[i + 1] = Math.min(255, l / 2 + 150); p[i + 2] = 255; }
  x.putImageData(d, 0, 0); return (LV.msGhost = c);
};
// draw person i facing dir, frame 0 (standing) or 1-6 (walking), feet at (X, Y)
LV.msDraw = function (ctx, i, dir, frame, X, Y, ghost) {
  const m = LV.MS, im = ghost ? LV.msGhostImg() : LV.IMG.ms_people, K = LV.MS_K, row = i * 4 + LV.MS_ROW[dir];
  ctx.drawImage(im, frame * m.cw, row * m.ch, m.cw, m.ch, X - m.fx * K, Y - m.fy * K, m.cw * K, m.ch * K);
};
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s), i = LV.msIndex(e.who); if (i < 0) return e;
    e.ms = i; e.ghost = !!(s && s.ghost);
    const old = e.draw;
    e.draw = function (ctx, ox, oy) {
      if (LV.msIndex(this.who) !== this.ms) return old.call(this, ctx, ox, oy);
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy);
      const walking = !!(this.goal || this.moving), f = walking ? 1 + Math.floor((this.anim || 0) * 1.2) % 6 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 5, Y - 2, 10, 3);
      if (this.ghost) ctx.globalAlpha = 0.6 + Math.sin((this.t || 0) * 3) * 0.15;
      LV.msDraw(ctx, this.ms, this.dir, f, X, Y + (this.ghost ? Math.round(Math.sin((this.t || 0) * 2) * 1.5) - 2 : 0), this.ghost);
      ctx.globalAlpha = 1;
    };
    return e;
  };
})(LV.makeVillager);
LV.ENEMIES.villager = LV.makeVillager;
// their face beside the dialog: a close-up of the same person
LV.drawDialog = (function (orig) {
  return function (ctx, d) {
    const i = LV.msIndex(d.face); if (i < 0) return orig(ctx, d);
    const face = d.face; d.face = null; orig(ctx, d); d.face = face;
    const m = LV.MS, x = 24, y = (d.choices && d.i === d.lines.length - 1) ? 210 - (20 + d.choices.length * 12) - 46 : 146 - 46, fb = LV.IMG.ui_facebox;
    if (fb) ctx.drawImage(fb, x - 5, y - 7, 48, 48); else { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 2, y - 2, 42, 42); ctx.fillStyle = '#18183a'; ctx.fillRect(x, y, 38, 38); }
    ctx.drawImage(LV.IMG.ms_people, m.fx - 9, i * 4 * m.ch + 9, 18, 18, x, y - 2, 38, 38);
  };
})(LV.drawDialog);
