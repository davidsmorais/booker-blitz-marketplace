# Releasing DataStudio

DataStudio is built by GitHub Actions on this repo, from the private `booker-blitz` repo. Installers are unsigned. This repo is public, so the Windows, macOS and Linux runners cost no private Actions minutes.

## Checklist

1. In `~/Projects/booker-blitz`, bump `datastudio/version.json` and the changelog, and push it to `master`. Do not rely on the private repo's tag-triggered CI.
2. From this repo, run `pnpm deploy:datastudio`.
3. The script reads the version from booker-blitz at the chosen ref and dispatches `.github/workflows/datastudio-build.yml`. It prints the run URL.
4. The workflow checks out booker-blitz with `BOOKER_BLITZ_TOKEN`, builds `.exe`, `.dmg` and `.AppImage`, attaches them to the `datastudio-vX.Y.Z` release here, publishes it and rebuilds `manifest.json`.
5. Open bookerblitz.com/resources and confirm the version and the three download buttons.

Options: `--ref <branch|tag|sha>` builds something other than `master`, `--watch` follows the run, `--dry-run` only prints what it would do.

## Secrets

Add in this repo under Settings, Secrets and variables, Actions:

| Secret | What |
| --- | --- |
| `BOOKER_BLITZ_TOKEN` | Fine-grained PAT, resource owner `davidsmorais`, repository `booker-blitz` only, permission Contents: Read-only. |

Uploading the release and committing `manifest.json` use the built-in `GITHUB_TOKEN`.

## Manual flow (legacy)

`pnpm release:datastudio` still tags this repo and opens a draft release, for when installers are built by hand and uploaded. The manifest matches installers by extension (`.exe`, `.dmg`, `.AppImage`), not by the exact filename. It uses the newest `datastudio-v*` release.

## Install notes shown on the site

- Windows SmartScreen: More info, then Run anyway.
- macOS Gatekeeper: right-click the app, Open, then Open again.
- Linux: `chmod +x` the AppImage, then run it.
