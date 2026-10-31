"""Townsfolk from Seliel the Shaper's Mana Seed Character Base (and its outfit, hair and cloak add-ons).

The Mana Seed art is licensed to the game's author, not to the public, so its files never go in this repo. This tool
reads the unpacked packs from $MANASEED (default /home/claude/private-art/manaseed), dresses each person from the
recipes below, and writes one compact atlas to art/private/ (git-ignored). build.py embeds it when it exists; without
it the game falls back to the Ninja Adventure villagers.

Atlas layout: one band per person, 4 rows (down, up, right, left) x 7 cells (stand, walk 1-6); each cell is CW x CH,
cut from the 64 x 64 frame at (CX, CY), so the feet sit at (32 - CX, 44 - CY) in the cell.
"""
import glob, json, os, re, sys
from PIL import Image

ROOT = os.environ.get('MANASEED', '/home/claude/private-art/manaseed')
OUT = 'art/private'
CX, CY, CW, CH = 12, 2, 40, 48
IDX = {}
for p in glob.glob(ROOT + '/**/char_a_p1_*.png', recursive=True):
    if 'optional files' in p: continue
    m = re.match(r'char_a_(p1)_(\d\w{3})_(\w{4})_(v\d\d)\.png$', os.path.basename(p))
    if m: IDX[m.groups()[1:]] = p
_c = {}
def layer(L, code, v):
    k = (L, code, 'v%02d' % v)
    if k not in IDX: raise SystemExit('missing Mana Seed layer %s' % (k,))
    if k not in _c: _c[k] = Image.open(IDX[k]).convert('RGBA')
    return _c[k]

# skin 0-10 (0 palest .. 7 darkest), outfit (code, v), hair (code, v: 0 grey 1 silver 2 ash 3 gold 4 strawberry 5 ginger
# 6 pink 7 violet 8 teal 9 blue 10 slate 11 brown 12 magenta 13 black), cloak/mantle v: 1 white 2 grey 3 blue
# 4 sky 5 green 6 yellow 7 orange 8 red 9 pink 10 purple; hat (code, v); goggles
def P(skin, out, hair=None, hat=None, cloak=None, mantle=None, hood=None, gog=False):
    parts = []
    if cloak: parts.append(('0bot', 'lnpl', cloak))
    parts.append(('0bas', 'humn', skin)); parts.append(('1out',) + out)
    if cloak: parts.append(('2clo', 'lnpl', cloak))
    if mantle: parts.append(('2clo', 'mnpl', mantle))
    if gog: parts.append(('3fac', 'gogl', 1))
    if hair and not hood: parts.append(('4har',) + hair)
    if hat: parts.append(('5hat',) + hat)
    if hood: parts.append(('5hat', 'hdpl', hood))
    return parts
