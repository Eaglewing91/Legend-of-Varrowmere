// Side quests: every quest person (and every buried quest item) can be reached on foot with all the gear, and each
// quest plays through: the escorts, the bottle and item hand-ins, hide and seek, the Wishing Pond, the Jester, the
// thief's stash, plus the Lucky Clover and the Merchant's Seal doing their jobs.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const res = await p.evaluate(() => {
    LV.loop.stop(); const g = LV.game, C = LV.C, out = []; let fails = 0;
    const ok = (name, cond, info) => { out.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + JSON.stringify(info) : '')); if (!cond) fails++; };
    const ALL = ['lantern', 'bombbag', 'bow', 'grapple', 'rod', 'dawnblade', 'mirror', 'fins', 'glove', 'shield2', 'hammer', 'gloves', 'shovel', 'wand'];
    // 1. reachability of quest people and buried quest items
    const reach = id => {
      g.save.items = {}; ALL.forEach(k => { g.save.items[k] = 1; }); g.enter(id, 0, 0, 0); const w = g.world, it = g.save.items;
      const walk = c => [C.OPEN, C.LOCKED, C.BIGLOCK, C.SHUTTER, C.PLATE, C.SHALLOW, C.CRACK, C.BUSH].includes(c) || (c === C.DEEP && it.fins) || (c === C.ROCK && it.glove) || (c === C.PEG && it.hammer) || (c === C.DARKROCK && it.gloves) || c === 26 || c === 27;
      const st = (w.warps || []).map(x => [x.x, x.y]).concat([LV.MAPS[id].entry]);
      for (let x = 0; x < w.w; x++) for (let y = 0; y < w.h; y++) if ((x === 0 || y === 0 || x === w.w - 1 || y === w.h - 1) && walk(w.c(x, y))) st.push([x, y]);
      const seen = new Set(), q = []; st.forEach(s => { if (s && !seen.has(s.join())) { seen.add(s.join()); q.push(s); } });
      while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= w.w || ny >= w.h || !walk(w.c(nx, ny))) continue; seen.add(k); q.push([nx, ny]); } }
      return seen;
    };
    const near = (seen, x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
    Object.keys(LV.MAPS).forEach(id => {
      const qs = (LV.MAPS[id].spawns || []).filter(s => s.quest), digs = Object.entries(LV.MAPS[id].digs || {}).filter(([k, v]) => v === 'ring');
      if (!qs.length && !digs.length) return;
      const seen = reach(id);
      qs.forEach(s => ok('reach ' + s.quest.id + ' (' + id + ')', near(seen, s.x, s.y), { x: s.x, y: s.y }));
      digs.forEach(([k]) => { const [x, y] = k.split(',').map(Number); ok('reach buried ring (' + id + ')', seen.has(k), { k }); });
    });
    // helpers to run a quest: stand next to the person and talk (the dialog is skipped, the talk ends)
    const fresh = () => { g.save = LV.newSave(); g.hero = null; g.enter('meadow', 136, 140, 2, true); g.dialog = null; };
    const npc = (map, qid) => { if (g.world.id !== map) { const s = LV.MAPS[map].spawns.find(s => s.quest && s.quest.id === qid); g.enter(map, s.x * 16 + 8, s.y * 16 + 28, 0); g.dialog = null; } return g.actors.find(a => a.quest && a.quest.id === qid && !a.dead); };
    const talk = a => { if (!a) return null; g.dialog = null; const L = a.lines(g).slice(); if (a.onTalk) a.onTalk(g); const d = g.dialog; g.dialog = null; return { lines: L, then: d }; };
    const flags = () => g.save.flags;
    // 2. Pell: escort from Skyridge to Icemere; going into a dungeon sends him home
    fresh();
    let a = npc('skyridge', 'pell'); talk(a);
    ok('escort: Pell follows', !!g.save.follower && g.actors.some(x => x.follower));
    g.enter('ruins1', LV.MAPS.ruins1.entry[0] * 16 + 8, LV.MAPS.ruins1.entry[1] * 16 + 8, 0); g.dialog = null;
    ok('escort: Pell will not enter a dungeon, and goes back', !g.save.follower && !flags().pell_go && !!npc('skyridge', 'pell'));
    a = npc('skyridge', 'pell'); talk(a); const sh = g.save.shards || 0;
    const d = LV.MAPS.icemere.spawns.find(s => s.quest && s.quest.id === 'pell_home'); g.enter('icemere', d.x * 16 + 8, d.y * 16 + 28, 0); g.dialog = null;
    const r1 = talk(npc('icemere', 'pell_home'));
    ok('escort: daughter thanks you, Heart Shard, Pell gone', flags().pell_home && (g.save.shards || 0) === sh + 1 && !g.save.follower && /frozen/.test(r1.lines.join()));
    // 3. Tam: a fairy in a bottle
    fresh(); g.save.bottles = ['red'];
    talk(npc('eastvale', 'sick_tam')); ok('Tam waits for a fairy', !flags().tam_done);
    g.save.bottles = ['fairy']; talk(npc('eastvale', 'sick_tam'));
    ok('Tam: fairy used, bottle kept, Lucky Clover', flags().tam_done && g.save.bottles[0] === 'empty' && g.save.items.luckyclover);
    // 4. the Wishing Pond
    fresh(); g.save.items.bombbag = 1; g.save.cash = 250; const cb = LV.capB(g.save);
    const well = npc('mirrorlake', 'wishing_well'); talk(well); g.dialog && g.dialog.pick ? 0 : 0;
    LV.QUEST_KINDS.well(g, well, well.quest); let dlg = g.dialog; dlg && dlg.onPick ? dlg.onPick(0) : (dlg && dlg.cb ? dlg.cb(0) : 0); g.dialog = null;
    ok('Wishing Pond: 100 cash, bigger bomb bag', LV.capB(g.save) === cb + 5 && g.save.cash === 150 && flags().well_used, { cap: LV.capB(g.save), cash: g.save.cash, d: dlg && Object.keys(dlg) });
    // 5. the lumberjacks need a hammer
    fresh(); talk(npc('oakshire', 'lumber_wedge')); ok('Hollow Oak waits for a hammer', !flags().wedge_done);
    g.save.items.hammer = 1; talk(npc('oakshire', 'lumber_wedge')); ok('Hollow Oak: Heart Shard', flags().wedge_done && g.save.shards === 1);
    // 6. the ring: dig it up, hand it in, shops are cheaper
    fresh(); const [rk] = Object.entries(LV.MAPS.desert.digs).find(([k, v]) => v === 'ring'); const [rx, ry] = rk.split(',').map(Number);
    g.enter('desert', rx * 16 + 8, (ry + 1) * 16 + 10, 0); g.dialog = null; g.save.items.shovel = 1; g.hero.dir = 0; g.hero.x = rx * 16 + 8; g.hero.y = (ry + 1) * 16 + 4; g.dig(g.hero); g.dialog = null;
    ok('ring: dug up', !!g.save.items.ring);
    talk(npc('desert', 'oasis_ring')); ok("ring: Merchant's Seal, ring handed over", flags().ring_done && g.save.items.merchantseal && !g.save.items.ring);
    ok("Merchant's Seal: a quarter off", LV.price(g, 40) === 30);
    // 7. hide and seek
    fresh(); talk(npc('greenmarch', 'hide_mum')); ok('hide and seek: mum waits', !flags().hide_done);
    ['kid1', 'kid2', 'kid3'].forEach(k => { const kid = npc('greenmarch', k); talk(kid); ok('found ' + k + ' (runs home)', flags()[k] && kid.dead); });
    g.enter('greenmarch', 0, 0, 0); g.dialog = null; ok('found kids stay gone', !g.actors.some(x => x.quest && /^kid/.test(x.quest.id)));
    talk(npc('greenmarch', 'hide_mum')); ok('hide and seek: Heart Shard', flags().hide_done && g.save.shards === 1);
    // 8. the ghost wants a Red Potion
    fresh(); g.save.bottles = ['red', 'empty']; talk(npc('saltmarsh', 'ghost')); ok("Old Gruff: potion poured, Heart Shard", flags().ghost_done && g.save.bottles[0] === 'empty' && g.save.shards === 1);
    // 9. the sealed chest hops after you to the locksmith (and won't go through the mirror)
    fresh(); talk(npc('s_desert', 'sealed_chest')); ok('sealed chest follows', g.save.follower && g.save.follower.id === 'chest');
    g.enter('desert', 300, 300, 0); g.dialog = null; ok('sealed chest stays in the Shadow', !g.save.follower);
    talk(npc('s_desert', 'sealed_chest')); const nb = (g.save.bottles || []).length;
    const ls = LV.MAPS.s_greenmarch.spawns.find(s => s.quest && s.quest.id === 'locksmith'); g.enter('s_greenmarch', ls.x * 16 + 8, ls.y * 16 + 28, 0); g.dialog = null;
    talk(npc('s_greenmarch', 'locksmith')); ok('locksmith opens it: a bottle', flags().chest_open && g.save.bottles.length === nb + 1 && !g.save.follower);
    // 10. the Jester: only the right joke pays
    fresh(); const j = npc('s_oakshire', 'jester'); talk(j); let jd = g.dialog; g.dialog = null;
    LV.QUEST_KINDS.joke(g, j, j.quest); jd = g.dialog; const pick = i => { const d2 = g.dialog; g.dialog = null; if (d2 && d2.onPick) d2.onPick(i); else if (d2 && d2.cb) d2.cb(i); g.dialog = null; };
    pick(0); ok('Jester: not that joke', !flags().jester_done);
    LV.QUEST_KINDS.joke(g, j, j.quest); pick(1); ok('Jester: Vex-ed pays 300', flags().jester_done && g.save.cash === 300);
    // 11. the thief's stash, once the Den's boss is beaten
    fresh(); talk(npc('s_brookhaven', 'stash')); ok('stash waits for the Den', !flags().stash_done);
    g.save.items.crystal_thievesden = 1; talk(npc('s_brookhaven', 'stash')); ok('stash: 300 cash and a Heart Shard', flags().stash_done && g.save.cash === 300 && g.save.shards === 1);
    // 12. the count
    ok('side quests counted', LV.SIDEQUESTS.length === 15 && LV.sideDone({ flags: { pell_home: 1, ghost_done: 1 } }) === 2);
    return { out, fails };
  });
  console.log(res.out.join('\n')); console.log('errors', errs); console.log(res.fails ? res.fails + ' FAILED' : 'quests OK');
  await b.close(); process.exit(res.fails || errs.length ? 1 : 0);
})();
