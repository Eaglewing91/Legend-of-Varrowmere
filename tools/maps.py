"""Map builder for Legend of Varrowmere.

Maps are authored here in Python with stamps from the CC0 art pack, then written to src/data/maps.json.
Each map has three art layers (ground, deco under actors, over above actors), a collision grid,
camera areas (one per screen, like the original), warps, signs, chests and spawns.

Tile reference: sheet << 16 | ty << 8 | tx, or -1 for empty.
Sheets: 0 Overworld, 1 Inner, 2 cave, 3 objects.
Collision codes: 0 open, 1 solid, 2 deep water, 3 pit, 4 ledge (jump south), 5 low wall (blocks walking, not arrows),
                 6 bush (solid, cuttable, liftable), 7 rock (solid, liftable), 8 shallow water.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import blend as BLEND
BLEND.build()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
OW, IN, CV, OB = 0, 1, 2, 3
NF, NN = 4, 5          # Ninja Adventure floor and nature sheets
BL = 6                 # generated soft-edge ground transitions (tools/blend.py)
NW, NH, NR, NE, ND, NI = 7, 8, 9, 10, 11, 12   # pack water, houses, cliffs, elements, floor details, interior floors
OPEN, SOLID, DEEP, PIT, LEDGE, LOW, BUSH, ROCK, SHALLOW, CRACK, TORCH, TORCH_LIT, LOCKED, BIGLOCK, BLOCK, PLATE, SHUTTER, BIGCHEST, LEVER, SWITCH, POST, _21, PEDESTAL, BARRIER, PEG, DARKROCK = range(26)



def ref(sheet, tx, ty):
    return sheet << 16 | ty << 8 | tx


class Map:
    def __init__(self, mid, w, h, name, indoor=False, dark=False, music='village'):
        self.id, self.w, self.h, self.name = mid, w, h, name
        self.layers = {k: [-1] * (w * h) for k in ('ground', 'deco', 'over')}
        self.col = [OPEN] * (w * h)
        self.areas, self.warps, self.signs, self.chests, self.spawns = [], [], {}, {}, []
        self.indoor, self.dark, self.music = indoor, dark, music
        self.entry = [2, 2]
        self.extra = {}

    def ok(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def put(self, layer, sheet, tx, ty, x, y):
        if self.ok(x, y):
            self.layers[layer][y * self.w + x] = ref(sheet, tx, ty)

    def stamp(self, sheet, tx, ty, x, y, w=1, h=1, layer='deco', col=None):
        for j in range(h):
            for i in range(w):
                self.put(layer, sheet, tx + i, ty + j, x + i, y + j)
        if col is not None:
            self.solid(x, y, w, h, col)

    def fill(self, sheet, tx, ty, x0=0, y0=0, x1=None, y1=None, layer='ground'):
        x1 = self.w - 1 if x1 is None else x1
        y1 = self.h - 1 if y1 is None else y1
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(layer, sheet, tx, ty, x, y)

    def nine(self, sheet, tx, ty, x0, y0, x1, y1, layer='ground', col=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                cx = 0 if x == x0 else 2 if x == x1 else 1
                cy = 0 if y == y0 else 2 if y == y1 else 1
                self.put(layer, sheet, tx + cx, ty + cy, x, y)
                if col is not None and self.ok(x, y):
                    self.col[y * self.w + x] = col

    def solid(self, x, y, w=1, h=1, code=SOLID):
        for j in range(h):
            for i in range(w):
                if self.ok(x + i, y + j):
                    self.col[(y + j) * self.w + x + i] = code

    def area(self, x, y, w=16, h=14):
        self.areas.append([x, y, w, h])

    def warp(self, x, y, to, tx, ty, dir=2):
        self.warps.append({'x': x, 'y': y, 'to': to, 'tx': tx, 'ty': ty, 'dir': dir})
        self.solid(x, y, 1, 1, OPEN)

    def sign(self, x, y, text):
        self.signs['%d,%d' % (x, y)] = text

    def chest(self, x, y, item, big=False):
        self.chests['%d,%d' % (x, y)] = {'item': item, 'big': big}
        self.stamp(OB, 0, 0, x, y, layer='deco', col=SOLID)

    def spawn(self, kind, x, y, **kw):
        d = {'kind': kind, 'x': x, 'y': y}
        d.update(kw)
        self.spawns.append(d)

    def snapshot(self):
        import copy
        return copy.deepcopy(self.layers), list(self.col), copy.deepcopy(self.warps)

    def variant(self, when, before):
        """Record what changed since snapshot() as a variant applied when a story flag is set, then undo it."""
        layers, col, warps = before
        ch = {'when': when, 'tiles': [], 'col': [], 'warps': [w for w in self.warps if w not in warps]}
        for name in self.layers:
            for i, (a, b) in enumerate(zip(layers[name], self.layers[name])):
                if a != b: ch['tiles'].append([name, i, b])
        for i, (a, b) in enumerate(zip(col, self.col)):
            if a != b: ch['col'].append([i, b])
        self.layers, self.col, self.warps = layers, col, warps
        self.extra.setdefault('variants', []).append(ch)

    def unpoke(self):
        """Border rocks and trees that poke into the land are taken back out wherever they would crowd a chest,
        sign, door, dig spot or person: the border behind them is filled with small rocks instead."""
        spots = [tuple(map(int, k.split(','))) for d in (self.chests, self.signs, self.extra.get('digs', {})) for k in d]
        spots += [(w['x'], w['y']) for w in self.warps] + [(d['x'], d['y']) for d in self.spawns if 'x' in d]
        for pk in getattr(self, 'pokes', []):
            if not any(abs(px - sx) <= 2 and abs(py - sy) <= 2 for (px, py) in pk['poke'] for (sx, sy) in spots):
                continue
            for (x, y) in pk['cells']:
                if not self.ok(x, y):
                    continue
                i = y * self.w + x
                self.layers['deco'][i] = self.layers['over'][i] = -1
                if (x, y) in pk['poke']:
                    self.col[i] = OPEN
                else:
                    tx, ty = pk['small'][(x + y) % len(pk['small'])]
                    self.put('deco', NN, tx, ty, x, y)
        self.pokes = []

    def json(self):
        self.unpoke()
        naremap(self)
        return {'id': self.id, 'name': self.name, 'w': self.w, 'h': self.h, 'layers': self.layers, 'col': self.col,
                'areas': self.areas or [[0, 0, self.w, self.h]], 'warps': self.warps, 'signs': self.signs,
                'chests': self.chests, 'spawns': self.spawns, 'indoor': self.indoor, 'dark': self.dark,
                'music': self.music, 'entry': self.entry, **self.extra}


# ---------- stamps (art pack pieces with their collision) ----------
def grass(m, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            m.put('ground', OW, (x * 3 + y) % 2, 9 if (x * 5 + y * 3) % 7 else 31, x, y)


def road_ns(m, x, y0, y1):          # 2-wide stone road running north-south
    for y in range(y0, y1 + 1):
        m.put('ground', OW, 8, 23 if y % 2 else 24, x, y)
        m.put('ground', OW, 9, 23 if y % 2 else 24, x + 1, y)


def stone_pad(m, x0, y, x1):
    for x in range(x0, x1 + 1):
        m.put('ground', OW, 8, 23, x, y)


FOREST_CLUMPS = [(0, 2), (4, 2), (16, 2), (20, 2), (4, 2), (16, 2)]


def forest(m, x, y):                 # 4 wide tree block (two clumps of the pack's trees, one behind the other): solid below the top row
    for k, (oy, layer0) in enumerate(((0, 'over'), (3, None))):
        tx, ty = FOREST_CLUMPS[(x * 7 + y * 3 + k * 5) % len(FOREST_CLUMPS)]
        for j in range(3):
            for i in range(4):
                layer = layer0 or ('over' if j == 0 else 'deco')
                m.put(layer, NN, tx + i, ty + j, x + i, y + oy + j)
    m.solid(x, y + 3, 4, 3)
    m.solid(x, y + 1, 4, 2)


def house(m, x, y, door_to=None):    # 5x5 house, door at bottom middle
    m.stamp(OW, 6, 0, x, y, 5, 5, col=SOLID)
    if door_to:
        m.warp(x + 2, y + 4, *door_to)


def lake(m, x0, y0, x1, y1):
    m.nine(OW, 2, 6, x0, y0, x1, y1, col=DEEP)
    for x in range(x0, x1 + 1):     # the grassy bank row is walkable
        if m.ok(x, y0):
            m.col[y0 * m.w + x] = OPEN


def fence(m, x0, x1, y):
    # left end post, joined middle posts, right end post (rails meet tile to tile)
    for x in range(x0, x1 + 1):
        tx = 2 if x == x0 else 3 if x == x1 else 4
        m.stamp(OW, tx, 17, x, y, col=LOW)


def flowers(m, pts):
    for (x, y) in pts:
        m.put('deco', OW, 1, 8, x, y)


def bush(m, x, y):
    m.stamp(OW, 0, 16, x, y, col=BUSH)


def fountain(m, x, y):
    m.stamp(OW, 22, 9, x, y, 3, 3, col=SOLID)


def stall(m, x, y):
    m.stamp(OW, 18, 22, x, y, 5, 6)
    m.solid(x, y + 2, 5, 4)


def barrels(m, x, y):
    m.stamp(OW, 33, 0, x, y, 2, 2, col=SOLID)


def signboard(m, x, y, text):
    m.stamp(OW, 34, 2, x, y, 1, 1, col=SOLID)
    m.sign(x, y, text)


# ---------- region painting: author whole screens as text ----------
# .  grass        =  stone road      -  stone path      :  dry earth     ~  deep water (edges drawn automatically)
# F  forest wall  b  bush            r  boulder (Glove) O  big boulder (2x2, top-left)   *  flowers
# H  house (5x5, top-left; the door is the middle of its bottom row)   f  fence (ends joined)   |  fence post
# S  market stall (5x6, top-left)   W  fountain (3x3, top-left)   B  barrels (2x2)   p  pit
def ground_tile(m, gc, X, Y):
    if gc == ':':
        m.put('ground', OW, 12, 13, X, Y)
    elif gc in 'sw':
        r = (X * 7 + Y * 13) % 23
        if gc == 's':
            m.put('ground', NF, *((0, 4) if r == 0 else (1, 4) if r == 1 else (1, 1)), X, Y)
        else:
            m.put('ground', NF, *((0, 18) if r in (0, 5) else (1, 18) if r in (1, 9, 14) else (1, 15)), X, Y)


def paint(m, rows, ox=0, oy=0, base='.', grounds=None):
    H_ = len(rows)
    W_ = max(len(r) for r in rows)
    g = [r.ljust(W_, '.') for r in rows]
    g = round_corners(g) if grounds is None else g
    at = lambda x, y: g[y][x] if 0 <= y < H_ and 0 <= x < W_ else None
    grass(m, ox, oy, ox + W_ - 1, oy + H_ - 1)
    if grounds is not None:              # the world builder says what ground lies under every tile
        for y in range(H_):
            for x in range(W_):
                c = g[y][x]
                gc = c if c in 'sw' else grounds[y][x]
                if gc != '.' and c not in '~-=h':
                    ground_tile(m, gc, ox + x, oy + y)
    elif base in (':', 's', 'w'):          # dry, sandy and snowy lands: everything that isn't grass, water or road sits on the land's own ground
        for y in range(H_):
            for x in range(W_):
                if g[y][x] not in '.*b~-=':
                    X, Y = ox + x, oy + y
                    if base == ':':
                        m.put('ground', OW, 12, 13, X, Y)
                    else:
                        r = (X * 7 + Y * 13) % 23
                        if base == 's':
                            m.put('ground', NF, *((0, 4) if r == 0 else (1, 4) if r == 1 else (1, 1)), X, Y)
                        else:
                            m.put('ground', NF, *((0, 18) if r in (0, 5) else (1, 18) if r in (1, 9, 14) else (1, 15)), X, Y)
    band = set()
    for y in range(H_):
        for x in range(W_):
            if g[y][x] == 'O' and (x < 2 or y < 2 or x >= W_ - 2 or y >= H_ - 2):
                band.update({(ox + x + i, oy + y + j) for i in (0, 1) for j in (0, 1)})
    for y in range(H_):
        for x in range(W_):
            c, X, Y = g[y][x], ox + x, oy + y
            if c == '=':
                m.put('ground', OW, 8 + (X % 2), 23 if Y % 2 else 24, X, Y)
                m.col[Y * m.w + X] = OPEN
            elif c == '-':
                m.put('ground', OW, 8, 23, X, Y)
            elif c == ':':
                m.put('ground', OW, 12, 13, X, Y)
            elif c == 'h':                    # a plank bridge over water
                m.put('ground', NW, 1, 13, X, Y)
                m.col[Y * m.w + X] = OPEN
            elif c == '~':
                k = BLEND.mask(lambda a, b: at(a, b) in ('~', 'h', None), x, y)      # water with soft, foamy banks
                nb = [at(x + i, y + j) for i in (-1, 0, 1) for j in (-1, 0, 1)]
                pair = 5 if any(n in (':', '-', '=') for n in nb) else 6 if base == 's' and not any(n == '.' for n in nb) else 4
                m.put('ground', NW, 1, 7, X, Y) if k == 255 else m.put('ground', BL, k & 15, pair * 16 + (k >> 4), X, Y)
                m.col[Y * m.w + X] = DEEP
            elif c == '~':
                wet = lambda a, b: at(a, b) in ('~', None)
                cx = 0 if not wet(x - 1, y) else 2 if not wet(x + 1, y) else 1
                cy = 0 if not wet(x, y - 1) else 2 if not wet(x, y + 1) else 1
                m.put('ground', OW, 2 + cx, 6 + cy, X, Y)
                m.col[Y * m.w + X] = DEEP
            elif c == 'b':
                bush(m, X, Y)
            elif c == 'r':
                m.put('deco', CV, 5, 4, X, Y)
                m.col[Y * m.w + X] = ROCK
            elif c == '*':
                m.put('deco', OW, 1, 8, X, Y)
            elif c == 'p':
                m.put('ground', CV, 1, 1, X, Y)
                m.col[Y * m.w + X] = PIT
            elif c == 'x':
                m.put('deco', OW, 28, 2, X, Y)
            elif c == 'g':
                m.stamp(OW, 35, 5, X, Y, 2, 2, col=SOLID)
    if grounds is not None:
        soften_grounds(m, g, grounds, ox, oy)
    else:
        soften(m, g, ox, oy, base)
    paint_forest(m, g, ox, oy, base)
    if band:
        dress_border(m, g, ox, oy, base, band)
    rock = {(ox + x, oy + y) for y in range(H_) for x in range(W_) if g[y][x] == 'Q'}
    if rock:                            # rock masses: a packed jumble of the pack's rocks (and a tree or two)
        gb = grounds[0][0] if grounds else base
        kits = {}
        for (X, Y) in rock:
            gc = grounds[Y - oy][X - ox] if grounds else base
            kits.setdefault(gc, set()).add((X, Y))
        for gc, cells in kits.items():
            dress_border(m, g, ox, oy, gc, cells, BORDER_KITS.get(gc, BORDER_KITS['.']))
        void = gb
    for y in range(H_):
        for x in range(W_):
            c, X, Y = g[y][x], ox + x, oy + y
            if c == 'O' and (X, Y) in band:
                pass
            elif c == 'O':
                if base == 's':
                    m.stamp(NN, 12, 6, X, Y, 2, 2, col=SOLID)
                elif base in (':', 'w'):
                    m.stamp(NN, 16, 6, X, Y, 2, 2, col=SOLID)
                else:
                    boulder(m, X, Y)
            elif c == 'T' and (Y + 1 >= m.h or X + 1 >= m.w):
                pass
            elif c == 'T':          # a round tree from the pack (2x2): crown over the top row
                k = (X + Y) % 3
                tx, ty = ((8, 0) if k else (10, 0)) if base == 'w' else ((0, 0), (16, 0), (18, 0))[k]
                for i in range(2):
                    m.put('over', NN, tx + i, ty, X + i, Y)
                    m.put('deco', NN, tx + i, ty + 1, X + i, Y + 1)
                    m.col[(Y + 1) * m.w + X + i] = SOLID
            elif c == 'H':
                m.stamp(OW, 6, 0, X, Y, 5, 5, col=SOLID)
            elif c == 'S':
                stall(m, X, Y)
            elif c == 'W':
                fountain(m, X, Y)
            elif c == 'B':
                barrels(m, X, Y)
            elif c == 'f' and at(x - 1, y) != 'f':
                x1 = x
                while at(x1 + 1, y) == 'f':
                    x1 += 1
                fence(m, X, ox + x1, Y)
            elif c == '|':
                m.stamp(OW, 0, 17, X, Y, col=LOW)


def round_corners(g):
    """Square ponds and dirt patches lose their outermost corner tiles (when grass lies on both open sides),
    so with the soft blend tiles they read as rounded shapes rather than boxes."""
    H_, W_ = len(g), len(g[0])
    rows = [list(r) for r in g]
    at = lambda x, y: rows[y][x] if 0 <= y < H_ and 0 <= x < W_ else None
    for y in range(H_):            # first fill the notches of cross-shaped mud patches (mud is walkable, so this is safe)
        for x in range(W_):
            if rows[y][x] == '.' and sum(at(x + i, y + j) == ':' for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))) >= 2 and \
               any(at(x + i, y) == ':' and at(x, y + j) == ':' and at(x + i, y + j) == ':' for i in (-1, 1) for j in (-1, 1)):
                rows[y][x] = ':'
    g = [''.join(r) for r in rows]
    rows = [list(r) for r in g]
    at = lambda x, y: g[y][x] if 0 <= y < H_ and 0 <= x < W_ else None
    for y in range(H_):
        for x in range(W_):
            c = g[y][x]
            if c not in '~:':
                continue
            for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
                # a corner: open (grass) on both outward sides and diagonally, its own kind on both inward sides and beyond
                if at(x + dx, y) == '.' and at(x, y + dy) == '.' and at(x + dx, y + dy) == '.' and \
                   at(x - dx, y) == c and at(x, y - dy) == c and at(x - dx, y - dy) == c and at(x - 2 * dx, y) == c and at(x, y - 2 * dy) == c and at(x - 3 * dx, y) == c and at(x, y - 3 * dy) == c and \
                   not any(at(x + i, y + j) in ('f', '|') for i in (-2, -1, 0, 1, 2) for j in (-2, -1, 0, 1, 2)):
                    rows[y][x] = '.'
                    break
    return [''.join(r) for r in rows]


def soften_grounds(m, g, gr, ox, oy):
    """Blend edges when the ground changes inside one area: grass meeting sand, snow or rocky dirt, and dirt paths in grass."""
    H_, W_ = len(g), len(g[0])
    G = lambda x, y: (g[y][x] if g[y][x] in 'sw' else gr[y][x]) if 0 <= x < W_ and 0 <= y < H_ else None
    for y in range(H_):
        for x in range(W_):
            c = g[y][x]
            if c in '~h':
                continue
            if gr[y][x] == '.' and c in ':-=':
                k = BLEND.mask(lambda a, b: not (0 <= a < W_ and 0 <= b < H_) or g[b][a] in ':-=', x, y)
                if k != 255:
                    m.put('ground', BL, k & 15, (k >> 4), ox + x, oy + y)
                continue
            if G(x, y) != '.' or c in 'QFTOg_':
                continue
            others = [G(x + i, y + j) for i in (-1, 0, 1) for j in (-1, 0, 1)]
            kind = next((o for o in ('s', 'w', ':') if o in others), None)
            if not kind:
                continue
            pair = {'s': 1, 'w': 2, ':': 3}[kind]
            k = BLEND.mask(lambda a, b: G(a, b) in ('.', None), x, y)
            if k != 255:
                m.put('ground', BL, k & 15, pair * 16 + (k >> 4), ox + x, oy + y)


def soften(m, g, ox, oy, base):
    """Round off patches of one ground lying on another (dirt on grass, grass on sand or snow) with blend tiles."""
    H_, W_ = len(g), len(g[0])
    if base == '.':
        pair, top, alike = 0, ':-=', ':-='
    elif base in ('s', 'w', ':'):
        pair, top, alike = {'s': 1, 'w': 2, ':': 3}[base], '.', '.*b~'
    else:
        return
    isB = lambda x, y: not (0 <= x < W_ and 0 <= y < H_) or g[y][x] in alike
    for y in range(H_):
        for x in range(W_):
            if g[y][x] not in top:
                continue
            k = BLEND.mask(isB, x, y)
            if k != 255:
                m.put('ground', BL, k & 15, pair * 16 + (k >> 4), ox + x, oy + y)


HOUSES = [(0, 0), (4, 0), (8, 0), (12, 0)]


def naremap(m):
    """Swap the old art pack's ground, water, roads, flowers, bushes, houses and dungeon tiles for Ninja Adventure ones."""
    G, D, O = m.layers['ground'], m.layers['deco'], m.layers['over']
    sh = lambda r: r >> 16
    t = lambda r: (r & 255, (r >> 8) & 255)
    W, H = m.w, m.h
    grass = {(0, 9), (1, 9), (0, 31), (1, 31)}
    water = {(x, y) for x in (2, 3, 4) for y in (6, 7, 8)}
    road = {(8, 23), (8, 24), (9, 23), (9, 24)}
    isw = lambda x, y: not (0 <= x < W and 0 <= y < H) or m.col[y * W + x] in (DEEP,)
    for y in range(H):
        for x in range(W):
            i = y * W + x
            g = G[i]
            if g >= 0 and sh(g) == OW:
                tt = t(g)
                if tt in grass:
                    h = (x * 7 + y * 13) % 17
                    G[i] = ref(NF, 12 + h, 12) if h < 3 else ref(NF, 11, 12)
                elif tt == (12, 13) or tt in road:
                    G[i] = ref(NF, 12, 8)
                elif tt in water:
                    if m.col[i] == DEEP:
                        k = BLEND.mask(isw, x, y)
                        G[i] = ref(NW, 1, 7) if k == 255 else ref(BL, k & 15, 4 * 16 + (k >> 4))
                    else:
                        G[i] = ref(NF, 11, 12)
            elif g >= 0 and sh(g) == IN:
                tt = t(g)
                if tt == (1, 1):
                    G[i] = ref(NI, 12 + (x * 3 + y) % 3, 13)
                elif tt == (0, 4):
                    G[i] = ref(NI, 1 + (x + y * 2) % 3, 1)
                elif 5 <= tt[0] <= 7 and 6 <= tt[1] <= 8 and not (W == 16 and H == 14):
                    G[i] = ref(NR, tt[0] - 1, tt[1] - 6)
            d = D[i]
            if d >= 0 and sh(d) == OW:
                tt = t(d)
                if tt == (1, 8):
                    D[i] = ref(NN, (0, 2, 3, 0)[(x + y) % 4], 11)
                elif tt == (0, 16):
                    D[i] = ref(NN, (x * 5 + y) % 3, 10)
                elif tt == (6, 0):          # a house: the pack's cottage, door where the old one was
                    hx, hy = HOUSES[(x * 3 + y) % len(HOUSES)]
                    for j in range(5):
                        for k in range(5):
                            if m.ok(x + k, y + j):
                                D[(y + j) * W + x + k] = -1
                                if j < 2 or k == 0:
                                    m.col[(y + j) * W + x + k] = OPEN
                    for j in range(3):
                        for k in range(4):
                            if m.ok(x + 1 + k, y + 2 + j):
                                D[(y + 2 + j) * W + x + 1 + k] = ref(NH, hx + k, hy + j)
                                m.col[(y + 2 + j) * W + x + 1 + k] = SOLID if (k, j) not in ((1, 2),) else m.col[(y + 2 + j) * W + x + 1 + k]
            if D[i] >= 0 and sh(D[i]) == IN:
                tt = t(D[i])
                if 5 <= tt[0] <= 7 and 6 <= tt[1] <= 8 and not (W == 16 and H == 14):
                    D[i] = ref(NR, tt[0] - 1, tt[1] - 6)
    for v in m.extra.get('variants', []):          # story changes use the same swaps
        for t_ in v['tiles']:
            name, i, r = t_
            if r < 0 or sh(r) != OW:
                continue
            tt, x, y = t(r), i % W, i // W
            if tt in grass:
                t_[2] = ref(NF, 11, 12)
            elif tt == (12, 13) or tt in road:
                t_[2] = ref(NF, 12, 8)
            elif tt in water:
                t_[2] = ref(NW, 1, 7)
            elif tt == (1, 8):
                t_[2] = ref(NN, 0, 11)
            elif tt == (0, 16):
                t_[2] = ref(NN, (x * 5 + y) % 3, 10)


