// Screen-by-screen navigation check (light and shadow worlds), Zelda-style: walking onto a screen must lead somewhere.
// For every screen, the walkable ground is split into pieces (4-way, ledges one-way down, bushes count as walkable).
// Every opening onto a screen (a run of open tiles across a screen edge) lands in one piece. A piece is a DEAD END
// when that opening is its only way in or out: no other opening, no door, cave, stairs or chest, nobody to talk to.
// NARROW: an opening only one tile wide. Prints a summary and the worst screens.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  let fail = 0; const allDead = [];
  for (const shadow of [false, true]) {
    const r = await p.evaluate((shadow) => {
      LV.loop.stop(); const C = LV.C, SW = 16, SH = 14;
      const regs = Object.values(LV.MAPS).filter(d => d.world && !!d.shadow === shadow);
      const GW = Math.max(...regs.map(d => d.world[0] + d.w / SW)) * SW, GH = Math.max(...regs.map(d => d.world[1] + d.h / SH)) * SH;
      const col = new Int16Array(GW * GH).fill(-1), feat = new Uint8Array(GW * GH), owner = new Array(GW * GH);
      regs.forEach(d => { const ox = d.world[0] * SW, oy = d.world[1] * SH;
        for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { col[(oy + y) * GW + ox + x] = d.col[y * d.w + x]; owner[(oy + y) * GW + ox + x] = d.id; }
        (d.warps || []).forEach(w => { feat[(oy + w.y) * GW + ox + w.x] = 1; });
        Object.keys(d.chests || {}).forEach(k => { const [x, y] = k.split(',').map(Number); if (y + 1 < d.h) feat[(oy + y + 1) * GW + ox + x] = 1; });
        (d.spawns || []).forEach(s => { if (s.kind === 'villager' && s.x < d.w && s.y < d.h) feat[(oy + s.y) * GW + ox + s.x] = 1; });
        Object.keys(d.signs || {}).forEach(k => { const [x, y] = k.split(',').map(Number); if (y + 1 < d.h) feat[(oy + y + 1) * GW + ox + x] = 1; });
        // secrets count as something to find: a dig spot, or a cracked wall to bomb (the ground in front of it)
        Object.keys(d.digs || {}).forEach(k => { const [x, y] = k.split(',').map(Number); feat[(oy + y) * GW + ox + x] = 1; });
        for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) if (d.col[y * d.w + x] === LV.C.CRACK) for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (x + i >= 0 && y + j >= 0 && x + i < d.w && y + j < d.h) feat[(oy + y + j) * GW + ox + x + i] = 1;
      });
      const walk = c => c === C.OPEN || c === C.SHALLOW || c === C.BUSH || c === C.LEDGE || c === 26 || c === 27;
      const step = (from, to, dy) => walk(col[to]) && (col[to] !== C.LEDGE || dy > 0) && (col[from] !== C.LEDGE || dy >= 0);
      const out = { screens: 0, openings: 0, dead: [], narrow: 0, pockets: 0 };
      const piece = new Int32Array(GW * GH).fill(-1); let np = 0; const info = [];
      for (let sy = 0; sy < GH / SH; sy++) for (let sx = 0; sx < GW / SW; sx++) {
        const x0 = sx * SW, y0 = sy * SH; if (col[y0 * GW + x0] < 0 && col[(y0 + 7) * GW + x0 + 8] < 0) continue; out.screens++;
        for (let y = y0; y < y0 + SH; y++) for (let x = x0; x < x0 + SW; x++) {
          const i = y * GW + x; if (piece[i] >= 0 || !walk(col[i])) continue;
          const id = np++, q = [i]; piece[i] = id; const P = { id, sx, sy, tiles: 0, feat: 0, open: [], list: [] }; info.push(P);
          while (q.length) { const j = q.pop(), jx = j % GW, jy = (j / GW) | 0; P.tiles++; if (P.list.length < 6) P.list.push([jx, jy]); if (feat[j]) P.feat++;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = jx + dx, ny = jy + dy; if (nx < x0 || ny < y0 || nx >= x0 + SW || ny >= y0 + SH) continue; const k = ny * GW + nx;
              if (piece[k] < 0 && step(j, k, dy)) { piece[k] = id; q.push(k); } } }
        }
      }
      // openings: runs of edge tiles open on both sides, per edge between two screens
      const runs = [];
      const edge = (ax, ay, bx, by, dx, dy, n) => { let run = null;
        for (let k = 0; k <= n; k++) { const ia = (ay + k * Math.abs(dy)) * GW + ax + k * Math.abs(dx), ib = (by + k * Math.abs(dy)) * GW + bx + k * Math.abs(dx);
          const ok = k < n && walk(col[ia]) && walk(col[ib]) && (step(ia, ib, by - ay) || step(ib, ia, ay - by));
          if (ok) { if (!run) runs.push(run = { a: piece[ia], b: piece[ib], w: 0, at: [ia % GW, (ia / GW) | 0], ab: step(ia, ib, by - ay), ba: step(ib, ia, ay - by), tiles: [] }); run.w++; run.tiles.push([ia % GW, (ia / GW) | 0, ib % GW, (ib / GW) | 0]); if (piece[ia] !== run.a || piece[ib] !== run.b) { run.mixed = 1; } }
          else run = null; } };
      for (let sy = 0; sy < GH / SH; sy++) for (let sx = 0; sx < GW / SW; sx++) {
        const x0 = sx * SW, y0 = sy * SH;
        if (sx + 1 < GW / SW) edge(x0 + SW - 1, y0, x0 + SW, y0, 0, 1, SH);
        if (sy + 1 < GH / SH) edge(x0, y0 + SH - 1, x0, y0 + SH, 1, 0, SW);
      }
      runs.forEach(r => { info[r.a].open.push(r); info[r.b].open.push(r); if (r.w === 1) out.narrow++; });
      out.openings = runs.length;
      // a piece is a dead end if it has exactly one opening and nothing else to do
      // deliberate: the Tangle (Whisperwood's middle) turns you round if you leave it east, so that side is never a way in;
      // Thistledown's north road is a checkpoint that opens once you hold two Pendants
      const ALLOW = { 'whisperwood@2,1': 1, 's_whisperwood@2,1': 1, 'meadow@9,12': 1 };
      info.forEach(P => { if (P.open.length === 1 && !P.feat && !ALLOW[owner[(P.sy * SH + 3) * GW + P.sx * SW + 3] + '@' + P.sx + ',' + P.sy]) { const r = P.open[0], o = info[r.a === P.id ? r.b : r.a]; out.dead.push({ screen: P.sx + ',' + P.sy, map: owner[(P.sy * SH + 3) * GW + P.sx * SW + 3], tiles: P.tiles, at: r.at, from: o.sx + ',' + o.sy, run: r.tiles, side: r.a === P.id ? 0 : 1, list: P.tiles <= 6 ? P.list : undefined }); } });
      out.pockets = info.filter(P => P.open.length === 0 && !P.feat && P.tiles >= 4).length;
      return out;
    }, shadow);
    console.log((shadow ? 'SHADOW' : 'LIGHT') + ': ' + r.screens + ' screens, ' + r.openings + ' openings (' + r.narrow + ' one tile wide), ' + r.dead.length + ' dead-end landings, ' + r.pockets + ' sealed pockets');
    const by = {}; r.dead.forEach(d => { by[d.map] = (by[d.map] || 0) + 1; });
    console.log('  dead ends by map:', JSON.stringify(by));
    console.log('  all:', r.dead.map(d => d.map + '@' + d.screen + ' (' + d.tiles + ' tiles, from ' + d.from + ', at ' + d.at + (d.list ? ', tiles ' + JSON.stringify(d.list) : '') + ')').join('; '));
    fail += r.dead.length;
    allDead.push(...r.dead.map(d => ({ map: d.map, run: d.run, side: d.side })));
  }
  require('fs').writeFileSync('tests/screens-dead.json', JSON.stringify(allDead));
  console.log(fail ? 'screens FAIL' : 'screens OK');
  await b.close();
})();
