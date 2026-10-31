"""Map builder for Legend of Varrowmere.

Maps are authored here in Python with stamps from the CC0 art pack, then written to src/data/maps.json.
Each map has three art layers (ground, deco under actors, over above actors), a collision grid,
camera areas (one per screen, like the original), warps, signs, chests and spawns.

Tile reference: sheet << 16 | ty << 8 | tx, or -1 for empty.
Sheets: 0 Overworld, 1 Inner, 2 cave, 3 objects.
Collision codes: 0 open, 1 solid, 2 deep water, 3 pit, 4 ledge (jump south), 5 low wall (blocks walking, not arrows),
                 6 bush (solid, cuttable, liftable), 7 rock (solid, liftable), 8 shallow water.
"""
import json, os
OW, IN, CV, OB = 0, 1, 2, 3
OPEN, SOLID, DEEP, PIT, LEDGE, LOW, BUSH, ROCK, SHALLOW, CRACK, TORCH, TORCH_LIT = range(12)


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

    def json(self):
        return {'id': self.id, 'name': self.name, 'w': self.w, 'h': self.h, 'layers': self.layers, 'col': self.col,
                'areas': self.areas or [[0, 0, self.w, self.h]], 'warps': self.warps, 'signs': self.signs,
                'chests': self.chests, 'spawns': self.spawns, 'indoor': self.indoor, 'dark': self.dark,
                'music': self.music, 'entry': self.entry}


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


def forest(m, x, y):                 # 4 wide tree block: canopy above actors, trunks solid
    for j in range(6):
        for i in range(4):
            layer = 'over' if j < 3 else 'deco'
            m.put(layer, OW, 4 + i, 9 + j, x + i, y + j)
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
    for x in range(x0, x1 + 1):
        m.stamp(OW, 3, 17, x, y, col=LOW)


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


# ---------- the first area: Thistledown and the east meadow ----------
def thistledown():
    m = Map('meadow', 32, 14, 'Thistledown')
    m.area(0, 0)
    m.area(16, 0)
    grass(m, 0, 0, 31, 13)
    lake(m, -1, 11, 32, 14)
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
    for (x, y) in [(19, 5), (20, 5), (19, 6), (23, 10), (24, 10), (25, 4)]:
        bush(m, x, y)
    flowers(m, [(21, 9), (22, 6), (26, 9), (18, 9)])
    signboard(m, 25, 7, 'EAST CAVE|Beware of the logs. They are not just logs.')
    m.spawn('log', 21, 7)
    m.spawn('soldier', 22, 10)
    m.spawn('archer', 26, 4)
    m.chest(30, 4, 'bombs')
    for (x, y) in [(29, 4), (30, 5), (31, 4)]:
        bush(m, x, y)
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
    m.chest(23, 6, 'bow')
    m.chest(20, 10, 'arrows')
    m.warp(7, 13, 'meadow', 28, 8, 2)
    m.warp(8, 13, 'meadow', 29, 8, 2)
    m.spawn('log', 5, 6)
    m.spawn('log', 12, 11)
    m.spawn('log', 25, 9)
    m.sign(14, 11, 'Scratched into the rock:|"The wall to the east sounds hollow."')
    m.entry = [7, 12]
    return m


if __name__ == '__main__':
    out = {m.id: m.json() for m in (thistledown(), home(), cave1())}
    os.makedirs('src/data', exist_ok=True)
    json.dump(out, open('src/data/maps.json', 'w'), separators=(',', ':'))
    print('maps', {k: (v['w'], v['h']) for k, v in out.items()})