PEOPLE = {
    # elders
    'OldMan': P(2, ('pfpn', 3), ('flat', 1), mantle=6),
    'OldMan2': P(5, ('alch', 4), ('bob2', 0)),
    'OldMan3': P(1, ('fstr', 3), ('spk2', 10), cloak=2),
    'OldWoman': P(3, ('pfdr', 3), ('pon1', 1), ('pfht', 3)),
    'Master': P(6, ('alch', 1), ('dap1', 0), cloak=10),
    # farmers
    'Villager': P(3, ('pfpn', 4), ('flat', 11), ('pfht', 4)),
    'Villager2': P(4, ('pfpn', 2), ('fro1', 5)),
    'Villager3': P(2, ('pfdr', 1), ('pon1', 3), ('pfbn', 1)),
    'Hunter': P(5, ('fstr', 4), ('spk2', 11), mantle=5),
    'Woman': P(1, ('pfdr', 4), ('bob1', 4), ('pfbn', 4)),
    'ManGreen': P(6, ('fstr', 5), ('flat', 13), ('pnty', 3)),
    'Caveman': P(7, ('pfpn', 5), ('fro1', 13)),
    # traders
    'Noble': P(0, ('alch', 2), ('bob2', 3), cloak=8),
    'Sultan': P(7, ('alch', 5), ('flat', 13), ('band', 3), cloak=6),
    'Sultan2': P(6, ('pfpn', 1), ('spk2', 13), ('band', 2), mantle=7),
    'Inspector': P(2, ('alch', 3), ('bob2', 11), gog=True),
    'Villager4': P(4, ('bksm', 2), ('flat', 5), ('band', 5)),
    # fishers
    'Villager5': P(3, ('angl', 1), ('spk2', 11), ('rnht', 1)),
    'Villager6': P(5, ('angl', 3), ('bob1', 13), ('rnht', 3)),
    'Eskimo': P(1, ('angl', 2), ('fro1', 2), cloak=1, hood=1),
    'Cavegirl': P(4, ('pfdr', 5), ('pon1', 5)),
    'FighterWhite': P(0, ('angl', 5), ('dap1', 9)),
    # guards
    'Knight': P(2, ('fstr', 3), ('dap1', 11), cloak=3, mantle=2),
    'KnightGold': P(5, ('fstr', 4), ('flat', 3), cloak=6, mantle=6),
    'Samurai': P(3, ('fstr', 1), ('spk2', 13), mantle=8),
    'SamuraiBlue': P(1, ('fstr', 2), ('bob1', 13), mantle=3),
    'GladiatorBlue': P(7, ('bksm', 3), ('fro1', 11), mantle=3),
    # scholars
    'Monk': P(3, ('alch', 4), None, cloak=7, hood=7),
    'Monk2': P(2, ('alch', 1), None, cloak=6, hood=6),
    'Shaman': P(6, ('alch', 5), ('dap1', 8), cloak=5),
    'SorcererOrange': P(4, ('alch', 2), ('spk2', 5), cloak=7),
    'SorcererBlack': P(1, ('alch', 4), ('bob2', 13), cloak=10, hood=10),
    'NinjaDark': P(5, ('fstr', 3), None, cloak=2, hood=2),
    # baker and the fairy-spring keeper
    'Princess': P(0, ('pfdr', 2), ('pon1', 3), ('pfbn', 2)),
    'Blacksmith': P(7, ('bksm', 1), ('fro1', 0), ('band', 1)),
}
# a few people are better known by their trade in tools/maps.py
ALIAS = {}

def frames(parts):
    sheet = Image.new('RGBA', (512, 512))
    for L in parts: sheet.alpha_composite(layer(*L))
    rows = []
    for d in range(4):                                    # down, up, right, left
        cells = [sheet.crop((0 * 64 + CX, d * 64 + CY, 0 * 64 + CX + CW, d * 64 + CY + CH))]
        for k in range(6): cells.append(sheet.crop((k * 64 + CX, (4 + d) * 64 + CY, k * 64 + CX + CW, (4 + d) * 64 + CY + CH)))
        rows.append(cells)
    return rows

def save_indexed(im, path):
    """Exact palette PNG: the 255 commonest colours stay exact, any rare extras snap to their nearest neighbour."""
    from collections import Counter
    px = list(im.get_flattened_data()); cnt = Counter(p[:3] for p in px if p[3])
    pal = [c for c, _ in cnt.most_common(255)]; at = {c: i + 1 for i, c in enumerate(pal)}
    def near(c): return min(pal, key=lambda q: (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2)
    out = Image.new('P', im.size); out.putdata([at.get(p[:3]) or at[near(p[:3])] if p[3] else 0 for p in px])
    flat = [0, 0, 0] + [v for c in pal for v in c]; out.putpalette(flat + [0] * (768 - len(flat)))
    out.info['transparency'] = 0; out.save(path, optimize=True, transparency=0)

def main():
    if not os.path.isdir(ROOT): print('manaseed: no packs at', ROOT, '- skipped'); return
    os.makedirs(OUT, exist_ok=True)
    names = sorted(PEOPLE)
    atlas = Image.new('RGBA', (7 * CW, 4 * CH * len(names)))
    for i, n in enumerate(names):
        for d, cells in enumerate(frames(PEOPLE[n])):
            for k, c in enumerate(cells): atlas.alpha_composite(c, (k * CW, (i * 4 + d) * CH))
    save_indexed(atlas, OUT + '/ms_people.png')
    json.dump({'names': names, 'cw': CW, 'ch': CH, 'fx': 32 - CX, 'fy': 44 - CY}, open(OUT + '/ms_people.json', 'w'))
    print('manaseed: %d people, %d bytes' % (len(names), os.path.getsize(OUT + '/ms_people.png')))

if __name__ == '__main__': main()
