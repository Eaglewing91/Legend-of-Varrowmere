/* ================= Sound effects from the Ninja Adventure pack (CC0), embedded as small MP3s.
   Until a sound has been decoded (or if the browser can't), the old generated beeps play instead. ================= */
(function () {
  const synth = LV.Game.prototype.sfx, buffers = LV.SFX_BUFFERS = {};
  let loading = false;
  function load(ac) {
    if (loading || !LV.SOUNDS) return; loading = true;
    Object.keys(LV.SOUNDS).forEach(function (k) {
      try {
        const bin = atob(LV.SOUNDS[k]), a = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        const p = ac.decodeAudioData(a.buffer, function (b) { buffers[k] = b; }, function () {});
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    });
  }
  LV.SFX_VOLUME = { kill: 0.35, hit: 0.5, swing: 0.4, cut: 0.45, cursor: 0.4 };
  LV.Game.prototype.sfx = function (name) {
    this.lastSfx = name;
    if (this.muted || typeof AudioContext === 'undefined') return;
    try {
      if (!this.audio) this.audio = new AudioContext();
      const ac = this.audio; load(ac);
      const b = buffers[name];
      if (!b) return synth.call(this, name);
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = b; g.gain.value = LV.SFX_VOLUME[name] || 0.55;
      src.connect(g); g.connect(ac.destination); src.start();
    } catch (e) {}
  };
})();

/* ================= Hit flash: anything that takes damage flashes white for a moment ================= */
LV.FLASH_TIME = 0.1;
LV.drawActor = function (ctx, a, ox, oy) {
  const f = a.flashT && (LV.now() - a.flashT) / 1000 < LV.FLASH_TIME;
  if (!f) { a.draw(ctx, ox, oy); return; }
  const iv = a.inv; a.inv = 0;                // draw it solid (not flickering) while it flashes
  ctx.save(); ctx.filter = 'brightness(0) invert(1)';
  try { a.draw(ctx, ox, oy); } finally { ctx.restore(); a.inv = iv; }
};
LV.now = function () { return (typeof performance !== 'undefined' ? performance : Date).now(); };
(function () {
  const ah = LV.applyHit;
  LV.applyHit = function (game, hit, t) { const r = ah(game, hit, t); if (r === 'hit') t.flashT = LV.now(); return r; };
})();
