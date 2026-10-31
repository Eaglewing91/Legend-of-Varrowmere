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
OPEN, SOLID, DEEP, PIT, LEDGE, LOW, BUSH, ROCK, SHALLOW, CRACK, TORCH, TORCH_LIT, LOCKED, BIGLOCK, BLOCK, PLATE, SHUTTER, BIGCHEST, LEVER, SWITCH, POST, _21, PEDESTAL, BARRIER = range(24)



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

    def json(self):
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


# ---------- the first area: Thistledown and the east meadow ----------
def thistledown():
    m = Map('meadow', 48, 14, 'Thistledown')
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


def boulder(m, x, y):                 # a big 2x2 mountain boulder
    m.stamp(OW, 9, 11, x, y, 2, 2, col=SOLID)


def rockpile(m, x, y):
    m.stamp(OW, 11, 11, x, y, 2, 2, col=SOLID)


def highlands():
    """North of Thistledown: the hamlet of Cinderfold and the mountain path up to the Ember Forge.
       (0,1) Cinderfold   (0,0) mountain path   (1,0) the Forge gate   (1,1) the overlook"""
    m = Map('highlands', 32, 28, 'Cinder Highlands')
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
    m.put('deco', OW, 9, 11, 2, 8)
    m.put('deco', OW, 9, 12, 2, 9)
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


def shadowize(m, name):
    """Copy an overworld map into Shadow Varrowmere: same ground, darker palette, no people, new enemies."""
    import copy
    s = copy.deepcopy(m)
    s.id, s.name, s.music = 's_' + m.id, name, 'shadow'
    s.extra['shadow'] = True
    s.extra.pop('variants', None)
    s.spawns, s.chests, s.signs = [], {}, {}
    s.warps = [dict(w, to='s_' + w['to']) for w in m.warps if w['to'] in ('meadow', 'highlands', 'grove', 'riverhead')]
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
    out.append(m)
    # Shadow Grove: where the Twin Mirror drops you; the shadow castle's gate is sealed (for now)
    m = shadowize(grove(), 'Shadow Grove')
    m.extra['names'] = ['Withered Grove', 'Shadow Keep']
    for i, c in enumerate(m.col):
        if c == BARRIER:
            m.col[i] = SOLID
    m.sign(8, 9, 'Your own footprints lead away from the empty pedestal... but you have never been here.')
    m.spawn('captain', 20, 9)
    m.spawn('wisp', 12, 9)
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


if __name__ == '__main__':
    out = {m.id: m.json() for m in (thistledown(), home(), cave1(), meadow_ruins(), riverhead(), sunken_shrine(), highlands(), ember_forge(), grove(), ashford_castle(), *shadow_world(), drowned_vault(), hollow_quarry())}
    os.makedirs('src/data', exist_ok=True)
    json.dump(out, open('src/data/maps.json', 'w'), separators=(',', ':'))
    print('maps', {k: (v['w'], v['h']) for k, v in out.items()})
