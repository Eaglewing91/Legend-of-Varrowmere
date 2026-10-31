// Crossing onto the next screen never leaves Wren stuck inside something (bush, tree, rock)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const r = await p.evaluate(() => {
    LV.loop.stop(); const g = LV.game, out = { tried: 0, stuckBefore: 0, stuckAfter: 0, ex: [] };
    const ids = Object.keys(LV.MAPS).filter(id => !LV.MAPS[id].indoor && LV.MAPS[id].areas && LV.MAPS[id].areas.length > 1);
    for (const id of ids) {
      g.dialog = null; g.scene = null; g.enter(id, 8, 12, 2); const w = g.world, h = g.hero;
      for (const a of w.areas) for (const dir of [0, 1, 2, 3]) {
        const D = LV.DIRS[dir], n = dir % 2 ? a[3] : a[2];
        for (let k = 1; k < n - 1; k += 1) {
          // stand just inside this screen's edge, facing out
          const tx = dir === 1 ? a[0] + a[2] - 1 : dir === 3 ? a[0] : a[0] + k, ty = dir === 2 ? a[1] + a[3] - 1 : dir === 0 ? a[1] : a[1] + k;
          h.x = dir === 3 ? a[0] * 16 + 0.5 : dir === 1 ? (a[0] + a[2]) * 16 - 0.5 : tx * 16 + 8; h.y = dir === 0 ? a[1] * 16 + 3.5 : dir === 2 ? (a[1] + a[3]) * 16 - 0.5 : ty * 16 + 12;
          if (w.boxBlocked(h.bodyBox(), 'hero')) continue;
          const nx = h.x + D.x * 10, ny = h.y + D.y * 12, next = w.areaAt(nx, ny - 3); if (!next || next === a) continue;
          // the slide carries her 20 px on; is that inside something?
          const lx = h.x + D.x * 20, ly = h.y + D.y * 20, hx = h.x, hy = h.y; h.x = lx; h.y = ly;
          const blocked = w.boxBlocked(h.bodyBox(), 'hero'); h.x = hx; h.y = hy;
          out.tried++; if (!blocked) continue; out.stuckBefore++;
          // do it for real
          g.area = a; g.cam = g.camFor(a); h.dir = dir; h.state = 'walk'; g.scroll = null; g.checkEdges();
          let guard = 0; while (g.scroll && guard++ < 200) g.stepScroll(1 / 60);
          if (w.boxBlocked(h.bodyBox(), 'hero')) { out.stuckAfter++; if (out.ex.length < 5) out.ex.push([id, tx, ty, dir]); }
        }
      }
    }
    return out;
  });
  console.log(JSON.stringify(r), errs);
  console.log(r.stuckAfter === 0 ? 'edges OK' : 'edges FAIL'); await b.close();
})();
