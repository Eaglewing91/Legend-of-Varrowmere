"""Build Legend of Varrowmere.

python3 build.py          -> build/Legend-of-Varrowmere.user.js (the userscript) and build/dev.html (a test page)
Art sheets are embedded as base64 PNG; maps come from tools/maps.py.
"""
import base64, glob, json, os, subprocess

VERSION = '1.0.6'
os.makedirs('build', exist_ok=True)
subprocess.run(['python3', 'tools/maps.py'], check=True)
subprocess.run(['python3', 'tools/patch_sheets.py'], check=True)
subprocess.run(['python3', 'tools/manaseed.py'], check=True)   # townsfolk from Mana Seed (private art; skipped when absent)

ART = {'overworld': 'generated/Overworld.png', 'inner': 'generated/Inner.png', 'cave': 'generated/cave.png', 'objects': 'generated/objects.png', 'hero': 'pack-armm1998/character.png', 'log': 'pack-armm1998/log.png', 'na': 'ninja-adventure/monsters.png', 'nafloor': 'ninja-adventure/TilesetFloor.png', 'nanature': 'ninja-adventure/TilesetNature.png', 'blend': 'generated/blend.png', 'nawater': 'ninja-adventure/TilesetWater.png', 'nahouse': 'ninja-adventure/TilesetHouse.png', 'narelief': 'ninja-adventure/TilesetRelief.png', 'naelem': 'ninja-adventure/TilesetElement.png', 'nadetail': 'ninja-adventure/TilesetFloorDetail.png', 'nainfloor': 'ninja-adventure/TilesetInteriorFloor.png', 'nadungeon': 'ninja-adventure/TilesetDungeon.png', 'lava': 'generated/lava.png', 'landmarks': 'generated/landmarks.png', 'dwall': 'generated/dwall.png', 'dfloor': 'generated/dfloor.png'}
for f in sorted(glob.glob('art/ninja-adventure/skill/*.png')):
    ART['sk_' + os.path.basename(f)[:-4]] = f[4:]
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
# Mana Seed townsfolk (licensed to the author; the art lives outside the repo and only ships inside the built script)
MS = None
if os.path.exists('art/private/ms_people.png'):
    ART['ms_people'] = 'private/ms_people.png'; MS = json.load(open('art/private/ms_people.json'))
if MS and os.path.exists('art/private/ms_hero.png'):
    ART['ms_hero'] = 'private/ms_hero.png'; MS['hero'] = json.load(open('art/private/ms_hero.json'))
for _n in ('soldier', 'archer', 'vex', 'queen'):
    if MS and os.path.exists('art/private/ms_' + _n + '.png'):
        ART['ms_' + _n] = 'private/ms_' + _n + '.png'; MS[_n] = json.load(open('art/private/ms_' + _n + '.json'))
# with the Mana Seed people built in, their old Ninja Adventure sheets and faces aren't needed: leave them out
if MS:
    for _k in [k for k in ART if (k.startswith('c_') or k.startswith('cf_')) and k.split('_', 1)[1] in MS['names']]: del ART[_k]
def lossless_png(path):
    """Re-save a PNG as small as possible without changing a single pixel (exact palette when there are 256
    colours or fewer, best zlib settings). Checked pixel-for-pixel; the original bytes are kept if anything differs."""
    import io
    from PIL import Image
    raw = open(path, 'rb').read()
    try:
        im = Image.open(io.BytesIO(raw)); im.load(); rgba = im.convert('RGBA')
        best = raw
        cands = []
        cols = rgba.getcolors(256)
        if cols is not None:
            pal = Image.new('P', rgba.size)
            lut = {c: i for i, (_, c) in enumerate(cols)}
            pal.putdata([lut[p] for p in rgba.getdata()])
            flat = []
            for (_, c) in cols:
                flat += list(c[:3])
            pal.putpalette(flat + [0] * (768 - len(flat)))
            pal.info['transparency'] = bytes(c[3] for (_, c) in cols)
            cands.append(pal)
        cands.append(rgba)
        for c in cands:
            b = io.BytesIO(); c.save(b, 'PNG', optimize=True, transparency=c.info.get('transparency')) if c.mode == 'P' else c.save(b, 'PNG', optimize=True)
            data = b.getvalue()
            if len(data) < len(best) and list(Image.open(io.BytesIO(data)).convert('RGBA').getdata()) == list(rgba.getdata()):
                best = data
        return best
    except Exception:
        return raw


