"""Hand-designed dungeons. Every dungeon has its own floor plan (which rooms, where, how they join, merged halls),
and every room is drawn by hand as a 14 x 10 block of characters (the floor inside the walls, x 1..14, y 3..12).

Floor plan: one character per 16 x 14 room; the same letter in neighbouring cells makes one big hall, '.' is solid rock.
Doors: (room, room, kind) with kind open, locked (Small Key), big (Big Key, the boss), shut (opens when the first
room's puzzle is solved: its torches lit, its plates pressed, or it is cleared of enemies), crack (bomb the first
room's wall).

Room characters:
  .  floor            #  pillar / wall block     ~  the dungeon's hazard (pit, lava, ice water or flood water)
  =  spill water (swamps: dry while flooded, water when drained)                w  water-level switch (hit it)
  B  push block       P  floor plate             t  unlit torch       L  lit torch      s  shutter (the room's puzzle opens it)
  g  item gate (pegs or dark rocks)              r  rock to lift      c  cracked wall (bomb it)
  k  Small Key chest  m  map   p  compass   $  100 cash   y  50 cash   a  arrows   b  bombs   CC Big Chest (2 wide)
  K  where the Big Key appears when the mini-boss falls   M  mini-boss   X  boss   e  enemy   S  sign at the way in
"""


def T(s):
    rows = [r for r in s.strip('\n').split('\n')]
    rows = [r.strip() for r in rows]
    assert len(rows) == 10 and all(len(r) == 14 for r in rows), ('bad room', rows)
    return rows


def mirror(t):
    return [r[::-1] for r in t]


BOSS = T("""
.L..........L.
..............
..............
..............
.......X......
..............
..............
..............
..............
..............""")

# ---------------------------------------------------------------------------------------------------------------
# Bonehollow: a crypt with one long pillared nave. Bone pits, side chapels, a bombable ossuary.
BONEHOLLOW = dict(
    grid=['.X.', 'GNT', 'KNM', 'QEP'], entry='E',
    doors=[('E', 'N', 'open'), ('E', 'Q', 'crack'), ('E', 'P', 'open'), ('N', 'K', 'open'), ('N', 'M', 'locked'),
           ('M', 'T', 'open'), ('N', 'G', 'open'), ('N', 'X', 'big')],
    rooms=dict(
        E=T("""
.L..........L.
..............
..#~~....~~#..
..#~~....~~#..
......e.......
..............
..#~~....~~#..
..#~~..e.~~#..
..............
...S.........."""),
        N=[T("""
.L..........L.
..#........#..
.....e........
..#........#..
..............
..............
..#........#..
.....m........
..#........#..
.............."""), T("""
..#........#..
..............
..#..~~~~..#..
.....~~~~.....
..............
..............
..#..~~~~..#..
.....~~~~.e...
..#........#..
..............""")],
        G=T("""
....g.........
.$..g.........
....g...e.....
....g.........
.a..g.........
....g.........
....g...e.....
....g.........
....g.........
....g........."""),
        K=T("""
...####k####..
......#s#.....
.t..........t.
..............
....~~..~~....
....~~..~~....
..............
.t..........t.
..e.......e...
.............."""),
        M=T("""
.L..........L.
..........K...
..#........#..
..............
.......M......
..............
..............
..#........#..
..............
.............."""),
        T=T("""
.L..........L.
..............
..~~~.CC.~~~..
..~~~....~~~..
..~~~....~~~..
..............
.e..........e.
..#..#..#..#..
..............
.............."""),
        Q=T("""
..............
..y........a..
..............
...#......#...
..............
..............
...#......#...
..............
......b.......
.............."""),
        P=T("""
..............
..............
..#~~~~~~~~#..
..#........#..
..#..e.....#..
..#........#..
..#~~~~~~~~#..
..........p...
..............
.............."""),
        X=T("""
.L..........L.
..............
..#........#..
..............
.......X......
..............
..............
..#........#..
..............
..............""")))

# ---------------------------------------------------------------------------------------------------------------
# Thieves' Den: a warren of twisting corridors, a long maze hall, a stash behind a bombable wall.
THIEVESDEN = dict(
    grid=['GXT.', 'KHHM', 'QE.P'], entry='E',
    doors=[('E', 'H', 'open'), ('E', 'Q', 'crack'), ('H', 'K', 'open'), ('H', 'M', 'locked'), ('M', 'P', 'open'),
           ('H', 'T', 'locked'), ('H', 'X', 'big'), ('K', 'G', 'open')],
    rooms=dict(
        E=T("""
.L..........L.
.....#..#.....
.###.#..#.###.
.....#..#.....
..............
.e..........e.
.###......###.
...#......#...
...#......#...
...#S.....#..."""),
        H=[T("""
.L............
..##..#..##...
..#...#...#...
..#.e.#.#.#...
..........#...
..............
.####.###.###.
....#...#.....
..e.#...#..m..
.............."""), T("""
.L..........L.
..##.#..#.##..
.....#..#.....
.###.#..#.###.
..........e...
..............
.#.###..###.#.
.#..........#.
.#.e.####...#.
..............""")],
        K=T("""
..............
..............
..e.......e...
..............
..............
..............
.####.........
.#k#..........
.#s#....e.....
.............."""),
        G=T("""
..............
..$.......a...
..............
gggggggggggggg
..............
.....e........
..............
..............
...........e..
.............."""),
        Q=T("""
..............
..............
...#......#...
...#..k...#...
...#......#...
..............
..y...........
..............
..............
.............."""),
        M=T("""
.L..........L.
.....K........
..##......##..
..#........#..
.......M......
..............
..#........#..
..##......##..
..............
.............."""),
        P=T("""
..............
..............
.#.#.#..#.#.#.
..............
..e........p..
..............
.#.#.#..#.#.#.
..............
..............
.............."""),
        T=T("""
.L..........L.
..............
..####CC####..
..#........#..
..#...ee...#..
..............
..............
.#..........#.
.#..........#.
.............."""),
        X=T("""
.L..........L.
..............
..#..#..#..#..
..............
.......X......
..............
..............
..#..#..#..#..
..............
..............""")))

# ---------------------------------------------------------------------------------------------------------------
# Frostmere Palace: a vast frozen hall of fountains (four rooms in one), a block-and-plate key vault.
FROSTMERE = dict(
    grid=['TXG', 'FFM', 'FFK', '.E.'], entry='E',
    doors=[('E', 'F', 'open'), ('F', 'K', 'open'), ('F', 'M', 'locked'), ('M', 'G', 'open'), ('F', 'T', 'open'), ('F', 'X', 'big')],
    rooms=dict(
        E=T("""
.L..........L.
..............
..~~......~~..
..~~..ee..~~..
..............
..............
..~~......~~..
..~~......~~..
..............
...S.........."""),
        F=[T("""
.L..........L.
..............
..~~~~..~~~~..
..~~~~..~~~~..
..~~~~..~~~~..
..............
..............
..~~~~..~~~~..
..~~~~..~~~~..
.............."""), T("""
.L..........L.
..............
..~~~~..~~~~..
..~~~~..~~~~..
..~~~~..~~~~..
..............
.......e......
..~~~~..~~~~..
..~~~~..~~~~..
.............."""), T("""
..............
..~~~~..~~~~..
..~~~~..~~~~..
..............
...e..........
..~~~~..~~~~..
..~~~~..~~~~..
..~~~~..~~~~..
..........m...
.............."""), T("""
..............
..~~~~..~~~~..
..~~~~..~~~~..
..............
..............
..~~~~..~~~~..
..~~~~..~~~~..
..~~~~..~~~~..
..............
..............""")],
        K=T("""
.........#k#..
.........#s#..
..............
...B.....B....
..............
...P.....P....
..............
..~~~~~~~~~~..
.p............
.............."""),
        M=T("""
.L..........L.
..........K...
..............
..~~......~~..
..~~...M..~~..
..............
..~~......~~..
..~~......~~..
..............
.............."""),
        G=T("""
..............
..............
..$.......a...
..............
..............
gggggggggggggg
..............
..e.......e...
..............
.............."""),
        T=T("""
.L..........L.
..............
......CC......
..~~......~~..
..~~~~..~~~~..
..............
..~~~~..~~~~..
..~~......~~..
...e......e...
.............."""),
        X=BOSS))

# ---------------------------------------------------------------------------------------------------------------
# Mirefen Temple: the waterworks. One switch floods the west channel or the east spillway, never both.
MIREFEN = dict(
    grid=['XT.G', 'PWWW', 'K.EM'], entry='E',
    doors=[('E', 'W', 'open'), ('W', 'P', 'open'), ('P', 'K', 'open'), ('W', 'M', 'locked'), ('W', 'T', 'locked'),
           ('P', 'X', 'big'), ('W', 'G', 'open')],
    rooms=dict(
        E=T("""
.L..........L.
..............
..~~......~~..
..~~......~~..
.....e..e.....
..............
..~~......~~..
..~~......~~..
..............
...S.........."""),
        W=[T("""
.L..........~~
............~~
..#..e..#...~~
............~~
............~~
............~~
..#.....#...~~
..........m.~~
............~~
............~~"""), T("""
.L..........L.
..............
..~~......~~..
..~~..w...~~..
..............
..............
..~~......~~..
..~~...e..~~..
..............
.............."""), T("""
==..........L.
==............
==..#....#....
==............
==.....e......
==............
==..#....#....
==............
==............
==............""")],
        P=T("""
.L..........L.
#k#...........
#s#...........
..............
..B.......B...
..............
..P.......P...
..............
..............
.............."""),
        K=T("""
.t..........t.
..............
..~~~....~~~..
..~~~....~~~..
..............
.....#k#......
.....#s#......
..............
.t..........t.
..e.......e..."""),
        M=T("""
.L..........L.
..............
..~~......~~..
..~~......~~..
.......M......
..............
..........K...
..............
..~~......~~..
.............."""),
        T=T("""
.L..........L.
..............
....~~CC~~....
..............
..~~......~~..
..~~..ee..~~..
..............
..............
..~~......~~..
.............."""),
        G=T("""
..............
.$.........a..
..............
..............
gggggggggggggg
..............
...e......e...
..............
..............
.............."""),
        X=BOSS))

# ---------------------------------------------------------------------------------------------------------------
# Turtleback: a volcano climbed room by room; a lava sea crossed on narrow bridges.
TURTLEBACK = dict(
    grid=['XT.', 'LLM', '.KH', '.EC'], entry='E',
    doors=[('E', 'K', 'open'), ('E', 'C', 'open'), ('K', 'H', 'open'), ('H', 'M', 'locked'), ('M', 'L', 'open'),
           ('L', 'T', 'open'), ('L', 'X', 'big')],
    rooms=dict(
        E=T("""
.L..........L.
..............
..~~~....~~~..
..............
.~~~e....e~~~.
..............
..~~~....~~~..
..............
..............
...S.........."""),
        K=T("""
.t..........t.
..............
..#k#.........
..#s#..~~~~...
.......~~~~...
.......~~~~...
.t.....~~~~.t.
..............
..e........e..
.............."""),
        H=T("""
.L..........L.
..............
~~~~~~~..~~~~~
..............
..............
~~~~..~~~~~~~~
..............
...e......e...
..~~~~~~~~~~..
.............."""),
        M=T("""
.L..........L.
..........K...
..............
..~~......~~..
..~~...M..~~..
..............
..............
..~~......~~..
..............
.............."""),
        L=[T("""
.L..........L.
..............
.~~~~~~..~~~~~
.~~~~~~..~~~~~
.~~~~~~..~~~~~
..............
~~~~~~~~~~~~~~
~~~~~~~~~~~~~~
..............
.............."""), T("""
.L..........L.
..............
~~~~~..~~~~~~.
~~~~~..~~~~~~.
~~~~~..~~~~~~.
..............
..~~~~~~~~~~..
..~~~~~~~~~~..
...e......m...
..............""")],
        T=T("""
.L..........L.
..............
..~~..CC..~~..
..~~......~~..
..............
.~~~~....~~~~.
..............
...e......e...
..............
.............."""),
        C=T("""
..............
..~~~~~~~~~~..
..~........~..
..~...p....~..
...........~..
...........~..
..~........~..
..~~~~~~~~~~..
..............
..e..........."""),
        X=T("""
.L..........L.
..............
..r........r..
..............
.......X......
..............
..............
..............
..r........r..
..............""")))

