/**
 * Build and publish DataStudio entirely on this repo's GitHub Actions.
 *
 * Dispatches .github/workflows/datastudio-build.yml, which checks out the private
 * booker-blitz repo, packages Windows/macOS/Linux installers, attaches them to the
 * datastudio-vX.Y.Z release here, publishes it and rebuilds manifest.json.
 * Nothing is built locally and no Actions minutes are spent on the private repo.
 *
 * The version comes from datastudio/version.json in booker-blitz at the chosen ref,
 * so push the version bump there first.
 *
 * Usage:
 *   pnpm deploy:datastudio
 *   pnpm deploy:datastudio --ref development
 *   pnpm deploy:datastudio --watch
 *   pnpm deploy:datastudio --dry-run
 */

import { execFileSync, spawnSync } from "node:child_process"
import process from "node:process"
import { BOOKER_BLITZ_REPO, REPO, githubHeaders } from "./resource.mjs"

const WORKFLOW = "datastudio-build.yml"
const SEMVER = /^\d+\.\d+\.\d+$/

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const watch = args.includes("--watch")
const refIndex = args.indexOf("--ref")
const ref = refIndex === -1 ? "master" : args[refIndex + 1]
if (!ref || ref.startsWith("-")) {
  console.error("--ref needs a booker-blitz branch, tag or SHA")
  process.exit(1)
}

const gh = (ghArgs, options = {}) =>
  execFileSync("gh", ghArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim()

const ensureGithubToken = () => {
  if (process.env.GITHUB_TOKEN) return
  try {
    process.env.GITHUB_TOKEN = gh(["auth", "token"])
  } catch {
    console.error("GITHUB_TOKEN is unset and `gh auth token` failed; run `gh auth login` first")
    process.exit(1)
  }
}

const remoteVersion = async () => {
  const url = `https://api.github.com/repos/${BOOKER_BLITZ_REPO}/contents/datastudio/version.json?ref=${encodeURIComponent(ref)}`
  const response = await fetch(url, { headers: githubHeaders() })
  if (!response.ok) {
    throw new Error(
      `GitHub ${response.status} reading datastudio/version.json at ${BOOKER_BLITZ_REPO}@${ref}. ` +
        "Check the ref is pushed and your gh login can read the repo.",
    )
  }
  const { content } = await response.json()
  return JSON.parse(Buffer.from(content, "base64").toString("utf8")).version.trim()
}

ensureGithubToken()

const version = await remoteVersion()
if (!SEMVER.test(version)) {
  console.error(`Invalid version in ${BOOKER_BLITZ_REPO}@${ref} datastudio/version.json: "${version}"`)
  process.exit(1)
}

console.log(`Building DataStudio v${version} from ${BOOKER_BLITZ_REPO}@${ref} (tag datastudio-v${version})`)

if (dryRun) {
  console.log(`[dry-run] gh workflow run ${WORKFLOW} --repo ${REPO} -f ref=${ref}`)
  process.exit(0)
}

gh(["workflow", "run", WORKFLOW, "--repo", REPO, "-f", `ref=${ref}`])
console.log(`Dispatched ${WORKFLOW} on ${REPO}`)

// `gh workflow run` does not return the run id, so look up the newest dispatched run.
await new Promise((done) => setTimeout(done, 4000))
const runs = JSON.parse(
  gh(["run", "list", "--repo", REPO, "--workflow", WORKFLOW, "--event", "workflow_dispatch", "--limit", "1", "--json", "databaseId,url"]),
)
const run = runs[0]
if (!run) {
  console.log(`Run not visible yet: https://github.com/${REPO}/actions/workflows/${WORKFLOW}`)
  process.exit(0)
}
console.log(run.url)

if (watch) {
  const result = spawnSync("gh", ["run", "watch", String(run.databaseId), "--repo", REPO, "--exit-status"], {
    stdio: "inherit",
  })
  process.exit(result.status ?? 1)
}
