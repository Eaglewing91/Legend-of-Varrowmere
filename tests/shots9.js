const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await p.evaluate(() => { const s = LV.game.save; Object.assign(s.items, { grapple: 1, bow: 1, rod: 1, lantern: 1, pendant_ruins1: 1, pendant_shrine: 1, pendant_forge: 1 }); s.maxHp = 24; LV.game.hero.maxHp = 24; LV.game.hero.hp = 24; });
  await shot('grove', () => { const g = LV.game; g.enter('grove', 7 * 16 + 8, 7 * 16 + 12, 0); }, 900);
  await shot('castle-gate', () => { const g = LV.game; g.enter('grove', 23 * 16 + 8, 9 * 16 + 12, 0); g.area = g.world.areaAt(23 * 16, 8 * 16); }, 900);
  await shot('castle-entrance', () => { const g = LV.game; g.enter('castle', 23 * 16 + 8, 24 * 16 + 12, 0); }, 900);
  await shot('vex', () => { const g = LV.game; g.dialog = null; g.save.items.dawnblade = 1; g.enter('castle', 40 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); }, 300);
  await shot('vex-fight', () => { const g = LV.game; g.dialog = null; }, 2600);
  await shot('ending', () => { const g = LV.game; g.dialog = null; g.startEnding(); g.endT = 6; }, 1500);
  console.log(errs); await b.close();
})();