# ---------------------------------------------------------------------------------------------------------------
# The Arcade Vault: a casino floor over lava. A gauntlet at the door, two key games, a roulette hall.
ARCADEVAULT = dict(
    grid=['YGX.', 'JJRT', 'KSRP', '.EM.'], entry='E',
    doors=[('E', 'S', 'shut'), ('S', 'K', 'open'), ('S', 'R', 'open'), ('K', 'J', 'open'), ('J', 'Y', 'open'),
           ('R', 'P', 'open'), ('E', 'M', 'locked'), ('R', 'T', 'locked'), ('R', 'X', 'big'), ('J', 'G', 'open')],
    rooms=dict(
        E=T("""
.L..........L.
..............
.~.~.~..~.~.~.
..............
.e..........e.
..............
.~.~.~..~.~.~.
.......e......
..............
...S.........."""),
        S=T("""
.L..........L.
.~.~.~.~.~.~.~
..............
~.~.~.~.~.~.~.
..e.......e...
..............
.~.~.~.~.~.~.~
..............
~.~.~.~.~.~.~.
.............."""),
        K=T("""
.t..........t.
..............
..~~~~..~~~~..
..~..~..~..~..
..~..~..~..~..
..............
..#k#.........
..#s#.........
.t..........t.
...e......e..."""),
        J=[T("""
.L..........L.
..............
.~~~~~..~~~~~.
..............
..e.......e...
..............
.~~~~~..~~~~~.
..............
..........y...
.............."""), T("""
.L..........L.
..............
.~.~.~..~.~.~.
.~.~.~..~.~.~.
..............
..............
.~.~.~..~.~.~.
.~.~.~..~.~.~.
...e......e...
..............""")],
        Y=T("""
..............
..m........p..
..............
..~~~~..~~~~..
..............
..............
..~~~~..~~~~..
..............
....e....e....
.............."""),
        G=T("""
..............
.$.........a..
..............
gggggggggggggg
..............
..............
...e......e...
..............
..............
.............."""),
        R=[T("""
.L..........L.
..............
..~~~~..~~~~..
..~..~..~..~..
..~..~..~..~..
..............
..............
...~~~~~~~~...
..............
.............."""), T("""
..............
...~~~~~~~~...
..............
..............
.....e..e.....
..............
..~~~~..~~~~..
..~..~..~..~..
..~..~..~..~..
..............""")],
        P=T("""
..........#k#.
..........#s#.
..............
...B.....B....
..............
...P.....P....
..............
.~~~~~~~~~~~~.
..............
..e........e.."""),
        T=T("""
.L..........L.
..............
......CC......
..............
.~~~~~..~~~~~.
..............
..e.......e...
.~~~~~..~~~~~.
..............
.............."""),
        M=T("""
.L..........L.
..........K...
.~.~.......~.~
..............
.......M......
..............
.~.~......~.~.
..............
..............
.............."""),
        X=BOSS))

# ---------------------------------------------------------------------------------------------------------------
# Old Mine Depths: tunnels shored with timber, rockfalls to lift, walls to blast. Bring bombs.
OLDDEPTHS = dict(
    grid=['.XT.', 'SDDM', 'KE.C'], entry='E',
    doors=[('E', 'D', 'open'), ('E', 'K', 'crack'), ('D', 'S', 'crack'), ('D', 'M', 'locked'), ('M', 'C', 'open'),
           ('D', 'T', 'open'), ('D', 'X', 'big')],
    rooms=dict(
        E=T("""
.L..........L.
.##........##.
.#..r....r..#.
..............
..............
.#..........#.
.##..~~~~..##.
..............
..............
...S.........."""),
        K=T("""
..............
..#k#.........
..#s#.........
..............
..B.....B.....
..............
..P.....P.....
..............
.~~~~~~~~~~~..
.............."""),
        D=[T("""
.L..........L.
..............
.##.r.##..r.##
..............
.....~~~~.....
.....~~~~.....
.##...##....##
..r...........
..e...........
.............."""), T("""
.L..........L.
..............
##..r.##.r..##
..............
...~~~~~~.....
..............
##....##....##
.........r....
..m.....e.....
..............""")],
        S=T("""
..............
..$.......y...
..............
.r..........r.
..............
..............
.r..........r.
..............
..............
.............."""),
        M=T("""
.L..........L.
.....K........
.##........##.
..............
.......M......
..............
..............
.##........##.
..............
.............."""),
        C=T("""
..............
..~~~~..~~~~..
..............
..r........r..
..............
.....p........
..............
..~~~~..~~~~..
...e......e...
.............."""),
        T=T("""
.L..........L.
..............
..##..CC..##..
..............
..~~~~..~~~~..
..............
.r..........r.
..e.......e...
..............
.............."""),
        X=T("""
.L..........L.
..............
.##........##.
..............
.......X......
..............
..............
.##........##.
..............
..............""")))

# ---------------------------------------------------------------------------------------------------------------
# Standing Stones Barrow: eight chambers in a ring round the sealed heart of the mound. Stone circles everywhere.
BARROW = dict(
    grid=['ATB', 'KXM', 'CED'], entry='E',
    doors=[('E', 'C', 'open'), ('E', 'D', 'open'), ('C', 'K', 'open'), ('D', 'M', 'locked'), ('M', 'B', 'open'),
           ('B', 'T', 'open'), ('T', 'X', 'big'), ('K', 'A', 'crack')],
    rooms=dict(
        E=T("""
.L..........L.
.....#..#.....
...#......#...
..............
..#...ee...#..
..............
...#......#...
.....#..#.....
..............
...S.........."""),
        C=T("""
.L..........L.
..............
....#....#....
..#.......#...
.......m......
..#.......#...
....#....#....
..............
...e......e...
.............."""),
        K=T("""
..............
..#k#.........
..#s#.........
..............
.....B..B.....
..............
.....P..P.....
...~~~..~~~...
...~~~..~~~...
.............."""),
        A=T("""
..............
..$........y..
..............
....#....#....
..#.......#...
..............
..#.......#...
....#....#....
..............
.............."""),
        D=T("""
.L..........L.
..............
...~~~~~~~~...
...~#....#~...
...~......~...
...~......~...
...~#..p.#~...
...~~...~~~...
..e...........
.............."""),
        M=T("""
.L..........L.
......K.......
....#....#....
..#.......#...
.......M......
..#.......#...
....#....#....
..............
..............
.............."""),
        B=T("""
..............
..............
..~~~....~~~..
..~~~....~~~..
..............
..............
..~~~.e..~~~..
..~~~....~~~..
..............
.............."""),
        T=T("""
.L..........L.
..............
....#.CC.#....
..#........#..
..............
..............
..#........#..
....#.ee.#....
..............
.............."""),
        X=T("""
.L..........L.
..............
....#....#....
..#.......#...
.......X......
..............
..#.......#...
....#....#....
..............
..............""")))

# ---------------------------------------------------------------------------------------------------------------
# Bramble Temple: roots and flooded moats. Draining the root hall opens the east, filling it opens the west.
BRAMBLETEMPLE = dict(
    grid=['.X.', 'TRK', 'MRQ', 'CE.'], entry='E',
    doors=[('E', 'R', 'open'), ('E', 'C', 'open'), ('R', 'K', 'open'), ('R', 'M', 'locked'), ('M', 'T', 'open'),
           ('R', 'X', 'big'), ('R', 'Q', 'crack')],
    rooms=dict(
        E=T("""
.L..........L.
..............
.~~~......~~~.
.~~~..ee..~~~.
..............
..............
.~~~......~~~.
.~~~......~~~.
..............
...S.........."""),
        R=[T("""
.L..........L.
..............
..#........#..
..........~~~~
..........~~~~
..........~~~~
..........~~~~
..#.......~~~~
..m...........
.............."""), T("""
..............
..#........#..
..............
==............
==....w.......
==............
==............
..#........#..
.......e......
..............""")],
        K=T("""
.t..........t.
..............
..~~......~~..
..~~......~~..
..............
..............
..~~......~~..
..~~..#k#.~~..
.t....#s#...t.
..e.........e."""),
        M=T("""
.L..........L.
..K...........
..............
..~~......~~..
..~~...M......
..............
..~~......~~..
..~~......~~..
..............
.............."""),
        T=T("""
.L..........L.
..............
..~~..CC..~~..
..~~......~~..
..............
.~~~~....~~~~.
.~~~~....~~~~.
..............
..e.......e...
.............."""),
        Q=T("""
..............
..$........y..
..............
.~~~......~~~.
..............
..............
.~~~......~~~.
..............
..............
.............."""),
        C=T("""
..............
..p...........
..............
..~~~~..~~~~..
..~~~~..~~~~..
..............
..............
..~~~~..~~~~..
..e.......e...
.............."""),
        X=BOSS))

# ---------------------------------------------------------------------------------------------------------------
# Stormspire: a narrow tower climbed floor by floor, a spiral stair hall, frozen holes underfoot.
STORMSPIRE = dict(
    grid=['.X', 'TS', 'KS', 'MH', '.E'], entry='E',
    doors=[('E', 'H', 'shut'), ('H', 'S', 'open'), ('S', 'K', 'open'), ('H', 'M', 'locked'), ('S', 'T', 'open'), ('S', 'X', 'big')],
    rooms=dict(
        E=T("""
.L..........L.
..............
..~.~.~..~.~..
..............
..e........e..
..............
..~.~.~..~.~..
.......e......
..............
...S.........."""),
        H=T("""
.L..........L.
..............
..~~~....~~~..
..~~~....~~~..
..............
..............
..~~~....~~~..
..~~~..p.~~~..
..............
.............."""),
        S=[T("""
.L..........L.
..............
..~~~~~~~~~~..
..~........~..
..~.~~~~~~.~..
..............
..~.~~~~~~.~..
..~........~..
..~~~....~~~..
.............."""), T("""
..............
..~~~....~~~..
..~........~..
..~.~~~~~~.~..
..............
..............
..~.~~~~~~.~..
..~...m....~..
..~~~....~~~..
..............""")],
        K=T("""
.L..........L.
..............
..#k#.........
..#s#.........
..............
..e........e..
..............
..~~~~..~~~~..
.....e........
.............."""),
        M=T("""
.L..........L.
.....K........
..~........~..
..............
.......M......
..............
..~........~..
..............
..............
.............."""),
        T=T("""
.L..........L.
.$...g........
.....g........
.a...g...CC...
.....g........
.....g........
.....g..e.....
.....g........
.....g........
.....g........"""),
        X=BOSS))

# ---------------------------------------------------------------------------------------------------------------
# Mirror Temple: built in reflection. The west wing mirrors the east; the hub's switch lowers the moat.
_MWING = T("""
.L..........L.
..............
..~~~....~~~..
..~~~....~~~..
..............
..............
..~~~....~~~..
..~~~....~~~..
..............
..............""")
MIRRORTEMPLE = dict(
    grid=['.X.', 'CTD', 'AHB', '.E.'], entry='E',
    doors=[('E', 'H', 'open'), ('H', 'A', 'open'), ('H', 'B', 'locked'), ('A', 'C', 'open'), ('B', 'D', 'open'),
           ('H', 'T', 'open'), ('T', 'X', 'big')],
    rooms=dict(
        E=T("""
.L..........L.
..............
..#.~~..~~.#..
..............
..e........e..
..............
..#.~~..~~.#..
..............
..............
...S.........."""),
        H=T("""
.L....~~....L.
......~~......
..~~~~~~~~~~..
..............
.....w..p.....
..............
..~~~~..~~~~..
..............
...e......e...
.............."""),
        A=T("""
.t..........t.
..............
..~~~....~~~..
..~~~....~~~..
..............
.....#k#......
.....#s#......
..~~~....~~~..
.t..........t.
...e......e..."""),
        B=mirror(T("""
.L..........L.
..............
..~~~....~~~..
..~~~....~~~..
..............
.......M......
..............
..~~~....~~~..
...K..........
..............""")),
        C=T("""
.........g..$.
.........g....
.........g..a.
.........g....
.........g....
.........g....
.........g....
...e.....g....
.........g....
.........g...."""),
        D=mirror(T("""
..............
.m............
..............
..~~~....~~~..
..............
..............
..~~~....~~~..
...e......e...
..............
..............""")),
        T=T("""
.L..........L.
..............
..~~~.CC.~~~..
..~~~....~~~..
..............
..............
..~~~....~~~..
..~~~....~~~..
...e......e...
.............."""),
        X=BOSS))

