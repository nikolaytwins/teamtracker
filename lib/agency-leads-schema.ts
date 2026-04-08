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
