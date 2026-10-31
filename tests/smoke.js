const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  await p.waitForTimeout(500); await p.screenshot({ path: 'tests/shots/smoke-1.png' });
  // walk right along the path towards the next screen, swing the blade
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1200); await p.keyboard.up('ArrowRight');
  await p.keyboard.press('z'); await p.waitForTimeout(100); await p.screenshot({ path: 'tests/shots/smoke-2.png' });
  console.log('hero', await p.evaluate(() => { const h = LV.game.hero; return [Math.round(h.x), Math.round(h.y), h.state, LV.game.area]; }), 'errors', errs);
  await b.close();
})();