# ---------------------------------------------------------------------------------------------------------------
# Glass Spire: a pyramid of glass. A three-room gallery at its base, two key trials, the master at the tip.
GLASSSPIRE = dict(
    grid=['..X..', '.TPQ.', 'KHHHM', '..E..'], entry='E',
    doors=[('E', 'H', 'open'), ('H', 'K', 'open'), ('H', 'M', 'locked'), ('H', 'T', 'open'), ('H', 'P', 'open'),
           ('H', 'Q', 'locked'), ('P', 'X', 'big')],
    rooms=dict(
        E=T("""
.L..........L.
..............
..#..#..#..#..
..............
..............
..#..#..#..#..
..............
..e........e..
..............
...S.........."""),
        H=[T("""
.L..........L.
..............
..#..~~~~..#..
..............
..............
..#..~~~~..#..
..............
..e...........
..#........#..
.............."""), T("""
.L..........L.
..............
..#........#..
.....#..#.....
..............
..............
.....#..#.....
..#........#..
..m...........
.............."""), T("""
.L..........L.
..............
..#..~~~~..#..
..............
..............
..#..~~~~..#..
..............
...........e..
..#........#..
..............""")],
        K=T("""
.t..........t.
..............
..#k#.........
..#s#.........
..............
..............
..~~~~~~~~~~..
..............
.t..........t.
...e......e..."""),
        M=T("""
.L..........L.
..........K...
..#........#..
..............
.......M......
..............
..............
..#........#..
..............
.............."""),
        T=T("""
.L..........L.
..............
..#...CC...#..
..............
..~~~....~~~..
..~~~....~~~..
..............
..e........e..
..............
.............."""),
        P=T("""
.L..........L.
#k#...........
#s#...........
..............
..B.......B...
..............
..P.......P...
..............
..~~......~~..
.............."""),
        Q=T("""
..............
.$.........a..
..............
gggggggggggggg
..............
..............
.....p........
..............
..e.......e...
.............."""),
        X=BOSS))

SPECS = {'bonehollow': BONEHOLLOW, 'thievesden': THIEVESDEN, 'frostmere': FROSTMERE, 'mirefen': MIREFEN, 'turtleback': TURTLEBACK,
         'arcadevault': ARCADEVAULT, 'olddepths': OLDDEPTHS, 'barrow': BARROW, 'brambletemple': BRAMBLETEMPLE,
         'stormspire': STORMSPIRE, 'mirrortemple': MIRRORTEMPLE, 'glassspire': GLASSSPIRE}

HINTS = {'torches': 'Fire opens what force cannot. Light every brazier in the room.', 'plate': 'Heavy stones belong on the plates. Push them home.',
         'clear': 'Some doors only open when the room falls quiet. Make it quiet.', 'switch': 'The water answers to the crystal. Strike it and the channels change.',
         'crack': 'Cracked walls hide more than dust. Bombs ask politely.'}


def build(M, mid, name, back, theme, item, crystal, mini, boss, gate):
    S = SPECS[mid]
    grid = S['grid']
    gh, gw = len(grid), len(grid[0])
    m = M.Map(mid, gw * 16, gh * 14, name, indoor=True, music='dungeon')
    m.extra.update({'dungeon': mid, 'exit': [back[0], back[1], back[2]], 'boss': True, 'pendant': crystal, 'shadow': True, 'lava': [], 'flood': [], 'spill': []})
    m.extra.setdefault('triggers', [])
    cells = {}
    for ry, row in enumerate(grid):
        for rx, ch in enumerate(row):
            if ch == '.':
                for y in range(ry * 14, ry * 14 + 14):          # solid rock between the rooms
                    for x in range(rx * 16, rx * 16 + 16):
                        m.put('ground', M.IN, 1, 1, x, y)
                        m.col[y * m.w + x] = M.SOLID
            else:
                cells.setdefault(ch, []).append((rx, ry))
    area = {}
    for L, cs in cells.items():
        for (rx, ry) in cs:
            M.room(m, rx, ry)
            m.areas.pop()
        x0, y0 = min(c[0] for c in cs), min(c[1] for c in cs)
        x1, y1 = max(c[0] for c in cs), max(c[1] for c in cs)
        assert len(cs) == (x1 - x0 + 1) * (y1 - y0 + 1), ('halls must be rectangles', mid, L)
        area[L] = len(m.areas)
        m.area(x0 * 16, y0 * 14, (x1 - x0 + 1) * 16, (y1 - y0 + 1) * 14)
        if len(cs) > 1:                                      # one big hall: knock out the walls between its rooms
            for y in range(y0 * 14 + 3, (y1 + 1) * 14 - 1):
                for x in range(x0 * 16 + 1, (x1 + 1) * 16 - 1):
                    m.put('ground', M.CV, 0, 0, x, y)
                    m.col[y * m.w + x] = M.OPEN
    foes = {'forest': ['skull', 'bluebat', 'mushroom'], 'thieves': ['soldier', 'archer', 'spiderred'], 'ice': ['slime3', 'skullblue', 'bluebat'],
            'swamp': ['snake', 'octopus', 'slime'], 'turtle': ['beast', 'eye', 'lizard']}[theme]

    def haz(x, y):
        i = y * m.w + x
        if theme == 'turtle':
            m.col[i] = M.PIT; m.extra['lava'].append(i)
        elif theme == 'swamp':
            m.extra['flood'].append(i)
        elif theme == 'ice':
            m.col[i] = M.DEEP
        else:
            m.col[i] = M.PIT; m.put('ground', M.CV, 1, 1, x, y)

    marks = {}           # per room letter: lists of special cells
    nfoe = 0
    for L, cs in cells.items():
        tl = S['rooms'].get(L)
        if tl is None:
            tl = [T('\n'.join(['.' * 14] * 10))] * len(cs)
        elif isinstance(tl[0], str):
            tl = [tl] * len(cs)
        assert len(tl) == len(cs), (mid, L)
        mk = marks.setdefault(L, {})
        for (rx, ry), rows in zip(cs, tl):
            X, Y = rx * 16 + 1, ry * 14 + 3
            skip = False
            for r, row in enumerate(rows):
                for c, ch in enumerate(row):
                    x, y = X + c, Y + r
                    if skip:
                        skip = False
                        continue
                    mk.setdefault(ch, []).append((x, y))
                    if ch == '#':
                        m.col[y * m.w + x] = M.SOLID; m.put('ground', M.IN, 1, 1, x, y)
                    elif ch == '~':
                        haz(x, y)
                    elif ch == '=':
                        m.extra['spill'].append(y * m.w + x)
                    elif ch == 'w':
                        m.solid(x, y, 1, 1, M.SWITCH)
                    elif ch == 'B':
                        m.solid(x, y, 1, 1, M.BLOCK)
                    elif ch == 'P':
                        m.solid(x, y, 1, 1, M.PLATE); m.extra.setdefault('plates', []).append([x, y])
                    elif ch == 't':
                        m.solid(x, y, 1, 1, M.TORCH)
                    elif ch == 'L':
                        m.solid(x, y, 1, 1, M.TORCH_LIT)
                    elif ch == 'g':
                        m.solid(x, y, 1, 1, gate)
                    elif ch == 'r':
                        M.rocks(m, [(x, y)])
                    elif ch == 'c':
                        m.solid(x, y, 1, 1, M.CRACK)
                    elif ch == 's':
                        m.solid(x, y, 1, 1, M.SHUTTER)
                    elif ch in 'kmp$yab':
                        m.chest(x, y, {'k': 'key', 'm': 'map', 'p': 'compass', '$': 'cash100', 'y': 'cash50', 'b': 'bombs',
                                       'a': 'plushie' if mid == 'thievesden' else 'arrows'}[ch])
                    elif ch == 'C':
                        M.bigchest(m, x, y, item)
                        skip = True
                    elif ch == 'K':
                        m.chests['%d,%d' % (x, y)] = {'item': 'bigkey', 'big': False}
                        m.extra.setdefault('reveal', {})['mini'] = [[x, y]]
                    elif ch == 'e':
                        m.spawn(foes[nfoe % 3], x, y); nfoe += 1
                    elif ch == 'M':
                        m.spawn(mini, x, y)
                    elif ch == 'X':
                        m.spawn(boss, x, y)
                    elif ch == 'S':
                        mk['sign'] = (x, y)
    # doors between rooms
    side = lambda a, b: 'e' if b[0] > a[0] else 'w' if b[0] < a[0] else 's' if b[1] > a[1] else 'n'
    shut_from = set()
    for (A, B, kind) in S['doors']:
        pair = next(((a, b) for a in cells[A] for b in cells[B] if abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1), None)
        assert pair, ('rooms not touching', mid, A, B)
        a, b = pair
        if kind == 'open':
            M.door(m, a[0], a[1], side(a, b)); M.door(m, b[0], b[1], side(b, a))
        elif kind == 'locked':
            M.door(m, a[0], a[1], side(a, b), M.LOCKED); M.door(m, b[0], b[1], side(b, a), M.LOCKED)
        elif kind == 'big':
            M.door(m, a[0], a[1], side(a, b), M.BIGLOCK); M.door(m, b[0], b[1], side(b, a), M.BIGLOCK)
        elif kind == 'shut':
            M.door(m, a[0], a[1], side(a, b), M.SHUTTER, 'r' + A); M.door(m, b[0], b[1], side(b, a))
            shut_from.add(A)
        elif kind == 'crack':
            M.door(m, a[0], a[1], side(a, b)); M.door(m, b[0], b[1], side(b, a))
            X, Y = a[0] * 16, a[1] * 14
            sd = side(a, b)
            for (x, y) in {'n': [(X + 7, Y + 2), (X + 8, Y + 2)], 's': [(X + 7, Y + 13), (X + 8, Y + 13)], 'w': [(X, Y + 7), (X, Y + 8)], 'e': [(X + 15, Y + 7), (X + 15, Y + 8)]}[sd]:
                m.solid(x, y, 1, 1, M.CRACK)
    # the way in
    (ex, ey) = cells[S['entry']][0]
    X, Y = ex * 16, ey * 14
    M.door(m, ex, ey, 's')
    for x in (7, 8):
        m.warp(X + x, Y + 13, back[0], back[1], back[2], 2)
    m.entry = [X + 7, Y + 11]
    # puzzles: each room's shutters open by its torches, its plates, or when it is cleared
    used = []
    for L, mk in marks.items():
        if mk.get('s') or L in shut_from:
            g = 'r' + L
            for (x, y) in mk.get('s', []):
                m.extra.setdefault('shutters', {}).setdefault(g, []).append([x, y])
            if mk.get('t'):
                m.extra['triggers'].append({'type': 'torches', 'at': [list(p) for p in mk['t']], 'open': g}); used.append('torches')
            elif mk.get('P'):
                m.extra['triggers'].append({'type': 'plate', 'at': [list(p) for p in mk['P']], 'open': g}); used.append('plate')
            else:
                assert mk.get('e'), ('a room cleared to open needs enemies', mid, L)
                m.extra['triggers'].append({'type': 'clear', 'area': area[L], 'open': g}); used.append('clear')
        if mk.get('M'):
            m.extra['triggers'].append({'type': 'clear', 'area': area[L], 'open': 'mini'})
    if m.extra['flood'] or m.extra['spill']:
        used.append('switch')
    if any(k == 'crack' for (_, _, k) in S['doors']):
        used.append('crack')
    sx, sy = marks[S['entry']]['sign']
    M.signboard(m, sx, sy, name.upper() + '|' + ' '.join(HINTS[p] for p in dict.fromkeys(used)) + ' The Big Key opens the way to the master of this place.')
    # soft-edged pits and pools
    import blend as _B
    for y in range(m.h):
        for x in range(m.w):
            c = m.col[y * m.w + x]
            if c in (M.PIT, M.DEEP) and y * m.w + x not in m.extra['lava']:
                k = _B.mask(lambda a, b: m.ok(a, b) and m.col[b * m.w + a] == c and b * m.w + a not in m.extra['lava'], x, y)
                m.put('ground', M.BL, k & 15, (8 if c == M.PIT else 7) * 16 + (k >> 4), x, y)
    m.extra['floor'] = {'forest': (12, 7), 'swamp': (13, 8), 'ice': (1, 1), 'turtle': (1, 7), 'thieves': None}[theme]
    m.extra['plan'] = S['grid']
    check(M, m, S, cells)
    return m


