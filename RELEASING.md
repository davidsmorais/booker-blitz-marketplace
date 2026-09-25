# Releasing DataStudio

DataStudio is built in the game repo and uploaded by hand. There is no release CI. Installers are unsigned.

## Checklist

1. In `~/Projects/booker-blitz`, build the DataStudio installers (`.exe`, `.dmg`, `.AppImage`).
2. Write checksums beside them (`sha256sum` into `checksums.txt`).
3. From this repo, run `pnpm release:datastudio` (reads and updates `datastudio/CHANGELOG.md` in booker-blitz when `../booker-blitz` or `BOOKER_BLITZ_ROOT` is present; otherwise reads it from GitHub).
4. Confirm the version, then upload the three installers plus `checksums.txt` to the draft GitHub Release and publish it.
5. The script tags `datastudio-vX.Y.Z`, pushes the tag, opens the draft release, and commits an updated `manifest.json` when the release is visible to the manifest builder.
6. Open bookerblitz.com/resources and confirm the version and the three download buttons.

The manifest matches installers by extension (`.exe`, `.dmg`, `.AppImage`), not by the exact filename. It uses the newest `datastudio-v*` release.

## Install notes shown on the site

- Windows SmartScreen: More info, then Run anyway.
- macOS Gatekeeper: right-click the app, Open, then Open again.
- Linux: `chmod +x` the AppImage, then run it.
