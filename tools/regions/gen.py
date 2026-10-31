"""Terrain generator for the outer regions. Each region is a grid of DSL characters (see paint() in maps.py),
filled by theme, walled round its border, with openings where it joins its neighbours and guaranteed paths from
every opening to the region's hub. Randomness is seeded per region so maps never change between builds."""
import random

THEMES = {
    # wall char on the border, ground char, scatter list [(char, weight)], feature counts
    'fields':    {'wall': 'F', 'ground': '.', 'scatter': [('b', 6), ('*', 4)], 'clumps': ('F', 5), 'ponds': 2, 'mud': 1, 'boulders': 1},
    'foothills': {'wall': 'O', 'ground': '.', 'scatter': [('b', 3), ('r', 3)], 'clumps': ('F', 2), 'ponds': 0, 'mud': 3, 'boulders': 10},
    'mountain':  {'wall': 'O', 'ground': ':', 'scatter': [('r', 6), ('b', 1)], 'clumps': None, 'ponds': 0, 'mud': 0, 'boulders': 18},
    'lake':      {'wall': 'F', 'ground': '.', 'scatter': [('b', 3), ('*', 2)], 'clumps': ('F', 2), 'ponds': 0, 'mud': 0, 'boulders': 2, 'bigwater': True},
    'desert':    {'wall': 'O', 'ground': ':', 'scatter': [('r', 3), ('x', 2)], 'clumps': None, 'ponds': 0, 'mud': 0, 'boulders': 10, 'oasis': True},
    'coast':     {'wall': 'F', 'ground': '.', 'scatter': [('b', 4), ('*', 2)], 'clumps': ('F', 2), 'ponds': 0, 'mud': 2, 'boulders': 2, 'sea': True},
}


def make(W, H, theme, openings, seed, hub=None, sea_side=None, keep=()):
    T = THEMES[theme]
    R = random.Random(seed)
    g = [[T['ground']] * W for _ in range(H)]
    hub = hub or (W // 2, H // 2)

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            g[y][x] = c

    def rect(x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                put(x, y, c)

    # big water bodies first
    if T.get('bigwater'):
        rect(W // 5, H // 5, W - W // 5, H - H // 5, '~')
        for k in range(3):        # islands
            ix, iy = R.randrange(W // 5 + 3, W - W // 5 - 6), R.randrange(H // 5 + 3, H - H // 5 - 5)
            rect(ix, iy, ix + 3, iy + 2, '.')
    if T.get('sea'):
        side = sea_side or 'e'
        if side == 'e':
            rect(W - 10, 0, W - 1, H - 1, '~')
            rect(W - 13, 0, W - 11, H - 1, ':')
        else:
            n = max(4, H // 4)
            rect(0, H - n, W - 1, H - 1, '~')
            rect(0, H - n - 2, W - 1, H - n - 1, ':')
    if T.get('oasis'):
        for k in range(max(1, (W * H) // 900)):
            ox, oy = R.randrange(4, W - 10), R.randrange(4, H - 8)
            rect(ox - 1, oy - 1, ox + 6, oy + 4, '.')
            rect(ox, oy, ox + 5, oy + 3, '~')
    # ponds and mud
    for k in range(T['ponds'] * max(1, (W * H) // 900)):
        px, py = R.randrange(3, W - 9), R.randrange(3, H - 7)
        rect(px, py, px + R.randrange(3, 6), py + R.randrange(2, 4), '~')
    for k in range(T['mud'] * max(1, (W * H) // 900)):
        px, py = R.randrange(3, W - 8), R.randrange(3, H - 6)
        rect(px, py, px + R.randrange(2, 6), py + R.randrange(2, 4), ':' if T['ground'] == '.' else '.')
    # clumps of trees (whole 4x3 trunks fit) and boulders
    if T['clumps']:
        for k in range(T['clumps'][1] * max(1, (W * H) // 900)):
            cx, cy = R.randrange(2, W - 7) // 4 * 4, R.randrange(4, H - 4) // 3 * 3
            rect(cx, cy, cx + 3 + 4 * R.randrange(0, 2), cy + 2, 'F')
    for k in range(T['boulders'] * max(1, (W * H) // 900)):
        bx, by = R.randrange(2, W - 4) // 2 * 2, R.randrange(2, H - 4) // 2 * 2
        if g[by][bx] in '.:' and g[by][bx + 1] in '.:' and g[by + 1][bx] in '.:' and g[by + 1][bx + 1] in '.:':
            put(bx, by, 'O')
            put(bx + 1, by, '_'); put(bx, by + 1, '_'); put(bx + 1, by + 1, '_')
    # scatter
    total = sum(w for _, w in T['scatter'])
    for k in range((W * H) // 28):
        x, y = R.randrange(1, W - 1), R.randrange(1, H - 1)
        if g[y][x] not in '.:':
            continue
        r = R.randrange(total)
        for c, w in T['scatter']:
            if r < w:
                put(x, y, c)
                break
            r -= w
    # border wall, two thick
    wall = T['wall']
    for x in range(W):
        for y in (0, 1, H - 2, H - 1):
            put(x, y, wall if wall != 'O' else ('O' if (x % 2 == 0 and y in (0, H - 2)) else '_'))
    for y in range(H):
        for x in (0, 1, W - 2, W - 1):
            put(x, y, wall if wall != 'O' else ('O' if (y % 2 == 0 and x in (0, W - 2)) else '_'))
    # openings: clear the wall and run a 2-wide path to the hub
    path = '-' if theme in ('fields', 'coast', 'lake') else ':'

    def clear(x, y):
        c = g[y][x] if 0 <= x < W and 0 <= y < H else None
        if c is None:
            return
        if c in 'O_':
            # remove the whole boulder this tile belongs to
            for (ax, ay) in [(x, y), (x - 1, y), (x, y - 1), (x - 1, y - 1)]:
                if 0 <= ax < W and 0 <= ay < H and g[ay][ax] == 'O':
                    for (bx, by) in [(ax, ay), (ax + 1, ay), (ax, ay + 1), (ax + 1, ay + 1)]:
                        put(bx, by, T['ground'])
            if g[y][x] == '_':
                put(x, y, T['ground'])
        if g[y][x] in 'F~rbx*_O':
            put(x, y, path)

    def walk(x0, y0, x1, y1):
        x, y = x0, y0
        while x != x1:
            clear(x, y); clear(x, y + 1); x += 1 if x1 > x else -1
        while y != y1:
            clear(x, y); clear(x + 1, y); y += 1 if y1 > y else -1
        clear(x, y); clear(x + 1, y); clear(x, y + 1); clear(x + 1, y + 1)

    for (side, a, b) in openings:
        for t in range(a, b + 1):
            for d in range(3):
                if side == 'n': clear(t, d)
                if side == 's': clear(t, H - 1 - d)
                if side == 'w': clear(d, t)
                if side == 'e': clear(W - 1 - d, t)
        if side == 'n': walk(a, 2, hub[0], hub[1])
        if side == 's': walk(a, H - 3, hub[0], hub[1])
        if side == 'w': walk(2, a, hub[0], hub[1])
        if side == 'e': walk(W - 3, a, hub[0], hub[1])
    for (x0, y0, x1, y1) in keep:          # areas features need clear (houses, caves...)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if g[y][x] in 'O_':
                    clear(x, y)
                put(x, y, T['ground'])
        walk(x0, y1 + 1, hub[0], hub[1])
    rows = [''.join(r).replace('_', T['ground']) for r in g]
    return rows
