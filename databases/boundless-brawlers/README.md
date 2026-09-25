# Public Domain Classics

A wrestling roster of 121 legendary characters from mythology, classic literature, history, and early cinema — all reimagined as wrestling superstars. Every character is in the public domain.

## Contents

- **wrestlers.json**: 121 wrestlers and 30 staff split across two promotions
  - **Colosseum Championship Wrestling (CCW)**: 80 wrestlers, plus a crew of Olympians and ancient poets (Zeus, Athena, Homer, Themis, Chiron and others)
  - **Wonderland Pro Wrestling (WPW)**: 41 wrestlers, plus a crew from Victorian fiction (Phileas Fogg, Scheherazade, Dr. Watson, Inspector Lestrade and others)
- **promotions.json**: 2 themed promotions, each with weekly shows, four PPVs, five titles, and four tag teams or trios

## Image sources

**Portraits**: Placeholder filenames only. This database ships without pre-generated portraits.

To generate portraits, use the `prompts.md` file in this folder. Each character has an AI image generation prompt optimized for wrestling-card art. Generated images should be:

- Saved as `.jpg` files with names matching the wrestler's `picture` field
- Placed in an external image host (not embedded in the `.bbdb`)
- Confirmed to comply with the legal constraints in `BATTLEPLAN.md` (no copyrighted film designs, no real logos, original art or PD-licensed illustrations only)

## Gimmick themes

Characters are split by thematic promotion:

- **CCW (Colosseum Championship Wrestling)**: Gods, titans, legendary warriors, and historical conquerors
- **WPW (Wonderland Pro Wrestling)**: Gothic, surreal, and pulp storytelling — Dracula, Sherlock Holmes, the Wizard of Oz cast, and early cinema monsters

## Building on this pack

Refer to `BATTLEPLAN.md` and `prompts.md` for:
- Full roster list with card position and gimmick hooks
- Step-by-step build instructions
- Portrait generation prompts ready for AI art tools
- Legal cautions around trademark/copyright (important!)

