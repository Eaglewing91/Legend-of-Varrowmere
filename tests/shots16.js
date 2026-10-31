const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  for (const d of ['bonehollow', 'thievesden', 'frostmere', 'mirefen', 'turtleback']) {
    await p.evaluate((d) => { const g = LV.game; g.save.items.fins = 1; g.enter(d, 40 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); g.dialog = null; }, d);
    await p.waitForTimeout(1500); await p.evaluate(() => { LV.game.dialog = null; }); await (await p.$('canvas')).screenshot({ path: 'tests/shots/boss-' + d + '.png' });
    await p.evaluate((d) => { const g = LV.game; g.enter(d, 23 * 16 + 8, 24 * 16 + 12, 0); }, d);
    await p.waitForTimeout(400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/ent-' + d + '.png' });
  }
  console.log(errs); await b.close();
})();
