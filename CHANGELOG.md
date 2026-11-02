# 📝 Legend of Varrowmere changelog

Dates are in TCT (Torn City Time).

- **Install or update:** [Legend-of-Varrowmere.user.js](https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere.user.js) and the optional [Soundtrack](https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere-Soundtrack.user.js). Tampermonkey updates both by itself.

---

## 1.0.15 — 2026-11-02
### Fixed
- **The windmills open.** All four windmills (two in Westfold, one each in Eastvale and Greenmarch) had a door you couldn't use. Now each one has a miller inside to talk to, and one of them has hidden their savings in a chest.

## 1.0.14 — 2026-11-02
### Changed
- **A gentler start.** Until you win your first Pendant (in the Meadow Ruins):
  - no ordinary enemy takes more than half a heart per hit. That includes blue soldiers, which used to take a whole heart;
  - bosses hit a quarter softer;
  - defeated enemies drop hearts more often when you're hurt.
  From the first Pendant on, everything is as before. Your own damage and your own bombs are unchanged.
### Fixed
- **Monsters can no longer knock you back through a door.** Getting hit next to a dungeon entrance, a doorway or stairs used to bounce you straight back outside or into the previous room. Now a hit stops you short of any door and at the edge of the room or screen you're in. As in the original, only walking takes you through.

## 1.0.13 — 2026-11-01
### Changed
- **No more falling into water.** Deep water is now the edge of the land, as in Zelda 1991: you simply stop at the shore. Once you have the Flippers, you walk straight in and swim as before. (Pits still drop you, as in the original.)
- **New keys:** **F** talks, reads, lifts and opens (C still works too). **Space** now uses your item, like a second attack button: throw the Ricochet Dice, fire the bow, drop a bomb (X still works too). Any of the buttons moves dialogue on.

## 1.0.12 — 2026-11-01
### Changed
- **The countryside is laid out like Zelda 1991's.** Every screen is framed by trees, rock or water, and you move between screens through proper gateways that line up on both sides. Roads run straight with square corners and cross from screen to screen through those gateways.
- Every screen is joined to its neighbours (no screen is cut off), and almost every screen has at least two ways in or out.
- Each screen now reads as one kind of land (woods, fields, snow, desert) instead of patches of everything.
- No more one-tile squeezes between trees and rocks: paths are at least two tiles wide.
- **Ashford Castle is now a proper castle.** It stands in its own lawns south of the Dawn Grove, inside a moat: a walled courtyard two screens across with towers at every corner, a gatehouse in the south wall, and the great keep in the middle (Vex's barrier still guards the door).
- **The Shadow Keep is Ashford Castle's dark twin.** It stands in the same spot in the Shadow world, and its door opens once you hold all seven Crystals.
- **The Meadow Ruins and the Sunken Shrine are no longer right next to Thistledown.** The ruins are now at the far side of the Riverlands, at the end of the east road. The shrine lies under a pool in Mirror Lake and is drained by the sluice as before. Signs and villagers point the new way.
### Fixed
- **No more dead ends when you cross onto a new screen.** Every gap across a screen edge now leads somewhere: on into that screen, to another gap, or to something to find (a door, a cave, a chest, a dig spot, someone to talk to, a sign). Checked by a new test on every screen of both worlds.
- Lookout towers have a sign to read when you reach the end of their road.
- In the Shadow world, doors of buildings with no Shadow twin are shut, and light-world chests and cracked boulders no longer leave little nooks behind.

## 1.0.11 — 2026-10-31
### Changed
- **On phones (Torn PDA)** Legend of Varrowmere is laid out like Tornies: the picture at the top, the same width as Tornies' screen, in the same frame, with the touch pad underneath it instead of squeezed in at the sides. Desktop and sideways play are unchanged.

## 1.0.10 — 2026-10-31
### Fixed
- Walking onto the next screen could set Wren down inside a bush, tree or rock, leaving her stuck. She now steps to the nearest free spot on the new screen (or back, if there is none). Checked at every screen edge in the game.

## 1.0.9 — 2026-10-31
### Fixed
- Roads across the countryside no longer run along the edge of the screen: they cross from one screen to the next and keep to the middle ground (the longest edge-hugging stretch went from 24 tiles to none).
- A file that would load with Wren inside something solid moves her to the nearest free spot.

## 1.0.8 — 2026-10-31
### Fixed
- Closing the game during the opening scene no longer leaves Wren stuck in bed: the scene plays again from the start.
- Wren never starts a game stuck inside something solid; she steps to the nearest free spot.

## 1.0.7 — 2026-10-31
### Fixed
- Torn Arcade's volume slider now sets Legend of Varrowmere's volume too (music and sound effects).

## 1.0.6 — 2026-10-31
### New
- **New townsfolk.** Every villager, trader, guard, scholar and fisher is now drawn from the Mana Seed character art by Seliel the Shaper: 35 different people with full walking animation, and their own face beside what they say.
- **Wren is redrawn too**, in a green Forester tunic and pointed hat, carrying a sword and shield: walking, running, sword swings, the Spin Attack, bow shots, lifting, throwing, pushing and swimming. Every tunic colour still works.
- **A proper opening.** A new adventure starts at night, in bed, in a storm. A voice calls from beneath the Meadow Ruins; Captain Brannoc hears it too, tells Wren to stay put, and heads out into the rain. Thistledown stays dark and wet until you reach the ruins. (Press Enter to skip the scene.)
- Brannoc turns up again: hurt inside the Meadow Ruins, and back home once you have the first Pendant.
- Spirits are pale, see-through figures that drift gently.
- **Vex's people are redrawn**: the Gilded Hand soldiers (in gold, with sword and shield), their archers, and every rank's colours. Captain Brask, Lieutenant Garrow, Forgemaster Hald, the Drowned Knight, the Quarry Boss, the Hollow King, the Bandit Queen and Chancellor Vex himself are now people, drawn large. Monsters are unchanged.
- The picture is drawn on a finer pixel grid, so the new people keep their detail.

## 1.0.5 — 2026-10-31
### Fixed
- Torn Arcade's speaker (mute) button now mutes Legend of Varrowmere's music and sound effects too.

## 1.0.4 — 2026-10-31
### New
- **Space** now talks, reads, lifts and opens (like C).
- **Mouse click** swings the sword (hold the button for a Spin Attack). A tap on the picture does the same on touch screens.
- **Touch pad**, like Tornies': a D-pad on the left, Sword, Item and Talk buttons on the right, and Dash, Map and Menu at the top. Turn it on with 🎮 (in Torn Arcade's top bar, or beside Close in the game window). It's on by default on touch screens.

