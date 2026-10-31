/* ================= HUD, dialog box and text ================= */
LV.text = function (ctx, s, x, y, col, size) {
  ctx.font = 'bold ' + (size || 8) + 'px monospace'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
};
// The original's layout: energy meter, item box, counters (cash, bombs, arrows, keys) and LIFE with hearts.
LV.drawHud = function (ctx, g) {
  const s = g.save, h = g.hero;
  // energy meter
  ctx.fillStyle = '#10101a'; ctx.fillRect(7, 7, 9, 34); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(8, 8, 7, 32); ctx.fillStyle = '#10101a'; ctx.fillRect(9, 9, 5, 30);
  ctx.fillStyle = '#3cbe50'; ctx.fillRect(9, 9 + 30 - Math.round(30 * (s.energy === undefined ? 1 : s.energy)), 5, Math.round(30 * (s.energy === undefined ? 1 : s.energy)));
  // item box
  ctx.fillStyle = '#10101a'; ctx.fillRect(19, 7, 22, 22); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(20, 8, 20, 20); ctx.fillStyle = '#181828'; ctx.fillRect(21, 9, 18, 18);
  if (s.items.lantern) { ctx.fillStyle = '#e0b040'; ctx.fillRect(27, 13, 6, 9); ctx.fillStyle = '#fff6c0'; ctx.fillRect(28, 15, 4, 5); }
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
// Dialog box at the bottom, wrapped to the box width
LV.drawDialog = function (ctx, d) {
  const x = 24, y = 146, w = 208, h = 64;
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#18183a'; ctx.fillRect(x, y, w, h);
  ctx.font = 'bold 8px monospace';
  const words = d.lines[d.i].split(' '); let line = '', ly = y + 8;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (ctx.measureText(test).width > w - 16) { LV.text(ctx, line, x + 8, ly); ly += 12; line = wd; } else line = test;
  }
  if (line) LV.text(ctx, line, x + 8, ly);
  if (Math.floor(Date.now() / 300) % 2) { ctx.fillStyle = '#f8d040'; ctx.fillRect(x + w - 12, y + h - 9, 5, 3); ctx.fillRect(x + w - 11, y + h - 6, 3, 2); }
};
