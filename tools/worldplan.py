"""The plan of the overworld: one continuous land of 20 x 22 screens (each screen 16 x 14 tiles), about 50% bigger than
the 1991 original's ~290 screens. Everything that builds the world reads this file, and tools/worldplan.py --png draws it.

BIOME is the land at screen resolution (one letter per screen):
  W woods   M mountain rock   S snow peaks   I icy lake shore   H heath (grass, rocks)   F fields   K castle lawns
  R marsh   D desert   G graveyard   L lake   C coast (sand, sea along the south)   T town lawns
SETPIECES are the hand-built areas, kept exactly as built, at their new place (screen x, y).
REGIONS are the generated areas (name, rect in screens, theme, area names); any screen left over is filled automatically.
RIVERS and ROADS are polylines in screen units (0.5 = middle of a screen).
"""

GW, GH = 20, 22
SW, SH = 16, 14

BIOME = [
    "WWWMMMSSSSSSSSSSSSSS",
    "WWWMMMSSSSSSSSSSSSSS",
    "WWWMMMSSSSSSSSSSSSSS",
    "WWWMMMMMHHHHHHIIIIII",
    "WWWMMMMMHHHHHHIIIIII",
    "WWWHHHHHHFFFTTIIIIII",
    "RRRHHHHHFFFFTTIIIIII",
    "RRRFFFFFFFFFFFIIIIII",
    "RRRFFFFFFKKKFFFFFFFF",
    "RRRFFFFFFKKKFFFFFFFF",
    "RRRFFFFFFKKKFFFFFFFF",
    "RRFFFFFFFFFFFFFFDDDD",
    "WWFFFFFFFFFFFFFDDDDD",
    "WWFFFFFFFFFFFFFDDDDD",
    "FFFFFFFFFFFFFFDDDDDD",
    "FFTTTTFFFFFFFFDDDDDD",
    "FFTTTTFFFFFFFFDDTDDD",
    "FFFFFFFFGGGGFFDDDDDD",
    "FFFFFFFFGGGGLLLLDDDD",
    "FFFFFFFFGGGGLLLLLDDD",
    "CCCCCCCCCCCCLLLLLCCC",
    "CCCCCCCCCCCCCCCCCCCC",
]

# hand-built areas: id -> (screen x, screen y); their size comes from the map itself
SETPIECES = {
    'whisperwood': (0, 0), 'highlands': (3, 3), 'riverhead': (9, 6), 'grove': (9, 8),
    'meadow': (9, 12), 'marrowgate': (2, 15), 'willowfen': (0, 7), 'willowfen_s': (0, 9),
}

