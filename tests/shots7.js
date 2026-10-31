const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await p.evaluate(() => { const s = LV.game.save; Object.assign(s.items, { grapple: 1, bow: 1 }); s.equip = 'grapple'; s.arrows = 20; });
  await shot('shrine-entrance', () => { const g = LV.game; delete g.save.flags['shrine:drained']; g.enter('shrine', 24 * 16 + 8, 24 * 16 + 12, 0); }, 2500);
  await shot('shrine-island', () => { const g = LV.game; g.enter('shrine', 8 * 16 + 8, 24 * 16 + 12, 0); g.actors = []; g.useItem(g.hero); for (let i = 0; i < 14; i++) g.update(1 / 60); }, 50);
  await shot('shrine-drained', () => { const g = LV.game; g.save.flags['shrine:drained'] = 1; g.enter('shrine', 23 * 16 + 8, 8 * 16 + 12, 0); }, 600);
  await shot('shrine-boss', () => { const g = LV.game; delete g.save.flags['shrine:boss']; g.enter('shrine', 40 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); }, 1200);
  console.log(errs); await b.close();
})();
