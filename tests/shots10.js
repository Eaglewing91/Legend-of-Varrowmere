const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await p.evaluate(() => { const s = LV.game.save; Object.assign(s.items, { grapple: 1, bow: 1, mirror: 1, fins: 1, glove: 1 }); s.equip = 'mirror'; s.maxHp = 28; LV.game.hero.maxHp = 28; LV.game.hero.hp = 28; });
  await shot('shadow-village', () => { const g = LV.game; g.enter('s_meadow', 8 * 16 + 8, 8 * 16 + 12, 2); }, 900);
  await shot('shadow-blackwater', () => { const g = LV.game; g.enter('s_meadow', 40 * 16 + 8, 8 * 16 + 12, 1); g.area = g.world.areaAt(40 * 16, 8 * 16); }, 900);
  await shot('vault-north', () => { const g = LV.game; g.enter('vault', 23 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(23 * 16, 8 * 16); }, 900);
  await shot('vault-boss', () => { const g = LV.game; g.enter('vault', 40 * 16 + 8, 12 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); }, 3000);
  await shot('quarry-boss', () => { const g = LV.game; g.enter('quarry', 40 * 16 + 8, 12 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); }, 800);
  console.log(errs); await b.close();
})();
