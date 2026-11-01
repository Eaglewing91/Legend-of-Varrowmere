"""Add the openings tests/screens.js found leading nowhere (tests/screens-dead.json) to tools/seals.json, so the
next build walls them. Hand-built areas are fixed in tools/maps.py instead (their tiles are never walled here).
Run: node tests/screens.js; python3 tools/seals.py; python3 build.py   (repeat until screens OK)"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
SET = {'whisperwood', 'highlands', 'riverhead', 'grove', 'meadow', 'marrowgate', 'willowfen', 'willowfen_s'}
seals = set(map(tuple, json.load(open(os.path.join(here, 'seals.json'))))) if os.path.exists(os.path.join(here, 'seals.json')) else set()
sp_ = os.path.join(here, 'seals_shadow.json')
shadow_seals = set(map(tuple, json.load(open(sp_)))) if os.path.exists(sp_) else set()
dead = json.load(open(os.path.join(here, '..', 'tests', 'screens-dead.json')))
light_dead = {tuple(map(tuple, d['run'])) for d in dead if not d['map'].startswith('s_')}
n = 0
for d in dead:
    if d['map'].replace('s_', '', 1) in SET:
        continue
    # a dead end only in the Shadow (the light world has something there): wall it in the Shadow map alone
    target = shadow_seals if d['map'].startswith('s_') and tuple(map(tuple, d['run'])) not in light_dead else seals
    for (ax, ay, bx, by) in d['run']:
        for t in [((ax, ay), (bx, by))[d.get('side', 0)]]:      # wall the dead-end side only
            if t not in target:
                target.add(t); n += 1
json.dump(sorted(seals), open(os.path.join(here, 'seals.json'), 'w'))
json.dump(sorted(shadow_seals), open(sp_, 'w'))
print('seals: %d new, %d in all, %d shadow only' % (n, len(seals), len(shadow_seals)))
