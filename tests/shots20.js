// Wren in Mana Seed: every pose, the tunics, the file screen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => { LV.loop.stop(); });
  const poses = [['walk', 'walk', true], ['idle', 'walk', false], ['attack', 'attack'], ['charge', 'charge'], ['dash', 'dash'], ['carry', 'carry', true], ['lift', 'lift'], ['item', 'item'], ['bow', 'item']];
  const out = [];
  for (const [name, st, mv] of poses) for (let d = 0; d < 4; d++) {
    const data = await p.evaluate(([st, mv, d, name]) => {
      const g = LV.game; g.dialog = null; g.paused = false; g.enter('meadow', 6 * 16 + 8, 7 * 16 + 12, d); g.actors = [];
      const h = g.hero; h.dir = d; h.state = st; h.moving = !!mv; h.anim = 1.3; h.st = st === 'attack' ? 0.13 : st === 'item' ? 0.12 : st === 'dash' ? 0.1 : 0; h.charge = 0; h.inv = 0; h.carry = st === 'carry' ? 'bush' : null;
      g.save.equip = name === 'bow' ? 'bow' : 'bombs';
      g.cam = g.camFor(g.area); g.render();
      const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.getContext('2d').drawImage(LV.canvas, (h.x - g.cam.x - 32) * 2, (h.y - g.cam.y - 48) * 2, 128, 128, 0, 0, 64, 64);
      return c.toDataURL();
    }, [st, mv, d, name]);
    out.push(data);
  }
  await p.evaluate((out) => { document.body.innerHTML = ''; const c = document.createElement('canvas'); c.width = 4 * 64; c.height = 9 * 64; c.id = 'sheet'; document.body.appendChild(c); const x = c.getContext('2d'); out.forEach((u, i) => { const im = new Image(); im.onload = () => x.drawImage(im, (i % 4) * 64, Math.floor(i / 4) * 64); im.src = u; }); }, out);
  await p.waitForTimeout(500); await (await p.$('#sheet')).screenshot({ path: 'tests/shots/wren-poses.png' });
  console.log(errs); await b.close();
})();
