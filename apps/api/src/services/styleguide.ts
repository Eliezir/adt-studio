import fs from "node:fs"
import path from "node:path"

/**
 * Read-only bundled style guide presets shipped with the app (e.g. `default`,
 * `sri-lanka-grade2`). Lives inside the packaged resources tree, which is NOT
 * writable on Windows — only ever read from here.
 */
export function getBundledStyleguidesDir(configPath: string | undefined): string {
  const projectRoot = configPath ? path.dirname(configPath) : process.cwd()
  return path.resolve(projectRoot, "assets", "styleguides")
}

/**
 * Writable directory for user-uploaded and LLM-generated style guides. Defaults
 * to a hidden dir inside the books volume, which is guaranteed writable in every
 * deployment (desktop `userData/books`, Docker mounted volume). Overridable via
 * the `STYLEGUIDES_DIR` env var.
 */
export function getWritableStyleguidesDir(booksDir: string): string {
  return path.resolve(
    process.env.STYLEGUIDES_DIR ?? path.join(path.resolve(booksDir), ".styleguides")
  )
}

/**
 * Resolve the on-disk path for a style guide file, checking the writable dir
 * first (uploaded/generated) then the bundled presets. Returns undefined if the
 * name would escape either directory (path-traversal guard) or no file exists.
 */
export function resolveStyleguidePath(
  name: string,
  ext: string,
  configPath: string | undefined,
  booksDir: string
): string | undefined {
  for (const dir of [getWritableStyleguidesDir(booksDir), getBundledStyleguidesDir(configPath)]) {
    const filePath = path.resolve(dir, `${name}${ext}`)
    if (!filePath.startsWith(dir + path.sep)) continue
    if (fs.existsSync(filePath)) return filePath
  }
  return undefined
}

export function loadStyleguideContent(
  styleguideName: string | undefined,
  configPath: string | undefined,
  booksDir: string
): string | undefined {
  if (!styleguideName) return undefined
  const filePath = resolveStyleguidePath(styleguideName, ".md", configPath, booksDir)
  if (!filePath) return undefined
  return fs.readFileSync(filePath, "utf-8")
}
