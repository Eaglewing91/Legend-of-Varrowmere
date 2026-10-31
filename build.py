"""Build Legend of Varrowmere.

python3 build.py          -> build/Legend-of-Varrowmere.user.js (the userscript) and build/dev.html (a test page)
Art sheets are embedded as base64 PNG; maps come from tools/maps.py.
"""
import base64, glob, json, os, subprocess

VERSION = '0.12.0'
os.makedirs('build', exist_ok=True)
subprocess.run(['python3', 'tools/maps.py'], check=True)

ART = {'overworld': 'pack-armm1998/Overworld.png', 'inner': 'pack-armm1998/Inner.png', 'cave': 'pack-armm1998/cave.png', 'objects': 'pack-armm1998/objects.png', 'hero': 'pack-armm1998/character.png', 'log': 'pack-armm1998/log.png', 'na': 'ninja-adventure/monsters.png'}
art = {k: base64.b64encode(open('art/' + f, 'rb').read()).decode() for k, f in ART.items()}

src = '\n'.join(open(f).read() for f in sorted(glob.glob('src/*.js')))
maps = open('src/data/maps.json').read()
body = src + '\nLV.MAPS = ' + maps + ';\nLV.ART = ' + json.dumps(art) + ';\n'

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
/* Art: "Zelda-like tilesets and sprites" by ArMM1998 (OpenGameArt, CC0); squid and spirit monsters from "Ninja Adventure" by Pixel-boy and AAA (CC0). Everything else (c) Eaglewing [571041], all rights reserved. */
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
