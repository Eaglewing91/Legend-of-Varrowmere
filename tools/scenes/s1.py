from lib import *
S=Scene()
for y in range(14):
  for x in range(16): S.t(OW,(x*3+y)%2,9 if (x+y)%5 else 31,x,y)
for y in range(0,14):
  S.t(OW,8,23 if y%2 else 24,7,y); S.t(OW,9,23 if y%2 else 24,8,y)
S.t(OW,4,9,0,-1,4,6)          # forest
S.t(OW,4,9,12,9,4,6)
S.t(OW,6,0,10,1,5,5)          # house
S.t(OW,22,9,2,9,3,3)          # fountain
for x in range(10,16): S.t(OW,3,17,x,7)
S.t(OW,30,0,4,5,2,2)          # crates
S.t(OW,33,0,5,7,2,2)          # barrels
S.t(OW,28,4,9,10,3,2)         # bench
S.t(OW,34,2,9,8,2,1)          # sign board
for p in [(10,9),(11,9),(5,12),(6,11),(1,7),(14,6)]: S.t(OW,1,8,p[0],p[1])
S.t(OW,32,1,13,6)             # potted plant
hero(S,7*16+8,7*16,(0,0))
logmon(S,10*16,11*16+4,0,0)
S.hud()
S.save('/tmp/claude-0/-home-claude/46644d5e-7e21-553c-af9d-160c0ecc8433/scratchpad/shot1.png')
