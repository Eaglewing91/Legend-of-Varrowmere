const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn) => { await p.evaluate(fn); await p.waitForTimeout(250); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await shot('meadow-east', () => { LV.game.enter('meadow', 22 * 16 + 8, 8 * 16 + 12, 1); LV.game.area = LV.game.world.areaAt(22 * 16, 8 * 16); LV.game.actors.forEach(a => a.state = 'chase'); });
  await shot('cave', () => { LV.game.save.items.lantern = 1; LV.game.enter('cave1', 7 * 16 + 8, 9 * 16 + 12, 0); });
  await shot('home', () => { LV.game.enter('home', 8 * 16 + 8, 4 * 16 + 12, 0); });
  await b.close();
})();
