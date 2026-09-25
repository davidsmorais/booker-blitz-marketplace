# Booker Blitz Marketplace

Community themes (`.bbtheme`) and databases (`.bbdb`) for [Booker Blitz](https://bookerblitz.com), plus the DataStudio installers published as GitHub Releases.

The tooling in this repo is MIT. Each submission is CC BY 4.0. You confirm you have the right to share it.

## Install a theme or database

1. Open [bookerblitz.com/resources](https://bookerblitz.com/resources) and download a file.
2. Themes: in the game, Settings → Theme → Import, and pick the `.bbtheme`.
3. Databases: in DataStudio, Import, and pick the `.bbdb`. Portraits and logos are not inside the file. The resource README names the image host.

## Submit

Copy `themes/_template` or `databases/_template` to `themes/<your-slug>` or `databases/<your-slug>`. Open a pull request with the matching template.

A resource folder contains:

- `<slug>.bbtheme` or `<slug>.bbdb`
- `README.md` (what it is, and where database images live)
- `preview.png`, `preview.jpg`, or `preview.webp`
- `meta.json` with `title`, `author`, `version`, `tags`, `gameVersion`, and `license`

Automated checks reject a pull request that is missing a title, README, or preview image, that fails the schema, or that edits more than its own folder. Merging to `main` rebuilds `manifest.json`.

## DataStudio

Installers are uploaded by hand. See `RELEASING.md`. Tag pattern: `datastudio-vX.Y.Z`. The manifest picks the newest tag and matches `.exe`, `.dmg`, and `.AppImage` by extension.
