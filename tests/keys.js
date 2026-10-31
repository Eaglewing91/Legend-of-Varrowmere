// Small Key check for every dungeon: try every order a player could spend their keys in (every reachable locked door,
// in any order) and make sure no order leaves them stuck before the boss. Floors are followed through stairs and
// holes; shutters, gates, crystal blocks and both water levels count as passable; the Grapple crosses chasms.
const M = JSON.parse(require('fs').readFileSync(__dirname + '/../src/data/maps.json', 'utf8'));
const unrle = a => { const o = []; for (let i = 0; i < a.length; i += 2) for (let k = 0; k < a[i + 1]; k++) o.push(a[i]); return o; };
for (const d of Object.values(M)) if (d.rle) { d.col = unrle(d.col); }
const C = { OPEN: 0, SOLID: 1, DEEP: 2, PIT: 3, CRACK: 9, TORCH: 10, TORCH_LIT: 11, LOCKED: 12, BIGLOCK: 13, BLOCK: 14, PLATE: 15, SHUTTER: 16, BIGCHEST: 17, SWITCH: 19, POST: 20, PEG: 24, DARKROCK: 25, CBLUE: 26, CORANGE: 27 };
const PASS = new Set([C.DEEP, 7, C.OPEN, C.PLATE, C.SHUTTER, C.CRACK, C.PEG, C.DARKROCK, C.CBLUE, C.CORANGE]);
const TARGET = new Set([C.TORCH, C.TORCH_LIT, C.BLOCK, C.BIGCHEST, C.SWITCH, C.POST]);
const groups = {};
for (const d of Object.values(M)) if (d.dungeon && d.indoor) (groups[d.dungeon] = groups[d.dungeon] || []).push(d.id);
const out = []; let bad = 0;
for (const [dg, ids] of Object.entries(groups)) {
  const maps = Object.fromEntries(ids.map(i => [i, M[i]]));
  const start = (() => { const outside = ids.find(i => (M[i].warps || []).some(w => !maps[w.to])); const m = M[ids.includes(dg + '_1f') ? dg + '_1f' : (ids.includes('keep_1f') ? 'keep_1f' : outside || dg)]; return [m.id, m.entry[0], m.entry[1]]; })();
  // locked doors: groups of touching LOCKED tiles, one key each
  const lockOf = {}; let nl = 0;
  for (const id of ids) { const m = maps[id]; for (let i = 0; i < m.col.length; i++) if (m.col[i] === C.LOCKED && lockOf[id + ':' + i] === undefined) {
    // touching tiles, and the far half of the same doorway (up to 4 open tiles straight across): one door, one key
    const q = [i]; lockOf[id + ':' + i] = nl; while (q.length) { const j = q.pop(), x = j % m.w, y = Math.floor(j / m.w); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let n = 1; n <= 5; n++) { const X = x + a * n, Y = y + b * n; if (X < 0 || Y < 0 || X >= m.w || Y >= m.h) break; const k = Y * m.w + X; if (m.col[k] === C.LOCKED) { if (lockOf[id + ':' + k] === undefined) { lockOf[id + ':' + k] = nl; q.push(k); } break; } if (m.col[k] !== C.OPEN || n === 1 && false) break; } } nl++; } }
  const explore = (opened) => {
    const seen = new Set(), q = [start]; seen.add(start.join(':'));
    let keys = 0, big = false, boss = false; const doors = new Set();
    const add = (id, x, y) => { const k = id + ':' + x + ':' + y; if (!seen.has(k)) { seen.add(k); q.push([id, x, y]); } };
    // two passes: the Big Key, once found, opens big doors
    for (let pass = 0; pass < 3; pass++) {
      for (const s of Array.from(seen)) { const [id, x, y] = s.split(':'); q.push([id, +x, +y]); }
      while (q.length) {
        const [id, x, y] = q.pop(), m = maps[id];
        for (const w of m.warps || []) if (w.x === x && w.y === y && maps[w.to]) add(w.to, w.tx, w.ty);
        for (const dr of m.drops || []) if (x >= dr[0] && x < dr[0] + dr[2] && y >= dr[1] && y < dr[1] + dr[3]) add(dr[4], dr[5], dr[6]);
        const wet = new Set([...(m.flood || []), ...(m.spill || [])]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue;
          const i = Y * m.w + X, c = m.col[i];
          if (c === C.LOCKED) { const g = lockOf[id + ':' + i]; if (opened.has(g)) add(id, X, Y); else doors.add(g); continue; }
          if (c === C.BIGLOCK) { if (big) add(id, X, Y); continue; }
          if (PASS.has(c) || wet.has(i)) add(id, X, Y);
          for (let n = 1; n <= 6; n++) { const tx = x + dx * n, ty = y + dy * n; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) break; const cc = m.col[ty * m.w + tx];
            if (TARGET.has(cc) || m.chests[tx + ',' + ty]) { if (n > 1 && m.col[(ty - dy) * m.w + tx - dx] === C.OPEN) add(id, tx - dx, ty - dy); break; }
            if (![C.PIT, C.DEEP, C.OPEN, C.PLATE].includes(cc)) break; }
        }
      }
      keys = 0; big = false; boss = false;
      for (const id of ids) { const m = maps[id];
        for (const [k, ch] of Object.entries(m.chests || {})) { const [x, y] = k.split(',').map(Number); if (!seen.has(id + ':' + x + ':' + (y + 1))) continue; if (ch.item === 'key') keys++; if (ch.item === 'bigkey') big = true; }
        for (const s of m.spawns || []) if ((m.boss && (s.kind === 'vex' || /boss|wyrm|king|queen|maw|shell|colossus|sentinel|kraken|vex|cairnskull|thornelder|stormowl|mirrorshade|glasseye|pitboss/.test(s.kind))) && seen.has(id + ':' + s.x + ':' + s.y)) boss = true;
      }
    }
    return { keys, big, boss, doors };
  };
  // depth-first over every order of opening doors
  if (!ids.some(i => M[i].boss)) continue;
  const memo = new Set(); let stuck = null, states = 0, won = false;
  const dfs = (opened) => {
    const k = [...opened].sort((a, b) => a - b).join(','); if (memo.has(k) || stuck) return; memo.add(k); states++;
    const r = explore(opened);
    if (r.boss) { won = true; return; }
    const left = r.keys - opened.size, next = [...r.doors];
    if (left <= 0 || !next.length) { stuck = { opened: [...opened], keys: r.keys, doors: next.length }; return; }
    for (const g of next) dfs(new Set([...opened, g]));
  };
  dfs(new Set());
  const line = dg + ': ' + nl + ' locked doors, ' + states + ' orders tried' + (stuck ? ' -> STUCK ' + JSON.stringify(stuck) : won ? ' -> boss reachable in every order' : ' -> no boss found');
  if (stuck || !won) bad++;
  out.push(line);
}
console.log(out.join('\n')); console.log(bad ? bad + ' dungeons can soft-lock' : 'keys OK');
process.exit(bad ? 1 : 0);