# generated areas: id -> (name, x, y, w, h, theme, music, [area names])
REGIONS = {
    'northreach': ('Northreach Downs', 3, 0, 3, 3, 'foothills', 'village', ['Crag Field', 'Windy Rise', 'Shepherd Hill', 'South Downs', 'Old Mine Track', 'Cairn Top', 'Goat Path', 'Lookout', 'High Pasture']),
    'frostspire': ('Frostspire Peaks', 6, 0, 8, 3, 'snow', 'village', ['Hollis Ledge', 'Eagle Crag', 'Old Mine', 'Wind Gap', 'Ice Falls', 'Spire Foot', 'Snowfield', 'Frozen Pass']),
    'skyridge': ('Skyridge', 14, 0, 6, 3, 'snow', 'village', ['Skyridge West', 'Skyridge East', 'Cloud Step', 'Storm Cairn', 'Last Peak', 'Hermit Shelf']),
    'icemere': ('Icemere', 14, 3, 6, 5, 'icelake', 'village', ['North Shore', 'Frost Isle', 'West Shore', 'Frost Cave', 'South Shore', 'Seal Rocks', 'Glass Bay']),
    'cinderpass': ('Cinder Pass', 5, 3, 3, 2, 'mountain', 'village', ['Ash Gap', 'Ember Steps', 'Scree Slope']),
    'stoneheath': ('Stone Heath', 8, 3, 6, 2, 'foothills', 'village', ['Standing Stones', 'Bramble Rise', 'Tor Hill', 'Upper Brook', 'Heather Moor', 'Fallen Tower']),
    'westfold': ('Westfold', 3, 5, 5, 4, 'fields', 'village', ['Westfold Farms', 'Haystacks', 'Old Well', 'Windmill Hill', 'Crossroads', 'Orchard', 'Fold Wood', 'South Field']),
    'brookhaven': ('Brookhaven', 10, 5, 4, 3, 'fields', 'village', ['Brookhaven', 'Mill Race', 'Brook Bridge', 'East Meadow', 'Willow Bend', 'Fisher Pool']),
    'eastvale': ('Eastvale', 14, 8, 6, 3, 'fields', 'village', ['Eastvale Mill', 'Bug Hollow', 'Long Field', 'Eastvale Ford', 'Poppy Bank', 'Hedgerows']),
    'castlelawns': ('Ashford Lawns', 8, 9, 3, 2, 'fields', 'village', ['Castle Moat', 'Royal Gardens', 'Gatehouse Green']),
    'eastgate': ('Eastgate', 11, 8, 3, 3, 'fields', 'village', ['East Gate', 'Tilting Yard', 'Kings Copse']),
    'riverlands': ('Riverlands', 12, 11, 3, 4, 'fields', 'village', ['Ford', 'Reedbank', 'Otter Pools', 'Broad Water']),
    'deepwood': ('Deepwood', 0, 3, 3, 4, 'fields', 'cave', ['Deepwood Edge', 'Owl Hollow', 'Fern Gully', 'Mossback Stones']),
    'upperbrook': ('Upper Brook', 8, 5, 2, 1, 'fields', 'village', ['Upper Brook']),
    'fernbrook': ('Fernbrook', 8, 6, 1, 3, 'fields', 'village', ['Fernbrook']),
    'weirpool': ('Weir Pool', 9, 7, 1, 1, 'fields', 'village', ['Weir Pool']),
    'brackendowns': ('Bracken Downs', 2, 12, 7, 3, 'foothills', 'village', ['Bracken Downs', 'Barrow Hill', 'Hare Run', 'Fox Earth', 'Bell Stone', 'Stony Brook']),
    'kingsmeadow': ('Kingsmeadow', 8, 11, 4, 1, 'fields', 'village', ['Kingsmeadow']),
    'thistlefields': ('Thistle Fields', 9, 13, 3, 2, 'fields', 'village', ['Thistle Fields', 'Beehives']),
    'cliffside': ('Cliffside', 0, 15, 2, 2, 'foothills', 'village', ['Cliffside']),
    'greenmarch': ('Greenmarch', 6, 15, 9, 2, 'fields', 'village', ['Greenmarch', 'Market Road', 'Hop Gardens', 'Twin Oaks']),
    'oakshire': ('Oakshire', 0, 17, 8, 3, 'fields', 'village', ['Oakshire', 'Acorn Wood', 'Mill Pond', 'Hollow Oak', 'Badger Bank', 'Shire End']),
    'bramble': ('Bramble Hollow', 0, 11, 2, 4, 'fields', 'cave', ['Bramble Maze', "Witch's Hollow", 'Thornway', 'Mossy Glade']),
    'heartfields': ('Heartfields', 2, 9, 6, 3, 'fields', 'village', ['Heartfields', 'Poppy Lane', 'Shepherd Cross', 'Long Barrow', 'Kite Hill', 'Stile Gap']),
    'desert': ('Sunscar Desert', 15, 11, 5, 9, 'desert', 'village', ['Ruins', 'Nomad Camp', 'Dune Sea', 'Oasis', 'Glass Flats', 'Bone Gully', 'Sandfall', 'Dunmere', 'Mirage Rocks', 'Scorpion Pass']),
    'saltmarsh': ('Saltmarsh', 8, 17, 4, 3, 'coast', 'village', ['Graveyard', 'Duke\'s Crypt', 'Salt Flats', 'Mourner\'s Walk', 'Tidepools', 'Lantern Rock']),
    'mirrorlake': ('Mirror Lake', 12, 17, 3, 3, 'lake', 'village', ['Mirror Lake', 'Lake Isle', 'Heron Shore']),
    'southshore': ('Southshore', 0, 20, 20, 2, 'coast', 'village', ['West Beach', 'Fisher Cove', 'Driftwood', 'Shell Strand', 'Cliff Foot', 'Smugglers\' Bay', 'Lighthouse', 'Seal Point', 'Sandbar', 'East Beach']),
}

