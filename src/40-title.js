/* ================= The title screen, revamped =================
   A painted night scene (stars, moon, mountains, Ashford Castle on its crag, misty hills, fireflies, Wren on the ridge),
   a short opening the first time the game opens (skippable), the sword falling into a forged gold logo with the three
   Pendants, then a file select with a card per file: Wren walking, hearts, Pendants found, where you are and play time.
   Everything is drawn by code; the big pieces are drawn once into small canvases and reused. */
(function () {
  const W = LV.VIEW_W, H = LV.VIEW_H;
  const PENDANTS = [['pendant_ruins1', '#3ac050', '#9af0a0'], ['pendant_shrine', '#3a8ae8', '#a0d0ff'], ['pendant_forge', '#e84a10', '#ffb080']];
  const rnd = function (seed) { let s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const canvas = function (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* ---------- the scene, built once ---------- */
  let S = null;
  function build() {
    const r = rnd(7);
    // sky: deep night at the top, violet, then a warm glow on the horizon
    const sky = canvas(W, H), sc = sky.getContext('2d');
    const bands = [[0, '#060718'], [28, '#0b0c26'], [56, '#141336'], [80, '#211a48'], [100, '#352053'], [116, '#55285a'], [128, '#7a3458'], [138, '#a84a50'], [146, '#d0704a'], [152, '#e89a58']];
    bands.forEach(function (b, i) { sc.fillStyle = b[1]; sc.fillRect(0, b[0], W, (bands[i + 1] ? bands[i + 1][0] : H) - b[0]); });
    // dither the band edges so they read as pixel art, not stripes
    // ordered dither across each band edge (4 rows: 1/4, 1/2, 1/2, 3/4 of the lower colour), so it reads as a smooth pixel-art sky
    for (let i = 1; i < bands.length; i++) {
      const y = bands[i][0];
      [[-2, 4, 0], [-1, 2, 0], [0, 2, 1], [1, 4, 2]].forEach(function (q) {
        const yy = y + q[0], up = q[0] < 0;
        sc.fillStyle = up ? bands[i][1] : bands[i - 1][1];
        for (let x = (q[2] + (yy % 2)) % q[1]; x < W; x += q[1]) sc.fillRect(x, yy, 1, 1);
      });
    }
    const stars = []; for (let i = 0; i < 90; i++) stars.push({ x: Math.floor(r() * W), y: Math.floor(r() * 120), b: r(), ph: r() * 6.3, big: r() < 0.08 });
    // far mountains (512 wide, repeats as it scrolls)
    const mtn = canvas(512, 90), mc = mtn.getContext('2d');
    const hf = function (x, k) { let h = 0; k.forEach(function (q) { h += q[1] * Math.sin(2 * Math.PI * q[0] * x / 512 + q[2]); }); return h; };
    for (let x = 0; x < 512; x++) {
      const h = Math.round(46 + hf(x, [[2, 16, 0.4], [5, 9, 1.7], [11, 4, 0.2], [23, 2, 2.2]]));
      const top = 90 - h;
      mc.fillStyle = '#2e2752'; mc.fillRect(x, top, 1, h);
      mc.fillStyle = '#3c3366'; if (hf(x + 1, [[2, 16, 0.4], [5, 9, 1.7], [11, 4, 0.2], [23, 2, 2.2]]) < hf(x, [[2, 16, 0.4], [5, 9, 1.7], [11, 4, 0.2], [23, 2, 2.2]])) mc.fillRect(x, top, 1, Math.round(h * 0.6));   // moonlit faces
      if (h > 52) { mc.fillStyle = '#b8b4e0'; mc.fillRect(x, top, 1, Math.min(h - 52, 5) + 1); mc.fillStyle = '#7a74b0'; mc.fillRect(x, top + Math.min(h - 52, 5) + 1, 1, 1); }
    }
    // the mid hills with pines
    const hill = canvas(512, 70), hc = hill.getContext('2d');
    const hh = function (x) { return Math.round(30 + 8 * Math.sin(2 * Math.PI * 3 * x / 512 + 1) + 5 * Math.sin(2 * Math.PI * 7 * x / 512)); };
    for (let x = 0; x < 512; x++) { hc.fillStyle = '#1c1636'; hc.fillRect(x, 70 - hh(x), 1, hh(x)); }
    for (let x = 4; x < 512; x += 5 + Math.floor(r() * 7)) {
      const base = 70 - hh(x) + 3, th = 9 + Math.floor(r() * 9);
      for (let j = 0; j < th; j++) { const half = Math.floor(j / 2.4); hc.fillStyle = j % 4 === 3 ? '#151029' : '#191331'; hc.fillRect(x - half, base - th + j, half * 2 + 1, 1); }
    }
    // Ashford Castle on its crag (sits still while the hills drift past)
    const cas = canvas(84, 92), cc = cas.getContext('2d');
    const rect = function (c, x, y, w, h) { cc.fillStyle = c; cc.fillRect(x, y, w, h); };
    for (let y = 60; y < 92; y++) { const half = Math.round(20 + (y - 60) * 0.9 + Math.sin(y * 0.9) * 2); rect('#120d26', 42 - half, y, half * 2, 1); }
    rect('#171032', 18, 34, 48, 28);                                   // curtain wall
    for (let x = 18; x < 66; x += 4) rect('#171032', x, 31, 2, 3);     // crenels
    [[14, 22, 10, 40], [60, 22, 10, 40], [34, 8, 16, 54]].forEach(function (t) {
      rect('#1b1338', t[0], t[1], t[2], t[3]);
      for (let x = t[0]; x < t[0] + t[2]; x += 3) rect('#1b1338', x, t[1] - 2, 2, 2);
      cc.fillStyle = '#120d26'; for (let j = 0; j < 7; j++) cc.fillRect(t[0] + t[2] / 2 - j, t[1] - 9 + j, j * 2 + 1, 1);   // conical roofs
    });
    rect('#120d26', 41, -2, 1, 6); rect('#a83030', 42, -2, 5, 3);     // banner on the keep
    S = { sky: sky, stars: stars, mtn: mtn, hill: hill, cas: cas, flies: [], mist: [0, 1, 2, 3].map(function (i) { return { x: r() * W, y: 150 + i * 9, w: 70 + r() * 60, s: 4 + r() * 6 }; }), windows: [[39, 22], [45, 22], [42, 34], [18, 30], [64, 30], [27, 44], [56, 44]], logo: null };
    for (let i = 0; i < 18; i++) S.flies.push({ x: r() * W, y: 150 + r() * 70, ph: r() * 6.3, sp: 0.4 + r() * 0.8 });
    S.logo = buildLogo();
  }
  // the word VARROWMERE: drawn once in a serif, snapped to hard pixels, outlined, banded in gold with a lit top edge
  function buildLogo() {
    const w = 236, h = 44, src = canvas(w, h), c = src.getContext('2d');
    c.font = 'bold 31px Georgia, "Times New Roman", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.fillText('Varrowmere', w / 2, h / 2 + 1);
    const a = c.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = a[i * 4 + 3] > 120 ? 1 : 0;
    let top = h, bot = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { top = Math.min(top, y); bot = Math.max(bot, y); }
    const at = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x]; };
    const out = canvas(w, h), o = out.getContext('2d'), mask = canvas(w, h), mk = mask.getContext('2d');
    const gold = ['#fff6c0', '#ffe27a', '#f8c840', '#eaa628', '#d08418', '#a85c10', '#7a3e0c'];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (at(x, y)) {
        const k = (y - top) / Math.max(1, bot - top);
        let col = gold[Math.min(gold.length - 1, Math.floor(k * gold.length))];
        if (!at(x, y - 1)) col = '#fffbe8';                    // lit top edge
        else if (!at(x - 1, y) && k < 0.6) col = '#fff0a8';     // and a little on the left
        o.fillStyle = col; o.fillRect(x, y, 1, 1); mk.fillStyle = '#fff'; mk.fillRect(x, y, 1, 1);
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) || at(x - 1, y - 1) || at(x + 1, y + 1) || at(x + 1, y - 1) || at(x - 1, y + 1)) {
        o.fillStyle = '#2a1006'; o.fillRect(x, y, 1, 1);
      }
    }
    // a second, darker rim and a drop shadow under the whole word
    const fin = canvas(w + 4, h + 4), f = fin.getContext('2d');
    f.globalAlpha = 0.55; f.filter = 'brightness(0)'; f.drawImage(out, 2, 3); f.filter = 'none'; f.globalAlpha = 1;
    f.drawImage(out, 1, 1);
    return { img: fin, mask: mask, w: w + 4, h: h + 4, top: top, bot: bot };
  }

  /* ---------- drawing ---------- */
  function drawScene(ctx, t, g) {
    ctx.drawImage(S.sky, 0, 0);
    // stars and a shooting star now and then
    S.stars.forEach(function (s) {
      const tw = 0.45 + 0.55 * Math.sin(t * (1 + s.b * 2) + s.ph);
      ctx.globalAlpha = Math.max(0.15, tw * (0.4 + s.b * 0.6)); ctx.fillStyle = s.b > 0.7 ? '#fff8e0' : '#c8d0ff';
      ctx.fillRect(s.x, s.y, 1, 1); if (s.big && tw > 0.8) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
    });
    ctx.globalAlpha = 1;
    const sh = t % 9; if (sh < 0.7) { const k = sh / 0.7, x = 40 + k * 110, y = 14 + k * 34; ctx.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { ctx.globalAlpha = (1 - i / 9) * (1 - k); ctx.fillRect(Math.round(x - i * 3), Math.round(y - i * 0.93), 2, 1); } ctx.globalAlpha = 1; }
    // the moon with a soft halo
    const mx = 206, my = 34;
    for (let r = 26; r > 13; r -= 3) { ctx.globalAlpha = 0.05; ctx.fillStyle = '#f4e8c0'; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#f4ecd0'; ctx.beginPath(); ctx.arc(mx, my, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8ccaa'; ctx.fillRect(mx - 5, my - 3, 3, 3); ctx.fillRect(mx + 3, my + 2, 4, 3); ctx.fillRect(mx - 2, my + 6, 2, 2); ctx.fillRect(mx + 4, my - 7, 2, 2);
    // far mountains, the castle, hills, mist
    const mxo = Math.floor(t * 3) % 512; ctx.drawImage(S.mtn, -mxo, 72); ctx.drawImage(S.mtn, 512 - mxo, 72);
    ctx.drawImage(S.cas, 18, 88);
    S.windows.forEach(function (wd, i) { const f = 0.7 + 0.3 * Math.sin(t * 3 + i * 1.7) * Math.sin(t * 1.3 + i); ctx.globalAlpha = f; ctx.fillStyle = '#ffc860'; ctx.fillRect(18 + wd[0], 88 + wd[1], 2, 3); });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1c1636'; ctx.fillRect(0, 160, W, H - 160);   // the valley floor between the mountains and the hills
    const hxo = Math.floor(t * 9) % 512; ctx.drawImage(S.hill, -hxo, 128); ctx.drawImage(S.hill, 512 - hxo, 128);
    // mist: soft, tapered wisps drifting over the hills
    S.mist.forEach(function (m) { const x = ((m.x + t * m.s) % (W + m.w)) - m.w; ctx.fillStyle = '#c8b8e8';
      for (let i = 0; i < m.w; i++) { const k = Math.sin(i / m.w * Math.PI); ctx.globalAlpha = 0.1 * k; ctx.fillRect(Math.round(x + i), m.y + Math.round(Math.sin(i * 0.08 + t) * 1.5), 1, 1 + Math.round(k * 2)); } });
    ctx.globalAlpha = 1;
    // the near ridge, grass in the wind, and Wren looking out at the castle
    ctx.fillStyle = '#0d0a1c';
    for (let x = 0; x < W; x++) { const y = Math.round(190 + 5 * Math.sin(x * 0.03 + 0.5) - (x > 160 && x < 230 ? 8 * Math.sin((x - 160) / 70 * Math.PI) : 0)); ctx.fillRect(x, y, 1, H - y); }
    for (let x = 2; x < W; x += 3) { const y = Math.round(190 + 5 * Math.sin(x * 0.03 + 0.5) - (x > 160 && x < 230 ? 8 * Math.sin((x - 160) / 70 * Math.PI) : 0)); const sw = Math.round(Math.sin(t * 2 + x * 0.15)); ctx.fillRect(x + sw, y - 3 - (x % 7 === 0 ? 2 : 0), 1, 3); }
    if (LV.IMG.hero) {
      const hx = 192, hy = 154;
      ctx.globalAlpha = 0.85; ctx.drawImage(LV.IMG.hero, 0, LV.HERO_ROW[0] * 32, 16, 32, hx, hy, 16, 32); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(244,236,208,.35)'; ctx.fillRect(hx + 11, hy + 12, 1, 6);   // moonlight on his shoulder
    }
    // fireflies
    S.flies.forEach(function (f) { const x = (f.x + Math.sin(t * f.sp + f.ph) * 14 + t * 4) % W, y = f.y + Math.sin(t * f.sp * 1.7 + f.ph) * 6, on = 0.5 + 0.5 * Math.sin(t * 3 + f.ph * 3); if (y > 205) return; ctx.globalAlpha = on; ctx.fillStyle = '#e8ff90'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); ctx.globalAlpha = on * 0.3; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); });
    ctx.globalAlpha = 1;
    void g;
  }
  // the Dawnblade, pointing down; drawn at 1px per pixel from a little map
  const BLADE = [
    '.......gg.......', '......gYYg......', '......gYYg......', '.......gg.......', '.......bb.......', '......bBBb......', '......bBBb......', '......bBBb......', '......bBBb......', '......bBBb......',
    '..gggbbBBbbggg..', '.gYYYgbRRbgYYYg.', '..gggbbBBbbggg..', '......sWWs......'];
  const SC = { g: '#7a4a10', Y: '#f8d048', b: '#2a1830', B: '#5a3aa0', R: '#e83040', s: '#5a6a88', W: '#eef4ff' };
  function drawSword(ctx, x, y, len) {
    BLADE.forEach(function (row, j) { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c === '.') continue; ctx.fillStyle = SC[c]; ctx.fillRect(x - 8 + i, y + j, 1, 1); } });
    for (let j = 0; j < len; j++) {   // the blade, narrowing to a point
      const half = j > len - 6 ? Math.max(0, Math.floor((len - j) / 2)) : 2, yy = y + 14 + j;
      ctx.fillStyle = '#5a6a88'; ctx.fillRect(x - half - 1, yy, half * 2 + 2, 1);
      ctx.fillStyle = '#eef4ff'; ctx.fillRect(x - half, yy, half, 1); ctx.fillStyle = '#aab8d8'; ctx.fillRect(x, yy, half, 1);
      if (j > 2 && j < len - 6) { ctx.fillStyle = '#c8d4f0'; ctx.fillRect(x, yy, 1, 1); }
    }
  }
  function gem(ctx, x, y, c, lit, on) {
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillRect(x - 2, y - 3, 5, 7);
    ctx.fillStyle = on ? c : '#3a3448'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillRect(x - 1, y - 3, 3, 7); ctx.fillRect(x - 3, y - 1, 7, 3);
    if (on) { ctx.fillStyle = lit; ctx.fillRect(x - 1, y - 2, 2, 2); }
  }
  function drawLogo(ctx, T, y) {
    const L = S.logo, t = T.t - (T.logoAt || 0), x = Math.round((W - L.w) / 2);
    // the sword falls behind the word and stops with a flash
    const fall = Math.min(1, t / 0.55), sy = Math.round(y - 30 - (1 - fall * fall) * 140);
    drawSword(ctx, 128, sy, 64);
    if (t > 0.55 && !T.landed) { T.landed = true; T.flash = 1; T.shake = 0.25; }
    // THE LEGEND OF, with little rules either side
    const ty = y - 6; ctx.textAlign = 'center'; LV.text(ctx, 'THE LEGEND OF', 128, ty, '#f0e2b0'); ctx.textAlign = 'left';
    ctx.fillStyle = '#c89a40'; ctx.fillRect(58, ty + 4, 26, 1); ctx.fillRect(172, ty + 4, 26, 1); ctx.fillRect(84, ty + 3, 2, 3); ctx.fillRect(170, ty + 3, 2, 3);
    ctx.drawImage(L.img, x, y);
    // a shine sweeps across the gold every few seconds
    const sw = (T.t % 4.5) / 0.9;
    if (sw < 1) {
      const tmp = S.shine || (S.shine = canvas(L.w, L.h)), c = tmp.getContext('2d');
      c.clearRect(0, 0, L.w, L.h); c.globalCompositeOperation = 'source-over'; c.drawImage(L.mask, 1, 1);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = 'rgba(255,255,255,.85)';
      const sx = -30 + sw * (L.w + 60); c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx + 10, 0); c.lineTo(sx - 4, L.h); c.lineTo(sx - 14, L.h); c.fill();
      ctx.drawImage(tmp, x, y);
    }
    // the three Pendants under the word, glinting in turn
    PENDANTS.forEach(function (p, i) {
      const gx = 108 + i * 20, gy = y + L.h + 6 + Math.round(Math.sin(T.t * 2 + i * 2) * 1.5);
      gem(ctx, gx, gy, p[1], p[2], true);
      const k = (T.t * 0.8 + i / 3) % 1; if (k < 0.12) { ctx.fillStyle = '#fff'; ctx.fillRect(gx + 1, gy - 5, 1, 3); ctx.fillRect(gx, gy - 4, 3, 1); }
    });
  }

  /* ---------- states: intro -> logo -> files ---------- */
  const show = LV.Game.prototype.showTitle;
  LV.Game.prototype.showTitle = function (stores) {
    show.call(this, stores);
    const T = this.title; T.stage = LV.introSeen ? 'logo' : 'intro'; T.logoAt = 0; T.flash = 0; T.shake = 0; T.fade = 1; T.menu = 0;
    if (T.stage === 'logo') T.logoAt = 0;
  };
  const LINES = ['Long ago, three Pendants kept the land of Varrowmere at peace.', 'Now Chancellor Vex rules from Ashford Castle...', '...and the Pendants lie hidden, waiting for a hero.'];
  LV.Game.prototype.titleUpdate = function (dt) {
    const T = this.title, p = this.input.pressed; T.t += dt;
    if (T.fade > 0) T.fade = Math.max(0, T.fade - dt * 1.2);
    if (T.flash > 0) T.flash = Math.max(0, T.flash - dt * 2.5);
    if (T.shake > 0) T.shake = Math.max(0, T.shake - dt);
    if (T.out !== undefined) { T.out += dt * 2.2; if (T.out >= 1) this.startFile(T.outFile); return; }
    const ok = p.menu || p.attack || p.action;
    if (T.stage === 'intro') {
      if (ok || T.t > LINES.length * 2.6 + 0.6) { LV.introSeen = true; T.stage = 'logo'; T.logoAt = T.t; T.landed = false; }
      return;
    }
    if (T.stage === 'logo') {
      if (ok && T.t - T.logoAt > 0.6) { T.stage = 'files'; T.sel = 0; T.filesAt = T.t; this.sfx('door'); }
      if (T.landed && !T.boom) { T.boom = true; this.sfx('chest'); }
      return;
    }
    const n = 4;
    if (p.up) { T.sel = (T.sel + n - 1) % n; T.confirm = null; this.sfx('cursor'); }
    if (p.down) { T.sel = (T.sel + 1) % n; T.confirm = null; this.sfx('cursor'); }
    if (!ok) return;
    if (T.sel === 3) { T.erase = !T.erase; T.confirm = null; this.sfx('cursor'); return; }
    if (T.erase) {
      if (T.stores[T.sel].get()) { if (T.confirm === T.sel) { T.stores[T.sel].set(null); T.confirm = null; T.erase = false; this.sfx('kill'); T.shake = 0.2; } else { T.confirm = T.sel; this.sfx('clink'); } }
      return;
    }
    T.out = 0; T.outFile = T.sel; this.sfx('heart');
  };
  LV.Game.prototype.drawTitle = function () {
    if (!S) build();
    const ctx = this.ctx, T = this.title;
    ctx.save();
    if (T.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4 * T.shake / 0.25), Math.round((Math.random() - 0.5) * 4 * T.shake / 0.25));
    drawScene(ctx, T.t, this);
    if (T.stage === 'intro') {
      ctx.fillStyle = 'rgba(4,4,16,.45)'; ctx.fillRect(0, 0, W, H);
      const i = Math.floor(T.t / 2.6), k = (T.t % 2.6) / 2.6;
      if (i < LINES.length) {
        ctx.globalAlpha = Math.min(1, k * 5, (1 - k) * 4);
        const words = LINES[i].split(' '), rows = ['']; words.forEach(function (w) { if (LV.textWidth(rows[rows.length - 1] + ' ' + w) > 200) rows.push(w); else rows[rows.length - 1] = (rows[rows.length - 1] + ' ' + w).trim(); });
        ctx.textAlign = 'center'; rows.forEach(function (r, j) { LV.text(ctx, r, 128, 96 + j * 12 - rows.length * 6, '#f0e2b0'); }); ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = 0.6; LV.text(ctx, 'Enter: skip', 196, 212, '#8080a0'); ctx.globalAlpha = 1;
    } else if (T.stage === 'logo') {
      drawLogo(ctx, T, 58);
      if (T.t - T.logoAt > 1.1 && Math.floor(T.t * 1.6) % 2 === 0) { ctx.textAlign = 'center'; LV.text(ctx, 'PRESS ENTER', 128, 152, '#ffffff'); ctx.textAlign = 'left'; }
      ctx.textAlign = 'center'; LV.text(ctx, 'A Torn Arcade adventure by Eaglewing', 128, 210, '#a898c8'); ctx.textAlign = 'left';
    } else drawFiles(ctx, this, T);
    if (T.flash > 0) { ctx.fillStyle = 'rgba(255,250,230,' + (T.flash * 0.8).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    const f = Math.max(T.fade, T.out || 0); if (f > 0) { ctx.fillStyle = 'rgba(' + (T.out ? '255,250,235' : '0,0,0') + ',' + Math.min(1, f).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  };

  /* ---------- file select ---------- */
  function placeName(s) { const d = LV.MAPS[s.map]; if (!d) return 'Varrowmere'; const n = d.floorName ? d.name + ' ' + d.floorName : d.name; return n || 'Varrowmere'; }
  function drawFiles(ctx, g, T) {
    const t = T.t - (T.filesAt || 0), slide = Math.min(1, t / 0.3);
    ctx.fillStyle = 'rgba(6,6,20,' + (0.62 * slide).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    // a small logo at the top
    const L = S.logo; ctx.drawImage(L.img, 0, 0, L.w, L.h, Math.round(128 - L.w * 0.3), 4, Math.round(L.w * 0.6), Math.round(L.h * 0.6));
    ctx.textAlign = 'center'; LV.text(ctx, T.erase ? 'ERASE WHICH FILE?' : 'CHOOSE YOUR ADVENTURE', 128, 34, T.erase ? '#ff6a5a' : '#f8d870'); ctx.textAlign = 'left';
    for (let i = 0; i < 3; i++) {
      const x = 16 + Math.round((1 - slide) * (i % 2 ? 60 : -60)), y = 46 + i * 42, sel = T.sel === i, s = T.stores[i].get();
      LV.drawPanel(ctx, x, y, 224, 38, 'panelbg');
      if (sel) {   // a pulsing gold frame and a pointer
        const a = 0.55 + 0.45 * Math.sin(T.t * 6); ctx.globalAlpha = a; ctx.strokeStyle = T.erase ? '#ff5a4a' : '#f8d048'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 223, 37); ctx.globalAlpha = 1;
        const px = x - 9 + Math.round(Math.sin(T.t * 8)); ctx.fillStyle = '#2a1006'; ctx.fillRect(px - 1, y + 14, 7, 9); ctx.fillStyle = '#f8d048'; for (let j = 0; j < 4; j++) ctx.fillRect(px + j, y + 15 + j, 1, 7 - j * 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 6, y + 4, 22, 30);
      LV.text(ctx, String(i + 1), x + 9, y + 5, '#c8b890');
      if (!s) {
        if (LV.IMG.hero) { ctx.globalAlpha = sel ? 0.55 : 0.25; ctx.filter = 'brightness(0.2)'; ctx.drawImage(LV.IMG.hero, 0, LV.HERO_ROW[2] * 32, 16, 32, x + 9, y + 3, 16, 32); ctx.filter = 'none'; ctx.globalAlpha = 1; }
        LV.text(ctx, 'NEW ADVENTURE', x + 38, y + 10, sel ? '#ffffff' : '#a0a0b8');
        LV.text(ctx, 'Begin in Thistledown', x + 38, y + 22, '#7a7a98');
        continue;
      }
      if (LV.IMG.hero) { const col = sel && !T.erase ? Math.floor(T.t * 6) % 4 : 0; ctx.drawImage(LV.IMG.hero, col * 16, LV.HERO_ROW[2] * 32, 16, 32, x + 9, y + 3, 16, 32); }
      LV.text(ctx, (s.name || 'WREN').toUpperCase(), x + 36, y + 5, '#ffffff');
      const hearts = s.maxHp / 4;
      for (let k = 0; k < Math.min(20, hearts); k++) LV.heart(ctx, x + 36 + (k % 10) * 8, y + 16 + Math.floor(k / 10) * 7, LV.clamp(s.maxHp - k * 4, 0, 4));
      LV.text(ctx, placeName(s).slice(0, 22), x + 36, y + 28, '#9a96b8');
      PENDANTS.forEach(function (p, j) { gem(ctx, x + 182 + j * 12, y + 10, p[1], p[2], !!(s.items && s.items[p[0]])); });
      const tm = Math.floor((s.time || 0) / 60); ctx.textAlign = 'right'; LV.text(ctx, Math.floor(tm / 60) + 'h ' + ('0' + tm % 60).slice(-2) + 'm', x + 216, y + 24, '#c8b890'); ctx.textAlign = 'left';
      if (T.confirm === i) { ctx.fillStyle = 'rgba(120,10,10,.75)'; ctx.fillRect(x + 4, y + 4, 216, 30); ctx.textAlign = 'center'; LV.text(ctx, 'PRESS ENTER AGAIN TO ERASE', x + 112, y + 15, '#ffd0c8'); ctx.textAlign = 'left'; }
    }
    // erase toggle and the key hints
    const ey = 176, sel = T.sel === 3;
    LV.drawPanel(ctx, 80, ey, 96, 18, 'panelbg');
    if (sel) { ctx.globalAlpha = 0.55 + 0.45 * Math.sin(T.t * 6); ctx.strokeStyle = '#f8d048'; ctx.strokeRect(80.5, ey + 0.5, 95, 17); ctx.globalAlpha = 1; }
    ctx.textAlign = 'center'; LV.text(ctx, T.erase ? 'CANCEL' : 'ERASE A FILE', 128, ey + 5, sel ? '#ffffff' : '#b0b0c8');
    LV.text(ctx, 'Up/Down choose   Enter start   Esc close', 128, 204, '#8a86a8'); ctx.textAlign = 'left';
  }
})();
