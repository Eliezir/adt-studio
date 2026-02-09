#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { Listr } from "listr2"
import { createBookStorage } from "@adt/storage"
import type { Storage } from "@adt/storage"
import type { ExtractResult } from "@adt/pdf"
import { runExtract } from "./run-extract.js"

const USAGE = `Usage: pnpm pipeline <label> <pdf-file> [options]

Arguments:
  label       Book label (used as directory name)
  pdf-file    Path to PDF file

Options:
  --start-page <n>  Start at page N (1-indexed)
  --end-page <n>    End at page N (inclusive)
  --books-dir <dir> Books root directory (default: books)
  -h, --help        Show this help`

interface PipelineContext {
  storage: Storage
  result: ExtractResult
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stderr.write(USAGE + "\n")
    process.exit(args.length === 0 ? 1 : 0)
  }

  const positional: string[] = []
  let startPage: number | undefined
  let endPage: number | undefined
  let booksDir: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--start-page" && args[i + 1]) {
      startPage = parseInt(args[++i], 10)
    } else if (arg === "--end-page" && args[i + 1]) {
      endPage = parseInt(args[++i], 10)
    } else if (arg === "--books-dir" && args[i + 1]) {
      booksDir = args[++i]
    } else if (!arg.startsWith("-")) {
      positional.push(arg)
    }
  }

  const [label, pdfFile] = positional

  if (!label || !pdfFile) {
    process.stderr.write("Error: label and pdf-file are required\n\n")
    process.stderr.write(USAGE + "\n")
    process.exit(1)
  }

  const pdfPath = path.resolve(pdfFile)
  if (!fs.existsSync(pdfPath)) {
    process.stderr.write(`Error: PDF not found: ${pdfPath}\n`)
    process.exit(1)
  }

  const booksRoot = path.resolve(booksDir ?? process.env.BOOKS_DIR ?? "books")

  const tasks = new Listr<PipelineContext>(
    [
      {
        title: `Extract PDF: ${path.basename(pdfPath)}`,
        task: async (ctx, task) => {
          ctx.storage = createBookStorage(label, booksRoot)

          ctx.result = await runExtract(
            { pdfPath, startPage, endPage },
            ctx.storage,
            {
              emit(event) {
                if (
                  event.type === "step-progress" &&
                  event.page !== undefined &&
                  event.totalPages !== undefined
                ) {
                  task.title = `Extract PDF: ${path.basename(pdfPath)} [${event.page}/${event.totalPages}]`
                }
              },
            }
          )

          task.title = `Extract PDF: ${ctx.result.pages.length} pages extracted`
        },
        rendererOptions: { persistentOutput: false },
      },
    ],
    {
      rendererOptions: {
        collapseSubtasks: false,
      },
    }
  )

  try {
    const ctx = await tasks.run({} as PipelineContext)
    ctx.storage.close()

    process.stderr.write(
      `\nOutput: ${path.join(booksRoot, label)}/\n`
    )
  } catch (err) {
    process.exit(1)
  }
}

main().catch((err) => {
  process.stderr.write(
    `\nFailed: ${err instanceof Error ? err.message : String(err)}\n`
  )
  process.exit(1)
})
