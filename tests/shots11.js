const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await p.evaluate(() => { const s = LV.game.save; Object.assign(s.items, { grapple: 1, bow: 1, mirror: 1, fins: 1, glove: 1, sunarrows: 1, crystal_vault: 1, crystal_quarry: 1, dawnblade: 1 }); s.equip = 'bow'; s.arrows = 30; s.maxHp = 40; LV.game.hero.maxHp = 40; LV.game.hero.hp = 40; });
  await shot('keep-gate', () => { const g = LV.game; g.enter('s_grove', 23 * 16 + 8, 9 * 16 + 12, 0); g.area = g.world.areaAt(23 * 16, 8 * 16); }, 900);
  await shot('keep-entrance', () => { const g = LV.game; g.enter('keep', 23 * 16 + 8, 25 * 16 + 4, 0); }, 900);
  await shot('shade', () => { const g = LV.game; g.enter('keep', 40 * 16 + 8, 11 * 16 + 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); g.actors = [LV.ENEMIES.shade(40 * 16, 8 * 16)]; g.dialog = null; }, 2200);
  await shot('mirror-pen', () => { const g = LV.game; g.enter('grove', 13 * 16 + 8, 8 * 16 + 12, 0); g.actors = []; }, 600);
  console.log(errs); await b.close();
})();
