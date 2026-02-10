import sqlite from "node-sqlite3-wasm"
import { SCHEMA_VERSION } from "@adt/types"

const { Database } = sqlite

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL
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
  request_id TEXT NOT NULL DEFAULT '',
  timestamp TEXT NOT NULL,
  step TEXT NOT NULL DEFAULT '',
  item_id TEXT NOT NULL DEFAULT '',
  success INTEGER NOT NULL DEFAULT 1,
  error_count INTEGER NOT NULL DEFAULT 0,
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

  db.exec(SCHEMA_SQL)

  if (tables.length === 0) {
    upsertSchemaVersion(db, SCHEMA_VERSION)
    return
  }

  const rows = db.all("SELECT version FROM schema_version WHERE id = 1") as Array<{
    version: number
  }>
  const existing = rows[0]?.version ?? 0

  if (existing === SCHEMA_VERSION) return

  db.close()
  throw new Error(
    `Schema version mismatch: found v${existing}, expected v${SCHEMA_VERSION}`
  )
}

function upsertSchemaVersion(db: sqlite.Database, version: number): void {
  db.run(
    `INSERT INTO schema_version (id, version) VALUES (1, ?)
     ON CONFLICT (id) DO UPDATE SET version = excluded.version`,
    [version]
  )
}
