# Real World November 2026

⚠️ This is built from TEW's IX Real World Chronicles 2026 (August Update)

A live-roster snapshot of sixteen real wrestling promotions as of November 2026, built for Booker Blitz.

Every person is real: full attribute sets, real finishers and gimmicks, real birthplaces and debut dates, and the title, tag-team, show and PPV structure each company actually runs.

Cross-promotion talent carries **non-exclusive** deals — AEW names who also work New Japan, CMLL and ROH regulars who double on the US indies, Stardom talent appearing in AEW, and so on. Their extra deals live in `additionalContracts` and resolve into real contracts when a game starts.

## Contents

- **promotions.json** — 16 promotions, each with its weekly shows, PPVs, titles, tag teams and signed staff
- **wrestlers.json** — 4,270 people: 981 signed wrestlers, 292 signed staff, and 2,997 free agents
- **alliances.json** — 6 alliances: WWE Universe, Forbidden Door, CyberFight, IndependentWrestling.TV, The Collective, United Japan Pro Wrestling

## Roster breakdown

| id | Promotion | Lvl | Base | Signed wrestlers | Signed staff |
|---:|---|---:|---|---:|---:|
| 3 | AJPW | 7 | Japan | 36 | 6 |
| 5 | AAA | 6 | Mexico | 48 | 10 |
| 11 | CMLL | 8 | Mexico | 157 | 29 |
| 28 | TNA | 6 | USA | 48 | 17 |
| 38 | NJPW | 9 | Japan | 56 | 24 |
| 44 | PROGRESS | 3 | UK | 22 | 2 |
| 45 | NOAH | 7 | Japan | 48 | 11 |
| 49 | ROH | 5 | USA | 78 | 7 |
| 61 | Stardom | 6 | Japan | 46 | 6 |
| 64 | WWE | 10 | USA | 104 | 65 |
| 65 | NXT | 6 | USA | 73 | 32 |
| 68 | MLW | 4 | USA | 30 | 8 |
| 76 | AEW | 9 | USA | 115 | 52 |
| 77 | GCW | 4 | USA | 49 | 7 |
| 79 | NWA | 5 | USA | 49 | 12 |
| 118 | MLP | 3 | USA | 22 | 4 |

Wages are monthly. Contracts are dated relative to the start date (`2026-01-01`); the game shifts them to whatever start date you pick at New Game.

## Downloads

For legal reasons this pack is not hosted in this repository. Both files are hosted on MediaFire:

- **Datapack (.bbdb):** https://www.mediafire.com/file/xhzd17anc36qtex/real-world-november-2026.bbdb/file
- **Image pack (RWNov26.zip):** https://www.mediafire.com/file/doqfrfek4rcpka4/RWNov26.zip/file

## Image sources

**The `.bbdb` embeds no images.** `picture`, `logo` and staff `pic` fields are filenames only (`Mistico.png`, `AEW_alt2.png`). Download `RWNov26.zip` from MediaFire (the only image host for this pack), extract it, and point DataStudio's datapack import at the extracted image folder.

## Real names

Wrestler, staff and promotion names are real and are used descriptively. No real promotion logo or trademarked artwork is included in this repository.