def check(M, m, S, cells):
    """Build-time proof the dungeon can be finished: every door, chest and the boss can be reached on foot (doors and
    gates counted as passable, both water levels), and the keys are enough in any order."""
    walk = {M.OPEN, M.PLATE, M.SHUTTER, M.LOCKED, M.BIGLOCK, M.CRACK, M.PEG, M.DARKROCK, M.SWITCH}
    wet = set(m.extra['flood']) | set(m.extra['spill'])
    ok = lambda x, y: m.ok(x, y) and (m.col[y * m.w + x] in walk or y * m.w + x in wet) and (m.col[y * m.w + x] != M.SWITCH)
    seen = {tuple(m.entry)}
    q = [tuple(m.entry)]
    while q:
        x, y = q.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p = (x + dx, y + dy)
            if p not in seen and ok(*p):
                seen.add(p); q.append(p)
    bad = []
    for k in m.chests:
        x, y = map(int, k.split(','))
        if (x, y + 1) not in seen:
            bad.append(('chest', k, m.chests[k]['item']))
    for s in m.spawns:
        if s['kind'] not in ('bluebat',) and (s['x'], s['y']) not in seen and m.col[s['y'] * m.w + s['x']] == M.OPEN:
            bad.append(('spawn', s['kind'], s['x'], s['y']))
    for y in range(m.h):
        for x in range(m.w):
            if m.col[y * m.w + x] in (M.LOCKED, M.BIGLOCK, M.SHUTTER, M.CRACK) and (x, y) not in seen:
                bad.append(('door', x, y))
            if m.col[y * m.w + x] in (M.BLOCK,):
                if not any((x + dx, y + dy) in seen for dx, dy in ((0, -1), (0, 1), (1, 0), (-1, 0))):
                    bad.append(('block', x, y))
            if m.col[y * m.w + x] in (M.SWITCH, M.TORCH):
                if not any((x + dx, y + dy) in seen for dx, dy in ((0, -1), (0, 1), (1, 0), (-1, 0))):
                    bad.append(('switch/torch', x, y))
    assert not bad, (m.id, bad)
    # keys: walk the rooms; locked doors take a key, the boss door takes the Big Key from the mini-boss room
    rooms = {S['entry']}
    keys = used = 0
    big = False
    counted = set()
    changed = True
    while changed:
        changed = False
        for L in list(rooms):
            if L not in counted:
                counted.add(L)
                keys += sum(1 for r in (S['rooms'][L] if isinstance(S['rooms'][L][0], list) else [S['rooms'][L]]) for row in r for ch in row if ch == 'k')
                big = big or any('K' in row for r in (S['rooms'][L] if isinstance(S['rooms'][L][0], list) else [S['rooms'][L]]) for row in r)
                changed = True
        for (A, B, kind) in S['doors']:
            for (u, v) in ((A, B), (B, A)):
                if u in rooms and v not in rooms:
                    if kind in ('open', 'shut', 'crack') or (kind == 'big' and big):
                        rooms.add(v); changed = True
                    elif kind == 'locked' and keys - used > 0:
                        used += 1; rooms.add(v); changed = True
    assert rooms == set(cells), (m.id, 'cannot reach', set(cells) - rooms)
    nlocked = sum(1 for d in S['doors'] if d[2] == 'locked')
    assert keys >= nlocked, (m.id, 'keys', keys, nlocked)


# =================================================================================================================
# Full-size dungeons: several floors joined by stairs, holes that drop you to the floor below, 25 to 70 rooms,
# a chain of locked doors (one Small Key per lock, always found before the only lock you can reach), puzzle
# shutters, side vaults behind cracked walls and item gates. The dungeon's own hand-drawn rooms above are used for
# its landmark rooms (way in, key vaults, mini-boss, Big Chest, boss) wherever their doors fit; the rest of the
# rooms come from the library below, drawn by hand to fit any doorways, flipped and themed per dungeon.
#   ?  chest slot (map, compass, key or treasure goes here when the room is chosen for it, else floor)
#   ^  stairs slot (stairs when the room has stairs, else floor)      o  hole to the floor below (drop rooms)
# =================================================================================================================
LIB_FILL = [T(s) for s in ("""
.L..........L.
..^...........
..##......##..
..##.?....##..
..............
..............
..##......##..
..##......##..
..........e...
..............""", """
.L..........L.
..~~~....~~~..
..~~~.^..~~~..
..~~~....~~~..
..............
..............
..~~~....~~~..
..~~~.?..~~~..
..~~~....~~~..
..............""", """
.L..........L.
..............
..~~~~..~~~~..
..~^.....?.~..
..............
..............
..~........~..
..~~~~..~~~~..
..............
..e........e..""", """
.L..........L.
..............
.~~~~~..~~~~~.
..^........?..
..............
..............
.~~~~~..~~~~~.
..............
...e......e...
..............""", """
.L..........L.
.~.~.~..~.~.~.
..............
.~.~.~..~.~.~.
..............
..............
.~.~.~..~.~.~.
..?........^..
.~.~.~..~.~.~.
..............""", """
.L..........L.
..#..#..#..#..
..............
..#..#..#..#..
..............
..............
..#..#..#..#..
...?......^...
..#..#..#..#..
..............""", """
.L..........L.
..............
..####..####..
..#..?..^..#..
..#........#..
..............
..#........#..
..####..####..
..............
..e........e..""", """
.L..........L.
..?...........
....~~~~~~....
...~~~~~~~~...
...~~~~~~~~...
...~~~~~~~~...
...~~~~~~~~...
....~~~~~~....
..........^...
..e...........""", """
.L..........L.
...#......#...
.#.#.##.#.#.#.
.#...#..#...#.
.###.#..#.###.
..............
.#....?.....#.
.#.##....##.#.
.#..#.^..#..#.
..............""", """
.L..........L.
#.#........#.#
#?#..e.....#.#
..............
..............
..............
#.#........#.#
#.#....^...#.#
#.#........#.#
..............""", """
.L..........L.
.~~...........
.~~~......^...
..~~~.........
..............
..............
.........~~~..
..?.......~~~.
...........~~.
..............""", """
.L..........L.
..............
...#..^...#...
..............
.#..........#.
.#..........#.
..............
...#..?...#...
..............
..e........e..""", """
.L..........L.
..?.......^...
..............
~~~~~~..~~~~~~
..............
..............
~~~~~~..~~~~~~
..............
..e........e..
..............""", """
.L..........L.
.....#..#.....
...#......#...
..#...^....#..
..............
..............
..#...?....#..
...#......#...
.....#..#.....
..............""", """
.L..........L.
..............
..~~..~~..~~..
..~~..~~..~~..
.?............
..............
..~~..~~..~~..
..~~..~~..~~..
..........^...
..............""", """
.L..........L.
..............
.##..^....##..
.#..........#.
.#..~~..~~..#.
.#..~~..~~..#.
.#..........#.
.##..?....##..
..............
...e......e...""", """
.L..........L.
.?.#......#...
...#......#...
...####.###...
..............
..............
...###.####...
...#......#^..
...#......#...
..............""")]
LIB_HOLE = [T(s) for s in ("""
.L..........L.
..............
..oooo..oooo..
..oooo..oooo..
..............
..............
..oooo..oooo..
..oooo..oooo..
..............
..e...........""", """
.L..........L.
..............
...oo....oo...
..............
..............
.....oooo.....
.....oooo.....
..............
...oo....oo...
..............""", """
.L..........L.
.oo........oo.
.oo........oo.
..............
..............
..............
..............
.oo........oo.
.oo........oo.
..............""")]
LIB_KEY = [T(s) for s in ("""
.t..........t.
..............
...#k#........
...#s#........
..............
..............
..........e...
..............
.t..........t.
..............""", """
.L..........L.
.#k#..........
.#s#..........
....B.....B...
..............
....P.....P...
..............
..............
..............
..............""", """
.L..........L.
..............
..e........e..
..............
..............
..............
..........#k#.
.....e....#s#.
..............
..............""", """
.L..........L.
..~~~....~~~..
..~k~....~~~..
..~.~....~~~..
..............
..............
..~~~....~~~..
..~~~..e.~~~..
..~~~....~~~..
..............""")]
LIB_PUZZLE = [T(s) for s in ("""
.t..........t.
..............
..#........#..
..............
..............
..............
..#........#..
..............
.t..........t.
..............""", """
.L..........L.
..............
...B......B...
..............
...P......P...
..............
..............
..............
..............
..............""", """
.L..........L.
..............
..e........e..
..............
..............
..............
...#......#...
.....e..e.....
..............
..............""")]
LIB_MINI = T("""
.L..........L.
..........K...
..#........#..
..............
.......M......
..............
..............
..#........#..
..............
..............""")
LIB_BIG = T("""
.L..........L.
..............
..~~..CC..~~..
..............
..............
..............
..~~......~~..
..e........e..
..............
..............""")
LIB_SECRET = T("""
..............
..y........b..
..............
...#......#...
..............
..............
...#......#...
..............
..............
..............""")
LIB_ENTRY = T("""
.L..........L.
..............
..#........#..
..............
..............
..............
..#........#..
..............
..............
...S..........""")
LIB_SWITCH = T("""
.L..........L.
..~~~....~~~..
..~y~....~~~..
..~~~....~~~..
..............
......w.......
..~~~....~~~..
..~~~....~~~..
..~~~....~~~..
..............""")
GATE_N = T("""
..............
..............
..e........e..
..............
..............
..............
gggggggggggggg
..$........a..
..............
..............""")
GATE_W = T("""
.........g....
.........g..$.
.........g....
.........g....
...e.....g....
.........g..a.
.........g....
.........g....
...e.....g....
.........g....""")
LIB_GATE = {'n': GATE_N, 's': [r for r in reversed(GATE_N)][:0] or None, 'w': GATE_W, 'e': mirror(GATE_W)}
LIB_GATE['s'] = T("""
..............
..$........a..
..............
gggggggggggggg
..............
..............
..e........e..
..............
..............
..............""")

# the corridor at the last lock: across it only with the dungeon's tool
BAR = {
    ('gap', 'v'): T("""
.L..........L.
.......L......
..............
______________
______________
______________
______________
..............
......L.......
.............."""),
    ('gap', 'h'): T("""
.L...____...L.
.....____.....
.....____.....
.....____.....
.....____.L...
...L.____.....
.....____.....
.....____.....
.....____.....
.....____....."""),
    ('gate', 'v'): T("""
.L..........L.
..............
..#........#..
..............
gggggggggggggg
gggggggggggggg
..#........#..
..............
..e........e..
.............."""),
    ('gate', 'h'): T("""
.L....gg....L.
......gg......
..#...gg...#..
......gg......
......gg......
......gg......
..#...gg...#..
......gg......
..e...gg...e..
......gg......"""),
    ('wand', 'v'): T("""
.L..........L.
..............
..#........#..
..............
....P....P....
..............
..#........#..
..............
..............
.............."""),
}
BAR[('wand', 'h')] = BAR[('wand', 'v')]
BAR[('bombs', 'v')] = [r.replace('g', 'c') for r in BAR[('gate', 'v')]]
BAR[('bombs', 'h')] = [r.replace('g', 'c') for r in BAR[('gate', 'h')]]
LIB_CRYSTAL = [T(s) for s in ("""
.L..........L.
.#?#......#?#.
.#.#......#.#.
.#u#......#v#.
..............
......*.......
..............
..............
..e........e..
..............""", """
.L..........L.
..............
..uuuu..vvvv..
..u?.u..v..v..
..u..u..v..v..
..............
..............
..*...........
...........e..
..............""", """
.L..........L.
..............
..#vvv..uuu#..
..#?.v..u..#..
..#..v..u..#..
..............
.......*......
..............
..e...........
..............""")]
LIB_SECRET_KEY = T("""
..............
..y........k..
..............
...#......#...
..............
..............
...#......#...
..............
..............
..............""")

