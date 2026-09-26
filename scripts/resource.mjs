import { createHash } from "node:crypto"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { basename, extname, join } from "node:path"

export const REPO = "davidsmorais/booker-blitz-marketplace"
export const BOOKER_BLITZ_REPO = "davidsmorais/booker-blitz"
export const RAW_ROOT = `https://raw.githubusercontent.com/${REPO}/main`

export const githubHeaders = () => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "booker-blitz-marketplace",
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return headers
}
export const MAX_IMAGE_BYTES = 512 * 1024
export const MAX_BBDB_BYTES = 16 * 1024 * 1024
export const MAX_BBTHEME_BYTES = 8 * 1024 * 1024
export const MAX_README_CHARS = 12_000
export const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"])
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
export const THEME_SLOTS = [
  "wp/1.png",
  "wp/2.png",
  "wp/3.png",
  "wp/4.png",
  "wp/5.png",
  "wp/contract-table.png",
]
export const BBDB_ARRAY_FILES = [
  "wrestlers.json",
  "promotions.json",
  "contracts.json",
  "arenas.json",
  "alliances.json",
]
export const BBDB_OBJECT_FILES = ["save_meta.json", "datapack.json"]

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex")

export const excerpt = (markdown) => {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return plain.length > 280 ? `${plain.slice(0, 279)}…` : plain
}

const push = (errors, message) => {
  errors.push(message)
}

export const validateMeta = (meta) => {
  const errors = []
  if (!isRecord(meta)) return ["meta.json must be a JSON object"]
  if (typeof meta.title !== "string" || meta.title.trim().length === 0)
    push(errors, "meta.json title is missing")
  if (typeof meta.author !== "string" || meta.author.trim().length === 0)
    push(errors, "meta.json author is missing")
  if (typeof meta.version !== "string" || meta.version.trim().length === 0)
    push(errors, "meta.json version is missing")
  if (typeof meta.gameVersion !== "string" || meta.gameVersion.trim().length === 0)
    push(errors, "meta.json gameVersion is missing")
  if (meta.license !== "CC-BY-4.0")
    push(errors, "meta.json license must be CC-BY-4.0")
  if (!Array.isArray(meta.tags) || meta.tags.length === 0 || meta.tags.some((tag) => typeof tag !== "string" || tag.trim().length === 0))
    push(errors, "meta.json tags must be a non-empty list of strings")
  if (meta.imageSetUrl !== undefined && (typeof meta.imageSetUrl !== "string" || meta.imageSetUrl.trim().length === 0))
    push(errors, "meta.json imageSetUrl must be a non-empty string")
  if (meta.verified !== undefined && typeof meta.verified !== "boolean")
    push(errors, "meta.json verified must be a boolean")
  return errors
}

export const validateThemePayload = (data) => {
  const errors = []
  if (!isRecord(data)) return ["Theme file must be a JSON object"]
  if (data.format !== "bbtheme") push(errors, "Not a .bbtheme file (bad format marker)")
  if (data.version !== 1) push(errors, "Unsupported theme version (expected 1)")
  if (typeof data.name !== "string" || data.name.trim().length === 0)
    push(errors, "Theme must have a non-empty name")
  if (!isRecord(data.colors)) {
    push(errors, "Theme must include a colors object")
    return errors
  }
  for (const key of ["primary", "secondary", "accent"]) {
    if (!HEX_COLOR.test(data.colors[key] ?? ""))
      push(errors, `colors.${key} must be a #rrggbb hex color`)
  }
  if (typeof data.colors.hueRotation !== "number" || data.colors.hueRotation < 0 || data.colors.hueRotation > 360)
    push(errors, "colors.hueRotation must be a number between 0 and 360")
  if (data.colors.mode !== undefined && data.colors.mode !== "light" && data.colors.mode !== "dark")
    push(errors, "colors.mode must be 'light' or 'dark'")
  if (data.backgrounds !== undefined) {
    if (!isRecord(data.backgrounds)) push(errors, "backgrounds must be an object")
    else {
      for (const [slot, value] of Object.entries(data.backgrounds)) {
        if (!THEME_SLOTS.includes(slot)) push(errors, `Unknown background slot: ${slot}`)
        if (typeof value !== "string" || !value.startsWith("data:image/") || !value.includes(";base64,"))
          push(errors, `Background ${slot} must be a data:image URL`)
      }
    }
  }
  return errors
}

