// World check: every region that joins its neighbours edge to edge must match them. An open tile on a region's
// border must face an open tile in the neighbouring region (or be a deliberate warp), and no region may overlap another.
// Also prints a picture of the light world (each screen one character).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/build/dev.html#mute'); await p.waitForFunction(() => window.ready);
  for (const shadow of [false, true]) {
  const r = await p.evaluate((shadow) => {
    LV.loop.stop(); const out = [], C = LV.C, walk = c => [C.OPEN, C.SHALLOW, C.BUSH, C.PLATE].includes(c);
    const regs = Object.values(LV.MAPS).filter(d => d.world && !!d.shadow === shadow);
    // overlap and the picture
    const GWm = Math.max(...regs.map(d => d.world[0] + d.w / 16)), GHm = Math.max(...regs.map(d => d.world[1] + d.h / 14)); const grid = Array.from({ length: GHm }, () => Array(GWm).fill('.'));
    regs.forEach((d, i) => { for (let y = 0; y < d.h / 14; y++) for (let x = 0; x < d.w / 16; x++) { const gx = d.world[0] + x, gy = d.world[1] + y; if (grid[gy][gx] !== '.') out.push('OVERLAP ' + d.id + ' with ' + grid[gy][gx] + ' at ' + gx + ',' + gy); grid[gy][gx] = d.id[0].toUpperCase() === grid[gy][gx] ? grid[gy][gx] : d.id.slice(0, 1).toUpperCase(); } });
    // seams
    const colAt = (d, tx, ty) => d.col[ty * d.w + tx], seams = {};
    regs.forEach(d => {
      const W = d.w, H = d.h, wx = d.world[0] * 16, wy = d.world[1] * 14;
      const edges = [];
      for (let x = 0; x < W; x++) { edges.push([x, 0, 0, -1]); edges.push([x, H - 1, 0, 1]); }
      for (let y = 0; y < H; y++) { edges.push([0, y, -1, 0]); edges.push([W - 1, y, 1, 0]); }
      edges.forEach(([x, y, dx, dy]) => {
        if (!walk(colAt(d, x, y))) return;
        if ((d.warps || []).some(w => w.x === x && w.y === y)) return;
        const gx = wx + x + dx, gy = wy + y + dy;
        const n = regs.find(o => gx >= o.world[0] * 16 && gy >= o.world[1] * 14 && gx < o.world[0] * 16 + o.w && gy < o.world[1] * 14 + o.h);
        if (!n) { const k = 'DEAD END ' + d.id; seams[k] = (seams[k] || 0) + 1; return; }
        const nx = gx - n.world[0] * 16, ny = gy - n.world[1] * 14;
        if (!walk(colAt(n, nx, ny))) { const k = 'BLOCKED ' + d.id + ' -> ' + n.id; seams[k] = (seams[k] || 0) + 1; } else { const k = 'OPEN ' + d.id + ' -> ' + n.id; seams[k] = (seams[k] || 0) + 1; }
      });
    });
    Object.keys(seams).sort().forEach(k => out.push(k + ' (' + seams[k] + ' tiles)'));
    return { out, pic: grid.map(r => r.join('')).join('\n') };
  }, shadow);
  console.log(shadow ? 'SHADOW' : 'LIGHT'); console.log(r.pic); console.log(r.out.filter(l => !/^(OPEN|BLOCKED)/.test(l)).join('\n') || 'no overlaps or dead ends'); console.log(r.out.filter(l => /^OPEN/.test(l)).length + ' open seams');
  }
  await b.close();
})();
