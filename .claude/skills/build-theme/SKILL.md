---
name: build-theme
description: Builds a Booker Blitz marketplace theme (.bbtheme) and its listing folder. Use when creating, editing, or submitting a theme, colour scheme, wallpaper, .bbtheme file, or themes/<slug> resource.
---

# Build a theme

A marketplace theme is one folder, `themes/<slug>/`. The `.bbtheme` is JSON. Colours are hex. Wallpapers are optional data URLs inside the file.

Run from the marketplace repo root; every path below is relative to it.

Read `schema/bbtheme.schema.json`, `schema/meta.schema.json`, and `themes/_template/` before writing. Copy colour keys from `themes/barbed-wire/barbed-wire.bbtheme` when you need the full palette.

## Choosing colours

The validator only checks that each value is `#rrggbb`. It cannot tell a readable palette from an unreadable one, so colour correctness is on you. The game derives every surface from three inputs, so pick them in this order.

**1. `mode` first.** Everything else depends on it.
- `dark`: `secondary` is darkened to make the page background, so it must be a **dark** colour (low lightness, any hue). A light `secondary` in dark mode gives a washed-out grey page.
- `light`: `secondary` is lightened, so it must be a **light** colour. A dark `secondary` in light mode gives a near-black page.

**2. `secondary` is the surface colour, not a brand colour.** It becomes the page background, cards, sidebar, popover and inputs (all derivatives of it). Keep it low-saturation so text and chips stay legible. Pick it before `primary` and `accent`.

**3. `primary` and `accent` are brand colours, rendered as text and fills.** `primary` is the ring, chart 1, sidebar primary and most links; `accent` is chart 3 and the sidebar accent. They must read against the background and the card. In light mode the game darkens them until they hit AA; in dark mode they are used verbatim, so avoid near-black values that vanish on a dark surface.

**4. `hueRotation` tints images, not the UI.** It is a CSS `hue-rotate()` applied to promotion logos, show/title art and portraits. `0` leaves artwork alone. Use it to pull artwork toward your palette; it never rescues a bad `primary`/`secondary`.

**5. Semantic colours are read as text.** `success` green, `warning` amber/orange, `money` gold/green. In light mode the game darkens them to AA; in dark mode use values that read on a dark surface.

**6. The stat scale is ordered: `statGreat` → `statBad` = green → lime → yellow → orange → red.** Never invert it. Keep the five steps distinct so a rating reads at a glance. (`themes/barbed-wire` shipped `statGreat: #d80303`, `statBad: #efe92e` — red for great, yellow for bad. The validator passed it; players saw inverted ratings.)

### Safe baseline (the game's own defaults)

| Key | Dark | Light |
|---|---|---|
| `success` | `#10b981` | `#047857` |
| `warning` | `#f59e0b` | `#a14a07` |
| `money` | `#4ade80` | `#166534` |
| `statGreat` | `#10b981` | `#047857` |
| `statGood` | `#84cc16` | `#3f6212` |
| `statAvg` | `#facc15` | `#854d0e` |
| `statLow` | `#f59e0b` | `#b23c0b` |
| `statBad` | `#ef2b2b` | `#b91c1c` |

Copy these unless the theme's identity needs otherwise; they are already AA-safe on the surfaces the game derives from a typical `secondary`.

### Recipe

1. Pick `mode`.
2. Pick `secondary` — dark for dark mode, light for light mode, low saturation.
3. Pick `primary` and `accent` as brand colours that read on that surface.
4. Leave `hueRotation` at `0` unless you are tinting artwork.
5. Copy the semantic/stat baseline above, or choose hues that keep the same green→red order.
6. Eyeball the result against the derived page background: dark mode ≈ `darken(secondary, 0.25)`, light mode ≈ `lighten(secondary, 0.4)`.

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

Then check the palette by eye against the rules above — `pnpm validate` cannot catch a wrong or unreadable colour.

Confirm in the game: Settings → Theme → Import, pick the `.bbtheme`, and check primary, accent, mode, and any wallpaper slots you set.

## Keep out

Real promotion logos and other trademarked art, including wallpapers and `preview.*`. Opening the PR means the author can share the work under CC BY 4.0.
