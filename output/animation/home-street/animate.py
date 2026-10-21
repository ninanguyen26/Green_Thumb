"""Build the approved home street's calm, eight-second seamless animation."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'assets/background'
W, H = 1560, 720  # exact 19.5:9
N = 128
base = Image.open(OUT / 'home-street-clean-v1.png').convert('RGB').resize((W,H), Image.Resampling.LANCZOS)
# Coordinates below refer to the 1844 x 853 art preview. Only foliage bends;
# the localized displacement returns smoothly to zero before nearby architecture.
sx, sy = W/1844, H/853
zones = [
    (85,805,210,155,3.7,0.0), (1760,805,210,155,3.7,1.1),
    (497,562,67,78,2.5,.3), (564,613,43,50,2.2,1.0),
    (1230,591,67,57,2.4,1.4), (1323,606,59,59,2.7,2.1),
    (896,613,55,43,1.7,.6), (1040,635,49,48,1.7,1.8),
    (414,571,46,56,1.8,2.6), (1436,566,45,57,1.8,.9),
]
step=16
rects=[]
quads=[]
for y in range(0,H,step):
    for x in range(0,W,step):
        r=min(W,x+step); b=min(H,y+step)
        rects.append((x,y,r,b))
        quads.append([(x,y),(x,b),(r,b),(r,y)])
points=np.asarray(quads,dtype=float)
weights=[]
for cx,cy,rx,ry,amp,offset in zones:
    radial=((points[:,:,0]-cx*sx)/(rx*sx))**2+((points[:,:,1]-cy*sy)/(ry*sy))**2
    weight=np.maximum(0,1-radial)**2
    weights.append((weight,amp*sx,offset))

def butterfly(phase):
    # A small continuous looping flight; wings flutter independently.
    x=(1065+170*math.cos(phase))*sx
    y=(530+50*math.sin(2*phase)+18*math.sin(phase))*sy
    scale=3
    tile=Image.new('RGBA',(90,90))
    d=ImageDraw.Draw(tile)
    cx=cy=45
    spread=3+7*(.5+.5*math.sin(24*phase))
    ink=(113,83,51,255); gold=(247,198,91,255); cream=(255,231,158,255)
    for side in [-1,1]:
        a=cx+side*spread*scale
        d.ellipse((min(cx,a),cy-9*scale,max(cx,a),cy+2*scale), fill=gold,outline=ink,width=2)
        d.ellipse((min(cx,a*.0+cx+side*spread*.7*scale),cy,max(cx,cx+side*spread*.7*scale),cy+7*scale),fill=cream,outline=ink,width=2)
    d.line((cx,cy-5*scale,cx,cy+6*scale),fill=ink,width=4)
    d.line((cx,cy-4*scale,cx-3*scale,cy-9*scale),fill=ink,width=2)
    d.line((cx,cy-4*scale,cx+3*scale,cy-9*scale),fill=ink,width=2)
    tile=tile.rotate(-12*math.sin(phase),resample=Image.Resampling.BICUBIC).resize((30,30),Image.Resampling.LANCZOS)
    return tile, (round(x-15),round(y-15))

def frame(phase):
    phase %= 2 * math.pi
    p=points.copy()
    for weight,amp,offset in weights:
        bend=math.sin(2*phase+offset)
        p[:,:,0]+=weight*amp*bend
        p[:,:,1]+=weight*amp*.18*math.sin(2*phase+offset+.4)
    mesh=[(r,tuple(q.flatten())) for r,q in zip(rects,p)]
    im=base.transform((W,H),Image.Transform.MESH,mesh,Image.Resampling.BICUBIC)
    wing,pos=butterfly(phase)
    im.paste(wing,pos,wing)
    return im

frames=[frame(2*math.pi*i/N) for i in range(N)]
assert np.array_equal(np.asarray(frames[0]),np.asarray(frame(2*math.pi))), 'Loop must close exactly'
# One shared palette prevents color flicker between frames.
samples=Image.new('RGB',(W,H*4))
for j,k in enumerate([0,31,65,97]): samples.paste(frames[k],(0,H*j))
palette=samples.quantize(colors=256,method=Image.Quantize.MEDIANCUT)
indexed=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
durations=[70 if i%4==3 else 60 for i in range(N)]
gif=OUT / 'home-street-animated.gif'
indexed[0].save(gif,save_all=True,append_images=indexed[1:],duration=durations,loop=0,optimize=True,disposal=1)
# WebP preserves the painted colors for engines/viewers that support it.
webp=OUT / 'home-street-animated.webp'
frames[0].save(webp,save_all=True,append_images=frames[1:],duration=durations,loop=0,quality=90,method=4)
check=Image.open(gif)
assert check.size==(1560,720) and check.n_frames==N
assert sum((check.seek(i) or check.info['duration']) for i in range(N))==8000
# The full central roof remains exactly stationary.
a=np.asarray(frames[0]); b=np.asarray(frames[43])
assert np.array_equal(a[80:300,500:1100], b[80:300,500:1100])
for path in [gif,webp]: print(f'{path}: {path.stat().st_size/1024/1024:.2f} MB')
print('Verified: 1560 x 720, 128 frames, 8 seconds, infinite loop; exact loop closure; steady roof.')
