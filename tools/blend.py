"""Generate soft, rounded transition tiles between two kinds of ground (art/generated/blend.png).

For every pair (top ground over bottom ground) there are 256 tiles, one per pattern of the 8 neighbours, laid out
16 x 16: pair p, mask k -> tile (k & 15, p * 16 + (k >> 4)). A tile is the top ground with its edges eaten away
(a wavy fringe on open sides, round outer corners, small inner notches) showing the bottom ground, and a darker
outline pixel where the two meet, so patches of dirt, grass and so on have soft pixel-art edges instead of square ones.
"""
from PIL import Image
import math, os

N, E, S, W, NE, SE, SW, NW = 1, 2, 4, 8, 16, 32, 64, 128
ART = os.path.join(os.path.dirname(__file__), '..', 'art')
SHEETS = {'ow': 'pack-armm1998/Overworld.png', 'nf': 'ninja-adventure/TilesetFloor.png', 'nw': 'ninja-adventure/TilesetWater.png', 'ni': 'ninja-adventure/TilesetInteriorFloor.png'}
# (top sheet, tx, ty), (bottom sheet, tx, ty)
PAIRS = [
    (('nf', 12, 8), ('nf', 11, 12)),  # 0: dirt on grass
    (('nf', 11, 12), ('nf', 1, 1)),   # 1: grass on sand
    (('nf', 11, 12), ('nf', 1, 15)),  # 2: grass on snow
    (('nf', 11, 12), ('nf', 12, 8)),  # 3: grass on dirt
    (('nw', 1, 7), ('nf', 11, 12)),   # 4: water in grass (white foam at the edge)
    (('nw', 1, 7), ('nf', 12, 8)),    # 5: water against dirt (beaches)
    (('nw', 1, 7), ('nf', 1, 1)),     # 6: water against sand
    (('nw', 1, 7), ('ni', 12, 13)),   # 7: water in a dungeon
    (('black', 0, 0), ('ni', 12, 13)),  # 8: a pit in a dungeon floor
]
WAVE = [2, 2, 3, 3, 2, 1, 1, 2, 2, 3, 2, 2, 1, 1, 1, 2]   # fringe depth along an open side (period 16 so it runs on)


def inside(k, x, y):
    px, py = x + 0.5, y + 0.5
    n, e, s, w = k & N, k & E, k & S, k & W
    if not n and py < WAVE[x]: return False
    if not s and 16 - py < WAVE[(x + 7) % 16]: return False
    if not w and px < WAVE[(y + 3) % 16]: return False
    if not e and 16 - px < WAVE[(y + 11) % 16]: return False
    R = 6
    for (a, b, cx, cy) in ((n, w, R, R), (n, e, 16 - R, R), (s, w, R, 16 - R), (s, e, 16 - R, 16 - R)):
        if not a and not b and ((px < cx) if cx == R else (px > cx)) and ((py < cy) if cy == R else (py > cy)):
            if math.hypot(px - cx, py - cy) > R - 1.5: return False
    for (a, b, d, cx, cy) in ((n, w, k & NW, 0, 0), (n, e, k & NE, 16, 0), (s, w, k & SW, 0, 16), (s, e, k & SE, 16, 16)):
        if a and b and not d and math.hypot(px - cx, py - cy) < 3.5: return False
    return True


def tile(sheets, ref):
    s, tx, ty = ref
    if s == 'black':
        return Image.new('RGBA', (16, 16), (12, 8, 10, 255))
    return sheets[s].crop((tx * 16, ty * 16, tx * 16 + 16, ty * 16 + 16)).convert('RGBA')


def build():
    sheets = {k: Image.open(os.path.join(ART, f)).convert('RGBA') for k, f in SHEETS.items()}
    out = Image.new('RGBA', (256, 256 * len(PAIRS)), (0, 0, 0, 0))
    for p, (top, bot) in enumerate(PAIRS):
        T, B = tile(sheets, top), tile(sheets, bot)
        for k in range(256):
            t = B.copy()
            ins = [[inside(k, x, y) for x in range(16)] for y in range(16)]
            for y in range(16):
                for x in range(16):
                    if not ins[y][x]:
                        continue
                    c = T.getpixel((x, y))
                    edge = any(0 <= x + dx < 16 and 0 <= y + dy < 16 and not ins[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    if edge:
                        c = (236, 250, 255, 255) if 4 <= p <= 7 else (int(c[0] * 0.72), int(c[1] * 0.72), int(c[2] * 0.72), 255)
                    elif 4 <= p <= 7 and any(0 <= x + dx < 16 and 0 <= y + dy < 16 and not ins[y + dy][x + dx] for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2))):
                        c = (int(c[0] * 0.8), int(c[1] * 0.85), int(c[2] * 0.95), 255)
                    t.putpixel((x, y), c)
            out.paste(t, ((k & 15) * 16, p * 256 + (k >> 4) * 16))
    os.makedirs(os.path.join(ART, 'generated'), exist_ok=True)
    out.save(os.path.join(ART, 'generated', 'blend.png'))


def mask(isB, x, y):
    """The neighbour pattern of cell (x, y); isB(x, y) says whether a cell is the top ground."""
    k = 0
    for bit, dx, dy in ((N, 0, -1), (E, 1, 0), (S, 0, 1), (W, -1, 0), (NE, 1, -1), (SE, 1, 1), (SW, -1, 1), (NW, -1, -1)):
        if isB(x + dx, y + dy):
            k |= bit
    return k


if __name__ == '__main__':
    build()
