import sqlite from "node-sqlite3-wasm"
import { SCHEMA_VERSION } from "@adt/types"

const { Database } = sqlite

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS book_metadata (
  source TEXT PRIMARY KEY CHECK (source IN ('stub', 'llm')),
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdf_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  page_id TEXT PRIMARY KEY,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS node_data (
  node TEXT NOT NULL,
  item_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT,
  PRIMARY KEY (node, item_id, version)
);

CREATE TABLE IF NOT EXISTS images (
  image_id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(page_id),
  path TEXT NOT NULL,
  hash TEXT NOT NULL DEFAULT '',
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('page', 'extract', 'crop'))
);

CREATE TABLE IF NOT EXISTS llm_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  data TEXT NOT NULL
);
`

export function openBookDb(dbPath: string): sqlite.Database {
  const db = new Database(dbPath)
  db.exec("PRAGMA foreign_keys = ON")
  initSchema(db)
  return db
}

function initSchema(db: sqlite.Database): void {
  const tables = db.all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
  )

  if (tables.length === 0) {
    db.exec(SCHEMA_SQL)
    db.run("INSERT INTO schema_version (version) VALUES (?)", [SCHEMA_VERSION])
    return
  }

  const rows = db.all("SELECT version FROM schema_version LIMIT 1") as Array<{
    version: number
  }>
  const existing = rows[0]?.version ?? 0

  if (existing !== SCHEMA_VERSION) {
    db.close()
    throw new Error(
      `Schema version mismatch: found v${existing}, expected v${SCHEMA_VERSION}`
    )
  }
}
