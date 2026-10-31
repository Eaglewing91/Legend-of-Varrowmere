// Mechanics tests: drive the game step by step (no real time) and check the rules.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => {
    LV.loop.stop();
    const g = LV.game;
    // step n frames holding keys; press = keys pressed on the first frame
    window.step = function (n, held, press) {
      g.input.clear(); (held || []).forEach(k => { g.input.held[k] = true; });
      for (let i = 0; i < n; i++) { if (i === 0) (press || []).forEach(k => g.input._queue.push(k)); g.update(1 / 60); }
      g.input.clear();
    };
    window.place = function (map, tx, ty, dir) { g.enter(map, tx * 16 + 8, ty * 16 + 12, dir); };
    window.addLog = function (tx, ty) { const e = LV.ENEMIES.log(tx * 16 + 8, ty * 16 + 14); e.state = 'chase'; e.speed = 0; g.actors.push(e); return g.actors.length - 1; };
    window.H = () => g.hero;
  });
  const results = [];
  const check = (name, ok, info) => { results.push((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };

  // 1. Walls: walking into the house stops at its edge and never overlaps it
  let r = await p.evaluate(() => { place('meadow', 6, 4, 3); step(60, ['left']); const h = H(); return { x: h.x, blocked: LV.game.world.boxBlocked(h.bodyBox(), 'hero') }; });
  check('walls stop the hero', r.x > 6 * 16 - 1 && !r.blocked, r);
  // 2. Corner nudge: walking up into the house's bottom-right corner slips round it
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 6, 8, 0); H().x = 6 * 16 + 2; step(40, ['up']); return { x: H().x, y: H().y }; });
  check('corner nudge slides round corners', r.x > 6 * 16 + 2 && r.y < 8 * 16 + 12, r);
  // 3. Blade only hits what is in front of the swing
  r = await p.evaluate(() => { place('meadow', 20, 9, 1); const g = LV.game; g.actors = []; const front = addLog(21, 9), back = addLog(18, 9); const a = g.actors[front], bk = g.actors[back]; step(16, [], ['attack']); return { front: a.hp, back: bk.hp }; });
  check('blade hits the enemy in front, not behind', r.front === 2 && r.back === 3, r);
  // 4. One swing hits each enemy once only
  r = await p.evaluate(() => { place('meadow', 20, 9, 1); const g = LV.game; g.actors = []; const i = addLog(21, 9); g.actors[i].inv = 0; const e = g.actors[i]; step(16, [], ['attack']); return e.hp; });
  check('a swing hits once', r === 2, r);
  // 5. Spin Attack hits all round (an enemy behind takes double damage)
  r = await p.evaluate(() => { place('meadow', 20, 9, 1); const g = LV.game; g.actors = []; const i = addLog(19, 9); const e = g.actors[i]; e.hp = 9; step(15, ['attack'], ['attack']); step(60, ['attack']); step(40, []); return { hp: e.hp, state: H().state }; });
  check('spin attack hits behind for double', r.hp === 7, r);
  // 6. Touching an enemy: half a heart, knockback, then invincible for a moment
  r = await p.evaluate(() => { place('meadow', 20, 9, 1); const g = LV.game; g.actors = []; H().hp = 12; const i = addLog(21, 9); g.actors[i].contact = 2; let n = 0; while (H().hp === 12 && n++ < 30) step(1, ['right']); const a = H().hp, inv = H().inv, kb = H().kb; step(20, ['right']); return { first: a, inv: inv > 0.5, knock: kb > 0, after: H().hp }; });
  check('contact damage, knockback, invincibility', r.first === 10 && r.inv && r.knock && r.after === 10, r);
  // 7. Pits: fall in, lose half a heart, come back where you were safe
  r = await p.evaluate(() => { place('cave1', 8, 7, 1); H().hp = 12; step(5, []); const sx = H().safe.x; step(30, ['right']); step(50, []); return { hp: H().hp, x: H().x, safe: sx, state: H().state }; });
  check('pit fall and respawn', r.hp === 10 && Math.abs(r.x - r.safe) < 20 && r.state === 'walk', r);
  // 8. Screen edge: walking east scrolls to the next screen
  r = await p.evaluate(() => { place('meadow', 15, 8, 1); step(80, ['right']); return { area: LV.game.area, x: H().x }; });
  check('screen scroll to the east meadow', r.area[0] === 16 && r.x > 16 * 16, r);
  // 9. Doors: walking into the house door goes inside
  r = await p.evaluate(() => { place('meadow', 3, 8, 0); step(40, ['up']); step(30, []); return LV.game.world.id; });
  check('house door leads inside', r === 'home', r);
  // 10. Chests open only when facing up into them, and give the item
  r = await p.evaluate(() => { place('home', 12, 5, 0); step(1, [], ['action']); step(2, []); const got = !!LV.game.save.items.lantern; LV.game.dialog = null; return got; });
  check('chest gives the Lantern', r === true, r);
  // 11. Bushes: the blade cuts them; the action button lifts and throws them
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 18, 5, 1); step(16, [], ['attack']); const cut = g.world.c(19, 5); place('meadow', 18, 6, 1); step(1, [], ['action']); const carry = H().state; step(1, [], ['action']); step(30, []); return { cut: cut, carry: carry, after: g.world.c(19, 6) }; });
  check('blade cuts bushes, lift and throw', r.cut === 0 && r.carry === 'carry' && r.after === 0, r);
  // 12. Signs are read from in front
  r = await p.evaluate(() => { place('meadow', 9, 6, 0); step(1, [], ['action']); return !!LV.game.dialog; });
  check('signs can be read', r, r);

  console.log(results.join('\n')); console.log('errors', errs);
  await b.close();
  process.exit(results.some(x => x.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
