/* ================= Polish: your own hero on each save file, and a proper pause screen =================
   - Each of the three files has its own hero: a name (typed on the keyboard) and a tunic colour, chosen when you start
     a new game. The name is used wherever people talk about you; the tunic recolours the hero's sprites.
   - Files can be copied as well as erased.
   - The pause screen shows the item grid, your equipment, the Pendants and Crystals you hold, your bottles, Heart
     Shards and side quests, and what the selected item does. */

/* ---------- tunics ---------- */
LV.TUNICS = [
  { name: 'Forest Green', main: null },
  { name: 'River Blue', main: [70, 110, 196], shade: [38, 58, 128], cap: [214, 214, 226] },
  { name: 'Ember Red', main: [196, 64, 52], shade: [120, 32, 42], cap: [236, 196, 70] },
  { name: 'Royal Violet', main: [132, 82, 176], shade: [78, 44, 112], cap: [240, 226, 246] },
  { name: 'Night Black', main: [64, 64, 76], shade: [34, 34, 46], cap: [204, 64, 64] }
];
(function () {
  const SRC = { main: [86, 134, 76], shade: [52, 90, 82], cap: [168, 161, 41] }, base = {}, cache = {};
  const KEYS = function () { return Object.keys(LV.IMG).filter(function (k) { return /^h_/.test(k) && k !== 'h_katana'; }); };
  // a recoloured copy of one hero sheet
  LV.tunicImg = function (key, t) {
    const im = base[key] || LV.IMG[key]; t = t || 0; if (!im || !t || !LV.TUNICS[t]) return im;
    const ck = key + ':' + t; if (cache[ck]) return cache[ck];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, T = LV.TUNICS[t];
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      for (const part of ['main', 'shade', 'cap']) { const s = SRC[part]; if (p[i] === s[0] && p[i + 1] === s[1] && p[i + 2] === s[2]) { p[i] = T[part][0]; p[i + 1] = T[part][1]; p[i + 2] = T[part][2]; break; } }
    }
    x.putImageData(d, 0, 0); return (cache[ck] = c);
  };
  // dress the hero in a file's tunic (every hero sheet at once)
  LV.applyTunic = function (t) { KEYS().forEach(function (k) { if (!base[k]) base[k] = LV.IMG[k]; LV.IMG[k] = LV.tunicImg(k, t); }); };
  LV.heroFrame = function (ctx, t, dir, frame, X, Y) {   // a walking hero for menus: dir as in LV.DIRS, feet at (X, Y)
    const im = LV.tunicImg('h_walk', t); if (!im) return;
    ctx.drawImage(im, LV.HCOL[dir] * 32, (frame % 4) * 32, 32, 32, X - 16, Y - 24, 32, 32);
  };
  // starting a file puts on its tunic
  const start = LV.Game.prototype.startFile;
  LV.Game.prototype.startFile = function (i) { start.call(this, i); LV.applyTunic(this.save.tunic || 0); };
})();

/* ---------- the hero's name in conversation ---------- */
(function () {
  const say = LV.Game.prototype.say;
  LV.Game.prototype.say = function (lines, then) {
    const n = this.save && this.save.name;
    if (n && n.toUpperCase() !== 'WREN') {
      const nice = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
      lines = lines.map(function (l) { return typeof l === 'string' ? l.replace(/\bWren\b/g, nice).replace(/\bWREN\b/g, n.toUpperCase()) : l; });
    }
    return say.call(this, lines, then);
  };
})();

