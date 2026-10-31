const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 300); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await p.evaluate(() => { const s = LV.game.save; Object.assign(s.items, { lantern: 1, bow: 1, dice: 1, bombbag: 1 }); s.bombs = 8; s.arrows = 24; s.cash = 137; s.equip = 'bow'; });
  await shot('soldiers', () => { const g = LV.game; g.enter('meadow', 21 * 16 + 8, 7 * 16 + 12, 2); g.area = g.world.areaAt(21 * 16, 7 * 16); g.actors.forEach(a => { if (a.kind === 'soldier') a.state = 'chase'; }); }, 700);
  await shot('cave-secret', () => { const g = LV.game; g.enter('cave1', 13 * 16 + 8, 8 * 16 + 12, 1); g.save.equip = 'bombs'; g.useItem(g.hero); }, 1900);
  await shot('menu', () => { const g = LV.game; g.paused = true; g.menu = null; g.menuUpdate(); }, 200);
  await b.close();
})();