# the river: from the Frostspire snows down past Riverhead, round the castle, through Brookhaven to Mirror Lake and the sea
RIVERS = [
    [(10.6, 1.6), (10.4, 3.4), (9.7, 5.2), (9.5, 6.0)],                     # into Riverhead (north edge)
    [(9.5, 7.0), (9.4, 7.6), (8.6, 8.0), (8.6, 9.8), (9.6, 10.6), (11.4, 10.6), (11.6, 9.0), (11.2, 7.9), (10.0, 7.9)],   # moat round the castle
    [(11.4, 10.6), (12.4, 12.2), (12.8, 14.6), (12.6, 16.4), (13.2, 17.6)],  # south to Mirror Lake
    [(14.4, 19.6), (15.0, 20.6), (15.2, 21.6)],                              # lake to the sea
    [(13.4, 2.0), (13.0, 4.0), (12.2, 5.6), (11.6, 7.2), (11.2, 7.9)],      # a second stream from the peaks through Brookhaven
]

# roads: (from, to) in screen units; they bend and join set-piece doors automatically
ROADS = [
    ((10.5, 12.5), (10.0, 10.9)),   # Thistledown -> castle bridge
    ((10.5, 12.5), (4.0, 15.5)),    # Thistledown -> Marrowgate
    ((10.5, 12.5), (13.5, 12.5)),   # Thistledown -> Riverlands
    ((13.5, 12.5), (17.0, 13.5)),   # -> desert ruins
    ((13.5, 12.5), (16.5, 9.5)),    # -> Eastvale mill
    ((16.5, 9.5), (16.5, 6.0)),     # -> Icemere
    ((10.0, 8.0), (11.8, 6.0)),     # castle -> Brookhaven
    ((11.8, 6.0), (10.0, 3.8)),     # -> Stone Heath
    ((10.0, 3.8), (4.2, 4.0)),      # -> Cinder Highlands
    ((4.2, 4.0), (4.5, 1.5)),       # -> Northreach
    ((4.5, 1.5), (9.0, 1.5)),       # -> Frostspire
    ((4.5, 7.0), (4.0, 15.5)),      # Westfold -> Marrowgate
    ((4.5, 7.0), (1.5, 2.5)),       # -> Whisperwood
    ((4.0, 15.5), (1.0, 13.0)),     # Marrowgate -> Bramble Hollow
    ((10.5, 12.5), (10.0, 17.5)),   # -> graveyard
    ((10.0, 17.5), (6.0, 20.5)),    # -> Southshore
    ((5.5, 10.5), (10.0, 10.9)),    # Heartfields -> castle bridge
]

# places still to be built in later stages (shown on the plan): towns, new dungeons, fairy fountains, bottles
TOWNS = {'Marrowgate (city)': (4.0, 16.0), 'Thistledown': (10.5, 12.5), 'Brookhaven': (11.8, 6.0), 'Dunmere': (16.5, 16.5), 'Cinderfold': (3.5, 4.5)}
NEW_DUNGEONS = {'Bramble Temple': (0.8, 12.2), 'Stormspire': (17.0, 0.8), 'Mirror Temple': (13.5, 18.5), 'Glass Spire': (18.0, 18.5), 'Old Mine Depths': (4.0, 0.8), 'Standing Stones Barrow': (9.5, 3.5)}
OLD_DUNGEONS = {'Meadow Ruins': (10.6, 12.2), 'Sunken Shrine': (9.5, 6.3), 'Ember Forge': (4.4, 3.2), 'Ashford Castle': (10.0, 8.3)}


