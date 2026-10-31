from lib import *
S=Scene()
for y in range(14):
  for x in range(16): S.t(OW,(x*3+y)%2,9 if (x+y)%5 else 31,x,y)
for y in range(5,14): S.t(OW,8,23 if y%2 else 24,7,y); S.t(OW,9,23 if y%2 else 24,8,y)
S.t(OW,0,22,1,0,3,6)        # round tower
S.t(OW,0,22,12,0,3,6)
S.t(OW,4,31,6,2,4,3)        # castle gate
for x in (4,5,10,11): S.t(OW,5,29,x,3,1,2)  # banners
S.t(OW,8,31,3,5,2,2); S.t(OW,8,31,11,5,2,2)  # statues
S.t(OW,14,28,2,9,2,1); S.t(OW,16,28,12,9,2,1)  # cannons
S.t(OW,0,13,0,11,4,3); S.t(OW,0,13,12,11,4,3)  # hedges
for p in [(5,9),(10,10),(3,7),(13,7)]: S.t(OW,1,8,p[0],p[1])
hero(S,7*16+8,8*16,(0,2))
logmon(S,10*16,8*16-8,0,2)
S.hud(full=6)
S.save('/tmp/claude-0/-home-claude/46644d5e-7e21-553c-af9d-160c0ecc8433/scratchpad/shot3.png')
