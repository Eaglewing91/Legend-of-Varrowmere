/* ================= Start-up: load art, open the game window =================
   The art sheets are stored in the script as base64 PNG (LV.ART) and decoded once. */
LV.IMG = {};
LV.loadArt = function () {
  return Promise.all(Object.keys(LV.ART).map(function (k) {
    return new Promise(function (res) { const im = new Image(); im.onload = function () { LV.IMG[k] = im; res(); }; im.onerror = res; im.src = 'data:image/png;base64,' + LV.ART[k]; });
  })).then(function () { LV.prepareEnemyArt(); });
};
LV.storeFor = function () {
  const key = 'lv_save';
  try {
    if (typeof GM_getValue === 'function') return { get: function () { const v = GM_getValue(key, null); return v ? JSON.parse(v) : null; }, set: function (v) { GM_setValue(key, JSON.stringify(v)); } };
    return { get: function () { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }, set: function (v) { localStorage.setItem(key, JSON.stringify(v)); } };
  } catch (e) { return LV.memoryStore(); }
};
/* Open the game in a window over the current page. Keys only drive the game while it's open and you're not typing. */
LV.open = function (opts) {
  opts = opts || {};
  if (LV.root) { LV.root.style.display = 'flex'; if (LV.loop) LV.loop.start(); return LV.game; }
  const root = document.createElement('div'); LV.root = root;
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;flex-direction:column';
  const cv = document.createElement('canvas'); cv.width = LV.VIEW_W; cv.height = LV.VIEW_H;
  cv.style.cssText = 'image-rendering:pixelated;image-rendering:crisp-edges;box-shadow:0 0 0 2px #333';
  const fit = function () { const s = Math.max(1, Math.floor(Math.min(innerWidth / LV.VIEW_W, (innerHeight - 40) / LV.VIEW_H))); cv.style.width = LV.VIEW_W * s + 'px'; cv.style.height = LV.VIEW_H * s + 'px'; };
  fit(); addEventListener('resize', fit);
  const bar = document.createElement('div'); bar.style.cssText = 'color:#ccc;font:12px sans-serif;margin-top:8px';
  bar.textContent = 'Arrows/WASD move · Z attack (hold for Spin) · C lift/read/open · Enter pause · Esc close';
  root.appendChild(cv); root.appendChild(bar); (opts.parent || document.body).appendChild(root);
  const game = new LV.Game(cv, { store: opts.store || LV.storeFor(), muted: opts.muted });
  LV.game = game;
  const typing = function (e) { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  addEventListener('keydown', function (e) {
    if (root.style.display === 'none' || typing(e)) return;
    if (e.code === 'Escape' && !opts.noClose) { LV.close(); e.preventDefault(); return; }
    if (game.input.key(e.code, true)) e.preventDefault();
  }, true);
  addEventListener('keyup', function (e) { if (game.input.key(e.code, false)) e.preventDefault(); }, true);
  LV.loop = new LV.Loop(function (dt) { game.update(dt); }, function () { game.render(); });
  LV.loop.start();
  // save every few seconds while playing
  LV.saver = setInterval(function () { const h = game.hero; if (h.state !== 'walk' || game.scroll) return; Object.assign(game.save, { x: h.x, y: h.y, dir: h.dir, hp: Math.max(4, h.hp), maxHp: h.maxHp }); game.store.set(game.save); }, 4000);
  return game;
};
LV.close = function () { if (!LV.root) return; LV.root.style.display = 'none'; if (LV.loop) LV.loop.stop(); if (LV.game) LV.game.input.clear(); };
