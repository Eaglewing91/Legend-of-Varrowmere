// Progression check: walk the story in order. At each stage, with only the items and story flags the player can
// have by then, every chest in that stage's maps must be reachable from the map's entrances (on foot, swimming
// with Flippers, lifting boulders with the Glove, bombing cracks, or pulled across by the Grapple).
// Secrets that need a later item are listed as "later" so you can see them, not counted as failures.
const { chromium } = require('playwright');
const STAGES = [
  { name: 'Thistledown and the Meadow Ruins', maps: ['meadow', 'home', 'cave1', 'ruins1', 'grotto1'], items: ['lantern', 'bombbag'], flags: {} },
  { name: 'Marrowgate and Willowfen', maps: ['marrowgate', 'mg_tavern', 'mg_smith', 'mg_library', 'mg_store', 'mg_chests', 'mg_elder', 'mg_gallery', 'mg_house', 'mg_clinic', 'willowfen', 'willowfen_s', 'wf_mole', 'wf_bottles', 'grotto5', 'whisperwood', 'hideout', 'grotto6'], items: ['lantern', 'bombbag', 'bow', 'shovel'], flags: {} },
  { name: 'Riverhead and the Sunken Shrine', maps: ['riverhead', 'shrine'], items: ['lantern', 'bombbag', 'bow'], flags: { sluice: 1 } },
  { name: 'Highlands and the Ember Forge', maps: ['highlands', 'forge', 'grotto2'], items: ['lantern', 'bombbag', 'bow', 'grapple'], flags: { sluice: 1, pendant_shrine: 1 } },
  { name: 'Dawn Grove and Ashford Castle', maps: ['grove', 'castle'], items: ['lantern', 'bombbag', 'bow', 'grapple', 'rod', 'dawnblade'], flags: { sluice: 1, pendant_shrine: 1, barrier: 1 } },
  { name: 'Shadow world and the Drowned Vault', maps: ['s_meadow', 's_riverhead', 's_grove', 'vault', 'grotto3'], items: ['lantern', 'bombbag', 'bow', 'grapple', 'rod', 'dawnblade', 'mirror', 'fins'], flags: { sluice: 1, pendant_shrine: 1, barrier: 1 } },
  { name: 'Shadow Highlands and the Hollow Quarry', maps: ['s_highlands', 'quarry', 'grotto4'], items: ['lantern', 'bombbag', 'bow', 'grapple', 'rod', 'dawnblade', 'mirror', 'fins', 'glove'], flags: { sluice: 1, pendant_shrine: 1, barrier: 1 } },
  { name: 'The Shadow Keep', maps: ['keep'], items: ['lantern', 'bombbag', 'bow', 'grapple', 'rod', 'dawnblade', 'mirror', 'fins', 'glove', 'shield2'], flags: { sluice: 1, pendant_shrine: 1, barrier: 1, crystals: 1 } },
  // with everything in hand, every chest in the game (secrets included) must be reachable
  { name: 'Clean-up (all items)', all: true, items: ['lantern', 'bombbag', 'bow', 'grapple', 'rod', 'dawnblade', 'mirror', 'fins', 'glove', 'shield2', 'hammer', 'gloves', 'shovel', 'wand'], flags: { sluice: 1, pendant_shrine: 1, barrier: 1, crystals: 1 } }
];
// secrets meant for a return visit with a later item
// reached only by crossing with the Twin Mirror (checked by mech test 'mirror secret')
const MIRROR = { grove: ['13,7'] };
const LATER = { marrowgate: ['51,23'], skyridge: ['28,3'], saltmarsh: ['13,32'], frostspire: ['39,4', '41,4'], willowfen_s: ['21,20'], grove: ['13,7'], shrine: ['8,20'], s_meadow: ['1,9'], s_riverhead: ['13,11'] };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const res = await p.evaluate(([STAGES, LATER, MIRROR]) => {
    LV.loop.stop(); const g = LV.game, C = LV.C, out = []; let fails = 0;
    STAGES.forEach(st => {
      (st.all ? Object.keys(LV.MAPS) : st.maps).forEach(id => {
        const it = {}; st.items.forEach(k => { it[k] = 1; });
        const missing = new Set(Object.keys(LV.MAPS[id].chests || {}));
        // switch the water level back and forth: tiles reached at one level are where you stand at the next
        let carry = [];
        [{}, { [id + ':drained']: 1 }, {}, { [id + ':drained']: 1 }].forEach(extra => {
          g.save.flags = Object.assign({}, st.flags, extra); g.save.items = Object.assign({}, it, { pendant_shrine: st.flags.pendant_shrine });
          // revealed chests count as present
          g.enter(id, 0, 0, 0); const w = g.world;
          Object.keys(w.def.reveal || {}).forEach(k => g.openShutters(k, true));
          const walk = c => [C.OPEN, C.LOCKED, C.BIGLOCK, C.SHUTTER, C.PLATE, C.SHALLOW, C.CRACK, C.BUSH].includes(c) || (c === C.DEEP && it.fins) || (c === C.ROCK && it.glove) || (c === C.PEG && it.hammer) || (c === C.DARKROCK && it.gloves) || c === 26 || c === 27;
          // start from every warp tile (map entrances) and the entry point
          const edges = []; if (LV.MAPS[id].world) for (let x = 0; x < w.w; x++) for (let y = 0; y < w.h; y++) if ((x === 0 || y === 0 || x === w.w - 1 || y === w.h - 1) && walk(w.c(x, y))) edges.push([x, y]);
          const starts = (w.warps || []).map(x => [x.x, x.y]).concat([LV.MAPS[id].entry], edges).concat(carry.filter(t => walk(w.c(t[0], t[1]))));
          const seen = new Set(); const q = [];
          starts.forEach(s => { const k = s.join(); if (!seen.has(k)) { seen.add(k); q.push(s.slice()); } });
          let grew = true;
          while (grew) {
            grew = false;
            while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= w.w || ny >= w.h || !walk(w.c(nx, ny))) continue; seen.add(k); q.push([nx, ny]); } }
            if (!it.grapple) break;
            // the Grapple: from any reached tile, fire up to 7 tiles in a straight line over gaps to a hook target
            for (const s of Array.from(seen)) {
              const [x, y] = s.split(',').map(Number);
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let n = 1; n <= 7; n++) {
                const tx = x + dx * n, ty = y + dy * n, c = w.c(tx, ty);
                const target = [C.POST, C.BLOCK, C.TORCH, C.TORCH_LIT, C.BIGCHEST, C.SWITCH, C.LEVER].includes(c) || (w.chests[tx + ',' + ty] && c === C.SOLID);
                if (target) { const lx = tx - dx, ly = ty - dy, k = lx + ',' + ly; if (!seen.has(k) && walk(w.c(lx, ly)) || (!seen.has(k) && w.c(lx, ly) === C.OPEN)) { seen.add(k); q.push([lx, ly]); grew = true; } break; }
                if (![C.DEEP, C.PIT, C.OPEN, C.SHALLOW, C.PLATE].includes(c)) break;
              }
            }
          }
          carry = Array.from(seen).map(k => k.split(',').map(Number));
          for (const k of Array.from(missing)) { const [x, y] = k.split(',').map(Number); if (seen.has(x + ',' + (y + 1))) missing.delete(k); }
        });
        const left = Array.from(missing);
        const secretLater = left.filter(k => (st.all ? MIRROR[id] || [] : LATER[id] || []).indexOf(k) >= 0);
        const real = left.filter(k => secretLater.indexOf(k) < 0);
        if (real.length) { fails++; out.push('FAIL ' + st.name + ' / ' + id + ': ' + real.map(k => k + ' (' + LV.MAPS[id].chests[k].item + ')').join(', ')); }
        else out.push('PASS ' + st.name + ' / ' + id + (secretLater.length ? '  (later: ' + secretLater.join(', ') + ')' : ''));
      });
    });
    return { out, fails };
  }, [STAGES, LATER, MIRROR]);
  console.log(res.out.join('\n')); console.log(res.fails ? res.fails + ' FAILED' : 'progression OK');
  await b.close();
})();
