import assert from "node:assert/strict"
import { mkdtempSync, cpSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { validateMeta } from "./resource.mjs"

const root = resolve(process.cwd())
const validate = join(root, "scripts", "validate.mjs")

const validMeta = {
  title: "Fixture",
  author: "Fixture",
  version: "1.0.0",
  releaseDate: "2026-11-24",
  updateDate: "2026-11-24",
  official: false,
  legacy: false,
  featured: false,
  tags: ["fixture"],
  gameVersion: "0.10.1",
  license: "CC-BY-4.0",
  imageSetUrl: "https://example.com/fixture-images.zip",
  imagePackTitle: "Fixture Images",
}

assert.deepEqual(validateMeta(validMeta), [])

const expectMetaError = (label, overrides, message) => {
  const errors = validateMeta({ ...validMeta, ...overrides })
  assert.ok(errors.includes(message), `${label}: expected "${message}", got ${JSON.stringify(errors)}`)
  console.log(`${label}: passed`)
}

expectMetaError("missing release date", { releaseDate: undefined }, "meta.json releaseDate must be a valid YYYY-MM-DD date")
expectMetaError("invalid update date", { updateDate: "2026-02-30" }, "meta.json updateDate must be a valid YYYY-MM-DD date")
expectMetaError("update before release", { releaseDate: "2026-11-25" }, "meta.json updateDate must be on or after releaseDate")
expectMetaError("non-boolean official", { official: "true" }, "meta.json official must be a boolean")
expectMetaError("missing legacy", { legacy: undefined }, "meta.json legacy must be a boolean")
expectMetaError("non-boolean legacy", { legacy: "true" }, "meta.json legacy must be a boolean")
expectMetaError("missing featured", { featured: undefined }, "meta.json featured must be a boolean")
expectMetaError("non-boolean featured", { featured: "true" }, "meta.json featured must be a boolean")
expectMetaError("removed verified", { verified: true }, "meta.json verified is no longer supported; use featured")
expectMetaError("missing image pack title", { imagePackTitle: undefined }, "meta.json imagePackTitle is required when imageSetUrl is set")
expectMetaError("empty image pack title", { imagePackTitle: " " }, "meta.json imagePackTitle must be a non-empty string up to 120 characters")

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
