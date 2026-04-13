import type Database from "better-sqlite3";

/** Таблица могла отсутствовать после миграции — без неё POST лида падает. */
export function ensureLeadHistoryTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_history (
      id TEXT NOT NULL PRIMARY KEY,
      leadId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      oldStatus TEXT,
      newStatus TEXT,
      oldSource TEXT,
      newSource TEXT,
      oldDate TEXT,
      newDate TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_lead_history_leadId ON lead_history(leadId);
    CREATE INDEX IF NOT EXISTS idx_lead_history_eventType ON lead_history(eventType);
    CREATE INDEX IF NOT EXISTS idx_lead_history_createdAt ON lead_history(createdAt);
  `);
}

/** Добавляет isRecurring к agency_leads при необходимости (идемпотентно). */
export function ensureAgencyLeadsColumns(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE agency_leads ADD COLUMN isRecurring INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
}

/** Архив канбана: скрытые с доски лиды (list по умолчанию без них). */
export function ensureAgencyLeadsArchived(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE agency_leads ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS _tt_migrations (
      id TEXT PRIMARY KEY NOT NULL
    );
  `);
  const done = db.prepare(`SELECT 1 AS o FROM _tt_migrations WHERE id = ?`).get("leads_archive_legacy_v1") as
    | { o: number }
    | undefined;
  if (!done) {
    db.prepare(`UPDATE agency_leads SET archived = 1`).run();
    db.prepare(`INSERT INTO _tt_migrations (id) VALUES (?)`).run("leads_archive_legacy_v1");
  }
}

/** Привязка проекта к лиду (idempotent): один лид -> максимум один проект. */
export function ensureAgencyProjectsColumns(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE AgencyProject ADD COLUMN source_lead_id TEXT`);
  } catch {
    /* column exists */
  }
  try {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_project_source_lead_id ON AgencyProject(source_lead_id) WHERE source_lead_id IS NOT NULL AND TRIM(source_lead_id) != ''`
    );
  } catch {
    /* ignore */
  }
}
