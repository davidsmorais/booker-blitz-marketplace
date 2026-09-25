import { execSync } from "node:child_process"
import { resolve } from "node:path"
import { listResourceDirs, validateResourceDir } from "./resource.mjs"

const root = resolve(process.argv[2] ?? process.cwd())

const changedFiles = () => {
  const base = process.env.GITHUB_BASE_REF
  if (!base) return null
  try {
    const out = execSync(`git diff --name-only origin/${base}...HEAD`, {
      cwd: root,
      encoding: "utf8",
    })
    return out.split("\n").map((line) => line.trim()).filter(Boolean)
  } catch {
    return null
  }
}

const resourceSlug = (file) => {
  const match = file.match(/^(themes|databases)\/([^/]+)\//)
  return match ? `${match[1]}/${match[2]}` : null
}

const errors = []
const changed = changedFiles()

if (changed) {
  const slugs = new Set(changed.map(resourceSlug).filter(Boolean))
  const outside = changed.filter((file) => !resourceSlug(file))
  if (outside.length > 0)
    errors.push(`Pull request may only touch one resource folder. Other files: ${outside.join(", ")}`)
  if (slugs.size > 1)
    errors.push(`Pull request touches more than one resource: ${[...slugs].join(", ")}`)
  if (slugs.size === 0 && outside.length === 0)
    errors.push("Pull request does not contain a themes/<slug>/ or databases/<slug>/ folder")
}

const dirs = [
  ...listResourceDirs(root, "themes").map((dir) => ({ dir, kind: "theme" })),
  ...listResourceDirs(root, "databases").map((dir) => ({ dir, kind: "database" })),
]

if (dirs.length === 0) errors.push("No themes or databases to validate")

for (const { dir, kind } of dirs) {
  if (changed) {
    const folder = dir.slice(root.length + 1).replaceAll("\\", "/")
    const touched = changed.some((file) => file.startsWith(`${folder}/`) || file === folder)
    if (!touched) continue
  }
  for (const message of validateResourceDir(dir, kind)) {
    errors.push(`${dir.slice(root.length + 1)}: ${message}`)
  }
}

if (errors.length > 0) {
  console.error(errors.map((message) => `- ${message}`).join("\n"))
  process.exit(1)
}

console.log(`Validated ${dirs.length} resource(s).`)