def regions():
    """All overworld rectangles: set pieces (sizes given), named regions, and filler for anything left."""
    return REGIONS


def render(path, sizes):
    from PIL import Image, ImageDraw
    S = 40
    col = {'W': (46, 110, 52), 'M': (130, 110, 90), 'S': (236, 240, 248), 'I': (200, 225, 240), 'H': (140, 170, 80), 'F': (116, 163, 52),
           'K': (150, 190, 90), 'R': (90, 130, 90), 'D': (240, 205, 140), 'G': (110, 130, 100), 'L': (113, 221, 238), 'C': (250, 220, 170), 'T': (190, 170, 120)}
    im = Image.new('RGB', (GW * S, GH * S)); d = ImageDraw.Draw(im)
    for y in range(GH):
        for x in range(GW):
            d.rectangle([x * S, y * S, x * S + S - 1, y * S + S - 1], fill=col[BIOME[y][x]])
    for y in range(GH):
        d.rectangle([0, y * S + S * 0.92, GW * S, y * S + S], fill=None)
    # sea
    for x in range(GW):
        d.rectangle([x * S, 21 * S + S * 0.45, x * S + S, 22 * S], fill=(113, 200, 238))
    for line in RIVERS:
        d.line([(p[0] * S, p[1] * S) for p in line], fill=(60, 150, 220), width=10)
    for a, b in ROADS:
        mx, my = (a[0], b[1])
        d.line([(a[0] * S, a[1] * S), (mx * S, my * S), (b[0] * S, b[1] * S)], fill=(150, 100, 60), width=4)
    for rid, (name, x, y, w, h, *_ ) in REGIONS.items():
        d.rectangle([x * S + 1, y * S + 1, (x + w) * S - 2, (y + h) * S - 2], outline=(40, 40, 40), width=1)
        d.text((x * S + 4, y * S + 3), name, fill=(20, 20, 20))
    for sid, (x, y) in SETPIECES.items():
        w, h = sizes.get(sid, (1, 1))
        d.rectangle([x * S + 2, y * S + 2, (x + w) * S - 3, (y + h) * S - 3], outline=(200, 30, 30), width=3)
        d.text((x * S + 6, y * S + 14), sid, fill=(150, 0, 0))
    def mark(p, c, label, r=7):
        d.ellipse([p[0] * S - r, p[1] * S - r, p[0] * S + r, p[1] * S + r], fill=c, outline=(0, 0, 0)); d.text((p[0] * S + r + 2, p[1] * S - 5), label, fill=(0, 0, 0))
    for n, p in TOWNS.items(): mark(p, (255, 200, 40), n, 8)
    for n, p in OLD_DUNGEONS.items(): mark(p, (120, 60, 160), n, 6)
    for n, p in NEW_DUNGEONS.items(): mark(p, (230, 60, 60), 'NEW: ' + n, 6)
    im.save(path)


if __name__ == '__main__':
    import sys
    render(sys.argv[1] if len(sys.argv) > 1 else 'worldplan.png',
           {'whisperwood': (3, 3), 'highlands': (2, 2), 'riverhead': (1, 1), 'grove': (2, 1), 'meadow': (3, 1), 'marrowgate': (4, 2), 'willowfen': (3, 2), 'willowfen_s': (2, 2)})


