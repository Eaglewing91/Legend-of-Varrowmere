"""Build Legend of Varrowmere.

python3 build.py          -> build/Legend-of-Varrowmere.user.js (the userscript) and build/dev.html (a test page)
Art sheets are embedded as base64 PNG; maps come from tools/maps.py.
"""
import base64, glob, json, os, subprocess

VERSION = '0.26.0'
os.makedirs('build', exist_ok=True)
subprocess.run(['python3', 'tools/maps.py'], check=True)
subprocess.run(['python3', 'tools/patch_sheets.py'], check=True)

ART = {'overworld': 'generated/Overworld.png', 'inner': 'generated/Inner.png', 'cave': 'generated/cave.png', 'objects': 'generated/objects.png', 'hero': 'pack-armm1998/character.png', 'log': 'pack-armm1998/log.png', 'na': 'ninja-adventure/monsters.png', 'nafloor': 'ninja-adventure/TilesetFloor.png', 'nanature': 'ninja-adventure/TilesetNature.png', 'blend': 'generated/blend.png', 'nawater': 'ninja-adventure/TilesetWater.png', 'nahouse': 'ninja-adventure/TilesetHouse.png', 'narelief': 'ninja-adventure/TilesetRelief.png', 'naelem': 'ninja-adventure/TilesetElement.png', 'nadetail': 'ninja-adventure/TilesetFloorDetail.png', 'nainfloor': 'ninja-adventure/TilesetInteriorFloor.png', 'nadungeon': 'ninja-adventure/TilesetDungeon.png', 'lava': 'generated/lava.png', 'landmarks': 'generated/landmarks.png', 'dwall': 'generated/dwall.png', 'dfloor': 'generated/dfloor.png'}
for f in sorted(glob.glob('art/ninja-adventure/items/*.png')):
    ART['it_' + os.path.basename(f)[:-4]] = f[4:]
for f in sorted(glob.glob('art/ninja-adventure/ui/*.png')):
    ART['ui_' + os.path.basename(f)[:-4]] = f[4:]
for f in sorted(glob.glob('art/ninja-adventure/anim/*.png')):
    ART['an_' + os.path.basename(f)[:-4]] = f[4:]
for f in sorted(glob.glob('art/ninja-adventure/monsters/*.png')):
    ART['m_' + os.path.basename(f)[:-4].lower()] = f[4:]
for f in sorted(glob.glob('art/ninja-adventure/bosses/*.png')):
    ART['b_' + os.path.basename(f)[:-4]] = f[4:]
for f in sorted(glob.glob('art/ninja-adventure/hero/*.png')):
    ART['h_' + os.path.basename(f)[:-4]] = f[4:]
for f in sorted(glob.glob('art/ninja-adventure/chars/*.png')):
    n = os.path.basename(f)[:-4]
    ART[('cf_' + n[:-5]) if n.endswith('_face') else ('c_' + n)] = f[4:]
for f in sorted(glob.glob('art/ninja-adventure/fx/*.png')):
    ART['fx_' + os.path.basename(f)[:-4]] = f[4:]
art = {k: base64.b64encode(open('art/' + f, 'rb').read()).decode() for k, f in ART.items()}

snd = {os.path.basename(f)[:-4]: base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob('art/ninja-adventure/sfx/*.mp3'))}
mus = {os.path.basename(f)[:-4]: base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob('art/ninja-adventure/music/*.ogg'))}
import sys as _s; _s.path.insert(0, 'tools'); import worldplan as _P
plan = {'towns': {k.replace(' (city)', ''): v for k, v in _P.TOWNS.items()},
        'regions': {r[0]: [r[1] + r[3] / 2, r[2] + r[4] / 2] for r in _P.REGIONS.values()}}
src = '\n'.join(open(f).read() for f in sorted(glob.glob('src/*.js')))
maps = open('src/data/maps.json').read()
unrle = "(function () { const un = function (a) { const o = []; for (let i = 0; i < a.length; i += 2) for (let k = 0; k < a[i + 1]; k++) o.push(a[i]); return o; }; Object.values(LV.MAPS).forEach(function (d) { if (!d.rle) return; Object.keys(d.layers).forEach(function (k) { d.layers[k] = un(d.layers[k]); }); d.col = un(d.col); delete d.rle; }); })();"
body = src + '\nLV.MAPS = ' + maps + ';\n' + unrle + '\nLV.ART = ' + json.dumps(art) + ';\nLV.SOUNDS = ' + json.dumps(snd) + ';\nLV.MUSIC = ' + json.dumps(mus) + ';\nLV.WORLDPLAN = ' + json.dumps(plan) + ';\n'

header = f"""// ==UserScript==
// @name         Legend of Varrowmere
// @namespace    eaglewing.legend-of-varrowmere
// @version      {VERSION}
// @description  A top-down action-adventure in the style of the 16-bit classics. Opens in its own window over the Torn page; makes no requests.
// @author       Eaglewing [571041]
// @match        https://www.torn.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==
/* Art: "Zelda-like tilesets and sprites" by ArMM1998 (OpenGameArt, CC0); monsters, bosses, terrain and sound effects from "Ninja Adventure" by Pixel-boy and AAA (CC0). Everything else (c) Eaglewing [571041], all rights reserved. */
"""
launcher = """
(function () {
  if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('Play Legend of Varrowmere', function () { LV.loadArt().then(function () { LV.open({ title: true }); }); });
})();
"""
open('build/Legend-of-Varrowmere.user.js', 'w').write(header + '(function () {\n' + body + launcher + '\n})();\n')

dev = """<!doctype html><html><head><meta charset="utf-8"><title>Legend of Varrowmere - dev</title><style>body{margin:0;background:#000}</style></head><body>
<script>""" + body + """
window.LV = LV;
LV.loadArt().then(function () { LV.open({ noClose: true, muted: /mute/.test(location.hash), store: LV.memoryStore(), title: /title/.test(location.hash), stores: [0, 1, 2].map(function () { return LV.memoryStore(); }) }); window.ready = true; });
</script></body></html>"""
open('build/dev.html', 'w').write(dev)
print('built', os.path.getsize('build/Legend-of-Varrowmere.user.js'), 'bytes')
