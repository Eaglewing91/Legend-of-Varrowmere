from PIL import Image, ImageDraw
G='x/gfx/'
OW=Image.open(G+'Overworld.png').convert('RGBA'); CH=Image.open(G+'character.png').convert('RGBA'); OB=Image.open(G+'objects.png').convert('RGBA')
IN=Image.open(G+'Inner.png').convert('RGBA'); CV=Image.open(G+'cave.png').convert('RGBA'); LOG=Image.open(G+'log.png').convert('RGBA'); NPC=Image.open(G+'NPC_test.png').convert('RGBA')
class Scene:
  def __init__(s,w=16,h=14,bg=(0,0,0,255)): s.img=Image.new('RGBA',(w*16,h*16),bg); s.w=w; s.h=h
  def t(s,src,tx,ty,x,y,w=1,h=1): s.img.alpha_composite(src.crop((tx*16,ty*16,(tx+w)*16,(ty+h)*16)),(int(x*16),int(y*16)))
  def px(s,src,box,x,y): s.img.alpha_composite(src.crop(box),(int(x),int(y)))
  def fill(s,src,tx,ty,x0,y0,x1,y1):
    for y in range(y0,y1+1):
      for x in range(x0,x1+1): s.t(src,tx,ty,x,y)
  def nine(s,src,tx,ty,x0,y0,x1,y1):  # 3x3 nine-slice starting at (tx,ty)
    for y in range(y0,y1+1):
      for x in range(x0,x1+1):
        cx=0 if x==x0 else 2 if x==x1 else 1; cy=0 if y==y0 else 2 if y==y1 else 1; s.t(src,tx+cx,ty+cy,x,y)
  def shadow(s,x,y,w=12):
    d=ImageDraw.Draw(s.img,'RGBA'); d.ellipse([x-w/2,y-2,x+w/2,y+2],fill=(0,0,0,70))
  def hud(s,hearts=6,full=4.5,rup=487,bombs=8,arrows=24,keys=2):
    d=ImageDraw.Draw(s.img)
    # energy meter
    d.rectangle([7,7,15,40],fill=(16,16,24)); d.rectangle([8,8,14,39],fill=(240,240,240)); d.rectangle([9,9,13,38],fill=(16,16,24)); d.rectangle([9,20,13,38],fill=(60,190,80)); d.rectangle([9,20,10,38],fill=(130,240,140))
    # item box with bow-ish item from objects (use chest icon fallback)
    d.rectangle([19,7,40,28],fill=(240,240,240)); d.rectangle([20,8,39,27],fill=(24,24,36)); d.rectangle([19,7,40,28],outline=(16,16,24))
    s.img.alpha_composite(OB.crop((0,0,16,16)),(22,10))
    # counters: small icons + numbers in a pixel font
    def num(x,y,txt):
      d.text((x+1,y+1),txt,fill=(0,0,0)); d.text((x,y),txt,fill=(255,255,255))
    s.img.alpha_composite(OB.crop((16,64,32,80)).resize((10,10),Image.NEAREST),(48,8)); num(46,20,'%03d'%rup)
    d.rectangle([78,10,85,17],fill=(40,60,150),outline=(10,10,20)); d.point((82,9),fill=(200,170,120)); num(76,20,'%02d'%bombs)
    d.line([(98,14),(108,14)],fill=(200,160,100)); d.polygon([(108,12),(111,14),(108,16)],fill=(230,230,230)); num(98,20,'%02d'%arrows)
    d.rectangle([122,9,125,12],fill=(230,190,60)); d.line([(123,13),(123,18)],fill=(230,190,60)); d.point((124,16),fill=(230,190,60)); num(120,20,'%d'%keys)
    # LIFE + hearts (drawn small, original layout)
    d.text((171,4),'- LIFE -',fill=(0,0,0)); d.text((170,3),'- LIFE -',fill=(250,80,80))
    H=['.oo.oo.','orrorro','orrrrro','.orrro.','..oro..','...o...']
    for i in range(hearts):
      hx=160+(i%10)*8; hy=16+(i//10)*8
      for j,r in enumerate(H):
        for k,c in enumerate(r):
          if c=='o': d.point((hx+k,hy+j),fill=(30,10,16))
          elif c=='r':
            filled = i+1<=full or (i<full and k<=3)
            d.point((hx+k,hy+j),fill=(232,40,56) if filled else (80,26,36))
  def save(s,path,scale=3): s.img.resize((s.img.width*scale,s.img.height*scale),Image.NEAREST).save(path)
def hero(sc,x,y,frame=(0,0)):  # frame=(col,row) in 16x32 cells
  sc.shadow(x+8,y+29,12); sc.px(CH,(frame[0]*16,frame[1]*32,frame[0]*16+16,frame[1]*32+32),x,y)
def logmon(sc,x,y,f=0,row=0): sc.shadow(x+16,y+28,16); sc.px(LOG,(f*32,row*32,f*32+32,row*32+32),x,y)
