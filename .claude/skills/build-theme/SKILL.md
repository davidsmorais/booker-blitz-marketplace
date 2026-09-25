---
name: build-theme
description: Builds a Booker Blitz marketplace theme (.bbtheme) and its listing folder. Use when creating, editing, or submitting a theme, colour scheme, wallpaper, .bbtheme file, or themes/<slug> resource.
---

# Build a theme

A marketplace theme is one folder, `themes/<slug>/`. The `.bbtheme` is JSON. Colours are hex. Wallpapers are optional data URLs inside the file.

Read `schema/bbtheme.schema.json`, `schema/meta.schema.json`, and `themes/_template/` before writing. Copy colour keys from `themes/barbed-wire/barbed-wire.bbtheme` when you need the full palette.

## Folder

Slug is lowercase kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

Copy `themes/_template` to `themes/<slug>/`, then rename `your-slug.bbtheme` to `<slug>.bbtheme`.

| File | Rule |
|---|---|
| `<slug>.bbtheme` | Required. Valid JSON. 8 MB or smaller. |
| `meta.json` | `title`, `author`, `version`, `tags` (1–8), `gameVersion`, `license` exactly `CC-BY-4.0`. Title and author max 80 characters. |
| `README.md` | Non-empty. Say what the theme changes and that import is Settings → Theme → Import. |
| `preview.png`, `preview.jpg`, or `preview.webp` | Exactly one. 512 KB or smaller. Your own art or a plain colour. No real logos. |

`gameVersion` is the Booker Blitz version you imported against. Copy it from `themes/_template/meta.json` when that still matches.

A pull request may touch only `themes/<slug>/`.

## Payload

```json
{
  "format": "bbtheme",
  "version": 1,
  "name": "Display name",
  "colors": {
    "primary": "#171002",
    "secondary": "#130101",
    "accent": "#b75e0b",
    "hueRotation": 0,
    "mode": "dark"
  }
}
```

`format` is `"bbtheme"`. `version` is `1`. `name` is non-empty. No extra top-level keys.

`colors` allows only these keys. Every colour is `#` plus six hex digits.

| Key | Required |
|---|---|
| `primary`, `secondary`, `accent` | Yes |
| `hueRotation` | Yes. Number from 0 to 360. |
| `mode` | No. `"light"` or `"dark"`. |
| `success`, `warning`, `money`, `statGreat`, `statGood`, `statAvg`, `statLow`, `statBad` | No |

`backgrounds` is optional. Keys must be exactly:

- `wp/1.png`
- `wp/2.png`
- `wp/3.png`
- `wp/4.png`
- `wp/5.png`
- `wp/contract-table.png`

The key names stay those strings even when the image is JPEG or WebP. Each value is `data:image/<mime>;base64,...` (`png`, `jpeg`, or `webp`). Omit a slot to keep the game default. Resize images so the whole file stays under 8 MB.

## Checks

Run `pnpm validate` from the repo root. Fix every reported error before finishing.

Confirm in the game: Settings → Theme → Import, pick the `.bbtheme`, and check primary, accent, mode, and any wallpaper slots you set.

## Keep out

Real promotion logos and other trademarked art, including wallpapers and `preview.*`. Opening the PR means the author can share the work under CC BY 4.0.
