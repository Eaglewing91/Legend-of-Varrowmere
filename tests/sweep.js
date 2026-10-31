// Whole-game sweep: every warp goes somewhere real and lands on open ground; every map loads, runs and draws without
// errors; nobody spawns inside walls, water or pits; frame times stay low. Prints problems only.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const t0 = Date.now();
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  const load = Date.now() - t0;
  const r = await p.evaluate(() => {
    LV.loop.stop(); const g = LV.game, C = LV.C, out = [], ok = c => [C.OPEN, C.SHALLOW, C.PLATE, C.BUSH].includes(c);
    const ids = Object.keys(LV.MAPS);
    // warps
    for (const id of ids) { const d = LV.MAPS[id];
      for (const w of d.warps || []) {
        const t = LV.MAPS[w.to]; if (!t) { out.push('warp to missing map ' + id + ' ' + w.x + ',' + w.y + ' -> ' + w.to); continue; }
        if (w.tx < 0 || w.ty < 0 || w.tx >= t.w || w.ty >= t.h) { out.push('warp lands off map ' + id + ' -> ' + w.to + ' ' + w.tx + ',' + w.ty); continue; }
        const c = t.col[w.ty * t.w + w.tx]; if (!ok(c) && !(t.warps || []).some(x => x.x === w.tx && x.y === w.ty)) out.push('warp lands on ' + c + ' ' + id + ' -> ' + w.to + ' ' + w.tx + ',' + w.ty);
      }
      if (d.exit) { const t = LV.MAPS[d.exit[0]]; if (!t) out.push('exit to missing ' + id); else { const c = t.col[d.exit[2] * t.w + d.exit[1]]; if (!ok(c)) out.push('exit lands on ' + c + ' ' + id + ' -> ' + d.exit.join()); } }
      // spawns
      for (const s of d.spawns || []) { if (s.x == null) continue; const c = d.col[s.y * d.w + s.x]; if (!ok(c) && !(s.kind === 'villager' && d.indoor && !s.roam) && !['kraken', 'bogmaw', 'firebar', 'snapjaw', 'octopus', 'fairy'].includes(s.kind)) out.push('spawn ' + s.kind + ' on ' + c + ' ' + id + ' ' + s.x + ',' + s.y); }
    }
    // every map: load, run 2 s, draw; time the frames
    let worst = 0, worstId = '';
    for (const id of ids) {
      const d = LV.MAPS[id]; try {
        g.enter(id, (d.entry || [2, 2])[0] * 16 + 8, (d.entry || [2, 2])[1] * 16 + 12, 2, true); g.dialog = null;
        for (let i = 0; i < 120; i++) { g.update(1 / 60); g.dialog = null; }
        const t = performance.now(); for (let i = 0; i < 5; i++) g.render(); const ms = (performance.now() - t) / 5; if (ms > worst) { worst = ms; worstId = id; }
      } catch (e) { out.push('crash in ' + id + ': ' + e.message); }
    }
    return { out, worst: worst.toFixed(1) + ' ms (' + worstId + ')', maps: ids.length };
  });
  console.log(r.out.join('\n') || 'no problems'); console.log('maps', r.maps, '| load', load, 'ms | slowest frame', r.worst); if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 10).join(' | '));
  await b.close();
})();
