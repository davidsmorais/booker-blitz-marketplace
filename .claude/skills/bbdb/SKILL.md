---
name: bbdb
description: Create and update Booker Blitz databases (.bbdb) — add, edit, sign, release or remove wrestlers, staff and promotions, add shows, PPVs, titles and teams, and fix a .bbdb so it loads in the game with every wrestler and promotion field populated. Use for /bbdb, "make a database", "add wrestlers to the .bbdb", "new promotion", "fix this bbdb", "database won't load", or any hand edit of wrestlers.json / promotions.json inside a .bbdb.
---

# /bbdb — build and update Booker Blitz databases

A `.bbdb` is one JSON file: an envelope around the datapack's `promotions.json` and `wrestlers.json`. The game's New Game → Custom DB → `.bbdb` import feeds both arrays straight into the game with **no repair step**, so a missing array or a bad enum crashes the game or quietly breaks it. Every change you make goes through the CLI below, which fills every field and checks the file against the game's rules.

```bash
BBDB=.claude/skills/bbdb/scripts/bbdb.mjs   # Node 18+, no install
```

| Command | What it does |
|---|---|
| `node $BBDB new <file> --name "Name" [--start-date 2026-01-01]` | Empty, valid database |
| `node $BBDB template <wrestler\|staff\|promotion\|show\|ppv\|title\|team>` | Print a fully populated record to copy |
| `node $BBDB upsert <file> <wrestlers\|promotions> <records.json>` | Add or update records by `id` (no `id` = new, next free id), then normalize + check |
| `node $BBDB remove <file> <wrestlers\|promotions> <id...>` | Delete, and scrub references (keyStaff, champions, teams, managers; a removed promotion's talent becomes free agents) |
| `node $BBDB normalize <file>` | Fill every missing field with a safe default, fix contracts, sync staff refs, canonical key order |
| `node $BBDB check <file> [--strict]` | Errors (won't load / will misbehave) and warnings (thin content). Exit 1 on errors |
| `node $BBDB stats <file>` | Roster per promotion by type, shows/PPVs/titles/teams |

## Workflow

1. **Locate or create.** Marketplace databases live at `databases/<slug>/<slug>.bbdb`. For a new one, copy `databases/_template` (see the `build-database` skill for `meta.json`, README and preview rules), then `node $BBDB new databases/<slug>/<slug>.bbdb --name "Display Name"` after deleting the template's `your-slug.bbdb`.
2. **Read before writing.** Run `stats` and `check` on an existing file first so you know what is already broken. Read [references/fields.md](references/fields.md) before authoring records — it lists every field, its enum values and its default.
3. **Write records as partial JSON** in a scratch file and `upsert` them. You only need the fields you care about; normalize fills the rest. On an existing record, nested objects (`record`, `keyStaff`, `history`) merge one level deep but **arrays replace wholesale** — to add a title or show, send the promotion's full `titles`/`shows` array. Put creative content in: `name`, `gender`, `style`, `cardPosition`, `presentation`, `base`, stats, `finisher`, `story`, `picture`. Leave out `id` for new records.
4. **Promotions need a playable shape**: at least one weekly show, a few PPVs, titles for each division you have (men, women, tag), and signed staff — referees, commentators, a writer, and a businessperson as owner. A promotion without them loads but plays badly (`check` warns).
5. **Run `check` until it reports 0 errors.** Treat warnings as a to-do list (empty `finisher`, empty `story`, no titles, ages outside 16–80).
6. **Prove it loads** when you can reach the game repo — see *Verify in the game* below. Then follow `build-database` for the listing checks (`pnpm validate`).

Editing the JSON by hand is fine for bulk creative work (stories, finishers), as long as you run `normalize` then `check` afterwards.

## Rules the game enforces (and the CLI handles)

- **Every field present.** Wrestlers carry all of `WRESTLER_KEYS`, promotions all of `PROMOTION_KEYS`, including empty ones (`nickname: ""`, `alterEgos: []`, `history: {…: []}`, `staffAttributes` with all 23 keys). `shows`, `ppvs`, `titles`, `teams`, `storylines`, `tournaments` must be arrays — the game calls `.map` on them.
- **Absent, never `null`, for "none".** The game tests `promotionId === undefined` for free agents and `keyStaff.gm !== undefined` for staffing. So `promotionId`, `contract`, `contractExpiryDate` exist only on signed talent, and `keyStaff.owner` / `keyStaff.gm` exist only when assigned. To release someone with `upsert`, send `"promotionId": null` — the CLI turns that into removing all three.
- **Signed talent has an active `contract`** whose `wrestlerId` and `promotionId` match. The contract wins over `promotionId` if they disagree. Normalize creates one (spread expiries, wage from card position) when missing. Contract dates are relative to 2026-01-01; the game shifts them to the chosen start date.
- **Enums are exact, lowercase strings** from `src/types/game.ts` — `cardPosition` is `lower|mid|upper` (no `main`), `morale` has no `confident`, `base` is a fixed country list (use `Other`, not an invented realm). Normalize maps case differences and replaces unknown values with defaults; `check` names the field so you can pick the right value yourself.
- **Units:** `weight` in lbs (typical 180–320), `height` in cm. **Dates** are ISO strings. Ages drive retirement and decline: a legend "born" in 1382 retires on day one, so give fictional or historical characters a working age (roughly 22–45 for wrestlers).
- **Staff are wrestler records** with `type` = `referee`, `commentator`, `writer`, `businessperson`, etc. and `staffAttributes`. `keyStaff` entries are `{id, name, pic}` refs; supply just `{id}` and normalize fills `name`/`pic`. If a promotion's `keyStaff` is entirely empty the game auto-assigns signed staff by type when a game starts.
- **Images are filenames** (`wrestler-0042.webp`, `ccw.png`) — never URLs, paths or `data:` URIs.
- **Only `wrestlers.json`, `promotions.json` and `alliances.json` reach the game.** `contracts.json` and `arenas.json` are ignored by New Game, but DataStudio writes them to disk on import — a re-export from DataStudio can drag in the default datapack's contracts. `check` errors on contracts that point at missing wrestlers/promotions; delete the file.
- **Team ids** only need to be unique inside their promotion; teams with fewer than 2 signed members are dropped at game start. Wrestler `teams` is recomputed at game start, leave it `[]`.

## Verify in the game

From a booker-blitz checkout, this runs the exact New Game code path (`parseBbDbFile` → `createNewGameData`) for every promotion:

```bash
cd ~/Projects/booker-blitz
cat > src/utils/bbdbSmoke.tmp.test.ts <<'EOF'
import {readFileSync} from 'node:fs'
import {expect, it} from 'vitest'
import {createNewGameData} from '~Contexts/Game/utils/createNewGameData'
import {getBbDbMeta, parseBbDbFile} from '~Types/bbdb'
import type {Promotion, Wrestler} from '~Types/game'

it('starts a game as every promotion', () => {
	const parsed = parseBbDbFile(readFileSync(process.env.BBDB_FILE as string, 'utf8'))
	if (!parsed.ok) throw new Error(parsed.error)
	const promotions = parsed.db.files['promotions.json'] as Promotion[]
	const date = new Date(getBbDbMeta(parsed.db).startDate ?? '2026-01-01')
	for (const p of promotions) {
		const {enrichedGameData} = createNewGameData({
			gameData: {promotion: p.id, name: 's', playerName: 's', picture: '', slot: 1, dateSaved: date, ingameDate: date, gameStartDate: date},
			promotions: structuredClone(promotions),
			wrestlers: structuredClone(parsed.db.files['wrestlers.json']) as Wrestler[],
			defaultDate: date
		})
		expect(enrichedGameData.promotionName).toBe(p.fullName)
	}
})
EOF
BBDB_FILE=/abs/path/to/file.bbdb npx vitest run src/utils/bbdbSmoke.tmp.test.ts; rm src/utils/bbdbSmoke.tmp.test.ts
```

Delete the temp test afterwards — it is not part of the game's suite. For a final manual check, import the file in the game (New Game → Custom DB → Import .bbdb) and in DataStudio.

## Don'ts

- Don't invent fields. Unknown keys get a `check` warning; the game ignores them and DataStudio may drop them.
- Don't renumber existing ids — contracts, keyStaff, champions, teams and portraits all point at them. Use `remove` + `upsert` if you must.
- Don't write `null` into optional fields other than via `upsert`'s release shortcut.
- Don't ship local paths in `save_meta.json` (`imgPath`); marketplace databases keep it `""`.