export const validateDatabasePayload = (data, rawText) => {
  const errors = []
  if (rawText.includes("data:image/"))
    push(errors, "Database must not embed images. Host them elsewhere and name the hosts in the README")
  if (!isRecord(data)) return ["Database file must be a JSON object", ...errors]
  if (data.format !== "bbdb") push(errors, "Not a .bbdb file (bad format marker)")
  if (data.version !== 1) push(errors, "Unsupported database version (expected 1)")
  if (typeof data.name !== "string" || data.name.trim().length === 0)
    push(errors, "Database must have a non-empty name")
  if (!isRecord(data.files)) {
    push(errors, "Database must include a files object")
    return errors
  }
  for (const fileName of BBDB_ARRAY_FILES) {
    const value = data.files[fileName]
    if (value === undefined) continue
    if (!Array.isArray(value)) push(errors, `${fileName} must be an array`)
    else if (value.some((item) => !isRecord(item)))
      push(errors, `${fileName} entries must be objects`)
  }
  for (const fileName of BBDB_OBJECT_FILES) {
    const value = data.files[fileName]
    if (value !== undefined && !isRecord(value))
      push(errors, `${fileName} must be an object`)
  }
  const unknown = Object.keys(data.files).filter(
    (name) => !BBDB_ARRAY_FILES.includes(name) && !BBDB_OBJECT_FILES.includes(name),
  )
  for (const name of unknown) push(errors, `Unknown database file: ${name}`)
  if (!data.files["wrestlers.json"] && !data.files["promotions.json"])
    push(errors, "Database has no wrestlers.json or promotions.json")
  return errors
}

export const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"))

export const findPreview = (dir) => {
  const matches = readdirSync(dir).filter((name) => {
    const ext = extname(name).toLowerCase()
    return name.startsWith("preview.") && IMAGE_EXTS.has(ext)
  })
  return matches.length === 1 ? matches[0] : matches
}

export const validateResourceDir = (dir, kind) => {
  const errors = []
  const slug = basename(dir)
  if (!SLUG_PATTERN.test(slug)) push(errors, `Slug "${slug}" must be lowercase kebab-case`)

  const payloadName = `${slug}.${kind === "theme" ? "bbtheme" : "bbdb"}`
  const payloadPath = join(dir, payloadName)
  const readmePath = join(dir, "README.md")
  const metaPath = join(dir, "meta.json")

  let payloadStat
  try {
    payloadStat = statSync(payloadPath)
  } catch {
    push(errors, `Missing payload ${payloadName}`)
  }

  let readme = ""
  try {
    readme = readFileSync(readmePath, "utf8")
    if (readme.trim().length === 0) push(errors, "README.md is empty")
  } catch {
    push(errors, "Missing README.md")
  }

  const preview = findPreview(dir)
  if (Array.isArray(preview)) {
    if (preview.length === 0) push(errors, "Missing preview.png, preview.jpg, or preview.webp")
    else push(errors, "Only one preview image is allowed")
  } else {
    const imagePath = join(dir, preview)
    const imageStat = statSync(imagePath)
    if (imageStat.size > MAX_IMAGE_BYTES)
      push(errors, `Preview image is over ${MAX_IMAGE_BYTES} bytes`)
    if (imageStat.size === 0) push(errors, "Preview image is empty")
  }

  try {
    const meta = readJson(metaPath)
    errors.push(...validateMeta(meta))
  } catch {
    push(errors, "Missing or invalid meta.json")
  }

  if (payloadStat) {
    const cap = kind === "theme" ? MAX_BBTHEME_BYTES : MAX_BBDB_BYTES
    if (payloadStat.size > cap) push(errors, `${payloadName} is over ${cap} bytes`)
    try {
      const raw = readFileSync(payloadPath, "utf8")
      const data = JSON.parse(raw)
      errors.push(...(kind === "theme" ? validateThemePayload(data) : validateDatabasePayload(data, raw)))
    } catch {
      push(errors, `${payloadName} is not valid JSON`)
    }
  }

  return errors
}

export const listResourceDirs = (root, folder) => {
  try {
    return readdirSync(join(root, folder), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
      .map((entry) => join(root, folder, entry.name))
  } catch {
    return []
  }
}
