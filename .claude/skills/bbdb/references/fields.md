# .bbdb field reference

Source of truth: `src/types/game.ts` (`Wrestler`, `Promotion`, enums) and `src/types/bbdb.ts` in the booker-blitz repo. `node scripts/bbdb.mjs template <kind>` prints a fully populated example of each record.

"Default" is what `normalize` writes when the field is missing or invalid. Required fields with no default (`check` errors until you set them) are marked **req**.

## Envelope

```json
{"format": "bbdb", "version": 1, "name": "Display name", "exportedAt": "<ISO>", "files": {
  "promotions.json": [], "wrestlers.json": [],
  "save_meta.json": {"startDate": "2026-01-01", "imgPath": "", "themeKey": ""}
}}
```

Allowed `files` keys: `wrestlers.json`, `promotions.json`, `contracts.json` (legacy, ignored by the game; contracts live on the wrestler, and `normalize` embeds and drops it), `arenas.json`, `alliances.json` (arrays); `save_meta.json`, `datapack.json` (objects). The full JSON Schema is `schema/bbdb.schema.json`. `save_meta.startDate` pre-fills the New Game start date.

## Enums

| Enum | Values |
|---|---|
| `base` | Angola, Argentina, Australia, Austria, Belarus, Belgium, Brazil, Canada, Celebrity, Chile, China, Croatia, Czechia, Denmark, Egypt, Europe, France, Germany, Greece, Hungary, India, Iran, Ireland, Italy, Japan, Lithuania, Mexico, Mongolia, Netherlands, New Zealand, Nigeria, Norway, Other, Peru, Philippines, Poland, Portugal, Russia, Samoa, Senegal, South Africa, South Korea, Spain, Sweden, Switzerland, Turkey, UAE, UK, USA |
| `type` | wrestler, manager, commentator, interviewer, ring_announcer, referee, writer, businessperson, medic, scout, trainer |
| `gender` | M, F, O |
| `style` | technical, high flyer, powerhouse, striker, submission, hardcore, all rounder, comedy |
| `cardPosition` / title `card` | lower, mid, upper |
| `prestige` | low, mid, high |
| `presentation` | heel, face, tweener |
| `morale` | broken, poor, fair, good, great, excellent |
| `finisherType` | strike, submission, power, aerial, counter |
| `momentum` | frozen, low, medium, hot, burning |
| audience (`audienceSize`, `size`, `attendance`, `houseShowAttendance`) | small, medium, big |
| `weightClass` | super heavyweight, heavyweight, cruiserweight, female, hardcore |
| show `day` | monday … sunday |
| show `regularity` | single show, weekly, biweekly, monthly |
| PPV `date` | january … december (month the PPV runs) |
| facility `type` | arena, gym, medical_center, production_studio, training_facility, performance_center |
| contract `type` / `status` | exclusive, non-exclusive / active, expired, pending, terminated |
| `wageType` (wrestler and contract) | monthly, per-appearance |

## Wrestler (also every staff member)

