"""Build the overworld from tools/worldplan.py: one continuous land, sliced into regions.

The hand-built areas (SETPIECES) are kept exactly as built and only moved. The old generated areas are rebuilt at their
new, bigger size; everything that lived in them (caves, houses, chests, signs, people, dig spots, exits) is carried
across to the same relative place, with the ground it stood on, and the land round it is cleared and joined to the roads.
New areas are generated from the plan. The Shadow world is the light world's mirror, with its own extras carried across.
"""
import math
import random
from worldplan import GW, GH, SW, SH, BIOME, SETPIECES, REGIONS, RIVERS, ROADS, TOWNS_BUILT, TOWN_HOUSES, HOMES, FOUNTAINS

W, H = GW * SW, GH * SH
WALK = set('.:sw-=*bhX')          # chars the hero can walk on (bushes can be cut)
GROUND = {'S': 'w', 'I': 'w', 'D': 's', 'C': 's', 'M': ':'}
THEME_GROUND = {'snow': 'w', 'icelake': 'w', 'desert': 's', 'coast': '.', 'mountain': ':', 'foothills': '.', 'fields': '.', 'lake': '.'}


class Noise:
    """Smooth value noise on a coarse random lattice (deterministic)."""
    def __init__(self, seed, cell):
        self.r, self.cell, self.cache = random.Random(seed), cell, {}

    def v(self, i, j):
        k = (i, j)
        if k not in self.cache:
            self.cache[k] = random.Random(hash((i * 7919, j * 104729, self.cell)) & 0xffffffff).random()
        return self.cache[k]

    def __call__(self, x, y):
        fx, fy = x / self.cell, y / self.cell
        i, j = math.floor(fx), math.floor(fy)
        tx, ty = fx - i, fy - j
        sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = self.v(i, j) + (self.v(i + 1, j) - self.v(i, j)) * sx
        b = self.v(i, j + 1) + (self.v(i + 1, j + 1) - self.v(i, j + 1)) * sx
        return a + (b - a) * sy


