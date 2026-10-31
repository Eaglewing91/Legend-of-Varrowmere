"""Inside places: furnished houses, shops, cellars, secret caves and fairy fountains.

Furniture comes from the Ninja Adventure interior art (in the patched Inner sheet) and the pack's house tileset.
A room's floor is 12 x 10 tiles (x 2..13, y 3..12); layouts are drawn as 10 rows of 12 characters, each piece
written by its letter at its top-left corner (the rest of its footprint left as '.'). Pieces that would cover a
person, a chest, the doorway or the way between them are left out, and every room is checked to be walkable."""
import random

IN, NH, NI, CV = 1, 8, 12, 2        # sheets: patched Inner, pack houses, pack interior floors, cave

# letter: (sheet, tx, ty, w, h, solid)
PIECES = {
    'B': (IN, 16, 1, 2, 3, True), 'b': (IN, 18, 1, 1, 3, True), 'p': (IN, 19, 1, 1, 3, True), 'D': (IN, 20, 1, 2, 3, True),
    'T': (IN, 10, 1, 3, 3, True), 'R': (IN, 13, 1, 3, 3, True), 't': (IN, 6, 9, 3, 3, True), 'C': (IN, 10, 7, 3, 3, True),
    'N': (IN, 14, 7, 3, 2, True), 'n': (IN, 14, 9, 3, 1, True), 'h': (IN, 15, 5, 1, 2, True), 'j': (IN, 16, 5, 1, 2, True),
    'k': (IN, 17, 5, 1, 2, True), 'l': (IN, 18, 5, 1, 2, True), 'S': (IN, 3, 12, 2, 2, True), 'd': (IN, 5, 13, 1, 2, True),
    'W': (IN, 6, 12, 2, 4, True), 'E': (IN, 0, 12, 3, 3, True), 'O': (IN, 12, 10, 2, 2, True), 'G': (IN, 0, 7, 3, 3, False),
    'g': (IN, 0, 10, 2, 2, False), 'P': (IN, 8, 13, 1, 1, True), 'q': (IN, 11, 11, 1, 1, True),
    'X': (NH, 16, 15, 1, 1, True), 'x': (NH, 17, 15, 1, 1, True), 'Y': (NH, 17, 13, 1, 1, True), 'Z': (NH, 18, 13, 1, 1, True),
    'y': (NH, 16, 13, 1, 1, True), 's': (NH, 16, 12, 1, 1, True), 'K': (NH, 19, 10, 2, 4, True), 'U': (NH, 19, 14, 1, 1, True),
    'u': (NH, 20, 14, 1, 1, True), 'A': (NH, 14, 11, 2, 1, True), 'a': (NH, 14, 13, 2, 1, True), 'F': (NH, 3, 15, 2, 2, True),
    'f': (NH, 0, 15, 1, 3, True), 'H': (NH, 1, 15, 2, 3, True), 'V': (NH, 21, 12, 1, 1, True), 'v': (NH, 21, 14, 1, 1, True),
    'Q': (IN, 2, 15, 2, 3, None),       # stairs down to a cellar (walk onto them)
}
# what hangs on the back wall (row y = 1, tiles drawn over the wall face)
WALL = {'frame': (IN, 12, 0, 2, 1), 'picture': (IN, 11, 4, 1, 2), 'banner1': (NH, 22, 20, 1, 2), 'banner2': (NH, 23, 20, 1, 2),
        'banner3': (NH, 25, 20, 1, 2), 'banner4': (NH, 26, 20, 1, 2), 'jar1': (NH, 20, 18, 1, 1), 'jar2': (NH, 21, 18, 1, 1)}
FLOORS = {'wood': (IN, 0, 4, 1, 1), 'cobble': (NI, 5, 13, 2, 2), 'dark': (NI, 16, 13, 2, 2), 'light': (NI, 5, 1, 2, 2),
          'warm': (NI, 5, 7, 2, 2), 'sand': (NI, 16, 1, 2, 2), 'green': (NI, 16, 7, 2, 2), 'tiles': (NI, 19, 2, 2, 2), 'moss': (NI, 19, 8, 2, 2)}

