"""Difficulty curve. Each dungeon in the order the adventure leads you through them, with the sword and armour you'll
most likely carry in. From that, the numbers that keep fights steady as you grow stronger:
  foe hit points   a typical foe takes about 1.5 hits at the start, rising to 3.5 at the end
  foe damage       a typical foe would need about 10 hits to finish you at the start, 7 at the end, before armour;
                   armour then earns back about a third of its cut, so the Blue and Red Mail still clearly pay off
  boss hit points  bosses take about 8 hits at the start, 16 at the end (fewer for tail-only or dazed-only ones)
Hearts: 3 to start, about one Heart Container per dungeon and the Heart Shards spread along the way, up to 20."""

STAGES = [  # dungeon, sword power, armour (damage taken x)
    ('ruins1', 1, 1.0), ('shrine', 1, 1.0), ('forge', 2, 1.0), ('olddepths', 2, 1.0), ('barrow', 2, 1.0), ('brambletemple', 2, 1.0),
    ('castle', 3, 1.0), ('vault', 3, 1.0), ('quarry', 3, 0.75), ('bonehollow', 3, 0.75), ('thievesden', 3, 0.75), ('frostmere', 3, 0.75),
    ('mirefen', 3, 0.5), ('turtleback', 3, 0.5), ('stormspire', 3, 0.25), ('mirrortemple', 3, 0.25), ('glassspire', 3, 0.25),
    ('keep', 3, 0.25), ('arcadevault', 3, 0.25)]
# bosses a weapon can wear down (others fall to bombs, the Grapple or a reflected orb): total hit points, how hard to land a hit
BOSS_HP = {'olddepths': 14, 'barrow': 14, 'brambletemple': 16, 'stormspire': 14, 'mirrortemple': 16, 'glassspire': 12, 'arcadevault': 22,
           'ruins1': 18, 'forge': 6, 'vault': 12, 'bonehollow': 16, 'thievesden': 12, 'frostmere': 8}
HARD = {'forge': 0.6, 'frostmere': 0.6, 'bonehollow': 0.75, 'olddepths': 0.8, 'stormspire': 0.8, 'arcadevault': 0.9}
WEAPON = {'glassspire': 2}     # the Glass Eye only takes arrows and bombs
MED_HP, MED_DMG = 3.0, 2.5     # a typical foe


def curve():
    out, n = {}, len(STAGES)
    for i, (d, blade, armour) in enumerate(STAGES):
        p = i / (n - 1)
        hearts = min(20, 3 + i + round(6 * p))
        hp = max(1.0, round((1.5 + 2.0 * p) * blade / MED_HP, 2))
        dmg = max(1.0, round((hearts * 4 / (10 - 3 * p)) / (MED_DMG * armour ** 0.35), 2))
        w = WEAPON.get(d, blade)
        boss = max(1.0, round((8 + 8 * p) * HARD.get(d, 1) * w / BOSS_HP[d], 2)) if d in BOSS_HP else 1.0
        out[d] = dict(hp=hp, dmg=dmg, boss=boss, hearts=hearts, blade=blade, armour=armour,
                      foe_hits=round(MED_HP * hp / blade, 1), hits_to_die=round(hearts * 4 / max(1, MED_DMG * dmg * armour), 1),
                      boss_hits=round(BOSS_HP[d] * boss / w, 1) if d in BOSS_HP else None)
    return out


CURVE = curve()

if __name__ == '__main__':
    for d, v in CURVE.items():
        print(d, v)