os.makedirs('build/.png', exist_ok=True)
def packed_png(f):
    src_path = 'art/' + f
    cache = 'build/.png/' + f.replace('/', '__')
    if not os.path.exists(cache) or os.path.getmtime(cache) < os.path.getmtime(src_path):
        open(cache, 'wb').write(lossless_png(src_path))
    return open(cache, 'rb').read()
art = {k: base64.b64encode(packed_png(f)).decode() for k, f in ART.items()}

snd = {os.path.basename(f)[:-4]: base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob('art/ninja-adventure/sfx/*.mp3'))}
mus = {os.path.basename(f)[:-4]: base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob('art/ninja-adventure/music/*.ogg'))}
import sys as _s; _s.path.insert(0, 'tools'); import worldplan as _P
plan = {'towns': {k.replace(' (city)', ''): v for k, v in _P.TOWNS.items()},
        'regions': {r[0]: [r[1] + r[3] / 2, r[2] + r[4] / 2] for r in _P.REGIONS.values()}}
src = '\n'.join(open(f).read() for f in sorted(glob.glob('src/*.js')))
maps = open('src/data/maps.json').read()
import gzip
maps_gz = base64.b64encode(gzip.compress(maps.encode(), 9, mtime=0)).decode()
# The whole game sits inside one function that only runs when you open it. A Torn page with the script installed
# just reads the data as plain text (fast) and adds the menu entry: no game code runs, nothing is unpacked, no images
# are decoded until you press Play.
unrle = "const un = function (a) { const o = new Array(0); for (let i = 0; i < a.length; i += 2) { const v = a[i]; for (let k = a[i + 1]; k > 0; k--) o.push(v); } return o; }; Object.values(LV.MAPS).forEach(function (d) { if (!d.rle) return; Object.keys(d.layers).forEach(function (k) { d.layers[k] = un(d.layers[k]); }); d.col = un(d.col); delete d.rle; });"
data = ('let DATA = null;\n// the data lives inside a function too, so a page that never opens the game never builds it\nfunction loadData() { return DATA || (DATA = { maps: ' + json.dumps(maps_gz) + ',\n art: ' + json.dumps(art) + ',\n sounds: ' + json.dumps(snd)
        + ',\n plan: ' + json.dumps(plan) + ',\n ms: ' + json.dumps(MS) + ' }); }\n')
engine = 'function engine(MAPS) {\n' + src + '\nLV.MAPS = MAPS;\n' + unrle + '\nLV.ART = DATA.art; LV.SOUNDS = DATA.sounds; LV.MUSIC = MUSIC(); LV.WORLDPLAN = DATA.plan; LV.MS = DATA.ms;\nreturn LV;\n}\n'
boot = """let booting = null;
// The music lives in the two separate Legend of Varrowmere - Soundtrack scripts (so each script stays under 2 MB). They hand the
// tracks over through one page event when the game starts. Without them the game plays its own synthesised tunes.
let music = null, LV_ = null;
document.addEventListener('varrowmere-music', function (e) { try { const m = JSON.parse(e.detail); if (m && typeof m === 'object') music = Object.assign(music || {}, m); } catch (x) {} if (music && LV_) LV_.MUSIC = music; });
function MUSIC() { if (!music) document.dispatchEvent(new CustomEvent('varrowmere-music:request')); return music || {}; }

// unpack the maps (gzip, with the browser's own decompressor) and start the engine, once
function boot() {
  if (booting) return booting;
  booting = (async function () {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old to run Legend of Varrowmere (it needs DecompressionStream). Please update it.');
    loadData();
    const bin = atob(DATA.maps), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    return (LV_ = engine(JSON.parse(text)));
  })();
  booting.catch(function (e) { booting = null; alert(e.message); });
  return booting;
}
"""
body = data + engine + boot