| Field | Type | Default / rule |
|---|---|---|
| `id` | int | **req**, unique. `upsert` assigns the next free id |
| `name` | string | **req** (ring name) |
| `realName` | string | `name` |
| `nickname` | string | `""` |
| `type` | enum | `wrestler` |
| `promotionId` | int | **signed only**; omit for free agents (never `null`) |
| `base` | enum | `Other` |
| `gender` | enum | **req** |
| `weight` | int, lbs | `220` |
| `height` | int, cm | `183` |
| `dateOfBirth`, `debut` | ISO date | `1990-01-01`, DOB + 20y |
| `wage` | int, $ **per month** (per show if `wageType` is per-appearance) | from promotion level × card × role × merit (see SKILL.md *Wages and contracts*). Signed talent copies `contract.wage`; for free agents it is the asking wage at the level-5 rate |
| `wageType` | enum | Unit of `wage`; missing means monthly. Normalize copies it from the contract on signed talent |
| `popularity`, `charisma`, `micSkills`, `condition`, `hardcoreAbility`, `injuryProne` | 0–100 | 30, 50, 50, 100, 30, 20 |
| `ability` | 0–100 | 50 (staff 40) |
| `currentAbility` | 0–100 | `ability` |
| `potentialAbility` | 0–100 | `currentAbility`; never below it |
| `morale` | enum | `fair` |
| `presentation` | enum | `face` |
| `prestige` | enum | `low` |
| `style` | enum | `all rounder` |
| `cardPosition` | enum | `lower` |
| `finisher` | string | `""` (warned for wrestlers) |
| `finisherType` | enum | from style (technical→submission, high flyer→aerial, striker→strike, comedy→counter, else power) |
| `character` | string | `""` — short gimmick line, e.g. "Former actor turned brawler" |
| `acceptsIndieBookings`, `masked`, `retired`, `dead`, `inDevelopment` | bool | `false` |
| `story` | string | `""` (warned) — 2–4 sentence bio |
| `alterEgos` | string[] | `[]` |
| `birthplace` | string | `Unknown` |
| `managerId` | int | `0` = none, else a wrestler id (usually type `manager`) |
| `contractExpiryDate` | ISO date | **signed only**, equals `contract.endDate` |
| `contract` | object | **signed only**, generated if missing. See *Contract* below |
| `additionalContracts` | contract[] | optional. Further active non-exclusive deals with other promotions; they become contracts on a new game. Not allowed next to an exclusive `contract` |
| `record` | `{wins, losses, draws}` | zeros |
| `history` | `{matches, jobs, titles}` | empty arrays |
| `teams` | int[] | `[]` — recomputed at game start from `promotion.teams` |
| `staffAttributes` | object, 23 × 0–100 | all keys always present; the role's own attributes default to 65, others 40 (wrestlers 20) |
| `picture` | filename | `""` — e.g. `wrestler-0042.webp` |

`staffAttributes` keys, by role:
- businessperson: bookingLogic, productFit, brandBuilding, mediaHandling
- writer: bookingLogic, storytelling, productFit, matchLayout, psychology, workerManagement
- trainer: trainingIntensity, technicalCoaching, characterCoaching, teaching
- medic: diagnosis, rehabilitation, prevention
- referee: ruleKnowledge, positioning, reactionSpeed, consistency, awareness
- scout: judgement
- commentator: mediaHandling, brandBuilding, socialMediaSavvy
- interviewer: mediaHandling, socialMediaSavvy
- ring_announcer: mediaHandling
- other keys: riskTaking

Optional: `brandShowName` (the weekly show a worker is assigned to when the promotion splits brands; missing means they work every brand).

Runtime-only fields the game adds during play, which are left out of databases: `injury`, `suspension`, `returnDate`, `retirementDate`, `exclusiveShow`, `alsoWorksFor`, `allianceId`, `isWishlisted`, `negotiationCooldownUntil`, `growthProgress`, `brandAssignedAt`, `pendingBrandDebut`.

### Contract (`contract`, `additionalContracts[]`)

| Field | Type | Default / rule |
|---|---|---|
| `id` | string | `contract-bbdb-<wrestlerId>` (extra deals add `-<promotionId>`) |
| `wrestlerId`, `promotionId` | int | the worker's id; the promotion they work for |
| `startDate`, `endDate` | ISO date | `2025-07-01`; end spread 6–29 months after 2026-01-01, or `contractExpiryDate` |
| `wage` | int $ | per month, or per show for per-appearance; from the wage scale when missing |
| `wageType` | enum | always written. When the author gives neither `type` nor `wageType`, both come from the promotion size rule (level 6+ exclusive monthly; 4–5 top talent non-exclusive monthly; else non-exclusive per appearance). A `type` without a `wageType` keeps the game's legacy coupling: exclusive = monthly, non-exclusive = per appearance |
| `type` | enum | see `wageType`; extra deals must be `non-exclusive` |
| `status` | enum | `active` |
| `bookingsPerMonth` | int | per-appearance deals only, default `4`; removed from monthly deals |
| `noCompeteMonths` | int | exclusive deals only, at most 20% of the term in months; normalize converts `noCompeteDays` |
| `autoRenew`, `injuryGuarantee` | bool | optional; `injuryGuarantee` is dropped from monthly deals |

