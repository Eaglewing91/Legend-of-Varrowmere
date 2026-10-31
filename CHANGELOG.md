# 📝 Legend of Varrowmere changelog

Dates are in TCT (Torn City Time).

- **Install or update:** [Legend-of-Varrowmere.user.js](https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere.user.js) and the optional [Soundtrack](https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere-Soundtrack.user.js). Tampermonkey updates both by itself.

---

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
