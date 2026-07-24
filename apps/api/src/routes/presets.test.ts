import { describe, it, expect, beforeEach, afterEach } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createPresetRoutes } from "./presets.js"

let tmpDir: string
let booksDir: string
let configPath: string
let bundledDir: string
let writableDir: string
const prevEnv = process.env.STYLEGUIDES_DIR

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "adt-presets-route-"))
  booksDir = path.join(tmpDir, "books")
  configPath = path.join(tmpDir, "resources", "config.yaml")
  bundledDir = path.join(tmpDir, "resources", "assets", "styleguides")
  writableDir = path.join(booksDir, ".styleguides")
  delete process.env.STYLEGUIDES_DIR
  fs.mkdirSync(bundledDir, { recursive: true })
  fs.mkdirSync(writableDir, { recursive: true })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  if (prevEnv === undefined) delete process.env.STYLEGUIDES_DIR
  else process.env.STYLEGUIDES_DIR = prevEnv
})

function app() {
  return createPresetRoutes(configPath, booksDir)
}

describe("GET /styleguides", () => {
  it("lists the union of bundled presets and writable (generated/uploaded) style guides", async () => {
    fs.writeFileSync(path.join(bundledDir, "default.md"), "# default", "utf-8")
    fs.writeFileSync(path.join(writableDir, "my-book-generated.md"), "# generated", "utf-8")
    const res = await app().request("/styleguides")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(new Set(body.styleguides)).toEqual(new Set(["default", "my-book-generated"]))
  })

  it("de-duplicates a name present in both dirs", async () => {
    fs.writeFileSync(path.join(bundledDir, "default.md"), "# bundled", "utf-8")
    fs.writeFileSync(path.join(writableDir, "default.md"), "# writable", "utf-8")
    const res = await app().request("/styleguides")
    const body = await res.json()
    expect(body.styleguides).toEqual(["default"])
  })

  it("returns an empty list when no dirs exist", async () => {
    fs.rmSync(bundledDir, { recursive: true, force: true })
    fs.rmSync(writableDir, { recursive: true, force: true })
    const res = await app().request("/styleguides")
    const body = await res.json()
    expect(body.styleguides).toEqual([])
  })
})

describe("GET /styleguides/:name/preview", () => {
  it("serves a preview from the writable dir", async () => {
    fs.writeFileSync(path.join(writableDir, "my-book-generated-preview.html"), "<h1>hi</h1>", "utf-8")
    const res = await app().request("/styleguides/my-book-generated/preview")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.html).toBe("<h1>hi</h1>")
  })

  it("falls back to rendering bundled markdown when no preview html exists", async () => {
    fs.writeFileSync(path.join(bundledDir, "default.md"), "# Title", "utf-8")
    const res = await app().request("/styleguides/default/preview")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.html).toContain("Title")
  })

  it("returns 404 for an unknown style guide", async () => {
    const res = await app().request("/styleguides/nope/preview")
    expect(res.status).toBe(404)
  })
})

describe("POST /styleguides/upload", () => {
  it("writes the uploaded style guide into the writable dir, not the bundled dir", async () => {
    const form = new FormData()
    form.append("file", new File(["# uploaded"], "custom-guide.md", { type: "text/markdown" }))
    const res = await app().request("/styleguides/upload", { method: "POST", body: form })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe("custom-guide")
    expect(fs.existsSync(path.join(writableDir, "custom-guide.md"))).toBe(true)
    expect(fs.existsSync(path.join(bundledDir, "custom-guide.md"))).toBe(false)
  })
})
