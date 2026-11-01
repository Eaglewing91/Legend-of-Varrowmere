/* ================= The opening: a stormy night in Wren's house =================
   A new file starts in bed, at night, with rain on the window. A voice calls from the Meadow Ruins; Captain Brannoc
   hears it too, tells Wren to stay put, and goes out into the storm. Then it's yours: Thistledown is dark and wet
   until you reach the ruins, and the night ends there. Brannoc turns up hurt inside, and is home again once you
   have the Pendant of Valor. Enter skips the scene. */

/* ---------- a tiny script runner: each step runs until it returns true ---------- */
LV.Scene = function (steps) { this.steps = steps; this.i = 0; this.t = 0; };
LV.Scene.prototype.step = function (g, dt) {
  while (this.i < this.steps.length) {
    const s = this.steps[this.i];
    if (!s(g, this.t, dt, this)) { this.t += dt; return false; }
    this.i++; this.t = 0;
    if (g.dialog || g.fadeTo) return false;
  }
  return true;
};
const wait = function (sec) { return function (g, t) { return t >= sec; }; };
const say = function (lines) { return function (g) { g.say(lines); return true; }; };
const run = function (fn) { return function (g, t, dt, sc) { fn(g, sc); return true; }; };
// walk an actor to a point at walking pace; true when there
const walk = function (pick, tx, ty, speed) {
  return function (g) {
    const a = pick(g); if (!a) return true;
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), v = (speed || 40) / 60;
    if (d <= v) { a.x = tx; a.y = ty; a.moving = false; return true; }
    a.dir = LV.dirFromVec(dx, dy, a.dir); a.x += dx / d * v; a.y += dy / d * v; a.moving = true; a.anim = (a.anim || 0) + 0.1; return false;
  };
};
const BED = { x: 3 * 16, y: 4 * 16 + 4 };            // where Wren lies (the pillow end of the bed)
LV.WREN_BED = { x: BED.x - 2, y: BED.y + 3 };        // her head on the pillow (src/49-wren.js draws it)
const brannoc = function (g) { return g.actors.find(function (a) { return a.who === 'Brannoc'; }); };

LV.OPENING = function () {
  return new LV.Scene([
    run(function (g, sc) { sc.inBed = true; g.fade = 1; g.thunder = 0; }),
    wait(2.2),
    run(function (g) { g.thunder = 1; g.shake = 0.35; }),
    wait(1.4),
    say(['...Wren...', '...Wren of Thistledown... can you hear me?',
      'I am far beneath the Meadow Ruins. Tonight the Gilded Hand are breaking through the old doors.',
      'They are looking for the Pendant of Valor. If Vex takes it, the other two will follow, and Varrowmere with them.',
      'Please... come to me... hurry...']),
    run(function (g) { g.thunder = 1; g.shake = 0.5; }),
    wait(1),
    say(['Wren wakes with a start. The rain is hammering on the window.']),
    run(function (g) { const b = brannoc(g); if (b) b.dir = 3; }),
    wait(0.5),
    walk(brannoc, 5 * 16, 5 * 16 + 14),
    run(function (g) { const b = brannoc(g); if (b) b.dir = 3; }),
    say(['BRANNOC: You heard it too, didn\'t you? That voice.',
      'Twenty years I stood guard for the old Queen, and not once did those ruins call out to anyone.',
      'I\'m going to go and take a look. You stay in bed.',
      'I mean it, Wren. Vex\'s soldiers are all over the meadow tonight.',
      '...And feed the pigeon.']),
    walk(brannoc, 7.5 * 16, 12 * 16 + 14),
    run(function (g) { const b = brannoc(g); if (b) { b.dead = true; g.effects.push(new LV.Effect(b.x, b.y, 'poof')); } g.sfx('door'); }),
    wait(1.2),
    say(['Brannoc steps out into the storm. The door bangs shut behind him.', 'Somewhere far off, under the ruins, the voice is still calling.']),
    run(function (g, sc) { sc.inBed = false; const h = g.hero; h.x = 4 * 16 + 12; h.y = 6 * 16 + 4; h.dir = 1; h.state = 'walk'; g.sfx('lift'); }),
    wait(0.4)
  ]);
};

