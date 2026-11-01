"""Add the openings tests/screens.js found leading nowhere (tests/screens-dead.json) to tools/seals.json, so the
next build walls them. Hand-built areas are fixed in tools/maps.py instead (their tiles are never walled here).
Run: node tests/screens.js; python3 tools/seals.py; python3 build.py   (repeat until screens OK)"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
SET = {'whisperwood', 'highlands', 'riverhead', 'grove', 'meadow', 'marrowgate', 'willowfen', 'willowfen_s'}
seals = set(map(tuple, json.load(open(os.path.join(here, 'seals.json'))))) if os.path.exists(os.path.join(here, 'seals.json')) else set()
n = 0
for d in json.load(open(os.path.join(here, '..', 'tests', 'screens-dead.json'))):
    if d['map'].replace('s_', '', 1) in SET:
        continue
    for (ax, ay, bx, by) in d['run']:
        for t in [((ax, ay), (bx, by))[d.get('side', 0)]]:      # wall the dead-end side only
            if t not in seals:
                seals.add(t); n += 1
json.dump(sorted(seals), open(os.path.join(here, 'seals.json'), 'w'))
print('seals: %d new, %d in all' % (n, len(seals)))
