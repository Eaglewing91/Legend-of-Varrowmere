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
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 21, 4, 1); step(16, [], ['attack']); const cut = g.world.c(22, 4); place('meadow', 21, 5, 1); step(1, [], ['action']); const carry = H().state; step(1, [], ['action']); step(30, []); return { cut: cut, carry: carry, after: g.world.c(22, 5) }; });
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

  // 20. Dungeon: the entrance room's shutter opens once every enemy in the room is beaten
  r = await p.evaluate(() => { const g = LV.game; place('ruins1', 23, 24, 0); const before = g.world.c(23, 16); g.actors.forEach(a => g.kill(a)); step(5, []); return { before: before, after: g.world.c(23, 16) }; });
  check('room clear opens shutter', r.before === 16 && r.after === 0, r);
  // 21. Locked doors: bump into one with a Small Key to open it (the key is used up)
  r = await p.evaluate(() => { const g = LV.game; g.save.keys.ruins1 = 1; place('ruins1', 30, 21, 1); g.actors = []; step(40, ['right']); return { door: g.world.c(31, 21), keys: g.save.keys.ruins1 }; });
  check('small key opens locked door', r.door === 0 && r.keys === 0, r);
  r = await p.evaluate(() => { const g = LV.game; g.save.keys.ruins1 = 0; delete g.save.flags['ruins1:door:31,21']; delete g.save.flags['ruins1:door:31,22']; delete g.save.flags['ruins1:door:32,21']; delete g.save.flags['ruins1:door:32,22']; place('ruins1', 30, 21, 1); g.actors = []; step(40, ['right']); return { door: g.world.c(31, 21), msg: !!g.dialog }; });
  check('no key, door stays shut and says so', r.door === 12 && r.msg, r);
  // 22. Push the block onto the switch to open the shutter
  r = await p.evaluate(() => { const g = LV.game; place('ruins1', 7, 21, 2); g.actors = []; const b = g.world.c(7, 22), sh = g.world.c(3, 17); step(25, ['down']); const one = g.world.c(7, 23); step(40, ['down']); step(5, []); return { block: b, shutBefore: sh, oneTile: one, onPlate: g.world.c(7, 24), shutter: g.world.c(3, 17) }; });
  check('block slides a tile at a time onto the switch, shutter opens', r.block === 14 && r.shutBefore === 16 && r.oneTile === 14 && r.onPlate === 14 && r.shutter === 0, r);
  // 23. Lighting both torches opens the shutter
  r = await p.evaluate(() => { const g = LV.game; g.save.items.lantern = 1; g.save.equip = 'lantern'; place('ruins1', 18, 5, 0); g.actors = []; step(1, [], ['item']); step(15, []); const one = g.world.c(16, 7); place('ruins1', 29, 5, 0); g.actors = []; step(1, [], ['item']); step(15, []); return { one: one, both: g.world.c(16, 7) }; });
  check('two torches open shutter', r.one === 16 && r.both === 0, r);
  // 24. Big Chest needs the Big Key
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.bigkey_ruins1; delete g.save.items.bow; place('ruins1', 39, 20, 0); g.actors = []; step(1, [], ['action']); const shut = !g.save.items.bow; g.dialog = null; g.save.items.bigkey_ruins1 = 1; step(1, [], ['action']); return { shut: shut, bow: !!g.save.items.bow }; });
  check('big chest needs big key', r.shut && r.bow, r);
  // 25. Boss: beating all three Stone Sentinels gives a Life Container, then out to the meadow
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['ruins1:boss']; place('ruins1', 40, 10, 0); g.area = g.world.areaAt(40 * 16, 10 * 16); const before = g.save.maxHp; g.actors.filter(a => a.boss).forEach(a => g.kill(a)); step(2, []); const pk = g.pickups.find(p => p.kind === 'container'); if (!pk) return { none: g.actors.map(a => a.kind), pk: g.pickups.map(p => p.kind) }; H().x = pk.x; H().y = pk.y + 4; step(2, []); for (let i = 0; i < 5; i++) step(1, [], ['action']); step(40, []); return { hp: g.save.maxHp - before, map: g.world.id, pendant: !!g.save.items.pendant_ruins1 }; });
  check('boss gives life container and pendant, then exits', r.hp === 4 && r.pendant && r.map === 'meadow', r);

  // 28. Villagers: talk with the action button, they block the way and can't be hurt
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.pendant_ruins1; place('meadow', 13, 10, 1); const v = g.actors.find(a => a.npc && a.look === 'elder'); v.x = 14 * 16 + 8; v.y = 10 * 16 + 14; v.roam = 0; v.goal = null;
    step(1, [], ['action']); const said = g.dialog && g.dialog.lines[0]; g.dialog = null; const hp = v.hp; step(16, [], ['attack']); const hp2 = v.hp;
    step(40, ['right']); const blocked = H().x < v.x - 6; return { said: said, hurt: hp2 < hp, blocked: blocked }; });
  check('villager talks, blocks and is unharmed', /Wren/.test(r.said) && !r.hurt && r.blocked, r);
  // 29. Villager lines change once the first Pendant is won
  r = await p.evaluate(() => { const g = LV.game; g.save.items.pendant_ruins1 = 1; const v = g.actors.find(a => a.npc && a.look === 'elder'); const l = v.lines(g)[0]; delete g.save.items.pendant_ruins1; return l; });
  check('villager lines follow the story', /Pendant of Courage/.test(r), r);
  // 30. Title: pick an empty file, the intro plays, the file is saved; erase needs two presses
  r = await p.evaluate(() => { const g = LV.game; const st = [0, 1, 2].map(() => LV.memoryStore()); st[1].set(Object.assign(LV.newSave(), { maxHp: 20 })); g.showTitle(st);
    step(30, []); step(1, [], ['menu']); const files = g.title.stage; step(1, [], ['down']); step(1, [], ['down']); step(1, [], ['menu']);
    const mode = g.mode, intro = !!(g.dialog && /Pendants/.test(g.dialog.lines[0])), saved = !!(st[2].get() && st[2].get().flags.intro); g.dialog = null;
    g.showTitle(st); step(30, []); step(1, [], ['menu']); step(1, [], ['up']); step(1, [], ['menu']); const er = g.title.erase; step(1, [], ['down']); step(1, [], ['down']); step(1, [], ['menu']); const still = !!st[1].get(); step(1, [], ['menu']); const gone = !st[1].get();
    g.mode = 'play'; g.title = null; return { files, mode, intro, saved, er, still, gone }; });
  check('title, file select, new game and erase', r.files === 'files' && r.mode === 'play' && r.intro && r.saved && r.er && r.still && r.gone, r);
  // 31. Shop: talk to the trader across the counter, buy with cash; refused when broke or not needed
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 12, 8, 0); g.actors = g.actors.filter(a => a.npc); const t = g.actors.find(a => a.look === 'trader'); t.x = 12 * 16 + 8; t.y = 6 * 16 + 14;
    g.save.cash = 60; H().hp = 4; g.save.items.bow = 1; g.save.arrows = 0;
    step(1, [], ['action']); let n = 0; while (g.dialog && !g.dialog.choices && n++ < 5) step(1, [], ['action']); const asked = !!(g.dialog && g.dialog.choices);
    step(1, [], ['action']); step(1, [], ['action']); const hp = H().hp, cash1 = g.save.cash;
    g.openShop(); step(1, [], ['down']); step(1, [], ['action']); step(1, [], ['action']); const arrows = g.save.arrows, cash2 = g.save.cash;
    g.openShop(); step(1, [], ['down']); step(1, [], ['down']); step(1, [], ['action']); const broke = g.dialog && g.dialog.lines[0]; g.dialog = null;
    return { asked, hp, cash1, arrows, cash2, broke }; });
  check('shop sells first aid and arrows, refuses when short', r.asked && r.hp === 12 && r.cash1 === 40 && r.arrows === 10 && r.cash2 === 10 && /short/.test(r.broke), r);
  // 32. Map screen opens with M, rooms are recorded as visited
  r = await p.evaluate(() => { const g = LV.game; place('ruins1', 23, 24, 0); g.save.seen = {}; step(2, []); step(1, [], ['map']); const open = g.mapOpen; g.render(); step(1, [], ['map']); return { open, closed: !g.mapOpen, seen: (g.save.seen.ruins1 || []).length }; });
  check('map screen and visited rooms', r.open && r.closed && r.seen === 1, r);
  // 33. Captain Brask: blade glances off until he charges into a wall; beating him reveals the Big Key chest
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['ruins1:open:brask']; delete g.save.opened['ruins1:7,4']; place('ruins1', 4, 9, 1);
    const b = g.actors.find(a => a.kind === 'brute'); const hidden = g.world.c(7, 4) === 0;
    b.x = 5 * 16 + 12; b.y = 9 * 16 + 12; b.inv = 0; step(16, [], ['attack']); const hp1 = b.hp;
    b.state = 'charge'; b.st = 0; b.dir = 0; let n = 0; while (b.state === 'charge' && n++ < 200) step(1, []); const dazed = b.state === 'dazed';
    b.x = 5 * 16 + 12; b.y = 9 * 16 + 12; H().x = 4 * 16 + 8; H().y = 9 * 16 + 12; H().dir = 1; b.inv = 0; b.st = 0; step(16, [], ['attack']); const hp2 = b.hp;
    b.hp = 1; b.inv = 0; b.state = 'dazed'; b.st = 0; step(16, [], ['attack']); step(5, []);
    return { hidden, hp1, dazed, hp2, dead: !g.actors.includes(b), shown: g.world.c(7, 4) === 1 }; });
  check('mini-boss: armoured until dazed, reveals the Big Key', r.hidden && r.hp1 === 12 && r.dazed && r.hp2 < 12 && r.dead && r.shown, r);
  // 34. The sluice lever drains Reedwater and opens the way to the Sunken Shrine
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags.sluice; place('meadow', 43, 3, 0); step(70, ['up']); step(30, []); const there = g.world.id;
    place('meadow', 43, 8, 0); const wetBefore = g.world.c(43, 8);
    place('riverhead', 9, 6, 3); step(1, [], ['action']); const pulled = !!g.save.flags.sluice; g.dialog = null;
    place('meadow', 43, 9, 0); const dry = g.world.c(43, 9); step(30, ['up']); step(30, []); return { there, wetBefore, pulled, dry, shrine: g.world.id }; });
  check('sluice lever drains the pool, shrine opens', r.there === 'riverhead' && r.wetBefore === 2 && r.pulled && r.dry === 0 && r.shrine === 'shrine', r);
  console.log(results.join('\n')); console.log('errors', errs);
  await b.close();
  process.exit(results.some(x => x.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
