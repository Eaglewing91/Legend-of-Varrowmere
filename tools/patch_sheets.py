"""Patch the old art pack's sheets with Ninja Adventure art in the very slots the maps and code use, so chests, signs,
fences, graves, barrels, dungeon gates, cave mouths and market stalls all become pack art without touching any map.
Writes art/generated/Overworld.png, objects.png, cave.png, Inner.png and lava.png."""
from PIL import Image
import os

ART = os.path.join(os.path.dirname(__file__), '..', 'art')
L = lambda f: Image.open(os.path.join(ART, f)).convert('RGBA')


def build():
    ow, ob, cv, nat = L('pack-armm1998/Overworld.png'), L('pack-armm1998/objects.png'), L('pack-armm1998/cave.png'), L('ninja-adventure/TilesetNature.png')
    house, elem, va = L('ninja-adventure/TilesetHouse.png'), L('ninja-adventure/TilesetElement.png'), L('ninja-adventure/TilesetVillageAbandoned.png')
    little, big = L('ninja-adventure/items/LittleTreasureChest.png'), L('ninja-adventure/items/BigTreasureChest.png')
    tile = lambda im, tx, ty, w=1, h=1: im.crop((tx * 16, ty * 16, (tx + w) * 16, (ty + h) * 16))

    def put(sheet, tx, ty, img, w=1, h=1, dx=0, dy=0):
        sheet.paste(Image.new('RGBA', (w * 16, h * 16), (0, 0, 0, 0)), (tx * 16, ty * 16))
        sheet.alpha_composite(img, (tx * 16 + dx, ty * 16 + dy))

    # chests: small closed / open, big closed / open (centred in the two-tile slot)
    put(ob, 0, 0, little.crop((0, 0, 16, 16)))
    put(ob, 1, 0, little.crop((16, 0, 32, 16)))
    bw = big.width // 2
    put(ob, 9, 0, big.crop((0, 0, bw, big.height)), 2, 1, 16 - bw // 2, 16 - big.height)
    put(ob, 11, 0, big.crop((bw, 0, 2 * bw, big.height)), 2, 1, 16 - bw // 2, 16 - big.height)
    # signboard, fences (left end, right end, middle, lone post)
    put(ow, 34, 2, tile(elem, 0, 2))
    put(ow, 2, 17, tile(house, 10, 7)); put(ow, 3, 17, tile(house, 12, 7)); put(ow, 4, 17, tile(house, 11, 7)); put(ow, 0, 17, tile(house, 14, 6))
    # graves: a headstone in the middle of the 2 x 2 plot
    put(ow, 35, 5, tile(elem, 4, 2), 2, 2, 8, 14)
    # barrels and pots
    q = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for (i, j, tx, ty) in ((0, 0, 0, 0), (1, 0, 4, 0), (0, 1, 1, 0), (1, 1, 0, 0)):
        q.alpha_composite(tile(elem, tx, ty), (i * 16, j * 16))
    put(ow, 33, 0, q, 2, 2)
    # dungeon gates (4 x 3, door two tiles wide in the middle) and cave mouths (4 x 2): mossy ruins
    gate = tile(va, 0, 0, 4, 3).copy(); door = tile(va, 1, 2)
    gate.alpha_composite(door, (32, 32))
    put(ow, 4, 31, gate, 4, 3)
    put(ow, 10, 31, gate, 4, 3)
    # market stall: the pack's merchant cart with its sacks, low in the 5 x 6 plot
    put(ow, 18, 22, tile(elem, 0, 3, 3, 2), 5, 6, 16, 56)
    # pickups: heart, silver and gold coins (centred), the heart container (a full pack heart)
    heart, silver, gold, hearts = L('ninja-adventure/items/heart.png'), L('ninja-adventure/items/silvercoin.png'), L('ninja-adventure/items/coin.png'), L('ninja-adventure/ui/hearts.png')
    cen = lambda im: ((16 - im.width) // 2, 16 - im.height - 2)
    put(ob, 0, 3, heart, 1, 1, *cen(heart)); put(ob, 0, 4, silver, 1, 1, *cen(silver)); put(ob, 1, 4, gold, 1, 1, *cen(gold))
    put(ob, 4, 0, hearts.crop((64, 0, 80, 16)))
    # town houses that never got swapped tile by tile: the pack cottage in the old 5 x 5 plot
    hs = Image.new('RGBA', (80, 80), (0, 0, 0, 0)); hs.alpha_composite(tile(house, 0, 0, 4, 3), (16, 32)); put(ow, 6, 0, hs, 5, 5)
    # fountain: a pool of pack water (soft foamy rim) round the pack's stone frog statue
    blend = L('generated/blend.png'); bt = lambda k: blend.crop(((k & 15) * 16, 4 * 256 + (k >> 4) * 16, (k & 15) * 16 + 16, 4 * 256 + (k >> 4) * 16 + 16))
    N, E_, S_, W_, NE, SE, SW, NW_ = 1, 2, 4, 8, 16, 32, 64, 128
    pool = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    masks = [[E_ | S_ | SE, E_ | W_ | S_ | SE | SW, W_ | S_ | SW], [N | E_ | S_ | NE | SE, 255, N | W_ | S_ | NW_ | SW], [N | E_ | NE, N | E_ | W_ | NE | NW_, N | W_ | NW_]]
    for j in range(3):
        for i in range(3):
            pool.alpha_composite(bt(masks[j][i]), (i * 16, j * 16))
    pool.alpha_composite(tile(house, 0, 17), (16, 8))
    put(ow, 22, 9, pool, 3, 3)
    # Ashford's towers: stacks of the pack's grey cliff stone with a red banner on top
    rel = L('ninja-adventure/TilesetRelief.png'); tw = Image.new('RGBA', (48, 96), (0, 0, 0, 0))
    for j in range(6):
        row = 0 if j == 0 else 2 if j == 5 else 1
        tw.alpha_composite(tile(rel, 4, row, 3, 1), (0, j * 16))
    flag = L('ninja-adventure/anim/flag.png').crop((0, 0, 16, 16)); tw.alpha_composite(flag, (16, 0))
    put(ow, 0, 22, tw, 3, 6)
    # lava: pack water recoloured to molten rock, four frames of the pack's ripples on top (art/generated/lava.png)
    wat = L('ninja-adventure/TilesetWater.png').crop((16, 112, 32, 128)); rip = L('ninja-adventure/anim/ripples.png')
    def molten(im):
        out = im.copy(); px = out.load()
        for y in range(out.height):
            for x in range(out.width):
                r, g_, b, a = px[x, y]
                if a:
                    v = (r + g_ + b) / 3
                    px[x, y] = (min(255, int(v * 1.25 + 40)), int(v * 0.55), int(v * 0.12), a)
        return out
    lava = Image.new('RGBA', (64, 16), (0, 0, 0, 0))
    for f in range(4):
        fr = molten(wat); fr.alpha_composite(molten(rip.crop((f * 16, 0, f * 16 + 16, 16)))); lava.alpha_composite(fr, (f * 16, 0))
    lava.save(os.path.join(ART, 'generated', 'lava.png'))
    # inside houses: pack beds, tables, chairs, shelves, ovens and plants in the old furniture slots
    inn, bed = L('pack-armm1998/Inner.png'), L('ninja-adventure/tileset_bed.png')
    put(inn, 16, 1, tile(bed, 0, 3, 2, 3), 2, 3)                   # bed
    put(inn, 10, 1, tile(house, 22, 9, 3, 3), 3, 3)                # dining table
    put(inn, 6, 9, tile(house, 22, 6, 3, 3), 3, 3)                 # counter
    for (x, y) in ((9, 4), (10, 4), (13, 4), (14, 4)):
        put(inn, x, y, tile(elem, 11, 0), 1, 2, 0, 16)             # stools
    put(inn, 3, 12, tile(elem, 8, 7, 3, 2), 3, 2)                  # bookshelf
    put(inn, 12, 10, tile(house, 29, 11, 2, 3), 2, 3)              # oven
    put(inn, 8, 12, tile(elem, 0, 8), 1, 2, 0, 16)                 # pot plant
    put(inn, 5, 12, tile(elem, 1, 8), 1, 2, 0, 16)
    floor = L('ninja-adventure/TilesetInteriorFloor.png')
    put(inn, 0, 7, tile(floor, 11, 6, 3, 3), 3, 3)                 # rug
    for (x, y) in ((5, 6), (6, 6), (7, 6), (5, 7), (6, 7), (7, 7), (5, 8), (6, 8), (7, 8)):
        put(inn, x, y, tile(rel, x - 1, y - 6))                     # stone walls
    inn.save(os.path.join(ART, 'generated', 'Inner.png'))
    # dungeon rock edges: the pack's brown cliff stone
    for j in range(3):
        for i in range(3):
            put(cv, 1 + i, 3 + j, tile(rel, 4 + i, 5 + j))
    # dungeon water and pits: soft pack edges against the cobbled floor (blend pairs 7 and 8)
    bp = lambda pr, k: blend.crop(((k & 15) * 16, pr * 256 + (k >> 4) * 16, (k & 15) * 16 + 16, pr * 256 + (k >> 4) * 16 + 16))
    for j in range(3):
        for i in range(3):
            put(cv, i, 7 + j, bp(7, masks[j][i]))
            put(cv, 1 + i, j, bp(8, masks[j][i]))
    put(cv, 6, 0, tile(rel, 5, 0)); put(cv, 6, 1, tile(rel, 5, 1)); put(cv, 6, 2, tile(rel, 5, 2))   # stone pillar
    # the plank bridge by the river, the skull, the inside back wall, the hearth
    put(ow, 6, 6, tile(L('ninja-adventure/TilesetWater.png'), 0, 12, 2, 3), 2, 3)
    put(ow, 28, 2, tile(L('ninja-adventure/TilesetFloorDetail.png'), 13, 0))
    put(inn, 0, 1, tile(rel, 5, 6))
    put(inn, 10, 12, tile(house, 29, 12, 2, 1), 2, 1)
    inn.save(os.path.join(ART, 'generated', 'Inner.png'))
    # landmarks sheet: shipwreck hull at double size (10 x 4) at (0,0), torn sail (5 x 4) at (10,0), watchtowers (2 x 2) at (15,0)
    # and (17,0), ruin (4 x 2) at (19,0)
    lm = Image.new('RGBA', (24 * 16, 4 * 16), (0, 0, 0, 0))
    boat = L('ninja-adventure/Boat.png'); lm.alpha_composite(boat.resize((boat.width * 2, boat.height * 2), Image.NEAREST), (0, 0))
    sail = L('ninja-adventure/Sail.png'); sail = sail.resize((sail.width * 2, sail.height * 2), Image.NEAREST).rotate(-20, expand=True)
    lm.alpha_composite(sail.crop((0, 0, min(80, sail.width), min(64, sail.height))), (10 * 16, 0))
    lm.alpha_composite(L('ninja-adventure/TilesetTowers.png').crop((12 * 16, 0, 14 * 16, 32)), (15 * 16, 0))
    lm.alpha_composite(L('ninja-adventure/TilesetTowers.png').crop((18 * 16, 0, 20 * 16, 32)), (17 * 16, 0))
    lm.alpha_composite(L('ninja-adventure/TilesetVillageAbandoned.png').crop((0, 0, 64, 32)), (19 * 16, 0))   # ruin (4 x 2, no door)
    lm.save(os.path.join(ART, 'generated', 'landmarks.png'))
    # bushes (also what the hero carries) and the small liftable rocks
    put(ow, 0, 16, tile(nat, 0, 10))
    put(cv, 5, 4, tile(nat, 17, 17))
    os.makedirs(os.path.join(ART, 'generated'), exist_ok=True)
    cv.save(os.path.join(ART, 'generated', 'cave.png'))
    ow.save(os.path.join(ART, 'generated', 'Overworld.png')); ob.save(os.path.join(ART, 'generated', 'objects.png'))


if __name__ == '__main__':
    build()
