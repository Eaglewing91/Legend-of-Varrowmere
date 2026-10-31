// Reachability check: flood-fill every map from its entry (doors treated as openable, both water levels).
// Expected leftovers: chests only reachable with the Grapple (forge, castle) or the Twin Mirror (grove pen).
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  console.log(await p.evaluate(() => { LV.loop.stop(); const g = LV.game, out = [];
    const flagsets = [{}, { sluice: 1, 'shrine:drained': 1 }];
    Object.keys(LV.MAPS).forEach(id => {
      const res = {};
      flagsets.forEach(fs => {
        g.save.flags = Object.assign({}, fs, { barrier: 1 }); g.save.items = { pendant_shrine: 1 };
        g.enter(id, LV.MAPS[id].entry[0] * 16 + 8, LV.MAPS[id].entry[1] * 16 + 12, 0); const w = g.world, C = LV.C;
        const ok = c => [C.OPEN, C.LOCKED, C.BIGLOCK, C.SHUTTER, C.PLATE, C.SHALLOW, C.CRACK, C.BUSH, C.ROCK, C.DEEP].includes(c);
        const seen = new Set(), q = []; [LV.MAPS[id].entry].concat((w.warps || []).map(x => [x.x, x.y])).forEach(st => { const k = st.join(); if (!seen.has(k)) { seen.add(k); q.push(st.slice()); } });
        while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue; if (!ok(w.c(nx, ny))) continue; seen.add(k); q.push([nx, ny]); } }
        Object.keys(w.chests).forEach(k => { const [x, y] = k.split(',').map(Number); if (seen.has(x + ',' + (y + 1))) res['chest ' + k] = 1; else res['chest ' + k] = res['chest ' + k] || 0; });
        w.warps.forEach(wp => { const k = 'warp ' + wp.x + ',' + wp.y + '>' + wp.to; if (seen.has(wp.x + ',' + wp.y)) res[k] = 1; else res[k] = res[k] || 0; });
        w.areas.forEach((a, i) => { const k = 'room ' + i; let any = false; for (const s of seen) { const [x, y] = s.split(',').map(Number); if (x >= a[0] && x < a[0] + a[2] && y >= a[1] && y < a[1] + a[3]) { any = true; break; } } res[k] = res[k] || (any ? 1 : 0); });
      });
      const bad = Object.keys(res).filter(k => !res[k]); if (bad.length) out.push(id + ': ' + bad.join(' | '));
    });
    return out.join('\n') || 'all reachable'; }));
  await b.close(); })();