header = f"""// ==UserScript==
// @name         Legend of Varrowmere
// @namespace    eaglewing.legend-of-varrowmere
// @version      {VERSION}
// @description  A top-down action-adventure in the style of the 16-bit classics, for Torn. Opens in its own window over the Torn page (from the Torn Arcade phone or the Tampermonkey menu). Makes no requests.
// @author       Eaglewing [571041]
// @copyright    2026, Eaglewing [571041]. All rights reserved.
// @license      All Rights Reserved - for use on Torn (torn.com) only; no copying, modifying, redistribution or use elsewhere (see LICENCE)
// @homepageURL  https://github.com/Eaglewing91/Legend-of-Varrowmere
// @updateURL    https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere.user.js
// @downloadURL  https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere.user.js
// @match        https://www.torn.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==
/*
 * LEGEND OF VARROWMERE by Eaglewing [571041]
 * Licence: all rights reserved, for use on Torn only (full text: LICENCE in the GitHub repo). Third-party art and
 * sound are CC0: "Zelda-like tilesets and sprites" by ArMM1998 (OpenGameArt) and "Ninja Adventure" by Pixel-boy and
 * AAA. Townspeople: "Mana Seed" by Seliel the Shaper, used under licence with permission (not CC0; don't
 * extract or reuse it). Torn's own names and material belong to Torn's owners. Unofficial fan project, not affiliated with Torn.
 *
 * HOW IT WORKS
 * - The whole game is inside this script. Pages where you don't play only add a Tampermonkey menu entry and listen
 *   for Torn Arcade: nothing is unpacked, drawn or run until you press Play.
 * - It never reads, clicks or changes Torn's page, makes no network requests of any kind, uses no API key and
 *   no websockets. Every picture and sound is built into the script (the music is in the two optional Soundtrack scripts).
 * - Your three save files are kept in Tampermonkey storage on your device.
 * - Torn Arcade link (page events only): 'varrowmere:ping' / 'varrowmere:here' (is it installed? version, Soundtrack
 *   versions, leaderboard numbers), 'varrowmere:open' (you tapped Play: the game opens inside the phone), 'varrowmere:close' (you left it), 'varrowmere:closed' and 'varrowmere:scores'
 *   (total playtime, completion and monsters defeated, for the Arcade's leaderboards; only sent on by the Arcade if
 *   you turned on its optional Online play).
 *
 * TERMS OF SERVICE
 * | Data Storage          | Only locally (your save files and leaderboard numbers, in Tampermonkey storage) |
 * | Data Sharing          | Nobody (the game sends nothing; Torn Arcade's optional Online play can submit    |
 * |                       | your leaderboard numbers to its leaderboards, under the Arcade's own terms)      |
 * | Purpose of Use        | Public amusement                                                                 |
 * | Key Storage & Sharing | Not stored / Not shared (no API key is used)                                     |
 * | Key Access Level      | None (no API key needed)                                                         |
 */
"""
launcher = """
// unpack the game and decode its art, once; both Play and a preload share the same work
let readying = null;
const ready = function () { return readying || (readying = boot().then(function (LV) { return LV.loadArt().then(function () { return LV; }); }).catch(function (e) { readying = null; throw e; })); };
const play = function (parent, pad, muted) { return ready().then(function (LV) { LV.open({ title: true, parent: parent || null, pad: pad, muted: muted }); }); };
if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('Play Legend of Varrowmere', function () { play(); });
// Torn Arcade link: the two scripts talk through page events (no requests, nothing shared but these three messages).
//   Arcade sends 'varrowmere:ping'  -> this script answers 'varrowmere:here' { version, music }   (so the phone can show the app;
//                                      music / music2 are the Soundtrack parts' versions, or '' when not installed; scores
//                                      are the leaderboard numbers saved when the game last closed: { time, completion, kills })
//   When the game window closes it also sends 'varrowmere:scores' with those numbers.
//   Arcade sends 'varrowmere:open'  -> the game opens; when it closes, 'varrowmere:closed' goes back
document.addEventListener('varrowmere:ping', function () { document.dispatchEvent(new CustomEvent('varrowmere:here', { detail: JSON.stringify({ version: '""" + VERSION + """', music: document.documentElement.dataset.varrowmereMusic || '', music2: document.documentElement.dataset.varrowmereMusic2 || '', scores: (function () { try { return JSON.parse(GM_getValue('lv_scores', 'null')); } catch (e) { return null; } })() }) })); });
//   Arcade sends 'varrowmere:preload' (only if you turned on Preload Legend) -> the game unpacks itself when the page is idle
document.addEventListener('varrowmere:preload', function () { const go = function () { ready().catch(function () {}); }; if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 500); });
//   (with detail { host: id } the game opens inside that element on the page, i.e. inside the phone, instead of over the page)
//   Arcade sends 'varrowmere:close' -> the game closes (and saves), as when you leave it on the phone
document.addEventListener('varrowmere:open', function (e) {
  let host = null, pad, muted; try { const d = JSON.parse(e.detail || 'null'); if (d && typeof d.host === 'string') host = document.getElementById(d.host); if (d && typeof d.pad === 'boolean') pad = d.pad; if (d && typeof d.muted === 'boolean') muted = d.muted; } catch (x) {}
  play(host, pad, muted).then(function () { document.documentElement.dataset.varrowmereOpen = '1'; });
});
//   Arcade sends 'varrowmere:mute' { muted } -> sound and music off or on (the phone's speaker button)
document.addEventListener('varrowmere:mute', function (e) { let m = false; try { m = !!JSON.parse(e.detail).muted; } catch (x) {} if (readying) readying.then(function (LV) { if (LV.setMuted) LV.setMuted(m); }); });
//   Arcade sends 'varrowmere:pad' { on } -> the touch pad turns on or off (the phone's 🎮 button)
document.addEventListener('varrowmere:pad', function (e) { let on = false; try { on = !!JSON.parse(e.detail).on; } catch (x) {} if (readying) readying.then(function (LV) { if (LV.setPad) LV.setPad(on); }); });
document.addEventListener('varrowmere:close', function () { if (readying) readying.then(function (LV) { if (LV.root && LV.root.style.display !== 'none') LV.close(); }); });
document.documentElement.dataset.varrowmere = '""" + VERSION + """';
"""
open('build/Legend-of-Varrowmere.user.js', 'w').write(header + '(function () {\n' + body + launcher + '\n})();\n')