# ---------------------------------------------------------------------------------------------------------------
# Places added on top of the land (stage 2): towns, homes and shops, fairy fountains. Positions are screen units.
# Each house gets an interior; 'who' picks the person inside (look), 'lines' what they say; 'kind' the room's furniture.
TOWN_HOUSES = [(2, 2), (9, 2), (16, 2), (25, 2), (32, 2), (2, 15), (9, 15), (25, 15), (32, 15)]   # 5 x 5 plots in a 40 x 24 town
TOWNS_BUILT = {
    'Brookhaven': dict(region='brookhaven', at=(10.4, 5.4), ground='.', houses=[
        ('bh_inn', 'The Leaky Bucket', 'tavern', 'trader', ['Welcome to the Leaky Bucket. The bucket is decorative. The leak is not.', 'Rooms are free if you can find one that is dry.']),
        ('bh_miller', "Miller's House", 'house', 'farmer', ['The river turns the wheel, the wheel turns the stones, the stones turn my hair grey.']),
        ('bh_fish', 'Fishmonger', 'shop', 'fisher', ['Fresh fish! Well. Fish.'], 'bottles'),
        ('bh_elder', "Elder Rowan's House", 'library', 'elder', ['Brookhaven was founded by a man who fell in the river and decided to stay.', 'The castle moat is fed from our brook. Vex has never once thanked us.']),
        ('bh_house1', 'The Pell House', 'house', 'baker', ['My husband trades plushies at the bazaar. We are drowning in bears.']),
        ('bh_house2', 'Quiet Cottage', 'house', 'scholar', ['I moved here for peace and quiet. Then the frogs found out.'], 'bottle'),
        ('bh_smith', 'Brook Forge', 'smith', 'guard', ['I sharpen blades, mend shields and occasionally forge a signature. Kidding. Mostly.']),
        ('bh_guard', 'Watch House', 'house', 'guard', ['Nothing to report. Except the goose. Do not go near the goose.']),
    ]),
    'Dunmere': dict(region='desert', at=(16.0, 16.2), ground='s', houses=[
        ('dm_inn', 'The Dry Well', 'tavern', 'trader', ['The well is dry, the drinks are drier, and the jokes are the driest of all.']),
        ('dm_water', 'Water Seller', 'shop', 'fisher', ['Water, potions, bottles. In the desert you pay for wet.'], 'bottles'),
        ('dm_house1', 'Sandstone House', 'house', 'farmer', ['Sand in the bread, sand in the bed. You get used to it. You never get used to it.']),
        ('dm_sage', "Sage Amaru's House", 'library', 'elder', ['The ruins to the north were a sun temple. The old script tells you where to dig, if you can read it.']),
        ('dm_house2', 'Nomad Lodge', 'house', 'scholar', ['We nomads settle down here for the hot months. Then we complain about it.'], 'bottle'),
        ('dm_trader', 'Spice Trader', 'house', 'trader', ['Spices from far abroad. I fly out with a suitcase of flowers and come back with this. Do not ask.']),
    ]),
}
HOMES = [   # (id, name, region, at, kind, look, lines)
    ('wf_witch', "Witch Morna's Hut", 'bramble', (0.9, 12.6), 'shop', 'scholar', ['Potions, bottles, the odd curse. Curses are extra.']),
    ('fortune', "Fortune Teller's Tent", 'heartfields', (5.6, 9.6), 'library', 'trader', ['I see... a long journey. Many hearts. A suspicious amount of bush cutting.', 'That will be ten cash. The future is not free.']),
    ('lumber', "Lumberjacks' Lodge", 'deepwood', (1.4, 5.4), 'house', 'farmer', ['We cut trees. The trees grow back. It is the most stable job in Varrowmere.']),
    ('stable', 'Westfold Stables', 'westfold', (5.6, 6.0), 'house', 'farmer', ['The horses are out. All of them. Somebody left the gate open and blamed the dog.']),
    ('observatory', 'Old Observatory', 'stoneheath', (12.4, 3.6), 'library', 'scholar', ['The stars over Stone Heath line up with the standing stones once a year. Nobody remembers why that mattered.']),
    ('lighthouse', 'Lighthouse', 'southshore', (17.4, 20.2), 'house', 'fisher', ['I keep the light. Ships keep away. Everyone is happy, except the ships.']),
    ('fisher_lake', "Heron's Rest", 'mirrorlake', (12.2, 17.2), 'house', 'fisher', ['The lake shows you your own face. Then it shows you a fish. Then it shows you nothing for six hours.']),
    ('oak_house', 'Hollow Oak Cottage', 'oakshire', (3.6, 18.2), 'house', 'baker', ['My grandmother lived in the hollow oak. We moved her into a house. She still sleeps in a tree.']),
    ('greenmarch_inn', 'Twin Oaks Inn', 'greenmarch', (8.4, 15.4), 'tavern', 'trader', ['Halfway between the city and the castle. Halfway decent beer.']),
    ('heath_hermit', "Hermit Doyle's Hut", 'brackendowns', (6.2, 13.4), 'house', 'elder', ['I left the city to get away from people. Now people visit to ask why I left the city.']),
    ('eastgate_house', 'Gatekeeper\'s House', 'eastgate', (12.4, 9.2), 'house', 'guard', ['I keep the east gate. It has no wall. It is mostly a hobby.']),
]
FOUNTAINS = [   # fairy fountains: (region, at, shadow?)
    ('deepwood', (1.0, 3.6), False), ('northreach', (3.6, 1.8), False), ('frostspire', (12.2, 1.6), False), ('icemere', (18.4, 6.6), False),
    ('stoneheath', (9.0, 4.2), False), ('westfold', (3.4, 7.8), False), ('eastvale', (18.6, 9.4), False), ('riverlands', (14.0, 13.6), False),
    ('brackendowns', (2.6, 13.6), False), ('oakshire', (1.6, 18.6), False), ('desert', (18.6, 12.2), False), ('saltmarsh', (11.2, 18.8), False),
    ('southshore', (8.6, 20.2), False),
    ('s_skyridge', (18.2, 1.4), True), ('s_cinderpass', (6.4, 3.4), True), ('s_brookhaven', (13.2, 6.6), True), ('s_heartfields', (7.2, 10.6), True),
    ('s_greenmarch', (12.6, 15.6), True), ('s_desert', (17.0, 19.0), True), ('s_oakshire', (6.6, 18.6), True), ('s_eastgate', (13.2, 8.4), True),
    ('s_westfold', (7.0, 5.6), True),
]

