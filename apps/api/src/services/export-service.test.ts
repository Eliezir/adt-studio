import { describe, it, expect, beforeEach, afterEach } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { openBookDb, createBookStorage } from "@adt/storage"
import { unzipSync } from "fflate"
import { exportBook, exportWebpub } from "./export-service.js"

let tmpDir: string
let webAssetsDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "adt-export-service-"))
  webAssetsDir = path.join(tmpDir, "assets-web")
  createWebAssets(webAssetsDir)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function createTestDb(label: string): void {
  const bookDir = path.join(tmpDir, label)
  fs.mkdirSync(bookDir, { recursive: true })
  fs.mkdirSync(path.join(bookDir, "images"), { recursive: true })
  const db = openBookDb(path.join(bookDir, `${label}.db`))
  db.close()
}

function addPages(label: string, count: number): void {
  const db = openBookDb(path.join(tmpDir, label, `${label}.db`))
  for (let i = 1; i <= count; i++) {
    db.run(
      "INSERT INTO pages (page_id, page_number, text) VALUES (?, ?, ?)",
      [`pg${String(i).padStart(3, "0")}`, i, `Page ${i} text`]
    )
  }
  db.close()
}

function addPdf(label: string): void {
  fs.writeFileSync(
    path.join(tmpDir, label, `${label}.pdf`),
    Buffer.from("%PDF-1.0 fake content")
  )
}

function addImageFile(label: string, imageId: string): void {
  const bookDir = path.join(tmpDir, label)
  const imagePath = path.join(bookDir, "images", `${imageId}.png`)
  fs.writeFileSync(imagePath, Buffer.from("fake-png-data"))

  const db = openBookDb(path.join(bookDir, `${label}.db`))
  db.run(
    "INSERT INTO images (image_id, page_id, path, hash, width, height, source) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [imageId, "pg001", `images/${imageId}.png`, "hash123", 100, 100, "extract"]
  )
  db.close()
}

function addConfigYaml(label: string): void {
  fs.writeFileSync(
    path.join(tmpDir, label, "config.yaml"),
    "concurrency: 4\n"
  )
}

function createWebAssets(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "base.js"), 'window.__ADT_BUNDLE_TEST__ = "ok";\n')
  fs.writeFileSync(path.join(dir, "fonts.css"), "body { font-family: serif; }")
  fs.writeFileSync(
    path.join(dir, "tailwind_css.css"),
    "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n"
  )
}

describe("exportBook", () => {
  it("produces a valid ZIP containing the db file", async () => {
    createTestDb("export-test")
    addPages("export-test", 1)

    const result = await exportBook("export-test", tmpDir, webAssetsDir)
    expect(result.zipBuffer).toBeInstanceOf(Uint8Array)
    expect(result.filename).toBe("export-test.zip")

    const files = unzipSync(result.zipBuffer)
    expect(files["export-test.db"]).toBeDefined()
  })

  it("includes PDF in the ZIP", async () => {
    createTestDb("with-pdf")
    addPages("with-pdf", 1)
    addPdf("with-pdf")

    const result = await exportBook("with-pdf", tmpDir, webAssetsDir)
    const files = unzipSync(result.zipBuffer)
    expect(files["with-pdf.pdf"]).toBeDefined()
    expect(Buffer.from(files["with-pdf.pdf"]).toString()).toContain("%PDF")
  })

  it("includes images directory", async () => {
    createTestDb("with-imgs")
    addPages("with-imgs", 1)
    addImageFile("with-imgs", "my-img")

    const result = await exportBook("with-imgs", tmpDir, webAssetsDir)
    const files = unzipSync(result.zipBuffer)
    expect(files["images/my-img.png"]).toBeDefined()
    expect(Buffer.from(files["images/my-img.png"]).toString()).toBe("fake-png-data")
  })

  it("includes config.yaml when present", async () => {
    createTestDb("with-config")
    addPages("with-config", 1)
    addConfigYaml("with-config")

    const result = await exportBook("with-config", tmpDir, webAssetsDir)
    const files = unzipSync(result.zipBuffer)
    expect(files["config.yaml"]).toBeDefined()
    const content = new TextDecoder().decode(files["config.yaml"])
    expect(content).toContain("concurrency: 4")
  })

  it("exports even when storyboard is not accepted", async () => {
    createTestDb("not-accepted")
    addPages("not-accepted", 1)

    const result = await exportBook("not-accepted", tmpDir, webAssetsDir)
    expect(result.zipBuffer).toBeInstanceOf(Uint8Array)
    expect(result.filename).toBe("not-accepted.zip")
  })

  it("throws for non-existent book", async () => {
    await expect(exportBook("ghost", tmpDir, webAssetsDir)).rejects.toThrow("not found")
  })

  it("throws when web assets directory is missing", async () => {
    createTestDb("missing-assets")
    addPages("missing-assets", 1)

    await expect(exportBook("missing-assets", tmpDir, path.join(tmpDir, "missing-assets-dir")))
      .rejects.toThrow("Web assets directory not found")
  })

  it("includes all book directory contents recursively", async () => {
    createTestDb("full-book")
    addPages("full-book", 2)
    addPdf("full-book")
    addImageFile("full-book", "img-a")
    addImageFile("full-book", "img-b")
    addConfigYaml("full-book")

    const result = await exportBook("full-book", tmpDir, webAssetsDir)
    const files = unzipSync(result.zipBuffer)
    const paths = Object.keys(files).sort()

    expect(paths).toContain("full-book.db")
    expect(paths).toContain("full-book.pdf")
    expect(paths).toContain("config.yaml")
    expect(paths).toContain("images/img-a.png")
    expect(paths).toContain("images/img-b.png")
  })
})

