/* ================= Music: a tiny chiptune sequencer =================
   Original tunes (not the original game's), two square-wave voices plus a triangle bass, scheduled ahead on
   the Web Audio clock. Each map names its track; bosses switch to the boss theme. N toggles the music. */
LV.TUNES = {
  // notes: 'C4' etc, '-' holds, '.' rest; one step = a 16th note
  overworld: { bpm: 132, lead: 'E4 - G4 - C5 - - - B4 - G4 - E4 - - - F4 - A4 - D5 - - - C5 - A4 - F4 - - - G4 - B4 - D5 - - - E5 - D5 - B4 - G4 - C5 - - - - - - - . . . .',
    bass: 'C3 . G3 . C3 . G3 . C3 . G3 . C3 . G3 . F2 . C3 . F2 . C3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . G2 . D3 . G2 . D3 . C3 . G3 . C3 . G3 . C3 . G3 . C3 . E3 .' },
  home: { bpm: 96, lead: 'G4 - - - E4 - - - C4 - D4 - E4 - - - F4 - - - D4 - - - B3 - C4 - D4 - - - E4 - G4 - C5 - - - B4 - A4 - G4 - - - F4 - E4 - D4 - - - C4 - - - - - - -',
    bass: 'C3 - - - G2 - - - F2 - - - G2 - - - C3 - - - A2 - - - F2 - - - G2 - - -' },
  dungeon: { bpm: 108, lead: 'A3 - . C4 - . E4 - D4 - . C4 - . B3 - A3 - . C4 - . E4 - F4 - E4 - D4 - C4 - B3 - G#3 - - - B3 - - - E4 - - - D4 - C4 - B3 - A3 - - - - - - -',
    bass: 'A2 . A2 . A2 . A2 . F2 . F2 . F2 . F2 . D2 . D2 . D2 . D2 . E2 . E2 . E2 . E2 .' },
  boss: { bpm: 156, lead: 'E4 E4 . E4 G4 . E4 . F4 F4 . F4 A4 . F4 . E4 E4 . E4 G4 . B4 . A4 - G4 - F4 - D#4 - E4 E4 . E4 G4 . E4 . F4 F4 . F4 A4 . C5 . B4 - A4 - G#4 - B4 - E5 - - - . . . .',
    bass: 'E2 E2 E3 E2 E2 E3 E2 E3 F2 F2 F3 F2 F2 F3 F2 F3 E2 E2 E3 E2 E2 E3 E2 E3 D2 D2 D3 D2 B1 B1 B2 B1' },
  title: { bpm: 100, lead: 'C4 - - - G4 - - - C5 - - - - - - - B4 - A4 - G4 - - - E4 - - - - - - - F4 - - - A4 - - - D5 - - - - - - - C5 - B4 - G4 - - - - - - - - - - -',
    bass: 'C3 - - - - - - - G2 - - - - - - - F2 - - - - - - - G2 - - - - - - -' }
};
LV.noteHz = function (n) {
  const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0;
  const i = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0) + (+m[3] + 1) * 12;
  return 440 * Math.pow(2, (i - 69) / 12);
};
LV.parseTune = function (s) {
  const t = s.split(/\s+/).filter(Boolean), out = [];
  t.forEach(function (n) { if (n === '-') { if (out.length) out[out.length - 1].len++; } else out.push({ hz: n === '.' ? 0 : LV.noteHz(n), len: 1 }); });
  return out;
};
LV.Music = function (game) { this.g = game; this.track = null; this.on = true; this.voices = []; };
LV.Music.prototype.play = function (name) {
  if (this.track === name) return; this.track = name; this.stop();
  const g = this.g; if (g.muted || !this.on || typeof AudioContext === 'undefined' || !LV.TUNES[name]) return;
  try { if (!g.audio) g.audio = new AudioContext(); } catch (e) { return; }
  const ac = g.audio, tune = LV.TUNES[name], step = 60 / tune.bpm / 4, self = this;
  const parts = [{ notes: LV.parseTune(tune.lead), type: 'square', vol: 0.025 }, { notes: LV.parseTune(tune.bass), type: 'triangle', vol: 0.05 }];
  parts.forEach(function (p) {
    const v = { p: p, i: 0, at: ac.currentTime + 0.1 };
    v.timer = setInterval(function () {
      // keep ~0.4 s scheduled ahead
      while (v.at < ac.currentTime + 0.4) {
        const n = p.notes[v.i % p.notes.length]; v.i++;
        if (n.hz) {
          const o = ac.createOscillator(), gn = ac.createGain(); o.type = p.type; o.frequency.value = n.hz;
          const d = n.len * step; gn.gain.setValueAtTime(p.vol, v.at); gn.gain.setValueAtTime(p.vol, v.at + d * 0.7); gn.gain.linearRampToValueAtTime(0.0001, v.at + d * 0.95);
          o.connect(gn); gn.connect(ac.destination); o.start(v.at); o.stop(v.at + d);
        }
        v.at += n.len * step;
      }
    }, 100);
    self.voices.push(v);
  });
};
LV.Music.prototype.stop = function () { this.voices.forEach(function (v) { clearInterval(v.timer); }); this.voices = []; };
LV.Music.prototype.toggle = function () { this.on = !this.on; const t = this.track; this.track = null; if (this.on) this.play(t); else this.stop(); };
(function () {
  LV.Input.prototype.key = (function (orig) { return function (code, isDown) { if (code === 'KeyN') { if (isDown) this.down('music'); else this.up('music'); return true; } return orig.call(this, code, isDown); }; })(LV.Input.prototype.key);
  const update = LV.Game.prototype.update;
  LV.Game.prototype.update = function (dt) {
    update.call(this, dt);
    if (!this.music) this.music = new LV.Music(this);
    if (this.input.pressed.music) this.music.toggle();
    let want = 'title';
    if (this.mode === 'ending') want = 'home';
    else if (this.mode !== 'title' && this.world) {
      const self = this, bossNear = this.actors.some(function (a) { return a.boss && !a.dead && self.world.areaAt(a.x, a.y - 8) === self.area; });
      want = bossNear ? 'boss' : (this.world.def.music || 'overworld');
    }
    this.music.play(want);
  };
  // stop the music when the window is closed
  const close = LV.close; LV.close = function () { if (LV.game && LV.game.music) { LV.game.music.stop(); LV.game.music.track = null; } close(); };
})();
LV.TUNES.village = LV.TUNES.overworld; LV.TUNES.cave = LV.TUNES.dungeon;
