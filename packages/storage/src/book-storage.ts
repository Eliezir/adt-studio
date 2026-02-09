import fs from "node:fs"
import path from "node:path"
import type sqlite from "node-sqlite3-wasm"
import type { ExtractedPage, ExtractedImage, PdfMetadata } from "@adt/pdf"
import type { Storage } from "./storage.js"
import { openBookDb } from "./db.js"

export interface BookPaths {
  bookDir: string
  dbPath: string
  imagesDir: string
}

export function resolveBookPaths(label: string, booksRoot: string): BookPaths {
  const bookDir = path.resolve(booksRoot, label)
  return {
    bookDir,
    dbPath: path.join(bookDir, `${label}.db`),
    imagesDir: path.join(bookDir, "images"),
  }
}

export function createBookStorage(label: string, booksRoot: string): Storage {
  const paths = resolveBookPaths(label, booksRoot)

  fs.mkdirSync(paths.bookDir, { recursive: true })
  fs.mkdirSync(paths.imagesDir, { recursive: true })

  const db = openBookDb(paths.dbPath)

  return {
    putPdfMetadata(data: PdfMetadata): void {
      db.run(
        `INSERT INTO pdf_metadata (id, data) VALUES (1, ?)
         ON CONFLICT (id) DO UPDATE SET data = excluded.data`,
        [JSON.stringify(data)]
      )
    },

    putExtractedPage(page: ExtractedPage): void {
      db.run(
        `INSERT INTO pages (page_id, page_number, text)
         VALUES (?, ?, ?)
         ON CONFLICT (page_id) DO UPDATE SET
           page_number = excluded.page_number,
           text = excluded.text`,
        [page.pageId, page.pageNumber, page.text]
      )

      writeImage(db, paths.imagesDir, page.pageImage, page.pageId, "extract")

      for (const img of page.images) {
        writeImage(db, paths.imagesDir, img, page.pageId, "extract")
      }
    },

    close(): void {
      db.close()
    },
  }
}

function writeImage(
  db: sqlite.Database,
  imagesDir: string,
  image: ExtractedImage,
  pageId: string,
  source: "page" | "extract" | "crop"
): void {
  const filename = `${image.imageId}.png`
  fs.writeFileSync(path.join(imagesDir, filename), image.pngBuffer)

  db.run(
    `INSERT OR IGNORE INTO images
       (image_id, page_id, path, hash, width, height, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      image.imageId,
      pageId,
      `images/${filename}`,
      image.hash,
      image.width,
      image.height,
      source,
    ]
  )
}