dev = """<!doctype html><html><head><meta charset="utf-8"><title>Legend of Varrowmere - dev</title><style>body{margin:0;background:#000}</style></head><body>
<script>""" + body + """
boot().then(function (LV) { window.LV = LV; return LV.loadArt().then(function () { LV.open({ noClose: true, muted: /mute/.test(location.hash), store: LV.memoryStore(), title: /title/.test(location.hash), stores: [0, 1, 2].map(function () { return LV.memoryStore(); }) }); window.ready = true; }); });
</script></body></html>"""
open('build/dev.html', 'w').write(dev)
# The soundtrack comes in two parts so each script stays under 2 MB at good quality (Opus, 36 kbps).
PARTS = [(1, ['title', 'village', 'home', 'boss'], 'Legend-of-Varrowmere-Soundtrack.user.js', 'the title, towns, fields and boss fights'),
         (2, ['shadow', 'dungeon', 'cave', 'ending'], 'Legend-of-Varrowmere-Soundtrack-2.user.js', 'the Shadow world, dungeons, caves and the ending')]
for part, keys, fname, what in PARTS:
    url = 'https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/' + fname
    snd_header = f"""// ==UserScript==
// @name         Legend of Varrowmere - Soundtrack{' Part 2' if part == 2 else ''}
// @namespace    eaglewing.legend-of-varrowmere
// @version      {VERSION}
// @description  Optional music for Legend of Varrowmere, part {part} of 2: {what}. Hands the tracks to the game when it starts; makes no requests and stores nothing.
// @author       Eaglewing [571041]
// @match        https://www.torn.com/*
// @updateURL    {url}
// @downloadURL  {url}
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==
/* Music from "Ninja Adventure" by Pixel-boy and AAA (CC0). Packaging (c) Eaglewing [571041], all rights reserved;
   for use on Torn only (see LICENCE in the GitHub repo). Part {part} of 2 of the soundtrack.
   This script makes no requests and needs no API key. It only answers the game's 'varrowmere-music:request' page
   event with one 'varrowmere-music' event carrying its tracks.
   TERMS OF SERVICE
   | Data Storage          | No                          |
   | Data Sharing          | Nobody                      |
   | Purpose of Use        | Public amusement            |
   | Key Storage & Sharing | Not stored / Not shared     |
   | Key Access Level      | None (no API key needed)    |
*/
"""
    sub = {k: mus[k] for k in keys}
    snd_body = """(function () {
  // the tracks sit inside a function, so a page that never starts the game never builds them
  let payload = null;
  function tracks() { return """ + json.dumps(sub) + """; }
  document.addEventListener('varrowmere-music:request', function () { if (!payload) payload = JSON.stringify(tracks()); document.dispatchEvent(new CustomEvent('varrowmere-music', { detail: payload })); });
  document.documentElement.dataset.varrowmereMusic""" + ('' if part == 1 else '2') + """ = '""" + VERSION + """';
})();
"""
    open('build/' + fname, 'w').write(snd_header + snd_body)
    print('soundtrack part', part, os.path.getsize('build/' + fname), 'bytes')
print('built', os.path.getsize('build/Legend-of-Varrowmere.user.js'), 'bytes')
