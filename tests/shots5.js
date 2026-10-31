const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await shot('reedwater', () => { const g = LV.game; g.enter('meadow', 36 * 16 + 8, 9 * 16 + 12, 1); }, 1200);
  await shot('shop', () => { const g = LV.game; g.save.cash = 80; g.enter('meadow', 12 * 16 + 8, 8 * 16 + 4, 0); g.actors = g.actors.filter(a => a.npc); g.openShop(); }, 300);
  await shot('worldmap', () => { const g = LV.game; g.dialog = null; g.enter('meadow', 20 * 16 + 8, 8 * 16 + 12, 1); g.mapOpen = true; }, 300);
  await shot('dungeonmap', () => { const g = LV.game; g.mapOpen = false; Object.assign(g.save.items, { map_ruins1: 1, compass_ruins1: 1 }); g.save.seen = { ruins1: [0, 1] }; delete g.save.flags['ruins1:boss']; g.enter('ruins1', 23 * 16 + 8, 24 * 16 + 12, 0); g.mapOpen = true; }, 300);
  console.log(errs); await b.close();
})();