# the six new dungeons: (id, name, region, at, theme, big-chest item, reward name, mini-boss, boss, gate)
DUNGEONS_NEW = [
    ('olddepths', 'Old Mine Depths', 'northreach', (4.2, 0.9), 'turtle', 'bombbag2', 'Pendant of Stone', 'quarryboss', 'colossus', 'DARKROCK'),
    ('barrow', 'Standing Stones Barrow', 'stoneheath', (9.4, 3.3), 'forest', 'quiver2', 'Pendant of Ages', 'garrow', 'sentinels', 'PEG'),
    ('brambletemple', 'Bramble Temple', 'bramble', (0.5, 13.4), 'swamp', 'charm', 'Pendant of Thorns', 'hald', 'kraken', 'DARKROCK'),
    ('stormspire', 'Stormspire', 's_skyridge', (16.6, 1.0), 'ice', 'speedcharm', 'Crystal of Storms', 'drowned', 'frostwyrm', 'PEG'),
    ('mirrortemple', 'Mirror Temple', 's_mirrorlake', (13.0, 18.0), 'swamp', 'guardring', 'Crystal of Reflections', 'brask2', 'bogmaw', 'DARKROCK'),
    ('glassspire', 'Glass Spire', 's_desert', (17.6, 18.6), 'thieves', 'powerring', 'Crystal of Glass', 'hald', 'pyrewyrm', 'PEG'),
]