function createBookWithMetadata(label: string, title: string): void {
  const bookDir = path.join(tmpDir, label)
  fs.mkdirSync(bookDir, { recursive: true })
  fs.mkdirSync(path.join(bookDir, "images"), { recursive: true })
  const db = openBookDb(path.join(bookDir, `${label}.db`))
  db.run(
    "INSERT INTO node_data (node, item_id, version, data) VALUES (?, ?, ?, ?)",
    [
      "metadata",
      "book",
      1,
      JSON.stringify({
        title,
        authors: ["Author"],
        publisher: null,
        language_code: "en",
        cover_page_number: 1,
        reasoning: "test",
      }),
    ]
  )
  db.close()
}

function addPagesAndRenderings(label: string, count: number): void {
  const storage = createBookStorage(label, tmpDir)
  try {
    for (let i = 1; i <= count; i++) {
      const pageId = `${label}_p${i}`
      const sectionId = `${pageId}_sec001`
      storage.putExtractedPage({
        pageId,
        pageNumber: i,
        text: `Page ${i}`,
        pageImage: {
          imageId: `${pageId}_page`,
          buffer: Buffer.from("fake-png"),
          format: "png",
          hash: `hash${i}`,
          width: 800,
          height: 600,
        },
        images: [],
      })
      storage.putNodeData("page-sectioning", pageId, {
        reasoning: "ok",
        sections: [
          {
            sectionId,
            sectionType: "content",
            parts: [],
            backgroundColor: "#fff",
            textColor: "#000",
            pageNumber: i,
            isPruned: false,
          },
        ],
      })
      storage.putNodeData("web-rendering", pageId, {
        sections: [
          {
            sectionIndex: 0,
            sectionType: "content",
            reasoning: "ok",
            html: `<p>Rendered page ${i}</p>`,
          },
        ],
      })
    }
  } finally {
    storage.close()
  }
}

describe("exportWebpub", () => {
  it("produces a valid ZIP of the webpub directory", async () => {
    createBookWithMetadata("webpub-test", "Test Book")
    addPagesAndRenderings("webpub-test", 1)

    const result = await exportWebpub("webpub-test", tmpDir, webAssetsDir)
    expect(result.webpubBuffer).toBeInstanceOf(Uint8Array)
    expect(result.filename).toBe("Test Book.webpub")
    expect(result.safeFilename).toBe("webpub-test.webpub")

    const files = unzipSync(result.webpubBuffer)
    expect(files["manifest.json"]).toBeDefined()
  })

  it("returns safeFilename for non-ASCII titles", async () => {
    createBookWithMetadata("sinhala-book", "\u0DC3\u0DD2\u0D82\u0DC4\u0DBD \u0DB4\u0DD9\u0DA7")
    addPagesAndRenderings("sinhala-book", 1)

    const result = await exportWebpub("sinhala-book", tmpDir, webAssetsDir)
    expect(result.filename).toBe("\u0DC3\u0DD2\u0D82\u0DC4\u0DBD \u0DB4\u0DD9\u0DA7.webpub")
    expect(result.safeFilename).toBe("sinhala-book.webpub")
  })

  it("falls back to label when metadata has no title", async () => {
    createTestDb("no-title")
    addPages("no-title", 1)

    const result = await exportWebpub("no-title", tmpDir, webAssetsDir)
    expect(result.filename).toBe("no-title.webpub")
    expect(result.safeFilename).toBe("no-title.webpub")
  })

  it("disables navigation controls and tutorial in webpub config", async () => {
    createBookWithMetadata("webpub-config", "Config Test")
    addPagesAndRenderings("webpub-config", 1)

    await exportWebpub("webpub-config", tmpDir, webAssetsDir)

    const configPath = path.join(tmpDir, "webpub-config", "webpub", "assets", "config.json")
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
    expect(config.features.showNavigationControls).toBe(false)
    expect(config.features.showTutorial).toBe(false)
  })

  it("injects webpub CSS overrides into HTML pages", async () => {
    createBookWithMetadata("webpub-css", "CSS Test")
    addPagesAndRenderings("webpub-css", 1)

    await exportWebpub("webpub-css", tmpDir, webAssetsDir)

    const indexPath = path.join(tmpDir, "webpub-css", "webpub", "index.html")
    const html = fs.readFileSync(indexPath, "utf-8")
    expect(html).toContain("WebPub / EPUB reader overrides")
    expect(html).toContain("columns: auto !important")
  })

  it("includes readingOrder in manifest", async () => {
    createBookWithMetadata("webpub-manifest", "Manifest Test")
    addPagesAndRenderings("webpub-manifest", 2)

    await exportWebpub("webpub-manifest", tmpDir, webAssetsDir)

    const manifestPath = path.join(tmpDir, "webpub-manifest", "webpub", "manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
    expect(manifest.metadata.title).toBe("Manifest Test")
    expect(manifest.metadata.presentation.overflow).toBe("scrolled")
    expect(manifest.metadata.presentation.spread).toBe("none")
    expect(manifest.readingOrder.length).toBeGreaterThan(0)
    expect(manifest.readingOrder[0].type).toBe("text/html")
  })

  it("throws for non-existent book", async () => {
    await expect(exportWebpub("ghost", tmpDir, webAssetsDir)).rejects.toThrow("not found")
  })

  it("throws when web assets directory is missing", async () => {
    createBookWithMetadata("missing-assets", "Missing")
    addPagesAndRenderings("missing-assets", 1)

    await expect(exportWebpub("missing-assets", tmpDir, path.join(tmpDir, "no-assets")))
      .rejects.toThrow("Web assets directory not found")
  })
})