def biome_at(x, y, n1, n2):
    """The plan's biome under tile (x, y), with wavy borders between biomes."""
    jx, jy = (n1(x, y) - 0.5) * 30 + (n2(x * 3, y * 3) - 0.5) * 8, (n2(x, y) - 0.5) * 26 + (n1(x * 3 + 50, y * 3) - 0.5) * 8
    sx, sy = int(min(GW - 1, max(0, (x + jx) // SW))), int(min(GH - 1, max(0, (y + jy) // SH)))
    return BIOME[sy][sx]


def generate(reserved, anchors, openings, wet=()):
    """The whole land as a grid of map characters (see tools/maps.py paint for their meaning)."""
    R = random.Random(2026)
    n1, n2, nf, nr, nw, ns = Noise(1, 23), Noise(2, 19), Noise(3, 11), Noise(4, 9), Noise(5, 13), Noise(6, 5)
    g = [['.'] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if (x, y) in reserved:
                g[y][x] = '#'
                continue
            b = biome_at(x, y, n1, n2)
            gr = GROUND.get(b, '.')
            c = gr
            f, r, s = nf(x, y), nr(x, y), ns(x, y)
            if b == 'W':
                c = 'F' if f > 0.38 else ('T' if s > 0.86 else gr)
            elif b == 'M':
                c = 'Q' if r > 0.47 else ('r' if s > 0.88 else gr)
            elif b == 'S':
                c = 'Q' if r > 0.52 else ('T' if s > 0.86 else ('r' if s < 0.05 else gr))
            elif b == 'I':
                c = '~' if nw(x, y) * 0.6 + lake_bowl(x, y) > 0.78 else ('T' if s > 0.93 else gr)
            elif b == 'H':
                c = 'Q' if r > 0.74 else ('r' if s > 0.9 else ('T' if s < 0.05 else ('b' if 0.45 < s < 0.47 else gr)))
            elif b in 'FKT':
                c = 'F' if f > 0.62 and b == 'F' else '~' if b == 'F' and nw(x + 400, y) > 0.86 else ('T' if s > 0.94 else ('b' if s < 0.04 else ('*' if 0.5 < s < 0.52 else gr)))
            elif b == 'R':
                c = '~' if nw(x, y) > 0.62 else (':' if r > 0.72 else ('b' if s > 0.9 else gr))
            elif b == 'D':
                c = 'Q' if r > 0.78 else ('r' if s > 0.95 else gr)
            elif b == 'G':
                c = 'T' if s > 0.95 else gr
            elif b == 'L':
                c = '~'
            elif b == 'C':
                c = '~' if y >= H - 7 + int((nw(x, 0) - 0.5) * 4) else gr
            g[y][x] = c
    # single trees take a 2 x 2 spot of open ground, or don't grow at all
    for y in range(H):
        for x in range(W):
            if g[y][x] == 'T':
                if x + 1 < W and y + 1 < H and all(g[y + j][x + i] in '.:sw' for i, j in ((1, 0), (0, 1), (1, 1))):
                    g[y][x + 1] = g[y + 1][x] = g[y + 1][x + 1] = '_'
                else:
                    g[y][x] = ground_here(x, y, n1, n2)
    # graveyard rows of headstones in the graveyard screens
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.' and biome_at(x, y, n1, n2) == 'G' and x % 5 == 1 and y % 4 == 1 and ns(x, y) > 0.3:
                ok = all(0 <= x + i < W and 0 <= y + j < H and g[y + j][x + i] == '.' for i in (0, 1) for j in (0, 1))
                if ok:
                    g[y][x] = 'g'
                    g[y][x + 1] = g[y + 1][x] = g[y + 1][x + 1] = '_'
    # the world's edge: mountains along the north, east and west, the sea along the south
    for y in range(H):
        for x in range(W):
            if g[y][x] == '#':
                continue
            edge = min(x, W - 1 - x, y)
            if edge < 3 and g[y][x] not in '~':
                g[y][x] = 'Q'
    # rivers: a winding band of water
    for line in RIVERS:
        pts = [(px * SW, py * SH) for px, py in line]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            n = int(max(abs(bx - ax), abs(by - ay))) + 1
            for k in range(n + 1):
                t = k / n
                cx, cy = ax + (bx - ax) * t, ay + (by - ay) * t
                wob = (nw(cx, cy) - 0.5) * 3
                for j in range(-3, 4):
                    for i in range(-3, 4):
                        if i * i + j * j <= 4.2 + wob:
                            X, Y = int(cx + i), int(cy + j)
                            if 0 <= X < W and 0 <= Y < H and g[Y][X] not in '#':
                                g[Y][X] = '~'
    # water leaving a hand-built area (its river) runs on outward until it meets other water
    for (x, y, dx, dy) in wet:
        for k in range(40):
            X, Y = x + dx * k, y + dy * k
            if not (0 <= X < W and 0 <= Y < H) or g[Y][X] == '#':
                break
            if g[Y][X] == '~' and k > 2:
                break
            for s_ in (-1, 0, 1):
                XX, YY = X + (s_ if dy else 0), Y + (s_ if dx else 0)
                if 0 <= XX < W and 0 <= YY < H and g[YY][XX] != '#':
                    g[YY][XX] = '~'
    # lakes in lake screens get islands; clear rock out of water
    for y in range(H):
        for x in range(W):
            if g[y][x] == '~' and biome_at(x, y, n1, n2) == 'L' and nf(x, y) > 0.82:
                g[y][x] = '.'
    # carried-across places: their window keeps the old ground; clear a ring round it
    for (x0, y0, x1, y1) in anchors:
        for y in range(y0 - 2, y1 + 3):
            for x in range(x0 - 2, x1 + 3):
                if 0 <= x < W and 0 <= y < H and g[y][x] not in '#':
                    inside = x0 <= x <= x1 and y0 <= y <= y1
                    g[y][x] = 'X' if inside else (g[y][x] if g[y][x] in '.:sw-' else ground_here(x, y, n1, n2))
    # doors of the hand-built areas: a little open apron outside each
    for (x, y) in openings:
        for j in range(-1, 2):
            for i in range(-1, 2):
                X, Y = x + i, y + j
                if 0 <= X < W and 0 <= Y < H and g[Y][X] not in '#X':
                    g[Y][X] = ground_here(X, Y, n1, n2)
    # roads (A* across the land; water is bridged)
    def snap(p):                     # a road end inside a hand-built area goes to that area's nearest door instead
        x, y = int(p[0] * SW), int(p[1] * SH)
        if g[min(H - 1, y)][min(W - 1, x)] != '#':
            return (min(W - 1, x), min(H - 1, y))
        return min(openings, key=lambda o: abs(o[0] - x) + abs(o[1] - y))
    nodes = [snap(a) for a, b in ROADS] + [snap(b) for a, b in ROADS]
    for a, b in ROADS:
        road(g, snap(a), snap(b), n1, n2)
    # each doorway of a hand-built area (a run of open edge tiles) joins the nearest road at its middle
    left = set(openings)
    while left:
        p = left.pop(); run = [p]; stack = [p]
        while stack:
            x, y = stack.pop()
            for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + d[0], y + d[1])
                if q in left:
                    left.discard(q); run.append(q); stack.append(q)
        run.sort()
        mid = run[len(run) // 2]
        if len(run) < 2 or any(0 <= mid[0] + i < W and 0 <= mid[1] + j < H and g[mid[1] + j][mid[0] + i] in '-h' for i in range(-5, 6) for j in range(-5, 6)):
            continue
        far = [n for n in nodes if n not in set(openings) and abs(n[0] - mid[0]) + abs(n[1] - mid[1]) > 6]
        if not far:
            continue
        q = min(far, key=lambda n: abs(n[0] - mid[0]) + abs(n[1] - mid[1]))
        if abs(q[0] - mid[0]) + abs(q[1] - mid[1]) < 50:
            road(g, mid, q, n1, n2, width=1)
    # everything must be reachable: carve from any cut-off carried place to the land that is reached
    reach_all(g, anchors, openings, n1, n2)
    # nothing walks off the edge of the world
    for y in range(H):
        for x in range(W):
            if (x in (0, W - 1) or y in (0, H - 1)) and g[y][x] in WALK:
                g[y][x] = '~' if y == H - 1 else 'Q'
    return g


def lake_bowl(x, y):
    """How far inside Icemere's basin a tile is (0 at its rim, ~0.6 in the middle)."""
    cx, cy, rx, ry = 17.0 * SW, 5.4 * SH, 2.4 * SW, 2.0 * SH
    d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    return max(0.0, 0.62 * (1 - d))


def ground_here(x, y, n1, n2):
    return GROUND.get(biome_at(x, y, n1, n2), '.')


def road(g, a, b, n1, n2, width=2):
    import heapq
    cost = lambda c: 0.6 if c in '-h' else 1 if c in '.:sw*b' else 2 if c == 'X' else 6 if c == '~' else 4 if c in 'TrF_g' else 7 if c == 'Q' else 1e9
    sx, sy = a
    tx, ty = b
    if not (0 <= tx < W and 0 <= ty < H):
        return
    best = {a: 0}
    prev = {}
    pq = [(0, 0, a)]
    while pq:
        _f, d, (x, y) = heapq.heappop(pq)
        if (x, y) == b:
            break
        if d > best.get((x, y), 1e18):
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Y = x + dx, y + dy
            if not (0 <= X < W and 0 <= Y < H):
                continue
            c = cost(g[Y][X])
            if c >= 1e9 and (X, Y) != b:
                continue
            if c < 1e9 and any(0 <= X + i < W and 0 <= Y + j < H and g[Y + j][X + i] == '#' for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c += 3
            c += ((X * 7919 + Y * 104729) % 7) * 0.08
            nd = d + min(c, 50) + (0.4 if (prev.get((x, y)) and (x - prev[(x, y)][0], y - prev[(x, y)][1]) != (dx, dy)) else 0)
            if nd < best.get((X, Y), 1e18):
                best[(X, Y)] = nd
                prev[(X, Y)] = (x, y)
                heapq.heappush(pq, (nd + abs(X - tx) + abs(Y - ty), nd, (X, Y)))
    if b not in prev and a != b:
        return
    p = b
    path = [p]
    while p != a:
        p = prev[p]
        path.append(p)
    for (x, y) in path:
        for (i, j) in ((0, 0), (1, 0), (0, 1), (1, 1))[: 4 if width == 2 else 1]:
            X, Y = x + i, y + j
            if 0 <= X < W and 0 <= Y < H and g[Y][X] not in '#X':
                if g[Y][X] == '~':
                    g[Y][X] = 'h'
                elif g[Y][X] in '_g':
                    continue
                else:
                    gh = ground_here(X, Y, n1, n2)
                    g[Y][X] = '-' if gh in '.:' else gh


def reach_all(g, anchors, openings, n1, n2):
    from collections import deque
    start = openings[0] if openings else (W // 2, H // 2)
    seen = set([start])
    dq = deque([start])
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Y = x + dx, y + dy
            if 0 <= X < W and 0 <= Y < H and (X, Y) not in seen and g[Y][X] in WALK:
                seen.add((X, Y))
                dq.append((X, Y))
    targets = [((x0 + x1) // 2, y1 + 1) for (x0, y0, x1, y1) in anchors]
    for t in targets:
        if t in seen or not (0 <= t[0] < W and 0 <= t[1] < H):
            continue
        q = min(seen, key=lambda s: abs(s[0] - t[0]) + abs(s[1] - t[1]))
        road(g, t, q, n1, n2, width=1)
        # whatever the carve opened is now reached
        dq = deque([t]); seen.add(t)
        while dq:
            x, y = dq.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < W and 0 <= Y < H and (X, Y) not in seen and g[Y][X] in WALK:
                    seen.add((X, Y))
                    dq.append((X, Y))


def rebuild(maps, M):
    """maps: every Map built so far (old layout). Returns the new list, with the overworld rebuilt to the plan."""
    idx = {m.id: m for m in maps}
    sizes = {k: (idx[k].w // SW, idx[k].h // SH) for k in SETPIECES}
    reserved = set()
    for k, (sx, sy) in SETPIECES.items():
        w, h = sizes[k]
        for y in range(sy * SH, (sy + h) * SH):
            for x in range(sx * SW, (sx + w) * SW):
                reserved.add((x, y))
    # door cells just outside each hand-built area (the land side of every open edge tile)
    walkable = {M.OPEN, M.SHALLOW, M.BUSH, M.PLATE}
    openings = []
    for k, (sx, sy) in SETPIECES.items():
        m = idx[k]
        ox, oy = sx * SW, sy * SH
        for x in range(m.w):
            for (y, dy) in ((0, -1), (m.h - 1, 1)):
                if m.col[y * m.w + x] in walkable and not any(w['x'] == x and w['y'] == y for w in m.warps):
                    p = (ox + x, oy + y + dy)
                    if 0 <= p[1] < H and p not in reserved:
                        openings.append(p)
        for y in range(m.h):
            for (x, dx) in ((0, -1), (m.w - 1, 1)):
                if m.col[y * m.w + x] in walkable and not any(w['x'] == x and w['y'] == y for w in m.warps):
                    p = (ox + x + dx, oy + y)
                    if 0 <= p[0] < W and p not in reserved:
                        openings.append(p)
    # transforms for the old generated areas
    T = {}
    for mid, (name, rx, ry, rw, rh, *_r) in REGIONS.items():
        if mid in idx:
            m = idx[mid]
            ow, oh = m.w, m.h
            nw, nh = rw * SW, rh * SH
            T[mid] = (lambda ow, oh, nw, nh: lambda x, y: (min(nw - 1, max(0, round((x + 0.5) * nw / ow - 0.5))), min(nh - 1, max(0, round((y + 0.5) * nh / oh - 0.5)))))(ow, oh, nw, nh)
            T['s_' + mid] = T[mid]
    # windows of old ground to carry across, in world tiles
    windows = {}
    anchors = []

    def win(mid, x, y, x0, y0, x1, y1, only=None):
        name, rx, ry, *_r = REGIONS[mid.replace('s_', '', 1)]
        nx, ny = T[mid](x, y)
        a = (rx * SW + nx + x0, ry * SH + ny + y0, rx * SW + nx + x1, ry * SH + ny + y1)
        windows.setdefault(mid, []).append((x, y, x0, y0, x1, y1, only))
        anchors.append(a)

    for mid in list(T):
        if mid not in idx:
            continue
        m = idx[mid]
        for w in m.warps:
            win(mid, w['x'], w['y'], -3, -4, 3, 0)
        for k in m.chests:             # a chest keeps whatever guards it (pegs, dark rocks, water) close round it
            x, y = map(int, k.split(','))
            win(mid, x, y, -3, -3, 3, 3, only={M.PEG, M.DARKROCK, M.ROCK, M.BUSH, M.SHALLOW, M.PIT, M.CRACK, M.SOLID if False else -1})
        for k in m.signs:
            x, y = map(int, k.split(','))
            win(mid, x, y, 0, 0, 0, 0)
        for s in m.spawns:
            if s.get('kind') == 'villager':
                win(mid, s['x'], s['y'], 0, 0, 0, 0)
        for key in ('digs', 'oldscript', 'bonk'):
            for k in m.extra.get(key, {}):
                x, y = map(int, k.split(','))
                win(mid, x, y, -1 if key == 'bonk' else 0, -1 if key == 'bonk' else 0, 1 if key == 'bonk' else 0, 1 if key == 'bonk' else 0)
        if 'race_goal' in m.extra:
            x, y = m.extra['race_goal']
            win(mid, x, y, 0, 0, 0, 0)
    # room for the new places: towns (40 x 24), homes (5 x 5), fairy fountain caves (4 x 3)
    def spot(at, w, h):
        x, y = int(at[0] * SW), int(at[1] * SH)
        return (x, y, x + w - 1, y + h - 1)
    for t in TOWNS_BUILT.values():
        anchors.append(spot(t['at'], 40, 24))
    for h in HOMES:
        anchors.append(spot(h[3], 5, 5))
    for f in FOUNTAINS:
        anchors.append(spot(f[1], 4, 3))
    wet = []
    for k, (sx, sy) in SETPIECES.items():
        m = idx[k]
        ox, oy = sx * SW, sy * SH
        for x in range(m.w):
            for (y, dy) in ((0, -1), (m.h - 1, 1)):
                if m.col[y * m.w + x] == M.DEEP and m.col[(y - dy) * m.w + x] == M.DEEP:
                    wet.append((ox + x, oy + y + dy, 0, dy))
        for y in range(m.h):
            for (x, dx) in ((0, -1), (m.w - 1, 1)):
                if m.col[y * m.w + x] == M.DEEP and m.col[y * m.w + x - dx] == M.DEEP:
                    wet.append((ox + x + dx, oy + y, dx, 0))
    wet = [w for w in wet if 0 <= w[0] < W and 0 <= w[1] < H and (w[0], w[1]) not in reserved]
    # only rivers (narrow runs of edge water) flow on; a lake meeting the edge stays a lake
    ws = set(wet); keep_w = []
    for w in wet:
        dx, dy = w[2], w[3]
        run = 1
        for sgn in (1, -1):
            k = 1
            while (w[0] + (sgn * k if dy else 0), w[1] + (sgn * k if dx else 0), dx, dy) in ws:
                run += 1; k += 1
        if run <= 5:
            keep_w.append(w)
    wet = keep_w
    g = generate(reserved, anchors, openings, wet)
    n1, n2 = Noise(1, 23), Noise(2, 19)
    GG = [[('.' if (x, y) in reserved else ground_here(x, y, n1, n2)) for x in range(W)] for y in range(H)]
    # slice the land into the plan's regions
    new = []
    for mid, (name, rx, ry, rw, rh, theme, music, names) in REGIONS.items():
        rows = [''.join(g[y][rx * SW:(rx + rw) * SW]).replace('X', '.') for y in range(ry * SH, (ry + rh) * SH)]
        base = THEME_GROUND.get(theme, '.')
        grounds = [''.join(GG[y][rx * SW:(rx + rw) * SW]) for y in range(ry * SH, (ry + rh) * SH)]
        nm = M.region(mid, name, rx, ry, rw, rh, rows, music=music, base=base, grounds=grounds)
        nm.extra['names'] = (list(names) * 9)[:rw * rh]
        nm.entry = [rw * 8, rh * 7]
        if mid in idx:
            carry(idx[mid], nm, T[mid], windows.get(mid, []), M)
        else:
            wildlife(nm, theme, M, hash(mid) & 0xffff)
        new.append(nm)
    # the Shadow world: each new region darkened, with the old shadow area's own extras carried across
    shadows = []
    for nm in new:
        sm = M.shadowize(nm, 'Shadow ' + nm.name)
        sm.warps = []
        sm.spawns = []
        old = idx.get('s_' + nm.id)
        if old:
            carry(old, sm, T['s_' + nm.id], windows.get('s_' + nm.id, []), M)
            sm.extra['names'] = old.extra.get('names', sm.extra.get('names'))
            if len(sm.extra['names']) < len(sm.areas):
                sm.extra['names'] = (list(sm.extra['names']) * 9)[:len(sm.areas)]
        else:
            wildlife(sm, 'shadow', M, hash(sm.id) & 0xffff)
        shadows.append(sm)
    extra = place_features(new, shadows, M)
    # move the hand-built areas (and their shadows)
    for k, (sx, sy) in SETPIECES.items():
        for mid in (k, 's_' + k):
            if mid in idx:
                idx[mid].extra['world'] = [sx, sy]
    # old links between neighbouring areas (warps on an area's edge into another overworld area) give way to open seams
    world_ids = {m.id for m in maps if 'world' in m.extra} | {m.id for m in new + shadows}
    for m in [m for m in maps if 'world' in m.extra] + new + shadows:
        edge = lambda w: w['to'] in world_ids and (w['x'] in (0, m.w - 1) or w['y'] in (0, m.h - 1))
        m.warps = [w for w in m.warps if not edge(w)]
        for v in m.extra.get('variants', []):
            v['warps'] = [w for w in v.get('warps', []) if not edge(w)]
    # every reference into a rebuilt area moves with it
    def fix(mid, x, y):
        name, rx, ry, *_r = REGIONS[mid.replace('s_', '', 1)]
        return T[mid](x, y)
    keep = [m for m in maps if m.id not in T]
    for m in keep + new + shadows:
        for w in m.warps:
            if w['to'] in T:
                w['tx'], w['ty'] = fix(w['to'], w['tx'], w['ty'])
        ex = m.extra.get('exit')
        if ex and ex[0] in T:
            ex[1], ex[2] = fix(ex[0], ex[1], ex[2])
    for m in M.GROTTOS:
        for w in m.warps:
            if w['to'] in T:
                w['tx'], w['ty'] = fix(w['to'], w['tx'], w['ty'])
    return keep + new + shadows + extra


def local(maps, mid, at):
    m = next(x for x in maps if x.id == mid)
    rx, ry = m.extra['world']
    return m, int(at[0] * SW) - rx * SW, int(at[1] * SH) - ry * SH


def build_house(M, m, x, y, hid, name, kind, look, lines, extra=None):
    M.house(m, x, y, (hid, 7, 12, 0))
    npc = dict(look=look, roam=0, dir=2, talk=[[None, lines]])
    if extra == 'bottles':
        npc['bottles'] = True
    return M.interior(hid, name, (m.id, x + 2, y + 5), kind, npcs=[(7, 6, npc)], chests=[(5, 4, 'bottle')] if extra == 'bottle' else ())


def fountain_cave(M, m, x, y, fid):
    m.stamp(M.OW, 10, 31, x, y, 4, 3, col=M.SOLID)
    m.warp(x + 1, y + 2, fid, 7, 12, 0)
    m.warp(x + 2, y + 2, fid, 8, 12, 0)
    f = M.Map(fid, 16, 14, 'Fairy Fountain', indoor=True, music='home')
    f.fill(M.NI, 12, 13, 0, 0, 15, 13)
    f.solid(0, 0, 16, 2); f.solid(0, 0, 1, 14); f.solid(15, 0, 1, 14); f.solid(0, 13, 16, 1)
    for xx in range(16):
        for yy in (0, 1):
            f.put('ground', M.NR, 4 + (xx % 3), yy, xx, yy)
    for yy in range(14):
        for xx in (0, 15):
            f.put('ground', M.NR, 4, 1, xx, yy)
    for xx in range(16):
        f.put('ground', M.NR, 5, 2, xx, 13)
    for xx in range(4, 12):                 # the pool, with soft foamy banks
        for yy in range(4, 9):
            nb = lambda a, b: 4 <= a < 12 and 4 <= b < 9
            import blend as B
            k = B.mask(nb, xx, yy)
            f.put('ground', M.BL, k & 15, 7 * 16 + (k >> 4), xx, yy) if k != 255 else f.put('ground', M.NW, 1, 7, xx, yy)
            f.col[yy * 16 + xx] = M.DEEP
    for xx in (7, 8):
        f.warp(xx, 13, m.id, x + xx - 6, y + 3, 2)
        f.col[13 * 16 + xx] = M.OPEN
        f.put('ground', M.NI, 12, 13, xx, 13)
    for (a, b) in ((5, 3), (10, 3), (4, 9), (11, 9)):
        f.spawn('fairy', a, b)
    f.spawn('villager', 8, 10, look='baker', who='Princess', roam=0, dir=2, heal=True,
            talk=[[None, ['Welcome to my spring. Rest, and be whole again.', 'Catch a fairy in a bottle and it will save you when you fall. Fairies hate this. Do it anyway.']]])
    f.entry = [7, 12]
    return f


def place_features(new, shadows, M):
    """Towns, homes and fairy fountains go in after the land is sliced (their ground was cleared by the generator)."""
    out = []
    every = new + shadows
    for tname, t in TOWNS_BUILT.items():
        m, tx, ty = local(new, t['region'], t['at'])
        for yy in range(24):
            for xx in range(40):
                X, Y = tx + xx, ty + yy
                if not m.ok(X, Y):
                    continue
                road = yy in (7, 8, 20, 21) or xx in (19, 20)
                if road:
                    m.put('ground', M.NF, *((12, 8) if t['ground'] == '.' else (1, 4)), X, Y)
                m.col[Y * m.w + X] = M.OPEN
                m.layers['deco'][Y * m.w + X] = -1
                m.layers['over'][Y * m.w + X] = -1
        M.fountain(m, tx + 23, ty + 11)
        M.stall(m, tx + 8, ty + 9)
        for (hx, hy), h in zip(TOWN_HOUSES, t['houses']):
            out.append(build_house(M, m, tx + hx, ty + hy, h[0], h[1], h[2], h[3], h[4], h[5] if len(h) > 5 else None))
        M.signboard(m, tx + 18, ty + 9, tname.upper() + '|' + ('A town on the brook. Mind the goose.' if tname == 'Brookhaven' else 'Last water before the dunes.'))
        looks = ['farmer', 'baker', 'trader', 'fisher', 'elder', 'guard']
        for k, (vx, vy) in enumerate(((13, 11), (28, 10), (5, 12), (34, 13), (17, 18))):
            m.spawn('villager', tx + vx, ty + vy, look=looks[k % len(looks)], roam=12, talk=[[None, [
                ['Welcome to ' + tname + '. We have a fountain. It is very wet.', 'Have you seen the castle? Ask before you visit. Vex does not like visitors.', 'My cousin went abroad with a suitcase of flowers. Came back rich and smelling of daisies.', 'They say there are fairies in caves all over the land. Fairies in caves! Whatever next.', 'I would tell you a secret, but my energy is too low. Come back in five minutes.'][k]]]])
    for (hid, name, reg, at, kind, look, lines) in HOMES:
        m, x, y = local(new, reg, at)
        out.append(build_house(M, m, x, y, hid, name, kind, look, lines, 'bottles' if hid == 'wf_witch' else None))
    for i, (reg, at, shadow) in enumerate(FOUNTAINS):
        m, x, y = local(every, reg, at)
        out.append(fountain_cave(M, m, x, y, 'fairy%d' % (i + 1)))
    return out


def carry(old, nm, t, wins, M):
    """Copy an old area's things (and the ground each one stood on) into its rebuilt, bigger self."""
    for (x, y, x0, y0, x1, y1, only) in wins:
        nx, ny = t(x, y)
        for j in range(y0, y1 + 1):
            for i in range(x0, x1 + 1):
                ox_, oy_, X, Y = x + i, y + j, nx + i, ny + j
                if not (old.ok(ox_, oy_) and nm.ok(X, Y)):
                    continue
                o, n = oy_ * old.w + ox_, Y * nm.w + X
                if only is not None and (i, j) != (0, 0) and old.col[o] not in only:
                    continue
                for L in ('ground', 'deco', 'over'):
                    if old.layers[L][o] >= 0 or L != 'ground':
                        nm.layers[L][n] = old.layers[L][o]
                nm.col[n] = old.col[o]
    for w in old.warps:
        nx, ny = t(w['x'], w['y'])
        nm.warps.append(dict(w, x=nx, y=ny))
    nm.chests = {'%d,%d' % t(*map(int, k.split(','))): v for k, v in old.chests.items()}
    nm.signs = {'%d,%d' % t(*map(int, k.split(','))): v for k, v in old.signs.items()}
    for s in old.spawns:
        nx, ny = t(s['x'], s['y'])
        if nm.col[ny * nm.w + nx] != M.OPEN and s.get('kind') != 'villager':
            continue
        nm.spawns.append(dict(s, x=nx, y=ny))
    for key in ('digs', 'oldscript', 'bonk'):
        if key in old.extra:
            nm.extra[key] = {'%d,%d' % t(*map(int, k.split(','))): v for k, v in old.extra[key].items()}
    if 'race_goal' in old.extra:
        nm.extra['race_goal'] = list(t(*old.extra['race_goal']))
    for k, v in old.extra.items():
        if k not in nm.extra and k not in ('world', 'names', 'variants'):
            nm.extra[k] = v


POOLS = {'snow': ['skullblue', 'owl', 'slime3'], 'icelake': ['octopus', 'slime3', 'bluebat'], 'fields': ['slime', 'mushroom', 'snake'],
         'foothills': ['lizard', 'mole', 'owl'], 'mountain': ['skull', 'owl', 'cyclope'], 'lake': ['octopus', 'slime3', 'bluebat'],
         'desert': ['snake', 'spiderred', 'skull', 'lizard'], 'coast': ['octopus', 'larva', 'mouse'],
         'shadow': ['skullblue', 'cyclope', 'beast', 'eye', 'bluebat', 'reptile2']}


def wildlife(m, theme, M, seed):
    rr = random.Random(seed)
    pool = POOLS.get(theme, POOLS['fields'])
    for a in m.areas:
        spots = [(x, y) for y in range(a[1] + 3, a[1] + a[3] - 3) for x in range(a[0] + 3, a[0] + a[2] - 3) if m.col[y * m.w + x] == M.OPEN]
        rr.shuffle(spots)
        for k, (x, y) in enumerate(spots[:3]):
            m.spawn(rr.choice(pool) if k < 2 else ('butterfly' if theme in ('fields', 'coast', 'foothills', 'lake') else rr.choice(pool)), x, y)
