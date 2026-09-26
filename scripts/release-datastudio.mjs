/**
 * Publish a DataStudio installer release on this repo (tag datastudio-vX.Y.Z).
 *
 * Changelog source: davidsmorais/booker-blitz/datastudio/CHANGELOG.md
 * When ../booker-blitz (or BOOKER_BLITZ_ROOT) exists, pending notes are stamped
 * via that repo's scripts/release/changelog.mjs before tagging here.
 *
 * Usage:
 *   pnpm release:datastudio
 *   pnpm release:datastudio --yes
 *   pnpm release:datastudio --dry-run
 */

import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { createInterface } from "node:readline/promises"
import { join, resolve } from "node:path"
import process from "node:process"
import { BOOKER_BLITZ_REPO, REPO, githubHeaders } from "./resource.mjs"

const root = resolve(process.cwd())
const args = new Set(process.argv.slice(2))
const dryRun = args.has("--dry-run")
const assumeYes = args.has("--yes") || args.has("-y")

const VERSION_HEADING = /^## \[(\d+\.\d+\.\d+[^\]]*)\]/
const SEMVER = /^\d+\.\d+\.\d+$/

const run = (command, commandArgs, options = {}) => {
  if (dryRun) {
    console.log(`[dry-run] ${command} ${commandArgs.join(" ")}`)
    return ""
  }
  return execFileSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim()
}

const ensureGithubToken = () => {
  if (process.env.GITHUB_TOKEN) return
  try {
    process.env.GITHUB_TOKEN = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim()
  } catch {
    console.warn("[release] GITHUB_TOKEN unset and gh auth token failed; API calls may rate-limit")
  }
}

const bookerBlitzRoot = () => {
  const fromEnv = process.env.BOOKER_BLITZ_ROOT
  if (fromEnv && existsSync(fromEnv)) return resolve(fromEnv)
  const sibling = resolve(root, "..", "booker-blitz")
  if (existsSync(sibling)) return sibling
  return null
}

const fetchGithubFile = async (repo, path, ref = "master") => {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`
  const response = await fetch(url, { headers: githubHeaders() })
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${repo}/${path}`)
  const payload = await response.json()
  if (typeof payload.content !== "string") throw new Error(`Missing content for ${repo}/${path}`)
  return Buffer.from(payload.content, "base64").toString("utf8")
}

const readLocalJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"))

const proposedVersion = async () => {
  const localRoot = bookerBlitzRoot()
  if (localRoot) {
    const versionPath = join(localRoot, "datastudio", "version.json")
    if (existsSync(versionPath)) return readLocalJson(versionPath).version.trim()
  }
  const remote = await fetchGithubFile(BOOKER_BLITZ_REPO, "datastudio/version.json")
  return JSON.parse(remote).version.trim()
}

const trimBlankLines = (lines) => {
  const result = [...lines]
  while (result.length > 0 && result[0].trim() === "") result.shift()
  while (result.length > 0 && result.at(-1).trim() === "") result.pop()
  return result
}

const releasedSectionFromMarkdown = (markdown, version) => {
  const lines = markdown.split(/\r?\n/)
  const start = lines.findIndex((line) => VERSION_HEADING.exec(line)?.[1] === version)
  if (start === -1) return null
  const next = lines.findIndex((line, index) => index > start && VERSION_HEADING.test(line))
  return trimBlankLines(lines.slice(start + 1, next === -1 ? undefined : next)).join("\n")
}

