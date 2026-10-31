/* ================= Item icons: Ninja Adventure's 24 x 24 skill icons =================
   Each item uses one of the pack's bold, tile-backed skill icons (or, where the set has none, the pack's own sprite
   for it on a matching tile), so every item reads clearly at a glance in the menu and the item box. */
(function () {
  const icon = LV.itemIcon;
  LV.itemIcon = function (ctx, id, x, y, size) {
    const s = LV.game && LV.game.save;
    let key = id;
    if (id === 'dice' && s && s.items.ninjastars) key = 'stars';
    if (id === 'bottle') key = 'bottle_' + (((s && s.bottles) || [])[0] || 'empty');
    const im = LV.IMG['sk_' + key];
    if (!im) return icon(ctx, id, x, y);
    const n = size || 24;
    ctx.drawImage(im, Math.round(x), Math.round(y), n, n);
  };
})();
