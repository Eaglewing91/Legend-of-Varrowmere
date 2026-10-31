// Vex's people in Mana Seed: soldiers of each rank, an archer, the captains, Vex and the Bandit Queen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => {
    const g = LV.game; g.enter('meadow', 8 * 16 + 8, 12 * 16, 0); g.actors = []; g.hero.inv = 99;
    const add = (k, tx, ty, f) => { const e = LV.ENEMIES[k](tx * 16 + 8, ty * 16 + 14); e.update = function () {}; if (f) f(e); g.actors.push(e); return e; };
    add('soldier', 2, 2); add('soldierBlue', 4, 2); add('captain', 6, 2); add('archer', 8, 2, e => { e.dir = 2; });
    add('soldier', 10, 2, e => { e.state = 'swing'; e.st = 0.12; e.dir = 2; });
    add('archer', 12, 2, e => { e.cool = 1.4; e.dir = 1; });
    add('brute', 2, 7); add('garrow', 5, 7); add('hald', 8, 7); add('drowned', 11, 7);
    add('quarryboss', 2, 11); add('brask2', 5, 11); add('hollowking', 8, 11);
    add('vex', 11, 11, e => { e.state = 'cast'; e.st = 0.2; });
    add('banditqueen', 14, 11, e => { e.state = 'wait'; });
  });
  await p.waitForTimeout(700); await (await p.$('canvas')).screenshot({ path: 'tests/shots/foes-ms.png' });
  console.log(errs); await b.close();
})();