# the dungeon's regular foes, from the first rooms to the deepest (the pack's monsters and their tinted cousins)
ROSTER = {
    'forest':  ['skull', 'bluebat', 'mushroom', 'larva', 'owl', 'skullred', 'shroomspore', 'eyered', 'moledirt', 'cyclope', 'owlnight', 'batfire'],
    'thieves': ['soldier', 'spiderred', 'mouse', 'archer', 'mousegray', 'snake', 'soldierBlue', 'spiderblue', 'beastgold', 'captain', 'eyered'],
    'ice':     ['slime3', 'bluebat', 'skullblue', 'owl', 'lizardice', 'slimeblue', 'owlnight', 'octopusblue', 'cyclopeice', 'spiderblue'],
    'swamp':   ['snake', 'slime', 'octopus', 'larva', 'larvatoxic', 'slimered', 'mole', 'snakefire', 'octopusblue', 'bamboowild', 'reptile2'],
    'turtle':  ['beast', 'lizard', 'eye', 'reptile2', 'molefire', 'snakefire', 'eyered', 'batfire', 'beastgold', 'reptilegold', 'cyclopered'],
}

# where each dungeon sits in the adventure: regular foes' strength (x hit points, damage grows half as fast),
# the new bosses' hit points (the early ones meet a plainer sword), and the dungeon's music
DIFF = {
    'ruins1': (1.0, 1.0, 'crypt'), 'shrine': (1.1, 1.0, 'sunken'), 'olddepths': (1.2, 0.6, 'mine'), 'barrow': (1.25, 0.6, 'crypt'),
    'brambletemple': (1.3, 0.65, 'swamp'), 'forge': (1.3, 1.0, 'fire'), 'castle': (1.4, 1.0, 'palace'), 'vault': (1.5, 1.0, 'sunken'),
    'quarry': (1.6, 1.0, 'mine'), 'bonehollow': (1.7, 1.0, 'crypt'), 'thievesden': (1.75, 1.0, 'den'), 'frostmere': (1.8, 1.0, 'ice'),
    'mirefen': (1.85, 1.0, 'swamp'), 'turtleback': (1.9, 1.0, 'fire'), 'stormspire': (1.95, 1.0, 'tower'), 'mirrortemple': (2.0, 1.1, 'mirror'),
    'glassspire': (2.05, 1.0, 'glass'), 'keep': (2.2, 1.0, 'keep'), 'arcadevault': (2.4, 1.3, 'arcade'),
}

# ALttP items this game was missing, each hidden in a bombable side vault (Torn's names for two of them)
TREASURE = {'ruins1': 'pepper', 'forge': 'fireshield', 'thievesden': 'ninjastars'}

# floors in the order you go through them, the floor you come in on first; rooms; grid of one floor; Small Keys
PLANS = {
    'barrow':        dict(floors=['1F', 'B1', 'B2'], rooms=26, grid=(5, 4), keys=3),
    'olddepths':     dict(floors=['1F', 'B1', 'B2', 'B3'], rooms=30, grid=(5, 4), keys=3),
    'brambletemple': dict(floors=['1F', '2F', '3F'], rooms=32, grid=(5, 4), keys=3),
    'bonehollow':    dict(floors=['1F', 'B1', 'B2'], rooms=36, grid=(5, 5), keys=4),
    'stormspire':    dict(floors=['1F', '2F', '3F', '4F', '5F', '6F'], rooms=34, grid=(3, 3), keys=4),
    'thievesden':    dict(floors=['1F', 'B1', 'B2'], rooms=40, grid=(6, 4), keys=4),
    'frostmere':     dict(floors=['1F', 'B1', 'B2'], rooms=40, grid=(5, 5), keys=4),
    'mirrortemple':  dict(floors=['1F', '2F', '3F'], rooms=44, grid=(5, 5), keys=5),
    'mirefen':       dict(floors=['1F', 'B1', 'B2'], rooms=48, grid=(6, 5), keys=5),
    'glassspire':    dict(floors=['1F', '2F', '3F', '4F'], rooms=50, grid=(5, 5), keys=5),
    'turtleback':    dict(floors=['1F', '2F', '3F', '4F'], rooms=60, grid=(6, 5), keys=6),
    'arcadevault':   dict(floors=['B1', 'B2', 'B3', 'B4', 'B5'], rooms=70, grid=(6, 5), keys=7),
}
# what bars the way into the last part of each dungeon (ALttP: the dungeon's own item is needed further in)
TOOL = {'bonehollow': 'gate', 'thievesden': 'gate', 'mirefen': 'wand', 'olddepths': 'bombs', 'barrow': 'bombs', 'brambletemple': 'bombs'}
CBLUE, CORANGE, CRYSTAL = 26, 27, 28
WINGS = {
    'ruins1': dict(floors=['1F', 'B1'], core='B2', rooms=22, grid=(5, 4), keys=2, theme='forest', gate='PEG', tool='bombs', name='Meadow Ruins'),
    'shrine': dict(floors=['1F', '2F'], core='B1', rooms=28, grid=(5, 4), keys=3, theme='swamp', gate='DARKROCK', tool='bombs', name='Sunken Shrine'),
    'forge':  dict(floors=['1F', '2F', '3F'], core='4F', rooms=34, grid=(5, 4), keys=3, theme='turtle', gate='PEG', tool='gap', name='Ember Forge'),
    'castle': dict(floors=['1F', '2F', '3F'], core='4F', rooms=40, grid=(5, 5), keys=4, theme='thieves', gate='DARKROCK', tool='gap', name='Ashford Castle'),
    'vault':  dict(floors=['1F', 'B1', 'B2'], core='B3', rooms=40, grid=(5, 5), keys=4, theme='swamp', gate='PEG', tool='gap', name='Drowned Vault'),
    'quarry': dict(floors=['1F', 'B1', 'B2'], core='B3', rooms=44, grid=(6, 4), keys=4, theme='forest', gate='DARKROCK', tool='gap', name='Hollow Quarry'),
    'keep':   dict(floors=['1F', '2F', '3F', '4F', '5F', '6F'], core='7F', rooms=92, grid=(6, 5), keys=8, theme='thieves', gate='PEG', tool='gap', name='Shadow Keep'),
}
FLOOR_NO = lambda f: (-int(f[1:]) if f[0] == 'B' else int(f[:-1]))
WALK_T = set('.eMX?s=PK')


