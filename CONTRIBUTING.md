# Contributing

Themes and databases here are fan-made and unofficial. They are not affiliated with, endorsed by, or licensed by any wrestling promotion, broadcaster, or wrestler.

## Licence

- Repo tooling: MIT (`LICENSE`).
- Your submission: CC BY 4.0 (`license` in `meta.json`). Opening the pull request means you have the right to share the work and to let other people credit and reuse it.

## What to include

One folder, `themes/<slug>/` or `databases/<slug>/`:

| File | Required |
|---|---|
| `<slug>.bbtheme` or `<slug>.bbdb` | Yes. Must match `schema/bbtheme.schema.json` or `schema/bbdb.schema.json`. |
| `README.md` | Yes. Non-empty. For databases, name every image host. |
| `preview.png` / `.jpg` / `.webp` | Yes. One image, 512 KB or smaller. |
| `meta.json` | Yes. Title, author, version, tags, `gameVersion`, `license: "CC-BY-4.0"`. |

Databases are a single JSON file. Do not embed images. Size cap is 2 MB. Themes cap at 8 MB, matching the game.

## What stays out of the repo

- Real promotion logos and other trademarked art, including on the preview image.
- Anyone else's work you do not have permission to share.

Real wrestlers and promotions may be named in the data. The preview and any file stored in git must be your own art, a plain colour, or something you can licence.

## Takedown

Email bookerblitz@darkmagicstudios.com with the folder path and why it should come down. The maintainer removes the folder and rebuilds the manifest.

## Pull requests

Use the theme or database template. The check fails, and comments on the PR, when the title, README, or preview is missing, the payload does not match the schema, or the PR touches anything outside that one folder.