## 1.0.3 — 2026-10-31
### Fixed
- The music was distorted and crackly: it had been squeezed to about 14 kbps to fit one script. It's now re-encoded from the original tracks at about 2.5 times the quality, in **two Soundtrack scripts** (Part 1: title, towns, fields and bosses; Part 2: Shadow world, dungeons, caves and the ending), each under 2 MB. If you already have the Soundtrack, it updates itself to Part 1; install Part 2 for the rest.

## 1.0.2 — 2026-10-31
### Changed
- From Torn Arcade, the game now opens **inside the phone**, turned sideways like Tornies, instead of in its own window over the page. The Home button (or Esc) takes you back to the phone and saves. From the Tampermonkey menu it still opens in its own window.

## 1.0.1 — 2026-10-31
### New
- **Preload Legend:** with Torn Arcade 2.54.1's new setting turned on, the game gets itself ready in the background when you open the phone, so it starts straight away. Nothing is downloaded or saved.

## 1.0.0 — 2026-10-31
### First public release
- A full top-down action-adventure: two worlds (Varrowmere and its Shadow twin), 19 multi-floor dungeons with puzzles, mini-bosses and unique bosses, and the story from Thistledown to the Shadow Keep and the true ending.
- 15 side quests, towns with shops and furnished houses, cellars, secret caves, fairy fountains and three Great Fairies.
- Three save files, each with its own hero: type a name and choose one of five tunics. Files can be copied or erased.
- Items and status screen with your gear, Pendants, Crystals, bottles, Heart Shards and side quests; clear 24 x 24 item icons; a readable font throughout.
- Knocked out in a dungeon? You wake where you last came onto that floor, not back at home.
- The music comes in a separate, optional Soundtrack script, so each script stays under 2 MB.
- Joins Torn Arcade 2.54: the Legends folder on the phone launches it, and Total playtime, Completion and Monsters defeated appear on the Arcade's leaderboards.
- Listed as a Premium Game in Torn Arcade, and free until Torn Staff approve a subscription service.

### Before 1.0
Built in the open on the `dev` branch from 0.1 to 0.41. The commit history there has every step: the world generator, the Ninja Adventure art, the dungeons, the balance passes, the side quests and the polish.