# Pack sprites for dressing a rocky border: (tx, ty, w, h, is_tree). Rocks sit on the ground; a tree's top row is its crown.
_ROCKS_B = [(17, 10, 4, 3, 0), (21, 10, 2, 3, 0), (15, 10, 2, 2, 0), (15, 12, 2, 2, 0), (12, 5, 4, 3, 0), (13, 8, 2, 2, 0)]
_ROCKS_G = [(17, 14, 4, 3, 0), (21, 14, 2, 3, 0), (15, 14, 2, 2, 0), (15, 16, 2, 2, 0), (16, 5, 4, 3, 0), (16, 8, 2, 2, 0)]
BORDER_KITS = {
    '.': (_ROCKS_B + [(0, 2, 4, 3, 1), (4, 2, 4, 3, 1), (16, 2, 4, 3, 1), (3, 18, 3, 3, 1), (2, 0, 2, 2, 1), (0, 0, 2, 2, 1), (16, 0, 2, 2, 1)],
          [(17, 13), (18, 13), (19, 13), (0, 10), (1, 10), (2, 10)]),
    ':': (_ROCKS_G + [(0, 2, 4, 3, 1), (0, 5, 4, 3, 1), (4, 0, 2, 2, 1), (2, 0, 2, 2, 1)], [(17, 17), (18, 17), (19, 17)]),
    'w': (_ROCKS_G + [(8, 2, 4, 3, 1), (4, 5, 4, 3, 1), (8, 5, 4, 3, 1), (6, 18, 3, 3, 1), (2, 12, 2, 2, 0), (8, 0, 2, 2, 1), (10, 0, 2, 2, 1)],
          [(17, 17), (18, 17), (4, 12), (5, 12)]),
    's': (_ROCKS_B + [(0, 5, 4, 3, 1), (4, 0, 2, 2, 1)], [(17, 13), (18, 13), (19, 13)]),
}


TREE_KITS = {
    '.': ([(0, 0, 2, 2, 1), (2, 0, 2, 2, 1), (6, 0, 2, 2, 1), (16, 0, 2, 2, 1), (18, 0, 2, 2, 1), (0, 2, 4, 3, 1), (4, 2, 4, 3, 1),
           (16, 2, 4, 3, 1), (20, 2, 4, 3, 1), (3, 18, 3, 3, 1)], [(0, 10), (1, 10), (2, 10), (0, 10)]),
    'w': ([(8, 0, 2, 2, 1), (10, 0, 2, 2, 1), (12, 0, 2, 2, 1), (8, 2, 4, 3, 1), (4, 5, 4, 3, 1), (8, 5, 4, 3, 1), (6, 18, 3, 3, 1)],
          [(4, 12), (5, 12), (10, 12)]),
}
TREE_KITS['s'] = TREE_KITS[':'] = TREE_KITS['.']


def dress_border(m, g, ox, oy, base, band, kit=None):
    """Fill a rocky border with a random mix of the pack's rocks and trees instead of a row of identical boulders.
    Sprites may poke one row into the land where it is plain ground, so the edge is not a straight line."""
    import random
    rng = random.Random(sum(ord(c) for c in m.id) * 7 + 3)
    big, small = kit or BORDER_KITS.get(base, BORDER_KITS['.'])
    H_, W_ = len(g), len(g[0])
    occ = set()

    def ok(X, Y):
        if (X, Y) in occ:
            return False
        if (X, Y) in band:
            return True
        x, y = X - ox, Y - oy
        if not (0 <= X < m.w and 0 <= Y < m.h):
            return True                       # hangs off the edge of the map: cut by the screen edge, never seen whole
        if not (0 <= x < W_ and 0 <= y < H_) or g[y][x] != base:
            return False
        if not (x == 2 or y == 2 or x == W_ - 3 or y == H_ - 3):
            return False
        # only poke in beside a solid run of border, never next to an opening
        return all((X + i, Y + j) in band or (X + i, Y + j) in occ or not (0 <= x + i < W_ and 0 <= y + j < H_) or not (x + i < 2 or y + j < 2 or x + i >= W_ - 2 or y + j >= H_ - 2)
                   for i in (-2, -1, 0, 1, 2) for j in (-2, -1, 0, 1, 2))

    for (X, Y) in sorted(band, key=lambda p: (p[1], p[0])):
        if (X, Y) in occ:
            continue
        kit = big[:]
        rng.shuffle(kit)
        done = False
        for (tx, ty, w, h, tree) in kit:
            offs = [(i, j) for j in range(h) for i in range(w)]
            rng.shuffle(offs)
            for (i, j) in offs:
                ax, ay = X - i, Y - j
                cells = [(ax + a, ay + b) for b in range(h) for a in range(w)]
                if all(ok(cx, cy) for cx, cy in cells):
                    poke = {c for c in cells if c not in band}
                    if poke:
                        m.pokes = getattr(m, 'pokes', []) + [{'cells': cells, 'poke': poke, 'small': small}]
                    for b in range(h):
                        for a in range(w):
                            if not m.ok(ax + a, ay + b):
                                occ.add((ax + a, ay + b))
                                continue
                            layer = 'over' if tree and b == 0 else 'deco'
                            m.put(layer, NN, tx + a, ty + b, ax + a, ay + b)
                            m.layers['deco' if layer == 'over' else 'over'][(ay + b) * m.w + ax + a] = -1
                            m.col[(ay + b) * m.w + ax + a] = SOLID
                            occ.add((ax + a, ay + b))
                    done = True
                    break
            if done:
                break
        if not done:
            tx, ty = rng.choice(small)
            m.put('deco', NN, tx, ty, X, Y)
            m.col[Y * m.w + X] = SOLID
            occ.add((X, Y))


def paint_forest(m, g, ox, oy, base='.'):
    """Forest (F) drawn as a loose mix of the pack's trees and bushes, packed to fill the forest's shape, so there are
    no straight walls of identical trunks and no tree cut in half (trees at the map's edge simply hang off it)."""
    H_, W_ = len(g), len(g[0])
    used = set()
    # whatever is left becomes a loose mix of the pack's trees and bushes (not a straight hedge)
    left = {(ox + x, oy + y) for y in range(H_) for x in range(W_) if g[y][x] == 'F' and (x, y) not in used}
    if left:
        dress_border(m, g, ox, oy, base, left, TREE_KITS.get(base, TREE_KITS['.']))


def interior(mid, name, back, kind='house', npcs=(), chests=(), signs=()):
    """A one-room interior (16x14) with furniture by kind; the door at the bottom returns to back = (map, x, y)."""
    m = Map(mid, 16, 14, name, indoor=True, music='home')
    m.fill(IN, 1, 1, 0, 0, 15, 13)
    m.fill(IN, 0, 4, 2, 3, 13, 12)
    for x in range(2, 14):
        for r in range(3):
            m.put('ground', IN, 5 + (x % 3), 6 + r, x, r)
    m.solid(0, 0, 16, 3)
    m.solid(0, 0, 2, 14)
    m.solid(14, 0, 2, 14)
    m.solid(0, 13, 16, 1)
    for x in (7, 8):
        m.put('ground', IN, 0, 4, x, 13)
        m.solid(x, 13, 1, 1, OPEN)
        m.warp(x, 13, back[0], back[1], back[2], 2)
    if kind in ('house', 'inn'):
        m.stamp(IN, 16, 1, 2, 3, 2, 3, col=SOLID)
        m.stamp(IN, 10, 1, 9, 6, 3, 3, col=SOLID)
        m.stamp(IN, 12, 10, 11, 2, 2, 3, col=SOLID)
    if kind in ('shop', 'smith', 'tavern', 'game'):
        for x in range(3, 13):
            m.put('deco', IN, 10 if x == 3 else 12 if x == 12 else 11, 3, x, 6)
            m.col[6 * m.w + x] = LOW if kind == 'game' else SOLID
    if kind == 'library':
        for x0 in (2, 6, 10):
            m.stamp(IN, 3, 12, x0, 3, 3, 2, col=SOLID)
    if kind == 'tavern':
        m.stamp(IN, 6, 9, 2, 8, 3, 3, col=SOLID)
        m.stamp(IN, 10, 1, 10, 9, 3, 3, col=SOLID)
    if kind == 'smith':
        m.stamp(IN, 12, 10, 11, 2, 2, 3, col=SOLID)
    m.put('deco', IN, 8, 12, 13, 11)
    for n in npcs:
        m.spawn('villager', n[0], n[1], **n[2])
    for c in chests:
        m.chest(*c)
    for sg in signs:
        m.sign(*sg)
    m.entry = [7, 12]
    return m


