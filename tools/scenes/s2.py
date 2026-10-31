from lib import *
from PIL import ImageDraw, ImageFilter
S=Scene()
S.fill(CV,0,0,0,0,15,13)
for x in range(16):            # north wall, 3 tiles tall
  for r in range(3): S.t(CV,1+(x%3),3+r,x,r)
S.nine(CV,1,0,9,5,12,8)        # pit
S.nine(CV,0,7,1,9,4,12)        # underground pool
for i,x in enumerate((5,6,9,10)): S.t(CV,6+i,0,x,0,1,3)   # statues against the wall
S.t(CV,5,4,12,10,2,2); S.t(CV,7,4,2,4,2,2); S.t(CV,6,3,14,4)  # boulders and rubble
S.px(OB,(0,0,16,16),7*16+8,10*16)                 # chest
for (x,y) in [(1,3),(14,3),(1,8),(14,8)]: S.t(CV,0,5,x,y,1,2)   # torches
S.shadow(8*16+8,7*16+13,12); S.px(CH,(64,128,96,160),7*16+16-8,6*16-6+12)
logmon(S,4*16,7*16,1,1); logmon(S,11*16,11*16-4,2,0)
# darkness with light round torches and the hero (the original's dark rooms)
dark=Image.new('L',S.img.size,150); d=ImageDraw.Draw(dark)
for (x,y,r) in [(1*16+8,4*16,42),(14*16+8,4*16,42),(1*16+8,9*16,42),(14*16+8,9*16,42),(8*16,7*16,56)]:
  for k in range(r,0,-2): d.ellipse([x-k,y-k,x+k,y+k],fill=int(150*k/r))
shade=Image.new('RGBA',S.img.size,(10,6,24,255)); shade.putalpha(dark)
S.img.alpha_composite(shade)
S.hud(full=3.5)
S.save('/tmp/claude-0/-home-claude/46644d5e-7e21-553c-af9d-160c0ecc8433/scratchpad/shot2.png')
