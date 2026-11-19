// Usage: node scripts/theme-images.mjs <embed|extract> [slug...]
// extract: write each data-URL wallpaper to themes/<slug>/wp/<name>.<ext> and point the .bbtheme at the file.
// embed:   inline those files back into the .bbtheme as data URLs (required for validate/manifest).
import fs from "node:fs"
import path from "node:path"

const THEMES = path.resolve(import.meta.dirname, "..", "themes")
const MIME_TO_EXT = { png: "png", jpeg: "jpg", webp: "webp" }
const EXT_TO_MIME = { png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp" }

const [mode, ...args] = process.argv.slice(2)
if (mode !== "embed" && mode !== "extract") {
  console.error("Usage: theme-images <embed|extract> [slug...]")
  process.exit(1)
}

const slugs = args.length
  ? args
  : fs
      .readdirSync(THEMES, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name)

let failed = false

for (const slug of slugs) {
  const dir = path.join(THEMES, slug)
  const file = path.join(dir, `${slug}.bbtheme`)
  if (!fs.existsSync(file)) {
    console.error(`${slug}: ${slug}.bbtheme not found`)
    failed = true
    continue
  }
  const theme = JSON.parse(fs.readFileSync(file, "utf8"))
  const bgs = theme.backgrounds
  if (!bgs) continue
  let count = 0

  for (const [key, value] of Object.entries(bgs)) {
    if (mode === "extract") {
      const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/s.exec(value)
      if (!m) continue
      const rel = `${key.replace(/\.png$/, "")}.${MIME_TO_EXT[m[1]]}`
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
      fs.writeFileSync(path.join(dir, rel), Buffer.from(m[2], "base64"))
      bgs[key] = rel
    } else {
      if (value.startsWith("data:")) continue
      const mime = EXT_TO_MIME[path.extname(value).slice(1).toLowerCase()]
      const src = path.join(dir, value)
      if (!mime || !fs.existsSync(src)) {
        console.error(`${slug}: cannot embed ${key} -> ${value}`)
        failed = true
        continue
      }
      bgs[key] = `data:image/${mime};base64,${fs.readFileSync(src).toString("base64")}`
    }
    count++
  }

  if (count) {
    fs.writeFileSync(file, `${JSON.stringify(theme, null, 2)}\n`)
    console.log(`${slug}: ${mode} ${count} image(s)`)
  }
}

process.exit(failed ? 1 : 0)