def region(mid, name, wx, wy, sw, sh, rows, music='village', base='.', grounds=None):
    m = Map(mid, sw * 16, sh * 14, name, music=music)
    for j in range(sh):
        for i in range(sw):
            m.area(i * 16, j * 14)
    m.extra['world'] = [wx, wy]
    paint(m, rows, base=base, grounds=grounds)
    return m


# ---------- the first area: Thistledown and the east meadow ----------
def thistledown():
    m = Map('meadow', 48, 14, 'Thistledown')
    m.extra['world'] = [3, 4]
    m.area(0, 0)
    m.area(16, 0)
    m.area(32, 0)
    m.extra['names'] = ['Thistledown', 'East Meadow', 'Reedwater']
    grass(m, 0, 0, 47, 13)
    lake(m, -1, 11, 48, 14)
    # screen 1: the village
    for x0 in (-2, 2, 10):
        forest(m, x0, -3)
    road_ns(m, 7, 0, 10)
    m.stamp(OW, 6, 6, 7, 11, 2, 3)          # jetty
    m.solid(7, 11, 2, 3, OPEN)
    house(m, 1, 2, ('home', 7, 12, 0))
    stone_pad(m, 3, 7, 6)
    stall(m, 10, 2)
    fence(m, 1, 5, 9)
    flowers(m, [(1, 10), (2, 10), (3, 10), (4, 10), (5, 10)])
    fountain(m, 11, 8)
    barrels(m, 14, 6)
    signboard(m, 9, 5, 'THISTLEDOWN|Market every day except when it rains, or when it is sunny.')
    # screen 2: the east meadow, a path to a cave in the cliffs
    for x0 in (14, 18, 22, 26, 30):
        forest(m, x0, -3)
    stone_pad(m, 16, 8, 31)
    m.stamp(OW, 10, 31, 27, 5, 4, 3, col=SOLID)    # cave mouth in rock
    m.warp(28, 7, 'cave1', 7, 12, 0)
    m.warp(29, 7, 'cave1', 8, 12, 0)
    for (x, y) in [(22, 4), (23, 4), (22, 5), (23, 10), (24, 10), (25, 4)]:
        bush(m, x, y)
    flowers(m, [(21, 9), (22, 6), (26, 9), (18, 9)])
    signboard(m, 25, 7, 'EAST CAVE|Beware of the logs. They are not just logs.')
    m.spawn('log', 21, 7)
    m.spawn('soldier', 22, 10)
    m.spawn('archer', 26, 4)
    m.chest(30, 4, 'bombs')
    m.stamp(OW, 4, 31, 17, 3, 4, 3, col=SOLID)        # ruined gate to the Meadow Ruins
    m.warp(18, 5, 'ruins1', 23, 25, 0)
    m.warp(19, 5, 'ruins1', 24, 25, 0)
    m.sign(21, 6, 'MEADOW RUINS|Keep out. By order of Chancellor Vex.')
    for (x, y) in [(29, 4), (30, 5), (31, 4)]:
        bush(m, x, y)
    # villagers
    m.spawn('villager', 14, 10, look='elder', roam=10, talk=[
        ['pendant_ruins1', ['You found the Pendant of Valor! I knew you had it in you.', 'Two more Pendants are hidden across Varrowmere. One, they say, lies beneath Reedwater.', 'Find them before Vex does.']],
        [None, ['Wren! You look like you slept in a hedge.', 'East of here, past the cave, the old Meadow Ruins sit behind the gate.', 'Vex has soldiers guarding it. Cut the bushes for hearts, and mind the logs.']]])
    m.spawn('villager', 12, 6, look='trader', roam=0, dir=2, shop=True, talk=[
        [None, ['Fresh goods! Prices go up every time you look at them. That is just how markets work.', 'Energy drinks? Sold out. Some fellow bought forty and ran off to train in the woods.']]])
    # screen 3: Reedwater, a pool hiding the Sunken Shrine (dungeon 2)
    for x0 in (34, 38, 44):
        forest(m, x0, -3)
    m.warp(42, 0, 'riverhead', 11, 12, 0)        # a gap in the trees: the path upstream
    m.warp(43, 0, 'riverhead', 12, 12, 0)
    stone_pad(m, 32, 8, 36)
    lake(m, 37, 3, 48, 10)
    m.stamp(OW, 6, 6, 40, 3, 2, 3)              # jetty out onto the pool
    m.solid(40, 3, 2, 3, OPEN)
    m.spawn('villager', 40, 5, look='fisher', roam=0, dir=2, talk=[
        [None, ['They say a shrine sits at the bottom of this pool.', 'My grandmother swore the water drops when the old sluice upstream is shut.', 'Me? I just rent out the boat. Well, I would, if anyone had stolen it back for me.']]])
    signboard(m, 36, 6, 'REEDWATER POOL|No swimming. No fishing. No asking why.')
    for (x, y) in [(32, 10), (34, 10), (33, 9), (35, 9)]:
        bush(m, x, y)
    m.chest(33, 10, 'heart_shard')
    m.spawn('soldierBlue', 34, 6)
    m.spawn('archer', 35, 4)
    m.spawn('log', 33, 9)
    # once the sluice upstream is shut, the pool drains and the Sunken Shrine's gate shows
    before = m.snapshot()
    grass(m, 37, 3, 47, 3)
    for y in range(4, 11):
        for x in range(37, 48):
            m.put('ground', OW, 12, 13, x, y)
            m.layers['deco'][y * m.w + x] = -1
            m.col[y * m.w + x] = OPEN
    m.stamp(OW, 6, 6, 40, 3, 2, 3)
    m.stamp(OW, 4, 31, 42, 5, 4, 3, col=SOLID)
    m.warp(43, 7, 'shrine', 23, 25, 0)
    m.warp(44, 7, 'shrine', 24, 25, 0)
    m.variant('sluice', before)
    m.spawn('villager', 7, 12, look='fisher', roam=0, dir=2, talk=[
        [None, ['Three days I have been fishing here.', 'So far: one boot, one cart wheel and somebody\'s crumpled receipt for a plushie.']]])
    m.spawn('villager', 3, 11, look='farmer', roam=24, talk=[
        [None, ['Those logs in the east meadow are not logs.', 'I sat on one. Spent a week in hospital. The nurse said it happens more than you would think.']]])
    # the north road: barred until Wren holds two Pendants, then the guard steps aside
    fence(m, 6, 9, 2)
    m.spawn('villager', 8, 3, look='guard', roam=0, dir=2, when='!pendant_shrine', talk=[
        ['pendant_ruins1', ['Still no orders to open the north road.', 'I have asked for a raise twice. They gave me two more nerve and a pat on the head.', 'Come back with a second one of those shiny Pendants and maybe I will forget I saw you.']],
        [None, ['The north road is closed by order of the Chancellor.', 'Do not ask me why. I just stand here. The pay is terrible.']]])
    m.spawn('villager', 10, 3, look='guard', roam=0, dir=3, when='pendant_shrine', talk=[
        [None, ['Two Pendants! Right, I never saw you. The road north goes up to Cinderfold.', 'If anyone asks, you overpowered me. Make it sound heroic.']]])
    before = m.snapshot()
    for x in range(6, 10):
        m.layers['deco'][2 * m.w + x] = -1
        m.col[2 * m.w + x] = OPEN
    m.warp(7, 0, 'highlands', 7, 26, 0)
    m.warp(8, 0, 'highlands', 8, 26, 0)
    m.variant('pendant_shrine', before)
    secret_cave(m, 17, 9, 'grotto1', ['heart_shard', 'dice'], 'Someone hid their winnings here. Probably from a very lucky night of cards.')
    m.entry = [8, 8]
    return m


def home():
    m = Map('home', 16, 14, "Wren's house", indoor=True, music='home')
    m.fill(IN, 1, 1, 0, 0, 15, 13)                 # dark outside the room
    m.fill(IN, 0, 4, 2, 3, 13, 12)                 # wooden floor
    for x in range(2, 14):                          # back wall, brick
        for y in range(0, 3):
            m.put('ground', IN, 0, 1, x, y)
    m.solid(0, 0, 16, 3)
    m.solid(0, 0, 2, 14)
    m.solid(14, 0, 2, 14)
    m.solid(0, 13, 16, 1)
    m.stamp(IN, 9, 4, 5, 0, 2, 2)                   # window
    m.stamp(IN, 12, 10, 11, 0, 2, 3)               # fireplace
    m.stamp(IN, 10, 12, 11, 2, 2, 1)               # the fire
    m.stamp(IN, 3, 12, 7, 1, 3, 2)                  # bookshelf
    m.stamp(IN, 16, 1, 2, 3, 2, 3, col=SOLID)       # bed
    m.stamp(IN, 10, 1, 7, 6, 3, 3, col=SOLID)       # table
    m.stamp(IN, 13, 4, 6, 7, 1, 2); m.solid(6, 8)   # chairs
    m.stamp(IN, 14, 4, 10, 7, 1, 2); m.solid(10, 8)
    m.nine(IN, 0, 7, 6, 10, 9, 12, layer='deco')    # rug by the door
    m.stamp(IN, 8, 12, 13, 3, 1, 2, col=SOLID)      # plant
    m.stamp(IN, 6, 9, 2, 10, 3, 3, col=SOLID)       # cupboard
    m.warp(7, 13, 'meadow', 3, 7, 2)
    m.warp(8, 13, 'meadow', 3, 7, 2)
    m.chest(12, 4, 'lantern')
    m.sign(8, 2, "A note pinned to the shelf from Captain Brannoc:|'Back late. Don't touch my blade. And feed the pigeon.'")
    m.entry = [7, 12]
    return m


def cave1():
    m = Map('cave1', 32, 14, 'East Cave', indoor=True, dark=True, music='cave')
    m.area(0, 0)
    m.area(16, 0)
    m.fill(CV, 0, 0)
    for x in range(32):
        for r in range(3):
            m.put('deco', CV, 1 + (x % 3), 3 + r, x, r)
    m.solid(0, 0, 32, 3)
    m.solid(0, 0, 1, 14)
    m.solid(31, 0, 1, 14)
    m.solid(0, 13, 32, 1)
    m.solid(7, 13, 2, 1, OPEN)
    for y in range(3, 13):                        # rock wall between the cave and the hidden chamber
        m.put('deco', CV, 2, 4, 15, y)
        m.put('deco', CV, 2, 4, 16, y)
    m.solid(15, 3, 2, 10)
    m.solid(15, 8, 1, 1, CRACK)
    m.solid(16, 8, 1, 1, OPEN)
    m.put('deco', CV, 0, 0, 16, 8)
    m.nine(CV, 1, 0, 9, 5, 12, 8, col=PIT)
    m.nine(CV, 0, 7, 1, 8, 4, 11, col=DEEP)
    m.solid(2, 4, 1, 1, TORCH)
    m.solid(13, 4, 1, 1, TORCH)
    m.chest(7, 4, 'heart_shard')
    m.chest(23, 6, 'heart_shard')
    m.chest(20, 10, 'arrows')
    m.warp(7, 13, 'meadow', 28, 8, 2)
    m.warp(8, 13, 'meadow', 29, 8, 2)
    m.spawn('log', 5, 6)
    m.spawn('log', 12, 11)
    m.spawn('log', 25, 9)
    m.sign(14, 11, 'Scratched into the rock:|"The wall to the east sounds hollow."')
    m.entry = [7, 12]
    return m


# ---------- dungeons ----------
def room(m, rx, ry):
    """A 16x14 dungeon room: stone wall face along the top, dark walls round the sides, brown floor."""
    X, Y = rx * 16, ry * 14
    m.area(X, Y)
    m.fill(CV, 0, 0, X, Y, X + 15, Y + 13)
    for x in range(X, X + 16):
        for r in range(3):
            m.put('ground', IN, 5 + (x % 3), 6 + r, x, Y + r)
    for y in range(Y, Y + 14):
        m.put('ground', IN, 1, 1, X, y)
        m.put('ground', IN, 1, 1, X + 15, y)
    for x in range(X, X + 16):
        m.put('ground', IN, 1, 1, x, Y + 13)
    m.solid(X, Y, 16, 3)
    m.solid(X, Y, 1, 14)
    m.solid(X + 15, Y, 1, 14)
    m.solid(X, Y + 13, 16, 1)


def door(m, rx, ry, side, kind=OPEN, group=None):
    """A 2-tile doorway in a room wall. kind: OPEN, LOCKED, BIGLOCK or SHUTTER (with a group name)."""
    X, Y = rx * 16, ry * 14
    if side == 'n':
        cells = [(X + 7, Y + r) for r in range(3)] + [(X + 8, Y + r) for r in range(3)]
        gate = [(X + 7, Y + 2), (X + 8, Y + 2)]
    elif side == 's':
        cells = [(X + 7, Y + 13), (X + 8, Y + 13)]
        gate = cells
    elif side == 'w':
        cells = [(X, Y + 7), (X, Y + 8)]
        gate = cells
    else:
        cells = [(X + 15, Y + 7), (X + 15, Y + 8)]
        gate = cells
    for (x, y) in cells:
        m.put('ground', CV, 0, 0, x, y)
        m.solid(x, y, 1, 1, OPEN)
    for (x, y) in gate:
        m.solid(x, y, 1, 1, kind)
    if kind == SHUTTER:
        m.extra.setdefault('shutters', {}).setdefault(group, []).extend([list(c) for c in gate])


def bigchest(m, x, y, item):
    m.chests['%d,%d' % (x, y)] = {'item': item, 'big': True}
    m.stamp(OB, 9, 0, x, y, 2, 1, col=BIGCHEST)


def statue_pair(m, x, y):
    m.stamp(CV, 6, 0, x, y, 1, 3, col=None)
    m.solid(x, y + 1, 1, 2)


