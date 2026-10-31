const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await shot('fen-mole', () => { const g = LV.game; g.enter('willowfen', 8 * 16 + 8, 21 * 16 + 12, 2); g.area = g.world.areaAt(8 * 16, 21 * 16); }, 900);
  await shot('fen-pools', () => { const g = LV.game; g.enter('willowfen', 24 * 16 + 8, 12 * 16 + 12, 2); g.area = g.world.areaAt(24 * 16, 12 * 16); }, 900);
  await shot('fen-south', () => { const g = LV.game; g.enter('willowfen_s', 14 * 16 + 8, 9 * 16 + 12, 2); g.area = g.world.areaAt(14 * 16, 9 * 16); }, 900);
  await shot('fen-dig', () => { const g = LV.game; g.save.items.shovel = 1; g.save.equip = 'shovel'; g.save.dug = {}; delete g.save.opened['willowfen:dig:35,23']; g.enter('willowfen', 35 * 16 + 8, 24 * 16 + 12, 0); g.area = g.world.areaAt(35 * 16, 24 * 16); g.actors = []; g.dig(g.hero); }, 500);
  console.log(errs); await b.close();
})();
