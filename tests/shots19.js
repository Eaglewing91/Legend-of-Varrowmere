// The opening scene: bed, the voice, Brannoc, the stormy night in Thistledown
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const shot = async (n, w) => { await p.waitForTimeout(w || 300); await (await p.$('canvas')).screenshot({ path: 'tests/shots/op-' + n + '.png' }); };
  const key = async (k, n) => { for (let i = 0; i < (n || 1); i++) { await p.keyboard.press(k); await p.waitForTimeout(160); } };
  await p.evaluate(() => { const g = LV.game; g.title = { stores: [LV.memoryStore(), LV.memoryStore(), LV.memoryStore()] }; g.mode = 'title'; g.startFile(0); });
  await shot('1-bed', 1500);
  await p.waitForTimeout(2500); await shot('2-voice');
  await key('KeyZ', 5); await p.waitForTimeout(1500); await shot('3-wake');
  await key('KeyZ', 1); await p.waitForTimeout(2500); await shot('4-brannoc');
  await key('KeyZ', 5); await p.waitForTimeout(3500); await shot('5-leaves');
  await key('KeyZ', 2); await p.waitForTimeout(1000); await shot('6-free');
  const st = await p.evaluate(() => ({ scene: !!LV.game.scene, night: LV.game.save.flags.night, map: LV.game.world.id }));
  console.log(JSON.stringify(st));
  await p.evaluate(() => { const g = LV.game; g.enter('meadow', 3 * 16 + 8, 7 * 16 + 12, 2); });
  await shot('7-night', 1500);
  await p.evaluate(() => { const g = LV.game; const a = g.actors.find(a => a.who === 'OldWoman'); g.hero.x = a.x - 14; g.hero.y = a.y; g.hero.dir = 1; g.interact(g.hero); });
  await shot('8-maud', 600);
  await p.evaluate(() => { const g = LV.game; g.dialog = null; g.enter('ruins1', 23 * 16 + 8, 25 * 16 + 12, 0); });
  await p.waitForTimeout(500);
  const n2 = await p.evaluate(() => LV.game.save.flags.night); console.log('night after ruins:', n2);
  console.log(errs); await b.close();
})();