def fits(t, sides, theme, need_stairs=False):
    """A room drawing fits a set of doorways if every doorway can reach every other, and every chest and the stairs
    can be reached, on foot (hazards impassable; swamp water counted when the room has its own switch)."""
    wet = theme == 'swamp' and any('w' in r for r in t)
    ok = lambda c, r, gate=False: 0 <= r < 10 and 0 <= c < 14 and (t[r][c] in WALK_T or (wet and t[r][c] == '~') or (gate and t[r][c] in 'guv'))
    app = {'n': [(6, 0), (7, 0)], 's': [(6, 9), (7, 9)], 'w': [(0, 4), (0, 5)], 'e': [(13, 4), (13, 5)]}
    starts = [p for sd in sides for p in app[sd]]
    if not starts or not all(ok(*p) for p in starts):
        return False
    for gate in (False, True):
        seen = {starts[0]}
        q = [starts[0]]
        while q:
            c, r = q.pop()
            for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p = (c + dc, r + dr)
                if p not in seen and ok(*p, gate=gate):
                    seen.add(p); q.append(p)
        if not gate and not all(p in seen for p in starts):
            return False
        if gate:
            for r in range(10):
                for c in range(14):
                    ch = t[r][c]
                    if ch in 'kmp$yab?K' and (c, r + 1) not in seen:
                        return False
                    if ch == 'C' and (c == 0 or t[r][c - 1] != 'C') and (c, r + 1) not in seen:
                        return False
                    if ch in 'tw*' and not any((c + a, r + b) in seen for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                        return False
                    if ch == 'B' and (c, r - 1) not in seen:
                        return False
    if need_stairs:
        sp = [(c, r) for r in range(10) for c in range(14) if t[r][c] == '^']
        if not sp or (sp[0][0], sp[0][1] + 1) not in seen:
            return False
    return True


def generate(mid, theme, gate_code, plan=None):
    """Lay out a full-size dungeon as rooms on floors with their roles and doors (no tiles yet). With a wing plan
    there is no boss here: the last section ends at the stairs down (or up) into the story dungeon's own floor."""
    import random
    P = plan or PLANS[mid]
    wing = plan is not None
    tool = P.get('tool') or TOOL.get(mid, 'gap')
    R = random.Random('lv-' + mid)
    floors = P['floors']
    gw, gh = P['grid']
    N, NK = P['rooms'], P['keys']
    per = [N // len(floors) + (1 if i < N % len(floors) else 0) for i in range(len(floors))]
    rooms = []                    # dict(f, x, y, zone, role, parent, items)
    at = {}
    edges = []                    # (a, b, kind) room indices

    def add(f, x, y, zone, parent=None):
        rooms.append(dict(f=f, x=x, y=y, zone=zone, role=None, parent=parent, items=[], stairs=None, hole=None))
        at[(f, x, y)] = len(rooms) - 1
        return len(rooms) - 1

    def free_nb(i):
        r = rooms[i]
        out = []
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            x, y = r['x'] + dx, r['y'] + dy
            if 0 <= x < gw and 0 <= y < gh and (r['f'], x, y) not in at:
                if r['f'] == 0 and (x, y) == (gw // 2, gh - 1):
                    continue
                out.append((x, y))
        return out
    entry = add(0, gw // 2, gh - 1, 0)
    rooms[entry]['role'] = 'entry'
    zone = 0
    lock_at = [int(N * (k + 1) / (NK + 1.3)) for k in range(NK)]
    fl = 0
    count = [0] * len(floors)
    count[0] = 1
    locks = 0
    stair_rooms = set()
    while len(rooms) < N - 1:
        want_lock = locks < NK and len(rooms) >= lock_at[locks]
        if count[fl] >= per[fl] and fl + 1 < len(floors):
            # stairs: from a room of the newest zone on this floor to the same spot one floor on
            cands = [i for i, r in enumerate(rooms) if r['f'] == fl and r['zone'] == zone and i not in stair_rooms and r['role'] is None and (fl + 1, r['x'], r['y']) not in at]
            if not cands:
                cands = [i for i, r in enumerate(rooms) if r['f'] == fl and i not in stair_rooms and r['role'] is None and (fl + 1, r['x'], r['y']) not in at]
            i = cands[-1] if R.random() < 0.5 else R.choice(cands)
            j = add(fl + 1, rooms[i]['x'], rooms[i]['y'], rooms[i]['zone'], i)
            edges.append((i, j, 'stairs'))
            stair_rooms.update((i, j))
            fl += 1
            count[fl] += 1
            continue
        # grow: mostly from the newest rooms (long winding routes), sometimes from anywhere (side branches)
        pool = [i for i, r in enumerate(rooms) if r['f'] == fl and free_nb(i) and (r['zone'] == zone or not want_lock) and r['role'] != 'barrier']
        if want_lock:
            pool = [i for i in pool if rooms[i]['zone'] == zone and rooms[i]['role'] != 'entry']
        if not pool:
            if want_lock:
                pool = [i for i, r in enumerate(rooms) if r['f'] == fl and free_nb(i)]
                want_lock = False
            if not pool:
                raise RuntimeError('dungeon %s: floor %d is full' % (mid, fl))
        i = pool[-1] if R.random() < 0.55 else R.choice(pool[-6:]) if R.random() < 0.6 else R.choice(pool)
        x, y = R.choice(free_nb(i))
        if want_lock and locks + 1 == NK:
            # the last lock needs room for a straight corridor beyond it
            straight = [(a, (bx, by)) for a in pool for (bx, by) in free_nb(a)
                        if 0 <= 2 * bx - rooms[a]['x'] < gw and 0 <= 2 * by - rooms[a]['y'] < gh and (fl, 2 * bx - rooms[a]['x'], 2 * by - rooms[a]['y']) not in at
                        and not (fl == 0 and (2 * bx - rooms[a]['x'], 2 * by - rooms[a]['y']) == (gw // 2, gh - 1))]
            if straight:
                i, (x, y) = straight[-1] if R.random() < 0.5 else R.choice(straight)
            elif len(rooms) < N - 6:
                want_lock = False             # try again a little later
        if want_lock:
            zone += 1; locks += 1
            j = add(fl, x, y, zone, i)
            edges.append((i, j, 'locked'))
            dx, dy = x - rooms[i]['x'], y - rooms[i]['y']
            nx, ny = x + dx, y + dy
            if locks == NK and tool and 0 <= nx < gw and 0 <= ny < gh and (fl, nx, ny) not in at:
                # the last lock opens on a corridor the dungeon's tool must get you across
                rooms[j]['role'] = 'barrier'; rooms[j]['axis'] = 'v' if dy else 'h'
                j2 = add(fl, nx, ny, zone, j)
                edges.append((j, j2, 'open'))
                count[fl] += 1
        else:
            j = add(fl, x, y, rooms[i]['zone'], i)
            edges.append((i, j, 'open'))
        count[fl] += 1
    last = len(floors) - 1
    if wing:
        return finish_wing(locals())
    # the boss: past the Big Key door, on the last floor, off a room of the last zone
    cands = [i for i, r in enumerate(rooms) if r['f'] == last and r['zone'] == zone and free_nb(i) and r['role'] != 'entry']
    if not cands:
        cands = [i for i, r in enumerate(rooms) if r['f'] == last and free_nb(i)]
    i = cands[-1]
    x, y = R.choice(free_nb(i))
    boss = add(last, x, y, zone + 1, i)
    rooms[boss]['role'] = 'boss'
    edges.append((i, boss, 'big'))
    stair_rooms_set = stair_rooms
    children = {}
    for (a, b, k) in edges:
        children.setdefault(a, []).append(b)
    leaf = lambda i: not children.get(i) and i not in stair_rooms_set and rooms[i]['role'] is None
    plain = lambda i: i not in stair_rooms_set and rooms[i]['role'] is None

    def pick(cond, prefer_leaf=True):
        c = [i for i in range(len(rooms)) if cond(i) and (leaf(i) if prefer_leaf else plain(i))]
        if not c and prefer_leaf:
            c = [i for i in range(len(rooms)) if cond(i) and plain(i)]
        return R.choice(c) if c else None
    # distances through the dungeon, to put keys off the beaten path (far from where their section starts)
    nbr = {}
    for (a, b, k) in edges:
        nbr.setdefault(a, []).append(b); nbr.setdefault(b, []).append(a)

    def dist_from(src):
        d = {src: 0}
        q = [src]
        while q:
            u = q.pop(0)
            for v in nbr.get(u, []):
                if v not in d:
                    d[v] = d[u] + 1; q.append(v)
        return d
    zone_start = {0: entry}
    for (a, b, k) in edges:
        if k == 'locked':
            zone_start[rooms[b]['zone']] = b
    for z in range(locks):
        d = dist_from(zone_start.get(z, entry))
        c = [i for i in range(len(rooms)) if rooms[i]['zone'] == z and plain(i)]
        if not c:
            c = [i for i in range(len(rooms)) if rooms[i]['zone'] == z and rooms[i]['role'] is None]
        assert c, (mid, 'no room for key', z)
        far = max(d.get(i, 0) for i in c)
        k = R.choice([i for i in c if d.get(i, 0) >= far - 1])
        rooms[k]['role'] = 'key'
    mz = max(0, zone - 1) if mid in TOOL or zone >= 2 else zone
    mini = pick(lambda i: rooms[i]['zone'] == mz) or pick(lambda i: rooms[i]['zone'] >= mz - 1)
    rooms[mini]['role'] = 'mini'
    big = pick(lambda i: rooms[i]['zone'] == mz) or pick(lambda i: rooms[i]['zone'] <= mz) or pick(lambda i: True)
    rooms[big]['role'] = 'big'
    mp = pick(lambda i: rooms[i]['zone'] <= 1, prefer_leaf=False)
    if mp is not None:
        rooms[mp]['role'] = 'map'
    cp = pick(lambda i: 1 <= rooms[i]['zone'] <= 2, prefer_leaf=False) or pick(lambda i: True, prefer_leaf=False)
    if cp is not None:
        rooms[cp]['role'] = 'compass'
    if theme == 'swamp':
        sw = pick(lambda i: rooms[i]['zone'] == 0, prefer_leaf=False)
        if sw is not None:
            rooms[sw]['role'] = 'switch'
    # side rooms: vaults behind cracked walls and behind the item gate
    extras = [('secret', 'crack')] * (2 + N // 25) + ([('gate', 'open')] if gate_code is not None else [])
    for role, kind in extras:
        c = [i for i, r in enumerate(rooms) if free_nb(i) and r['role'] not in ('boss', 'barrier') and i != entry]
        if not c:
            continue
        i = R.choice(c)
        x, y = R.choice(free_nb(i))
        j = add(rooms[i]['f'], x, y, rooms[i]['zone'], i)
        rooms[j]['role'] = role
        edges.append((i, j, kind))
    # loops: extra doors between neighbouring rooms of the same section, so routes cross and double back
    linked = {(min(a, b), max(a, b)) for (a, b, k) in edges}
    nolink = ('boss', 'gate', 'secret', 'barrier')
    for i, r in enumerate(rooms):
        for dx, dy in ((1, 0), (0, 1)):
            j = at.get((r['f'], r['x'] + dx, r['y'] + dy))
            if j is None or (min(i, j), max(i, j)) in linked or rooms[j]['zone'] != r['zone']:
                continue
            if r['role'] in nolink or rooms[j]['role'] in nolink or R.random() > 0.3:
                continue
            edges.append((i, j, 'open')); linked.add((min(i, j), max(i, j)))
    # a second staircase between floors where two rooms of the same section sit one above the other
    for i, r in enumerate(rooms):
        if i in stair_rooms or r['role'] is not None:
            continue
        for j, s2 in enumerate(rooms):
            if j <= i or j in stair_rooms or s2['role'] is not None or (s2['x'], s2['y']) != (r['x'], r['y']) or s2['zone'] != r['zone']:
                continue
            if abs(FLOOR_NO(floors[s2['f']]) - FLOOR_NO(floors[r['f']])) == 1 and R.random() < 0.5:
                edges.append((i, j, 'stairs')); stair_rooms.update((i, j))
                break
    # spare keys tucked in a side vault in the bigger dungeons (more keys than locks, as in ALttP's later palaces)
    secrets = [i for i, r in enumerate(rooms) if r['role'] == 'secret']
    if N >= 40 and secrets:
        rooms[secrets[0]]['spare'] = True
    # crystal-switch rooms (blue and orange blocks), dark rooms
    for i, r in enumerate(rooms):
        if r['role'] is None and i not in stair_rooms and R.random() < 0.12:
            r['role'] = 'crystal'
    for i, r in enumerate(rooms):
        if r['role'] in (None, 'key', 'map', 'compass', 'crystal', 'puzzle') and R.random() < (0.22 if theme in ('forest', 'thieves') or mid in ('olddepths', 'barrow') else 0.12):
            r['dark'] = True
    # puzzle shutters on some ordinary doors: solve the room to go on
    for n, (a, b, k) in enumerate(edges):
        if k == 'open' and rooms[a]['role'] is None and a not in stair_rooms and rooms[b]['role'] not in ('gate', 'barrier') and R.random() < 0.28:
            edges[n] = (a, b, 'shut')
            rooms[a]['role'] = 'puzzle'
    # holes: from a plain room down to the room right below it, when that room is no further into the dungeon
    for i, r in enumerate(rooms):
        if r['role'] is None and i not in stair_rooms and r['f'] > 0:
            below = [j for j, s in enumerate(rooms) if FLOOR_NO(floors[s['f']]) == FLOOR_NO(floors[r['f']]) - 1 and (s['x'], s['y']) == (r['x'], r['y'])]
            if below and rooms[below[0]]['zone'] <= r['zone'] and rooms[below[0]]['role'] not in ('boss', 'gate', 'secret') and R.random() < 0.45:
                r['role'] = 'hole'
                r['hole'] = below[0]
    return dict(rooms=rooms, edges=edges, floors=floors, grid=(gw, gh), entry=entry, stairs=stair_rooms, zones=zone)


def finish_wing(v):
    """A wing's roles: keys off the path, the stairs into the story floor at the far end, vaults, puzzles, crystals, dark rooms."""
    rooms, edges, R, entry, floors, locks, zone, stair_rooms, at = v['rooms'], v['edges'], v['R'], v['entry'], v['floors'], v['locks'], v['zone'], v['stair_rooms'], v['at']
    free_nb, add, gate_code, N, theme, last = v['free_nb'], v['add'], v['gate_code'], v['N'], v['theme'], v['last']
    gw, gh = v['gw'], v['gh']
    nbr = {}
    for (a, b, k) in edges:
        nbr.setdefault(a, []).append(b); nbr.setdefault(b, []).append(a)

    def dist_from(src):
        d = {src: 0}
        q = [src]
        while q:
            u = q.pop(0)
            for w in nbr.get(u, []):
                if w not in d:
                    d[w] = d[u] + 1; q.append(w)
        return d
    plain = lambda i: i not in stair_rooms and rooms[i]['role'] is None
    zone_start = {0: entry}
    for (a, b, k) in edges:
        if k == 'locked':
            zone_start[rooms[b]['zone']] = b
    # the way on into the story floor: as far into the last section as it goes, on the last floor
    d = dist_from(zone_start.get(zone, entry))
    c = [i for i in range(len(rooms)) if rooms[i]['zone'] == zone and rooms[i]['f'] == last and plain(i)] or \
        [i for i in range(len(rooms)) if rooms[i]['f'] == last and plain(i)]
    core = max(c, key=lambda i: d.get(i, 0))
    rooms[core]['role'] = 'core'
    stair_rooms.add(core)
    for z in range(locks):
        d = dist_from(zone_start.get(z, entry))
        c = [i for i in range(len(rooms)) if rooms[i]['zone'] == z and plain(i)] or [i for i in range(len(rooms)) if rooms[i]['zone'] == z and rooms[i]['role'] is None]
        assert c, ('no room for key', z)
        far = max(d.get(i, 0) for i in c)
        rooms[R.choice([i for i in c if d.get(i, 0) >= far - 1])]['role'] = 'key'
    if theme == 'swamp':
        c = [i for i in range(len(rooms)) if rooms[i]['zone'] == 0 and plain(i)]
        if c:
            rooms[R.choice(c)]['role'] = 'switch'
    extras = [('secret', 'crack')] * (2 + N // 25) + ([('gate', 'open')] if gate_code is not None else [])
    for role, kind in extras:
        c = [i for i, r in enumerate(rooms) if free_nb(i) and r['role'] not in ('barrier', 'core') and i != entry]
        if not c:
            continue
        i = R.choice(c)
        x, y = R.choice(free_nb(i))
        j = add(rooms[i]['f'], x, y, rooms[i]['zone'], i)
        rooms[j]['role'] = role
        edges.append((i, j, kind))
    linked = {(min(a, b), max(a, b)) for (a, b, k) in edges}
    for i, r in enumerate(rooms):
        for dx, dy in ((1, 0), (0, 1)):
            j = at.get((r['f'], r['x'] + dx, r['y'] + dy))
            if j is None or (min(i, j), max(i, j)) in linked or rooms[j]['zone'] != r['zone']:
                continue
            if r['role'] in ('gate', 'secret', 'barrier') or rooms[j]['role'] in ('gate', 'secret', 'barrier') or R.random() > 0.3:
                continue
            edges.append((i, j, 'open')); linked.add((min(i, j), max(i, j)))
    secrets = [i for i, r in enumerate(rooms) if r['role'] == 'secret']
    if N >= 40 and secrets:
        rooms[secrets[0]]['spare'] = True
    for i, r in enumerate(rooms):
        if r['role'] is None and i not in stair_rooms and R.random() < 0.12:
            r['role'] = 'crystal'
    for i, r in enumerate(rooms):
        if r['role'] in (None, 'key', 'crystal', 'puzzle') and R.random() < (0.22 if theme in ('forest', 'thieves') else 0.12):
            r['dark'] = True
    for n, (a, b, k) in enumerate(edges):
        if k == 'open' and rooms[a]['role'] is None and a not in stair_rooms and rooms[b]['role'] not in ('gate', 'barrier') and R.random() < 0.28:
            edges[n] = (a, b, 'shut')
            rooms[a]['role'] = 'puzzle'
    for i, r in enumerate(rooms):
        if r['role'] is None and i not in stair_rooms and r['f'] > 0:
            below = [j for j, s2 in enumerate(rooms) if FLOOR_NO(floors[s2['f']]) == FLOOR_NO(floors[r['f']]) - 1 and (s2['x'], s2['y']) == (r['x'], r['y'])]
            if below and rooms[below[0]]['zone'] <= r['zone'] and rooms[below[0]]['role'] not in ('gate', 'secret', 'barrier', 'core') and R.random() < 0.45:
                r['role'] = 'hole'
                r['hole'] = below[0]
    return dict(rooms=rooms, edges=edges, floors=floors, grid=(gw, gh), entry=entry, stairs=stair_rooms, zones=zone, core=core)


def build_full(M, mid, name, back, theme, item, crystal, mini, boss, gate, plan=None, core_map=None):
    import random
    S = SPECS.get(mid, {'rooms': {}})
    L = generate(mid, theme, gate, plan)
    wing = plan is not None
    R = random.Random('lv-rooms-' + mid)
    rooms, edges, floors = L['rooms'], L['edges'], L['floors']
    gw, gh = L['grid']
    ids = [mid + '_' + f.lower() if (wing or f != floors[0]) else mid for f in floors]
    tool = (plan or {}).get('tool') or TOOL.get(mid, 'gap')
    maps = []
    for fi, f in enumerate(floors):
        m = M.Map(ids[fi], gw * 16, gh * 14, name, indoor=True, music='dungeon')
        m.extra.update({'dungeon': mid, 'exit': [back[0], back[1], back[2]], 'boss': True, 'pendant': crystal, 'shadow': True, 'lava': [], 'flood': [], 'spill': [],
                        'floorName': f, 'floors': floors + ([plan['core']] if wing else []), 'floorIds': ids, 'stairs': [], 'drops': []})
        if wing:
            m.extra['boss'] = False; m.extra['wingOf'] = core_map.id; m.extra['shadow'] = core_map.extra.get('shadow', False)
        import balance
        tune = DIFF.get(mid, (0, 0, 'dungeon'))[2]
        cv = balance.CURVE.get(mid, {'hp': 2.0, 'dmg': 2.0, 'boss': 1.0})
        m.extra['tier'] = round(cv['hp'] * (1 + min(0.15, 0.04 * fi)), 2)          # a little tougher on each floor further in
        m.extra['dmgTier'] = round(cv['dmg'] * (1 + min(0.15, 0.04 * fi)), 2)
        m.extra['bossScale'] = cv['boss']
        m.music = 'd_' + tune
        m.extra['triggers'] = []
        for y in range(m.h):
            for x in range(m.w):
                m.put('ground', M.IN, 1, 1, x, y)
                m.col[y * m.w + x] = M.SOLID
        maps.append(m)
    # doors per room
    side = lambda a, b: 'e' if b['x'] > a['x'] else 'w' if b['x'] < a['x'] else 's' if b['y'] > a['y'] else 'n'
    sides = [set() for _ in rooms]
    sides[L['entry']].add('s')
    for (a, b, k) in edges:
        if k != 'stairs':
            sides[a].add(side(rooms[a], rooms[b])); sides[b].add(side(rooms[b], rooms[a]))
    # the dungeon's own drawings, by what they hold
    own = []
    for v in S['rooms'].values():
        own += v if isinstance(v[0], list) else [v]
    has = lambda t, ch: any(ch in r for r in t)
    clean = lambda t: [''.join('.' if ch in 'kmpKMXCS$yab=w' or (ch == 's') else ch for ch in r) for r in t]
    own_fill = [clean(t) for t in own if not has(t, 'X') and not has(t, 'M') and not has(t, 'g') and not has(t, '=') and not has(t, 'w') and not has(t, 't')]
    fills = LIB_FILL + [mirror(t) for t in LIB_FILL]

    def choose(i):
        r = rooms[i]
        sd = sides[i]
        role = r['role']
        need = i in L['stairs']
        cands = []
        if role == 'entry':
            cands = [t for t in own if has(t, 'S')] + [LIB_ENTRY]
        elif role == 'boss':
            cands = [t for t in own if has(t, 'X')] + [BOSS]
        elif role == 'mini':
            cands = [t for t in own if has(t, 'M')] + [LIB_MINI, mirror(LIB_MINI)]
        elif role == 'big':
            cands = [t for t in own if has(t, 'C')] + [LIB_BIG]
        elif role == 'key':
            cands = [[row.replace('M', '.').replace('X', '.') for row in t] for t in own if has(t, 'k') and not has(t, '=') and not has(t, 'w')]
            cands = [t for t in cands if sum(row.count('k') for row in t) == 1]
            R.shuffle(cands)
            lib = LIB_KEY + [mirror(t) for t in LIB_KEY]
            R.shuffle(lib)
            cands += lib
            if need:
                pool = own_fill + fills
                R.shuffle(pool)
                cands = [[row.replace('?', 'k', 1) if '?' in row else row for row in t] for t in pool if has(t, '?')]
                cands = [[row.replace('?', '.') for row in t] for t in cands]
        elif role == 'gate':
            cands = [LIB_GATE[list(sd)[0]]]
        elif role == 'secret':
            if r.get('treasure'):
                return [row.replace('y', 'I') for row in LIB_SECRET]
            cands = [LIB_SECRET_KEY if r.get('spare') else LIB_SECRET]
        elif role == 'barrier':
            return BAR[(tool, r['axis'])]
        elif role == 'crystal':
            lib = LIB_CRYSTAL + [mirror(t) for t in LIB_CRYSTAL]
            R.shuffle(lib)
            cands = lib
        elif role == 'switch':
            cands = [LIB_SWITCH]
        elif role == 'puzzle':
            lib = LIB_PUZZLE + [mirror(t) for t in LIB_PUZZLE]
            R.shuffle(lib)
            cands = lib
        elif role == 'hole':
            lib = list(LIB_HOLE)
            R.shuffle(lib)
            cands = lib
        else:
            pool = own_fill + fills
            R.shuffle(pool)
            cands = [t for t in pool if has(t, '?')] if role in ('map', 'compass') else pool
        for t in cands:
            if fits(t, sd, theme, need_stairs=need):
                if role in ('map', 'compass'):
                    t = [row.replace('?', 'm' if role == 'map' else 'p', 1) if '?' in row else row for row in t]
                    done = False
                    t2 = []
                    for row in t:
                        if not done and ('m' in row or 'p' in row):
                            done = True
                            t2.append(row)
                        else:
                            t2.append(row.replace('m', '.').replace('p', '.') if done else row)
                    t = t2
                return t
        raise RuntimeError('no room drawing fits %s room %d (%s, doors %s, stairs %s)' % (mid, i, role, ''.join(sorted(sd)), need))
    sec = [r for r in rooms if r['role'] == 'secret' and not r.get('spare')]
    if mid in TREASURE and sec:
        sec[0]['treasure'] = True
    roster = ROSTER[theme]
    nzones = max(1, L['zones'])

    def foe(i):
        # deeper sections and lower (or higher) floors bring out the tougher kinds
        r = rooms[i]
        depth = min(1.0, 0.5 * r['zone'] / nzones + 0.5 * r['f'] / max(1, len(floors) - 1))
        n = max(3, min(len(roster), int(round(3 + depth * (len(roster) - 3)))))
        return R.choice(roster[:n]) if R.random() < 0.7 else roster[max(0, n - 3) + R.randrange(min(3, n))]
    plush = [mid == 'thievesden']
    marks = [dict() for _ in rooms]
    for i, r in enumerate(rooms):
        m = maps[r['f']]
        for y in range(r['y'] * 14, r['y'] * 14 + 14):
            for x in range(r['x'] * 16, r['x'] * 16 + 16):
                m.col[y * m.w + x] = M.OPEN
        M.room(m, r['x'], r['y'])
        r['area'] = len(m.areas) - 1
        t = choose(i)
        r['t'] = t
        X, Y = r['x'] * 16 + 1, r['y'] * 14 + 3
        mk = marks[i]
        skip = False
        enemies = 0
        for rr, row in enumerate(t):
            for c, ch in enumerate(row):
                x, y = X + c, Y + rr
                if skip:
                    skip = False
                    continue
                mk.setdefault(ch, []).append((x, y))
                idx = y * m.w + x
                if ch == '#':
                    m.col[idx] = M.SOLID; m.put('ground', M.IN, 1, 1, x, y)
                elif ch == '~':
                    if theme == 'turtle':
                        m.col[idx] = M.PIT; m.extra['lava'].append(idx)
                    elif theme == 'swamp':
                        m.extra['flood'].append(idx)
                    elif theme == 'ice':
                        m.col[idx] = M.DEEP
                    else:
                        m.col[idx] = M.PIT; m.put('ground', M.CV, 1, 1, x, y)
                elif ch in 'o_':
                    m.col[idx] = M.PIT; m.put('ground', M.CV, 1, 1, x, y)
                elif ch == 'u':
                    m.col[idx] = CBLUE
                elif ch == 'v':
                    m.col[idx] = CORANGE
                elif ch == '*':
                    m.col[idx] = CRYSTAL
                elif ch == '=':
                    m.extra['spill'].append(idx)
                elif ch == 'w':
                    m.solid(x, y, 1, 1, M.SWITCH)
                elif ch == 'B':
                    m.solid(x, y, 1, 1, M.BLOCK)
                elif ch == 'P':
                    m.solid(x, y, 1, 1, M.PLATE); m.extra.setdefault('plates', []).append([x, y])
                elif ch == 't':
                    m.solid(x, y, 1, 1, M.TORCH)
                elif ch == 'L':
                    m.solid(x, y, 1, 1, M.TORCH_LIT)
                elif ch == 'g':
                    m.solid(x, y, 1, 1, gate if gate is not None else M.SOLID)
                elif ch == 'r':
                    M.rocks(m, [(x, y)])
                elif ch == 'c':
                    m.solid(x, y, 1, 1, M.CRACK)
                elif ch == 's':
                    m.solid(x, y, 1, 1, M.SHUTTER)
                elif ch == '^':
                    if i in L['stairs']:
                        mk['stair'] = (x, y)
                elif ch == 'I':
                    m.chest(x, y, TREASURE[mid])
                elif ch in 'kmp$yab':
                    if r['role'] == 'gate':
                        m.extra.setdefault('later', []).append('%d,%d' % (x, y))
                    it = {'k': 'key', 'm': 'map', 'p': 'compass', '$': 'cash100', 'y': 'cash50', 'b': 'bombs', 'a': 'arrows'}[ch]
                    if ch == 'a' and plush[0]:
                        it = 'plushie'; plush[0] = False
                    m.chest(x, y, it)
                elif ch == 'C':
                    M.bigchest(m, x, y, item)
                    skip = True
                elif ch == 'K':
                    m.chests['%d,%d' % (x, y)] = {'item': 'bigkey', 'big': False}
                    m.extra.setdefault('reveal', {})['mini'] = [[x, y]]
                    mk['bigkey'] = (x, y)
                elif ch == 'e':
                    m.spawn(foe(i), x, y); enemies += 1
                elif ch == 'M':
                    m.spawn(mini, x, y)
                elif ch == 'X':
                    m.spawn(boss, x, y)
                elif ch == 'S':
                    mk['sign'] = (x, y)
        # more company in the ordinary rooms
        if r['role'] in (None, 'map', 'compass', 'hole', 'switch') and enemies < 2:
            spots = [(X + c, Y + rr) for rr in range(1, 9) for c in range(1, 13) if t[rr][c] == '.' and c not in (6, 7) and rr not in (4, 5)]
            for (x, y) in R.sample(spots, min(len(spots), R.choice((1, 2, 2, 3)))):
                m.spawn(foe(i), x, y)
        # traps: blades in the corners that slide when you line up with them, fire-spitting statues
        if r['role'] in (None, 'map', 'compass', 'crystal') and i not in L['stairs'] and R.random() < 0.16:
            corners = [(c, rr) for (c, rr) in ((1, 1), (12, 1), (1, 8), (12, 8)) if t[rr][c] == '.']
            kind = 'turret' if theme in ('turtle', 'thieves') and R.random() < 0.5 else 'blade'
            for (c, rr) in (corners if kind == 'blade' else corners[:2]):
                m.spawn(kind, X + c, Y + rr)
    # doors
    for (a, b, k) in edges:
        A, B = rooms[a], rooms[b]
        if k == 'stairs':
            ma, mb = maps[A['f']], maps[B['f']]
            sa, sb = marks[a]['stair'], marks[b]['stair']
            up = FLOOR_NO(floors[B['f']]) > FLOOR_NO(floors[A['f']])
            ma.warp(sa[0], sa[1], mb.id, sb[0], sb[1] + 1, 2); ma.extra['stairs'].append([sa[0], sa[1], 1 if up else 0])
            mb.warp(sb[0], sb[1], ma.id, sa[0], sa[1] + 1, 2); mb.extra['stairs'].append([sb[0], sb[1], 0 if up else 1])
            continue
        m = maps[A['f']]
        sa, sb = side(A, B), side(B, A)
        if k == 'open':
            M.door(m, A['x'], A['y'], sa); M.door(m, B['x'], B['y'], sb)
        elif k == 'locked':
            M.door(m, A['x'], A['y'], sa, M.LOCKED); M.door(m, B['x'], B['y'], sb, M.LOCKED)
        elif k == 'big':
            M.door(m, A['x'], A['y'], sa, M.BIGLOCK); M.door(m, B['x'], B['y'], sb, M.BIGLOCK)
        elif k == 'shut':
            M.door(m, A['x'], A['y'], sa, M.SHUTTER, 'r%d' % a); M.door(m, B['x'], B['y'], sb)
        elif k == 'crack':
            M.door(m, A['x'], A['y'], sa); M.door(m, B['x'], B['y'], sb)
            X, Y = A['x'] * 16, A['y'] * 14
            for (x, y) in {'n': [(X + 7, Y + 2), (X + 8, Y + 2)], 's': [(X + 7, Y + 13), (X + 8, Y + 13)], 'w': [(X, Y + 7), (X, Y + 8)], 'e': [(X + 15, Y + 7), (X + 15, Y + 8)]}[sa]:
                m.solid(x, y, 1, 1, M.CRACK)
    shut_from = {a for (a, b, k) in edges if k == 'shut'}
    if tool == 'wand':
        for n, (a, b, k) in enumerate(edges):
            if rooms[a]['role'] == 'barrier' and k == 'open':
                A, B = rooms[a], rooms[b]
                m = maps[A['f']]
                M.door(m, A['x'], A['y'], side(A, B), M.SHUTTER, 'r%d' % a)
                shut_from.add(a)
    # the way in
    E = rooms[L['entry']]
    m0 = maps[E['f']]
    X, Y = E['x'] * 16, E['y'] * 14
    M.door(m0, E['x'], E['y'], 's')
    for x in (7, 8):
        m0.warp(X + x, Y + 13, back[0], back[1], back[2], 2)
    m0.entry = [X + 7, Y + 11]
    # puzzles
    used = set()
    for i, r in enumerate(rooms):
        m = maps[r['f']]
        mk = marks[i]
        if mk.get('s') or i in shut_from:
            g = 'r%d' % i
            for (x, y) in mk.get('s', []):
                m.extra.setdefault('shutters', {}).setdefault(g, []).append([x, y])
            if mk.get('t'):
                m.extra['triggers'].append({'type': 'torches', 'at': [list(p) for p in mk['t']], 'open': g}); used.add('torches')
            elif mk.get('P'):
                m.extra['triggers'].append({'type': 'plate', 'at': [list(p) for p in mk['P']], 'open': g}); used.add('plate')
            else:
                if not any(s['x'] // 16 == r['x'] and s['y'] // 14 == r['y'] for s in m.spawns):
                    x, y = r['x'] * 16 + 4, r['y'] * 14 + 6
                    m.spawn(roster[0], x, y)
                m.extra['triggers'].append({'type': 'clear', 'area': r['area'], 'open': g}); used.add('clear')
        if r['role'] == 'mini':
            m.extra['triggers'].append({'type': 'clear', 'area': r['area'], 'open': 'mini'})
        if r.get('dark'):
            m.extra.setdefault('darkAreas', []).append(r['area'])
        if r['role'] == 'barrier':
            m.extra['barrier'] = [r['x'] * 16, r['y'] * 14, r['axis'], tool]
        if r['role'] == 'hole':
            B = rooms[r['hole']]
            mb = maps[B['f']]
            # land on open floor near the middle of the room below
            cx, cy = B['x'] * 16 + 8, B['y'] * 14 + 8
            best = min(((abs(x - cx) + abs(y - cy), x, y) for y in range(B['y'] * 14 + 3, B['y'] * 14 + 13) for x in range(B['x'] * 16 + 1, B['x'] * 16 + 15)
                        if B['t'][y - B['y'] * 14 - 3][x - B['x'] * 16 - 1] == '.'))
            m.extra['drops'].append([r['x'] * 16, r['y'] * 14, 16, 14, mb.id, best[1], best[2]])
    used.add('stairs')
    if any(r['role'] == 'crystal' for r in rooms):
        used.add('crystal')
    if any(r.get('dark') for r in rooms):
        used.add('dark')
    used.add('tool')
    if any(m.extra['flood'] for m in maps):
        used.add('switch')
    if any(k == 'crack' for (_, _, k) in edges):
        used.add('crack')
    tool_hint = {'gate': 'The way to the master is barred to all but the treasure of this place.', 'wand': 'The last door answers to weight. Bring your own.',
                 'bombs': 'The last passage was walled up in a hurry. Bombs disagree.', 'gap': 'The last chasm is crossed by hook, not by foot.'}[tool]
    hints = dict(HINTS, stairs='Stairs lead up and down; holes in the floor lead down, and only down.', crystal='Strike a crystal and the blue and orange blocks trade places.',
                 dark='Some rooms are black as pitch. Bring a light.', tool=tool_hint)
    sx, sy = marks[L['entry']]['sign']
    M.signboard(m0, sx, sy, name.upper() + '|' + ' '.join(hints[p] for p in ('stairs', 'dark', 'torches', 'plate', 'crystal', 'clear', 'switch', 'crack', 'tool') if p in used) + (' The way down to the old halls lies at the far end.' if wing else ' The Big Key opens the way to the master of this place.'))
    import blend as _B
    for m in maps:
        for y in range(m.h):
            for x in range(m.w):
                c = m.col[y * m.w + x]
                if c in (M.PIT, M.DEEP) and y * m.w + x not in m.extra['lava']:
                    k = _B.mask(lambda a, b: m.ok(a, b) and m.col[b * m.w + a] == c and b * m.w + a not in m.extra['lava'], x, y)
                    m.put('ground', M.BL, k & 15, (8 if c == M.PIT else 7) * 16 + (k >> 4), x, y)
        m.extra['floor'] = {'forest': (12, 7), 'swamp': (13, 8), 'ice': (1, 1), 'turtle': (1, 7), 'thieves': None}[theme]
        m.entry = m.entry if m is m0 else None
        if not m.spawns or m.entry is None:
            pass
    if wing:
        # the far end: stairs into the story dungeon's own floor, and its old door out leads back up these stairs
        C = rooms[L['core']]
        mc = maps[C['f']]
        sx, sy = marks[L['core']]['stair']
        down = FLOOR_NO(plan['core']) < FLOOR_NO(floors[C['f']])
        mc.warp(sx, sy, core_map.id, core_map.entry[0], core_map.entry[1], 0)
        mc.extra['stairs'].append([sx, sy, 0 if down else 1])
        mc.extra['coreStairs'] = [sx, sy]
        for w in core_map.warps:
            if w['y'] == core_map.h - 1:
                w['to'], w['tx'], w['ty'], w['dir'] = mc.id, sx, sy + 1, 2
        core_map.extra.update({'floorName': plan['core'], 'floors': floors + [plan['core']], 'floorIds': ids + [core_map.id]})
    for m in maps[1:]:
        st = m.extra['stairs'][0]
        m.entry = [st[0], st[1] + 1]
    check_full(M, maps, m0)
    if wing:
        return maps
    m0.floors = maps[1:]
    m0.extra['rooms'] = len(rooms)
    return m0


def check_full(M, maps, m0):
    """Every chest, door, torch, block and switch on every floor is reachable from the way in (stairs and holes
    followed; doors, gates and both water levels counted as passable), and the boss is there."""
    byid = {m.id: m for m in maps}
    walk = {M.OPEN, M.PLATE, M.SHUTTER, M.LOCKED, M.BIGLOCK, M.CRACK, M.PEG, M.DARKROCK, CBLUE, CORANGE}
    targets = {M.TORCH, M.TORCH_LIT, M.BLOCK, M.BIGCHEST, M.SWITCH, M.POST}
    seen = set()
    q = [(m0.id, m0.entry[0], m0.entry[1])]
    seen.add(q[0])
    while q:
        mid, x, y = q.pop()
        m = byid[mid]
        for w in m.warps:
            if (w['x'], w['y']) == (x, y) and w['to'] in byid:
                p = (w['to'], w['tx'], w['ty'])
                if p not in seen:
                    seen.add(p); q.append(p)
        for d in m.extra['drops']:
            if d[0] <= x < d[0] + d[2] and d[1] <= y < d[1] + d[3]:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if m.ok(x + dx, y + dy) and m.col[(y + dy) * m.w + x + dx] == M.PIT:
                        p = (d[4], d[5], d[6])
                        if p not in seen:
                            seen.add(p); q.append(p)
        wet = set(m.extra['flood']) | set(m.extra['spill'])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):        # the Grapple: up to 7 tiles over gaps to a hook target
            for n in range(1, 8):
                X, Y = x + dx * n, y + dy * n
                if not m.ok(X, Y):
                    break
                c = m.col[Y * m.w + X]
                if c in targets or ('%d,%d' % (X, Y)) in m.chests:
                    p = (mid, X - dx, Y - dy)
                    if n > 1 and p not in seen and m.col[(Y - dy) * m.w + X - dx] == M.OPEN:
                        seen.add(p); q.append(p)
                    break
                if c not in (M.PIT, M.DEEP, M.OPEN, M.PLATE):
                    break
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Y = x + dx, y + dy
            if m.ok(X, Y) and (m.col[Y * m.w + X] in walk or Y * m.w + X in wet) and (mid, X, Y) not in seen:
                seen.add((mid, X, Y)); q.append((mid, X, Y))
    bad = []
    for m in maps:
        S = lambda x, y: (m.id, x, y) in seen
        for k in m.chests:
            x, y = map(int, k.split(','))
            if not S(x, y + 1):
                bad.append((m.id, 'chest', k, m.chests[k]['item']))
        for y in range(m.h):
            for x in range(m.w):
                c = m.col[y * m.w + x]
                if c in (M.LOCKED, M.BIGLOCK, M.SHUTTER, M.CRACK) and not S(x, y):
                    bad.append((m.id, 'door', x, y))
                if c in (M.BLOCK, M.SWITCH, M.TORCH, CRYSTAL) and not any(S(x + a, y + b) for a, b in ((0, -1), (0, 1), (1, 0), (-1, 0))):
                    bad.append((m.id, 'thing', x, y))
        for w in m.warps:
            if not S(w['x'], w['y']):
                bad.append((m.id, 'stairs', w['x'], w['y']))
    assert not bad, bad[:12]