def meadow_ruins():
    """Dungeon 1. Rooms (rx, ry) in a 3x2 grid:
       (0,0) Big Key   (1,0) torches/map   (2,0) BOSS: the Stone Sentinels
       (0,1) blocks    (1,1) entrance      (2,1) Big Chest (Bow)"""
    m = Map('ruins1', 48, 28, 'Meadow Ruins', indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': 'ruins1', 'exit': ['meadow', 19, 6], 'boss': True, 'pendant': 'Pendant of Valor'})
    # entrance (1,1): way out south; west open; east locked; north shutter opens when the room is clear
    door(m, 1, 1, 's')
    m.warp(23, 27, 'meadow', 19, 6, 2)
    m.warp(24, 27, 'meadow', 19, 6, 2)
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    door(m, 1, 1, 'n', SHUTTER, 'entrance')
    door(m, 1, 0, 's')
    m.extra.setdefault('triggers', []).append({'type': 'clear', 'area': 4, 'open': 'entrance'})
    m.spawn('soldier', 20, 21)
    m.spawn('soldier', 27, 21)
    m.spawn('log', 24, 18)
    for x in (18, 29):
        statue_pair(m, x, 15)
    m.sign(22, 16, "Carved in the stone:|'The meadow's valor sleeps behind three locks.'")
    # west room (0,1): push the block onto the switch to open the shutter to the key
    for (x, y) in [(10, 20), (12, 19), (7, 22)]:
        m.solid(x, y, 1, 1, BLOCK)
    m.extra['plates'] = [[7, 24]]
    m.solid(7, 24, 1, 1, PLATE)
    m.extra['triggers'].append({'type': 'plate', 'at': [[7, 24]], 'open': 'westkey'})
    # an alcove in the top-left corner: walls either side, a shutter in front, the key inside
    for (x, y) in [(2, 17), (2, 18), (5, 17), (5, 18), (2, 19), (5, 19)]:
        m.solid(x, y, 1, 1, SOLID)
        m.put('deco', IN, 6, 7, x, y)
    m.solid(3, 19, 2, 1, SHUTTER)
    m.extra.setdefault('shutters', {})['westkey'] = [[3, 19], [4, 19]]
    m.chest(3, 17, 'key')
    m.chest(12, 22, 'compass')
    m.spawn('log', 11, 23)
    # north room (1,0): light both torches to open the west shutter; the map is here
    m.solid(18, 4, 1, 1, TORCH)
    m.solid(29, 4, 1, 1, TORCH)
    door(m, 1, 0, 'w', SHUTTER, 'torches')
    door(m, 0, 0, 'e')
    m.extra['triggers'].append({'type': 'torches', 'at': [[18, 4], [29, 4]], 'open': 'torches'})
    m.chest(23, 4, 'map')
    m.spawn('archer', 22, 8)
    m.spawn('soldier', 26, 10)
    door(m, 1, 0, 'e', BIGLOCK)
    door(m, 2, 0, 'w', BIGLOCK)
    # north-west room (0,0): the Big Key, guarded; a cracked wall hides a fairy... (a nurse) spring later
    # the Big Key chest appears once the mini-boss, Captain Brask, is beaten
    m.chests['7,4'] = {'item': 'bigkey', 'big': False}
    m.extra.setdefault('reveal', {})['brask'] = [[7, 4]]
    m.extra['triggers'].append({'type': 'clear', 'area': 0, 'open': 'brask'})
    m.spawn('brute', 8, 8)
    m.solid(1, 8, 1, 1, CRACK)
    # east room (2,1): the Big Chest with the Bow
    bigchest(m, 39, 19, 'bow')
    m.spawn('log', 36, 23)
    m.spawn('log', 42, 23)
    # boss room (2,0)
    m.spawn('sentinel0', 36, 7)
    m.spawn('sentinel1', 40, 6)
    m.spawn('sentinel2', 44, 7)
    m.entry = [23, 25]
    return m


def riverhead():
    """Upstream of Reedwater: the river runs under the Chancellor's sluice gate. Pull the lever to shut it."""
    m = Map('riverhead', 16, 14, 'Riverhead')
    m.extra['world'] = [5, 3]
    m.area(0, 0)
    grass(m, 0, 0, 15, 13)
    for x0 in (-3, 13):
        forest(m, x0, -3)
        forest(m, x0, 3)
        forest(m, x0, 9)
    lake(m, 3, -1, 7, 14)
    m.stamp(OW, 4, 31, 3, 4, 4, 3, col=SOLID)     # the sluice gate over the river
    m.solid(8, 6, 1, 1, LEVER)
    m.sign(9, 4, "SLUICE GATE|Property of the Chancellor's Waterworks.|Do not touch the lever. We mean it. Probably.")
    road_ns(m, 11, 0, 13)
    m.warp(11, 13, 'meadow', 42, 1, 2)
    m.warp(12, 13, 'meadow', 43, 1, 2)
    m.spawn('soldier', 10, 9)
    m.spawn('archer', 12, 3)
    m.spawn('log', 9, 11)
    for (x, y) in [(9, 1), (10, 1), (9, 2)]:
        bush(m, x, y)
    m.chest(10, 2, 'arrows')
    m.entry = [11, 12]
    return m


def sunken_shrine():
    """Dungeon 2: the Sunken Shrine. Water switches raise and lower the water through the whole dungeon.
       (0,0) Big Key (clear the room)   (1,0) switch, Big Chest (Grapple), spill channel   (2,0) BOSS: the Mire Kraken
       (0,1) Small Key, compass, island heart   (1,1) entrance, flooded channel   (2,1) Lt. Garrow, switch, map"""
    m = Map('shrine', 48, 28, 'Sunken Shrine', indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': 'shrine', 'exit': ['meadow', 43, 8], 'boss': True, 'pendant': 'Pendant of Tides', 'flood': [], 'spill': []})
    def water(kind, x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                i = y * m.w + x
                if kind == 'pool':
                    m.col[i] = DEEP
                else:
                    m.extra[kind].append(i)
    # entrance (1,1): a flooded channel cuts the room in two; the way north is across it
    door(m, 1, 1, 's')
    m.warp(23, 27, 'meadow', 43, 8, 2)
    m.warp(24, 27, 'meadow', 43, 8, 2)
    water('flood', 17, 20, 30, 21)
    door(m, 1, 1, 'n')
    door(m, 1, 0, 's')
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    m.spawn('snapjaw', 21, 20)
    m.spawn('soldierBlue', 27, 24)
    m.sign(20, 24, 'Water stains climb to the ceiling.|Somewhere in here, the old priests could raise and lower the water at will.')
    # west room (0,1): the Small Key; a pool with an island chest you'll need the Grapple for
    m.chest(3, 17, 'key')
    m.chest(13, 24, 'compass')
    water('pool', 5, 18, 11, 23)
    for (x, y) in [(7, 20), (8, 20), (9, 20), (7, 21), (8, 21), (9, 21)]:
        m.col[y * m.w + x] = OPEN
    m.chest(8, 20, 'heart_shard')
    m.solid(8, 25, 1, 1, POST)
    m.spawn('soldier', 3, 22)
    m.spawn('snapjaw', 6, 22)
    # east room (2,1): Lieutenant Garrow guards a water switch; the map chest appears once he falls
    m.spawn('garrow', 40, 21)
    m.solid(44, 17, 1, 1, SWITCH)
    m.chests['36,17'] = {'item': 'map', 'big': False}
    m.extra.setdefault('reveal', {})['garrow'] = [[36, 17]]
    m.extra.setdefault('triggers', []).append({'type': 'clear', 'area': 5, 'open': 'garrow'})
    # north room (1,0): a channel that fills when the rest drains blocks the west door; a second switch;
    # the Big Chest with the Grapple; the boss door east
    water('spill', 18, 3, 19, 12)
    m.solid(28, 4, 1, 1, SWITCH)
    bigchest(m, 23, 6, 'grapple')
    door(m, 1, 0, 'w')
    door(m, 0, 0, 'e')
    door(m, 1, 0, 'e', BIGLOCK)
    door(m, 2, 0, 'w', BIGLOCK)
    m.spawn('soldierBlue', 26, 10)
    m.spawn('archer', 22, 9)
    # north-west room (0,0): clear it (eels and all) and the Big Key appears
    water('flood', 4, 6, 11, 9)
    m.chests['7,4'] = {'item': 'bigkey', 'big': False}
    m.extra['reveal']['nwclear'] = [[7, 4]]
    m.extra['triggers'].append({'type': 'clear', 'area': 0, 'open': 'nwclear'})
    m.spawn('snapjaw', 5, 7)
    m.spawn('snapjaw', 10, 8)
    m.spawn('soldier', 12, 11)
    # boss room (2,0): the Mire Kraken, with a moat round the edge
    water('pool', 33, 3, 46, 3)
    m.spawn('kraken', 40, 8)
    m.entry = [23, 25]
    return m


GROTTOS = []


def secret_cave(m, x, y, gid, items, text):
    """A cracked boulder: bomb it open and a hidden grotto lies behind. Its tiles must be clear ground."""
    free = lambda x, y: all(m.ok(x + i, y + j) and m.col[(y + j) * m.w + x + i] == OPEN and m.layers['deco'][(y + j) * m.w + x + i] < 0
                            for (i, j) in [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2), (0, 3)])
    placed = all(m.col[(y + j) * m.w + x + i] == OPEN for (i, j) in [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2)])
    if not placed and not free(x, y):          # generated land: take the nearest clear spot
        best = min(((abs(a - x) + abs(b - y), a, b) for b in range(2, m.h - 4) for a in range(2, m.w - 3) if free(a, b)), default=None)
        assert best, (m.id, x, y)
        x, y = best[1], best[2]
    boulder(m, x, y)
    m.warp(x, y + 1, gid, 7, 11, 0)
    m.solid(x, y + 1, 1, 1, CRACK)
    g = Map(gid, 16, 14, 'Hidden Grotto', indoor=True, music='cave')
    room(g, 0, 0)
    door(g, 0, 0, 's')
    g.warp(7, 13, m.id, x, y + 2, 2)
    g.warp(8, 13, m.id, x, y + 2, 2)
    for k, it in enumerate(items):
        g.chest(6 + k * 3 - (len(items) - 1), 5, it)
    g.sign(11, 8, text)
    if m.extra.get('shadow'):
        g.extra['shadow'] = True
    g.entry = [7, 11]
    GROTTOS.append(g)


ROCKS2 = [(15, 10), (15, 12), (13, 8), (15, 10), (13, 8)]


def boulder(m, x, y):                 # a big 2x2 boulder (one of the pack's rocks, varied by place)
    tx, ty = ROCKS2[(x * 5 + y * 3) % len(ROCKS2)]
    m.stamp(NN, tx, ty, x, y, 2, 2, col=SOLID)


def rockpile(m, x, y):
    tx, ty = ROCKS2[(x * 3 + y * 7 + 1) % len(ROCKS2)]
    m.stamp(NN, tx, ty, x, y, 2, 2, col=SOLID)


def highlands():
    """North of Thistledown: the hamlet of Cinderfold and the mountain path up to the Ember Forge.
       (0,1) Cinderfold   (0,0) mountain path   (1,0) the Forge gate   (1,1) the overlook"""
    m = Map('highlands', 32, 28, 'Cinder Highlands')
    m.extra['world'] = [3, 2]
    m.area(0, 0)
    m.area(16, 0)
    m.area(0, 14)
    m.area(16, 14)
    m.extra['names'] = ['Mountain Path', 'Forge Gate', 'Cinderfold', 'Overlook']
    grass(m, 0, 0, 31, 27)
    # outer edge: forest on the west, boulders along the north and east
    for y0 in (-3, 3, 9, 15, 21):
        forest(m, -3, y0)
    for x in range(1, 31, 2):
        if x != 15:                      # the pass north to the Northreach downs
            boulder(m, x, 0)
    for y in range(2, 27, 2):
        if y != 20:
            boulder(m, 30, y)
    m.warp(31, 20, 'grove', 1, 7, 1)
    m.warp(31, 21, 'grove', 1, 8, 1)
    # Cinderfold (0,1): a road from the south gate up through the hamlet
    road_ns(m, 7, 14, 27)
    m.warp(7, 27, 'meadow', 7, 1, 2)
    m.warp(8, 27, 'meadow', 8, 1, 2)
    house(m, 2, 15)
    house(m, 10, 15)
    stall(m, 10, 21)
    fountain(m, 3, 22)
    flowers(m, [(2, 21), (3, 21), (4, 21), (5, 21)])
    signboard(m, 6, 20, 'CINDERFOLD|Miners welcome. Soldiers tolerated. Tax collectors pushed down the well.')
    m.spawn('villager', 4, 25, look='elder', roam=12, talk=[
        ['pendant_forge', ['Three Pendants! The Dawnblade sleeps in the old grove east of Ashford.', 'Take it, child, and end Vex\'s rule.']],
        [None, ['The forge up the mountain has burned for a hundred years. Vex\'s men keep it lit day and night.', 'They say the third Pendant, the Pendant of Embers, sits in its heart.']]])
    m.spawn('villager', 12, 24, look='trader', roam=0, dir=2, shop=True, talk=[
        [None, ['Mountain prices, friend. Everything costs more up here. The air is thinner and so is my patience.']]])
    m.spawn('villager', 13, 26, look='farmer', roam=16, talk=[
        [None, ['I used to mine up there. Then the Gilded Hand moved in and the pay went to ten cash a day and a free hospital visit.', 'Mostly the hospital visit.']]])
    m.spawn('villager', 1, 19, look='scholar', roam=0, dir=1, talk=[
        [None, ['The Wisps in the forge? Your blade passes right through them while they blaze.', 'Wait until they dim, or shoot them. Fire will not hurt fire, of course.']]])
    # mountain path (0,0): switchbacks between boulders, a cracked boulder hides a heart piece
    road_ns(m, 7, 2, 13)
    for (x, y) in [(2, 3), (2, 6), (11, 3), (12, 8), (4, 10)]:
        boulder(m, x, y)
    boulder(m, 9, 6)
    m.solid(1, 9, 1, 1, CRACK)
    m.chest(1, 8, 'heart_shard')
    m.solid(2, 8, 1, 2, SOLID)
    m.put('deco', NN, 17, 13, 2, 8)
    m.put('deco', NN, 19, 13, 2, 9)
    m.spawn('soldier', 6, 7)
    m.spawn('archer', 12, 5)
    m.spawn('log', 4, 12)
    # forge gate (1,0)
    stone_pad(m, 9, 9, 22)
    m.stamp(OW, 4, 31, 22, 3, 4, 3, col=SOLID)
    m.warp(23, 5, 'forge', 23, 25, 0)
    m.warp(24, 5, 'forge', 24, 25, 0)
    m.sign(26, 6, 'EMBER FORGE|Property of the Chancellor. Hot. Do not lick.')
    for (x, y) in [(18, 4), (27, 9), (19, 11)]:
        boulder(m, x, y)
    m.spawn('soldierBlue', 21, 8)
    m.spawn('archer', 27, 4)
    # overlook (1,1): a quiet ledge with a view east to Ashford
    for (x, y) in [(18, 17), (24, 22), (27, 16)]:
        boulder(m, x, y)
    boulder(m, 21, 25)
    for (x, y) in [(20, 19), (21, 19), (22, 20)]:
        bush(m, x, y)
    m.chest(21, 20, 'arrows')
    signboard(m, 26, 20, 'OVERLOOK|East, past the mountains, the towers of Ashford Castle. West, a cow. Mostly the castle.')
    m.spawn('log', 24, 18)
    m.spawn('soldier', 19, 24)
    secret_cave(m, 22, 17, 'grotto2', ['cash50', 'arrows'], 'A miner\'s stash. A note says: DO NOT TELL THE TAXMAN.')
    m.entry = [7, 26]
    return m


def ember_forge():
    """Dungeon 3: the Ember Forge.
       (0,0) Big Key (block on switch)   (1,0) Big Chest (Ember Rod), fire bars, far torches   (2,0) BOSS: the Pyrewyrm
       (0,1) Small Key across lava        (1,1) entrance, torches open north     (2,1) Forgemaster Hald"""
    m = Map('forge', 48, 28, 'Ember Forge', indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': 'forge', 'exit': ['highlands', 23, 6], 'boss': True, 'pendant': 'Pendant of Embers', 'lava': []})
    def lava(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = PIT
                m.extra['lava'].append(y * m.w + x)
    # entrance (1,1): lava cuts the room; a narrow bridge with a fire bar; four torches open the way north
    door(m, 1, 1, 's')
    m.warp(23, 27, 'highlands', 23, 6, 2)
    m.warp(24, 27, 'highlands', 24, 6, 2)
    lava(17, 20, 30, 21)
    for x in (27, 28):
        m.col[20 * m.w + x] = OPEN
        m.col[21 * m.w + x] = OPEN
        m.extra['lava'].remove(20 * m.w + x)
        m.extra['lava'].remove(21 * m.w + x)
    m.spawn('firebar', 25, 20, len=4, sp=1.8)
    for (x, y) in [(18, 17), (29, 17)]:
        m.solid(x, y, 1, 1, TORCH)
    door(m, 1, 1, 'n', SHUTTER, 'entry')
    door(m, 1, 0, 's')
    m.extra.setdefault('triggers', []).append({'type': 'torches', 'at': [[18, 17], [29, 17]], 'open': 'entry'})
    m.chest(18, 24, 'map')
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    m.spawn('wisp', 22, 24)
    m.sign(25, 25, 'The heat is unbearable. Somewhere far above, hammers ring.')
    # west room (0,1): the Small Key on a ledge beyond the lava; grapple the chest, then the post to get back
    lava(1, 19, 14, 20)
    m.chest(7, 17, 'key')
    m.solid(7, 22, 1, 1, POST)
    m.chest(12, 25, 'compass')
    m.spawn('wisp', 4, 23)
    m.spawn('wisp', 11, 22)
    # east room (2,1): Forgemaster Hald; beating him reveals a chest of bombs
    m.spawn('hald', 40, 21)
    m.chests['43,17'] = {'item': 'bombs', 'big': False}
    m.extra.setdefault('reveal', {})['hald'] = [[43, 17]]
    m.extra['triggers'].append({'type': 'clear', 'area': 5, 'open': 'hald'})
    lava(33, 25, 35, 26)
    lava(44, 25, 46, 26)
    # north room (1,0): the Big Chest between fire bars; torches stranded in lava open the east way
    bigchest(m, 23, 5, 'rod')
    m.spawn('firebar', 20, 8, len=3, sp=-2.0)
    m.spawn('firebar', 27, 8, len=3, sp=2.0, ang=3.1)
    lava(28, 3, 30, 5)
    lava(28, 10, 30, 12)
    m.solid(29, 4, 1, 1, TORCH)
    m.solid(29, 11, 1, 1, TORCH)
    m.extra['lava'] = [i for i in m.extra['lava'] if i not in (4 * m.w + 29, 11 * m.w + 29)]
    m.extra['triggers'].append({'type': 'torches', 'at': [[29, 4], [29, 11]], 'open': 'far'})
    door(m, 1, 0, 'e', SHUTTER, 'far')
    door(m, 2, 0, 'w', BIGLOCK)
    door(m, 1, 0, 'w')
    door(m, 0, 0, 'e')
    m.spawn('wisp', 18, 11)
    # north-west room (0,0): push the block onto the switch; the alcove with the Big Key opens
    m.chest(11, 4, 'bigkey')
    m.solid(10, 3, 1, 3, SOLID)
    m.solid(12, 3, 1, 3, SOLID)
    for y in (4, 5):
        m.put('deco', IN, 6, 7, 10, y)
        m.put('deco', IN, 6, 7, 12, y)
    m.solid(11, 6, 1, 1, SHUTTER)
    m.extra.setdefault('shutters', {})['bk'] = [[11, 6]]
    m.solid(6, 7, 1, 1, BLOCK)
    m.extra['plates'] = [[6, 10]]
    m.solid(6, 10, 1, 1, PLATE)
    m.extra['triggers'].append({'type': 'plate', 'at': [[6, 10]], 'open': 'bk'})
    lava(2, 6, 3, 12)
    lava(8, 9, 9, 12)
    m.spawn('soldierBlue', 12, 10)
    # boss room (2,0): the Pyrewyrm; lava in the corners
    lava(33, 3, 34, 4)
    lava(45, 3, 46, 4)
    lava(33, 11, 34, 12)
    lava(45, 11, 46, 12)
    m.spawn('pyrewyrm', 40, 8)
    m.entry = [23, 25]
    return m


def grove():
    """East of the highlands: the Dawnblade's grove, and beyond it the walls of Ashford Castle."""
    m = Map('grove', 32, 14, 'Dawn Grove')
    m.extra['world'] = [6, 3]
    m.area(0, 0)
    m.area(16, 0)
    m.extra['names'] = ['Dawn Grove', 'Ashford Castle']
    grass(m, 0, 0, 31, 13)
    for x0 in (-2, 2, 10, 14):
        forest(m, x0, -3)
    for x0 in (-2, 2, 10):
        forest(m, x0, 11)
    m.warp(0, 7, 'highlands', 30, 20, 3)
    m.warp(0, 8, 'highlands', 30, 21, 3)
    for x in range(0, 6):
        m.solid(x, 6, 1, 1, OPEN)
    # the grove: a ring of flowers round the pedestal
    flowers(m, [(5, 4), (6, 3), (8, 3), (9, 4), (5, 7), (9, 7), (6, 8), (8, 8)])
    m.solid(7, 5, 1, 1, PEDESTAL)
    m.sign(4, 9, 'DAWN GROVE|Here rests the Dawnblade, for the one who carries all three Pendants.')
    m.spawn('log', 11, 9)
    # a fenced pen with no gate: the heart piece inside is reached through the Twin Mirror
    fence(m, 11, 15, 6)
    fence(m, 11, 15, 10)
    for y in (7, 8, 9):
        for x in (11, 15):
            m.stamp(OW, 0, 17, x, y, col=LOW)
    m.chest(13, 7, 'heart_shard')
    m.sign(10, 8, 'A pen with no gate. The farmer who built it swore it was "more secure that way".')
    # Ashford Castle: towers, the gate, and Vex's barrier
    road_ns(m, 23, 6, 13)
    m.stamp(OW, 0, 22, 17, 0, 3, 6, col=SOLID)
    m.stamp(OW, 0, 22, 28, 0, 3, 6, col=SOLID)
    for x in range(20, 28):
        for y in range(0, 3):
            m.put('ground', OW, 8, 23, x, y)
            m.solid(x, y, 1, 1, SOLID)
    m.stamp(OW, 4, 31, 22, 3, 4, 3, col=SOLID)
    m.warp(23, 5, 'castle', 23, 25, 0)
    m.warp(24, 5, 'castle', 24, 25, 0)
    for x in range(22, 26):
        m.solid(x, 6, 1, 1, BARRIER)
    m.spawn('captain', 20, 9)
    m.spawn('soldierBlue', 27, 10)
    m.spawn('archer', 29, 7)
    m.entry = [1, 7]
    return m


def ashford_castle():
    """The last dungeon: Ashford Castle.
       (0,0) the castle nurse        (1,0) torches in lava open the throne door   (2,0) Chancellor Vex
       (0,1) Small Key, fire bars    (1,1) entrance, clear it to open north        (2,1) Big Key over the pit"""
    m = Map('castle', 48, 28, 'Ashford Castle', indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': 'castle', 'exit': ['grove', 23, 7], 'boss': True, 'lava': []})
    def lava(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = PIT
                m.extra['lava'].append(y * m.w + x)
    # entrance (1,1)
    door(m, 1, 1, 's')
    m.warp(23, 27, 'grove', 23, 7, 2)
    m.warp(24, 27, 'grove', 24, 7, 2)
    door(m, 1, 1, 'n', SHUTTER, 'hall')
    door(m, 1, 0, 's')
    m.extra.setdefault('triggers', []).append({'type': 'clear', 'area': 4, 'open': 'hall'})
    m.spawn('captain', 20, 20)
    m.spawn('captain', 27, 20)
    m.spawn('soldierBlue', 23, 18)
    m.spawn('archer', 18, 24)
    for x in (18, 29):
        statue_pair(m, x, 15)
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    # west room (0,1): fire bars guard the Small Key
    m.chest(3, 17, 'key')
    m.spawn('firebar', 6, 20, len=4, sp=2.2)
    m.spawn('firebar', 10, 23, len=3, sp=-2.6)
    m.spawn('wisp', 12, 18)
    m.spawn('wisp', 4, 24)
    # east room (2,1): the Big Key beyond a pit; grapple the chest, then the post
    for y in (19, 20):
        for x in range(33, 47):
            m.col[y * m.w + x] = PIT
    m.chest(40, 17, 'bigkey')
    m.solid(40, 23, 1, 1, POST)
    m.spawn('archer', 35, 24)
    m.spawn('archer', 45, 24)
    m.spawn('captain', 42, 25)
    # north room (1,0): light the torches across the lava to open the throne door
    lava(28, 3, 30, 5)
    lava(28, 10, 30, 12)
    lava(17, 3, 19, 5)
    m.solid(29, 4, 1, 1, TORCH)
    m.solid(29, 11, 1, 1, TORCH)
    m.extra['lava'] = [i for i in m.extra['lava'] if i not in (4 * m.w + 29, 11 * m.w + 29)]
    m.extra['triggers'].append({'type': 'torches', 'at': [[29, 4], [29, 11]], 'open': 'throne'})
    door(m, 1, 0, 'e', SHUTTER, 'throne')
    door(m, 2, 0, 'w', BIGLOCK)
    door(m, 1, 0, 'w')
    door(m, 0, 0, 'e')
    m.spawn('firebar', 23, 8, len=5, sp=1.4)
    m.spawn('captain', 20, 10)
    m.spawn('wisp', 26, 6)
    # north-west room (0,0): the castle nurse, who has seen it all
    m.spawn('villager', 7, 6, look='baker', roam=0, dir=2, heal=True, talk=[
        [None, ['Oh, another one. Sit still, this will sting.', 'There. Good as new. Try not to get thrown through any more windows.']]])
    m.spawn('villager', 4, 9, look='scholar', roam=10, talk=[
        [None, ['Vex hides behind his magic. Nothing you swing at him will land...', '...except his own spells. Strike his orbs back at him with your blade.', 'He may hit them back. Keep returning them.']]])
    # the throne room (2,0)
    m.spawn('vex', 40, 6)
    m.entry = [23, 25]
    return m


def marrowgate():
    """Marrowgate, the big town south across the water from Thistledown (world screens 2-5, 5-6)."""
    ns = {}
    exec(open('tools/regions/marrowgate_terrain.py').read(), ns)
    m = region('marrowgate', 'Marrowgate', 2, 5, 4, 2, ns['ROWS'])
    m.extra['names'] = ['West Marrowgate', 'Market Bridge', 'Marrowgate Square', 'East Marrowgate', 'Old Lane', 'South Road', 'The Commons', 'Rock Garden']
    houses = [  # (x, y, interior id, name, kind)
        (8, 3, 'mg_tavern', 'The Rusty Nail', 'tavern'), (14, 3, 'mg_smith', 'Brannock Smithy', 'smith'),
        (27, 3, 'mg_library', 'Marrowgate Library', 'library'), (33, 3, 'mg_store', 'Odds and Ends', 'shop'),
        (44, 3, 'mg_chests', 'Lucky Lids', 'game'), (49, 3, 'mg_elder', "Mayor Tull's House", 'house'),
        (9, 11, 'mg_gallery', 'Shooting Gallery', 'game'), (15, 13, 'mg_house', "The Wexford House", 'house'),
        (47, 13, 'mg_clinic', 'Marrowgate Clinic', 'house')]
    for (x, y, iid, nm, kind) in houses:
        house(m, x, y, (iid, 7, 12, 0))
    m.stamp(OW, 22, 9, 30, 13, 3, 3, col=SOLID)
    stall(m, 33, 10)
    stall(m, 44, 9)
    signboard(m, 22, 9, 'MARROWGATE|Biggest town this side of the Chancellor. Mind your purse.')
    signboard(m, 25, 4, 'NORTH: Thistledown across the water.')
    fence(m, 12, 22, 21)
    for y in range(22, 26):
        for x in range(12, 23):
            m.put('ground', OW, 12, 13, x, y)
    m.sign(11, 23, 'THE DIG FIELD|Thirty cash, thirty seconds. Bring your own shovel.')
    people = [
        (20, 10, 'farmer', 20, [[None, ['Welcome to Marrowgate! Everything is for sale here except my opinion. That is free.', 'Well. It is five cash.']]]),
        (36, 17, 'trader', 0, [[None, ['Fresh fish! Yesterday\'s fish! Fish of uncertain age!']]]),
        (46, 16, 'scholar', 0, [[None, ['The Chancellor\'s tax collectors come every Tuesday. We all go on holiday on Tuesdays.']]]),
        (29, 17, 'baker', 16, [[None, ['I bake bread for the whole town. Nobody pays. They just say "put it on my tab".', 'I do not have a tab. I have never had a tab.']]]),
        (56, 11, 'guard', 0, [['plushie_back', ['Town watch. Nothing to report. The plushie is home. It looks smug.']], [None, ['Town watch. Nothing to report. Somebody stole a plushie from a stall, but the plushie seemed happy to go.', 'If you ever find it, bring it back. The stall owner has not stopped crying.']]]),
        (8, 18, 'elder', 10, [[None, ['In my day we walked to the hospital. Uphill. Both ways. After being mugged. Both ways.']]]),
        (52, 22, 'farmer', 0, [[None, ['Those boulders? Been there since my grandfather tried to move them. He is still trying, in a way.', 'Folk say a strong pair of gloves would shift them.']]]),
        (16, 24, 'fisher', 0, [[None, ['This is the dig field.']]]),
    ]
    for (x, y, look, roam, talk) in people:
        m.spawn('villager', x, y, look=look, roam=roam, talk=talk, digfield=(look == 'fisher'), plushie=(look == 'guard'))
    for (x, y) in [(50, 23), (52, 23), (51, 24), (50, 25), (52, 25), (50, 24), (52, 24)]:
        m.col[y * m.w + x] = DARKROCK
        m.layers['deco'][y * m.w + x] = -1
    m.chest(51, 23, 'heart_shard')
    m.spawn('log', 58, 24)
    m.spawn('soldier', 36, 22)
    for (x, y) in [(28, 11), (13, 23), (45, 18), (60, 6)]:
        m.spawn('butterfly', x, y)
    m.entry = [23, 4]
    return m


def marrowgate_interiors():
    back = lambda x, y: ('marrowgate', x + 2, y + 5)
    out = []
    out.append(interior('mg_tavern', 'The Rusty Nail', back(8, 3), 'tavern', npcs=[
        (7, 5, dict(look='trader', roam=0, dir=2, talk=[[None, ['What will it be? We have ale, stronger ale, and a drink called "Hospital Visit".', 'Do not order the Hospital Visit.']]])),
        (4, 11, dict(look='guard', roam=0, dir=1, talk=[[None, ['Off duty. Do not tell the Captain. Especially not Brask. He takes everything personally.']]])),
        (11, 8, dict(look='farmer', roam=8, talk=[[None, ['I put my whole savings in the stock market. Now the stock market has my savings, and I have a lovely story.']]])),
        (12, 11, dict(look='scholar', roam=0, dir=3, talk=[[None, ['They say a bird lives on top of Frostspire that will carry you anywhere if you play it a tune.', 'Do you play? No? Neither do I. I just hum at it.']]]))]))
    out.append(interior('mg_smith', 'Brannock Smithy', back(14, 3), 'smith', npcs=[
        (7, 5, dict(look='guard', roam=0, dir=2, smith=True, talk=[
            ['tempered', ['That blade of yours still sings? Good. Look after it. Unlike Durn, who looks after nothing.']],
            ['durn', ['Durn! You found him! He walked in an hour ago, covered in mud, complaining.', 'A deal is a deal. Give me that sword.']],
            [None, ['Brannock, smith. My brother Durn and I used to temper blades together.', 'He went into Whisperwood after a rare ore and never came back.', 'Find him, and I will make your blade sing.']]])),
        (11, 9, dict(look='guard', roam=4, when='durn', talk=[[None, ['Durn. Yes, the lost one. I was not lost, I was "exploring". For three months.', 'Keep the shoes. Bandits stole them from someone faster than me anyway.']]]))]))
    out.append(interior('mg_library', 'Marrowgate Library', back(27, 3), 'library', npcs=[
        (7, 8, dict(look='scholar', roam=0, dir=2, talk=[[None, ['Shh. This is a library.', 'The Book of Old Script is on the top shelf. Nobody can reach it. We put it there in a fit of ambition.', 'A good hard run into the shelf might knock it down.']]]))]))
    out.append(interior('mg_store', 'Odds and Ends', back(33, 3), 'shop', npcs=[
        (7, 5, dict(look='trader', roam=0, dir=2, shop=True, talk=[[None, ['Odds and Ends! Mostly ends. Have a look.']]]))]))
    out.append(interior('mg_chests', 'Lucky Lids', back(44, 3), 'game', npcs=[
        (2, 9, dict(look='scholar', roam=0, dir=1, vault=True, talk=[[None, ['Psst. The real game is downstairs. Members only. Membership: seven Crystals.']]])),
        (7, 5, dict(look='trader', roam=0, dir=2, chestgame=True, talk=[[None, ['Lucky Lids! Twenty cash, pick two chests, keep what is inside.', 'The house always wins, but sometimes the house is having a bad day.']]]))]))
    out.append(interior('mg_elder', "Mayor Tull's House", back(49, 3), 'house', npcs=[
        (7, 7, dict(look='elder', roam=6, talk=[
            ['pendant_forge', ['Three Pendants? Then the old songs were true. The Dawnblade waits in the grove east of the Highlands.']],
            [None, ['Mayor Tull. I would offer you a job, but the Chancellor takes ninety percent of the town budget.', 'The other ten percent goes on ribbon for ribbon-cutting ceremonies. We cut a lot of ribbons.']]]))]))
    out.append(interior('mg_gallery', 'Shooting Gallery', back(9, 11), 'game', npcs=[
        (12, 9, dict(look='guard', roam=0, dir=3, gallery=True, talk=[[None, ['Shooting gallery! Ten cash a round. Hit the targets, win prizes.']]]))]))
    out.append(interior('mg_house', 'The Wexford House', back(15, 13), 'house', npcs=[
        (5, 8, dict(look='baker', roam=6, talk=[[None, ['My husband went to buy milk three years ago. He sends letters. He is "still looking for the right milk".']]])),
        (10, 9, dict(look='farmer', roam=4, talk=[[None, ['I am not lazy. I am in energy-saving mode.']]]))], chests=[(6, 4, 'cash50')]))
    out.append(interior('mg_clinic', 'Marrowgate Clinic', back(47, 13), 'house', npcs=[
        (7, 6, dict(look='baker', roam=0, dir=2, heal=True, talk=[[None, ['Clinic! Sit down, you look like you have been through a wall. Several walls.', 'There. All patched. No charge, the Mayor pays. Well, the Mayor promises to pay.']]]))]))
    return out


def willowfen():
    ns = {}
    exec(open('tools/regions/willowfen_terrain.py').read(), ns)
    out = []
    m = region('willowfen', 'Willowfen', 0, 3, 3, 2, ns['NORTH'])
    m.extra['names'] = ['Reed Shallows', 'Heron Pools', 'Old Mole Marsh', 'Fenwick Path', 'Sinkmire', 'Eastfen']
    house(m, 3, 17, ('wf_mole', 7, 12, 0))
    m.put('ground', OW, 8, 23, 5, 22)
    signboard(m, 8, 22, "OLD MOLE'S|Holes dug, holes filled, holes admired. Knock first.")
    signboard(m, 44, 19, 'WILLOWFEN|West: the marsh. North: Whisperwood (do not go in alone). Also do not go in with friends.')
    m.extra['digs'] = {'35,23': 'heart_shard', '16,10': 'cash50', '42,11': 'cash20', '4,4': 'bombs', '15,9': 'cash5'}
    secret_cave(m, 22, 22, 'grotto5', ['heart_shard'], 'A heron has been stashing shiny things in here for years.')
    for (k, x, y) in [('log', 12, 13), ('log', 30, 16), ('snapjaw', 7, 9), ('snapjaw', 31, 11), ('snapjaw', 40, 5), ('soldier', 25, 17), ('archer', 40, 15)]:
        m.spawn(k, x, y)
    m.spawn('villager', 20, 9, look='fisher', roam=10, talk=[[None, ['The marsh is full of buried things. Coins, boots, a whole cart once.', 'Old Mole by the west pools has a shovel. Says he is retired from digging. Has said so for forty years.']]])
    out.append(m)
    s_ = region('willowfen_s', 'Willowfen', 0, 5, 2, 2, ns['SOUTH'])
    s_.extra['names'] = ['Bottle Hollow', 'Mudflats', 'Lily Pond', 'Fen Fringe']
    house(s_, 6, 3, ('wf_bottles', 7, 12, 0))
    signboard(s_, 11, 8, "BOTTLES BY BELLAMY|Empty bottles, full bottles, bottles of regret.")
    s_.extra['digs'] = {'5,22': 'cash50', '16,10': 'cash20', '7,23': 'arrows'}
    s_.chest(21, 20, 'cash50')
    s_.solid(21, 25, 1, 1, POST)
    for (k, x, y) in [('snapjaw', 7, 16), ('snapjaw', 21, 4), ('log', 24, 12), ('soldierBlue', 10, 20)]:
        s_.spawn(k, x, y)
    out.append(s_)
    out.append(interior('wf_mole', "Old Mole's Hut", ('willowfen', 5, 22), 'house', npcs=[
        (7, 7, dict(look='elder', roam=4, talk=[
            ['shovel', ['Dig where the ground looks soft and the grass grows funny. Or just dig everywhere. Worked for me.']],
            [None, ['Old Mole. Retired. Mostly.', 'Want my shovel? Take it. My back says I am done, my heart says one more hole.', 'My back wins. It always wins.']]]))], chests=[(12, 4, 'shovel')]))
    out.append(interior('wf_bottles', 'Bottles by Bellamy', ('willowfen_s', 8, 8), 'shop', npcs=[
        (7, 5, dict(look='scholar', roam=0, dir=2, bottles=True, talk=[[None, ['Bellamy. Bottles. That is the whole business plan.']]]))]))
    return out


def whisperwood():
    ns = {}
    exec(open('tools/regions/whisperwood_terrain.py').read(), ns)
    out = []
    m = region('whisperwood', 'Whisperwood', 0, 0, 3, 3, ns['ROWS'], music='cave')
    m.extra['names'] = ['Hidden Glade', 'High Clearing', 'Bandit Hollow', 'Fairy Glade', 'The Tangle', 'Deepwood', 'Wood Gate', 'Ore Clearing', 'Old Stump']
    # the Tangle (screen 1,1) turns you round unless you leave north (or go back west)
    m.extra['loop'] = {'area': 4, 'ok': [0, 3], 'to': [17, 21]}
    m.stamp(OW, 10, 31, 37, 2, 4, 3, col=SOLID)
    m.warp(38, 4, 'hideout', 7, 12, 0)
    m.warp(39, 4, 'hideout', 8, 12, 0)
    m.sign(36, 6, 'A crude sign: KEEP OWT. THIS MEENS YOU. ALSO YOU.')
    m.chest(7, 4, 'heart_shard')
    m.spawn('villager', 10, 18, look='baker', roam=0, dir=2, heal=True, ghost=True, talk=[[None, ['I am the spirit of this glade. Rest a moment.', 'The Tangle to the east turns travellers round. Keep heading north and the trees will let you pass.']]])
    m.spawn('fairy', 5, 18)
    m.spawn('fairy', 11, 20)
    m.sign(22, 33, 'An overturned ore cart. Fresh scratches on the side: "DURN WOZ ERE". Tracks lead north into the trees.')
    m.extra['digs'] = {'40,35': 'heart_shard', '25,32': 'cash20', '5,33': 'cash5'}
    secret_cave(m, 40, 31, 'grotto6', ['cash100'], 'A bandit stash. Someone has written IOU on every coin.')
    for (k, x, y) in [('log', 9, 33), ('log', 24, 35), ('soldier', 20, 6), ('archer', 27, 8), ('captain', 40, 9), ('soldierBlue', 35, 4), ('log', 6, 21), ('wisp', 24, 21)]:
        m.spawn(k, x, y)
    out.append(m)
    # the bandits' hideout: two rooms; Durn is locked in the back
    h = Map('hideout', 32, 14, 'Bandit Hideout', indoor=True, music='dungeon')
    room(h, 0, 0)
    room(h, 1, 0)
    h.extra.update({'dungeon': 'hideout'})
    door(h, 0, 0, 's')
    h.warp(7, 13, 'whisperwood', 38, 5, 2)
    h.warp(8, 13, 'whisperwood', 39, 5, 2)
    door(h, 0, 0, 'e', LOCKED)
    door(h, 1, 0, 'w')
    h.chests['3,4'] = {'item': 'key', 'big': False}
    h.extra['reveal'] = {'bandits': [[3, 4]]}
    h.extra['triggers'] = [{'type': 'clear', 'area': 0, 'open': 'bandits'}]
    for (k, x, y) in [('captain', 5, 8), ('soldier', 10, 7), ('archer', 12, 10), ('soldierBlue', 4, 10)]:
        h.spawn(k, x, y)
    h.spawn('villager', 24, 7, look='guard', roam=0, dir=2, durn=True, when='!durn', talk=[[None, ['Hah! You are no bandit. Who sent you? My brother? Brannock sent a rescuer? He never sends anything. Not even letters.']]])
    h.chest(28, 4, 'cash50')
    h.entry = [7, 12]
    out.append(h)
    return out


def shadowize(m, name):
    """Copy an overworld map into Shadow Varrowmere: same ground, darker palette, no people, new enemies."""
    import copy
    s = copy.deepcopy(m)
    s.id, s.name, s.music = 's_' + m.id, name, 'shadow'
    s.extra['shadow'] = True
    s.extra.pop('variants', None)
    s.spawns, s.chests, s.signs = [], {}, {}
    s.warps = [dict(w, to='s_' + w['to']) for w in m.warps if w['to'] in ('meadow', 'highlands', 'grove', 'riverhead')]
    for k in ('digs', 'oldscript'):
        s.extra.pop(k, None)
    s.col = [SOLID if c == CRACK else c for c in s.col]      # light-world secret caves don't exist here
    # chests from the light world are gone in the shadow: put the floor back where they stood
    for k in m.chests:
        x, y = map(int, k.split(','))
        s.layers['deco'][y * s.w + x] = -1
        s.col[y * s.w + x] = OPEN
    return s


def rocks(m, pts):
    for (x, y) in pts:
        m.put('deco', CV, 5, 4, x, y)
        m.col[y * m.w + x] = ROCK


def shadow_world():
    out = []
    # Shadow Thistledown and Reedwater: the pool never drained here; the Drowned Vault sits on an island
    m = shadowize(thistledown(), 'Shadow Thistledown')
    m.extra['names'] = ['Hollowdown', 'Weeping Meadow', 'Blackwater']
    for x in range(6, 10):
        m.layers['deco'][2 * m.w + x] = -1
        m.col[2 * m.w + x] = OPEN
    m.warp(7, 0, 's_highlands', 7, 26, 0)
    m.warp(8, 0, 's_highlands', 8, 26, 0)
    for y in (7, 8):
        for x in range(41, 47):
            m.put('ground', OW, (x + y) % 2, 9, x, y)
            m.col[y * m.w + x] = OPEN
    m.stamp(OW, 4, 31, 42, 4, 4, 3, col=SOLID)
    m.warp(43, 6, 'vault', 23, 25, 0)
    m.warp(44, 6, 'vault', 24, 25, 0)
    rocks(m, [(0, 9), (1, 8), (2, 9), (1, 10), (0, 10), (2, 10)])
    m.chest(1, 9, 'heart_shard')
    secret_cave(m, 14, 9, 'grotto3', ['heart_shard'], 'The walls are scratched with tally marks. Thousands of them.')
    m.sign(5, 9, 'A sign, half rotted:|"HOLLOWDOWN. Population: fewer every year."')
    for (k, x, y) in [('captain', 5, 8), ('wisp', 12, 11), ('soldierBlue', 21, 9), ('archer', 26, 4), ('wisp', 24, 7), ('captain', 34, 7), ('snapjaw', 40, 6), ('snapjaw', 45, 9)]:
        m.spawn(k, x, y)
    out.append(m)
    # Shadow Riverhead: the River Spirit sells Flippers
    m = shadowize(riverhead(), 'Shadow Riverhead')
    m.spawn('villager', 9, 9, look='fisher', roam=0, dir=3, ghost=True, sells='fins', price=100, talk=[
        [None, ['I am the spirit of this river. Or what is left of it since the Chancellor started bottling it.']]])
    m.chest(13, 11, 'cash50')
    rocks(m, [(12, 11), (14, 11), (13, 12)])
    m.spawn('snapjaw', 5, 9)
    m.spawn('wisp', 11, 4)
    out.append(m)
    # Shadow Highlands: boulders choke the path to the Hollow Quarry
    m = shadowize(highlands(), 'Shadow Highlands')
    m.extra['names'] = ['Ashen Path', 'Quarry Gate', 'Cinderhollow', 'Grey Overlook']
    m.warps = [w for w in m.warps if w['to'] != 's_forge']
    m.warp(23, 5, 'quarry', 23, 25, 0)
    m.warp(24, 5, 'quarry', 24, 25, 0)
    rocks(m, [(21, 6), (22, 6), (23, 6), (24, 6), (25, 6), (26, 6), (21, 7), (26, 7)])
    m.sign(20, 6, 'HOLLOW QUARRY|Abandoned. The rocks are too heavy for anyone without a good glove.')
    m.spawn('villager', 4, 25, look='elder', roam=8, ghost=True, talk=[
        [None, ['You are from the other side, are you not? Your colours are too bright.', 'Vex built this place in his own image. Two of his vaults hold what you will need: one under the black water, one in the quarry.']]])
    for (k, x, y) in [('captain', 8, 20), ('wisp', 12, 25), ('soldierBlue', 6, 7), ('archer', 12, 5), ('captain', 21, 9), ('wisp', 27, 10), ('log', 24, 19), ('soldierBlue', 19, 24)]:
        m.spawn(k, x, y)
    rocks(m, [(20, 20), (21, 21), (22, 20)])
    m.chest(21, 20, 'bombs')
    secret_cave(m, 16, 22, 'grotto4', ['heart_shard', 'mail'], 'A shadow merchant\'s vault. Whoever they were, they will not be needing it.')
    out.append(m)
    # Shadow Grove: where the Twin Mirror drops you; the shadow castle's gate is sealed (for now)
    m = shadowize(grove(), 'Shadow Grove')
    m.extra['names'] = ['Withered Grove', 'Shadow Keep']
    for i, c in enumerate(m.col):
        if c == BARRIER:
            m.col[i] = SOLID
    m.sign(8, 9, 'Your own footprints lead away from the empty pedestal... but you have never been here.')
    # no pen on this side of the glass
    for y in range(6, 11):
        for x in range(11, 16):
            m.layers['deco'][y * m.w + x] = -1
            m.col[y * m.w + x] = OPEN
    m.signs.pop('10,8', None)
    m.spawn('captain', 20, 9)
    m.spawn('wisp', 12, 5)
    # the Shadow Keep opens once both Crystals are held
    before = m.snapshot()
    for x in range(22, 26):
        m.col[6 * m.w + x] = OPEN
    m.warp(23, 5, 'keep', 23, 25, 0)
    m.warp(24, 5, 'keep', 24, 25, 0)
    m.variant('crystals', before)
    m.sign(21, 7, 'SHADOW KEEP|Two crystal-shaped hollows are set into the gate.')
    out.append(m)
    return out


def drowned_vault():
    """Shadow dungeon 1: the Drowned Vault. Swim between platforms.
       (0,0) secret room (bomb the cracked wall)   (1,0) Big Chest (Power Glove)   (2,0) BOSS: the Twin Maws
       (0,1) Small Key, compass                    (1,1) entrance, swim north       (2,1) Drowned Knight, Big Key"""
    m = Map('vault', 48, 28, 'Drowned Vault', indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': 'vault', 'exit': ['s_meadow', 43, 8], 'boss': True, 'pendant': 'Crystal of the Deep', 'shadow': True})
    def pool(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = DEEP
    m.extra['flood'] = []
    door(m, 1, 1, 's')
    m.warp(23, 27, 's_meadow', 43, 8, 2)
    m.warp(24, 27, 's_meadow', 44, 8, 2)
    pool(17, 18, 30, 22)
    m.spawn('snapjaw', 20, 20)
    m.spawn('snapjaw', 27, 21)
    door(m, 1, 1, 'n')
    door(m, 1, 0, 's')
    m.chest(29, 24, 'map')
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    # west room (0,1): key across a pool; a cracked wall to the north hides a secret room
    pool(2, 19, 13, 21)
    m.chest(7, 17, 'key')
    m.chest(12, 25, 'compass')
    door(m, 0, 1, 'n', CRACK)
    door(m, 0, 0, 's')
    m.spawn('snapjaw', 6, 20)
    m.spawn('wisp', 3, 24)
    # secret room (0,0)
    m.chest(5, 5, 'heart_shard')
    m.chest(10, 5, 'cash50')
    # east room (2,1): the Drowned Knight; the Big Key appears when he falls
    m.spawn('drowned', 40, 21)
    m.chests['43,17'] = {'item': 'bigkey', 'big': False}
    m.extra.setdefault('reveal', {})['knight'] = [[43, 17]]
    m.extra.setdefault('triggers', []).append({'type': 'clear', 'area': 5, 'open': 'knight'})
    # north room (1,0): islands in a lake; the Big Chest on the far one; the boss door east
    pool(17, 3, 30, 12)
    for (x0, y0, x1, y1) in [(22, 10, 25, 12), (17, 3, 19, 5), (22, 3, 25, 6), (28, 6, 30, 9)]:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = OPEN
    bigchest(m, 23, 4, 'glove')
    door(m, 1, 0, 'e', BIGLOCK)
    door(m, 2, 0, 'w', BIGLOCK)
    m.spawn('snapjaw', 20, 8)
    m.spawn('snapjaw', 27, 4)
    # boss room (2,0): a deep pool ringed by walkway
    pool(35, 5, 44, 10)
    m.spawn('maw0', 37, 7)
    m.spawn('maw1', 42, 8)
    m.entry = [23, 25]
    return m


def hollow_quarry():
    """Shadow dungeon 2: the Hollow Quarry. Lift boulders, mind the pits.
       (0,0) the Quarry Boss guards the Big Key   (1,0) Big Chest (Mirror Shield)   (2,0) BOSS: the Stone Colossus
       (0,1) two blocks, two switches, the key     (1,1) entrance, boulder wall      (2,1) map, compass, fire bars"""
    m = Map('quarry', 48, 28, 'Hollow Quarry', indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': 'quarry', 'exit': ['s_highlands', 23, 7], 'boss': True, 'pendant': 'Crystal of Stone', 'shadow': True})
    def pit(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = PIT
                m.put('ground', CV, 1, 1, x, y)
    door(m, 1, 1, 's')
    m.warp(23, 27, 's_highlands', 23, 7, 2)
    m.warp(24, 27, 's_highlands', 24, 7, 2)
    rocks(m, [(x, 19) for x in range(17, 31)])
    door(m, 1, 1, 'n')
    door(m, 1, 0, 's')
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    m.spawn('captain', 21, 23)
    m.spawn('wisp', 27, 17)
    # west room (0,1): two blocks onto two switches open the shutter to the key
    for (x, y) in [(4, 21), (10, 21)]:
        m.solid(x, y, 1, 1, BLOCK)
    m.extra['plates'] = [[4, 24], [10, 24]]
    for (x, y) in m.extra['plates']:
        m.solid(x, y, 1, 1, PLATE)
    m.extra.setdefault('triggers', []).append({'type': 'plate', 'at': [[4, 24], [10, 24]], 'open': 'qkey'})
    for (x, y) in [(6, 17), (6, 18), (9, 17), (9, 18), (6, 19), (9, 19)]:
        m.solid(x, y, 1, 1, SOLID)
        m.put('deco', IN, 6, 7, x, y)
    m.solid(7, 19, 2, 1, SHUTTER)
    m.extra.setdefault('shutters', {})['qkey'] = [[7, 19], [8, 19]]
    m.chest(7, 17, 'key')
    pit(1, 22, 2, 25)
    pit(12, 22, 14, 25)
    # east room (2,1): map and compass among fire bars
    m.chest(35, 17, 'map')
    m.chest(44, 25, 'compass')
    m.spawn('firebar', 38, 21, len=4, sp=2.0)
    m.spawn('firebar', 43, 20, len=3, sp=-2.4)
    pit(39, 24, 41, 26)
    # north room (1,0): the Big Chest behind boulders, fire bar, pits; the boss door east
    bigchest(m, 23, 4, 'shield2')
    rocks(m, [(22, 6), (23, 6), (24, 6), (25, 6), (21, 5), (26, 5)])
    pit(17, 8, 19, 12)
    pit(28, 8, 30, 12)
    m.spawn('firebar', 23, 10, len=4, sp=1.6)
    door(m, 1, 0, 'w')
    door(m, 0, 0, 'e')
    door(m, 1, 0, 'e', BIGLOCK)
    door(m, 2, 0, 'w', BIGLOCK)
    # north-west room (0,0): the Quarry Boss
    m.spawn('quarryboss', 8, 8)
    m.chests['7,4'] = {'item': 'bigkey', 'big': False}
    m.extra.setdefault('reveal', {})['qb'] = [[7, 4]]
    m.extra['triggers'].append({'type': 'clear', 'area': 0, 'open': 'qb'})
    # boss room (2,0): boulders to throw at the Stone Colossus
    rocks(m, [(35, 5), (44, 5), (35, 11), (44, 11)])
    m.spawn('colossus', 40, 7)
    m.entry = [23, 25]
    return m


def shadow_keep():
    """The final dungeon: the Shadow Keep, a mix of everything.
       (0,0) a ghostly nurse, rest      (1,0) Captain Brask returns; Big Chest (Sunfire Arrows)   (2,0) Vex's Shadow
       (0,1) swim, grapple to the key   (1,1) entrance: boulders, fire bar; clear it to go north  (2,1) torches in lava: Big Key"""
    m = Map('keep', 48, 28, 'Shadow Keep', indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': 'keep', 'exit': ['s_grove', 23, 7], 'boss': True, 'shadow': True, 'lava': []})
    def lava(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = PIT
                m.extra['lava'].append(y * m.w + x)
    def pool(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = DEEP
    m.extra['flood'] = []
    # entrance (1,1)
    door(m, 1, 1, 's')
    m.warp(23, 27, 's_grove', 23, 7, 2)
    m.warp(24, 27, 's_grove', 24, 7, 2)
    rocks(m, [(x, 21) for x in range(17, 31) if x not in (23, 24)])
    m.spawn('firebar', 23, 21, len=3, sp=2.2)
    door(m, 1, 1, 'n', SHUTTER, 'gate')
    door(m, 1, 0, 's')
    m.extra.setdefault('triggers', []).append({'type': 'clear', 'area': 4, 'open': 'gate'})
    m.spawn('captain', 20, 18)
    m.spawn('captain', 27, 18)
    m.spawn('wisp', 29, 24)
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    # west room (0,1): swim the moat; grapple the island chest and the post back
    pool(2, 18, 13, 22)
    for (x, y) in [(7, 19), (8, 19), (7, 20), (8, 20)]:
        m.col[y * m.w + x] = OPEN
    m.chest(7, 19, 'key')
    m.solid(7, 24, 1, 1, POST)
    m.spawn('snapjaw', 4, 21)
    m.spawn('snapjaw', 11, 19)
    # east room (2,1): two torches in lava; light them with the Ember Rod and the Big Key appears
    lava(34, 17, 36, 19)
    lava(43, 17, 45, 19)
    m.solid(35, 18, 1, 1, TORCH)
    m.solid(44, 18, 1, 1, TORCH)
    m.extra['lava'] = [i for i in m.extra['lava'] if i not in (18 * m.w + 35, 18 * m.w + 44)]
    m.chests['40,17'] = {'item': 'bigkey', 'big': False}
    m.extra.setdefault('reveal', {})['etorch'] = [[40, 17]]
    m.extra['triggers'].append({'type': 'torches', 'at': [[35, 18], [44, 18]], 'open': 'etorch'})
    m.spawn('wisp', 38, 23)
    m.spawn('wisp', 43, 24)
    m.spawn('archer', 46, 22)
    # north room (1,0): Brask again, and the Big Chest
    m.spawn('brask2', 23, 9)
    bigchest(m, 23, 4, 'sunarrows')
    lava(17, 3, 19, 5)
    lava(17, 10, 19, 12)
    lava(28, 3, 30, 5)
    lava(28, 10, 30, 12)
    door(m, 1, 0, 'w')
    door(m, 0, 0, 'e')
    door(m, 1, 0, 'e', BIGLOCK)
    door(m, 2, 0, 'w', BIGLOCK)
    # north-west room (0,0): rest before the end
    m.spawn('villager', 7, 6, look='baker', roam=0, dir=2, heal=True, ghost=True, talk=[
        [None, ['I was the castle nurse, on the other side. Here I am... whatever this is.', 'Sit. There. All mended. He is through the east doors. End it.']]])
    m.chest(12, 5, 'arrows')
    m.chest(3, 5, 'heart_shard')
    # the throne room (2,0)
    m.spawn('shadowvex', 40, 6)
    m.entry = [23, 25]
    return m


from regions import gen as G


def outer_regions():
    """The rest of the light world, generated by theme with hand-placed landmarks (see tools/regions/gen.py)."""
    out = []

    def R(mid, name, wx, wy, sw, sh, theme, openings, seed, names, hub=None, sea=None, keep=(), music='village'):
        rows = G.make(sw * 16, sh * 14, theme, openings, seed, hub=hub, sea_side=sea, keep=keep)
        m = region(mid, name, wx, wy, sw, sh, rows, music=music, base=G.THEMES[theme]['ground'])
        m.extra['names'] = names
        m.entry = list(hub or (sw * 8, sh * 7))
        # wildlife by theme: two creatures and a butterfly or so per screen
        import random as _r
        rr = _r.Random(seed * 7)
        pool = {'snow': ['skullblue', 'owl', 'slime3'], 'icelake': ['octopus', 'slime3', 'bluebat'], 'fields': ['slime', 'mushroom', 'snake'], 'foothills': ['lizard', 'mole', 'owl'], 'mountain': ['skull', 'owl', 'cyclope'],
                'lake': ['octopus', 'slime3', 'bluebat'], 'desert': ['snake', 'spiderred', 'skull', 'lizard'], 'coast': ['octopus', 'larva', 'mouse']}[theme]
        for a in m.areas:
            spots = [(x, y) for y in range(a[1] + 3, a[1] + a[3] - 3) for x in range(a[0] + 3, a[0] + a[2] - 3) if m.col[y * m.w + x] == OPEN]
            rr.shuffle(spots)
            for k, (x, y) in enumerate(spots[:3]):
                m.spawn(rr.choice(pool) if k < 2 else ('butterfly' if theme in ('fields', 'coast', 'foothills', 'lake') else rr.choice(pool)), x, y)
        out.append(m)
        return m

    # Northreach Downs (3-4, 0-1): foothills between Whisperwood and the peaks
    m = R('northreach', 'Northreach Downs', 3, 0, 2, 2, 'foothills', [('s', 15, 16), ('e', 8, 9), ('w', 6, 7)], 11,
          ['Crag Field', 'Windy Rise', 'Shepherd Hill', 'South Downs'], keep=[(6, 16, 10, 20)])
    house(m, 6, 16, ('nr_shepherd', 7, 12, 0))
    m.spawn('villager', 12, 22, look='farmer', roam=14, talk=[[None, ['Sheep? No, I keep logs. The logs keep me. It is a complicated arrangement.']]])
    m.spawn('villager', 9, 24, look='guard', roam=0, dir=1, racer=True, talk=[[None, ['Fancy a race? Touch the flag before the clock runs out.']]])
    best = max(((abs(x - 9) + abs(y - 24), x, y) for y in range(3, m.h - 3) for x in range(3, m.w - 3) if m.col[y * m.w + x] == OPEN and m.col[(y + 1) * m.w + x] == OPEN), default=(0, 20, 5))
    m.extra['race_goal'] = [best[1], best[2]]
    signboard(m, 14, 24, 'NORTHREACH DOWNS|North-east: Frostspire. West: Whisperwood. South: the Highlands.')
    m.extra['digs'] = {'25,9': 'cash50', '5,5': 'cash20'}
    for (k, x, y) in [('log', 20, 8), ('log', 8, 10), ('soldier', 22, 20), ('archer', 26, 14)]:
        m.spawn(k, x, y)
    out.append(interior('nr_shepherd', "Shepherd's Hut", ('northreach', 8, 21), 'house', npcs=[
        (7, 7, dict(look='elder', roam=4, talk=[[None, ['Up on Frostspire there is a great bird. Old Hollis the hermit says it answers to music.', 'He has a kazoo. Says it is the only instrument the bird respects.']]]))]))
    # Frostspire Peaks (5-9, 0-1)
    m = R('frostspire', 'Frostspire Peaks', 5, 0, 5, 2, 'snow', [('w', 8, 9), ('e', 6, 7), ('s', 20, 21)], 23,
          ['West Slope', 'Hermit Ledge', 'The Saddle', 'Eagle Crag', 'East Slope', 'Scree Fields', 'Old Mine', 'Frost Gate', 'Lower Crags', 'Ridge Road'],
          hub=(40, 14), keep=[(18, 3, 22, 6), (54, 3, 58, 6), (37, 3, 43, 8)])
    m.stamp(OW, 10, 31, 18, 3, 4, 3, col=SOLID)
    m.warp(19, 5, 'fs_hermit', 7, 12, 0)
    m.warp(20, 5, 'fs_hermit', 8, 12, 0)
    signboard(m, 23, 7, "HOLLIS|Hermit. Do not disturb. Unless you have soup.")
    m.stamp(OW, 10, 31, 54, 3, 4, 3, col=SOLID)
    m.warp(55, 5, 'fs_mine', 7, 12, 0)
    m.warp(56, 5, 'fs_mine', 8, 12, 0)
    m.sign(58, 7, 'OLD MINE|Closed. The ore ran out. Then the miners ran out.')
    m.chest(39, 4, 'heart_shard')
    m.chest(41, 4, 'flame')
    for x in range(38, 43):
        m.solid(x, 6, 1, 1, PEG)
    m.sign(37, 8, 'EAGLE CRAG|A great nest sits on the peak. The bird is away. A note: BACK SOON, GONE FISHING.')
    m.extra['digs'] = {'70,20': 'cash50', '12,22': 'bombs'}
    secret_cave(m, 64, 20, 'grotto7', ['cash50'], 'Frost-cold air. Someone left fifty cash and a very sad snowman.')
    for (k, x, y) in [('soldierBlue', 30, 12), ('archer', 50, 8), ('captain', 60, 16), ('log', 14, 18), ('wisp', 44, 20), ('soldier', 70, 10), ('archer', 25, 22)]:
        m.spawn(k, x, y)
    out.append(interior('fs_hermit', "Hollis's Cave", ('frostspire', 20, 6), 'house', npcs=[
        (7, 7, dict(look='scholar', roam=4, gives='kazoo', got=['Hollis: Here. My kazoo. Play it on Eagle Crag and the bird will come.', 'You got the Kazoo! Play it high on Frostspire to call the great bird.'], talk=[[None, ['Hollis. Hermit. I came up here to get away from people, and the people keep coming up here.', 'The bird on Eagle Crag? It carries travellers anywhere they have been. You would need a tune to call it.']]]))]))
    mine = interior('fs_mine', 'Old Mine', ('frostspire', 56, 6), 'house', chests=[(5, 4, 'cash100'), (7, 4, 'bombs')], npcs=[
        (10, 9, dict(look='scholar', roam=0, dir=2, ghost=True, well=True, talk=[[None, ['A wishing well, deep in the mine. A voice echoes up: "Throw in a hundred, I will make it worth your while."']]]))])
    mine.music = 'cave'
    out.append(mine)
    # Skyridge (10-11, 0)
    m = R('skyridge', 'Skyridge', 10, 0, 2, 1, 'snow', [('w', 6, 7), ('s', 8, 9)], 31, ['Skyridge West', 'Skyridge East'], hub=(16, 7))
    m.chest(28, 3, 'riot')
    for x in (27, 28, 29):
        m.solid(x, 4, 1, 1, PEG)
    m.solid(27, 3, 1, 1, PEG)
    m.solid(29, 3, 1, 1, PEG)
    m.spawn('archer', 20, 4)
    m.spawn('soldierBlue', 10, 9)
    # Icemere (10-11, 1-3): a cold lake with islands
    m = R('icemere', 'Icemere', 10, 1, 2, 3, 'icelake', [('n', 8, 9), ('w', 18, 19), ('w', 32, 33)], 41,
          ['North Shore', 'Frost Bay', 'Mid Isles', 'East Isles', 'South Shore', 'Thaw Point'], hub=(4, 20))
    cave = interior('im_cave', 'Frost Cave', ('icemere', 24, 13), 'house', chests=[(7, 4, 'frost')], npcs=[
        (11, 9, dict(look='scholar', roam=0, dir=3, ghost=True, gives='halfEnergy', got=['A frost spirit breathes on you. You feel lighter.', 'Your energy use is halved!'], talk=[[None, ['The cold is mine. Take the rod. And take this blessing: you will tire half as fast.']]]))])
    cave.music = 'cave'
    out.append(cave)
    m.sign(6, 4, 'ICEMERE|The water never thaws. The fish never complain.')
    m.stamp(OW, 10, 31, 23, 10, 4, 3, col=SOLID)
    m.warp(24, 12, 'im_cave', 7, 12, 0)
    m.warp(25, 12, 'im_cave', 8, 12, 0)
    for y in (13, 14):
        for x in range(22, 28):
            m.put('ground', OW, (x + y) % 2, 9, x, y)
            m.col[y * m.w + x] = OPEN
    m.chest(28, 38, 'heart_shard')
    m.spawn('villager', 5, 36, look='fisher', roam=8, talk=[[None, ['Ice fishing! Well, lake fishing. The ice gave up years ago.', 'There is a cave across the water where the cold comes from. Nobody goes in. Nobody can swim that far.']]])
    for (k, x, y) in [('snapjaw', 12, 14), ('snapjaw', 20, 28), ('snapjaw', 15, 22), ('soldier', 5, 28)]:
        m.spawn(k, x, y)
    # Eastvale (5-9, 2): fields under the mountains
    m = R('eastvale', 'Eastvale', 5, 2, 5, 1, 'fields', [('n', 20, 21), ('e', 4, 5), ('s', 60, 61), ('s', 11, 12)], 53,
          ['Vale West', 'Millfield', 'Vale Cross', 'Long Acre', 'Vale East'], hub=(40, 7), keep=[(34, 2, 38, 6)])
    house(m, 34, 2, ('ev_mill', 7, 12, 0))
    signboard(m, 41, 8, 'EASTVALE|Turnips, more turnips, and on special occasions, turnips.')
    m.spawn('villager', 52, 9, look='baker', roam=8, gives='net', got=['Here, take my old Bug Net. I am too old for bugs. I am into rocks now.', 'You got the Bug Net! Catch fairies in empty bottles.'], talk=[[None, ['I collect bugs. And fairies, if you can catch them. Try the glade in Whisperwood.']]])
    m.spawn('villager', 44, 9, look='farmer', roam=12, talk=[[None, ['The Chancellor taxes turnips now. So we grow them under other turnips. Hidden turnips. Tax-free.']]])
    m.extra['digs'] = {'64,10': 'cash50', '12,9': 'cash20'}
    for (k, x, y) in [('log', 20, 8), ('log', 56, 6), ('soldier', 30, 10), ('soldier', 70, 8)]:
        m.spawn(k, x, y)
    out.append(interior('ev_mill', 'Vale Mill', ('eastvale', 36, 7), 'house', npcs=[
        (7, 7, dict(look='baker', roam=4, talk=[[None, ['Flour, flour everywhere. I sneeze in the shape of bread now.']]]))], chests=[(6, 4, 'bottle')]))
    # Riverlands (8-9, 3)
    m = R('riverlands', 'Riverlands', 8, 3, 2, 1, 'fields', [('n', 12, 13), ('e', 4, 5), ('s', 8, 9)], 61, ['Ford', 'Reedbank'], hub=(14, 7))
    signboard(m, 16, 9, 'SOUTH: the Sunscar Desert. Bring water. Bring more water than that.')
    m.spawn('log', 22, 6)
    m.spawn('archer', 6, 10)
    # Saltmarsh (6-7, 4-7): coast, the old graveyard
    m = R('saltmarsh', 'Saltmarsh', 6, 4, 2, 4, 'coast', [('w', 11, 11), ('w', 23, 25), ('e', 28, 30)], 71,
          ['Salt Flats', 'Gull Rock', 'Old Graveyard', 'Mourner\'s Rest', 'Driftwood', 'Wreck Point', 'Low Tide', 'Sea Wall'], sea='s', hub=(14, 26), keep=[(4, 30, 14, 38)])
    for (x, y) in [(5, 31), (8, 31), (5, 34), (8, 34), (5, 37)]:
        m.stamp(OW, 35, 5, x, y, 2, 2, col=SOLID)
    m.stamp(OW, 35, 5, 10, 36, 2, 2, col=SOLID)
    m.col[37 * m.w + 11] = SOLID
    m.extra['bonk'] = {'11,37': ['sm_crypt', 7, 12]}
    m.chest(13, 32, 'storm')
    for (x, y) in [(12, 32), (14, 32), (12, 33), (13, 33), (14, 33)]:
        m.col[y * m.w + x] = DARKROCK
    m.sign(10, 38, 'THE DUKE OF SALTMARSH|He took his secrets to the grave. Also his cloak. He was very attached to it.')
    m.sign(8, 37, 'Here lies Grimsby. He borrowed money from the wrong man. And the right man. And several others.')
    m.extra['digs'] = {'8,36': 'cash100', '20,20': 'cash20', '25,40': 'cash50'}
    m.spawn('villager', 16, 33, look='scholar', roam=6, talk=[[None, ['I tend the graves. Quiet work. The residents never complain about the hours.', 'There is a cloak buried with the old Duke, they say. A cloak that hides you from sight.']]])
    crypt = interior('sm_crypt', "The Duke's Crypt", ('saltmarsh', 11, 38), 'house', chests=[(7, 4, 'cloak')])
    crypt.music = 'cave'
    out.append(crypt)
    secret_cave(m, 22, 14, 'grotto8', ['cash20', 'arrows'], 'A smugglers\' nook, smelling of salt and bad decisions.')
    for (k, x, y) in [('log', 20, 10), ('soldier', 24, 22), ('wisp', 10, 28), ('archer', 26, 34), ('snapjaw', 15, 51)]:
        m.spawn(k, x, y)
    # Sunscar Desert (8-11, 4-7)
    m = R('desert', 'Sunscar Desert', 8, 4, 4, 4, 'desert', [('n', 8, 9), ('w', 28, 30)], 83,
          ['Dune Gate', 'Bone Flats', 'Sunscar Ruins', 'Far Dunes', 'Mirage Pools', 'Nomad Camp', 'Glass Sands', 'Scorpion Rock',
           'Dry Wells', 'Red Mesa', 'Old Road', 'Sun Temple Steps', 'Last Dunes', 'Sand Sea', 'Dust Bowl', 'World\'s End'],
          hub=(32, 28), keep=[(36, 4, 41, 8), (20, 22, 25, 27), (48, 44, 53, 48)], music='village')
    m.stamp(OW, 4, 31, 37, 4, 4, 3, col=SOLID)
    m.sign(36, 8, 'Old script is carved into the stone: [you cannot read it]')
    m.extra['oldscript'] = {'36,8': 'The sun temple keeps its gift for those who read. Stand where the shadow of the third pillar falls at noon, and dig.'}
    m.extra['digs'] = {'44,10': 'cash100', '40,9': 'quake', '10,40': 'cash50', '60,52': 'cash100', '28,48': 'bombs'}
    house(m, 20, 22, ('ds_camp', 7, 12, 0))
    m.spawn('villager', 27, 28, look='trader', roam=6, talk=[[None, ['Welcome to the nomad camp! We move every day. Today we moved zero metres. Tomorrow, who knows?']]])
    secret_cave(m, 48, 44, 'grotto9', ['heart_shard', 'bottle'], 'A cool cellar under the sand. Somebody has been storing ice here. Somebody very optimistic.')
    for (k, x, y) in [('captain', 30, 12), ('archer', 50, 16), ('wisp', 14, 30), ('wisp', 44, 34), ('soldierBlue', 56, 26), ('log', 12, 14), ('captain', 36, 46), ('archer', 20, 50)]:
        m.spawn(k, x, y)
    out.append(interior('ds_camp', 'Nomad Tent', ('desert', 22, 27), 'house', npcs=[
        (11, 9, dict(look='scholar', roam=0, dir=3, ghost=True, well=True, talk=[[None, ['A well in the tent. Do not ask. Throw in a hundred and wish.']]])),
        (7, 7, dict(look='trader', roam=4, talk=[[None, ['The ruins north of here are covered in old script. My grandmother could read it. She read it to me as bedtime stories.', 'They were mostly about taxes.']]]))], chests=[(6, 4, 'arrows')]))
    # Southshore (0-5, 7): the south coast below the towns
    m = R('southshore', 'Southshore', 0, 7, 6, 1, 'coast', [('n', 14, 15), ('n', 35, 39)], 97,
          ['Fen Beach', 'Shell Cove', 'Marrow Sands', 'Pier Point', 'Long Beach', 'Smugglers\' Bay'], sea='s', hub=(48, 5))
    m.spawn('villager', 40, 6, look='fisher', roam=0, dir=2, fishing=True, talk=[[None, ['Best beach in Varrowmere. Only beach in Varrowmere. Both true.']]])
    m.extra['digs'] = {'70,6': 'cash50', '30,6': 'bottle', '20,5': 'cash20', '88,6': 'cash50'}
    for (k, x, y) in [('log', 26, 5), ('soldier', 60, 5), ('snapjaw', 50, 11)]:
        m.spawn(k, x, y)
    return out


GHOST_LINES = [
    'I was mugged so many times I started charging admission.',
    'Do not trust the Chancellor. Do not trust me either. I am a ghost; we lie for fun.',
    'Back home I had a plushie collection. Here I have a collection of regrets.',
    'They hospitalised me for a week. I came back and the queue for the hospital was longer than the stay.',
    'I put all my cash in a bank once. The bank put it in the Chancellor.',
    'Energy drinks are not food. I learned that the hard way. I am a ghost now.',
    'In the shadow, everything costs double and nobody pays.',
    'I travelled the world once. Came back with a suitcase full of flowers. Still not sure why.',
    'Never attack someone with a higher level than you. Wise words. Shame I ignored them.',
    'Seven Crystals, they say. I only ever found three. And a sock.',
    'My nerve is full, but my courage is empty.',
    'The bazaar here sells shadows of things. I bought a shadow of a sandwich. Very filling, emotionally.',
]


def shadow_regions():
    """Shadow copies of every outer region, peopled with the Shadow's soldiers and spirits."""
    import random
    out = []
    srcs = [whisperwood()[0]] + willowfen()[:2] + [marrowgate()] + [r for r in outer_regions() if r.extra.get('world')]
    for m in srcs:
        s_ = shadowize(m, 'Shadow ' + m.name)
        s_.extra['names'] = ['Shadow ' + n for n in m.extra.get('names', [])]
        R = random.Random(sum(map(ord, m.id)))
        pool = ['skullblue', 'cyclope', 'beast', 'eye', 'bluebat', 'reptile2', 'captain', 'wisp']
        free = [(x, y) for y in range(3, s_.h - 3) for x in range(3, s_.w - 3) if s_.col[y * s_.w + x] == OPEN and s_.col[(y + 1) * s_.w + x] == OPEN and s_.layers['deco'][y * s_.w + x] < 0]
        R.shuffle(free)
        digs = {}
        for (x, y) in free[:3]:
            digs['%d,%d' % (x, y)] = R.choice(['cash20', 'cash50', 'bombs', 'arrows', 'cash5'])
        s_.extra['digs'] = digs
        if len(free) > 4:
            cx, cy = free[3]
            s_.chest(cx, cy, R.choice(['cash50', 'cash100', 'arrows', 'bombs']))
        for (x, y) in free[4:6]:
            s_.spawn('villager', x, y, look=R.choice(['elder', 'farmer', 'scholar', 'baker', 'fisher']), roam=8, ghost=True, talk=[[None, [R.choice(GHOST_LINES)]]])
        for a in s_.areas:
            for k in range(2):
                for _ in range(40):
                    x, y = R.randrange(a[0] + 3, a[0] + a[2] - 3), R.randrange(a[1] + 3, a[1] + a[3] - 3)
                    if s_.col[y * s_.w + x] == OPEN:
                        s_.spawn(R.choice(pool), x, y)
                        break
        ent = {'s_whisperwood': [(38, 4, 'bonehollow'), (39, 4, 'bonehollow')], 's_marrowgate': [(46, 7, 'thievesden')],
               's_icemere': [(24, 12, 'frostmere'), (25, 12, 'frostmere')], 's_willowfen': [(5, 21, 'mirefen')],
               's_frostspire': [(19, 5, 'turtleback'), (20, 5, 'turtleback')]}.get(s_.id, [])
        for (x, y, to) in ent:
            s_.warp(x, y, to, 23 if x % 2 == 0 else 24, 25, 0)
        out.append(s_)
    return out


def make_dungeon(mid, name, back, theme, item, crystal, mini, boss, gate):
    """A Shadow dungeon from the common plan, dressed by theme, with an item gate that needs the dungeon's own item:
       (0,0) secret room behind the item gate (heart piece)   (1,0) Big Chest, boss door east   (2,0) BOSS
       (0,1) the Small Key behind a puzzle                    (1,1) entrance: clear it to go north (2,1) mini-boss, then the Big Key"""
    m = Map(mid, 48, 28, name, indoor=True, music='dungeon')
    for ry in range(2):
        for rx in range(3):
            room(m, rx, ry)
    m.extra.update({'dungeon': mid, 'exit': [back[0], back[1], back[2]], 'boss': True, 'pendant': crystal, 'shadow': True, 'lava': [], 'flood': [], 'spill': []})
    def lava(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = PIT
                m.extra['lava'].append(y * m.w + x)
    def pit(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                m.col[y * m.w + x] = PIT
                m.put('ground', CV, 1, 1, x, y)
    def pool(x0, y0, x1, y1, kind=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if kind:
                    m.extra[kind].append(y * m.w + x)
                else:
                    m.col[y * m.w + x] = DEEP
    hazard = {'forest': pit, 'thieves': pit, 'ice': pool, 'swamp': lambda *a: pool(*a, kind='flood'), 'turtle': lava}[theme]
    foes = {'forest': ['skull', 'bluebat', 'mushroom'], 'thieves': ['soldier', 'archer', 'spiderred'], 'ice': ['slime3', 'skullblue', 'bluebat'],
            'swamp': ['snake', 'octopus', 'slime'], 'turtle': ['beast', 'eye', 'lizard']}[theme]
    # entrance (1,1)
    door(m, 1, 1, 's')
    m.warp(23, 27, back[0], back[1], back[2], 2)
    m.warp(24, 27, back[0], back[1], back[2], 2)
    door(m, 1, 1, 'n', SHUTTER, 'hall')
    door(m, 1, 0, 's')
    m.extra.setdefault('triggers', []).append({'type': 'clear', 'area': 4, 'open': 'hall'})
    hazard(18, 18, 20, 21)
    hazard(27, 18, 29, 21)
    for k, (x, y) in enumerate([(21, 19), (26, 19), (23, 22)]):
        m.spawn(foes[k % 3], x, y)
    door(m, 1, 1, 'w')
    door(m, 0, 1, 'e')
    door(m, 1, 1, 'e', LOCKED)
    door(m, 2, 1, 'w', LOCKED)
    # west room (0,1): the Small Key in an alcove opened by a switch (push the block on, or light the torches)
    for (x, y) in [(2, 17), (2, 18), (5, 17), (5, 18), (2, 19), (5, 19)]:
        m.solid(x, y, 1, 1, SOLID)
        m.put('deco', IN, 6, 7, x, y)
    m.solid(3, 19, 2, 1, SHUTTER)
    m.extra.setdefault('shutters', {})['wkey'] = [[3, 19], [4, 19]]
    m.chest(3, 17, 'key')
    if theme in ('forest', 'turtle'):
        m.solid(8, 17, 1, 1, TORCH)
        m.solid(13, 17, 1, 1, TORCH)
        m.extra['triggers'].append({'type': 'torches', 'at': [[8, 17], [13, 17]], 'open': 'wkey'})
    else:
        m.solid(10, 21, 1, 1, BLOCK)
        m.extra['plates'] = [[10, 24]]
        m.solid(10, 24, 1, 1, PLATE)
        m.extra['triggers'].append({'type': 'plate', 'at': [[10, 24]], 'open': 'wkey'})
    hazard(2, 22, 5, 24)
    m.spawn(foes[0], 12, 19)
    m.spawn(foes[1], 7, 25)
    m.chest(13, 25, 'compass')
    # east room (2,1): the mini-boss; the Big Key appears when it falls
    m.spawn(mini, 40, 21)
    m.chests['40,17'] = {'item': 'bigkey', 'big': False}
    m.extra.setdefault('reveal', {})['mini'] = [[40, 17]]
    m.extra['triggers'].append({'type': 'clear', 'area': 5, 'open': 'mini'})
    m.chest(45, 25, 'map')
    # north room (1,0): the Big Chest, hazards, the boss door east, and the item gate west
    bigchest(m, 23, 4, item)
    hazard(17, 8, 19, 11)
    hazard(28, 8, 30, 11)
    m.spawn(foes[2], 20, 6)
    m.spawn(foes[0], 27, 10)
    door(m, 1, 0, 'e', BIGLOCK)
    door(m, 2, 0, 'w', BIGLOCK)
    door(m, 1, 0, 'w')
    door(m, 0, 0, 'e')
    # north-west room (0,0): the item gate guards a heart piece and some cash
    for y in range(3, 13):
        m.solid(11, y, 1, 1, gate)
    m.chest(5, 5, 'cash100')
    m.chest(8, 5, 'plushie' if mid == 'thievesden' else 'arrows')
    # the boss room (2,0)
    m.spawn(boss, 40, 7)
    if boss == 'shellback':
        rocks(m, [(35, 5), (44, 5), (35, 11), (44, 11)])
    m.entry = [23, 25]
    return m


def shadow_dungeons():
    return [
        make_dungeon('bonehollow', 'Bonehollow', ('s_whisperwood', 38, 5), 'forest', 'hammer', 'Crystal of Bone', 'garrow', 'hollowking', PEG),
        make_dungeon('thievesden', "Thieves' Den", ('s_marrowgate', 46, 8), 'thieves', 'gloves', 'Crystal of Shadows', 'brask2', 'banditqueen', DARKROCK),
        make_dungeon('frostmere', 'Frostmere Palace', ('s_icemere', 24, 13), 'ice', 'bluemail', 'Crystal of Frost', 'drowned', 'frostwyrm', PEG),
        make_dungeon('mirefen', 'Mirefen Temple', ('s_willowfen', 5, 22), 'swamp', 'wand', 'Crystal of the Mire', 'hald', 'bogmaw', DARKROCK),
        make_dungeon('turtleback', 'Turtleback', ('s_frostspire', 20, 6), 'turtle', 'redmail', 'Crystal of Embers', 'quarryboss', 'shellback', PEG),
    ]


def arcade_vault():
    """The bonus dungeon: hard, optional, deep under Marrowgate's chest game. The Golden Blade waits at the end."""
    m = make_dungeon('arcadevault', 'The Arcade Vault', ('marrowgate', 46, 8), 'turtle', 'golden', 'Arcade Token', 'brask2', 'pyrewyrm', DARKROCK)
    return m


if __name__ == '__main__':
    built = [thistledown(), home(), cave1(), meadow_ruins(), riverhead(), sunken_shrine(), highlands(), ember_forge(), grove(), ashford_castle(), *shadow_world(), drowned_vault(), hollow_quarry(), shadow_keep(), marrowgate(), *marrowgate_interiors(), *willowfen(), *whisperwood(), *outer_regions(), *shadow_regions(), *shadow_dungeons(), arcade_vault()]
    import world as WORLD
    built = WORLD.rebuild(built, sys.modules[__name__])      # lay the overworld out to tools/worldplan.py
    out = {m.id: m.json() for m in built}
    out.update({g.id: g.json() for g in GROTTOS})
    os.makedirs('src/data', exist_ok=True)
    def rle(a):                         # run-length: value, count, value, count ... (decoded in src/01-world.js)
        o, i = [], 0
        while i < len(a):
            j = i
            while j < len(a) and a[j] == a[i]:
                j += 1
            o += [a[i], j - i]
            i = j
        return o
    for d in out.values():
        d['layers'] = {k: rle(v) for k, v in d['layers'].items()}
        d['col'] = rle(d['col'])
        d['rle'] = 1
    json.dump(out, open('src/data/maps.json', 'w'), separators=(',', ':'))
    print('maps', {k: (v['w'], v['h']) for k, v in out.items()})
