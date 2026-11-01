"""Build the overworld from tools/worldplan.py: one continuous land, sliced into regions.

The hand-built areas (SETPIECES) are kept exactly as built and only moved. The old generated areas are rebuilt at their
new, bigger size; everything that lived in them (caves, houses, chests, signs, people, dig spots, exits) is carried
across to the same relative place, with the ground it stood on, and the land round it is cleared and joined to the roads.
New areas are generated from the plan. The Shadow world is the light world's mirror, with its own extras carried across.
"""
import math
import os
import random
from worldplan import SETPIECE_HALO, GW, GH, SW, SH, BIOME, SETPIECES, REGIONS, RIVERS, ROADS, TOWNS_BUILT, TOWN_HOUSES, HOMES, FOUNTAINS, DUNGEONS_NEW, MOVED_DUNGEONS, CASTLE, LANDMARKS, CAVES, PEOPLE, QUESTS, SHADOW_QUESTS

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
    # biome borders wobble a little but keep close to screen edges, so each screen reads as one kind of land (as in Zelda 1991)
    jx, jy = (n1(x, y) - 0.5) * 9 + (n2(x * 3, y * 3) - 0.5) * 4, (n2(x, y) - 0.5) * 8 + (n1(x * 3 + 50, y * 3) - 0.5) * 4
    sx, sy = int(min(GW - 1, max(0, (x + jx) // SW))), int(min(GH - 1, max(0, (y + jy) // SH)))
    return BIOME[sy][sx]


def generate(reserved, anchors, openings, wet=(), lakes=()):
    global MEANDER
    MEANDER = Noise(31, 14)
    """The whole land as a grid of map characters (see tools/maps.py paint for their meaning)."""
    R = random.Random(2026)
    n1, n2, nf, nr, nw, ns = Noise(1, 23), Noise(2, 19), Noise(3, 11), Noise(4, 9), Noise(5, 13), Noise(6, 5)
    ng, nm, no = Noise(7, 6), Noise(8, 8), Noise(9, 5)
    g = [['.'] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if (x, y) in reserved:
                g[y][x] = '#'
                continue
            b = biome_at(x, y, n1, n2)
            gr = GROUND.get(b, '.')
            hg = halo_at(x, y) if HALOS else None
            if hg:
                gr = hg
                if b in 'WMS':     # snow, forest and rock give way near the hand-built area
                    b = 'H'
            c = gr
            f, r, s = nf(x, y), nr(x, y), ns(x, y)
            if b == 'W':
                c = 'F' if f > 0.52 else ('T' if s > 0.86 else gr)
            elif b == 'M':
                c = 'Q' if r > 0.56 else ('r' if s > 0.88 else gr)
            elif b == 'S':
                c = 'Q' if r > 0.62 else ('T' if s > 0.86 else ('r' if s < 0.05 else gr))
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
            # clusters that break up open land: groves, flower meadows, rocky outcrops, frozen ponds, rock formations
            if c == gr:
                gv, mf, oc = ng(x, y), nm(x, y), no(x, y)
                if b in 'FKTH' and gv > 0.84:
                    c = 'F'
                elif b in 'FKT' and mf > 0.74 and ns(x * 2, y * 2) > 0.55:
                    c = '*'
                elif b in 'FH' and oc > 0.86:
                    c = 'Q'
                elif b in 'SI' and mf > 0.82:
                    c = '~'
                elif b == 'S' and gv > 0.74:
                    c = 'T' if s > 0.6 else gr
                elif b == 'D' and oc > 0.8:
                    c = 'Q'
                elif b == 'D' and mf > 0.84 and s > 0.7:
                    c = 'x'
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
    # a lake meeting the edge of a hand-built area spills out as a rounded bay, not a straight strip
    near_door = set()
    for o in openings:
        ox, oy = o[0], o[1]
        for j in range(-2, 3):
            for i in range(-2, 3):
                near_door.add((ox + i, oy + j))
    for (cx, cy, dx, dy, half) in lakes:
        depth = max(4, half * 0.45)
        for j in range(-int(half) - 4, int(half) + 5):
            for k in range(0, int(depth) + 4):
                X, Y = (cx + j, cy + dy * k) if dy else (cx + dx * k, cy + j)
                if not (0 <= X < W and 0 <= Y < H) or g[Y][X] == '#' or (X, Y) in near_door:
                    continue
                e = (j / (half + 0.5)) ** 2 + (k / depth) ** 2
                if e < 0.8 + (nw(X * 3, Y * 3) - 0.5) * 0.9 + (HALO_NOISE(X, Y) - 0.5) * 0.5:
                    g[Y][X] = '~'
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
    # the hedge maze: a grid of hedges with winding two-wide paths
    for (kind, reg, at) in LANDMARKS:
        if kind != 'maze':
            continue
        mx, my, mw, mh = int(at[0] * SW), int(at[1] * SH), int(at[2] * SW), int(at[3] * SH)
        cw, ch = (mw - 1) // 3, (mh - 1) // 3
        for y in range(my, my + mh):
            for x in range(mx, mx + mw):
                if g[y][x] != '#':
                    g[y][x] = 'F'
        rr = random.Random(77); seen = {(0, 0)}; stack = [(0, 0)]
        def open_cell(i, j):
            for y in range(my + 1 + j * 3, my + 3 + j * 3):
                for x in range(mx + 1 + i * 3, mx + 3 + i * 3):
                    g[y][x] = '.'
        open_cell(0, 0)
        while stack:
            i, j = stack[-1]
            nb = [(i + a, j + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= i + a < cw and 0 <= j + b < ch and (i + a, j + b) not in seen]
            if not nb:
                stack.pop(); continue
            ni, nj = rr.choice(nb); seen.add((ni, nj)); stack.append((ni, nj)); open_cell(ni, nj)
            for y in range(my + 1 + min(j, nj) * 3, my + 3 + max(j, nj) * 3):
                for x in range(mx + 1 + min(i, ni) * 3, mx + 3 + max(i, ni) * 3):
                    g[y][x] = '.'
        for x in range(mx + 1, mx + 3):            # ways in: bottom-left and top-right
            for y in range(my + mh - 1, my + mh + 3):
                if y < H and g[y][x] != '#': g[y][x] = '.'
        for x in range(mx + mw - 3 - ((mw - 1) % 3), mx + mw - 1 - ((mw - 1) % 3)):
            for y in range(my - 3, my + 1):
                if y >= 0 and g[y][x] != '#': g[y][x] = '.'
    # everything must be reachable: carve from any cut-off carried place to the land that is reached
    reach_all(g, anchors, openings, n1, n2)
    # Zelda-style screens: framed by trees or rock, with real gateways between them (see frame_screens),
    # and every way onto a screen leads somewhere (see tidy_seams)
    widen_lanes(g, n1, n2)
    frame_screens(g, n1, n2)
    widen_lanes(g, n1, n2)
    tidy_seams(g, n1, n2, openings)
    reach_all(g, anchors, openings, n1, n2)
    if os.environ.get('ROADSTAT'):
        r = edge_runs(g, anchors); print('roads along edges: runs>=6: %d  runs>=8: %d  longest %d' % (sum(1 for t in r if t[2] >= 6), sum(1 for t in r if t[2] >= 8), max([t[2] for t in r] or [0])), [t for t in r if t[2] >= 6])
    # nothing walks off the edge of the world
    for y in range(H):
        for x in range(W):
            if (x in (0, W - 1) or y in (0, H - 1)) and g[y][x] in WALK:
                g[y][x] = '~' if y == H - 1 else 'Q'
    # openings the game's own screen check found still leading nowhere (tests/screens.js -> tools/seals.json): wall them
    sp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seals.json')
    if os.path.exists(sp):
        import json as _json
        def reached():
            # ground Wren can reach on foot (hand-built areas counted as open ground), from the middle of Thistledown
            from collections import deque
            sx_, sy_ = SETPIECES['meadow']
            start = next(((x, y) for y in range(sy_ * SH, sy_ * SH + SH) for x in range(sx_ * SW, sx_ * SW + SW) if g[y][x] in WALK or g[y][x] == '#'), None)
            seen = {start}; dq = deque([start])
            while dq:
                x, y = dq.popleft()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    X, Y = x + dx, y + dy
                    if 0 <= X < W and 0 <= Y < H and (X, Y) not in seen and (g[Y][X] in WALK or g[Y][X] == '#' or g[Y][X] == 'T'):
                        seen.add((X, Y)); dq.append((X, Y))
            return seen
        def matters(tiles):          # cutting this off loses something: a hand-built place, or more than a dead-end corner
            return len(tiles) > 120 or any(g[y][x] in '#X-' for (x, y) in tiles)
        before = reached()
        undo = {}
        for (x, y) in _json.load(open(sp)):
            if 0 <= x < W and 0 <= y < H and g[y][x] != '#':
                undo[(x, y)] = g[y][x]
                g[y][x] = 'Q' if BIOME[y // SH][x // SW] in 'MSD' else 'F'
        # a seal must never cut off anything that matters: put back, one opening at a time, any seal that did
        lost = before - reached()
        if lost and matters(lost):
            groups = []
            for t, c in undo.items():
                for gr in groups:
                    if any(abs(t[0] - u[0][0]) + abs(t[1] - u[0][1]) <= 1 for u in gr):
                        gr.append((t, c)); break
                else:
                    groups.append([(t, c)])
            near = {(x // SW + i, y // SH + j) for (x, y) in lost for i in (-1, 0, 1) for j in (-1, 0, 1)}
            for gr in groups:
                if not (lost and matters(lost)):
                    break
                if not any((t[0] // SW, t[1] // SH) in near for t, _ in gr):
                    continue
                sealed = [(t, g[t[1]][t[0]]) for t, _ in gr]
                for t, c in gr:
                    g[t[1]][t[0]] = c
                now = before - reached()
                back = lost - now
                if back and matters(back):
                    lost = now
                else:
                    for t, c in sealed:
                        g[t[1]][t[0]] = c
    if os.environ.get("GRIDDUMP"): open(os.environ["GRIDDUMP"], "w").write("\n".join("".join(r) for r in g))
    return g


def widen_lanes(g, n1, n2):
    """No one-tile squeezes: wherever open ground runs between two obstacles one tile apart, the obstacle on one
    side gives way (trees and rock first; water, hand-built areas and roads stay). Zelda's paths are at least two
    tiles wide, and Wren is wide enough that one-tile gaps feel like a trap."""
    for _ in range(3):
        n = 0
        for y in range(2, H - 2):
            for x in range(2, W - 2):
                if g[y][x] not in WALK or g[y][x] == 'X':
                    continue
                for (dx, dy) in ((1, 0), (0, 1)):
                    A, B = g[y - dy][x - dx], g[y + dy][x + dx]
                    if A in WALK or B in WALK or A == '_' and B == '_':
                        continue
                    for (X, Y) in ((x + dx, y + dy), (x - dx, y - dy)):
                        c = g[Y][X]
                        if c in '~#X-h' or not (2 <= X < W - 2 and 2 <= Y < H - 2):
                            continue
                        if c in 'Tg_':
                            for j in (0, -1):
                                for i in (0, -1):
                                    XX, YY = X + i, Y + j
                                    if g[YY][XX] in 'Tg':
                                        for (p_, q_) in ((0, 0), (1, 0), (0, 1), (1, 1)):
                                            if g[YY + q_][XX + p_] in 'Tg_': g[YY + q_][XX + p_] = ground_here(XX + p_, YY + q_, n1, n2)
                        if g[Y][X] not in WALK:
                            g[Y][X] = ground_here(X, Y, n1, n2)
                        n += 1
                        break
        if not n:
            break


def frame_screens(g, n1, n2):
    """Zelda 1991's overworld is a grid of screens joined at deliberate gateways: each screen's edge is a wall of
    trees, cliff or water, broken only where a path leads on to the next screen, and the gateway lines up on both
    sides. This does the same for the generated land:
      - every screen edge gets a wall one or two tiles deep on each side (trees, or rock in rocky and snowy land);
      - an edge stays open (a gateway 3 to 4 tiles wide, cleared two tiles deep both sides) where a road crosses it,
        along a spanning tree that joins every land screen, and on about a third of the other edges for loops;
      - edges that touch a hand-built area are left exactly as built."""
    R = random.Random(1991)
    fixed = lambda c: c in '#X'
    def scr_land(sx, sy):
        n = sum(1 for y in range(sy * SH, sy * SH + SH) for x in range(sx * SW, sx * SW + SW) if g[y][x] in WALK or g[y][x] in 'Fb*T_r')
        return n >= SW * SH * 0.3
    def blocker_for(sx, sy):
        return 'Q' if BIOME[sy][sx] in 'MSD' else 'F'
    edges = []                                # (sx, sy, 'E'|'S'): the edge on that screen's east or south side
    for sy in range(GH):
        for sx in range(GW):
            if sx + 1 < GW: edges.append((sx, sy, 'E'))
            if sy + 1 < GH: edges.append((sx, sy, 'S'))
    def line(e):
        sx, sy, d = e
        if d == 'E':
            X = sx * SW + SW - 1
            return [((X, y), (X + 1, y)) for y in range(sy * SH, sy * SH + SH)], (sx + 1, sy)
        Y = sy * SH + SH - 1
        return [((x, Y), (x, Y + 1)) for x in range(sx * SW, sx * SW + SW)], (sx, sy + 1)
    def inward(e):                             # steps away from the edge, into screen A and into screen B
        return ((-1, 0), (1, 0)) if e[2] == 'E' else ((0, -1), (0, 1))
    touches_set = {}
    for e in edges:
        L, _ = line(e)
        di = inward(e)
        touches_set[e] = any(fixed(g[a[1] + di[0][1] * k][a[0] + di[0][0] * k]) or fixed(g[b[1] + di[1][1] * k][b[0] + di[1][0] * k]) for (a, b) in L for k in range(3))
    road = {e: [i for i, (a, b) in enumerate(line(e)[0]) if g[a[1]][a[0]] in '-h' and g[b[1]][b[0]] in '-h'] for e in edges}
    # which edges are gateways: roads first, then a spanning tree over the land screens, then some loops
    parent = {}
    def find(a):
        while parent.setdefault(a, a) != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    open_e = set()
    rest = [e for e in edges if not road[e]]
    for e in [e for e in edges if road[e]] + R.sample(rest, len(rest)):
        a, b = (e[0], e[1]), line(e)[1]
        if touches_set[e] or not (scr_land(*a) and scr_land(*b)):
            continue
        if road[e] or find(a) != find(b):
            open_e.add(e); parent[find(a)] = find(b)
    for e in edges:
        if e not in open_e and not touches_set[e] and scr_land(e[0], e[1]) and scr_land(*line(e)[1]) and R.random() < 0.33:
            open_e.add(e)
    # no screen is a cul-de-sac: one with a single way in gets a second (as Zelda's screens nearly all have)
    def deg(sc):
        return sum(1 for e in open_e if (e[0], e[1]) == sc or line(e)[1] == sc)
    for sy in range(GH):
        for sx in range(GW):
            if not scr_land(sx, sy) or deg((sx, sy)) != 1:
                continue
            cand = [e for e in edges if e not in open_e and not touches_set[e] and ((e[0], e[1]) == (sx, sy) or line(e)[1] == (sx, sy)) and scr_land(e[0], e[1]) and scr_land(*line(e)[1])]
            if cand:
                open_e.add(R.choice(cand))
    def clear_tile(X, Y):
        for j in (0, -1):                      # a 2 x 2 tree or headstone goes whole
            for ii in (0, -1):
                XX, YY = X + ii, Y + j
                if 0 <= XX < W and 0 <= YY < H and g[YY][XX] in 'Tg':
                    for (p_, q_) in ((0, 0), (1, 0), (0, 1), (1, 1)):
                        if g[YY + q_][XX + p_] in 'Tg_': g[YY + q_][XX + p_] = ground_here(XX + p_, YY + q_, n1, n2)
        if g[Y][X] == '~':
            g[Y][X] = 'h'
        elif g[Y][X] not in WALK:
            g[Y][X] = ground_here(X, Y, n1, n2)
    for e in edges:
        if touches_set[e]:
            continue
        L, other = line(e)
        di = inward(e)
        n = len(L)
        gate = set()
        if e in open_e:
            if road[e]:
                lo, hi = min(road[e]) - 1, max(road[e]) + 1
            else:
                def bad(i):
                    a, b = L[i]
                    return sum(1 for t in (a, b) for k in range(2) if g[t[1] + (di[0] if t is a else di[1])[1] * k][t[0] + (di[0] if t is a else di[1])[0] * k] in '~Q#X') * 3 + abs(i - n / 2) * 0.15
                best = min(range(3, n - 5), key=lambda i: sum(bad(i + k) for k in range(3)) + R.random() * 0.4)
                lo, hi = best, best + 2
            lo, hi = max(2, lo), min(n - 3, hi)
            gate = set(range(lo, hi + 1))
        for i, (a, b) in enumerate(L):
            for side, (t, (dx, dy)) in enumerate(((a, di[0]), (b, di[1]))):
                scr = (e[0], e[1]) if side == 0 else other
                depth = 2 if i in gate else (1 + (1 if HALO_NOISE and HALO_NOISE(t[0] * 3, t[1] * 3) > 0.55 else 0))
                for k in range(depth):
                    X, Y = t[0] + dx * k, t[1] + dy * k
                    c = g[Y][X]
                    if fixed(c):
                        continue
                    if i in gate:
                        clear_tile(X, Y)
                    elif c != '~' and c not in '-h':
                        if c in 'T_g':
                            clear_tile(X, Y)            # a tree half in the band: take it out whole, then wall the band
                        g[Y][X] = blocker_for(*scr)


def tidy_seams(g, n1, n2, doors=()):
    """Make the land navigable screen by screen, as in Zelda 1991: the overworld is a grid of screens, and walking
    off one edge slides you onto the next. Every opening across a screen edge must land on ground that leads
    somewhere: on to the rest of that screen, or to another opening. Openings that land in a small pocket
    (hemmed in by trees, rock or water) are either joined to the rest of the screen by clearing a short way
    through, or closed off on both sides. One-tile gaps are widened to two."""
    W_, H_ = W, H
    walk0 = lambda c: c in WALK
    def walkxy(x, y):
        c = g[y][x]
        return c in WALK or c == 'T' or (c == '_' and x > 0 and g[y][x - 1] == 'T')
    walk = walk0
    fixed = lambda c: c in '#X'
    def clear(x, y):
        """Turn a tile to open ground (a 2 x 2 tree or headstone goes whole)."""
        for j in (0, -1):
            for i in (0, -1):
                X_, Y_ = x + i, y + j
                if 0 <= X_ < W_ and 0 <= Y_ < H_ and g[Y_][X_] in 'Tg':
                    for (a, b) in ((0, 0), (1, 0), (0, 1), (1, 1)):
                        if 0 <= X_ + a < W_ and 0 <= Y_ + b < H_ and g[Y_ + b][X_ + a] in 'Tg_':
                            g[Y_ + b][X_ + a] = ground_here(X_ + a, Y_ + b, n1, n2)
        if g[y][x] == '~':
            g[y][x] = 'h'
        elif not walk(g[y][x]) and not fixed(g[y][x]):
            g[y][x] = ground_here(x, y, n1, n2)
    def blocker(x, y):
        from collections import Counter
        near = Counter(g[y + j][x + i] for i in (-1, 0, 1) for j in (-1, 0, 1) if 0 <= x + i < W_ and 0 <= y + j < H_ and g[y + j][x + i] in 'FQ~')
        return near.most_common(1)[0][0] if near else 'F'
    for _round in range(8):
        # the walkable pieces of each screen
        pid = [[-1] * W_ for _ in range(H_)]
        pieces = []
        for sy in range(GH):
            for sx in range(GW):
                x0, y0 = sx * SW, sy * SH
                for y in range(y0, y0 + SH):
                    for x in range(x0, x0 + SW):
                        if pid[y][x] >= 0 or not walkxy(x, y):
                            continue
                        k = len(pieces); P = {'tiles': [], 'open': [], 'road': False, 'fixed': False, 'scr': (sx, sy)}; pieces.append(P)
                        st = [(x, y)]; pid[y][x] = k
                        while st:
                            cx, cy = st.pop(); P['tiles'].append((cx, cy))
                            if g[cy][cx] in '-h': P['road'] = True
                            if g[cy][cx] == 'X': P['fixed'] = True
                            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                                nx, ny = cx + dx, cy + dy
                                if x0 <= nx < x0 + SW and y0 <= ny < y0 + SH and pid[ny][nx] < 0 and walkxy(nx, ny):
                                    pid[ny][nx] = k; st.append((nx, ny))
        # openings: runs of tiles open on both sides of a screen edge
        runs = []
        for sy in range(GH):
            for sx in range(GW):
                x0, y0 = sx * SW, sy * SH
                lines = []
                if sx + 1 < GW: lines.append([((x0 + SW - 1, y), (x0 + SW, y)) for y in range(y0, y0 + SH)])
                if sy + 1 < GH: lines.append([((x, y0 + SH - 1), (x, y0 + SH)) for x in range(x0, x0 + SW)])
                for line in lines:
                    run = None
                    for pair in line + [None]:
                        a, b = pair if pair else (None, None)
                        if a and walkxy(*a) and walkxy(*b):
                            if run is None: run = {'pairs': []}; runs.append(run)
                            run['pairs'].append((a, b))
                        else:
                            run = None
        for r in runs:
            a, b = r['pairs'][0]
            r['pa'], r['pb'] = pid[a[1]][a[0]], pid[b[1]][b[0]]
            pieces[r['pa']]['open'].append(r); pieces[r['pb']]['open'].append(r)
        # a hand-built area's doorway counts as a way in or out of the piece it opens onto
        for (dx_, dy_) in doors:
            for (i, j) in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                X_, Y_ = dx_ + i, dy_ + j
                if 0 <= X_ < W_ and 0 <= Y_ < H_ and pid[Y_][X_] >= 0:
                    P_ = pieces[pid[Y_][X_]]
                    if not any(o.get('door') for o in P_['open']):
                        P_['open'].append({'door': True}); P_['door'] = True
                    break
        changed = 0
        # one-tile gaps: widen to two where both sides allow it
        for r in runs:
            if len(r['pairs']) != 1: continue
            (ax, ay), (bx, by) = r['pairs'][0]
            along = (0, 1) if ax != bx else (1, 0)
            for s_ in (1, -1):
                A = (ax + along[0] * s_, ay + along[1] * s_); B = (bx + along[0] * s_, by + along[1] * s_)
                if not (0 <= A[0] < W_ and 0 <= A[1] < H_ and 0 <= B[0] < W_ and 0 <= B[1] < H_): continue
                if (A[0] // SW, A[1] // SH) != (ax // SW, ay // SH) or (B[0] // SW, B[1] // SH) != (bx // SW, by // SH): continue
                if any(g[t[1]][t[0]] in '#X~Q' for t in (A, B)): continue
                clear(*A); clear(*B); changed += 1; break
        def second_exit(P):
            """Open a new two-wide gap across this piece's screen edge to open ground just over it (at most two tiles
            of trees, bushes or loose rock to clear on each side). True if one was made."""
            sx, sy = P['scr']; x0, y0 = sx * SW, sy * SH
            mine = set(P['tiles'])
            best = None
            for (ex, ey, dx, dy, along) in ((x0, None, -1, 0, 'y'), (x0 + SW - 1, None, 1, 0, 'y'), (None, y0, 0, -1, 'x'), (None, y0 + SH - 1, 0, 1, 'x')):
                for k in range(2, (SH if along == 'y' else SW) - 3):
                    cost, path, ok = 0, [], False
                    for w_ in (0, 1):
                        X0 = ex if along == 'y' else x0 + k + w_
                        Y0 = y0 + k + w_ if along == 'y' else ey
                        if not (0 <= X0 + dx < W_ and 0 <= Y0 + dy < H_): break
                        # from the piece outwards: back up to 2 tiles inside, then across up to 3 tiles beyond the edge
                        line_ = [(X0 - dx * i, Y0 - dy * i) for i in (2, 1, 0)] + [(X0 + dx * i, Y0 + dy * i) for i in (1, 2, 3)]
                        start = max((i for i, t in enumerate(line_[:3]) if t in mine), default=None)
                        if start is None: break
                        end = next((i for i, t in enumerate(line_[3:], 3) if walkxy(*t) and (t[0] // SW, t[1] // SH) != (sx, sy)), None)
                        if end is None: break
                        seg = line_[start + 1:end]
                        if any(g[t[1]][t[0]] in '#X~Q' for t in seg): break
                        cost += sum(0 if walkxy(*t) else 1 for t in seg); path += seg
                    else:
                        ok = True
                    if ok and (best is None or cost < best[0]):
                        best = (cost, path)
            if best is None:
                return False
            for t in best[1]:
                clear(*t)
            return True
        # dead-end landings: a piece whose only way in or out is one opening
        for k, P in enumerate(pieces):
            if len(P['open']) != 1: continue
            if P.get('door') and len(P['tiles']) >= SW * SH * 0.5: continue
            sx, sy = P['scr']; x0, y0 = sx * SW, sy * SH
            others = [Q for Q in pieces if Q is not P and Q['scr'] == P['scr']]
            if not others:
                # the whole screen is one piece with a single way in: give it a second way out if there is one
                if second_exit(P): changed += 1
                continue
            main = max(others, key=lambda Q: (len(Q['open']) > 0 or Q['road'] or Q['fixed'], len(Q['tiles'])))
            if len(P['tiles']) > len(main['tiles']):
                continue
            # a short way through to the rest of the screen?
            import heapq
            target = set(main['tiles'])
            cost = lambda c: 0 if walk(c) else 1 if c in 'Fb*_T' else 2 if c in 'rQgx' else 3 if c == '~' else None
            best = {t: 0 for t in P['tiles']}; prev = {}; pq = [(0, t) for t in P['tiles']]; heapq.heapify(pq); hit = None
            while pq:
                d, (cx, cy) = heapq.heappop(pq)
                if (cx, cy) in target: hit = (cx, cy); break
                if d > best.get((cx, cy), 99): continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if not (x0 <= nx < x0 + SW and y0 <= ny < y0 + SH): continue
                    c = cost(g[ny][nx])
                    if c is None: continue
                    nd = d + c
                    if nd < best.get((nx, ny), 99) and nd <= 24:
                        best[(nx, ny)] = nd; prev[(nx, ny)] = (cx, cy); heapq.heappush(pq, (nd, (nx, ny)))
            if hit:
                t = hit
                while t in prev:
                    clear(*t); t = prev[t]
                changed += 1
                continue
            # no: a second way out over the screen edge, then?
            if second_exit(P):
                changed += 1
                continue
            # no: close the opening on both sides (never inside a hand-built area, never a set-piece door)
            if P['fixed'] or P.get('door'):
                continue
            r = P['open'][0]
            for (a, b) in r['pairs']:
                for t in (a, b):
                    if not fixed(g[t[1]][t[0]]): g[t[1]][t[0]] = blocker(*t)
            changed += 1
        if not changed:
            break


def edge_runs(g, anchors=()):
    """Stretches of road that run along a screen's edge (the first or last row or column) for 4 tiles or more."""
    out = []
    for horiz in (True, False):
        lines = [y for y in range(H) if y % SH in (0, SH - 1)] if horiz else [x for x in range(W) if x % SW in (0, SW - 1)]
        for L in lines:
            run = []
            for k in range((W if horiz else H) + 1):
                x, y = (k, L) if horiz else (L, k)
                if k < (W if horiz else H) and g[y][x] in '-h':
                    run.append((x, y)); continue
                if len(run) >= 4:
                    inside = any(a[0] <= run[0][0] <= a[2] and a[1] <= run[0][1] <= a[3] for a in anchors)
                    out.append((run[0][0] // SW, run[0][1] // SH, len(run), 'carried' if inside else 'new'))
                run = []
    return out


def lake_bowl(x, y):
    """How far inside Icemere's basin a tile is (0 at its rim, ~0.6 in the middle)."""
    cx, cy, rx, ry = 17.0 * SW, 5.4 * SH, 2.4 * SW, 2.0 * SH
    d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    return max(0.0, 0.62 * (1 - d))


HALOS = []          # (x0, y0, x1, y1, ground, reach): land round a hand-built area takes on its ground
HALO_NOISE = None


def halo_at(x, y):
    for (x0, y0, x1, y1, gch, reach) in HALOS:
        dx = max(x0 - x, 0, x - x1)
        dy = max(y0 - y, 0, y - y1)
        d = math.hypot(dx, dy)
        if d <= reach and d < reach * (0.45 + HALO_NOISE(x, y) * 0.8):
            return gch
    return None


def ground_here(x, y, n1, n2):
    h = halo_at(x, y) if HALOS else None
    return h or GROUND.get(biome_at(x, y, n1, n2), '.')


MEANDER = None


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
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):          # square routes: no diagonals
            X, Y = x + dx, y + dy
            if not (0 <= X < W and 0 <= Y < H):
                continue
            if dx and dy and (cost(g[y][X]) >= 1e9 or cost(g[Y][x]) >= 1e9):
                continue
            c = cost(g[Y][X]) * (1.41 if dx and dy else 1)
            c += MEANDER(X, Y) * 0.6
            # keep roads off the screen edges: crossing one is fine, running along one is not
            if min(X % SW, SW - 1 - X % SW) <= 1 or min(Y % SH, SH - 1 - Y % SH) <= 1:
                c += 8
            if c >= 1e9 and (X, Y) != b:
                continue
            if c < 1e9 and any(0 <= X + i < W and 0 <= Y + j < H and g[Y + j][X + i] == '#' for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c += 3
            c += ((X * 7919 + Y * 104729) % 7) * 0.08
            nd = d + min(c, 60) + (2.5 if (prev.get((x, y)) and (x - prev[(x, y)][0], y - prev[(x, y)][1]) != (dx, dy)) else 0)
            if nd < best.get((X, Y), 1e18):
                best[(X, Y)] = nd
                prev[(X, Y)] = (x, y)
                heapq.heappush(pq, (nd + math.hypot(X - tx, Y - ty), nd, (X, Y)))
    if b not in prev and a != b:
        return
    p = b
    path = [p]
    while p != a:
        p = prev[p]
        path.append(p)
    brush = [(0, 0), (1, 0), (0, 1), (1, 1), (-1, 0), (0, -1)] if width == 2 else [(0, 0), (1, 0)]
    for (x, y) in path:
        for (i, j) in brush:
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
    for d in DUNGEONS_NEW:
        anchors.append(spot(d[3], 4, 3))
    anchors.append(spot(CASTLE[1], CASTLE[2], CASTLE[3]))
    for (did, reg, at) in MOVED_DUNGEONS:      # the shrine's pool needs room round its gate
        anchors.append(spot(at, 4, 3) if did != 'shrine' else spot(at, 10, 7))
    LM_SIZE = {'stones': (12, 10), 'mill': (5, 5), 'wreck': (14, 5), 'tower': (2, 2), 'ruin': (4, 2)}
    for (kind, reg, at) in LANDMARKS:
        if kind != 'maze':
            anchors.append(spot(at, *LM_SIZE[kind]))
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
    ws = set(wet); keep_w = []; lakes = []; seen_l = set()
    for w in wet:
        dx, dy = w[2], w[3]
        run = 1
        for sgn in (1, -1):
            k = 1
            while (w[0] + (sgn * k if dy else 0), w[1] + (sgn * k if dx else 0), dx, dy) in ws:
                run += 1; k += 1
        if run <= 5:
            keep_w.append(w)
        elif w not in seen_l:
            run_cells = [w]
            for sgn in (1, -1):
                k = 1
                while True:
                    v = (w[0] + (sgn * k if dy else 0), w[1] + (sgn * k if dx else 0), dx, dy)
                    if v not in ws:
                        break
                    run_cells.append(v); k += 1
            seen_l.update(run_cells)
            xs = [c[0] for c in run_cells]; ys = [c[1] for c in run_cells]
            cx, cy = (min(xs) + max(xs)) // 2, (min(ys) + max(ys)) // 2
            lakes.append((cx, cy, dx, dy, len(run_cells) / 2))
    wet = keep_w
    global HALOS, HALO_NOISE
    HALO_NOISE = Noise(41, 7)
    HALOS = [((SETPIECES[k][0]) * SW, SETPIECES[k][1] * SH, (SETPIECES[k][0] + sizes[k][0]) * SW - 1,
              (SETPIECES[k][1] + sizes[k][1]) * SH - 1, gch, reach) for k, (gch, reach) in SETPIECE_HALO.items()]
    g = generate(reserved, anchors, openings, wet, lakes)
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
        cx, cy = rx + rw / 2, ry + rh / 2
        nm.extra['tier'] = round(1 + min(1.0, math.hypot(cx - 10.5, cy - 12.5) / 11), 2)   # tougher wildlife further from home
        nm.entry = [rw * 8, rh * 7]
        if mid in idx:
            carry(idx[mid], nm, T[mid], windows.get(mid, []), M)
        else:
            wildlife(nm, theme, M, hash(mid) & 0xffff)
        new.append(nm)
    extra = place_features(new, [], M, shadow=False)
    # the Shadow world: each new region darkened, with the old shadow area's own extras carried across
    shadows = []
    for nm in new:
        sm = M.shadowize(nm, 'Shadow ' + nm.name)
        sm.extra['tier'] = round(nm.extra.get('tier', 1) + 0.5, 2)
        sm.warps = []
        sm.spawns = []
        sp2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seals_shadow.json')
        if os.path.exists(sp2):                 # Shadow-only dead ends (tools/seals.py): a rock wall in the Shadow alone
            import json as _json
            rx, ry = nm.extra['world']
            for (gx, gy) in _json.load(open(sp2)):
                x_, y_ = gx - rx * SW, gy - ry * SH
                if 0 <= x_ < sm.w and 0 <= y_ < sm.h and sm.col[y_ * sm.w + x_] == M.OPEN:
                    sm.put('deco', M.CV, 5, 4, x_, y_); sm.col[y_ * sm.w + x_] = M.SOLID
        for k, t in nm.signs.items():          # lookout towers stand in the shadow too
            if 'tower' in t.split('.')[0].lower() or 'lookout' in t.split('.')[0].lower():
                sm.signs[k] = 'A burnt-out watchtower. Someone has scratched into the stone: "Still no clear days."'
        old = idx.get('s_' + nm.id)
        if old:
            carry(old, sm, T['s_' + nm.id], windows.get('s_' + nm.id, []), M)
            sm.extra['names'] = old.extra.get('names', sm.extra.get('names'))
            if len(sm.extra['names']) < len(sm.areas):
                sm.extra['names'] = (list(sm.extra['names']) * 9)[:len(sm.areas)]
        else:
            wildlife(sm, 'shadow', M, hash(sm.id) & 0xffff)
        shadows.append(sm)
    extra += place_features(new, shadows, M, shadow=True)
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


def nearest_open(m, x, y, M):
    best = min(((abs(a - x) + abs(b - y), a, b) for b in range(2, m.h - 2) for a in range(2, m.w - 2)
                if m.col[b * m.w + a] == M.OPEN and m.layers['deco'][b * m.w + a] < 0), default=(0, x, y))
    return best[1], best[2]


def local(maps, mid, at):
    m = next(x for x in maps if x.id == mid)
    rx, ry = m.extra['world']
    return m, int(at[0] * SW) - rx * SW, int(at[1] * SH) - ry * SH


def build_house(M, m, x, y, hid, name, kind, look, lines, extra=None):
    M.house(m, x, y, (hid, 7, 12, 0))
    npc = dict(look=look, roam=0, dir=2, talk=[[None, lines]])
    if extra == 'bottles':
        npc['bottles'] = True
    return M.interior(hid, name, (m.id, x + 2, y + 5), kind, npcs=[(7, 5 if kind in ('shop', 'tavern', 'smith', 'game') else 6, npc)], chests=[(5, 4, 'bottle')] if extra == 'bottle' else ())


def fountain_cave(M, m, x, y, fid):
    """A fairy fountain: a pool to rest by. Three looks (forest spring, crystal grotto, old shrine); three of them are
    Great Fairy fountains (see tools/interiors.py GREAT)."""
    import interiors as INT
    n = int(fid[5:])
    look = INT.FOUNTAIN_LOOK[n % 3]
    great = INT.GREAT.get(n)
    m.stamp(M.OW, 10, 31, x, y, 4, 3, col=M.SOLID)
    m.warp(x + 1, y + 2, fid, 7, 12, 0)
    m.warp(x + 2, y + 2, fid, 8, 12, 0)
    f = M.Map(fid, 16, 14, 'Great Fairy Fountain' if great else 'Fairy Fountain', indoor=True, music='home')
    floor_t = {'spring': (M.NI, 12, 13), 'crystal': (M.NI, 16, 7), 'shrine': (M.NI, 19, 2)}[look]
    for yy in range(14):
        for xx in range(16):
            f.put('ground', floor_t[0], floor_t[1] + (xx % 2), floor_t[2] + (yy % 2), xx, yy) if look != 'spring' else f.put('ground', M.NI, 12, 13, xx, yy)
    f.solid(0, 0, 16, 2); f.solid(0, 0, 1, 14); f.solid(15, 0, 1, 14); f.solid(0, 13, 16, 1)
    wall = (4, 0)
    for xx in range(16):
        for yy in (0, 1):
            f.put('ground', M.NR, wall[0] + (xx % 3), wall[1] + yy, xx, yy)
    for yy in range(14):
        for xx in (0, 15):
            f.put('ground', M.NR, wall[0], wall[1] + 1, xx, yy)
    for xx in range(16):
        f.put('ground', M.NR, wall[0] + 1, wall[1] + 2, xx, 13)
    px0, px1, py0, py1 = (3, 12, 3, 8) if great else (4, 11, 4, 8)
    import blend as B
    for xx in range(px0, px1 + 1):                 # the pool, with soft foamy banks
        for yy in range(py0, py1 + 1):
            nb = lambda a, b: px0 <= a <= px1 and py0 <= b <= py1 and not (look == 'crystal' and (a, b) in ((px0, py0), (px1, py0), (px0, py1), (px1, py1)))
            if not nb(xx, yy):
                continue
            k = B.mask(nb, xx, yy)
            f.put('ground', M.BL, k & 15, 7 * 16 + (k >> 4), xx, yy) if k != 255 else f.put('ground', M.NW, 1, 7, xx, yy)
            f.col[yy * 16 + xx] = M.DEEP
    for xx in (7, 8):
        f.warp(xx, 13, m.id, x + xx - 6, y + 3, 2)
        f.col[13 * 16 + xx] = M.OPEN
        f.put('ground', M.NI, 12, 13, xx, 13)
    # each look's furnishings
    if look == 'shrine':
        for (a, b) in ((2, 3), (13, 3), (2, 9), (13, 9)):
            for j in range(3):
                f.put('deco', M.NH, 0, 15 + j, a, b + j)
            f.solid(a, b, 1, 3)
        for (a, b) in ((2, 7), (12, 7)):
            if not great:
                f.stamp(M.NH, 3, 15, a, b, 2, 2, col=M.SOLID)
    elif look == 'crystal':
        for (a, b) in ((2, 3), (13, 4), (2, 10), (13, 10), (3, 6)):
            f.put('deco', M.NE, 18, 6, a, b); f.solid(a, b, 1, 1)
    else:
        for (a, b) in ((2, 4), (13, 4), (2, 10), (13, 10)):
            f.put('deco', M.NN, 12, 6, a, b); f.solid(a, b, 1, 1)
    for (a, b) in (((5, 2), (10, 2), (3, 10), (12, 10)) if not great else ((4, 2), (11, 2), (2, 9), (13, 9))):
        f.spawn('fairy', a, b)
    if great:
        lines = {'plenty': ['I am the Great Fairy of Plenty. Throw in 100 cash and I will fill your bombs, arrows, energy and every empty bottle.'],
                 'valour': ['I am the Great Fairy of Valour. Throw in 300 cash, once, and your spin attack will gather in half the time.'],
                 'fortune': ['I am the Great Fairy of Fortune. Throw in 200 cash, once, and your foes will drop cash far more often.']}[great]
        f.spawn('villager', 8, 6, look='baker', who='GreatFairy', roam=0, dir=2, heal=True, greatfairy=great, talk=[[None, lines]])
    else:
        f.spawn('villager', 8, 10, look='baker', who='Princess', roam=0, dir=2, heal=True,
                talk=[[None, ['Welcome to my spring. Rest, and be whole again.', 'Catch a fairy in a bottle and it will save you when you fall. Fairies hate this. Do it anyway.']]])
    f.entry = [7, 12]
    return f


def build_castle(M, m, x0, y0, W_, H_):
    """Ashford Castle: an outer wall two tiles thick with a round tower at each corner and a gatehouse in the south
    wall; a paved courtyard; the great keep in the middle with towers either side of its door and banners on its face.
    Walls use the generated pale castle stone (rounded, outlined, with a brick face wherever ground lies below)."""
    wall = set()
    def box(ax, ay, w, h):
        for y in range(ay, ay + h):
            for x in range(ax, ax + w):
                wall.add((x, y))
    mid = x0 + W_ // 2
    box(x0, y0, W_, 3)                               # north wall (with the wall walk)
    box(x0, y0, 2, H_)                               # west and east walls
    box(x0 + W_ - 2, y0, 2, H_)
    box(x0, y0 + H_ - 3, W_, 3)                      # south wall
    for x in range(mid - 2, mid + 2):                # its gateway
        for y in range(y0 + H_ - 3, y0 + H_):
            wall.discard((x, y))
    kx, kw, ky, kh = x0 + 8, W_ - 16, y0 + 4, 7      # the keep
    box(kx, ky, kw, kh)
    # ground: paved courtyard, a grass lawn either side
    for y in range(y0, y0 + H_):
        for x in range(x0, x0 + W_):
            i = y * m.w + x
            m.layers['deco'][i] = -1; m.layers['over'][i] = -1
            if (x, y) in wall:
                continue
            paved = abs(x - mid + 0.5) <= 2.5 or y == ky + kh or y == ky + kh + 1
            if paved:
                m.put('ground', M.OW, 8, 23, x, y)
            else:
                M.grass(m, x, y, x, y)
            m.col[i] = M.OPEN
    p = M.WALLMATS.index('pale')
    isw = lambda x, y: (x, y) in wall
    for (x, y) in wall:
        k = M.BLEND.mask(isw, x, y)
        m.layers['ground'][y * m.w + x] = M.ref(M.DW, k & 15, p * 16 + (k >> 4))
        m.col[y * m.w + x] = M.SOLID
    # round towers at the corners, conical towers flanking the keep door, banners on the keep's face
    for (tx, ty) in ((x0 - 1, y0 - 2), (x0 + W_ - 2, y0 - 2), (x0 - 1, y0 + H_ - 6), (x0 + W_ - 2, y0 + H_ - 6)):
        tx, ty = max(0, min(m.w - 3, tx)), max(0, min(m.h - 5, ty + 1))
        m.stamp(M.OW, 3, 22, tx, ty, 3, 5, layer='over')
        m.solid(tx, ty + 3, 3, 2, M.SOLID)
    for tx in (mid - 6, mid + 3):
        m.stamp(M.OW, 3, 22, tx, ky + kh - 5, 3, 5, layer='over')
        m.solid(tx, ky + kh - 2, 3, 2, M.SOLID)
    m.stamp(M.OW, 7, 27, mid - 1, ky + kh - 2, 2, 2, col=M.SOLID)        # the great door
    m.warp(mid - 1, ky + kh - 1, 'castle', 23, 25, 0)
    m.warp(mid, ky + kh - 1, 'castle', 24, 25, 0)
    m.col[(ky + kh - 1) * m.w + mid - 1] = M.OPEN; m.col[(ky + kh - 1) * m.w + mid] = M.OPEN
    for x in range(mid - 2, mid + 2):                # Vex's barrier: only the Dawnblade breaks it
        m.col[(ky + kh) * m.w + x] = M.BARRIER
    for bx in (kx + 2, kx + kw - 3, mid - 3, mid + 2):
        m.stamp(M.OW, 5 + (bx % 2), 27, bx, ky + kh - 3, 1, 2)
    # the gatehouse: banners either side of the gateway, a sign, guards
    m.stamp(M.OW, 5, 27, mid - 3, y0 + H_ - 4, 1, 2)
    m.stamp(M.OW, 6, 27, mid + 2, y0 + H_ - 4, 1, 2)
    m.sign(mid + 3, y0 + H_ - 1, 'ASHFORD CASTLE|Seat of Chancellor Vex. Visitors will be fined. Complaints will be fined twice.')
    for (k, x, y) in [('captain', mid - 5, ky + kh + 3), ('soldierBlue', mid + 5, ky + kh + 3), ('archer', x0 + 4, y0 + 5), ('archer', x0 + W_ - 5, y0 + 5), ('soldier', mid - 8, y0 + H_ - 5), ('soldier', mid + 8, y0 + H_ - 5)]:
        m.spawn(k, x, y)
    MOVED_AT['castle'] = (m.id, mid, ky + kh + 1)
    MOVED_AT['keep'] = ('s_' + m.id, mid, ky + kh + 1)
    CASTLE_DOOR[:] = [mid - 1, ky + kh - 1]


CASTLE_DOOR = []   # the keep door's left tile (x, y) in its region map
MOVED_AT = {}      # moved dungeon -> (overworld map, x, y): where you come out (read by tools/maps.py)


def place_features(new, shadows, M, shadow):
    """Towns, homes, landmarks, caves, people, quests, fairy fountains and new dungeons go in after the land is sliced
    (their ground was cleared by the generator). Light-world things go in first, so the Shadow world inherits their shapes."""
    out = []
    every = new + shadows
    mine = lambda reg: reg.startswith('s_') == shadow
    for (kind, reg, at) in LANDMARKS:
        if not mine(reg) or kind == 'maze':
            if kind == 'maze' and not shadow:
                m, x, y = local(new, reg, at)
                spots = [(a, b) for b in range(y + 6, y + int(at[3] * SH) - 6) for a in range(x + 6, x + int(at[2] * SW) - 6) if m.ok(a, b) and m.col[b * m.w + a] == M.OPEN and m.col[(b + 1) * m.w + a] == M.OPEN]
                if spots:
                    cx, cy = spots[len(spots) // 2]
                    m.chest(cx, cy, 'cash100')
            continue
        m, x, y = local(every, reg, at)
        if kind == 'stones':
            for k in range(8):
                a = k * math.pi / 4
                sx, sy = x + 5 + int(round(math.cos(a) * 4.5)), y + 4 + int(round(math.sin(a) * 3.6))
                m.stamp(M.NN, 16, 8, sx, sy, 2, 2, col=M.SOLID)
        elif kind == 'mill':
            M.house(m, x, y)
            m.extra.setdefault('mills', []).append([(x + 3) * 16, (y + 2) * 16])
        elif kind == 'wreck':
            m.stamp(M.LM, 0, 0, x, y + 1, 10, 4, col=M.SOLID)
            m.stamp(M.LM, 10, 0, x + 8, y, 5, 4, col=M.SOLID)
        elif kind == 'tower':
            m.stamp(M.LM, 15 if (x + y) % 2 else 17, 0, x, y, 2, 2, col=M.SOLID)
            # a lookout at the end of its road: something to read when you get there
            m.sign(x, y + 1, {'stoneheath': 'An old watchtower. Carved by the door: "On a clear day you can see the castle. There are no clear days."',
                              'cinderpass': 'A signal tower. Its brazier went out years ago. Somebody has left a very small sandwich in it.',
                              'eastgate': 'The Eastgate lookout. A notice reads: "Lookout closed. Lookout has gone to look at something else."',
                              'cliffside': 'Cliffside Tower. From up here the sea goes on forever, which the keeper found very discouraging.'}.get(reg, 'An old watchtower, long empty.'))
        elif kind == 'ruin':
            m.stamp(M.LM, 19, 0, x, y, 4, 2, col=M.SOLID)
    if not shadow:
        for i, (reg, at, items, note) in enumerate(CAVES):
            m, x, y = local(new, reg, at)
            M.secret_cave(m, x, y, 'grotto%d' % (20 + i), items, note)
        for (reg, at, look, lines) in PEOPLE:
            m, x, y = local(new, reg, at)
            x, y = nearest_open(m, x, y, M)
            m.spawn('villager', x, y, look=look, roam=10, talk=[[None, lines]])
    for q in (QUESTS if not shadow else SHADOW_QUESTS):
        (qid, reg, at, look, who, before, after, need, sets, reward), ex = q[:10], (q[10] if len(q) > 10 else {})
        m, x, y = local(every, reg, at)
        x, y = nearest_open(m, x, y, M)
        quest = {'id': qid, 'need': need, 'set': sets, 'reward': reward, 'before': before, 'after': after}
        quest.update({k: v for k, v in ex.items() if k not in ('dig', 'ghost')})
        kw = {'ghost': True} if ex.get('ghost') else {}
        m.spawn('villager', x, y, look=look, who=who, roam=0 if who != 'Dog' else 6, dir=2, quest=quest, talk=[[None, before]], **kw)
        if ex.get('dig'):   # something buried for this quest
            _, dx, dy = local(every, reg, ex['dig'])
            dx, dy = nearest_open(m, dx, dy, M)
            m.extra.setdefault('digs', {})['%d,%d' % (dx, dy)] = need
    if not shadow:
        pass
    for tname, t in (TOWNS_BUILT.items() if not shadow else []):
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
    for (hid, name, reg, at, kind, look, lines) in (HOMES if not shadow else []):
        m, x, y = local(new, reg, at)
        out.append(build_house(M, m, x, y, hid, name, kind, look, lines, 'bottles' if hid == 'wf_witch' else None))
    for (did, name, reg, at, theme, item, reward, mini, boss, gate) in DUNGEONS_NEW:
        if not mine(reg):
            continue
        m, x, y = local(every, reg, at)
        m.stamp(M.OW, 4, 31, x, y, 4, 3, col=M.SOLID)
        m.warp(x + 1, y + 2, did, 23, 25, 0)
        m.warp(x + 2, y + 2, did, 24, 25, 0)
        d = M.make_dungeon(did, name, (m.id, x + 1, y + 3), theme, item, reward, mini, boss, getattr(M, gate))
        if not reg.startswith('s_'):
            d.extra['shadow'] = False
        out.append(d)
    if not shadow:
        build_castle(M, *local(every, CASTLE[0], CASTLE[1]), CASTLE[2], CASTLE[3])
    elif CASTLE_DOOR:
        # the Shadow Keep: Ashford Castle's dark twin. Its door stays shut until all seven Crystals are held
        m = next(x for x in every if x.id == 's_' + CASTLE[0])
        dx, dy = CASTLE_DOOR
        for i, c in enumerate(m.col):
            if c == M.BARRIER:
                m.col[i] = M.SOLID
        for x in (dx, dx + 1):
            m.col[dy * m.w + x] = M.SOLID
            m.signs.pop('%d,%d' % (x, dy), None)
        before = m.snapshot()
        for x in (dx, dx + 1):
            m.col[dy * m.w + x] = M.OPEN
            m.col[(dy + 1) * m.w + x] = M.OPEN
        m.warp(dx, dy, 'keep', 23, 25, 0)
        m.warp(dx + 1, dy, 'keep', 24, 25, 0)
        m.variant('crystals', before)
        m.sign(dx + 3, dy + 2, 'SHADOW KEEP|Seven crystal-shaped hollows are set into the gate.')
    for (did, reg, at) in (MOVED_DUNGEONS if not shadow else []):
        m, x, y = local(every, reg, at)
        if did == 'ruins1':
            m.stamp(M.OW, 4, 31, x, y, 4, 3, col=M.SOLID)        # the ruined gate
            m.warp(x + 1, y + 2, did, 23, 25, 0)
            m.warp(x + 2, y + 2, did, 24, 25, 0)
            m.sign(x + 3, y + 3, 'MEADOW RUINS|Keep out. By order of Chancellor Vex.')
            MOVED_AT[did] = (m.id, x + 2, y + 3)
        else:
            # a reedy pool in the lake shallows: the Sunken Shrine's gate lies under it until the sluice upstream is shut
            for j in range(7):
                for i in range(10):
                    X, Y = x + i, y + j
                    edge = i in (0, 9) or j in (0, 6)
                    if edge:
                        M.grass(m, X, Y, X, Y); m.layers['deco'][Y * m.w + X] = -1; m.col[Y * m.w + X] = M.OPEN
                    else:
                        m.layers['deco'][Y * m.w + X] = -1; m.layers['over'][Y * m.w + X] = -1
                        m.put('ground', M.NW, 1, 7, X, Y); m.col[Y * m.w + X] = M.DEEP
            m.sign(x + 1, y + 6, 'MIRROR POOL|They say a shrine sleeps under here. They also say the water drops when the sluice upstream is shut.')
            before = m.snapshot()
            for j in range(1, 6):
                for i in range(1, 9):
                    X, Y = x + i, y + j
                    m.put('ground', M.OW, 12, 13, X, Y); m.col[Y * m.w + X] = M.OPEN
            m.stamp(M.OW, 4, 31, x + 3, y + 1, 4, 3, col=M.SOLID)
            m.warp(x + 4, y + 3, did, 23, 25, 0)
            m.warp(x + 5, y + 3, did, 24, 25, 0)
            m.variant('sluice', before)
            MOVED_AT[did] = (m.id, x + 5, y + 6)      # out on the rim (dry even before the pool drains)
    for i, (reg, at, sh_) in enumerate(FOUNTAINS):
        if not mine(reg):
            continue
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
    free = lambda x, y: nm.ok(x, y) and nm.col[y * nm.w + x] == M.OPEN
    moved = {}
    for k in list(nm.chests):           # a chest boxed in by things carried from elsewhere moves to the nearest clear spot
        x, y = map(int, k.split(','))
        if not (free(x - 1, y + 1) or free(x + 1, y + 1) or free(x, y + 2)):
            best = min(((abs(a - x) + abs(b - y), a, b) for b in range(3, nm.h - 3) for a in range(3, nm.w - 3)
                        if free(a, b) and free(a, b + 1) and free(a - 1, b + 1) and free(a + 1, b + 1) and free(a, b + 2)), default=None)
            if best:
                v = nm.chests.pop(k); nk = '%d,%d' % (best[1], best[2]); nm.chests[nk] = v
                i0, i1 = y * nm.w + x, best[2] * nm.w + best[1]
                nm.layers['deco'][i1], nm.col[i1] = nm.layers['deco'][i0], nm.col[i0]
                nm.layers['deco'][i0], nm.col[i0] = -1, M.OPEN
    for k in nm.chests:                 # a chest is opened from below: keep that tile clear
        x, y = map(int, k.split(','))
        if nm.ok(x, y + 1) and nm.col[(y + 1) * nm.w + x] in (M.SOLID, M.ROCK, M.BUSH, M.DEEP, M.PIT):
            nm.col[(y + 1) * nm.w + x] = M.OPEN
            nm.layers['deco'][(y + 1) * nm.w + x] = -1
            nm.layers['over'][(y + 1) * nm.w + x] = -1
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
