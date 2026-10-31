"""Patch the old art pack's sheets with Ninja Adventure art in the very slots the maps and code use, so chests, signs,
fences, graves, barrels, dungeon gates, cave mouths and market stalls all become pack art without touching any map.
Writes art/generated/Overworld.png, objects.png and cave.png."""
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
    # bushes (also what the hero carries) and the small liftable rocks
    put(ow, 0, 16, tile(nat, 0, 10))
    put(cv, 5, 4, tile(nat, 17, 17))
    os.makedirs(os.path.join(ART, 'generated'), exist_ok=True)
    cv.save(os.path.join(ART, 'generated', 'cave.png'))
    ow.save(os.path.join(ART, 'generated', 'Overworld.png')); ob.save(os.path.join(ART, 'generated', 'objects.png'))


if __name__ == '__main__':
    build()