/* ---------- typing a name: the window passes raw keys to the game while a name is being entered ---------- */
LV.Game.prototype.rawKey = function (e) {
  const T = this.mode === 'title' && this.title, C = T && T.stage === 'create' && T.create;
  if (!C) return false;
  if (e.key === 'Backspace') { if (C.name.length) { C.name = C.name.slice(0, -1); this.sfx('cursor'); } else { T.stage = 'files'; this.sfx('door'); } return true; }
  if (e.key === 'Escape') { T.stage = 'files'; this.sfx('door'); return true; }
  if (e.key === 'Enter') { this.createFile(); return true; }
  if (e.key && e.key.length === 1 && /[A-Za-z0-9 \-']/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (C.name.length < 8 && !(e.key === ' ' && (!C.name.length || / $/.test(C.name)))) { C.name += e.key.toUpperCase(); this.sfx('cursor'); }
    return true;
  }
  return false;   // arrows go through to choose the tunic
};
LV.Game.prototype.createFile = function () {
  const T = this.title, C = T.create, s = LV.newSave();
  s.name = (C.name.trim() || 'WREN').toUpperCase(); s.tunic = C.tunic;
  T.stores[C.slot].set(s); T.out = 0; T.outFile = C.slot; this.sfx('heart');
};

/* ---------- the pause screen ---------- */
(function () {
  const COLS = 5;
  const um = LV.Game.prototype.menuUpdate;
  LV.Game.prototype.menuUpdate = function () {
    const inp = this.input, list = this.ownedItems(), s = this.save;
    if (!this.menu) { this.menu = { i: Math.max(0, list.findIndex(function (it) { return it.id === s.equip; })), t: 0 }; }
    const m = this.menu; void um;
    if (inp.pressed.right && m.i < list.length - 1) { m.i++; this.sfx('cursor'); }
    if (inp.pressed.left && m.i > 0) { m.i--; this.sfx('cursor'); }
    if (inp.pressed.down && m.i + COLS < list.length) { m.i += COLS; this.sfx('cursor'); }
    if (inp.pressed.up && m.i - COLS >= 0) { m.i -= COLS; this.sfx('cursor'); }
    if (list[m.i]) s.equip = list[m.i].id;
    if (inp.pressed.menu) { this.paused = false; this.menu = null; this.sfx('door'); }
  };
  const PEND = ['ruins1', 'shrine', 'forge', 'olddepths', 'barrow', 'brambletemple'];
  const CRYS = ['vault', 'quarry', 'bonehollow', 'thievesden', 'frostmere', 'mirefen', 'turtleback', 'stormspire', 'mirrortemple', 'glassspire'];
  const GEM = { ruins1: '#3ac050', shrine: '#3a8ae8', forge: '#e84a10', olddepths: '#a08060', barrow: '#c8c8d8', brambletemple: '#7ac040' };
  const BOT = { red: '#e83040', green: '#40c050', fairy: '#f8b0f0', empty: null };
  function gem(ctx, x, y, col, on, crystal) {
    ctx.fillStyle = '#1a0e08';
    if (crystal) { ctx.fillRect(x + 1, y - 1, 4, 9); ctx.fillRect(x, y, 6, 7); } else { ctx.fillRect(x, y + 1, 7, 5); ctx.fillRect(x + 1, y, 5, 7); }
    ctx.fillStyle = on ? col : '#3a3448';
    if (crystal) { ctx.fillRect(x + 2, y, 2, 7); ctx.fillRect(x + 1, y + 1, 4, 5); } else { ctx.fillRect(x + 1, y + 1, 5, 5); }
    if (on) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x + 2, y + 1, 1, 2); }
  }
  function bottle(ctx, x, y, kind) {
    ctx.fillStyle = '#1a1a24'; ctx.fillRect(x + 2, y, 4, 2); ctx.fillRect(x, y + 2, 8, 9);
    ctx.fillStyle = '#c8d8e8'; ctx.fillRect(x + 1, y + 3, 6, 7); ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x + 3, y, 2, 2);
    const c = BOT[kind]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + 1, y + 5, 6, 5); if (kind === 'fairy') { ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 6, 2, 2); } }
  }
  function wrap(s, w) { const out = ['']; String(s).split(' ').forEach(function (word) { const t = (out[out.length - 1] + ' ' + word).trim(); if (LV.textWidth(t) > w) out.push(word); else out[out.length - 1] = t; }); return out; }
  function about(id, s) {
    if (id === 'bottle') return (s.bottles || []).map(function (b) { return LV.BOTTLE_NAMES[b]; }).join(', ');
    const t = LV.GEAR_TEXT[id] || (LV.ITEM_NAMES && LV.ITEM_NAMES[id]) || (LV.NEWGEAR && LV.NEWGEAR[id] && LV.NEWGEAR[id].text);
    const DESC = { grapple: 'Fire it at posts, chests and blocks to pull yourself across gaps.', rod: 'Shoots fire. Lights torches from afar.', frost: 'Freezes foes solid; strike them to shatter.', mirror: 'Steps you between Varrowmere and its Shadow.', net: 'Catch fairies and bugs in empty bottles.', hammer: 'Pounds pegs flat and gives foes a thump.', bow: 'Shoot arrows. Hold still and aim true.', dice: 'Throw them; they bounce back to you and stun what they hit.', bombs: 'Blast cracked walls and anything standing too close.', lantern: 'Lights dark rooms and torches.', shovel: 'Dig soft ground for buried treasure.' };
    return DESC[id] || (t && t[1]) || '';
  }
  LV.drawMenu = function (ctx, g) {
    const s = g.save, h = g.hero, list = g.ownedItems(), m = g.menu || { i: 0 };
    LV.uiPanel(ctx, 6, 34, 244, 186);
    // items
    LV.text(ctx, 'ITEMS', 14, 40, LV.UI.head);
    list.forEach(function (it, k) {
      const x = 12 + (k % COLS) * 23, y = 51 + Math.floor(k / COLS) * 23;
      LV.uiSlot(ctx, x, y, 21, 21, k === m.i); LV.itemIcon(ctx, it.id, x + 2, y + 2);
    });
    if (!list.length) LV.text(ctx, 'No items yet.', 14, 56, '#aaa');
    // the selected item and what it does
    const sel = list[m.i];
    LV.uiPanel(ctx, 9, 166, 125, 52, { fill: '#0a1024', border: '#2c3860' });
    if (sel) {
      LV.text(ctx, sel.name, 15, 170, LV.UI.head);
      wrap(about(sel.id, s), 113).slice(0, 4).forEach(function (l, j) { LV.text(ctx, l, 15, 180 + j * 9, LV.UI.soft); });
    }
    // equipment
    const R = 138;
    LV.text(ctx, 'EQUIPMENT', R, 40, LV.UI.head);
    const sword = s.items.golden ? 'Golden Blade' : s.items.tempered ? 'Tempered Blade' : s.items.dawnblade ? 'Dawnblade' : 'Sword';
    const shield = s.items.shield2 ? 'Mirror Shield' : s.items.fireshield ? 'Ember Shield' : 'Shield';
    const mail = s.items.redmail ? 'Red Mail' : s.items.bluemail ? 'Blue Mail' : s.items.mail ? 'Mail' : 'Tunic';
    [[sword, '#e8eef8'], [shield, '#9ab8e8'], [mail, s.items.redmail ? '#f07070' : s.items.bluemail ? '#7aa0f0' : '#a0d090']].forEach(function (e, j) {
      ctx.fillStyle = e[1]; ctx.fillRect(R, 53 + j * 10, 3, 6); LV.text(ctx, e[0], R + 6, 51 + j * 10, LV.UI.text);
    });
    const extra = [s.items.shoes && 'Shoes', s.items.fins && 'Flippers', s.items.gloves ? 'Gloves' : s.items.glove && 'Glove'].filter(Boolean).join(' ');
    if (extra) LV.text(ctx, extra, R, 82, LV.UI.dim);
    // Pendants and Crystals
    LV.text(ctx, 'PENDANTS', R, 94, LV.UI.head);
    PEND.forEach(function (d, j) { gem(ctx, R + j * 11, 105, GEM[d], !!s.items['pendant_' + d], false); });
    LV.text(ctx, 'CRYSTALS', R, 117, LV.UI.violet);
    CRYS.forEach(function (d, j) { gem(ctx, R + (j % 5) * 11 + (j >= 5 ? 5 : 0), 128 + Math.floor(j / 5) * 11, '#b890ff', !!s.items['crystal_' + d], true); });
    // bottles, shards, side quests
    LV.text(ctx, 'BOTTLES', R, 152, LV.UI.head);
    const bl = s.bottles || []; if (!bl.length) LV.text(ctx, '-', R + 52, 152, '#7a7a98');
    bl.slice(0, 5).forEach(function (b, j) { bottle(ctx, R + 52 + j * 11, 150, b); });
    LV.text(ctx, 'Heart Shards ' + ((s.shards || 0) % 4) + '/4', R, 168, LV.UI.heart);
    if (LV.SIDEQUESTS) LV.text(ctx, 'Side quests ' + LV.sideDone(s) + '/' + LV.SIDEQUESTS.length, R, 180, LV.UI.blue);
    LV.text(ctx, '$' + s.cash + '   ' + Math.floor((s.time || 0) / 3600) + 'h ' + ('0' + Math.floor((s.time || 0) / 60) % 60).slice(-2) + 'm', R, 192, LV.UI.soft);
    LV.text(ctx, 'Enter: back', R, 206, LV.UI.dim);
    void h;
  };
})();
