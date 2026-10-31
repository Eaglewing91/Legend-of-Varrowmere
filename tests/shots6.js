const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await shot('brask', () => { const g = LV.game; g.enter('ruins1', 12 * 16 + 8, 10 * 16 + 12, 3); g.area = g.world.areaAt(8 * 16, 8 * 16); }, 900);
  await shot('riverhead', () => { const g = LV.game; g.enter('riverhead', 9 * 16 + 8, 7 * 16 + 12, 0); }, 600);
  await shot('reedwater-drained', () => { const g = LV.game; g.save.flags.sluice = 1; g.enter('meadow', 41 * 16 + 8, 9 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); }, 600);
  console.log(errs); await b.close();
})();
