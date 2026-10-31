const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const list = [['northreach', 15, 20], ['frostspire', 40, 14], ['frostspire', 20, 8], ['skyridge', 16, 7], ['icemere', 4, 20], ['eastvale', 40, 7], ['riverlands', 14, 7], ['saltmarsh', 14, 34], ['saltmarsh', 14, 46], ['desert', 32, 28], ['desert', 38, 9], ['southshore', 48, 5]];
  for (const [id, x, y] of list) {
    await p.evaluate(([id, x, y]) => { const g = LV.game; g.enter(id, x * 16 + 8, y * 16 + 12, 2); g.area = g.world.areaAt(x * 16, y * 16); g.actors = g.actors.filter(a => a.npc); }, [id, x, y]);
    await p.waitForTimeout(250); await (await p.$('canvas')).screenshot({ path: 'tests/shots/w-' + id + '-' + x + '.png' });
  }
  console.log(errs); await b.close();
})();
