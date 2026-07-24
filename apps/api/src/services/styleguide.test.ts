import { describe, it, expect, beforeEach, afterEach } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  loadStyleguideContent,
  resolveStyleguidePath,
  getWritableStyleguidesDir,
  getBundledStyleguidesDir,
} from "./styleguide.js"

let tmpDir: string
let booksDir: string
let projectRoot: string
let configPath: string
let bundledDir: string
let writableDir: string
const prevEnv = process.env.STYLEGUIDES_DIR

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "adt-styleguide-"))
  booksDir = path.join(tmpDir, "books")
  projectRoot = path.join(tmpDir, "resources")
  configPath = path.join(projectRoot, "config.yaml")
  bundledDir = getBundledStyleguidesDir(configPath) // <projectRoot>/assets/styleguides
  delete process.env.STYLEGUIDES_DIR
  writableDir = getWritableStyleguidesDir(booksDir) // <booksDir>/.styleguides
  fs.mkdirSync(bundledDir, { recursive: true })
  fs.mkdirSync(writableDir, { recursive: true })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  if (prevEnv === undefined) delete process.env.STYLEGUIDES_DIR
  else process.env.STYLEGUIDES_DIR = prevEnv
})

describe("getWritableStyleguidesDir", () => {
  it("defaults to a hidden dir inside the books volume", () => {
    expect(getWritableStyleguidesDir(booksDir)).toBe(
      path.join(path.resolve(booksDir), ".styleguides")
    )
  })

  it("honors the STYLEGUIDES_DIR env override", () => {
    const custom = path.join(tmpDir, "custom-sg")
    process.env.STYLEGUIDES_DIR = custom
    expect(getWritableStyleguidesDir(booksDir)).toBe(path.resolve(custom))
  })
})

describe("loadStyleguideContent", () => {
  it("returns undefined when no name is given", () => {
    expect(loadStyleguideContent(undefined, configPath, booksDir)).toBeUndefined()
  })

  it("loads a style guide present only in the writable dir (generated/uploaded)", () => {
    fs.writeFileSync(path.join(writableDir, "my-book-generated.md"), "writable content", "utf-8")
    expect(loadStyleguideContent("my-book-generated", configPath, booksDir)).toBe("writable content")
  })

  it("falls back to the bundled presets dir", () => {
    fs.writeFileSync(path.join(bundledDir, "default.md"), "bundled content", "utf-8")
    expect(loadStyleguideContent("default", configPath, booksDir)).toBe("bundled content")
  })

  it("prefers the writable dir when a name exists in both", () => {
    fs.writeFileSync(path.join(writableDir, "default.md"), "writable wins", "utf-8")
    fs.writeFileSync(path.join(bundledDir, "default.md"), "bundled loses", "utf-8")
    expect(loadStyleguideContent("default", configPath, booksDir)).toBe("writable wins")
  })

  it("returns undefined for a missing style guide", () => {
    expect(loadStyleguideContent("does-not-exist", configPath, booksDir)).toBeUndefined()
  })

  it("guards against path traversal", () => {
    const secret = path.join(tmpDir, "secret.md")
    fs.writeFileSync(secret, "top secret", "utf-8")
    expect(loadStyleguideContent("../../secret", configPath, booksDir)).toBeUndefined()
    expect(resolveStyleguidePath("../../secret", ".md", configPath, booksDir)).toBeUndefined()
  })
})
