/* ================= Title screen and the three save files =================
   As in the original: a title, then a file select with three files (hearts and play time shown),
   start or continue a file, or erase one. Each file is stored on its own. */
LV.SLOT_KEYS = ['lv_save', 'lv_save_2', 'lv_save_3'];
LV.storeFor = function (slot) {
  const key = LV.SLOT_KEYS[slot || 0];
  try {
    if (typeof GM_getValue === 'function') return { get: function () { const v = GM_getValue(key, null); return v ? JSON.parse(v) : null; }, set: function (v) { GM_setValue(key, v === null ? '' : JSON.stringify(v)); } };
    return { get: function () { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }, set: function (v) { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } };
  } catch (e) { return LV.memoryStore(); }
};
LV.Game.prototype.showTitle = function (stores) {
  this.mode = 'title'; this.title = { stage: 'logo', t: 0, sel: 0, stores: stores || [0, 1, 2].map(function (i) { return LV.storeFor(i); }), erase: false };
  this.titleWorld = new LV.World(LV.MAPS.meadow);
};
LV.Game.prototype.startFile = function (i) {
  const T = this.title, st = T.stores[i];
  this.store = st; this.save = st.get() || LV.newSave(); this.hero = null;
  this.enter(this.save.map, this.save.x, this.save.y, this.save.dir, true);
  this.mode = 'play'; this.title = null; this.fade = 1; this.sfx('door');
  if (!this.save.flags.intro) { this.save.flags.intro = 1; st.set(this.save); this.say(LV.INTRO); }
};
LV.INTRO = [
  'Long ago the five Pendants kept the land of Varrowmere at peace.',
  'Now Chancellor Vex rules from Ashford Castle, and his Gilded Hand patrol every road.',
  'The Pendants have been hidden in the old ruins... and Vex wants them.',
  'You are Wren of Thistledown. Last night you dreamt of a voice calling from the Meadow Ruins.'
];
LV.Game.prototype.titleUpdate = function (dt) {
  const T = this.title, p = this.input.pressed; T.t += dt;
  const ok = p.menu || p.attack || p.action;
  if (T.stage === 'logo') { if (ok && T.t > 0.3) { T.stage = 'files'; T.sel = 0; this.sfx('door'); } return; }
  const n = 4;   // three files, then Erase
  if (p.up) { T.sel = (T.sel + n - 1) % n; this.sfx('cursor'); }
  if (p.down) { T.sel = (T.sel + 1) % n; this.sfx('cursor'); }
  if (!ok) return;
  if (T.sel === 3) { T.erase = !T.erase; this.sfx('cursor'); return; }
  if (T.erase) {
    if (T.stores[T.sel].get()) { if (T.confirm === T.sel) { T.stores[T.sel].set(null); T.confirm = null; T.erase = false; this.sfx('kill'); } else { T.confirm = T.sel; this.sfx('clink'); } }
    return;
  }
  this.startFile(T.sel);
};
LV.Game.prototype.drawTitle = function () {
  const ctx = this.ctx, T = this.title, w = this.titleWorld;
  // the village slowly pans behind the title
  const ox = Math.round((Math.sin(T.t * 0.12) * 0.5 + 0.5) * (w.w * 16 - LV.VIEW_W)), oy = 0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H);
  LV.drawLayer(ctx, w, 'ground', ox, oy); LV.drawLayer(ctx, w, 'deco', ox, oy); LV.drawLayer(ctx, w, 'over', ox, oy);
  ctx.fillStyle = T.stage === 'logo' ? 'rgba(6,8,24,.55)' : 'rgba(6,8,24,.8)'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H);
  if (T.stage === 'logo') {
    const y = 52 + Math.round(Math.max(0, 1 - T.t * 1.5) * -60);
    LV.drawSword(ctx, 128, y - 40);
    ctx.textAlign = 'center';
    LV.text(ctx, 'THE LEGEND OF', 128, y - 2, '#f0e8c8');
    ctx.font = 'bold 26px Georgia, serif'; ctx.textBaseline = 'top';
    ctx.lineWidth = 4; ctx.strokeStyle = '#2a1006'; ctx.strokeText('Varrowmere', 128, y + 10);
    const gr = ctx.createLinearGradient(0, y + 10, 0, y + 36); gr.addColorStop(0, '#fff2a0'); gr.addColorStop(0.5, '#f0b830'); gr.addColorStop(1, '#a05a10');
    ctx.fillStyle = gr; ctx.fillText('Varrowmere', 128, y + 10); ctx.textAlign = 'left';
    if (T.t > 0.8 && Math.floor(T.t * 2) % 2 === 0) LV.text(ctx, 'PRESS ENTER', 98, 150, '#fff');
    LV.text(ctx, 'A Torn Arcade adventure', 72, 204, '#9090a8');
    return;
  }
  // file select
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(22, 22, 212, 180); ctx.fillStyle = '#18183a'; ctx.fillRect(24, 24, 208, 176);
  LV.text(ctx, T.erase ? 'ERASE WHICH FILE?' : 'PLEASE SELECT A FILE', 40, 32, T.erase ? '#f85050' : '#f8d040');
  for (let i = 0; i < 3; i++) {
    const y = 54 + i * 34, s = T.stores[i].get();
    if (T.sel === i) { ctx.fillStyle = '#f8d040'; ctx.fillRect(34, y + 5, 4, 4); }
    LV.text(ctx, String(i + 1) + '.', 44, y + 2, '#fff');
    if (!s) { LV.text(ctx, '- NEW GAME -', 62, y + 2, '#a0a0b8'); continue; }
    LV.text(ctx, (s.name || 'WREN'), 62, y + 2, '#fff');
    const hearts = s.maxHp / 4;
    for (let k = 0; k < hearts; k++) LV.heart(ctx, 62 + (k % 10) * 8, y + 14 + Math.floor(k / 10) * 7, LV.clamp(s.maxHp - k * 4, 0, 4));
    const tm = Math.floor((s.time || 0) / 60); LV.text(ctx, Math.floor(tm / 60) + 'h ' + ('0' + tm % 60).slice(-2) + 'm', 160, y + 2, '#a0a0b8');
    if (T.confirm === i) LV.text(ctx, 'AGAIN TO ERASE', 130, y + 14, '#f85050');
  }
  if (T.sel === 3) { ctx.fillStyle = '#f8d040'; ctx.fillRect(34, 165, 4, 4); }
  LV.text(ctx, T.erase ? 'CANCEL ERASE' : 'ERASE A FILE', 44, 162, '#fff');
  LV.text(ctx, 'Arrows choose · Enter starts', 44, 184, '#7a7a98');
};
// A sword above the logo, drawn in pixels
LV.drawSword = function (ctx, x, y) {
  ctx.fillStyle = '#2a1006'; ctx.fillRect(x - 3, y - 2, 6, 34); ctx.fillRect(x - 10, y + 22, 20, 5);
  ctx.fillStyle = '#e8eef8'; ctx.fillRect(x - 1, y, 2, 22); ctx.fillStyle = '#9aa8c0'; ctx.fillRect(x + 1, y + 2, 1, 20);
  ctx.fillStyle = '#4060c0'; ctx.fillRect(x - 9, y + 23, 18, 3); ctx.fillStyle = '#f0c040'; ctx.fillRect(x - 1, y + 23, 2, 3);
  ctx.fillStyle = '#6a3a1a'; ctx.fillRect(x - 1, y + 26, 2, 5); ctx.fillStyle = '#f0c040'; ctx.fillRect(x - 2, y + 31, 4, 2);
};
LV.SFX.cursor = [[880, 0.04, 'square', 0.05]];
LV.Game.prototype.update = (function (orig) {
  return function (dt) {
    if (this.mode === 'title') { this.input.beginStep(); this.titleUpdate(dt); return; }
    orig.call(this, dt);
  };
})(LV.Game.prototype.update);
LV.Game.prototype.render = (function (orig) {
  return function () { if (this.mode === 'title') return this.drawTitle(); orig.call(this); };
})(LV.Game.prototype.render);
