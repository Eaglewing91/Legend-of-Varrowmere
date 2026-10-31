const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await p.evaluate(() => { const s = LV.game.save; Object.assign(s.items, { lantern: 1, bow: 1, bombbag: 1 }); s.bombs = 6; s.arrows = 18; s.equip = 'bow'; s.keys.ruins1 = 1; });
  await shot('ruins-entrance', () => { const g = LV.game; g.enter('ruins1', 23 * 16 + 8, 24 * 16 + 12, 0); });
  await shot('ruins-blocks', () => { const g = LV.game; g.enter('ruins1', 8 * 16 + 8, 20 * 16 + 12, 2); });
  await shot('ruins-boss', () => { const g = LV.game; g.enter('ruins1', 40 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 10 * 16); }, 1600);
  await shot('ruins-gate', () => { const g = LV.game; g.enter('meadow', 19 * 16 + 8, 7 * 16 + 12, 0); g.area = g.world.areaAt(19 * 16, 7 * 16); });
  console.log(errs); await b.close();
})();