/* ---------- starting a new file starts the scene ---------- */
LV.Game.prototype.startFile = (function (orig) {
  return function (i) {
    const st = this.title && this.title.stores[i], s = (st && st.get()) || LV.newSave();
    // a file closed before the opening finished (still in bed): play it again from the start
    const unfinished = s.flags && s.flags.intro && s.flags.night && s.map === 'home' && s.x === BED.x + 8 && s.y === BED.y;
    if (unfinished) { orig.call(this, i); this.fade = 1; this.startOpening(); return; }
    if (s.flags && s.flags.intro) return orig.call(this, i);
    // a brand-new file: wake up at home, at night
    s.flags = s.flags || {}; s.flags.intro = 1; s.flags.night = 1; s.map = 'home'; s.x = BED.x + 8; s.y = BED.y; s.dir = 2;
    st.set(s); orig.call(this, i); this.fade = 1;
    this.startOpening();
  };
})(LV.Game.prototype.startFile);
LV.Game.prototype.startOpening = function () {
  const b = LV.makeVillager(11 * 16 + 8, 4 * 16 + 14, { look: 'guard', who: 'Brannoc', roam: 0, dir: 0, talk: [[null, ['...']]] });
  b.update = function () {}; this.actors.push(b);
  this.scene = LV.OPENING();
};
// while the scene runs nobody can move; the dialog still advances, and Enter skips to the end
LV.Game.prototype.update = (function (orig) {
  return function (dt) {
    const sc = this.scene;
    if (!sc || this.mode === 'title') return orig.call(this, dt);
    if (this.input._queue.indexOf('menu') >= 0 && !this.dialog) {
      this.input.clear(); this.dialog = null;
      const b = brannoc(this); if (b) b.dead = true;
      sc.inBed = false; const h = this.hero; h.x = 4 * 16 + 12; h.y = 6 * 16 + 4; h.dir = 1; this.scene = null; this.fade = 1; return;
    }
    if (!this.dialog && !this.fadeTo) {
      if (sc.step(this, dt) && !this.dialog) { this.scene = null; this.input.clear(); return orig.call(this, dt); }
      this.input._queue = this.input._queue.filter(function (k) { return k === 'attack' || k === 'action'; }); this.input.held = {};
      const q = this.input._queue; this.input._queue = [];
      orig.call(this, dt); this.input._queue = q;    // the world keeps ticking (the fire, the rain); Wren stays put
      return;
    }
    return orig.call(this, dt);
  };
})(LV.Game.prototype.update);
// Wren asleep: just her head on the pillow, under the blanket
LV.Hero.prototype.draw = (function (orig) {
  return function (ctx, ox, oy) {
    const g = LV.game;
    if (!(g && g.scene && g.scene.inBed)) return orig.call(this, ctx, ox, oy);
    const X = Math.round(BED.x - 2 - ox), Y = Math.round(BED.y + 3 - oy);
    ctx.save(); ctx.beginPath(); ctx.rect(X - 12, Y - 26, 24, 16); ctx.clip();
    LV.heroCell(ctx, 'idle', LV.HCOL[2], 0, X, Y - 4); ctx.restore();
  };
})(LV.Hero.prototype.draw);

