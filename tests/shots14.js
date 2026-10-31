const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await shot('woods-glade', () => { const g = LV.game; g.enter('whisperwood', 9 * 16 + 8, 22 * 16 + 12, 0); g.area = g.world.areaAt(9 * 16, 20 * 16); }, 900);
  await shot('woods-tangle', () => { const g = LV.game; g.enter('whisperwood', 22 * 16 + 8, 22 * 16 + 12, 0); g.area = g.world.areaAt(22 * 16, 20 * 16); }, 900);
  await shot('woods-hideout', () => { const g = LV.game; g.enter('whisperwood', 38 * 16 + 8, 8 * 16 + 12, 0); g.area = g.world.areaAt(38 * 16, 8 * 16); }, 900);
  await shot('woods-durn', () => { const g = LV.game; g.enter('hideout', 24 * 16 + 8, 10 * 16 + 12, 0); g.area = g.world.areaAt(24 * 16, 8 * 16); g.actors = g.actors.filter(a => a.npc); }, 600);
  console.log(errs); await b.close();
})();