# landmarks: (kind, region, at). stones: a ring of standing stones; mill: a windmill; wreck: a shipwreck on the sand;
# tower: a ruined watchtower; ruin: a broken old building; maze: the Bramble hedge maze (fills its rect in screens).
LANDMARKS = [
    ('stones', 'stoneheath', (10.4, 3.4)), ('stones', 'brackendowns', (4.4, 12.4)), ('stones', 's_heartfields', (3.4, 10.0)),
    ('mill', 'westfold', (4.2, 7.2)), ('mill', 'westfold', (6.4, 7.6)), ('mill', 'eastvale', (16.6, 8.4)), ('mill', 'greenmarch', (11.4, 15.3)),
    ('wreck', 'southshore', (4.4, 20.5)), ('wreck', 's_southshore', (12.0, 20.6)),
    ('tower', 'stoneheath', (12.8, 3.3)), ('tower', 'cinderpass', (6.6, 3.4)), ('tower', 'eastgate', (12.6, 8.4)), ('tower', 'cliffside', (0.6, 15.6)),
    ('ruin', 'heartfields', (3.0, 9.3)), ('ruin', 'oakshire', (5.6, 17.4)), ('ruin', 'riverlands', (12.4, 12.4)), ('ruin', 'deepwood', (0.6, 4.4)),
    ('maze', 'bramble', (0.25, 11.25, 1.5, 1.4)),
]
# extra hidden caves (bomb the cracked boulder): (region, at, items, note)
CAVES = [
    ('westfold', (5.0, 8.4), ['cash50', 'bombs'], 'A farmer hid his savings here. From his wife. She knows.'),
    ('heartfields', (6.6, 11.2), ['cash100'], 'Someone stashed a fortune here and wrote BANK on the wall.'),
    ('greenmarch', (13.4, 16.2), ['arrows', 'cash20'], 'A poacher\'s hide. The poacher has been poached.'),
    ('oakshire', (2.4, 19.2), ['cash50'], 'Acorns. Hundreds of acorns. And fifty cash, oddly.'),
    ('deepwood', (2.0, 6.2), ['bombs', 'arrows'], 'An old bandit cache. Smells of damp and regret.'),
    ('brackendowns', (7.4, 14.2), ['cash100'], 'A barrow-robber\'s hoard. The barrow would like it back.'),
    ('riverlands', (14.2, 14.3), ['cash50', 'arrows'], 'An otter has been collecting coins. The otter is unimpressed by you.'),
    ('stoneheath', (13.0, 4.4), ['cash20', 'bombs'], 'Graffiti says: THE STONES ARE WATCHING. They are not. Probably.'),
]
# people out and about: (region, at, look, lines)
PEOPLE = [
    ('kingsmeadow', (9.5, 11.5), 'trader', ['The road north goes to the castle. The road south goes away from it. I recommend south.']),
    ('westfold', (4.5, 6.5), 'farmer', ['Three windmills and not one of them grinds anything. They just look nice. Like my cousin.']),
    ('heartfields', (5.0, 10.5), 'baker', ['I came out here to pick poppies. Then I remembered I have hay fever. Then I sneezed for an hour.']),
    ('stoneheath', (11.5, 4.0), 'scholar', ['Nine standing stones, and nobody knows who put them there. My theory: someone with a lot of energy and no hobbies.']),
    ('eastgate', (12.0, 9.5), 'guard', ['Halt! Oh. Carry on. I only say halt for the practice.']),
    ('riverlands', (13.0, 13.5), 'fisher', ['The otters stole my lunch again. They work in a crew. Very organised.']),
    ('greenmarch', (9.5, 16.0), 'trader', ['Half the market was here before Vex taxed it. Now it is a very well-organised field.']),
    ('oakshire', (4.5, 18.5), 'elder', ['The oak at Hollow Oak is older than the castle. It has seen kings come and go. It was not impressed by any of them.']),
    ('brackendowns', (6.0, 12.6), 'guard', ['A barrow is a grave for important people. Important people are surprisingly easy to rob.']),
    ('deepwood', (1.5, 4.0), 'farmer', ['Mind the owls. They are not wise. They are just very confident.']),
    ('southshore', (10.5, 20.6), 'fisher', ['That wreck washed up years ago. The captain swam ashore and opened a bait shop. Nobody buys bait.']),
    ('mirrorlake', (13.0, 19.4), 'scholar', ['Look into Mirror Lake and you see yourself. Look longer and you see your debts.']),
    ('desert', (17.5, 13.5), 'trader', ['Sun, sand and scorpions. And a tavern that sells sand-flavoured drinks. On purpose.']),
    ('icemere', (16.0, 7.5), 'fisher', ['Ice fishing! You sit by a hole for hours and freeze. Then you go home and tell everyone it was great.']),
    ('northreach', (4.0, 1.5), 'farmer', ['The old mine down the track goes deep. Something big lives at the bottom. Probably a rock. A big, angry rock.']),
]
# side quests: (id, region, at, look, who, lines before, lines when done, needs flag/item, sets flag, reward)
QUESTS = [
    # the plushie trade: Brookhaven -> Dunmere -> Twin Oaks Inn -> the lighthouse
    ('trade_bear', 'brookhaven', (11.6, 6.9), 'baker', 'Woman', ['Take this plushie bear. Please. We have hundreds. Someone in Dunmere collects them, I am told.'], ['Thank you for taking the bear. We only have four hundred and twelve left.'], None, 'bear', None),
    ('trade_spice', 'desert', (16.9, 17.8), 'trader', 'Sultan', ['A plushie? I collect them! In exchange... here, a pouch of rare spices. The cook at the Twin Oaks will weep.'], ['Enjoy the spices. Do not inhale them. Learned that the hard way.'], 'bear', 'spices', None),
    ('trade_pie', 'greenmarch', (8.9, 16.2), 'baker', 'OldWoman', ['Spices! Real spices! I will bake you a pie. Take it to the lighthouse keeper, he has not eaten a proper meal since the wreck.'], ['Was the pie good? Do not tell me. I can see on your face it was.'], 'spices', 'pie', None),
    ('trade_light', 'southshore', (17.9, 20.9), 'fisher', 'Villager5', ['Is that... a pie? For me? Nobody has brought me a pie in eleven years. Take this, it is all I have.'], ['The light stays lit thanks to you. And the pie.'], 'pie', 'tradedone', 'cash200'),
    # the lost dog: Westfold stables -> Deepwood
    ('dog_owner', 'westfold', (6.0, 6.4), 'farmer', 'Hunter', ['My dog Biscuit ran off into Deepwood. He will only come home if someone he likes finds him. Everybody likes him. He likes nobody.'], ['Biscuit is home! He has already bitten me twice. Here, for your trouble.'], 'dogfound', 'dogdone', 'cash100'),
    ('dog', 'deepwood', (1.8, 5.8), 'farmer', 'Dog', ['Woof. (Biscuit sniffs you, decides you are acceptable, and trots off home to Westfold.)'], ['Woof.'], None, 'dogfound', None),
    # the star chart: the fortune teller wants the observatory's chart
    ('stars_teller', 'heartfields', (6.2, 10.4), 'trader', 'Shaman', ['To see the future properly I need a star chart. The old observatory on Stone Heath has one. Fetch it?'], ['The stars say... you will find this cash useful. Take it.'], 'starchart', 'starsdone', 'cash100'),
    ('stars_chart', 'stoneheath', (12.9, 4.0), 'scholar', 'Inspector', ['The fortune teller wants my star chart? Fine. Tell her the stars are not a bus timetable.'], ['Mind the chart. It is the only one, mostly because nobody else could be bothered.'], None, 'starchart', None),
]
