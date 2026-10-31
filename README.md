# Legend of Varrowmere

A top-down action-adventure for Torn, in the style of the 16-bit classics. It runs as a single userscript and opens in its own window over the Torn page.

> **Status:** in development on the `dev` branch. It will join the Torn Arcade when it is finished.

## The story

Long ago, three Pendants kept the land of Varrowmere at peace. Now Chancellor Vex rules from Ashford Castle, and his Gilded Hand patrol every road. You are Wren of Thistledown. Last night you dreamt of a voice calling from the Meadow Ruins...

Win the three Pendants and draw the Dawnblade. Break Vex's barrier, then follow him through the Twin Mirror into Shadow Varrowmere. Gather two Crystals there and end it in the Shadow Keep.

## What's in it

- **Two worlds.** Varrowmere and its shadow, with the Twin Mirror to cross between them at the same spot.
- **Eight dungeons.** Each has keys, a map, a compass, a Big Key, a mini-boss and a boss:

  | Dungeon | Item | Mini-boss | Boss |
  |---|---|---|---|
  | Meadow Ruins | Bow | Captain Brask | the Stone Sentinels |
  | Sunken Shrine | Grapple | Lieutenant Garrow | the Mire Kraken |
  | Ember Forge | Ember Rod | Forgemaster Hald | the Pyrewyrm |
  | Ashford Castle | — | — | Chancellor Vex |
  | Drowned Vault | Power Glove | the Drowned Knight | the Twin Maws |
  | Hollow Quarry | Mirror Shield | the Quarry Boss | the Stone Colossus |
  | Shadow Keep | Sunfire Arrows | Captain Brask (again) | Vex's Shadow |

- **Puzzles.** Push blocks, floor switches, torches, water levels, lava, fire bars, cracked walls, boulders and a gateless pen.
- **Equipment.** Lantern, Bombs, Ricochet Dice, Flippers, the Dawnblade (fires a beam at full health) and Shadow Mail.
- **Secrets.** Twelve heart pieces, hidden grottos behind cracked boulders, and cash stashes.
- **Towns.** Thistledown and Cinderfold, with villagers, shops and nurses.
- **Extras.** Three save files, a map screen and original chiptune music.

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Move |
| Z (or J) | Sword. Hold to charge a Spin Attack |
| X (or K) | Use the selected item |
| C (or L) | Talk, read, open, lift, throw |
| Shift (or V) | Dash (with the Running Shoes) |
| Enter | Item menu (pause) |
| M | Map |
| N | Music on / off |
| Esc | Close the game window |

Keys only drive the game while its window is open and you are not typing in a text box.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/), then install `Legend-of-Varrowmere.user.js`. The link will be added here at release. On any Torn page, open the Tampermonkey menu and choose **Play Legend of Varrowmere**.

PC only: it is built for a keyboard.

## Torn scripting rules

The game is entirely self-contained.

- It makes **no network requests** of any kind: no Torn pages, no API calls, no external sites, no websockets.
- It never reads, clicks or changes anything on the Torn page underneath. It only adds its own window on top.
- All art, maps and music are inside the script.

### Terms of Service

| | |
|---|---|
| **Data Storage** | Only locally: your three save files, in Tampermonkey's own storage on your device |
| **Data Sharing** | Nobody |
| **Purpose of Use** | Public amusement |
| **Key Storage & Sharing** | Not stored / Not shared: no API key is used or asked for |
| **Key Access Level** | None: no API key required |

## Credits

- **Created by** Eaglewing [571041]
- **Built with** Claude
- **Art:**
  - "Zelda-like tilesets and sprites" by ArMM1998 ([OpenGameArt](https://opengameart.org/content/zelda-like-tilesets-and-sprites), CC0)
  - The hero, people, bosses, monsters, terrain, water, houses, effects, item icons, font, dialog boxes, sound effects and music from "Ninja Adventure" by Pixel-boy and AAA ([itch.io](https://pixel-boy.itch.io/ninja-adventure-asset-pack), CC0)
- Everything else © Eaglewing [571041]. All rights reserved.

## Developing

```
python3 build.py            # builds build/Legend-of-Varrowmere.user.js and build/dev.html
node tests/mech.js          # mechanics tests (combat, items, puzzles, bosses, saves)
node tests/progress.js      # walks the story in order: every chest reachable with the items you'd have
node tests/reach.js         # flood-fills every map from its entry
```

The tests need Node and Playwright.

- Maps are written in Python in `tools/maps.py`.
- The game is plain JavaScript in `src/`.
- The build combines everything into the one userscript.
