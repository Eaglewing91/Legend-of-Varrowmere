/* ================= Legend of Varrowmere: engine core =================
   Fixed 60 Hz simulation, decoupled rendering, input, maths helpers.
   Internal resolution 256 x 224: 16 x 14 tiles of 16 px, the original's SNES screen. */
'use strict';
const LV = {};
LV.TILE = 16;
LV.VIEW_W = 256;
LV.VIEW_H = 224;
LV.RES = 2;                                   // the canvas has 2 x 2 real pixels per game pixel, so people drawn smaller keep their detail
LV.STEP = 1 / 60;

/* ---------- maths ---------- */
LV.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
LV.sign = function (v) { return v > 0 ? 1 : v < 0 ? -1 : 0; };
LV.lerp = function (a, b, t) { return a + (b - a) * t; };
// Axis-aligned boxes: { x, y, w, h } with x,y the top-left corner, in world pixels.
LV.overlap = function (a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; };
LV.boxCentre = function (b) { return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
// Directions: 0 up, 1 right, 2 down, 3 left (the original's four facings).
LV.DIRS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
LV.dirFromVec = function (x, y, prev) {
  if (!x && !y) return prev;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 1 : 3;
  if (Math.abs(y) > Math.abs(x)) return y > 0 ? 2 : 0;
  // exact diagonal: keep the previous facing if it is one of the two, as the original does
  const a = x > 0 ? 1 : 3, b = y > 0 ? 2 : 0;
  return prev === a || prev === b ? prev : b;
};
// Seeded random (deterministic drops and patterns for tests).
LV.rng = function (seed) { let s = seed >>> 0 || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; };

/* ---------- input ----------
   Logical buttons: up down left right, attack, item, action, map, menu.
   held[b] = currently down; pressed[b] = went down this step (cleared after each step). */
LV.Input = function () {
  this.held = {}; this.pressed = {}; this._queue = [];
  this.map = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'attack', KeyJ: 'attack', KeyX: 'item', KeyK: 'item', KeyF: 'action', KeyC: 'action', KeyL: 'action', KeyM: 'map', Enter: 'menu', Escape: 'menu'
  };
};
LV.Input.prototype.down = function (b) { if (!this.held[b]) this._queue.push(b); this.held[b] = true; };
LV.Input.prototype.up = function (b) { this.held[b] = false; };
LV.Input.prototype.key = function (code, isDown) { const b = this.map[code]; if (!b) return false; if (isDown) this.down(b); else this.up(b); return true; };
LV.Input.prototype.beginStep = function () { this.pressed = {}; for (const b of this._queue) this.pressed[b] = true; this._queue = []; };
LV.Input.prototype.axis = function () {
  const x = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0), y = (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0);
  return { x: x, y: y };
};
LV.Input.prototype.clear = function () { this.held = {}; this.pressed = {}; this._queue = []; };

/* ---------- game loop ----------
   update(dt) runs at a fixed 60 Hz however fast the screen refreshes; render(alpha) draws once per frame. */
LV.Loop = function (update, render) { this.update = update; this.render = render; this.acc = 0; this.last = 0; this.raf = 0; this.running = false; this.speed = 1; };
LV.Loop.prototype.start = function () {
  if (this.running) return; this.running = true; this.last = 0;
  const self = this;
  const frame = function (t) {
    if (!self.running) return;
    if (!self.last) self.last = t;
    let dt = Math.min(0.1, (t - self.last) / 1000) * self.speed; self.last = t;
    self.acc += dt; let n = 0;
    while (self.acc >= LV.STEP && n < 8) { self.update(LV.STEP); self.acc -= LV.STEP; n++; }
    if (n === 8) self.acc = 0;
    self.render(self.acc / LV.STEP);
    self.raf = requestAnimationFrame(frame);
  };
  this.raf = requestAnimationFrame(frame);
};
LV.Loop.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };
