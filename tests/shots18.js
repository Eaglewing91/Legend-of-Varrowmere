// Mana Seed townsfolk: a few busy places, a spirit, and a dialog face
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const spots = await p.evaluate(() => {
    const g = LV.game, out = [];
    Object.keys(LV.MAPS).forEach(function (id) {
      try { g.dialog = null; g.enter(id, 8 * 16, 8 * 16, 2); } catch (e) { return; }
      const v = g.actors.filter(a => a.ms !== undefined);
      if (v.length) out.push([id, v.length, v.filter(a => a.ghost).length, Math.round(v[0].x), Math.round(v[0].y)]);
    });
    return out;
  });
  console.log(spots.length, JSON.stringify(spots.slice(0, 60)));
  const pick = spots.filter(s => s[1] >= 4).slice(0, 3).concat(spots.filter(s => s[2]).slice(0, 2));
  for (const [id, n, gh, x, y] of pick) {
    await p.evaluate(([id, x, y, gh]) => { const g = LV.game; g.dialog = null; g.paused = false; g.enter(id, x, y + 30, 0); if (gh) { const s = g.actors.find(a => a.ghost); g.hero.x = s.x; g.hero.y = s.y + 30; } g.hero.inv = 99; }, [id, x, y, gh]);
    await p.waitForTimeout(1500);
    await (await p.$('canvas')).screenshot({ path: 'tests/shots/ms-' + id + '.png' });
  }
  // talk to someone
  await p.evaluate(([id, x, y]) => { const g = LV.game; g.enter(id, x, y + 18, 0); const a = g.actors.find(a => a.ms !== undefined); g.hero.x = a.x; g.hero.y = a.y + 18; g.hero.dir = 0; a.goal = null; a.x = a.home ? a.x : a.x; g.interact(g.hero); }, pick[0]);
  await p.waitForTimeout(600);
  await (await p.$('canvas')).screenshot({ path: 'tests/shots/ms-talk.png' });
  console.log(errs); await b.close();
})();
