import fs from "node:fs"
import path from "node:path"
import { parseBookLabel } from "@adt/types"

export type StyleguideSourceKind = "book" | "uploaded" | "bundled"

export interface ResolvedStyleguideSource {
  kind: StyleguideSourceKind
  dir: string
  markdownPath: string
  previewPath?: string
}

/** Read-only style guide presets shipped with the application. */
export function getBundledStyleguidesDir(configPath: string | undefined): string {
  const projectRoot = configPath ? path.dirname(configPath) : process.cwd()
  return path.resolve(projectRoot, "assets", "styleguides")
}

/**
 * Writable application-level directory for user-uploaded style guides.
 * Generated guides are book data and live inside their book directory instead.
 */
export function getWritableStyleguidesDir(booksDir: string): string {
  return path.resolve(
    process.env.STYLEGUIDES_DIR ?? path.join(path.resolve(booksDir), ".styleguides")
  )
}

/** Book-local directory included in project export/import archives. */
export function getBookStyleguidesDir(booksDir: string, bookLabel: string): string {
  const safeLabel = parseBookLabel(bookLabel)
  return path.join(path.resolve(booksDir), safeLabel, "styleguides")
}

export function getStyleguideSearchDirs(
  configPath: string | undefined,
  booksDir: string,
  bookLabel?: string,
): Array<{ kind: StyleguideSourceKind; dir: string }> {
  return [
    ...(bookLabel
      ? [{ kind: "book" as const, dir: getBookStyleguidesDir(booksDir, bookLabel) }]
      : []),
    { kind: "uploaded", dir: getWritableStyleguidesDir(booksDir) },
    { kind: "bundled", dir: getBundledStyleguidesDir(configPath) },
  ]
}

function resolveInside(dir: string, filename: string): string | undefined {
  const resolvedDir = path.resolve(dir)
  const filePath = path.resolve(resolvedDir, filename)
  return filePath.startsWith(resolvedDir + path.sep) ? filePath : undefined
}

/**
 * Select a style guide source by its markdown file. Preview and rendering then
 * use files from that same directory, so an override can never show another
 * source's preview.
 */
export function resolveStyleguideSource(
  name: string,
  configPath: string | undefined,
  booksDir: string,
  bookLabel?: string,
): ResolvedStyleguideSource | undefined {
  for (const { kind, dir } of getStyleguideSearchDirs(configPath, booksDir, bookLabel)) {
    const markdownPath = resolveInside(dir, `${name}.md`)
    if (!markdownPath || !fs.existsSync(markdownPath)) continue

    const previewCandidate = resolveInside(dir, `${name}-preview.html`)
    return {
      kind,
      dir,
      markdownPath,
      ...(previewCandidate && fs.existsSync(previewCandidate)
        ? { previewPath: previewCandidate }
        : {}),
    }
  }
  return undefined
}

export function loadStyleguideContent(
  styleguideName: string | undefined,
  configPath: string | undefined,
  booksDir: string,
  bookLabel?: string,
): string | undefined {
  if (!styleguideName) return undefined
  const source = resolveStyleguideSource(
    styleguideName,
    configPath,
    booksDir,
    bookLabel,
  )
  return source
    ? fs.readFileSync(source.markdownPath, "utf-8")
    : undefined
}

export class StyleguideWriteError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "StyleguideWriteError"
  }
}

function writeErrorMessage(error: unknown): string {
  const code = (error as NodeJS.ErrnoException).code
  if (code === "EPERM" || code === "EACCES" || code === "EROFS") {
    return "Could not save the style guide because the target directory is not writable."
  }
  if (code === "EEXIST" || code === "ENOTDIR") {
    return "Could not save the style guide because the configured target is not a directory."
  }
  return "Could not save the style guide."
}

/**
 * Persist one style guide and keep any preview in the same source directory.
 * Uploads omit previewHtml, which invalidates a stale preview of the same name.
 */
export function writeStyleguideFiles(options: {
  dir: string
  name: string
  content: string
  previewHtml?: string
}): void {
  const { dir, name, content, previewHtml } = options
  const markdownPath = resolveInside(dir, `${name}.md`)
  const previewPath = resolveInside(dir, `${name}-preview.html`)
  if (!markdownPath || !previewPath) {
    throw new StyleguideWriteError("Could not save the style guide because its name is invalid.")
  }

  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(markdownPath, content, "utf-8")
    if (previewHtml !== undefined) {
      fs.writeFileSync(previewPath, previewHtml, "utf-8")
    } else if (fs.existsSync(previewPath)) {
      fs.rmSync(previewPath)
    }
  } catch (error) {
    throw new StyleguideWriteError(writeErrorMessage(error), { cause: error })
  }
}
