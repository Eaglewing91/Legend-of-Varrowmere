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
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 20, 9, 1); g.actors = []; H().hp = 12; g.shots.push(new LV.Arrow(24 * 16, 9 * 16 + 4, 3, 'enemy')); step(60, []); const front = H().hp; H().inv = 0; g.shots.push(new LV.Arrow(19 * 16 + 4, 9 * 16 + 4, 1, 'enemy')); step(60, []); return { front: front, back: H().hp }; });
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
  r = await p.evaluate(() => { const g = LV.game; place('ruins1', 7, 21, 2); g.actors = []; const b = g.world.c(7, 22), sh = g.world.c(3, 19); step(25, ['down']); const one = g.world.c(7, 23); step(40, ['down']); step(5, []); return { block: b, shutBefore: sh, oneTile: one, onPlate: g.world.c(7, 24), shutter: g.world.c(3, 19) }; });
  check('block slides a tile at a time onto the switch, shutter opens', r.block === 14 && r.shutBefore === 16 && r.oneTile === 14 && r.onPlate === 14 && r.shutter === 0, r);
  // 23. Lighting both torches opens the shutter
  r = await p.evaluate(() => { const g = LV.game; g.save.items.lantern = 1; g.save.equip = 'lantern'; place('ruins1', 18, 5, 0); g.actors = []; step(1, [], ['item']); step(15, []); const one = g.world.c(16, 7); place('ruins1', 29, 5, 0); g.actors = []; step(1, [], ['item']); step(15, []); return { one: one, both: g.world.c(16, 7) }; });
  check('two torches open shutter', r.one === 16 && r.both === 0, r);
  // 24. Big Chest needs the Big Key
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.bigkey_ruins1; delete g.save.items.bow; place('ruins1', 39, 20, 0); g.actors = []; step(1, [], ['action']); const shut = !g.save.items.bow; g.dialog = null; g.save.items.bigkey_ruins1 = 1; step(1, [], ['action']); return { shut: shut, bow: !!g.save.items.bow }; });
  check('big chest needs big key', r.shut && r.bow, r);
  // 25. Boss: beating all three Stone Sentinels gives a Life Container, then out to the Riverlands, where its gate now stands
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['ruins1:boss']; place('ruins1', 40, 10, 0); g.area = g.world.areaAt(40 * 16, 10 * 16); const before = g.save.maxHp; g.actors.filter(a => a.boss).forEach(a => g.kill(a)); step(2, []); const pk = g.pickups.find(p => p.kind === 'container'); if (!pk) return { none: g.actors.map(a => a.kind), pk: g.pickups.map(p => p.kind) }; H().x = pk.x; H().y = pk.y + 4; step(2, []); for (let i = 0; i < 5; i++) step(1, [], ['action']); step(40, []); return { hp: g.save.maxHp - before, map: g.world.id, pendant: !!g.save.items.pendant_ruins1 }; });
  check('boss gives life container and pendant, then exits', r.hp === 4 && r.pendant && r.map === 'riverlands', r);

  // 28. Villagers: talk with the action button, they block the way and can't be hurt
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.pendant_ruins1; place('meadow', 13, 10, 1); const v = g.actors.find(a => a.npc && a.look === 'elder'); v.x = 14 * 16 + 8; v.y = 10 * 16 + 14; v.roam = 0; v.goal = null;
    step(1, [], ['action']); const said = g.dialog && g.dialog.lines[0]; g.dialog = null; const hp = v.hp; step(16, [], ['attack']); const hp2 = v.hp;
    step(40, ['right']); const blocked = H().x < v.x - 6; return { said: said, hurt: hp2 < hp, blocked: blocked }; });
  check('villager talks, blocks and is unharmed', /Wren/.test(r.said) && !r.hurt && r.blocked, r);
  // 29. Villager lines change once the first Pendant is won
  r = await p.evaluate(() => { const g = LV.game; g.save.items.pendant_ruins1 = 1; const v = g.actors.find(a => a.npc && a.look === 'elder'); const l = v.lines(g)[0]; delete g.save.items.pendant_ruins1; return l; });
  check('villager lines follow the story', /Pendant of Valor/.test(r), r);
  // 30. Title: skip the opening, pick an empty file, the intro plays, the file is saved; erase needs two presses
  r = await p.evaluate(() => { const g = LV.game; const st = [0, 1, 2].map(() => LV.memoryStore()); st[1].set(Object.assign(LV.newSave(), { maxHp: 20 })); g.showTitle(st);
    step(30, []); step(1, [], ['menu']); step(45, []); step(1, [], ['menu']); const files = g.title.stage; step(1, [], ['down']); step(1, [], ['down']); step(1, [], ['menu']); const create = g.title.stage === 'create'; step(1, [], ['action']); step(40, []);
    const mode = g.mode, intro = !!(g.scene && g.world.id === 'home' && g.save.flags.night), saved = !!(st[2].get() && st[2].get().flags.intro); g.dialog = null; g.scene = null; delete g.save.flags.night;
    g.showTitle(st); step(45, []); step(1, [], ['menu']); step(1, [], ['up']); step(1, [], ['right']); step(1, [], ['menu']); const er = g.title.erase; step(1, [], ['down']); step(1, [], ['down']); step(1, [], ['menu']); const still = !!st[1].get(); step(1, [], ['menu']); const gone = !st[1].get();
    g.mode = 'play'; g.title = null; return { files, create, mode, intro, saved, er, still, gone }; });
  check('title, file select, new game and erase', r.files === 'files' && r.create && r.mode === 'play' && r.intro && r.saved && r.er && r.still && r.gone, r);
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
  // 34. The sluice lever (Riverhead) drains the Mirror Pool down the river and opens the way to the Sunken Shrine
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags.sluice; place('meadow', 43, 3, 0); step(70, ['up']); step(30, []); const there = g.world.id;
    place('mirrorlake', 13, 10, 0); const wetBefore = g.world.c(13, 9);
    place('riverhead', 9, 6, 3); step(1, [], ['action']); const pulled = !!g.save.flags.sluice; g.dialog = null;
    place('mirrorlake', 13, 10, 0); const dry = g.world.c(13, 9); step(30, ['up']); step(30, []); return { there, wetBefore, pulled, dry, shrine: g.world.id }; });
  check('sluice lever drains the pool, shrine opens', r.wetBefore === 2 && r.pulled && r.dry === 0 && r.shrine === 'shrine', r);
  // 35. Water switch: the blade toggles the level; flood tiles dry out and spill tiles fill (and back)
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['shrine:drained']; place('shrine', 43, 17, 1); g.actors = [];
    const wet = g.world.c(20, 20), spillDry = g.world.c(18, 5); step(16, [], ['attack']); const dry = g.world.c(20, 20), spillWet = g.world.c(18, 5), flag = g.drained();
    step(40, []); step(16, [], ['attack']); return { wet, spillDry, dry, spillWet, flag, back: g.world.c(20, 20) }; });
  check('water switch drains and refills', r.wet === 2 && r.spillDry === 0 && r.dry === 0 && r.spillWet === 2 && r.flag && r.back === 2, r);
  // 36. Grapple: latch onto the island chest across the pool, open it, then grapple the post back to shore
  r = await p.evaluate(() => { const g = LV.game; g.save.items.grapple = 1; g.save.equip = 'grapple'; delete g.save.opened['shrine:8,20']; place('shrine', 8, 24, 0); g.actors = [];
    step(1, [], ['item']); step(60, []); const onIsland = Math.floor(H().y / 16) === 21 && H().state === 'walk';
    step(1, [], ['action']); const got = !!g.save.opened['shrine:8,20']; g.dialog = null;
    H().dir = 2; step(1, [], ['item']); step(60, []); return { onIsland, got, back: Math.floor(H().y / 16), state: H().state }; });
  check('grapple across water to chest and post', r.onIsland && r.got && r.back === 24 && r.state === 'walk', r);
  // 37. Snapjaw: hides underwater (can't be hit), surfaces and spits; stranded when the water drains
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['shrine:drained']; place('shrine', 24, 23, 0); g.actors = []; const e = LV.ENEMIES.snapjaw(21 * 16 + 8, 20 * 16 + 12); g.actors.push(e);
    const hidden = e.hurtBox().x < -900; let n = 0; while (e.state !== 'up' && n++ < 400) step(1, []); const up = e.state === 'up'; n = 0; while (!g.shots.some(s => s.kind === 'spit') && n++ < 200) step(1, []);
    const spat = g.shots.some(s => s.kind === 'spit'); g.save.flags['shrine:drained'] = 1; g.applyWater(); step(2, []); const beached = e.state === 'beached'; delete g.save.flags['shrine:drained']; g.applyWater(); return { hidden, up, spat, beached }; });
  check('snapjaw dives, surfaces, spits, beaches', r.hidden && r.up && r.spat && r.beached, r);
  // 38. Mire Kraken: shielded by bubbles; grapple plucks one, the blade pops it; bare Kraken can be cut down
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['shrine:boss']; delete g.save.items.pendant_shrine; place('shrine', 40, 11, 0); g.actors = g.actors.filter(a => a.kind === 'kraken'); const k = g.actors[0];
    step(1, []); const nb = k.bubbles.length; k.x = 40 * 16 + 8; k.y = 7 * 16; k.inv = 0; const hp0 = k.hp;
    LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'blade', power: 2, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), k); const shielded = k.hp === hp0;
    const b = k.bubbles[0]; const plucked = b.onGrapple(g, {}); b.pull = null; b.x = H().x; b.y = H().y - 14; b.inv = 0; step(16, [], ['attack']); const popped = b.dead;
    k.bubbles.forEach(x => { x.dead = true; }); g.actors = g.actors.filter(a => !a.dead); step(2, []); const phase = k.phase;
    k.hp = 1; k.inv = 0; LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'blade', power: 2, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), k); step(2, []);
    const cont = g.pickups.find(p => p.kind === 'container'); if (cont) g.collect(cont); const line = g.dialog && g.dialog.lines[1]; g.dialog = null;
    return { nb, shielded, plucked, popped, phase, pendant: !!g.save.items.pendant_shrine, line }; });
  check('kraken: bubbles, grapple, pop, defeat, Pendant of Tides', r.nb === 6 && r.shielded && r.plucked && r.popped && r.phase === 'bound' && r.pendant && /Tides/.test(r.line), r);
  // 39. North road: barred until two Pendants, then it leads up to the highlands
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.pendant_shrine; place('meadow', 7, 4, 0); step(90, ['up']); const barred = g.world.id;
    g.save.items.pendant_shrine = 1; place('meadow', 7, 4, 0); step(90, ['up']); step(30, []); return { barred, open: g.world.id }; });
  check('north road opens with two Pendants', r.barred === 'meadow' && r.open === 'kingsmeadow', r);
  // 40. Ember Rod: a fireball lights a torch stranded in lava and the east shutter opens
  r = await p.evaluate(() => { const g = LV.game; g.save.items.rod = 1; g.save.equip = 'rod'; Object.keys(g.save.flags).filter(k => k.startsWith('forge:')).forEach(k => delete g.save.flags[k]);
    place('forge', 27, 4, 1); g.actors = []; g.world.setC(29, 11, LV.C.TORCH_LIT); step(1, [], ['item']); step(30, []); return { lit: g.world.c(29, 4), open: g.world.c(31, 7) }; });
  check('ember rod lights a far torch, shutter opens', r.lit === 11 && r.open === 0, r);
  // 41. Lava: falling in burns a whole heart and puts you back
  r = await p.evaluate(() => { const g = LV.game; place('forge', 18, 22, 0); g.actors = []; H().hp = 12; step(5, []); step(40, ['up']); step(60, []); return { hp: H().hp, state: H().state, y: Math.floor(H().y / 16) }; });
  check('lava burns a heart and respawns', r.hp === 8 && r.state === 'walk' && r.y >= 22, r);
  // 42. Cinder Wisp: the blade can't touch it while it blazes, can when it dims; fire does nothing
  r = await p.evaluate(() => { const g = LV.game; place('forge', 20, 24, 1); g.actors = []; const w = LV.ENEMIES.wisp(22 * 16, 24 * 16 + 12); g.actors.push(w);
    const hit = k => { w.inv = 0; return LV.applyHit(g, new LV.Hit({ team: 'hero', kind: k, power: 1, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), w); };
    w.t = 0; w.ph = 0; const blaze = hit('blade'); const fire = hit('fire'); w.t = 3.4; const dim = w.dim(); const cut = hit('blade'); return { blaze, fire, dim, cut, hp: w.hp }; });
  check('wisp: blade only when dim, fire immune', r.blaze === 'immune' && r.fire === 'immune' && r.dim && r.cut === 'hit', r);
  // 43. Fire bar burns the hero; hazards don't block "clear the room"
  r = await p.evaluate(() => { const g = LV.game; place('forge', 25, 23, 0); g.actors = g.actors.filter(a => a.kind === 'firebar'); H().hp = 12; H().inv = 0; const fb = g.actors[0]; fb.ang = Math.PI / 2; step(1, []); return { hp: H().hp }; });
  check('fire bar burns', r.hp < 12, r);
  // 44. Pyrewyrm: only the tail can be hurt; killing it gives the Pendant of Embers
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['forge:boss']; delete g.save.items.pendant_forge; place('forge', 40, 11, 0); g.actors = g.actors.filter(a => a.kind === 'pyrewyrm'); const w = g.actors[0];
    const tail = w.tailBox(), head = { x: w.x - 6, y: w.y - 14, w: 12, h: 12 };
    for (let i = 0; i < 60; i++) w.trail[i] = { x: 40 * 16 + 8 + i * 2, y: 8 * 16 }; w.x = 40 * 16 + 8; w.y = 8 * 16;
    const headHit = LV.overlap(w.hurtBox(), { x: w.x - 4, y: w.y - 12, w: 8, h: 8 }); w.hp = 1; w.inv = 0;
    LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'blade', power: 2, from: { x: H().x, y: H().y }, box: w.tailBox() }), w); step(2, []);
    const cont = g.pickups.find(p => p.kind === 'container'); if (cont) g.collect(cont); const line = g.dialog && g.dialog.lines[1]; g.dialog = null;
    return { headHit, dead: w.dead, pendant: !!g.save.items.pendant_forge, line }; });
  check('pyrewyrm: tail only, Pendant of Embers', !r.headHit && r.dead && r.pendant && /Embers/.test(r.line), r);
  // 45. Dawnblade: refused without three Pendants, drawn with them; doubles the blade and fires a beam at full health
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.dawnblade; ['pendant_ruins1', 'pendant_shrine', 'pendant_forge'].forEach(k => delete g.save.items[k]); g.save.items.pendant_ruins1 = 1;
    place('grove', 7, 6, 0); g.actors = []; step(1, [], ['action']); const refused = !g.save.items.dawnblade; g.dialog = null;
    g.save.items.pendant_shrine = 1; g.save.items.pendant_forge = 1; step(1, [], ['action']); const got = !!g.save.items.dawnblade; g.dialog = null;
    H().hp = H().maxHp; H().dir = 2; step(1, [], ['attack']); const beam = g.shots.some(s => s.kind === 'beam'); step(30, []);
    return { refused, got, beam, blade: H().blade }; });
  check('Dawnblade: needs three Pendants, beam at full health', r.refused && r.got && r.beam && r.blade === 2, r);
  // 46. The barrier: only the Dawnblade cuts it, and it stays cut
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags.barrier; const D = LV.MAPS.castlelawns.warps.find(w => /^castle/.test(w.to)); place('castlelawns', D.x, D.y + 2, 0); g.actors = []; const sealed = g.world.c(D.x, D.y + 1) === 23; step(16, [], ['attack']); g.dialog = null; const cut = g.world.c(D.x, D.y + 1) === 0;
    step(60, ['up']); step(30, []); return { sealed, cut, inside: g.world.id }; });
  check('barrier cut by the Dawnblade, castle opens', r.sealed && r.cut && /^castle/.test(r.inside), r);
  // 47. Vex: blade can't touch him; a returned orb wounds him; beating him rolls the ending
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags.won; place('castle', 40, 11, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); g.actors = g.actors.filter(a => a.kind === 'vex'); const v = g.actors[0];
    step(2, []); const intro = !!g.dialog; g.dialog = null; v.state = 'wait'; v.st = 0; v.x = 40 * 16 + 8; v.y = 9 * 16 + 12; H().x = v.x; H().y = v.y + 20; H().dir = 0; H().inv = 0;
    const r1 = LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'blade', power: 2, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), v);
    const o = new LV.Orb(v, H()); o.x = H().x; o.y = H().y - 40; o.aim(H().x, H().y - 8, 105); g.shots.push(o); g.rng = () => 0.9; step(1, [], ['attack']); let n = 0; while (!o.dead && n++ < 120) step(1, []); const reflected = o.volleys > 0;
    const hp = v.hp; v.hp = 1; v.inv = 0; v.state = 'wait'; const o2 = new LV.Orb(v, H()); o2.reflect(g); o2.x = v.x; o2.y = v.y - 14; g.shots.push(o2); step(2, []); g.dialog && (g.dialog = { lines: [''], i: 0, then: g.dialog.then }); step(1, [], ['action']); step(20, []);
    return { intro, immune: r1, reflected, hp, mirror: !!g.save.items.mirror, map: g.world.id }; });
  check('Vex: immune to the blade, hurt by his own orb, flees through the mirror', r.intro && r.immune === 'immune' && r.reflected && r.hp === 7 && r.mirror && r.map === 's_grove', r);
  r = await p.evaluate(() => { const g = LV.game; g.startEnding(); g.endT = 5; step(1, [], ['menu']); const m = g.mode; g.mode = 'play'; g.title = null; return m; });
  check('ending returns to the title', r === 'title', r);
  // 49. Twin Mirror: crosses to the shadow at the same spot, refuses when blocked, not indoors
  r = await p.evaluate(() => { const g = LV.game; g.save.items.mirror = 1; g.save.equip = 'mirror'; place('meadow', 8, 8, 2); g.actors = []; step(1, [], ['item']); step(20, []); const a = g.world.id, x = Math.floor(H().x / 16);
    step(1, [], ['item']); step(20, []); const back = g.world.id; place('meadow', 3, 5, 2); g.actors = []; H().y = 7 * 16 + 4; step(1, [], ['item']); step(20, []); const ok2 = g.world.id; g.dialog = null;
    place('home', 7, 10, 0); step(1, [], ['item']); const indoor = !!g.dialog; g.dialog = null; return { a, x, back, ok2, indoor }; });
  check('twin mirror crosses worlds at the same spot', r.a === 's_meadow' && r.x === 8 && r.back === 'meadow' && r.indoor, r);
  // 50. Flippers: swim in deep water; without them the water's edge stops you like a wall (no falling in, no damage)
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.fins; place('s_meadow', 36, 8, 1); g.actors = []; H().hp = 12; step(80, ['right']); step(20, []);
    const kept = H().hp === 12 && H().state === 'walk' && g.world.cAt(H().x, H().y - 3) !== LV.C.DEEP;
    g.save.items.fins = 1; place('s_meadow', 36, 8, 1); g.actors = []; step(80, ['right']); return { kept, swim: H().swimming, x: Math.floor(H().x / 16) }; });
  check('no Flippers: the water stops you; with them you swim', r.kept && r.swim && r.x >= 39, r);
  // 50b. Keys: F talks/lifts/opens, Space uses the item (as X does)
  r = await p.evaluate(() => { const i = new LV.Input(); i.key('KeyF', true); i.key('Space', true); i.beginStep(); return { f: !!i.pressed.action, sp: !!i.pressed.item }; });
  check('F is interact, Space is the item button', r.f && r.sp, r);
  // 51. Power Glove: boulders refuse bare hands, lift and throw with the glove
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.glove; place('quarry', 20, 20, 0); g.actors = []; step(1, [], ['action']); const refused = !!g.dialog && g.world.c(20, 19) === 7; g.dialog = null;
    g.save.items.glove = 1; step(1, [], ['action']); const carry = H().carry; step(1, [], ['action']); step(30, []); return { refused, carry, cleared: g.world.c(20, 19) }; });
  check('power glove lifts boulders', r.refused && r.carry === 'rock' && r.cleared === 0, r);
  // 52. Stone Colossus: blade rings off; a thrown boulder hurts for double
  r = await p.evaluate(() => { const g = LV.game; place('quarry', 40, 11, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); g.actors = g.actors.filter(a => a.kind === 'colossus'); const c = g.actors[0]; c.x = 40 * 16 + 8; c.y = 8 * 16 + 12; c.inv = 0;
    const r1 = LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'blade', power: 2, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), c);
    g.world.setC(40, 10, 7); H().x = 40 * 16 + 8; H().y = 11 * 16 + 12; H().dir = 0; step(1, [], ['action']); step(1, [], ['action']); let n = 0; while (c.hp === 12 && n++ < 40) step(1, []); return { r1, hp: c.hp }; });
  check('colossus: only boulders hurt it', r.r1 === 'immune' && r.hp === 8, r);
  // 53. River Spirit sells Flippers for 100
  r = await p.evaluate(() => { const g = LV.game; delete g.save.items.fins; g.save.cash = 120; place('s_riverhead', 10, 9, 3); const v = g.actors.find(a => a.npc); v.x = 9 * 16 + 8; v.y = 9 * 16 + 14;
    step(1, [], ['action']); let n = 0; while (g.dialog && !g.dialog.choices && n++ < 5) step(1, [], ['action']); step(1, [], ['action']); g.dialog = null; return { fins: !!g.save.items.fins, cash: g.save.cash }; });
  check('river spirit sells flippers', r.fins && r.cash === 20, r);
  // 54. Twin Maws and the Crystal of the Deep
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags['vault:boss']; place('vault', 40, 12, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); const maws = g.actors.filter(a => a.kind === 'maw'); g.actors = maws.slice();
    maws.forEach(m => { m.hp = 1; m.state = 'up'; m.inv = 0; LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'arrow', power: 2, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), m); }); step(2, []);
    const cont = g.pickups.find(p => p.kind === 'container'); if (cont) g.collect(cont); const line = g.dialog && g.dialog.lines[1]; g.dialog = null; return { n: maws.length, line, crystal: !!g.save.items.crystal_vault }; });
  check('twin maws give the Crystal of the Deep', r.n === 2 && r.crystal && /Deep/.test(r.line), r);
  // 55. Shadow Keep gate opens with both Crystals
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags.crystals; delete g.save.items.crystal_vault; delete g.save.items.crystal_quarry; const D = LV.MAPS.castlelawns.warps.find(w => /^castle/.test(w.to)); place('s_castlelawns', D.x, D.y + 2, 0); g.actors = []; const shut = g.world.c(D.x, D.y);
    ['vault', 'quarry', 'bonehollow', 'thievesden', 'frostmere', 'mirefen', 'turtleback'].forEach(k => { g.save.items['crystal_' + k] = 1; }); place('s_castlelawns', D.x, D.y + 2, 0); g.actors = []; step(60, ['up']); step(30, []); return { shut, map: g.world.id }; });
  check('Shadow Keep opens with both Crystals', r.shut === 1 && /^keep/.test(r.map), r);
  // 56. Mirror secret: the gateless pen's heart piece, reached by mirroring in from the shadow side
  r = await p.evaluate(() => { const g = LV.game; g.save.items.mirror = 1; g.save.equip = 'mirror'; delete g.save.opened['grove:13,7']; place('s_grove', 13, 8, 0); g.actors = []; step(1, [], ['item']); step(20, []);
    const inPen = g.world.id === 'grove'; step(1, [], ['action']); const got = !!g.save.opened['grove:13,7']; g.dialog = null; return { inPen, got }; });
  check('mirror secret: heart piece in the gateless pen', r.inPen && r.got, r);
  // 57. Vex's Shadow: phase one falls, the Shade rises; only Sunfire Arrows stagger it; staggered, the blade cuts; its death rolls the credits
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags.won; g.save.items.sunarrows = 1; place('keep', 40, 11, 0); g.area = g.world.areaAt(40 * 16, 8 * 16); g.actors = g.actors.filter(a => a.kind === 'vex'); const v = g.actors[0];
    step(2, []); const intro = !!g.dialog; g.dialog = null; v.hp = 1; v.inv = 0; v.state = 'wait'; v.x = 40 * 16 + 8; v.y = 8 * 16;
    const o = new LV.Orb(v, H()); o.reflect(g); o.x = v.x; o.y = v.y - 14; g.shots.push(o); step(2, []); while (g.dialog) step(1, [], ['action']); step(2, []);
    const s = g.actors.find(a => a.kind === 'shade'); if (!s) return { intro, shade: false };
    const hit = k => { s.inv = 0; return LV.applyHit(g, new LV.Hit({ team: 'hero', kind: k, power: 2, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), s); };
    const blade1 = hit('blade'); const arrow = hit('arrow'); const stag = s.stagger > 0; const hp1 = s.hp; const blade2 = hit('blade'); s.hp = 1; hit('blade'); step(2, []); while (g.dialog) step(1, [], ['action']);
    return { intro, shade: true, blade1, arrow, stag, hp1, blade2, mode: g.mode, won: !!g.save.flags.won }; });
  check("Vex's Shadow: two phases, Sunfire Arrows, true ending", r.intro && r.shade && r.blade1 === 'immune' && r.arrow === 'hit' && r.stag && r.hp1 === 6 && r.blade2 === 'hit' && r.mode === 'ending' && r.won, r);
  r = await p.evaluate(() => { const g = LV.game; g.mode = 'play'; return 1; });
  // 58. The world joins up: off the end of Thistledown's jetty and onto Marrowgate's bridge, and back
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 7, 12, 2); g.actors = []; step(50, ['down']); step(30, []); const a = g.world.id, x = Math.floor(H().x / 16);
    g.actors = []; step(10, []); step(60, ['up']); step(30, []); return { a, x, back: g.world.id }; });
  check('regions join: Thistledown jetty to Thistle Fields and back', r.a === 'thistlefields' && ['meadow', 'kingsmeadow'].includes(r.back), r);
  // 59. Lucky Lids: pay 20, two picks, prizes paid out
  r = await p.evaluate(() => { const g = LV.game; g.save.cash = 100; place('mg_chests', 7, 7, 0); step(1, [], ['action']); let n = 0; while (g.dialog && !g.dialog.choices && n++ < 5) step(1, [], ['action']);
    step(1, [], ['action']); const paid = g.save.cash === 80; n = 0; while (g.dialog && !g.dialog.choices && n++ < 5) step(1, [], ['action']); step(1, [], ['action']); n = 0; while (g.dialog && !g.dialog.choices && n++ < 5) step(1, [], ['action']); step(1, [], ['down']); step(1, [], ['action']); n = 0; while (g.dialog && n++ < 8) step(1, [], ['action']);
    return { paid, cash: g.save.cash, picks: g.chestPick && g.chestPick.opened.length }; });
  check('chest game: two picks for twenty', r.paid && r.picks === 2 && r.cash > 80, r);
  // 60. Shooting gallery: a round runs, targets can be hit, prize paid
  r = await p.evaluate(() => { const g = LV.game; g.save.items.bow = 1; g.save.cash = 50; place('mg_gallery', 12, 8, 0); g.hero.x = 12 * 16 + 8; g.hero.y = 8 * 16 + 12; g.gallery(); step(1, [], ['action']); const started = !!g.galleryRun;
    g.dialog = null; const t = g.actors.find(a => a.kind === 'target'); LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'arrow', power: 2, from: { x: 0, y: 0 }, box: { x: 0, y: 0, w: 1, h: 1 } }), t); const hits = g.galleryRun.hits;
    g.galleryRun.t = 0; step(2, []); const line = g.dialog && g.dialog.lines[0]; g.dialog = null; return { started, hits, line, cash: g.save.cash }; });
  check('shooting gallery round', r.started && r.hits === 1 && /1 hits/.test(r.line) && r.cash === 42, r);
  // 61. Shovel: buried treasure at its spot, remembered once dug
  r = await p.evaluate(() => { const g = LV.game; g.save.items.shovel = 1; g.save.equip = 'shovel'; delete g.save.opened['willowfen:dig:35,23']; g.save.dug = {}; const sh = g.save.shards;
    place('willowfen', 35, 24, 0); g.actors = []; step(1, [], ['item']); const line = g.dialog && g.dialog.lines[0]; g.dialog = null; step(20, []); step(1, [], ['item']); const again = !!g.dialog; g.dialog = null;
    return { line, got: g.save.shards === sh + 1, again }; });
  check('shovel digs up buried treasure once', /Heart Shard/.test(r.line) && r.got && !r.again, r);
  // 62. Bottles: buy one, fill it with a Red Potion, drink it to heal; a fairy revives you
  r = await p.evaluate(() => { const g = LV.game; g.save.cash = 200; g.save.bottles = []; delete g.save.flags.bellamyBottle; g.bottleShop(); g.dialog.cb(0); g.dialog = null; g.bottleShop(); g.dialog.cb(1); g.dialog = null;
    const filled = g.save.bottles[0]; H().hp = 2; g.save.equip = 'bottle'; g.useBottle(); g.dialog = null; const healed = H().hp === H().maxHp;
    g.save.bottles[0] = 'fairy'; H().hp = 0; g.heroDown(); g.dialog = null; return { filled, healed, cash: g.save.cash, revived: H().hp > 0, after: g.save.bottles[0] }; });
  check('bottles: buy, potion heals, fairy revives', r.filled === 'red' && r.healed && r.cash === 60 && r.revived && r.after === 'empty', r);
  // 63. West of Thistledown is Willowfen; Marrowgate's west lane leads to the southern fen
  r = await p.evaluate(() => { const g = LV.game; place('meadow', 0, 8, 3); g.actors = []; step(40, ['left']); step(30, []); const a = g.world.id;
    place('marrowgate', 1, 10, 3); g.actors = []; step(40, ['left']); step(30, []); return { a, b: g.world.id }; });
  check('regions join: Bracken Downs west of Thistledown, Cliffside west of Marrowgate', r.a === 'brackendowns' && r.b === 'cliffside', r);
  // 64. The Tangle: leave east and you come back where you came in; north lets you through
  r = await p.evaluate(() => { const g = LV.game; place('whisperwood', 30, 19, 1); g.actors = []; step(60, ['right']); step(40, []); g.dialog = null; const back = Math.floor(H().x / 16);
    place('whisperwood', 23, 15, 0); g.actors = []; step(40, ['up']); step(50, []); return { back, area: g.world.areas.indexOf(g.area) }; });
  check('the Tangle loops you back unless you go north', r.back === 17 && r.area === 1, r);
  // 65. Durn: rescued in the hideout he gives the Running Shoes; Brannock then tempers the blade
  r = await p.evaluate(() => { const g = LV.game; delete g.save.flags.durn; delete g.save.items.shoes; delete g.save.items.tempered; place('hideout', 24, 8, 0); g.actors = g.actors.filter(a => a.npc); const d = g.actors[0]; d.x = 24 * 16 + 8; d.y = 7 * 16 + 14;
    step(1, [], ['action']); let n = 0; while (g.dialog && n++ < 10) step(1, [], ['action']); const shoes = !!g.save.items.shoes;
    place('mg_smith', 7, 7, 0); step(1, [], ['action']); n = 0; while (g.dialog && n++ < 10) step(1, [], ['action']); const temp = !!g.save.items.tempered;
    H().dir = 2; step(1, [], ['attack']); const blade = H().blade; step(20, []); return { shoes, temp, blade }; });
  check('Durn gives the shoes, Brannock tempers the blade', r.shoes && r.temp && r.blade >= 2, r);
  // 66. Running Shoes: the dash cuts through enemies and bonks walls; bonk the library shelf for the Book
  r = await p.evaluate(() => { const g = LV.game; g.save.items.shoes = 1; delete g.save.items.book; place('meadow', 20, 9, 1); g.actors = []; const i = addLog(25, 9); const e = g.actors[i]; e.hp = 1;
    step(1, [], ['dash']); step(40, []); const killed = e.dead || !g.actors.includes(e);
    place('mg_library', 7, 8, 0); g.actors = []; step(1, [], ['dash']); step(60, []); const book = !!g.save.items.book; g.dialog = null; return { killed, book }; });
  check('dash: cuts enemies, bonk knocks the Book down', r.killed && r.book, r);
  // 67. Gear: hammer pegs, frost + shatter, medals, cloak, wand on a plate, gloves, net + fairy, wells, kazoo + bird, crypt bonk, old script
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {}; S.energy = 1;
    S.items.hammer = 1; S.equip = 'hammer'; delete S.flags['peg:frostspire:39,6']; place('frostspire', 39, 7, 0); g.actors = []; step(1, [], ['item']); out.peg = g.world.c(39, 6) === 0;
    S.items.frost = 1; S.equip = 'frost'; place('meadow', 20, 9, 1); g.actors = []; const i = addLog(23, 9), e = g.actors[i]; step(1, [], ['item']); step(30, []); out.frozen = e.frozen > 0; S.equip = 'hammer'; H().dir = 1; H().x = e.x - 16; step(1, [], ['attack']); step(5, []); out.shatter = !g.actors.includes(e);
    S.items.quake = 1; S.equip = 'quake'; S.energy = 1; place('meadow', 20, 9, 1); g.actors = []; const j = addLog(24, 6); g.actors[j].hp = 3; step(1, [], ['item']); out.medal = g.actors[j] ? g.actors[j].hp < 3 || g.actors[j].dead : true; out.cost = S.energy < 0.6;
    S.items.cloak = 1; S.equip = 'cloak'; S.energy = 1; place('meadow', 20, 9, 1); g.actors = []; H().hp = 12; step(1, [], ['item']); LV.applyHit(g, new LV.Hit({ team: 'enemy', kind: 'contact', power: 4, from: { x: 0, y: 0 } }), H()); out.cloak = H().hp === 12; step(1, [], ['item']); g.cloak = false;
    S.items.wand = 1; S.equip = 'wand'; place('ruins1', 7, 23, 2); g.actors = []; step(1, [], ['item']); out.wand = g.world.c(7, 24) === LV.C.BLOCK;
    S.items.gloves = 1; { const d = LV.MAPS.saltmarsh; const i = d.col.findIndex((c, i) => c === LV.C.DARKROCK && d.col[i + d.w] === LV.C.OPEN); place('saltmarsh', i % d.w, Math.floor(i / d.w) + 1, 0); } g.actors = []; step(1, [], ['action']); out.gloves = H().carry === 'rock'; step(1, [], ['action']); step(20, []);
    S.items.net = 1; S.bottles = ['empty']; S.equip = 'net'; place('whisperwood', 8, 22, 0); const f = g.actors.find(a => a.kind === 'fairy'); f.update = function () {}; f.x = H().x; f.y = H().y - 14; step(1, [], ['item']); g.dialog = null; out.net = S.bottles[0] === 'fairy';
    S.cash = 200; S.bombUp = 0; place('fs_mine', 10, 11, 0); const w = g.actors.find(a => a.npc); w.onTalk(g); g.dialog.cb(0); g.dialog = null; out.well = LV.capB(S) === 15 && S.cash === 100;
    S.items.kazoo = 1; S.equip = 'kazoo'; delete S.flags.bird; place('frostspire', 39, 8, 0); step(1, [], ['item']); g.dialog = null; out.bird = !!S.flags.bird; S.visited = ['marrowgate', 'meadow']; step(1, [], ['item']); const opts = g.dialog && g.dialog.choices; const cb = g.dialog.cb; g.dialog = null; cb(0); step(30, []); out.fly = g.world.id === 'marrowgate' && !!opts;
    S.items.shoes = 1; { const k = Object.keys(LV.MAPS.saltmarsh.bonk)[0], p = k.split(',').map(Number); delete S.flags['bonk:saltmarsh:' + k]; place('saltmarsh', p[0], p[1] + 2, 0); } g.actors = []; step(1, [], ['dash']); step(40, []); g.dialog = null; out.crypt = g.world.warps.some(x => x.to === 'sm_crypt');
    S.items.book = 1; { const p = Object.keys(LV.MAPS.desert.oldscript)[0].split(',').map(Number); place('desert', p[0], p[1] + 1, 0); } g.actors = []; step(1, [], ['action']); out.script = !!(g.dialog && /pillar/.test(g.dialog.lines[1] || '')); g.dialog = null;
    return out; });
  check('gear: pegs, frost, medal, cloak, wand, gloves, net, well, kazoo, crypt, old script', Object.values(r).every(Boolean), r);
  // 68. The five new Shadow bosses each fall and give their Crystal; seven Crystals open the Keep and the Arcade Vault
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {};
    [['bonehollow', 'hollowking'], ['thievesden', 'banditqueen'], ['frostmere', 'frostwyrm'], ['mirefen', 'bogmaw'], ['turtleback', 'shellback']].forEach(([d, k]) => {
      delete S.items['crystal_' + d]; delete S.flags[d + ':boss']; const fm = Object.values(LV.MAPS).find(q => q.dungeon === d && q.spawns.some(z => z.kind === k)); const sp = fm.spawns.find(q => q.kind === k); place(fm.id, sp.x, sp.y + 3, 0); g.area = g.world.areaAt(sp.x * 16, sp.y * 16);
      const b = g.actors.find(a => a.boss); if (!b) { out[d] = 'no boss'; return; }
      g.actors = [b]; step(2, []); g.dialog = null; b.hp = 1; b.inv = 0; b.immune = null; b.bubbles && b.bubbles.forEach(x => { x.dead = true; }); b.phase = 'bound'; b.state = b.state === 'fade' ? 'wait' : b.state; if (b.kind === 'brute') b.state = 'dazed';
      LV.applyHit(g, new LV.Hit({ team: 'hero', kind: b.name === 'Shellback' ? 'bomb' : 'blade', power: 4, from: { x: H().x, y: H().y }, box: b.tailBox ? b.tailBox() : b.hurtBox() }), b); step(2, []);
      const c = g.pickups.find(p => p.kind === 'container'); if (c) g.collect(c); g.dialog = null; out[d] = !!S.items['crystal_' + d];
    });
    ['vault', 'quarry'].forEach(k => { S.items['crystal_' + k] = 1; }); out.seven = LV.crystals(S) === 7;
    place('mg_chests', 3, 9, 3); const v = g.actors.find(a => a.npc && a.look === 'scholar'); v.onTalk(g); const cb = g.dialog && g.dialog.cb; g.dialog = null; if (cb) cb(0); step(30, []); out.vault = g.world.id === 'arcadevault';
    return out; });
  check('shadow bosses give Crystals; seven open the Keep and the Arcade Vault', Object.values(r).every(v => v === true), r);
  // 69. Side quests: return the plushie, win the Northreach race, go fishing
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {};
    S.items.plushie = 1; delete S.flags.plushie_back; S.cash = 0; place('marrowgate', 56, 12, 0); const gd = g.actors.find(a => a.npc && a.look === 'guard'); gd.onTalk(g); g.dialog = null; out.plushie = S.flags.plushie_back === 1 && S.cash === 150;
    delete S.flags.raceWon; const sh = S.shards; place('northreach', 9, 25, 0); const rc = g.actors.find(a => a.npc && a.look === 'guard'); rc.onTalk(g); const cb = g.dialog.cb; g.dialog = null; cb(0); g.dialog = null;
    const goal = g.world.def.race_goal; H().x = goal[0] * 16 + 8; H().y = goal[1] * 16 + 12; step(2, []); g.dialog = null; out.race = S.shards === sh + 1;
    S.cash = 100; place('southshore', 40, 7, 0); const f = g.actors.find(a => a.npc && a.look === 'fisher'); f.onTalk(g); const cb2 = g.dialog.cb; g.dialog = null; cb2(0); g.dialog = null; out.fish = S.cash !== 100;
    return out; });
  check('side quests: plushie, race, fishing', Object.values(r).every(Boolean), r);
  // 70. New monsters: every kind spawns, moves, can be hit and killed (butterflies are just scenery)
  r = await p.evaluate(() => { const g = LV.game, bad = []; place('meadow', 20, 9, 1); g.actors = [];
    Object.keys(LV.CRITTERS).forEach(k => { const e = LV.ENEMIES[k](22 * 16 + 8, 9 * 16 + 12); g.actors = [e]; step(30, []); if (k === 'butterfly') { if (!e.invuln) bad.push(k); return; } e.inv = 0; e.hp = 1; e.under = false; LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'blade', power: 2, from: { x: H().x, y: H().y }, box: { x: 0, y: 0, w: 1, h: 1 } }), e); if (!e.dead) bad.push(k); });
    return bad; });
  check('new monsters move and can be killed', r.length === 0, r);
  // 71. Every dungeon's last corridor can be crossed with its tool: Hammer, Gloves, Brick Wand, bombs, Grapple
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {};
    const go = (n, held, press) => { step(n, held, press); g.dialog = null; };
    Object.values(LV.MAPS).filter(d => d.barrier).forEach(d => {
      const [X, Y, ax, tool] = d.barrier, v = ax === 'v';
      Object.assign(S.items, { hammer: 1, gloves: 1, glove: 1, bombs: 1, grapple: 1, wand: 1, bombbag: 1, lantern: 1 }); S.bombs = 10; S.energy = 1; S.flags = {};
      const sx = v ? X + 8 : (tool === 'gap' ? X + 4 : X + 6), sy = v ? (tool === 'gap' ? Y + 10 : Y + 9) : Y + 7, fwd = v ? 'up' : 'right', back = v ? 'down' : 'left';
      place(d.id, sx, sy, v ? 0 : 1); g.actors = []; H().hp = 99;
      if (tool === 'wand') { place(d.id, X + 5, Y + 8, 0); g.actors = []; S.equip = 'wand'; go(30, [], ['item']); H().x = (X + 10) * 16 + 8; H().y = (Y + 7) * 16 + 12; go(10); out[d.id] = Object.keys(S.flags).some(k => /:open:r/.test(k)); return; }
      if (tool === 'gap') { S.equip = 'grapple'; go(80, [], ['item']); }
      else for (let k = 0; k < 2; k++) {
        if (tool === 'gate' && d.dungeon === 'bonehollow') { S.equip = 'hammer'; go(30, [], ['item']); }
        else if (tool === 'gate') { go(20, [], ['action']); go(20, [], ['action']); }
        else { S.equip = 'bombs'; go(2, [], ['item']); go(25, [back]); H().inv = 9; go(200); }
        go(16, [fwd]);
      }
      H().inv = 9; go(60, [fwd]);
      const hx = Math.floor(H().x / 16), hy = Math.floor((H().y - 3) / 16);
      out[d.id] = v ? hy < Y + 7 : hx > X + 8;
    });
    return out; });
  check('dungeon corridors: Hammer, Gloves, Brick Wand, bombs and Grapple each get you across', Object.values(r).length >= 19 && Object.values(r).every(Boolean), r);
  // 72. Quest rewards: the Sea Lantern, Biscuit's Collar and the Star Compass
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {};
    const talk = (flag, set) => { const m = Object.values(LV.MAPS).find(d => d.spawns.some(s => s.quest && s.quest.set === set)); const sp = m.spawns.find(s => s.quest && s.quest.set === set);
      delete S.flags[set]; if (flag) S.flags[flag] = 1; place(m.id, sp.x, sp.y + 1, 0); const v = g.actors.find(a => a.npc && Math.abs(a.x - (sp.x * 16 + 8)) < 20 && Math.abs(a.y - (sp.y * 16 + 14)) < 20); if (v) v.onTalk(g); g.dialog = null; };
    talk('pie', 'tradedone'); out.lantern = !!S.items.sealantern;
    talk('dogfound', 'dogdone'); out.collar = !!S.items.collar;
    talk('starchart', 'starsdone'); out.compass = !!S.items.starcompass;
    return out; });
  check('quest rewards: Sea Lantern, Biscuit\'s Collar, Star Compass', Object.values(r).every(Boolean), r);
  // 73. Every new boss and mini-boss fights (runs 4 s in its own room without errors) and falls; bosses leave a Heart Container
  r = await p.evaluate(() => { const g = LV.game, out = {};
    Object.keys(LV.BIG).filter(k => k !== 'mirrorecho').forEach(k => {
      const m = Object.values(LV.MAPS).find(d => d.spawns.some(s => s.kind === k)); if (!m) { out[k] = 'not placed'; return; }
      const sp = m.spawns.find(s => s.kind === k); place(m.id, sp.x, sp.y + 4, 0); H().hp = 99; g.save.maxHp = 99;
      g.area = g.world.areaAt(sp.x * 16, sp.y * 16); const b = g.actors.find(a => a.kind === 'bigfoe' && a.name === LV.BIG[k].name);
      if (!b) { out[k] = 'missing'; return; }
      for (let i = 0; i < 240; i++) { H().inv = 9; step(1, []); g.dialog = null; }
      g.actors = g.actors.filter(a => a === b); g.shots = []; b.hp = 1; b.inv = 0; b.under = false; b.state = 'dazed'; b.st = 0;
      LV.applyHit(g, new LV.Hit({ team: 'hero', kind: 'bomb', power: 4, from: { x: b.x, y: b.y + 20 }, box: b.hurtBox() }), b); step(2, []); g.dialog = null;
      out[k] = b.dead && (!LV.BIG[k].boss || g.pickups.some(p => p.kind === 'container'));
    });
    return out; });
  check('new bosses and mini-bosses fight and fall', Object.values(r).length === 19 && Object.values(r).every(v => v === true), r);
  // 74. The ALttP items that were missing: Ember Shield, Pepper Spray, Ninja Stars; two medals with Torn names
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {};
    const get = it => { const m = Object.values(LV.MAPS).find(d => Object.values(d.chests).some(c => c.item === it)); const k = Object.keys(m.chests).find(k => m.chests[k].item === it); const [x, y] = k.split(',').map(Number); delete S.opened[m.id + ':' + k]; delete S.items[it]; place(m.id, x, y + 1, 0); g.actors = []; step(1, [], ['action']); g.dialog = null; return !!S.items[it]; };
    out.shield = get('fireshield') && H().shield >= 2;
    out.stars = get('ninjastars') && LV.ITEMS.find(i => i.id === 'dice').name === 'Ninja Stars';
    out.pepperGot = get('pepper');
    S.energy = 1; S.equip = 'pepper'; const sl = LV.ENEMIES.slime(H().x, H().y - 30), sk = LV.ENEMIES.skull(H().x + 4, H().y - 26); g.actors = [sl, sk]; H().dir = 0; step(1, [], ['item']); step(5, []);
    out.pepper = sl.dead && g.pickups.some(p => p.kind === 'heart') && sk.stun > 2;
    out.names = LV.ITEMS.find(i => i.id === 'flame').name === 'Molotov Cocktail' && LV.ITEMS.find(i => i.id === 'storm').name === 'Flash Grenade';
    return out; });
  check('ALttP items: Ember Shield, Pepper Spray, Ninja Stars; Molotov Cocktail, Flash Grenade', Object.values(r).every(Boolean), r);
  // 75. Inside places: a shop's own stock, a cellar under a house, a Great Fairy's gift, a secret cave's way in and out
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {};
    S.cash = 500; S.items.bow = 1; S.arrows = 0; S.arrowUp = 0;
    const sm = LV.MAPS.bh_smith.spawns.find(s => s.shop); place('bh_smith', sm.x, sm.y + 2, 0); const k = g.actors.find(a => a.npc && Math.abs(a.x - (sm.x * 16 + 8)) < 4);
    k.onTalk(g); out.stock = g.dialog.choices[0].indexOf('30 Arrows') === 0; const cb = g.dialog.cb; g.dialog = null; cb(0); g.dialog = null; out.bought = S.arrows === 30 && S.cash === 425;
    const house = Object.values(LV.MAPS).find(m => m.warps.some(w => /_cellar$/.test(w.to))); const w = house.warps.find(w => /_cellar$/.test(w.to));
    place(house.id, w.x, w.y + 1, 0); g.actors = []; g.stairLock = 0; step(30, ['up']); step(30, []); out.cellar = /_cellar$/.test(g.world.id) && Object.keys(LV.MAPS[g.world.id].chests).length >= 1;
    const gf = Object.values(LV.MAPS).find(m => m.spawns.some(s => s.greatfairy === 'valour')); const sp = gf.spawns.find(s => s.greatfairy);
    delete S.items.valour; place(gf.id, sp.x, sp.y + 3, 0); const f = g.actors.find(a => a.npc && Math.abs(a.x - (sp.x * 16 + 8)) < 4); f.onTalk(g); const cb2 = g.dialog.cb; g.dialog = null; cb2(0); g.dialog = null; out.fairy = !!S.items.valour && S.cash === 125;
    const cave = LV.MAPS.grotto3; out.caveRooms = cave.areas.length >= 2 && cave.warps.some(w => w.y === cave.h - 1);
    return out; });
  check('inside places: shop stock, cellars, Great Fairy gifts, multi-room secret caves', Object.values(r).every(Boolean), r);
  // 76. Knocked out deep in a dungeon: you wake where you last came onto that floor, not at home
  r = await p.evaluate(() => { const g = LV.game, S = g.save, out = {};
    S.bottles = []; const m = LV.MAPS.bonehollow_b1, st = m.stairs[0]; place('bonehollow_b1', st[0], st[1] + 1, 2); g.actors = [];
    const cp = S.checkpoint && S.checkpoint.map; H().hp = 0; g.heroDown(); while (g.dialog) step(1, [], ['action']); step(40, []);
    out.dungeon = cp === 'bonehollow_b1' && g.world.id === 'bonehollow_b1' && H().hp > 0;
    place('meadow', 20, 9, 0); g.actors = []; H().hp = 0; g.heroDown(); while (g.dialog) step(1, [], ['action']); step(40, []);
    out.outside = g.world.id === 'home';
    return out; });
  check('knocked out in a dungeon: wake at the last way in (outside: at home)', Object.values(r).every(Boolean), r);
  // 77. Leaderboard numbers: each foe counts once (villagers never), completion reaches 100% with everything done
  r = await p.evaluate(() => { const g = LV.game, out = {}, sv = JSON.parse(JSON.stringify(g.save));
    g.save.kills = 0; const e = LV.ENEMIES.log(100, 100); g.actors.push(e); g.kill(e); g.kill(e); out.once = g.save.kills === 1;
    const s = { opened: {}, flags: {}, items: {}, bottles: ['empty'], bombs: 1 };
    out.zero = LV.completion({ opened: {}, flags: {}, items: {} }) === 0;
    Object.keys(LV.MAPS).forEach(id => { Object.keys(LV.MAPS[id].chests || {}).forEach(k => { s.opened[id + ':' + k] = 1; }); if (LV.MAPS[id].boss) s.flags[id + ':boss'] = 1; });
    LV.ITEMS.forEach(it => { s.items[it.id] = 1; }); s.items.bombbag = 1; LV.SIDEQUESTS.forEach(q => { s.flags[q[0]] = 1; });
    out.full = LV.completion(s) === 1000;
    g.save = sv; return out; });
  check('leaderboards: monsters defeated count once, completion 0 to 100%', Object.values(r).every(Boolean), r);
  // 78. Three heroes: a new file asks for a name and a tunic; files can be copied; people use your name
  r = await p.evaluate(() => { const g = LV.game, sv = g.save, out = {}; const st = [0, 1, 2].map(() => LV.memoryStore());
    st[0].set(Object.assign(LV.newSave(), { name: 'ALICE', tunic: 2 })); g.showTitle(st);
    step(45, []); step(1, [], ['menu']); step(1, [], ['down']); step(1, [], ['menu']); out.create = g.title.stage === 'create';
    const key = k => g.rawKey({ key: k }); ['b', 'o', 'b', 'x', 'Backspace'].forEach(key); step(1, [], ['right']); step(1, [], ['right']);
    out.typed = g.title.create.name === 'BOB' && g.title.create.tunic === 2;
    key('Enter'); step(40, []); out.started = g.mode === 'play' && g.save.name === 'BOB' && g.save.tunic === 2 && LV.IMG.h_walk === LV.tunicImg('h_walk', 2);
    g.say(['Hello, Wren.']); out.named = /Bob/.test(g.dialog.lines[0]); g.dialog = null;
    g.showTitle(st); step(45, []); step(1, [], ['menu']); step(1, [], ['up']); step(1, [], ['menu']);   // Copy
    step(1, [], ['down']); step(1, [], ['menu']); step(1, [], ['menu']);                                  // from file 1... to file 1 (refused)
    out.refused = !!g.title.msg && g.title.mode === 'copyTo';
    step(1, [], ['down']); step(1, [], ['down']); step(1, [], ['menu']);                                  // to file 3
    out.copied = st[2].get() && st[2].get().name === 'ALICE';
    g.mode = 'play'; g.title = null; g.save = sv; LV.applyTunic(0);
    // the pause screen draws with everything owned
    ['bow', 'lantern', 'bombbag', 'hammer', 'shovel', 'pendant_ruins1', 'crystal_vault', 'redmail', 'shield2', 'golden'].forEach(k => { g.save.items[k] = 1; }); g.save.bottles = ['red', 'fairy'];
    g.paused = true; g.menu = null; g.menuUpdate(); try { g.render(); out.pause = true; } catch (e) { out.pause = e.message; } g.paused = false; g.menu = null;
    return out; });
  check('three heroes: name and tunic per file, copy a file, your name in dialogue, pause screen', Object.values(r).every(v => v === true), r);
  console.log(results.join('\n')); console.log('errors', errs);
  await b.close();
  process.exit(results.some(x => x.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