L = lambda s: [r.strip() for r in s.strip('\n').split('\n')]
LAYOUTS = {
    'house': [L("""
B.S.....W.d.
............
............
............
R...........
..........P.
............
X........E..
............
............"""), L("""
D.......C...
............
..........q.
............
.......t....
G...........
............
..........S.
............
Y..........."""), L("""
b.p.....T...
............
............
...........P
R...........
............
............
W.........E.
............
............"""), L("""
B...E.....S.
............
............
X...........
............
.........R..
g...........
............
..........y.
P..........."""), L("""
S.S.....d.b.
............
............
............
t...........
............
............
G........W..
............
............""")],
    'inn': [L("""
b.b.b...b.p.
............
............
............
R.........P.
............
............
N........t..
............
X..........."""), L("""
p.b.p.....D.
............
............
............
...........P
t.......R...
............
............
G...........
............""")],
    'tavern': [L("""
K.........K.
............
............
............
............
R.......R...
............
............
X.........x.
............"""), L("""
K..X.....K..
............
............
............
............
..R.....t...
............
............
N...........
...........P""")],
    'shop': [L("""
U.u.V....s.Y
............
............
............
............
............
X..........x
............
..........q.
P..........."""), L("""
Y.Z.y....U.u
............
............
............
............
............
s..........s
............
P..........P
............""")],
    'smith': [L("""
A...O.....A.
............
............
............
............
............
X..........x
............
..........a.
............"""), L("""
a...O.....U.
............
............
............
............
............
A........X..
............
............
x...........""")],
    'library': [L("""
S.S.S...S.S.
............
............
............
G..........P
............
T...........
............
..........q.
P..........."""), L("""
S.S.....S.S.
............
............
F...........
............
.........F..
............
............
d..........d
............""")],
    'cellar': [L("""
X.x.Y.....s.
............
............
............
............
..........U.
............
y...........
............
............""")],
}
WALLDECOR = {'house': ['frame', 'picture', 'jar1'], 'inn': ['frame', 'picture', 'jar2'], 'tavern': ['banner1', 'banner2', 'jar1'],
             'shop': ['banner3', 'banner4', 'jar2'], 'smith': ['banner2', 'banner4'], 'library': ['picture', 'frame', 'banner3'], 'cellar': []}
FLOOR_OF = {'house': ['wood', 'light', 'warm', 'wood'], 'inn': ['wood', 'warm'], 'tavern': ['wood', 'cobble'], 'shop': ['warm', 'sand', 'light'],
            'smith': ['dark', 'cobble'], 'library': ['green', 'tiles', 'moss'], 'cellar': ['cobble', 'dark']}
# houses with a cellar under them (stairs down), and what's stored down there
CELLARS = {'mg_house': ['cash50', 'arrows'], 'bh_house2': ['bombs', 'cash20'], 'dm_house2': ['cash100'], 'oak_house': ['arrows', 'cash50'],
           'heath_hermit': ['cash50', 'bombs'], 'eastgate_house': ['cash20', 'arrows'], 'lumber': ['bombs', 'cash50'], 'bh_elder': ['cash100']}
DESERT = ('dm_', 'ds_')


def seed_of(mid):
    return sum(ord(c) * (i + 3) for i, c in enumerate(mid))


def floor(M, m, style, x0, y0, x1, y1):
    sh, tx, ty, w, h = FLOORS[style]
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            m.put('ground', sh, tx + (x % w), ty + (y % h), x, y)


def place(M, m, ch, x, y):
    sh, tx, ty, w, h, solid = PIECES[ch]
    for j in range(h):
        for i in range(w):
            if solid is False:
                m.put('ground', sh, tx + i, ty + j, x + i, y + j)
            else:
                m.put('deco', sh, tx + i, ty + j, x + i, y + j)
                m.col[(y + j) * m.w + x + i] = M.SOLID if solid else M.OPEN


