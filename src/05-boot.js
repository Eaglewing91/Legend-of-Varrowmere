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
  if (LV.root) { LV.place(opts.parent); LV.root.style.display = 'flex'; if (LV.loop) LV.loop.start(); return LV.game; }
  const root = document.createElement('div'); LV.root = root;
  const cv = document.createElement('canvas'); cv.width = LV.VIEW_W * LV.RES; cv.height = LV.VIEW_H * LV.RES; LV.canvas = cv;
  cv.style.cssText = 'image-rendering:pixelated;image-rendering:crisp-edges;box-shadow:0 0 0 2px #333';
  const bar = document.createElement('div'); bar.style.cssText = 'color:#ccc;font:12px sans-serif;margin-top:8px';
  bar.textContent = 'Arrows/WASD move · Z or click: sword (hold for Spin) · X item · C or Space: talk/lift/open · Enter items · M map · N music · Esc close';
  root.appendChild(cv); root.appendChild(bar); LV.bar = bar;
  if (!opts.noClose) {   // a close button too, for anyone who opened it with the mouse
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕ Close'; x.title = 'Close (your game is saved)';
    x.style.cssText = 'position:absolute;top:10px;right:12px;padding:6px 12px;border:1px solid #555;border-radius:6px;background:#222;color:#ddd;font:600 13px sans-serif;cursor:pointer';
    x.addEventListener('click', function () { LV.close(); }); root.appendChild(x); LV.closeBtn = x;
  }
  // the window fills the page, or (inside the Torn Arcade phone) the box it's given; the picture scales to fit
  LV.fit = function () {
    const host = root.parentNode, inside = host && host !== document.body && LV.embedded;
    const W = inside ? host.clientWidth : innerWidth, H = inside ? host.clientHeight : innerHeight - 40;
    let s = Math.min(W / LV.VIEW_W, H / LV.VIEW_H);
    s = inside ? Math.max(0.5, s) : Math.max(1, Math.floor(s));
    cv.style.width = Math.floor(LV.VIEW_W * s) + 'px'; cv.style.height = Math.floor(LV.VIEW_H * s) + 'px';
  };
  addEventListener('resize', LV.fit);
  if (typeof ResizeObserver === 'function') LV.ro = new ResizeObserver(function () { LV.fit(); });
  LV.place = function (parent) {
    LV.embedded = !!parent;
    root.style.cssText = parent ? 'position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column'
      : 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;flex-direction:column';
    bar.style.display = parent ? 'none' : ''; if (LV.closeBtn) LV.closeBtn.style.display = parent ? 'none' : '';
    const host = parent || document.body; if (root.parentNode !== host) host.appendChild(root);
    if (LV.ro) { LV.ro.disconnect(); if (parent) LV.ro.observe(parent); }
    LV.fit();
  };
  LV.place(opts.parent);
  const game = new LV.Game(cv, { store: opts.store || LV.storeFor(), muted: opts.muted });
  LV.game = game;
  if (opts.title) game.showTitle(opts.stores);
  const typing = function (e) { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  addEventListener('keydown', function (e) {
    if (root.style.display === 'none' || typing(e)) return;
    if (game.rawKey && game.rawKey(e)) { e.preventDefault(); e.stopPropagation(); return; }   // typing a hero's name
    if (e.code === 'Escape' && !opts.noClose) { LV.close(); e.preventDefault(); return; }
    if (game.input.key(e.code, true)) e.preventDefault();
  }, true);
  addEventListener('keyup', function (e) { if (root.style.display === 'none' || typing(e)) return; if (game.input.key(e.code, false)) e.preventDefault(); }, true);
  LV.loop = new LV.Loop(function (dt) { game.update(dt); }, function () { game.render(); });
  LV.loop.start();
  // save every few seconds while playing
  LV.saver = setInterval(function () { if (game.mode === 'title' || root.style.display === 'none') return;   // nothing runs while the window is closed
    const h = game.hero; if (h.state !== 'walk' || game.scroll) return; Object.assign(game.save, { x: h.x, y: h.y, dir: h.dir, hp: Math.max(4, h.hp), maxHp: h.maxHp }); game.store.set(game.save); }, 4000);
  return game;
};
LV.close = function () { if (!LV.root) return; const g = LV.game; if (g && g.mode !== 'title' && g.hero && g.hero.state === 'walk' && !g.scroll) { try { Object.assign(g.save, { x: g.hero.x, y: g.hero.y, dir: g.hero.dir, hp: Math.max(4, g.hero.hp), maxHp: g.hero.maxHp }); g.store.set(g.save); } catch (e) {} } LV.root.style.display = 'none'; try { delete document.documentElement.dataset.varrowmereOpen; document.dispatchEvent(new CustomEvent('varrowmere:closed')); } catch (e) {} if (LV.loop) LV.loop.stop(); if (LV.game) LV.game.input.clear(); };
