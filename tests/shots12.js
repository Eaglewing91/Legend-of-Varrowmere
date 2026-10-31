const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await shot('marrow-bridge', () => { const g = LV.game; g.enter('marrowgate', 23 * 16 + 8, 6 * 16 + 12, 2); }, 900);
  await shot('marrow-square', () => { const g = LV.game; g.enter('marrowgate', 36 * 16 + 8, 9 * 16 + 12, 2); g.area = g.world.areaAt(36 * 16, 9 * 16); }, 900);
  await shot('marrow-south', () => { const g = LV.game; g.enter('marrowgate', 20 * 16 + 8, 20 * 16 + 12, 2); g.area = g.world.areaAt(20 * 16, 20 * 16); }, 900);
  await shot('marrow-tavern', () => { const g = LV.game; g.enter('mg_tavern', 7 * 16 + 8, 11 * 16 + 12, 0); }, 900);
  await shot('marrow-gallery', () => { const g = LV.game; g.save.items.bow = 1; g.save.cash = 50; g.enter('mg_gallery', 7 * 16 + 8, 10 * 16 + 12, 0); g.gallery(); g.nextDialog && 0; }, 300);
  await shot('marrow-gallery2', () => { const g = LV.game; g.dialog.cb(0); g.dialog = null; }, 1200);
  console.log(errs); await b.close();
})();