def furnish(M, m, mid, kind, reserved, x0=2, y0=3):
    """Lay furniture from one of the kind's layouts (chosen by the place's name), keeping clear of the reserved cells
    and the way from the door to every reserved cell. Returns where cellar stairs went, if any."""
    kinds = LAYOUTS.get(kind) or LAYOUTS['house']
    s = seed_of(mid)
    style = FLOOR_OF.get(kind, FLOOR_OF['house'])
    fl = 'sand' if mid.startswith(DESERT) and kind == 'house' else style[s % len(style)]
    floor(M, m, fl, x0, y0, x0 + 11, y0 + 9)
    lay = kinds[s % len(kinds)]
    if (s // 7) % 2:
        lay = [r[::-1] for r in lay]      # mirrored for more variety; letters still mark top-left, so re-anchor
        lay = remirror(lay)
    door = {(7, m.h - 2), (8, m.h - 2), (7, m.h - 3), (8, m.h - 3)}
    keep = set(reserved) | door
    placed = []
    stairs = None
    want_cellar = mid in CELLARS
    for r, row in enumerate(lay):
        for c, ch in enumerate(row):
            if ch not in PIECES:
                continue
            sh, tx, ty, w, h, solid = PIECES[ch]
            x, y = x0 + c, y0 + r
            cells = {(x + i, y + j) for i in range(w) for j in range(h)}
            if any(not (x0 <= a <= x0 + 11 and y0 <= b <= y0 + 9) for (a, b) in cells):
                continue
            if solid is not False and cells & keep:
                continue
            if solid is not False and any(m.col[b * m.w + a] != M.OPEN for (a, b) in cells):
                continue
            place(M, m, ch, x, y)
            placed.append((ch, x, y, cells))
            if solid is not False and not walkable(M, m, keep):
                unplace(M, m, ch, x, y, fl)
                placed.pop()
    if want_cellar:
        for (x, y) in [(x0 + 10, y0), (x0, y0), (x0 + 8, y0), (x0 + 2, y0)]:
            cells = {(x + i, y + j) for i in range(2) for j in range(3)}
            if not cells & keep and all(m.col[b * m.w + a] == M.OPEN for (a, b) in cells):
                place(M, m, 'Q', x, y)
                for (a, b) in cells:
                    m.col[b * m.w + a] = M.SOLID
                m.col[(y + 2) * m.w + x] = M.OPEN; m.col[(y + 2) * m.w + x + 1] = M.OPEN
                if walkable(M, m, keep | {(x, y + 2)}):
                    stairs = (x, y + 2)
                    break
                unplace(M, m, 'Q', x, y, fl)
    # the back wall: a picture or two, banners, jars
    deco = WALLDECOR.get(kind, [])
    spots = [3, 6, 10, 12, 4, 11]
    for k, name in enumerate(deco):
        sh, tx, ty, w, h = WALL[name]
        x = spots[(s + k * 3) % len(spots)]
        if all(m.layers['deco'][1 * m.w + x + i] < 0 for i in range(w)):
            for i in range(w):
                for j in range(h):
                    m.put('deco', sh, tx + i, ty + j, x + i, 1 + j)
    return stairs


def remirror(lay):
    """After flipping a layout left-right, move each piece's letter back to its new top-left corner."""
    out = [['.'] * 12 for _ in range(10)]
    for r, row in enumerate(lay):
        for c, ch in enumerate(row):
            if ch in PIECES:
                w = PIECES[ch][3]
                nc = c - (w - 1)
                if 0 <= nc < 12:
                    out[r][nc] = ch
    return [''.join(r) for r in out]


def unplace(M, m, ch, x, y, fl):
    sh, tx, ty, w, h, solid = PIECES[ch]
    for j in range(h):
        for i in range(w):
            m.layers['deco'][(y + j) * m.w + x + i] = -1
            m.col[(y + j) * m.w + x + i] = M.OPEN
    floor(M, m, fl, x, y, x + w - 1, y + h - 1)


def walkable(M, m, keep):
    """From the doorway, every kept cell (or a cell beside it) can be reached on foot."""
    start = (7, m.h - 2)
    seen = {start}
    q = [start]
    while q:
        x, y = q.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p = (x + dx, y + dy)
            if p not in seen and m.ok(*p) and m.col[p[1] * m.w + p[0]] in (M.OPEN, M.PLATE, M.LOW):
                seen.add(p); q.append(p)
    for (x, y) in keep:
        if (x, y) not in seen and not any((x + a, y + b) in seen for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            return False
    return True


def cellar(M, mid, name, back, items):
    """A storeroom under a house: barrels, sacks, a few chests, and a rat or two."""
    c = M.Map(mid + '_cellar', 16, 14, name + ' (cellar)', indoor=True, music='cave')
    M.room(c, 0, 0)
    c.extra['wallmat'] = 'dark'
    keep = set()
    for k, it in enumerate(items):
        x, y = 4 + k * 4, 5
        c.chest(x, y, it)
        keep |= {(x, y), (x, y + 1)}
    sx, sy = 7, 4
    for j in range(2):
        for i in range(2):
            c.put('deco', IN, i, 15 + j, sx + i, sy - 1 + j)
    c.solid(sx, sy - 1, 2, 1, M.SOLID)
    c.warp(sx, sy, back[0], back[1], back[2], 2); c.warp(sx + 1, sy, back[0], back[1], back[2], 2)
    keep |= {(sx, sy), (sx + 1, sy), (sx, sy + 1), (sx + 1, sy + 1)}
    lay = LAYOUTS['cellar'][0]
    for r, row in enumerate(lay):
        for col, ch in enumerate(row):
            if ch in PIECES:
                x, y = 2 + col, 3 + r
                w, h = PIECES[ch][3], PIECES[ch][4]
                cells = {(x + i, y + j) for i in range(w) for j in range(h)}
                if not cells & keep and all(c.col[b * c.w + a] == M.OPEN for (a, b) in cells):
                    place(M, c, ch, x, y)
    for (x, y) in ((4, 10), (11, 9)):
        c.spawn('mouse', x, y)
    c.entry = [sx, sy + 1]
    return c


# ---------------------------------------------------------------------------------------------------------------
# Secret caves. Each is a small dungeon-like place of one to four screens with a reason to go in. Rooms are drawn
# with the dungeon room language (tools/dungeons.py); 'I' marks where the cave's own treasures go, in order.
from dungeons import T
CAVE_ROOMS = {
    'stash': T("""
..............
..#I#....#I#..
..#.#....#.#..
..............
..............
..e........e..
..............
..y........y..
..............
..............""" ),
    'plate_a': T("""
..............
..............
...B......B...
..............
...P......P...
..............
..e...........
..............
..............
.............."""),
    'vault': T("""
..............
..I...I...I...
..............
..............
..............
...y......y...
..............
..............
..............
.............."""),
    'dark_a': T("""
.t..........t.
..............
..##......##..
..............
..............
..e........e..
..##......##..
..............
.t..........t.
.............."""),
    'pit_hall': T("""
.L..........L.
..............
..~~~....~~~..
..~~~.e..~~~..
..............
..............
..~~~....~~~..
..~~~....~~~..
..............
.............."""),
    'gaunt_a': T("""
..............
..#........#..
.....e..e.....
..............
..............
..............
..e........e..
..#........#..
..............
.............."""),
    'gaunt_b': T("""
..............
.#..#....#..#.
..............
...e......e...
..............
..............
...e......e...
.#..#....#..#.
..............
.............."""),
    'up': T("""
..............
..^...........
..............
..#........#..
..............
..............
..#........#..
..e...........
..............
.............."""),
    'paradox': T("""
..............
.I.I......I.I.
..............
..............
..^...........
..............
..e........e..
..............
..............
.............."""),
    'shopcave': T("""
..............
..s........y..
..............
..............
..............
..............
..x........x..
..............
..............
.............."""),
    'crack_nook': T("""
..............
..y....I......
..............
..#........#..
..............
..............
..#........#..
..............
..............
..............""")}
# cave plans: rooms left to right (all on one floor) or [floor1, floor2] joined by stairs; doors between neighbours
CAVES = {
    'stash':    dict(rooms=['stash'], doors=[]),
    'puzzle':   dict(rooms=['plate_a', 'vault'], doors=['shut']),
    'torches':  dict(rooms=['dark_a', 'vault'], doors=['shut'], dark=True),
    'gauntlet': dict(rooms=['gaunt_a', 'gaunt_b', 'pit_hall', 'vault'], doors=['shut', 'shut', 'open']),
    'paradox':  dict(rooms=['up', 'gaunt_a'], doors=['open'], upper=['paradox', 'vault'], updoors=['open']),
    'bombs':    dict(rooms=['gaunt_a', 'crack_nook'], doors=['crack']),
    'shop':     dict(rooms=['shopcave'], doors=[], shop=True),
}
CAVE_ORDER = ['puzzle', 'stash', 'torches', 'gauntlet', 'bombs', 'paradox', 'shop', 'puzzle', 'torches', 'stash', 'gauntlet', 'paradox', 'bombs', 'stash', 'torches', 'puzzle', 'gauntlet']
CAVE_FOES = ['bluebat', 'skull', 'slime', 'spiderred', 'snake']


def grotto(M, gid, items, text, back, n, shadow):
    """Build one secret cave (one or two maps). back = (map, x, y) outside. Returns the maps; the first is the way in."""
    kind = CAVE_ORDER[n % len(CAVE_ORDER)]
    P = CAVES[kind]
    R = random.Random(gid)
    floors = [(P['rooms'], P['doors'])] + ([(P['upper'], P['updoors'])] if P.get('upper') else [])
    maps = []
    items = list(items)
    extra = ['cash20', 'arrows', 'bombs', 'cash50']
    for fi, (rooms, doors) in enumerate(floors):
        g = M.Map(gid if fi == 0 else gid + '_up', 16 * len(rooms), 14, 'Hidden Cave' if kind != 'shop' else 'Secret Shop', indoor=True, music='cave')
        g.extra.update({'wallmat': 'dark' if shadow else 'moss', 'triggers': [], 'cave': kind, 'floorName': None})
        if shadow:
            g.extra['shadow'] = True
        if P.get('dark'):
            g.dark = True
        for i, rk in enumerate(rooms):
            M.room(g, i, 0)
        foe_n = 0
        for i, rk in enumerate(rooms):
            X, Y = i * 16 + 1, 3
            for r, row in enumerate(CAVE_ROOMS[rk]):
                for c, ch in enumerate(row):
                    x, y = X + c, Y + r
                    if ch == '#':
                        g.col[y * g.w + x] = M.SOLID; g.put('ground', IN, 1, 1, x, y)
                    elif ch == '~':
                        g.col[y * g.w + x] = M.PIT; g.put('ground', CV, 1, 1, x, y)
                    elif ch == 'B':
                        g.solid(x, y, 1, 1, M.BLOCK)
                    elif ch == 'P':
                        g.solid(x, y, 1, 1, M.PLATE); g.extra.setdefault('plates', []).append([x, y])
                    elif ch == 't':
                        g.solid(x, y, 1, 1, M.TORCH)
                    elif ch == 'L':
                        g.solid(x, y, 1, 1, M.TORCH_LIT)
                    elif ch == 'e':
                        g.spawn(CAVE_FOES[(foe_n + n) % len(CAVE_FOES)], x, y); foe_n += 1
                    elif ch == 'I':
                        g.chest(x, y, items.pop(0) if items else extra[(x + y) % len(extra)])
                    elif ch == 'y':
                        g.chest(x, y, extra[(x * 3 + y) % len(extra)]) if kind != 'shop' else None
                    elif ch in 'sx' and kind == 'shop':
                        g.put('deco', NH, 16 if ch == 's' else 17, 12 if ch == 's' else 15, x, y); g.col[y * g.w + x] = M.SOLID
                    elif ch == '^':
                        g.extra.setdefault('stairs', []).append([x, y, 1 if fi == 0 else 0])
            # doors to the next room
            if i + 1 < len(rooms):
                kind_d = doors[i]
                if kind_d == 'open':
                    M.door(g, i, 0, 'e'); M.door(g, i + 1, 0, 'w')
                elif kind_d == 'shut':
                    M.door(g, i, 0, 'e', M.SHUTTER, 'c%d' % i); M.door(g, i + 1, 0, 'w')
                    tor = [[X + c, Y + r] for r, row in enumerate(CAVE_ROOMS[rk]) for c, ch in enumerate(row) if ch == 't']
                    pl = [[X + c, Y + r] for r, row in enumerate(CAVE_ROOMS[rk]) for c, ch in enumerate(row) if ch == 'P']
                    if tor:
                        g.extra['triggers'].append({'type': 'torches', 'at': tor, 'open': 'c%d' % i})
                    elif pl:
                        g.extra['triggers'].append({'type': 'plate', 'at': pl, 'open': 'c%d' % i})
                    else:
                        g.extra['triggers'].append({'type': 'clear', 'area': i, 'open': 'c%d' % i})
                elif kind_d == 'crack':
                    M.door(g, i, 0, 'e'); M.door(g, i + 1, 0, 'w')
                    g.solid(i * 16 + 15, 7, 1, 2, M.CRACK)
        # leftover treasures go in the last room's free corners
        for it in items[:]:
            for (x, y) in ((g.w - 4, 4), (g.w - 6, 4), (g.w - 4, 8)):
                if g.col[y * g.w + x] == M.OPEN and '%d,%d' % (x, y) not in g.chests:
                    g.chest(x, y, it); items.remove(it); break
        if kind == 'shop':
            g.spawn('villager', 7, 5, look='trader', roam=0, dir=2, shop=['bigaid', 'energy', 'bombs10', 'arrows30'],
                    talk=[[None, ['Shh. You did not see this shop. Prices are low because the rent is zero.']]])
        g.sign(4 if kind != 'shop' else 11, 11, text)
        maps.append(g)
    g0 = maps[0]
    M.door(g0, 0, 0, 's')
    g0.warp(7, 13, back[0], back[1], back[2], 2); g0.warp(8, 13, back[0], back[1], back[2], 2)
    g0.entry = [7, 11]
    if len(maps) > 1:          # stairs between the two levels
        a, b = g0.extra['stairs'][0], maps[1].extra['stairs'][0]
        g0.warp(a[0], a[1], maps[1].id, b[0], b[1] + 1, 2)
        maps[1].warp(b[0], b[1], g0.id, a[0], a[1] + 1, 2)
        maps[1].entry = [b[0], b[1] + 1]
    return maps


# ---------------------------------------------------------------------------------------------------------------
# Fairy fountains: three looks, and three Great Fairies
GREAT = {3: 'plenty', 11: 'valour', 19: 'fortune'}
FOUNTAIN_LOOK = ['spring', 'crystal', 'shrine']
# what each shop sells (the counter keeper of these places); see LV.STOCK in src/39-places.js
SHOP_STOCK = {'mg_store': ['firstaid', 'arrows10', 'bombs5', 'energy', 'redfill'], 'bh_smith': ['arrows30', 'bombs10', 'firstaid', 'shieldfix'],
              'dm_trader': ['bigaid', 'energy', 'greenfill', 'redfill'], 'greenmarch_inn': ['firstaid', 'bigaid', 'energy'],
              'bh_inn': ['firstaid', 'energy'], 'dm_inn': ['firstaid', 'bigaid', 'energy']}