## Promotion

| Field | Type | Default / rule |
|---|---|---|
| `id` | int | **req**, unique |
| `fullName`, `shortName` | string | **req** |
| `base` | enum | `Other` |
| `level` | 1–10 | `1` (the shipped datapack runs 4–10; ≥7 gets two bookers, ≥8 three writers) |
| `logo` | filename | `""` |
| `balance` | int $ | `100000` (shipped range 25 000 – 50 000 000) |
| `momentum` | enum | `low` |
| `audienceSize` | enum | `small` |
| `enforceShowSplit` | bool | `false` |
| `houseShowAttendance` | enum | `small` |
| `houseShowCostLevel` | int $ | `5000` |
| `houseShowsPerMonth` | int | `4` |
| `houseShowsPrestige` | enum | `low` |
| `houseShowTicketPrice` | int $ | `20` |
| `houseShowRotation` | ref[] | `[]` |
| `keyStaff` | object | every list role present (`booker, writers, roadAgent, commentators, interviewer, ringAnnouncers, referees, medicTeam, scouts, trainers`); `owner`/`gm` single refs, present only when assigned |
| `shows`, `ppvs`, `titles`, `teams` | arrays | `[]` — see below |
| `storylines`, `tournaments` | arrays | `[]` |
| `facilities` | `{type, level 1–10}[]` | `[{type: "arena", level: 1}]` |
| `summary` | string | `""` |
| `externalUrl` | string | `""` |
| `history` | `{events, monthlyBalance, monthlyMomentum, departures, arrivals}` | empty arrays |

A ref is `{id, name, pic}`; `normalize` fills `name` and `pic` from the wrestler.

### Show (`shows[]`)
`name`, `logo`, `color` (`#d10a8f`), `day` (`monday`), `regularity` (`weekly`), `attendance` and `size` (promotion's `audienceSize`), `duration` minutes (`120`), `ticketPrice` (`25`), `prestige` (`mid`), `momentum` (promotion's), `rating` (`50`), `lastResults: []`, `history: []`, `keyStaff` (`writers, commentators, interviewer, ringAnnouncers, referees` arrays; empty ones are auto-filled from the roster at game start).
Optional, kept as written: `isDevelopment` (a development-brand show), `isDormant`, and for weekly shows under a brand split `isBrand`, `brandColorOverride`, `brandTitleNames` (company titles this brand owns; a title belongs to one brand at most).

### PPV (`ppvs[]`)
`name`, `logo`, `date` month (`march`), `attendance`, `size`, `duration` (`180`), `ticketPrice` (`50`), `prestige` (`mid`), `active` (`true`), `nextEvent` (recomputed from `date` at game start), `history: []`, `keyStaff` as for shows. Optional `brandShowName`: the brand this event belongs to (missing means company-wide).

### Title (`titles[]`)
`name`, `championName` (what the holder is called), `picture`, `card` (`mid`), `prestige` (`mid`), `gender` (`M`), `weightClass` (`female` if gender F, else `heavyweight`), `numberOfHolders` (1 singles, 2 tag, 3 trios), `tournament` (`false`), `champion: ref[]` (`[]` = vacant; champions should be signed to this promotion), `daysHeld` (`0`), `defences` (`0`), `history: []` (entries `{champion: [], date, defences: [], event: ""}`).
Optional: `isDevelopment` (the title books on development shows), `defenceFrequencyDays`, `interimOf` (parent title name), `isAllianceTitle`.

### Team (`teams[]`)
`id` (unique within the promotion), `name`, `promotionId` (forced to the parent promotion), `memberIds` (≥2 signed wrestlers or the team is dropped), `picture`, `prestige` (`mid`), `popularity` (`50`), `dateCreated` (`2026-01-01`).
