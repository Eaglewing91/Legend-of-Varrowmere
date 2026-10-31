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
    # Captain Brannoc, who raised Wren (the opening scene)
    'Brannoc': P(5, ('fstr', 3), ('flat', 10), mantle=8),
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


# ---------------- Wren, the hero ----------------
# Every page she needs, dressed in the Forester tunic and pointed hat, with her sword and shield (or bow and quiver)
# placed in front of or behind her frame by frame, as the artist's layer-order guides say.
PAGE_IDX = {}
for p in sorted(glob.glob(ROOT + '/**/char_a_p*.png', recursive=True), key=lambda q: 'optional files' in q):
    m = re.match(r'char_a_(p\w+?)_(\d\w{3})_(\w{4})_(v\d\d)\.png$', os.path.basename(p))
    # the sword pack's walking-page layers live in its "optional files"; everything else uses the supported files
    if m and (('optional files' not in p) or m.group(2) in ('6tla', '7tlb')) and m.groups() not in PAGE_IDX: PAGE_IDX[m.groups()] = p
_pc = {}
def player(page, L, code, v):
    k = (page, L, code, 'v%02d' % v)
    if k not in PAGE_IDX: raise SystemExit('missing Mana Seed layer %s' % (k,))
    if k not in _pc: _pc[k] = Image.open(PAGE_IDX[k]).convert('RGBA')
    return _pc[k]
def guide(name):
    """Read a layer-order guide: per 64 x 64 cell, behind (blue) or in front (red), and + / - against the other item."""
    path = (glob.glob(ROOT + '/**/guides/layer order, page ' + name + '.png', recursive=True) or [None])[0]
    if not path: return None
    im = Image.open(path).convert('RGB'); px = im.load(); out = {}
    for r in range(8):
        for c in range(8):
            x0, y0 = c * 64, r * 64; R, G, B = px[x0 + 2, y0 + 2]
            vert = 0
            for x in range(x0 + 45, x0 + 62):
                run = 0
                for y in range(y0 + 36, y0 + 50):
                    if sum(px[x, y]) < 200: run += 1; vert = max(vert, run)
                    else: run = 0
            out[(c, r)] = (B > R, vert >= 3)        # (behind, plus)
    return out
WREN = dict(skin=1, out=('fstr', 5), hair=('bob1', 3), hat=('pnty', 3))
GEAR = {   # page -> [(layer, code, v, guide name)]
    'p1': [('6tla', 'sw01', 1, '1 (sword)'), ('7tlb', 'sh01', 1, '1 (shield)')],
    'pONE1': [('6tla', 'sw01', 1, 'ONE-hand 1 (sword)'), ('7tlb', 'sh01', 1, 'ONE-hand 1 (shield)')],
    'pONE3': [('6tla', 'sw01', 1, 'ONE-hand 3 (sword)'), ('7tlb', 'sh01', 1, 'ONE-hand 3 (shield)')],
    'pBOW3': [('6tla', 'bo01', 1, 'BOW 3 (bow)'), ('7tlb', 'qv01', 1, 'BOW 3 (quiver)')],
    'p2': []}
# name -> (page, [(col, row) per frame] for dirs down, up, right, left)
HERO_ANIMS = {
    'idle': ('p1', lambda d: [(0, d)]),
    'walk': ('p1', lambda d: [(k, 4 + d) for k in range(6)]),
    'run': ('p1', lambda d: [(k, 4 + d) for k in (0, 1, 6, 3, 4, 7)]),
    'push': ('p1', lambda d: [(1, d), (2, d)]),
    'slash': ('pONE3', lambda d: [(k, d) for k in range(4)]),
    'thrust': ('pONE3', lambda d: [(k, 4 + d) for k in range(4)]),
    'hurt': ('pONE1', lambda d: [(5, d)]),
    'dead': ('pONE1', lambda d: [(6, d), (7, d)]),
    'lift': ('p2', lambda d: [(k, 4 + d) for k in range(4, 8)]),
    'throw': ('p2', lambda d: [(k, d) for k in range(4, 8)]),
    'bow': ('pBOW3', lambda d: [(k, 4 + d) for k in range(8)]),
}
def look_layers(look):
    """A look's body layers, bottom to top (back of a cloak first)."""
    L = []
    if look.get('cloak'): L.append(('0bot', 'lnpl', look['cloak']))
    L.append(('0bas', 'humn', look['skin'])); L.append(('1out',) + look['out'])
    if look.get('cloak'): L.append(('2clo', 'lnpl', look['cloak']))
    if look.get('hair'): L.append(('4har',) + look['hair'])
    if look.get('hat'): L.append(('5hat',) + look['hat'])
    return L
def actor_cell(page, col, row, guides, look, gear):
    back, front = [], []
    for (L, code, v, gname) in gear.get(page, []):
        g = guides.get(gname) or {}; behind, plus = g.get((col, row), (True, True))
        (back if behind else front).append((plus, (L, code, v)))
    back.sort(key=lambda t: t[0]); front.sort(key=lambda t: t[0])
    cell = Image.new('RGBA', (64, 64))
    for L in [t[1] for t in back] + look_layers(look) + [t[1] for t in front]:
        cell.alpha_composite(player(page, *L).crop((col * 64, row * 64, col * 64 + 64, row * 64 + 64)))
    return cell
