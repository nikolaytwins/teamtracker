import Database from "better-sqlite3";
import path from "path";
import { DEFAULT_STATUS, type PmStatusKey } from "./statuses";

const dbPath = path.join(process.cwd(), "data", "pm-board.db");

let _db: Database.Database | null = null;

function ensureDb() {
  if (_db) return _db;
  const fs = require("fs");
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(dbPath);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS pm_cards (
      id TEXT PRIMARY KEY,
      source_project_id TEXT,
      source_detail_id TEXT,
      name TEXT NOT NULL,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT '${DEFAULT_STATUS}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pm_cards_status ON pm_cards(status);
    CREATE INDEX IF NOT EXISTS idx_pm_cards_deadline ON pm_cards(deadline);
  `);
  try {
    _db.exec(`ALTER TABLE pm_cards ADD COLUMN source_detail_id TEXT`);
  } catch {
    /* column may already exist */
  }
  try {
    _db.exec(`ALTER TABLE pm_cards ADD COLUMN extra TEXT`);
  } catch {
    /* column may already exist */
  }
  try {
    _db.exec(`UPDATE pm_cards SET status = 'design_approval' WHERE status = 'client_approval'`);
  } catch {
    /* ignore */
  }
  return _db;
}

export function getDb() {
  return ensureDb();
}

export interface PmCard {
  id: string;
  source_project_id: string | null;
  source_detail_id: string | null;
  name: string;
  deadline: string | null;
  status: PmStatusKey;
  extra: string | null;
  created_at: string;
  updated_at: string;
}

export function createCard(params: {
  id?: string;
  source_project_id?: string | null;
  source_detail_id?: string | null;
  name: string;
  deadline?: string | null;
  status?: PmStatusKey;
}): PmCard {
  const db = getDb();
  const id = params.id ?? `card_${Date.now()}`;
  const status = params.status ?? DEFAULT_STATUS;
  db.prepare(
    `INSERT INTO pm_cards (id, source_project_id, source_detail_id, name, deadline, status, extra) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.source_project_id ?? null,
    params.source_detail_id ?? null,
    params.name,
    params.deadline ?? null,
    status,
    null
  );
  return db.prepare("SELECT * FROM pm_cards WHERE id = ?").get(id) as PmCard;
}

export function listCards(): PmCard[] {
  const db = getDb();
  return db.prepare("SELECT * FROM pm_cards ORDER BY deadline ASC NULLS LAST, created_at DESC").all() as PmCard[];
}

export function updateCard(
  id: string,
  updates: { name?: string; deadline?: string | null; status?: PmStatusKey; extra?: string | null }
): PmCard | null {
  const db = getDb();
  const card = db.prepare("SELECT * FROM pm_cards WHERE id = ?").get(id) as PmCard | undefined;
  if (!card) return null;
  const name = updates.name !== undefined ? updates.name : card.name;
  const deadline = updates.deadline !== undefined ? updates.deadline : card.deadline;
  const status = updates.status !== undefined ? updates.status : card.status;
  const extra = updates.extra !== undefined ? updates.extra : (card as { extra?: string | null }).extra ?? null;
  db.prepare(
    `UPDATE pm_cards SET name = ?, deadline = ?, status = ?, extra = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(name, deadline, status, extra, id);
  return db.prepare("SELECT * FROM pm_cards WHERE id = ?").get(id) as PmCard;
}

export function deleteCard(id: string): boolean {
  const db = getDb();
  const r = db.prepare("DELETE FROM pm_cards WHERE id = ?").run(id);
  return r.changes > 0;
}

/** Удалить все карточки из канбана (в Agency не трогаем). Возвращает количество удалённых. */
export function deleteAllCards(): number {
  const db = getDb();
  const r = db.prepare("DELETE FROM pm_cards").run();
  return r.changes;
}

export function getCard(id: string): PmCard | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pm_cards WHERE id = ?").get(id);
  return (row as PmCard) ?? null;
}
