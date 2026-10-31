# Willowfen marsh: north part (3x2 screens at world 0-2, 3-4) and south part (2x2 at world 0-1, 5-6)
KEEP = set()           # path cells pools must leave dry


def blob(g, x0, y0, x1, y1, c):
    if c == '~':           # pools: rounded, slightly uneven ovals inside their old boxes (the blend tiles give soft banks)
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 0.6, (y1 - y0) / 2 + 0.6
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                wob = 0.3 * (((x * 7 + y * 13 + x0 * 5) % 5) / 4 - 0.5)
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 0.98 + wob and 0 <= y < len(g) and 0 <= x < len(g[0]) and (x, y) not in KEEP:
                    g[y][x] = c
        return
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 0.5, (y1 - y0) / 2 + 0.5
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05 and 0 <= y < len(g) and 0 <= x < len(g[0]):
                g[y][x] = c

def north():
    W, H = 48, 28
    g = [['.'] * W for _ in range(H)]
    for y in range(H):
        for x in (0, 1): g[y][x] = 'F'
    for x in range(W):
        if not 8 <= x <= 9:
            g[0][x] = 'F'; g[1][x] = 'F'
    for y in range(0, 16):
        for x in (46, 47): g[y][x] = 'F'
    for y in (26, 27):
        for x in range(32, W): g[y][x] = 'F'
    KEEP.clear()
    KEEP.update({(x, y) for x in range(10, 48) for y in (19, 20, 21)} | {(x, y) for x in (8, 9, 10) for y in range(2, 21)})
    for (a, b, c, d) in [(5, 9, 6, 13), (19, 25, 3, 7), (28, 35, 9, 13), (11, 17, 16, 20), (26, 31, 20, 24), (37, 43, 3, 7)]:
        blob(g, a, c, b, d, '~')
    for (a, b, c, d) in [(13, 18, 8, 12), (34, 40, 22, 25), (3, 7, 3, 6), (40, 45, 10, 13)]:
        blob(g, a, c, b, d, ':')
    for x in range(10, 48): g[20][x] = '-' if g[20][x] == '.' else g[20][x]
    for y in range(2, 20): g[y][9] = '-' if g[y][9] == '.' else g[y][9]
    for (x, y) in [(3, 15), (4, 16), (15, 4), (16, 5), (23, 10), (24, 11), (36, 15), (37, 16), (44, 16), (21, 14), (8, 23), (12, 24), (19, 26)]:
        g[y][x] = 'b'
    return [''.join(r) for r in g]

def south():
    W, H = 32, 28
    g = [['.'] * W for _ in range(H)]
    for y in range(H):
        for x in (0, 1): g[y][x] = 'F'
        if not 9 <= y <= 11:
            for x in (30, 31): g[y][x] = 'F'
    for y in (26, 27):
        for x in range(W): g[y][x] = 'F'
    for y in (26, 27):
        for x in (14, 15): g[y][x] = '.'
    for y in range(12, 26): g[y][14] = g[y][14] if g[y][14] != 'F' else '.'
    KEEP.clear()
    KEEP.update({(x, y) for x in range(14, 32) for y in (9, 10, 11)} | {(x, y) for x in (13, 14, 15) for y in range(0, 11)})
    for (a, b, c, d) in [(4, 11, 13, 19), (17, 25, 17, 23), (20, 27, 2, 6)]:
        blob(g, a, c, b, d, '~')
    for (a, b, c, d) in [(14, 19, 9, 12), (3, 8, 21, 24)]:
        blob(g, a, c, b, d, ':')
    for x in range(14, 32): g[10][x] = '-' if g[10][x] == '.' else g[10][x]
    for y in range(0, 10): g[y][14] = '-' if g[y][14] == '.' else g[y][14]
    for (x, y) in [(12, 3), (13, 5), (26, 10), (6, 11), (28, 14), (13, 22)]:
        g[y][x] = 'b'
    return [''.join(r) for r in g]

NORTH, SOUTH = north(), south()
