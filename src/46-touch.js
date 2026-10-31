/* ================= Space, the mouse, and a touch pad =================
   - Space talks, reads, lifts and opens (as C does); a mouse click (or a tap on the picture) swings the sword, and
     holding it charges a Spin Attack.
   - The touch pad, like Tornies': a D-pad on the left, the sword, item and talk buttons on the right, and Menu, Map and
     Dash across the top. Turned on from the 🎮 button (Torn Arcade's app bar, or beside Close in the window). */
LV.Input.prototype.key = (function (orig) {
  return function (code, isDown) {
    if (code === 'Space') { if (isDown) this.down('action'); else this.up('action'); return true; }
    return orig.call(this, code, isDown);
  };
})(LV.Input.prototype.key);
(function () {
  const CSS = [
    '.lv-pad{position:absolute;inset:0;pointer-events:none;user-select:none;-webkit-user-select:none;touch-action:none;display:none}',
    '.lv-pad.lv-on{display:block}',
    '.lv-pad > *{pointer-events:auto;position:absolute}',
    '.lv-k{display:grid;place-items:center;border-radius:12px;background:linear-gradient(180deg,#22364f,#182739);border:1px solid #2c4466;color:#dfe8f3;font:800 17px system-ui,Arial,sans-serif;cursor:pointer;box-shadow:0 3px 0 #0b1420;touch-action:none}',
    '.lv-k.lv-down{background:linear-gradient(180deg,#3a8ae0,#2a6fc0);transform:translateY(2px);box-shadow:0 1px 0 #0b1420}',
    '.lv-dpad{left:8px;top:50%;transform:translateY(-50%);display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(3,48px);gap:2px}',
    '.lv-ab{right:8px;top:50%;transform:translateY(-50%);width:150px;height:150px}',
    '.lv-ab .lv-k{position:absolute;width:56px;height:56px;border-radius:50%;font-size:22px}',
    '.lv-ab [data-b="attack"]{right:0;top:44px}', '.lv-ab [data-b="item"]{left:0;top:72px}', '.lv-ab [data-b="action"]{left:44px;top:0}',
    '.lv-top{right:8px;top:8px;display:flex;gap:6px}', '.lv-top .lv-k{padding:6px 11px;border-radius:999px;font-size:11px}',
    '.lv-padbtn{position:absolute;top:10px;right:100px;padding:6px 10px;border:1px solid #555;border-radius:6px;background:#222;color:#ddd;font:600 13px sans-serif;cursor:pointer}',
    '.lv-padbtn.lv-on{border-color:#e0843a;background:#5a3416}',
    '@media (max-width:520px){.lv-dpad{grid-template-columns:repeat(3,40px);grid-template-rows:repeat(3,40px)}.lv-ab{width:130px;height:130px}.lv-ab .lv-k{width:48px;height:48px}}'
  ].join('\n');
  const HTML = '<div class="lv-dpad"><span></span><b class="lv-k" data-b="up">▲</b><span></span><b class="lv-k" data-b="left">◀</b><span></span><b class="lv-k" data-b="right">▶</b><span></span><b class="lv-k" data-b="down">▼</b><span></span></div>' +
    '<div class="lv-ab"><b class="lv-k" data-b="action" title="Talk, lift, open (C or Space)">✋</b><b class="lv-k" data-b="attack" title="Sword (Z or click)">⚔️</b><b class="lv-k" data-b="item" title="Item (X)">✦</b></div>' +
    '<div class="lv-top"><b class="lv-k" data-b="dash">DASH</b><b class="lv-k" data-b="map">MAP</b><b class="lv-k" data-b="menu">MENU</b></div>';
  const DIRS = ['up', 'down', 'left', 'right'];
  function build() {
    if (LV.padEl || !LV.root) return;
    const st = document.createElement('style'); st.textContent = CSS; LV.root.appendChild(st);
    const pad = document.createElement('div'); pad.className = 'lv-pad'; pad.innerHTML = HTML; LV.root.appendChild(pad); LV.padEl = pad;
    const inp = function () { return LV.game && LV.game.input; };
    pad.querySelectorAll('.lv-k').forEach(function (el) {
      const b = el.dataset.b;
      const up = function () { el.classList.remove('lv-down'); const i = inp(); if (i) i.up(b); };
      el.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch (x) {} el.classList.add('lv-down'); const i = inp(); if (i) i.down(b); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { el.addEventListener(t, up); });
    });
    // slide a thumb across the D-pad to change direction without lifting it
    let slide = null;
    pad.addEventListener('pointerdown', function (e) { const k = e.target.closest && e.target.closest('.lv-k'); slide = k && DIRS.indexOf(k.dataset.b) >= 0 ? { id: e.pointerId, el: k } : null; }, true);
    pad.addEventListener('pointermove', function (e) {
      if (!slide || e.pointerId !== slide.id) return;
      const t = document.elementFromPoint(e.clientX, e.clientY), k = t && t.closest && t.closest('.lv-k');
      if (!k || k === slide.el || DIRS.indexOf(k.dataset.b) < 0) return;
      const i = inp(); slide.el.classList.remove('lv-down'); if (i) i.up(slide.el.dataset.b);
      slide.el = k; k.classList.add('lv-down'); if (i) i.down(k.dataset.b);
    }, true);
    ['pointerup', 'pointercancel'].forEach(function (t) { pad.addEventListener(t, function (e) { if (slide && e.pointerId === slide.id) { const i = inp(); slide.el.classList.remove('lv-down'); if (i) i.up(slide.el.dataset.b); slide = null; } }, true); });
    // the mouse (or a tap on the picture): sword; hold for a Spin Attack
    const cv = LV.canvas;
    cv.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} const i = inp(); if (i) i.down('attack'); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { cv.addEventListener(t, function () { const i = inp(); if (i) i.up('attack'); }); });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // in the window (not inside the phone) a 🎮 button sits beside Close
    const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'lv-padbtn'; pb.textContent = '🎮 Touch pad'; pb.title = 'Touch pad on/off';
    pb.addEventListener('click', function () { LV.setPad(!LV.padOn); try { GM_setValue('lv_pad', LV.padOn ? 1 : 0); } catch (x) {} });
    LV.root.appendChild(pb); LV.padBtn = pb;
  }
  LV.padOn = false;
  LV.setPad = function (on) {
    build(); LV.padOn = !!on;
    if (LV.padEl) LV.padEl.classList.toggle('lv-on', LV.padOn);
    if (LV.padBtn) LV.padBtn.classList.toggle('lv-on', LV.padOn);
    if (LV.game) LV.game.input.clear();
    if (LV.fit) LV.fit();
  };
  const open = LV.open;
  LV.open = function (opts) {
    opts = opts || {};
    const g = open.call(this, opts);
    build();
    if (LV.padBtn) LV.padBtn.style.display = LV.embedded || opts.noClose ? 'none' : '';
    let want = opts.pad;
    if (want === undefined || want === null) { try { want = GM_getValue('lv_pad', null); } catch (x) { want = null; } }
    if (want === undefined || want === null) { try { want = matchMedia('(pointer: coarse)').matches; } catch (x) { want = false; } }
    LV.setPad(!!want);
    // the picture leaves room for the pad on both sides
    if (!LV.fit.padded) {
      const fit = LV.fit;
      LV.fit = function () {
        fit();
        if (!LV.padOn) return;
        const host = LV.root.parentNode, W = LV.embedded && host ? host.clientWidth : innerWidth, cv = LV.canvas;
        const room = Math.max(120, W - 2 * 170), w = parseFloat(cv.style.width) || cv.width;
        if (w > room) { const k = room / w; cv.style.width = Math.floor(w * k) + 'px'; cv.style.height = Math.floor((parseFloat(cv.style.height) || cv.height) * k) + 'px'; }
      };
      LV.fit.padded = true; addEventListener('resize', function () { LV.fit(); }); LV.fit();
    }
    return g;
  };
})();
