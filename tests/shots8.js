const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await p.evaluate(() => { const s = LV.game.save; Object.assign(s.items, { grapple: 1, bow: 1, rod: 1, lantern: 1, pendant_ruins1: 1, pendant_shrine: 1 }); s.equip = 'rod'; s.arrows = 20; s.maxHp = 20; LV.game.hero.maxHp = 20; LV.game.hero.hp = 20; });
  await shot('cinderfold', () => { const g = LV.game; g.enter('highlands', 7 * 16 + 8, 24 * 16 + 12, 0); }, 900);
  await shot('mountain', () => { const g = LV.game; g.enter('highlands', 7 * 16 + 8, 9 * 16 + 12, 0); }, 900);
  await shot('forge-gate', () => { const g = LV.game; g.enter('highlands', 23 * 16 + 8, 8 * 16 + 12, 0); }, 900);
  await shot('forge-entrance', () => { const g = LV.game; g.enter('forge', 23 * 16 + 8, 24 * 16 + 12, 0); }, 1200);
  await shot('forge-north', () => { const g = LV.game; g.enter('forge', 23 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(23 * 16, 8 * 16); g.useItem(g.hero); }, 300);
  await shot('forge-boss', () => { const g = LV.game; g.enter('forge', 40 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); }, 1500);
  await shot('north-road', () => { const g = LV.game; g.enter('meadow', 8 * 16 + 8, 5 * 16 + 12, 0); }, 600);
  console.log(errs); await b.close();
})();
