/* ================= HUD, dialog box and text ================= */
/* Text in the pack's 8 x 8 pixel font (proportional: each glyph is as wide as its ink), tinted and shadowed.
   Falls back to the browser's monospace font until the art has loaded. */
LV.FONT = { tint: {}, w: null };
LV.fontPrep = function () {
  const im = LV.IMG.ui_font; if (!im || LV.FONT.w) return !!im;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, w = [];
  for (let g = 0; g < 120; g++) { const gx = (g % 15) * 8, gy = Math.floor(g / 15) * 8; let lo = 8, hi = -1;
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) if (d[((gy + yy) * c.width + gx + xx) * 4 + 3]) { lo = Math.min(lo, xx); hi = Math.max(hi, xx); }
    w.push(hi < 0 ? [0, 3] : [lo, hi - lo + 1]); }
  LV.FONT.w = w; return true;
};
LV.fontTint = function (col) {
  if (LV.FONT.tint[col]) return LV.FONT.tint[col];
  const im = LV.IMG.ui_font, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return (LV.FONT.tint[col] = c);
};
LV.textWidth = function (s, size) {
  if (!LV.fontPrep()) return s.length * 5;
  const k = Math.max(1, Math.round((size || 8) / 8)); let n = 0;
  for (const ch of s) { const g = ch.charCodeAt(0) - 32; n += (g >= 0 && g < 120 ? LV.FONT.w[g][1] : 3) + 1; }
  return n * k;
};
LV.text = function (ctx, s, x, y, col, size) {
  s = String(s);
  if (!LV.fontPrep()) { ctx.font = 'bold ' + (size || 8) + 'px monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); return; }
  const k = Math.max(1, Math.round((size || 8) / 8)), ink = LV.fontTint(col || '#fff'), sh = LV.fontTint(col === LV.INK ? 'rgba(0,0,0,0)' : '#000');
  if (ctx.textAlign === 'center') x -= LV.textWidth(s, size) / 2; else if (ctx.textAlign === 'right' || ctx.textAlign === 'end') x -= LV.textWidth(s, size);
  let cx = Math.round(x);
  for (const ch of s) {
    const g = ch.charCodeAt(0) - 32; if (g < 0 || g >= 120) { cx += 4 * k; continue; }
    const W = LV.FONT.w[g], gx = (g % 15) * 8 + W[0], gy = Math.floor(g / 15) * 8;
    if (ch !== ' ') { ctx.drawImage(sh, gx, gy, W[1], 8, cx + k, Math.round(y) + k, W[1] * k, 8 * k); ctx.drawImage(ink, gx, gy, W[1], 8, cx, Math.round(y), W[1] * k, 8 * k); }
    cx += (W[1] + 1) * k;
  }
};
// the pack's parchment box, nine-sliced to any size; dialog text is dark ink on it
LV.INK = '#4a3428'; LV.INK_SEL = '#c8462a';
LV.drawBox = function (ctx, x, y, w, h) {
  const im = LV.IMG.ui_box; if (!im) { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#18183a'; ctx.fillRect(x, y, w, h); return false; }
  const s = 8, W = im.width, H = im.height;
  const part = function (sx, sy, sw, sh, dx, dy, dw, dh) { if (dw > 0 && dh > 0) ctx.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh); };
  part(0, 0, s, s, x, y, s, s); part(s, 0, W - 2 * s, s, x + s, y, w - 2 * s, s); part(W - s, 0, s, s, x + w - s, y, s, s);
  part(0, s, s, H - 2 * s, x, y + s, s, h - 2 * s); part(s, s, W - 2 * s, H - 2 * s, x + s, y + s, w - 2 * s, h - 2 * s); part(W - s, s, s, H - 2 * s, x + w - s, y + s, s, h - 2 * s);
  part(0, H - s, s, s, x, y + h - s, s, s); part(s, H - s, W - 2 * s, s, x + s, y + h - s, w - 2 * s, s); part(W - s, H - s, s, s, x + w - s, y + h - s, s, s);
  return true;
};
// The original's layout: energy meter, item box, counters (cash, bombs, arrows, keys) and LIFE with hearts.
LV.drawHud = function (ctx, g) {
  const s = g.save, h = g.hero;
  // energy meter
  ctx.fillStyle = '#10101a'; ctx.fillRect(7, 7, 9, 34); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(8, 8, 7, 32); ctx.fillStyle = '#10101a'; ctx.fillRect(9, 9, 5, 30);
  ctx.fillStyle = '#3cbe50'; ctx.fillRect(9, 9 + 30 - Math.round(30 * (s.energy === undefined ? 1 : s.energy)), 5, Math.round(30 * (s.energy === undefined ? 1 : s.energy)));
  // item box
  ctx.fillStyle = '#10101a'; ctx.fillRect(19, 7, 22, 22); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(20, 8, 20, 20); ctx.fillStyle = '#181828'; ctx.fillRect(21, 9, 18, 18);
  if (s.equip) LV.itemIcon(ctx, s.equip, 22, 10);
  // counters
  ctx.drawImage(LV.IMG.objects, 0, 64, 16, 16, 46, 5, 12, 12); LV.text(ctx, ('00' + s.cash).slice(-3), 46, 18);
  ctx.fillStyle = '#28408c'; ctx.fillRect(79, 9, 7, 7); ctx.fillStyle = '#a08060'; ctx.fillRect(82, 7, 1, 2); LV.text(ctx, ('0' + s.bombs).slice(-2), 77, 18);
  ctx.fillStyle = '#c8a064'; ctx.fillRect(98, 12, 10, 1); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(108, 11, 2, 3); LV.text(ctx, ('0' + s.arrows).slice(-2), 98, 18);
  const keys = s.keys[g.world.id] || 0;
  if (g.world.indoor) { ctx.fillStyle = '#e8c040'; ctx.fillRect(122, 8, 4, 4); ctx.fillRect(123, 12, 2, 5); LV.text(ctx, String(keys), 121, 18); }
  // LIFE
  LV.text(ctx, '- LIFE -', 170, 3, '#f85050');
  const n = h.maxHp / 4;
  for (let i = 0; i < n; i++) {
    const fill = LV.clamp(h.hp - i * 4, 0, 4), X = 158 + (i % 10) * 8, Y = 14 + Math.floor(i / 10) * 8;
    LV.heart(ctx, X, Y, fill);
  }
};
LV.HEART = ['.oo.oo.', 'orrorro', 'orrrrro', '.orrro.', '..oro..', '...o...'];
LV.heart = function (ctx, x, y, q) {
  for (let j = 0; j < 6; j++) for (let k = 0; k < 7; k++) {
    const c = LV.HEART[j][k]; if (c === '.') continue;
    if (c === 'o') ctx.fillStyle = '#1e0a10';
    else ctx.fillStyle = (q >= 4 || (q >= 2 && k <= 3) || (q >= 1 && k <= 1)) ? '#e82838' : '#501a24';
    ctx.fillRect(x + k, y + j, 1, 1);
  }
};
// Torches (braziers) and cracked walls are drawn from their collision codes
LV.drawSpecialTiles = function (ctx, g, ox, oy) {
  const w = g.world, x0 = Math.max(0, Math.floor(ox / 16)), y0 = Math.max(0, Math.floor(oy / 16)), x1 = Math.min(w.w - 1, x0 + 17), y1 = Math.min(w.h - 1, y0 + 15);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = w.col[ty * w.w + tx], X = tx * 16 - ox, Y = ty * 16 - oy;
    if (c === LV.C.TORCH || c === LV.C.TORCH_LIT) {
      ctx.fillStyle = '#171717'; ctx.fillRect(X + 2, Y + 4, 12, 12); ctx.fillStyle = '#8a8a9a'; ctx.fillRect(X + 3, Y + 5, 10, 10); ctx.fillStyle = '#b8b8c8'; ctx.fillRect(X + 3, Y + 5, 10, 2); ctx.fillStyle = '#4a4a5a'; ctx.fillRect(X + 4, Y + 8, 8, 2);
      if (c === LV.C.TORCH_LIT) ctx.drawImage(LV.IMG.objects, (4 + Math.floor(g.t * 10) % 7) * 16, 48, 16, 16, X, Y - 9, 16, 16);
    } else if (c === LV.C.CRACK) {
      ctx.fillStyle = '#171717'; ctx.fillRect(X + 7, Y + 2, 1, 5); ctx.fillRect(X + 5, Y + 6, 3, 1); ctx.fillRect(X + 4, Y + 7, 1, 5); ctx.fillRect(X + 8, Y + 7, 4, 1); ctx.fillRect(X + 11, Y + 8, 1, 4);
    }
  }
};
// Dialog box at the bottom, wrapped to the box width
LV.drawDialog = function (ctx, d) {
  const x = 24, y = 146, w = 208, h = 64;
  const paper = LV.drawBox(ctx, x - 2, y - 2, w + 4, h + 4), ink = paper ? LV.INK : '#fff';
  ctx.font = 'bold 8px monospace';
  const words = d.lines[d.i].split(' '); let line = '', ly = y + 8;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (LV.textWidth(test) > w - 16) { LV.text(ctx, line, x + 8, ly, ink); ly += 12; line = wd; } else line = test;
  }
  if (line) LV.text(ctx, line, x + 8, ly, ink);
  if (Math.floor(Date.now() / 300) % 2) { ctx.fillStyle = '#f8d040'; ctx.fillRect(x + w - 12, y + h - 9, 5, 3); ctx.fillRect(x + w - 11, y + h - 6, 3, 2); }
};