/* ---------- night: dark blue, firelight indoors, rain and lightning outside ---------- */
LV.isNight = function (g) { return !!(g && g.save && g.save.flags.night && g.mode !== 'title' && (g.world.id === 'home' || g.world.id === 'meadow')); };
LV.drawNight = function (ctx, g) {
  const out = !g.world.indoor, ox = Math.round(g.cam.x), oy = Math.round(g.cam.y);
  if (!g.nightCv) { g.nightCv = document.createElement('canvas'); g.nightCv.width = LV.VIEW_W; g.nightCv.height = LV.VIEW_H; }
  const c = g.nightCv, x = c.getContext('2d');
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = out ? 'rgba(10,16,52,.55)' : 'rgba(6,8,30,.74)'; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-out';
  const light = function (lx, ly, r, k) { const gr = x.createRadialGradient(lx, ly, 0, lx, ly, r); gr.addColorStop(0, 'rgba(0,0,0,' + k + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(lx - r, ly - r, r * 2, r * 2); };
  const flick = 1 + Math.sin(g.t * 9) * 0.04 + Math.sin(g.t * 23) * 0.03;
  if (!out) { light(12 * 16 - ox, 2 * 16 + 4 - oy, 58 * flick, 0.92); light(6 * 16 - ox, 1 * 16 - oy, 22, 0.35 + (g.thunder || 0) * 0.6); }   // the fireplace; the window
  else { light(g.hero.x - ox, g.hero.y - 10 - oy, 34, 0.7); for (let i = 0; i < g.world.col.length; i++) if (g.world.col[i] === LV.C.TORCH_LIT) light((i % g.world.w) * 16 + 8 - ox, Math.floor(i / g.world.w) * 16 + 4 - oy, 50, 0.9); }
  ctx.drawImage(c, 0, 0);
  if (!out) { const fx = 12 * 16 - ox, fy = 2 * 16 + 4 - oy, gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, 64 * flick); gr.addColorStop(0, 'rgba(255,150,60,.28)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = gr; ctx.fillRect(fx - 70, fy - 70, 140, 140); }
  // lightning: now and then outside, or when the scene calls for it
  if (out && !g.dialog && Math.random() < 0.0025) g.thunder = 1;
  if (g.thunder > 0) { ctx.fillStyle = 'rgba(220,230,255,' + (out ? 0.55 : 0.3) * g.thunder + ')'; ctx.fillRect(0, 0, LV.VIEW_W, LV.VIEW_H); g.thunder = Math.max(0, g.thunder - 0.06); }
};
LV.drawHud = (function (orig) {
  return function (ctx, g) {
    if (LV.isNight(g)) LV.drawNight(ctx, g);
    if (g.scene && g.scene.inBed) { if (g.dialog === null) { LV.text(ctx, 'Enter: skip', 196, 212, '#8a90b0'); } return; }   // no HUD while asleep
    return orig(ctx, g);
  };
})(LV.drawHud);
// rain over Thistledown while it's night
(function () {
  const dl = LV.drawLayer;
  LV.drawLayer = function (ctx, world, name, ox, oy) {
    const g = LV.game, night = name === 'over' && world.id === 'meadow' && LV.isNight(g);
    if (night) LV.WEATHER.meadow = 'rain';
    try { return dl(ctx, world, name, ox, oy); } finally { if (night) delete LV.WEATHER.meadow; }
  };
})();
// the night ends when Wren reaches the ruins
LV.Game.prototype.enter = (function (orig) {
  return function (mapId, x, y, dir, first) {
    if (mapId === 'ruins1' && this.save && this.save.flags.night) delete this.save.flags.night;
    const r = orig.call(this, mapId, x, y, dir, first);
    if (this.save && this.save.flags.night && mapId === 'meadow') {
      // everyone's indoors except old Maud, who never sleeps and sees everything
      this.actors = this.actors.filter(function (a) { return !a.npc; });
      this.actors.push(LV.makeVillager(6 * 16 + 8, 6 * 16 + 14, { look: 'elder', who: 'OldWoman', roam: 0, dir: 3, talk: [[null, [
        'Wren? Out in this weather?',
        'Brannoc went east a while ago, sword and all, towards the Meadow Ruins. Told me not to tell you.',
        'So I haven\'t told you. Off you go, then.',
        'Follow the east road out to the Riverlands. The old gate is on the far side. Mind the soldiers. And the logs. Especially the logs.']]] }));
    }
    return r;
  };
})(LV.Game.prototype.enter);

// never start a file stuck inside something solid (one saved while Wren was still in bed, say): step to the nearest free spot
LV.Game.prototype.unstick = function (inArea) {
  const h = this.hero, w = this.world, a = inArea && this.area;
  if (!h || !w || this.scene || !w.boxBlocked(h.bodyBox(), 'hero')) return false;
  const x0 = h.x, y0 = h.y;
  for (let rad = 1; rad <= (inArea ? 10 : 6); rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
    const tx = Math.floor(x0 / 16) + dx, ty = Math.floor(y0 / 16) + dy;
    if (a && (tx < a[0] || ty < a[1] || tx >= a[0] + a[2] || ty >= a[1] + a[3])) continue;      // stay on this screen
    h.x = tx * 16 + 8; h.y = ty * 16 + 12;
    if (!w.boxBlocked(h.bodyBox(), 'hero') && !w.warpAt(tx, Math.floor((h.y - 3) / 16))) { h.safe = { x: h.x, y: h.y }; return true; }
  }
  h.x = x0; h.y = y0; return false;
};
// sliding onto a new screen can set Wren down inside a bush or a tree: if so, she steps to the nearest free spot on it
LV.Game.prototype.stepScroll = (function (orig) {
  return function (dt) {
    const s = this.scroll, r = orig.call(this, dt);
    if (s && !this.scroll && !this.unstick(true) && this.world.boxBlocked(this.hero.bodyBox(), 'hero')) {
      // nowhere to stand on that screen: step back where she came from
      const h = this.hero; h.x = s.hx; h.y = s.hy; h.x -= LV.DIRS[s.dir].x * 6; h.y -= LV.DIRS[s.dir].y * 6;
      this.area = this.world.areaAt(h.x, h.y - 3); this.cam = this.camFor(this.area); h.safe = { x: h.x, y: h.y };
    }
    return r;
  };
})(LV.Game.prototype.stepScroll);
LV.Game.prototype.startFile = (function (orig) {
  return function (i) { const r = orig.call(this, i); if (this.mode === 'play') this.unstick(); return r; };
})(LV.Game.prototype.startFile);
