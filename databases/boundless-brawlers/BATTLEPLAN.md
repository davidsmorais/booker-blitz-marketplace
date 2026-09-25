# Battle Plan: "Public Domain Classics" database

Status: **planning only** — this is a dry run. No `.bbdb`, `meta.json`, `README.md`, or `preview.png`
exist yet. Any agent picking this up should follow `.claude/skills/build-database/SKILL.md` to
produce those files inside this same folder (`databases/public-domain-classics/`).

## Brief (confirmed with the requester, 2026-09-25)

- **Slug**: `public-domain-classics`
- **Pool**: mythology & folklore, classic literature (pre-1929), history & legend, and
  early-cinema/pulp — mixed together in one roster, not split by pack.
- **Tone**: full wrestling-gimmick treatment. Every entry gets a `style`, `presentation`
  (face/heel), card position, and a gimmick hook — not just the source character reprinted.
- **Scope**: `wrestlers.json` is the core deliverable. Also build 1–2 themed `promotions.json`
  entries to house the roster (see "Promotions" below). No arenas/alliances requested.
- **Balance**: don't force gender balance — let it reflect the source material (mythology/lit/
  history skew male; the list below pulls every strong public-domain woman character available,
  but doesn't invent parity).
- **Target size**: 100–150 wrestlers. List below has **123**.

## Field reference (from `schema/bbdb.schema.json` and observed values in
`databases/real-world-2026/real-world-2026.bbdb`)

- `style` enum in practice: `high flyer`, `technical`, `all rounder`, `powerhouse`, `striker`,
  `submission`, `hardcore`, `comedy`
- `presentation`: `face` | `heel`
- `type`: `wrestler` (default for this pack) | `manager` | `referee` | `commentator` | `writer`
- `cardPosition`: use `lower` / `mid` / `upper` / `main` banding matching the real-world export
- `masked`, `retired`, `dead`: booleans — leave `false` unless the gimmick specifically calls for
  a mask (e.g. Zorro-adjacent, Golem)
- `picture`: a **filename only**, e.g. `Dracula.jpg` — never a URL or embedded image. The README
  must name the image host once portraits are sourced.

## IMPORTANT — legal caution before building

"Public domain" applies to the **written/filmed work**, not automatically to every derivative
name or look. Two traps to avoid when filling out gimmicks and art:

