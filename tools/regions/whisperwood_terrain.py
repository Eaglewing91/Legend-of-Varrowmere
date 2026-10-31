# Whisperwood: 3x3 screens of dense forest with carved paths (world 0-2, 0-2)
W, H = 48, 42
g = [['F'] * W for _ in range(H)]
def carve(x0, y0, x1, y1, c='.'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < W and 0 <= y < H: g[y][x] = c
carve(7, 30, 10, 41)           # in from Willowfen
carve(3, 30, 13, 36)           # first clearing
carve(5, 16, 8, 30)            # up the west side
carve(2, 16, 12, 24)           # the fairy glade
carve(6, 19, 9, 21, '~')
carve(12, 20, 20, 23)          # east into the tangle
carve(16, 14, 31, 27)          # the tangle (loops unless you go north)
carve(31, 18, 35, 21)          # dead ends that loop you back
carve(22, 27, 24, 30)
for (x0, y0) in [(18, 16), (26, 16), (19, 24), (27, 23), (22, 19)]:
    carve(x0, y0, x0 + 1, y0 + 1, 'F')
carve(22, 4, 25, 14)           # north out of the tangle
carve(18, 3, 30, 10)           # the high clearing
carve(12, 6, 18, 8)            # west to the hidden glade
carve(2, 3, 12, 10)
carve(30, 5, 36, 8)            # east to the hideout
carve(33, 2, 44, 12)
carve(13, 33, 20, 35)          # east from the first clearing
carve(18, 30, 28, 38)
carve(28, 33, 35, 35)
carve(34, 30, 44, 38)
for (x, y) in [(4, 31), (12, 35), (20, 31), (26, 37), (36, 31), (43, 37), (3, 9), (11, 4), (19, 9), (29, 4)]:
    g[y][x] = 'b'
for (x, y) in [(3, 17), (11, 23), (4, 23)]:
    g[y][x] = '*'
carve(44, 6, 47, 7)            # east to the Northreach downs
ROWS = [''.join(r) for r in g]
