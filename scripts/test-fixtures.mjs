import { mkdtempSync, cpSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const root = resolve(process.cwd())
const validate = join(root, "scripts", "validate.mjs")

const expectFail = (label, dir) => {
  const result = spawnSync(process.execPath, [validate, dir], { encoding: "utf8" })
  if (result.status === 0) {
    console.error(`${label} was expected to fail and passed`)
    process.exit(1)
  }
  if (!result.stderr.trim()) {
    console.error(`${label} failed without an error message`)
    process.exit(1)
  }
  console.log(`${label}: failed as expected`)
}

const good = mkdtempSync(join(tmpdir(), "bb-market-"))
cpSync(join(root, "themes"), join(good, "themes"), { recursive: true })
cpSync(join(root, "databases"), join(good, "databases"), { recursive: true })
const goodResult = spawnSync(process.execPath, [validate, good], { encoding: "utf8" })
rmSync(good, { recursive: true, force: true })
if (goodResult.status !== 0) {
  console.error(goodResult.stderr)
  process.exit(1)
}
console.log("valid catalogue: passed")

expectFail("missing image", join(root, "fixtures", "missing-image"))
expectFail("malformed payload", join(root, "fixtures", "malformed"))