1. **Trademark survives copyright expiry.** Characters like Tarzan, Zorro, Felix the Cat, or
   Sherlock Holmes' *later* stories can carry live trademarks or extended-copyright elements
   (Conan Doyle's last 10 stories are still restricted in the US) even though the core character
   is PD. Keep gimmicks generic to the earliest PD material and avoid studio logos/likenesses.
2. **Don't use a specific film studio's visual design** (e.g. Universal's Frankenstein Monster
   makeup, Disney's Alice) for `preview.png` or wrestler art — that's copyrighted design layered
   on a PD character. Commission/generate original art, or use pre-1929 illustrations that are
   themselves PD (public-domain book plates, Wikimedia Commons PD-old-100 scans).
3. Two characters were deliberately **left off the list below** for this reason: *Zorro*
   (1919 pulp original is right at the copyright boundary and heavily trademarked by Zorro
   Productions) and *Tarzan* (trademark actively enforced by Edgar Rice Burroughs Inc.). Don't
   add them without a legal double-check.
4. Also left off deliberately: a few 19th/early-20th-century "villain" characters built on racial
   caricature (e.g. *Injun Joe*, *Fu Manchu*). They're technically PD but not worth the reputational
   risk for a community marketplace pack — skip them.

## The roster (123 entries)

Format: **Ring name** (source) — style / presentation / card — hook

### Mythology & Folklore (38)

1. **Heracles** (Greek myth) — powerhouse / face / main — Twelve Labors gimmick, no-sell everything
2. **Loki** (Norse myth) — technical / heel / upper — trickster mic-work, screwjob finishes
3. **Thor** (Norse myth) — powerhouse / face / main — hammer prop, storm entrance
4. **Odin** (Norse myth) — all rounder / face / upper — veteran authority figure, one eye gimmick
5. **Anansi** (West African folklore) — technical / heel / mid — spider-trickster, always has an angle
6. **Baba Yaga** (Slavic folklore) — hardcore / heel / upper — hut-on-legs entrance, witch gimmick
7. **Medusa** (Greek myth) — submission / heel / upper — "stone cold stare" finisher, snake motif
8. **Achilles** (Greek myth) — striker / face / main — one weak spot storyline (heel target his heel)
9. **Hector** (Greek myth) — all rounder / face / upper — honorable underdog vs. Achilles feud
10. **Perseus** (Greek myth) — high flyer / face / mid — shield-and-sword high spots
11. **Circe** (Greek myth) — technical / heel / upper — turns opponents into "pigs" (jobbers) angle
12. **Medea** (Greek myth) — submission / heel / mid — vengeful sorceress, betrayal storylines
13. **Atalanta** (Greek myth) — high flyer / face / mid — fastest woman on the roster gimmick
14. **Amaterasu** (Japanese myth) — all rounder / face / main — sun-goddess, brightens dark arenas
15. **Susanoo** (Japanese myth) — striker / heel / upper — storm-god brawler, chaotic booking
16. **Raijin** (Japanese myth) — hardcore / heel / mid — drum-and-thunder entrance
17. **Set** (Egyptian myth) — powerhouse / heel / upper — desert-storm destroyer gimmick
18. **Anubis** (Egyptian myth) — technical / heel / mid — masked, judges opponents' "worth"
19. **Isis** (Egyptian myth) — all rounder / face / upper — protector/healer angle, revives fallen tag partners
20. **Horus** (Egyptian myth) — high flyer / face / mid — falcon aerial offense
21. **Sekhmet** (Egyptian myth) — powerhouse / heel / mid — lioness-warrior, no remorse
22. **Cu Chulainn** (Irish/Celtic myth) — striker / face / upper — battle-rage finisher sequence
23. **The Morrigan** (Celtic myth) — hardcore / heel / mid — crow imagery, predicts opponents' losses
24. **Finn MacCool** (Irish myth) — powerhouse / face / mid — giant's-causeway strongman gimmick
25. **Coyote** (Native American/Plains folklore) — comedy / heel / lower — trickster run-ins, screwy finishes
26. **Paul Bunyan** (American tall tale) — powerhouse / face / main — literal giant, axe prop
27. **Pecos Bill** (American tall tale) — all rounder / face / mid — cowboy gimmick, lasso finisher
28. **John Henry** (American folklore) — powerhouse / face / upper — steel-driving underdog vs. "the machine" storyline
29. **Br'er Rabbit** (Uncle Remus tales, Joel Chandler Harris) — comedy / heel / lower — outsmarts bigger opponents
30. **Baron Samedi** (Haitian folklore) — hardcore / heel / mid — graveyard entrance, unnerving mic work
31. **Kali** (Hindu myth) — hardcore / heel / main — destroyer gimmick, multiple-arm visual gag with tag partners
32. **Hanuman** (Hindu myth) — high flyer / face / upper — monkey-king aerial specialist
33. **Indra** (Hindu myth) — powerhouse / face / mid — thunderbolt prop, king-of-gods authority
34. **Ravana** (Hindu myth, Ramayana) — technical / heel / main — ten-headed mind-games gimmick (multiple managers "voicing" him)
35. **Grendel** (Beowulf, Old English epic) — hardcore / heel / mid — monster gimmick, arena-goes-dark entrance
36. **Beowulf** (Old English epic) — powerhouse / face / upper — monster-hunter, feuds with Grendel then a dragon angle
37. **Brynhildr** (Norse saga) — technical / face / mid — valkyrie, escorts fallen wrestlers to "Valhalla" (retirement angle)
38. **Fenrir** (Norse myth) — hardcore / heel / lower — wolf-masked hardcore brawler, "unchained" gimmick

### Classic Literature, pre-1929 (35)

39. **Sherlock Holmes** (Doyle, early stories only) — technical / face / main — "solves" opponents' strategies mid-match
40. **Dracula** (Stoker, 1897) — technical / heel / main — aristocrat vampire, hypnotic mic work
41. **Dr. Jekyll & Mr. Hyde** (Stevenson, 1886) — all rounder / heel / upper — dual-entrance gimmick, turns mid-match
42. **The Invisible Man** (Wells, 1897) — technical / heel / mid — bandaged mystery-man mind games
43. **Captain Nemo** (Verne) — technical / face / upper — inventor-outsider, submarine entrance video
44. **Captain Ahab** (Melville, Moby-Dick) — hardcore / heel / mid — obsessive one-feud wrestler, peg-leg selling
45. **Long John Silver** (Stevenson, Treasure Island) — striker / heel / mid — pirate mic-work, parrot manager
46. **D'Artagnan** (Dumas) — technical / face / upper — musketeer, tag gimmick with Athos/Porthos/Aramis
47. **Athos** (Dumas) — all rounder / face / mid — musketeer stable member
48. **Porthos** (Dumas) — powerhouse / face / mid — musketeer stable member
49. **Aramis** (Dumas) — technical / face / mid — musketeer stable member
50. **Edmond Dantès** (Dumas, Count of Monte Cristo) — technical / face / main — slow-burn revenge storyline across a season
51. **Quasimodo** (Hugo, Hunchback of Notre Dame) — powerhouse / face / mid — sympathetic monster, bell-tower entrance
52. **Frankenstein's Monster** (Shelley, 1818) — hardcore / face-tweener / upper — misunderstood-monster arc, can turn either way
53. **Dorian Gray** (Wilde) — technical / heel / upper — never ages, portrait-in-attic mic angle
54. **Raskolnikov** (Dostoevsky, Crime and Punishment) — submission / heel / mid — guilt-driven, self-sabotaging matches
55. **Robin Hood** (English ballads, pre-1500 PD) — high flyer / face / main — steals finishes, "gives to the lower card" angle
56. **Little John** (Robin Hood legend) — powerhouse / face / mid — quarterstaff prop
57. **Friar Tuck** (Robin Hood legend) — comedy / face / lower — brawling monk gimmick
58. **Ivanhoe** (Scott) — all rounder / face / upper — knight, jousting-style entrance
59. **Cyrano de Bergerac** (Rostand) — technical / face / mid — poet-swordsman, best promos on the roster
60. **Natty Bumppo / Hawkeye** (Cooper, Last of the Mohicans) — technical / face / mid — frontier scout gimmick
61. **Uncas** (Cooper) — high flyer / face / mid — agile warrior gimmick
62. **Huckleberry Finn** (Twain) — comedy / face / lower — underdog kid gimmick, raft entrance
63. **Tom Sawyer** (Twain) — comedy / face / lower — schemer, tricks opponents into "whitewashing" jobs
64. **Captain Hook** (Barrie, Peter Pan) — technical / heel / upper — hook-hand weapon spots, ticking-clock entrance
65. **Peter Pan** (Barrie) — high flyer / face / upper — never-age gimmick, flying high spots
66. **The Wicked Witch of the West** (Baum, Wizard of Oz, 1900) — hardcore / heel / main — water-spot finisher tease (never lands, per storyline)
67. **Dorothy Gale** (Baum) — all rounder / face / main — tornado entrance, underdog-in-a-strange-land arc
68. **The Tin Man** (Baum) — powerhouse / face / mid — rust-gimmick selling, "heart" mic angle
69. **The Scarecrow** (Baum) — technical / face / mid — floppy comedic selling hiding real technical skill
70. **The Cowardly Lion** (Baum) — comedy / face-tweener / mid — runs from fights, wins by accident
71. **Alice** (Carroll) — high flyer / face / mid — size-change gimmick (big/small entrance gag)
72. **The Mad Hatter** (Carroll) — comedy / heel / mid — chaotic rules-breaking, tea-party manager stable
73. **The Queen of Hearts** (Carroll) — technical / heel / upper — "off with their heads" mic catchphrase, controls a stable
74. **The Cheshire Cat** (Carroll) — technical / heel / mid — disappears mid-match, run-in specialist

### History & Legend (35)

75. **Genghis Khan** (historical) — powerhouse / heel / main — conqueror gimmick, expands his "stable" every arc
76. **Cleopatra** (historical) — technical / heel / main — regal mic-work, controls booking via alliances
77. **Julius Caesar** (historical) — all rounder / heel / main — betrayal-storyline magnet ("Et tu" finish)
78. **Spartacus** (historical) — powerhouse / face / main — rebel-underdog gimmick, leads a lower-card stable revolt
79. **Boudica** (historical) — striker / face / upper — warrior-queen, chariot entrance
80. **Joan of Arc** (historical) — all rounder / face / main — inspirational underdog, faction leader
81. **Vlad III "the Impaler"** (historical — distinct from Dracula the novel) — hardcore / heel / upper — impaling-spike prop entrance
82. **Attila the Hun** (historical) — powerhouse / heel / upper — "Scourge of the Roster" gimmick
83. **Alexander the Great** (historical) — all rounder / face / main — conquest-arc, undefeated streak angle
84. **Leonidas** (historical) — powerhouse / face / upper — "This is Sparta" catchphrase, 300-member stable
85. **William Wallace** (historical) — striker / face / upper — freedom-fighter promo specialist
86. **Blackbeard** (historical, Edward Teach) — hardcore / heel / upper — lit-fuse-in-beard entrance
87. **Anne Bonny** (historical) — striker / heel / mid — pirate tag team with Mary Read
88. **Mary Read** (historical) — technical / heel / mid — pirate tag team with Anne Bonny
89. **Calamity Jane** (historical) — hardcore / face / mid — wild-west brawler gimmick
90. **Wyatt Earp** (historical) — technical / face / upper — lawman gimmick, "high noon" entrance countdown
91. **Billy the Kid** (historical) — striker / heel / mid — young-gun cocky heel
92. **Jesse James** (historical) — technical / heel / mid — outlaw gimmick, robs finishes
93. **Annie Oakley** (historical) — technical / face / upper — sharpshooter precision-strike gimmick
94. **Sun Tzu** (historical) — technical / face-manager / mid — strategist, better as an in-ring general/mouthpiece for a stable
95. **Hannibal Barca** (historical) — all rounder / heel / upper — "crosses the mountains" surprise-attack gimmick
96. **Richard the Lionheart** (historical) — powerhouse / face / upper — crusader-knight gimmick
97. **Saladin** (historical) — technical / face / upper — honorable-rival arc vs. Richard the Lionheart
98. **Rasputin** (historical) — hardcore / heel / main — near-unkillable no-sell gimmick, mystic mic work
99. **Catherine the Great** (historical) — technical / heel / upper — regal authority-figure/booker gimmick
100. **Napoleon Bonaparte** (historical) — powerhouse / heel / main — small-but-mighty, "Emperor" championship-obsessed gimmick
101. **Nero** (historical) — technical / heel / mid — burns down angles ("fiddles while Rome burns" no-shows)
102. **Ching Shih** (historical) — hardcore / heel / upper — pirate-queen, largest stable on the roster
103. **Lady Godiva** (historical/legend) — all rounder / face / mid — protest/underdog storyline
104. **El Cid** (historical/legend) — all rounder / face / upper — honorable mercenary gimmick
105. **King Arthur** (Arthurian legend) — powerhouse / face / main — sword-in-the-stone qualifying-match gimmick
106. **Merlin** (Arthurian legend) — technical / face-manager / upper — mystic manager for Arthur's stable
107. **Lancelot** (Arthurian legend) — technical / face / upper — best-in-ring, betrayal-storyline potential with Guinevere/Arthur
108. **Guinevere** (Arthurian legend) — technical / face-tweener / mid — love-triangle storyline engine
109. **Mordred** (Arthurian legend) — striker / heel / upper — usurper gimmick, ends the Camelot stable's reign

### Early Cinema & Pulp, pre-1929 (14)

110. **Count Orlok** (Nosferatu, 1922 — public domain film) — hardcore / heel / upper — silent, unsettling entrance, rat-swarm visual
111. **The Golem** (based on Jewish folklore + 1920 film) — powerhouse / heel-tweener / upper — clay-monster no-sell gimmick, controlled by a manager's "word"
112. **Maria / the Maschinenmensch** (Metropolis, 1927) — technical / heel / upper — robot double-gimmick (good Maria vs. false Maria angle)
113. **Cesare the Somnambulist** (The Cabinet of Dr. Caligari, 1920) — submission / heel / mid — hypnotized-puppet gimmick, controlled by a "Dr. Caligari" manager
114. **The Phantom** (Leroux's Phantom of the Opera, 1910 novel) — technical / heel / upper — masked, opera-house entrance, trapdoor spots
115. **Christine Daaé** (Leroux) — high flyer / face / mid — opera-singer entrance, Phantom's rival/obsession storyline
116. **The Man in the Beaver Hat** (London After Midnight, 1927 — lost film, PD character design) — hardcore / heel / lower — vampire-hunter-turned-vampire mystery gimmick
117. **Erik the Vampire** (alt. Phantom-adjacent pulp archetype) — hardcore / heel / mid — generic pulp-horror brawler
118. **The Iron Man of Oz / Tik-Tok** (Baum sequels, PD) — hardcore / face / lower — wind-up-clockwork gimmick, comedic no-selling
119. **The Wizard of Oz (Oscar Diggs)** (Baum) — technical / heel-manager / upper — carnival-huckster manager/authority figure
120. **Toto** (Baum) — comedy / face / lower — mascot/manager's-pet run-in gimmick (novelty, low card)
121. **The Woggle-Bug** (Baum's Oz sequels, PD) — comedy / heel / lower — pompous professor mic-work, low-card comedy heel
122. **Ozma of Oz** (Baum) — all rounder / face / upper — princess-ruler gimmick, faces off against the Wizard/manager stable
123. **Jack Pumpkinhead** (Baum's Oz sequels, PD) — comedy / face / lower — novelty gimmick, seasonal (Halloween) angle wrestler

## Promotions (suggested — 2)

- **Colosseum Championship Wrestling (CCW)** — historical/mythological flavor, "gods, conquerors, and
  legends" branding. Houses most of the Mythology, History & Legend rosters.
- **Wonderland Pro Wrestling (WPW)** — literature/pulp flavor, surreal/gothic branding ("every match
  is somebody's nightmare"). Houses most of the Literature and Cinema/Pulp rosters.

Split is a suggestion, not a requirement — a single-promotion pack is simpler to ship first.

## Build steps for the next agent

1. Re-read `.claude/skills/build-database/SKILL.md`, `schema/bbdb.schema.json`,
   `schema/meta.schema.json`, and `databases/_template/` before writing anything.
2. Copy `databases/_template/*` into this folder, rename `your-slug.bbdb` →
   `public-domain-classics.bbdb`.
3. Convert each roster line above into a `wrestlers.json` record matching the field set used in
   `databases/real-world-2026/real-world-2026.bbdb` (id, name, realName, picture, ability ratings,
   type, style, gender, base, birthplace, dateOfBirth, debut, presentation, cardPosition, masked,
   retired, dead, story). Ability numbers are booker judgment calls — use card position as the
   guide (main > upper > mid > lower).
4. Decide gender per entry from the source myth/history/lit (already implied by each name above);
   no separate gender-balancing pass needed per the confirmed brief.
5. Source or commission portrait art per the "legal caution" section above; name the host in
   `README.md`; keep `picture` values as bare filenames.
6. Build `promotions.json` for the 1–2 promotions above if going with that scope.
7. Fill `meta.json` (`title`, `author`, `version`, `tags` 1–8, `gameVersion` copied from
   `databases/_template/meta.json`, `license: "CC-BY-4.0"`).
8. Write `README.md` naming the image host and describing the pack.
9. Add `preview.png`/`.jpg`/`.webp` ≤512KB — original art or a plain color, no real logos.
10. Run `pnpm validate` from repo root; fix every reported error.
11. Import into DataStudio, open a promotion and a wrestler, confirm portraits resolve.
12. PR should touch only `databases/public-domain-classics/`.
