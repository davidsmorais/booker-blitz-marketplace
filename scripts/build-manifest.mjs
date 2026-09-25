import { readFileSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import {
  RAW_ROOT,
  REPO,
  excerpt,
  findPreview,
  listResourceDirs,
  readJson,
  sha256,
  validateResourceDir,
} from "./resource.mjs"

const root = resolve(process.cwd())
const MAX_README = 12_000

const entryFor = (dir, kind) => {
  const problems = validateResourceDir(dir, kind)
  if (problems.length > 0) {
    throw new Error(`${dir}:\n${problems.join("\n")}`)
  }
  const slug = basename(dir)
  const ext = kind === "theme" ? "bbtheme" : "bbdb"
  const folder = kind === "theme" ? "themes" : "databases"
  const payloadPath = join(dir, `${slug}.${ext}`)
  const payload = readFileSync(payloadPath)
  const meta = readJson(join(dir, "meta.json"))
  const readme = readFileSync(join(dir, "README.md"), "utf8").slice(0, MAX_README)
  const previewName = findPreview(dir)
  return {
    title: meta.title.trim(),
    author: meta.author.trim(),
    slug,
    version: meta.version.trim(),
    tags: meta.tags.map((tag) => tag.trim()),
    gameVersion: meta.gameVersion.trim(),
    license: meta.license,
    readme,
    readmeExcerpt: excerpt(readme),
    downloadUrl: `${RAW_ROOT}/${folder}/${slug}/${slug}.${ext}`,
    imageUrl: `${RAW_ROOT}/${folder}/${slug}/${previewName}`,
    sha256: sha256(payload),
    size: payload.length,
  }
}

const osFor = (name) => {
  const lower = name.toLowerCase()
  if (lower.endsWith(".exe")) return "windows"
  if (lower.endsWith(".dmg")) return "mac"
  if (lower.endsWith(".appimage")) return "linux"
  return null
}

const previousDatastudio = () => {
  try {
    return readJson(join(root, "manifest.json")).datastudio
  } catch {
    return { version: null, date: null, assets: [] }
  }
}

const fetchDatastudio = async () => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "booker-blitz-marketplace",
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, { headers })
  if (!response.ok) {
    console.warn(`[manifest] GitHub releases returned ${response.status}; keeping the previous DataStudio block`)
    return previousDatastudio()
  }
  const releases = await response.json()
  const release = releases.find((item) => typeof item.tag_name === "string" && item.tag_name.startsWith("datastudio-v"))
  if (!release) return { version: null, date: null, assets: [] }
  const assets = (release.assets ?? [])
    .map((asset) => {
      const os = osFor(asset.name)
      if (!os) return null
      return {
        name: asset.name,
        url: asset.browser_download_url,
        sha256: null,
        size: asset.size ?? 0,
        os,
      }
    })
    .filter(Boolean)
  return {
    version: release.tag_name.replace(/^datastudio-v/, ""),
    date: release.published_at ?? null,
    assets,
  }
}

const themes = listResourceDirs(root, "themes").map((dir) => entryFor(dir, "theme"))
const databases = listResourceDirs(root, "databases").map((dir) => entryFor(dir, "database"))
const datastudio = await fetchDatastudio()

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  themes,
  databases,
  datastudio,
}

writeFileSync(join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`[manifest] ${themes.length} theme(s), ${databases.length} database(s), ${datastudio.assets.length} installer(s)`)