const pendingPreviewFromMarkdown = (markdown) => {
  const lines = markdown.split(/\r?\n/)
  const titleEnd = lines.findIndex((line) => line.startsWith("## "))
  const pendingStart = titleEnd === -1 ? lines.length : titleEnd
  const firstVersion = lines.findIndex(
    (line, index) => index >= pendingStart && VERSION_HEADING.test(line),
  )
  const pendingEnd = firstVersion === -1 ? lines.length : firstVersion
  return trimBlankLines(
    lines
      .slice(pendingStart, pendingEnd)
      .filter((line) => !/^## \[?unreleased\]?\s*$/i.test(line)),
  ).join("\n")
}

const updateChangelogInBookerBlitz = (version) => {
  const localRoot = bookerBlitzRoot()
  if (!localRoot) {
    console.log("[release] No local booker-blitz checkout; skipping changelog write (read-only from GitHub)")
    return
  }
  const script = join(localRoot, "scripts", "release", "changelog.mjs")
  if (!existsSync(script)) {
    console.warn(`[release] Missing ${script}; skipping changelog update`)
    return
  }
  if (dryRun) {
    console.log(`[dry-run] node ${script} datastudio ${version}`)
    return
  }
  const result = spawnSync(process.execPath, [script, "datastudio", version], {
    cwd: localRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    throw new Error("changelog.mjs failed in booker-blitz")
  }
  console.log(result.stdout.trim())
}

const releaseNotesFor = async (version) => {
  const localRoot = bookerBlitzRoot()
  if (localRoot && !dryRun) {
    const script = join(localRoot, "scripts", "release", "changelog.mjs")
    if (existsSync(script)) {
      return run(process.execPath, [script, "datastudio", version, "--notes"])
    }
  }
  const markdown = localRoot
    ? readFileSync(join(localRoot, "datastudio", "CHANGELOG.md"), "utf8")
    : await fetchGithubFile(BOOKER_BLITZ_REPO, "datastudio/CHANGELOG.md")
  return (
    releasedSectionFromMarkdown(markdown, version) ??
    pendingPreviewFromMarkdown(markdown) ??
    "- Maintenance release."
  )
}

const latestMarketplaceTag = () => {
  try {
    return run("git", ["describe", "--tags", "--abbrev=0", "--match", "datastudio-v[0-9]*"])
  } catch {
    return null
  }
}

const tagExists = (tag) => {
  if (dryRun) return false
  try {
    execFileSync("git", ["rev-parse", "--verify", `refs/tags/${tag}`], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

const remoteTagExists = (tag) => {
  if (dryRun) return false
  try {
    const out = execFileSync("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    return out.length > 0
  } catch {
    return false
  }
}

const githubReleaseExists = (tag) => {
  if (dryRun) return false
  try {
    execFileSync("gh", ["release", "view", tag, "--repo", REPO], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

const datastudioReleaseExists = (tag) => tagExists(tag) || remoteTagExists(tag) || githubReleaseExists(tag)

const confirmVersion = async (version, notes) => {
  const tag = `datastudio-v${version}`
  const previous = latestMarketplaceTag()
  console.log("")
  console.log(`Proposed version: ${version}`)
  console.log(`Tag: ${tag}`)
  if (previous) console.log(`Latest marketplace tag: ${previous}`)
  console.log("")
  console.log("Release notes preview:")
  console.log(notes.split("\n").map((line) => `  ${line}`).join("\n"))
  console.log("")
  if (assumeYes) return version

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    for (;;) {
      const answer = (await rl.question(`Release ${tag}? [y/N/edit version]: `)).trim().toLowerCase()
      if (answer === "" || answer === "n" || answer === "no") {
        console.log("Aborted.")
        process.exit(0)
      }
      if (answer === "y" || answer === "yes") return version
      if (answer === "e" || answer === "edit") {
        const custom = (await rl.question("Version (X.Y.Z): ")).trim()
        if (!SEMVER.test(custom)) {
          console.log("Invalid semver; try again.")
          continue
        }
        return custom
      }
      console.log("Answer y, n, or edit.")
    }
  } finally {
    rl.close()
  }
}

const createTagAndPush = (tag) => {
  if (tagExists(tag)) throw new Error(`Tag ${tag} already exists locally`)
  const annotation = tag.replace(/^datastudio-v/, "Booker Blitz Datastudio v")
  run("git", ["tag", "-a", tag, "-m", annotation])
  run("git", ["push", "origin", tag])
  console.log(`[release] Pushed tag ${tag}`)
}

const createGithubRelease = (tag, version, notes) => {
  const title = `Booker Blitz Datastudio v${version}`
  const notesPath = join(root, ".release-notes.md")
  if (!dryRun) {
    writeFileSync(notesPath, `${notes.trim()}\n`)
    try {
      run("gh", [
        "release",
        "create",
        tag,
        "--repo",
        REPO,
        "--draft",
        "--title",
        title,
        "--notes-file",
        notesPath,
      ])
    } finally {
      unlinkSync(notesPath)
    }
  } else {
    console.log(`[dry-run] gh release create ${tag} --draft --title "${title}"`)
  }
  console.log(`[release] Draft GitHub release ${tag} on ${REPO}`)
}

const bumpManifest = (tag) => {
  run(process.execPath, [join(root, "scripts", "build-manifest.mjs")], {
    env: { ...process.env, DATASTUDIO_RELEASE_TAG: tag },
  })
  if (dryRun) {
    console.log(`[dry-run] would commit manifest.json for ${tag} if changed`)
    return
  }
  const status = run("git", ["status", "--porcelain", "manifest.json"])
  if (!status) {
    console.log("[release] manifest.json unchanged")
    return
  }
  run("git", ["add", "manifest.json"])
  run("git", ["commit", "-m", `chore: rebuild manifest for ${tag}`])
  run("git", ["push", "origin", "HEAD"])
  console.log("[release] Committed and pushed manifest.json")
}

ensureGithubToken()

const initialVersion = await proposedVersion()
let version = initialVersion
if (!SEMVER.test(version)) {
  console.error(`Invalid version in booker-blitz datastudio/version.json: "${version}"`)
  process.exit(1)
}

updateChangelogInBookerBlitz(version)
const notes = await releaseNotesFor(version)
version = await confirmVersion(version, notes)

if (version !== initialVersion) {
  updateChangelogInBookerBlitz(version)
}

const tag = `datastudio-v${version}`
const finalNotes = await releaseNotesFor(version)

if (datastudioReleaseExists(tag)) {
  console.log(`[release] ${tag} already exists; syncing manifest from release assets (.AppImage, .msi, .dmg, .exe)`)
  bumpManifest(tag)
  console.log("")
  console.log("Manifest updated from the existing release. Upload any missing installers to the release if needed.")
} else {
  createTagAndPush(tag)
  createGithubRelease(tag, version, finalNotes)
  bumpManifest(tag)
  console.log("")
  console.log("Next: upload .exe, .msi, .dmg, .AppImage, and checksums.txt to the draft release, then publish it.")
}
