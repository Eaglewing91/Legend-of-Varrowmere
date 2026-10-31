const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const L = [['ruins1', 8, 8, 'Brask'], ['shrine', 40, 11, 'Kraken'], ['forge', 40, 11, 'Pyrewyrm'], ['forge', 40, 21, 'Hald'], ['bonehollow', 40, 11, 'HollowKing'], ['thievesden', 40, 11, 'Queen'], ['frostmere', 40, 11, 'FrostWyrm'], ['mirefen', 40, 11, 'BogMaw'], ['turtleback', 40, 11, 'Shellback'], ['keep', 40, 11, 'Shade']];
  for (const [id, x, y, n] of L) {
    await p.evaluate(([id, x, y, n]) => { const g = LV.game; g.dialog = null; g.enter(id, x * 16 + 8, (y + 1) * 16 + 12, 0); g.area = g.world.areaAt(x * 16, y * 16); g.hero.inv = 99; if (n === 'Shade') { g.actors = [LV.ENEMIES.shade(40 * 16, 8 * 16)]; } }, [id, x, y, n]);
    await p.waitForTimeout(1200); await p.evaluate(() => { LV.game.dialog = null; }); await p.waitForTimeout(100);
    await (await p.$('canvas')).screenshot({ path: 'tests/shots/na-' + n + '.png' });
  }
  console.log(errs); await b.close();
})();
