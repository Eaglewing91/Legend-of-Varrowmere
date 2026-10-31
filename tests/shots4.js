const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (name, fn, wait) => { await p.evaluate(fn); await p.waitForTimeout(wait || 400); await (await p.$('canvas')).screenshot({ path: 'tests/shots/' + name + '.png' }); };
  await shot('village', () => { const g = LV.game; g.enter('meadow', 8 * 16 + 8, 8 * 16 + 12, 2); }, 1500);
  await shot('village-talk', () => { const g = LV.game; g.enter('meadow', 9 * 16 + 8, 12 * 16 + 4, 3); g.actors.forEach(a => { if (a.look === 'fisher') { a.x = 8 * 16 + 8; } }); g.interact(g.hero); }, 300);
  await shot('title', () => { const g = LV.game; g.dialog = null; const st = [0, 1, 2].map(() => LV.memoryStore()); st[0].set(Object.assign(LV.newSave(), { maxHp: 20, time: 5400 })); g.showTitle(st); }, 2000);
  await shot('files', () => { const g = LV.game; g.title.stage = 'files'; }, 300);
  console.log(errs); await b.close();
})();
