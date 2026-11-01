// Ashford Castle, the Shadow Keep, the Meadow Ruins and the Sunken Shrine in their new places
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const out = process.argv[2] || 'tests/out/';
  const big = async (name, map, sx, sy, cols, rows, setup) => {
    const url = await p.evaluate(([map, sx, sy, cols, rows, setup]) => {
      const g = LV.game; if (setup) (new Function('g', setup))(g);
      g.enter(map, (sx * 16 + 8) * 16, (sy * 14 + 7) * 16, 0); g.actors = g.actors.filter(a => !a.npc && !a.hero);
      g.hero.x = -999; const c = document.createElement('canvas'); c.width = 512 * cols; c.height = 448 * rows; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      const hud = g.drawHud; g.drawHud = function () {};
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { g.area = g.world.areaAt(((sx + i) * 16 + 8) * 16, ((sy + j) * 14 + 7) * 16); g.cam = g.camFor(g.area); g.render(); x.drawImage(LV.canvas, i * 512, j * 448); }
      g.drawHud = hud; return c.toDataURL();
    }, [map, sx, sy, cols, rows, setup]);
    require('fs').writeFileSync(out + name + '.png', Buffer.from(url.split(',')[1], 'base64'));
  };
  const at = async (map, test) => p.evaluate(([map, test]) => { const m = LV.MAPS[map]; const w = m.warps.find(w => new RegExp(test).test(w.to)); return [Math.floor(w.x / 16), Math.floor(w.y / 14)]; }, [map, test]);
  let [cx, cy] = await at('castlelawns', '^castle');
  await big('castle', 'castlelawns', cx - 1, cy, 2, 2);
  await big('castle-shadow', 's_castlelawns', cx - 1, cy, 2, 2);
  [cx, cy] = await at('riverlands', '^ruins1'); await big('ruins', 'riverlands', cx, cy, 1, 1);
  const sh = await p.evaluate(() => { const v = LV.MAPS.mirrorlake.variants || []; return v.length; });
  [cx, cy] = await p.evaluate(() => { const m = LV.MAPS.mirrorlake; const v = (m.variants || []).find(v => v.when === 'sluice'); const w = v.warps[0]; return [Math.floor(w.x / 16), Math.floor(w.y / 14)]; });
  await big('shrine-flooded', 'mirrorlake', cx, cy, 1, 1);
  await big('shrine-drained', 'mirrorlake', cx, cy, 1, 1, 'g.save.flags.sluice = 1');
  console.log(errs);
  await b.close();
})();
