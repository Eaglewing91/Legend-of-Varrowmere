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
    window.place = function (map, tx, ty, dir) { g.dialog = null; g.paused = false; g.fadeTo = null; g.fade = 0; g.scroll = null; g.enter(map, tx * 16 + 8, ty * 16 + 12, dir); g.hero.inv = 0; g.hero.state = 'walk'; };
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


  // 13. Bombs: blast opens the cracked wall (and hurts the hero if too close)
  r = await p.evaluate(() => { const g = LV.game; g.save.bombs = 5; g.save.items.bombbag = 1; g.save.equip = 'bombs'; place('cave1', 14, 8, 1); g.actors = []; H().hp = 12; step(1, [], ['item']); step(40, ['up']); step(100, []); return { wall: g.world.c(15, 8), bombs: g.save.bombs, hp: H().hp }; });
  check('bomb opens cracked wall, safe at distance', r.wall === 0 && r.bombs === 4 && r.hp === 12, r);
  r = await p.evaluate(() => { const g = LV.game; place('cave1', 6, 10, 1); g.actors = []; H().hp = 12; step(1, [], ['item']); step(130, []); return H().hp; });
  check('standing on a bomb hurts', r === 8, r);
  // 14. Shield: an enemy arrow from the front is blocked, from behind it hits
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 20, 9, 1); g.actors = []; H().hp = 12; g.shots.push(new LV.Arrow(24 * 16, 9 * 16 + 4, 3, 'enemy')); step(60, []); const front = H().hp; H().inv = 0; g.shots.push(new LV.Arrow(16 * 16, 9 * 16 + 4, 1, 'enemy')); step(60, []); return { front: front, back: H().hp }; });
  check('shield blocks arrows from the front only', r.front === 12 && r.back === 10, r);
  // 15. Hero arrows hurt enemies and stop at walls
  r = await p.evaluate(() => { const g = LV.game; g.save.items.bow = 1; g.save.arrows = 5; g.save.equip = 'bow'; place('meadow', 20, 9, 1); g.actors = []; const i = addLog(24, 9); const e = g.actors[i]; e.hp = 5; step(1, [], ['item']); step(60, []); return { hp: e.hp, arrows: g.save.arrows }; });
  check('arrows hit enemies', r.hp === 3 && r.arrows === 4, r);
  // 16. Ricochet Dice stun enemies and come back
  r = await p.evaluate(() => { const g = LV.game; g.save.items.dice = 1; g.save.equip = 'dice'; place('meadow', 20, 9, 1); g.actors = []; const i = addLog(23, 9); const e = g.actors[i]; step(1, [], ['item']); step(20, []); const stun = e.stun; step(80, []); return { stun: stun > 0, back: !g.shots.some(s => s.kind === 'dice') }; });
  check('dice stun and return', r.stun && r.back, r);
  // 17. Item menu: Enter opens it, arrows choose, Enter closes
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 8, 8, 2); g.save.equip = 'bow'; step(1, [], ['menu']); const open = g.paused; step(1, [], ['right']); const eq = g.save.equip; step(1, [], ['menu']); return { open: open, eq: eq, closed: !g.paused }; });
  check('item menu selects items', r.open && r.eq === 'dice' && r.closed, r);
  // 18. Soldiers spot you, chase and swing their swords
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 20, 9, 1); g.actors = []; H().hp = 12; const s = LV.ENEMIES.soldier(23 * 16 + 8, 9 * 16 + 14); s.dir = 3; g.actors.push(s); let n = 0; while (H().hp === 12 && n++ < 400) step(1, []); return { hp: H().hp, frames: n }; });
  check('soldier chases and hits', r.hp < 12 && r.frames < 300, r);
  // 19. Lantern lights torches
  r = await p.evaluate(() => { const g = LV.game; g.save.items.lantern = 1; g.save.equip = 'lantern'; place('cave1', 2, 5, 0); g.actors = []; step(1, [], ['item']); step(5, []); return g.world.c(2, 4); });
  check('lantern lights torches', r === 11, r);

  console.log(results.join('\n')); console.log('errors', errs);
  await b.close();
  process.exit(results.some(x => x.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
