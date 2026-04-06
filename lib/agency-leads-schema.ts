import type Database from "better-sqlite3";

/** Добавляет isRecurring к agency_leads при необходимости (идемпотентно). */
export function ensureAgencyLeadsColumns(db: Database.Database) {
  try {
    db.exec(`ALTER TABLE agency_leads ADD COLUMN isRecurring INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
}
