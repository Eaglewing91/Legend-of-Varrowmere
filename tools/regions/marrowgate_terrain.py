W, H = 64, 28
g = [['.'] * W for _ in range(H)]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c
for y in range(0, 3):
    for x in range(W): put(x, y, '~')
for y in range(H):
    put(0, y, 'F'); put(W - 1, y, 'F')
for y in (26, 27):
    for x in range(W):
        if not 3 <= x <= 7: put(x, y, 'F')
for x in range(5, 59): put(x, 8, '='); put(x, 20, '=')
for y in range(0, 21): put(23, y, '='); put(24, y, '=')
for y in range(8, 28): put(5, y, '='); put(6, y, '=')
for y in range(8, 21): put(40, y, '='); put(41, y, '='); put(54, y, '='); put(55, y, '=')
for (x, y) in [(1, 9), (1, 10), (2, 9), (44, 23), (45, 23), (46, 23), (44, 25), (46, 25), (60, 4), (59, 10)]: put(x, y, 'b')
for (x, y) in [(50, 23), (52, 23), (51, 24), (50, 25), (52, 25)]: put(x, y, 'r')
for (x, y) in [(27, 10), (28, 10), (29, 10), (27, 11), (29, 11), (13, 22), (14, 22), (15, 23)]: put(x, y, '*')
for y in range(9, 12):
    put(0, y, '.'); put(1, y, '.'); put(2, y, '.')
for x in range(1, 5): put(x, 10, '-')
for y in range(9, 12):
    put(63, y, '.'); put(62, y, '.')
put(59, 10, '.')
ROWS = [''.join(r) for r in g]
