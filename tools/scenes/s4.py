from lib import *
S=Scene()
for y in range(14):
  for x in range(16): S.t(OW,(x*3+y)%2,9 if (x*5+y*3)%7 else 31,x,y)
# lake along the bottom (bordered water)
S.nine(OW,2,6,-1,11,16,14)
# tree line framing the top, with a gap for the road north
for x0 in (-2,2,10,14): S.t(OW,4,9,x0,-3,4,5)
# main road from the north gap down to the lake, with a jetty
for y in range(0,11): S.t(OW,8,23 if y%2 else 24,7,y); S.t(OW,9,23 if y%2 else 24,8,y)
S.t(OW,6,6,7,11,2,3)
# Wren's house (left) with a path from its door to the road
S.t(OW,6,0,1,2,5,5)
for x in range(3,7): S.t(OW,8,23,x,7)
# the market stall (right) facing the road
S.t(OW,18,22,10,2,5,6)
# fenced flower garden beside the house, by the lake
for x in range(1,6): S.t(OW,3,17,x,9)
for x in (1,2,3,4,5): S.t(OW,1,8,x,10)
# fountain on the village green, benches and barrels by the stall
S.t(OW,22,9,11,8,3,3)
S.t(OW,33,0,14,6,2,2)
S.t(OW,34,2,9,5,2,1)
hero(S,7*16+8,5*16+8,(0,0))
S.hud(full=6)
S.save('/tmp/claude-0/-home-claude/46644d5e-7e21-553c-af9d-160c0ecc8433/scratchpad/shot4.png')
