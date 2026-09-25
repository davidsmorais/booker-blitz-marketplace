# Releasing DataStudio

DataStudio is built in the game repo and uploaded by hand. There is no release CI. Installers are unsigned.

## Checklist

1. In `~/Projects/booker-blitz`, build the DataStudio installers (`.exe`, `.dmg`, `.AppImage`).
2. Write checksums beside them (`sha256sum` into `checksums.txt`).
3. Tag this repo `datastudio-vX.Y.Z` (the `datastudio-v` prefix is required).
4. Publish a GitHub Release on that tag and upload the three installers plus `checksums.txt`.
5. Confirm `manifest.yml` commits an updated `manifest.json` with the new asset URLs.
6. Open bookerblitz.com/resources and confirm the version and the three download buttons.

The manifest matches installers by extension (`.exe`, `.dmg`, `.AppImage`), not by the exact filename. It uses the newest `datastudio-v*` release.

## Install notes shown on the site

- Windows SmartScreen: More info, then Run anyway.
- macOS Gatekeeper: right-click the app, Open, then Open again.
- Linux: `chmod +x` the AppImage, then run it.
