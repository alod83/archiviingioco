export type ArchiveBindings = { DB: D1Database; ARCHIVE_FILES: R2Bucket };

const createArchivesSql = `CREATE TABLE IF NOT EXISTS archives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

const createRecordsSql = `CREATE TABLE IF NOT EXISTS archive_records (
  id TEXT PRIMARY KEY,
  archive_id TEXT REFERENCES archives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  recipient TEXT NOT NULL DEFAULT '',
  document_date TEXT NOT NULL,
  document_year TEXT NOT NULL DEFAULT '',
  place TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'Lettera',
  language TEXT NOT NULL DEFAULT 'Italiano',
  condition TEXT NOT NULL DEFAULT 'Buono',
  shelfmark TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  registry_entries TEXT NOT NULL DEFAULT '[]',
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export async function ensureArchiveSchema(database: D1Database) {
  await database.batch([
    database.prepare(createArchivesSql),
    database.prepare(createRecordsSql),
  ]);

  const columns = await database.prepare("PRAGMA table_info(archive_records)").all<{ name: string }>();
  if (!(columns.results ?? []).some((column) => column.name === "archive_id")) {
    await database.prepare("ALTER TABLE archive_records ADD COLUMN archive_id TEXT").run();
  }
  if (!(columns.results ?? []).some((column) => column.name === "document_year")) {
    await database.prepare("ALTER TABLE archive_records ADD COLUMN document_year TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(columns.results ?? []).some((column) => column.name === "registry_entries")) {
    await database.prepare("ALTER TABLE archive_records ADD COLUMN registry_entries TEXT NOT NULL DEFAULT '[]'").run();
  }

  const orphan = await database.prepare("SELECT id FROM archive_records WHERE archive_id IS NULL LIMIT 1").first();
  if (orphan) {
    await database.batch([
      database.prepare(`INSERT OR IGNORE INTO archives (id, title, description)
        VALUES ('archivio-importato', 'Archivio importato', 'Documenti catalogati prima della creazione degli archivi.')`),
      database.prepare("UPDATE archive_records SET archive_id = 'archivio-importato' WHERE archive_id IS NULL"),
    ]);
  }

  await database.batch([
    database.prepare("CREATE INDEX IF NOT EXISTS idx_archive_records_archive_id ON archive_records(archive_id)"),
    database.prepare("CREATE INDEX IF NOT EXISTS idx_archive_records_created_at ON archive_records(created_at DESC)"),
  ]);
}
