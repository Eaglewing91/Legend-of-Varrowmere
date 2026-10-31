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

/* ================= Music: Ninja Adventure tracks (CC0), looped. The old chiptune tunes play if a track can't be decoded. ================= */
(function () {
  const synthPlay = LV.Music.prototype.play, synthStop = LV.Music.prototype.stop, decoded = {}, pending = {};
  const ALIAS = { overworld: 'village' };
  LV.Music.prototype.play = function (name) {
    if (this.track === name) return;
    const key = ALIAS[name] || name, g = this.g;
    if (!LV.MUSIC || !LV.MUSIC[key] || g.muted || !this.on || typeof AudioContext === 'undefined') { this.stop(); return synthPlay.call(this, name === 'ending' ? 'home' : name); }
    this.stop(); this.track = name;
    try { if (!g.audio) g.audio = new AudioContext(); } catch (e) { return; }
    const ac = g.audio, self = this;
    const start = function (buf) {
      if (self.track !== name || !self.on) return;
      const src = ac.createBufferSource(), gn = ac.createGain(); src.buffer = buf; src.loop = true; gn.gain.value = 0.32;
      src.connect(gn); gn.connect(ac.destination); src.start(); self.src = src;
    };
    if (decoded[key]) return start(decoded[key]);
    if (pending[key]) { pending[key].push(start); return; }
    pending[key] = [start];
    try {
      const bin = atob(LV.MUSIC[key]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      const done = function (b) { decoded[key] = b; const q = pending[key]; pending[key] = null; q.forEach(function (f) { f(b); }); };
      const fail = function () { const q = pending[key]; pending[key] = null; LV.MUSIC[key] = null; if (self.track === name) { self.track = null; self.play(name); } void q; };
      const pr = ac.decodeAudioData(a.buffer, done, fail); if (pr && pr.catch) pr.catch(function () {});
    } catch (e) {}
  };
  LV.Music.prototype.stop = function () { if (this.src) { try { this.src.stop(); } catch (e) {} this.src = null; } synthStop.call(this); };
})();