def build_actor(name, look, gear, anims, recolour=('1out', '5hat')):
    """One atlas for one person: each animation 4 rows (down, up, right, left) x its frames, cropped to fit.
    'recol' lists the colours only the clothes use, so the game can dye them (tunics, soldier ranks)."""
    guides = {}
    for gl in gear.values():
        for (_, _, _, gname) in gl: guides[gname] = guide(gname)
    built, meta = [], {}
    for an, (page, fr) in anims.items():
        cells = [[actor_cell(page, c, r, guides, look, gear) for (c, r) in fr(d)] for d in range(4)]
        box = None
        for row in cells:
            for c in row:
                bb = c.getbbox()
                if bb: box = bb if not box else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
        built.append((an, cells, box))
    W = max(len(c[0]) * (bb[2] - bb[0]) for (_, c, bb) in built); H = sum(4 * (bb[3] - bb[1]) for (_, _, bb) in built)
    atlas = Image.new('RGBA', (W, H)); y = 0
    for (an, cells, bb) in built:
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        for d, row in enumerate(cells):
            for k, c in enumerate(row): atlas.alpha_composite(c.crop(bb), (k * w, y + d * h))
        meta[an] = {'y': y, 'w': w, 'h': h, 'n': len(cells[0]), 'fx': 32 - bb[0], 'fy': 44 - bb[1]}
        y += 4 * h
    save_indexed(atlas, OUT + '/ms_' + name + '.png')
    tun, other = set(), set()
    for page in {p for (p, _) in anims.values()}:
        for L in look_layers(look):
            cols = {q[:3] for q in player(page, *L).get_flattened_data() if q[3]}
            if L[0] in recolour: tun |= cols
            else: other |= cols
        for g in gear.get(page, []): other |= {q[:3] for q in player(page, *g[:3]).get_flattened_data() if q[3]}
    meta['recol'] = sorted(tun - other)
    json.dump(meta, open(OUT + '/ms_' + name + '.json', 'w'))
    print('manaseed: %s %dx%d, %d bytes, %d dye colours' % (name, W, H, os.path.getsize(OUT + '/ms_' + name + '.png'), len(meta['recol'])))
def hero_main():
    build_actor('hero', dict(skin=WREN['skin'], out=WREN['out'], hair=WREN['hair'], hat=WREN['hat']), GEAR, HERO_ANIMS)

# ---------------- Vex's people: the Gilded Hand soldiers, their archers, and the Chancellor himself ----------------
SWORD_SHIELD = {pg: [('6tla', 'sw01', 1, pg.replace('pONE', 'ONE-hand ') + ' (sword)'), ('7tlb', 'sh02', 1, pg.replace('pONE', 'ONE-hand ') + ' (shield)')] for pg in ('pONE1', 'pONE2', 'pONE3')}
BOW_QUIVER = {pg: [('6tla', 'bo01', 1, pg.replace('pBOW', 'BOW ') + ' (bow)'), ('7tlb', 'qv01', 1, pg.replace('pBOW', 'BOW ') + ' (quiver)')] for pg in ('pBOW2', 'pBOW3')}
FOES = {
    'soldier': (dict(skin=3, out=('fstr', 3), hair=('dap1', 11), hat=('pfht', 3)), SWORD_SHIELD, {
        'walk': ('pONE2', lambda d: [(k, d) for k in range(4, 8)]),
        'stance': ('pONE2', lambda d: [(0, d), (1, d)]),
        'slash': ('pONE3', lambda d: [(k, d) for k in range(4)]),
        'hurt': ('pONE1', lambda d: [(5, d)])}),
    'archer': (dict(skin=6, out=('fstr', 3), hair=('bob1', 11), hat=('pfht', 3)), BOW_QUIVER, {
        'walk': ('pBOW2', lambda d: [(k, d) for k in range(4, 8)]),
        'shoot': ('pBOW3', lambda d: [(k, 4 + d) for k in range(4, 8)])}),
    'vex': (dict(skin=0, out=('alch', 4), hair=('bob2', 13), cloak=10), {}, {
        'idle': ('p1', lambda d: [(0, d)]),
        'cast': ('p2', lambda d: [(6, d)])}),
    'queen': (dict(skin=4, out=('fstr', 1), hair=('pon1', 5), cloak=8), {}, {
        'idle': ('p1', lambda d: [(0, d)]),
        'cast': ('p2', lambda d: [(6, d)])}),
}
def foes_main():
    for n, (look, gear, anims) in FOES.items(): build_actor(n, look, gear, anims, recolour=('1out', '2clo', '0bot', '5hat'))

if __name__ == '__main__':
    main()
    if os.path.isdir(ROOT): hero_main(); foes_main()
