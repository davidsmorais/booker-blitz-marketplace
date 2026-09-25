---
name: build-database
description: Builds a Booker Blitz marketplace database (.bbdb) and its listing folder. Use when creating, editing, or submitting a database, roster, datapack, .bbdb file, or databases/<slug> resource.
---

# Build a database

A marketplace database is one folder, `databases/<slug>/`. The `.bbdb` is JSON. Images stay out of the file.

Read `schema/bbdb.schema.json`, `schema/meta.schema.json`, and `databases/_template/` before writing. Match record fields to an existing export such as `databases/real-world-2026/real-world-2026.bbdb`. Do not invent columns.

## Folder

Slug is lowercase kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

Copy `databases/_template` to `databases/<slug>/`, then rename `your-slug.bbdb` to `<slug>.bbdb`.

| File | Rule |
|---|---|
| `<slug>.bbdb` | Required. Valid JSON. 16 MB or smaller. |
| `meta.json` | `title`, `author`, `version`, `tags` (1–8), `gameVersion`, `license` exactly `CC-BY-4.0`. Title and author max 80 characters. |
| `README.md` | Non-empty. Name every image host. Say so if the pack ships no images. |
| `preview.png`, `preview.jpg`, or `preview.webp` | Exactly one. 512 KB or smaller. Your own art or a plain colour. No real logos. |

`gameVersion` is the Booker Blitz version you imported against. Copy it from `databases/_template/meta.json` when that still matches.

A pull request may touch only `databases/<slug>/`.

## Payload

```json
{
  "format": "bbdb",
  "version": 1,
  "name": "Display name",
  "exportedAt": "2026-09-25T00:00:00.000Z",
  "files": {}
}
```

`format` is `"bbdb"`. `version` is `1`. `name` is non-empty. No extra top-level keys.

`files` may only contain:

- Arrays: `wrestlers.json`, `promotions.json`, `contracts.json`, `arenas.json`, `alliances.json`
- Objects: `save_meta.json` (`startDate`, `imgPath`, `themeKey`), `datapack.json`

Include `wrestlers.json` or `promotions.json` (or both). Each array entry is an object.

`picture`, `logo`, and staff `pic` are filenames (`Damien Sandow.jpg`), not embedded images and not URLs. The file must not contain `data:image/`.

Prefer a DataStudio export (Export / Save) over hand-built records. If you edit records, keep ids consistent across wrestlers, promotions, contracts, and staff `pic` filenames.

## Checks

Run `pnpm validate` from the repo root. Fix every reported error before finishing.

Confirm in DataStudio: Import the `.bbdb`, open a promotion and a wrestler, and confirm portraits resolve from the host named in the README.

## Keep out

Real promotion logos and other trademarked art, including on `preview.*`. Wrestler and promotion names in the JSON are allowed. Opening the PR means the author can share the work under CC BY 4.0.
