import Database from "better-sqlite3";
import path from "path";
import { APPROVAL_WAITING_STATUS_SET, DEFAULT_STATUS, type PmStatusKey } from "./statuses";
import { VIRTUAL_OTHER_CARD_ID } from "./pm-constants";

export { VIRTUAL_OTHER_CARD_ID } from "./pm-constants";

function getPmBoardSqlitePath(): string {
  const override = process.env.PM_BOARD_SQLITE_PATH?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data", "pm-board.db");
}

let _db: Database.Database | null = null;

function ensureDb() {
  if (_db) return _db;
  const fs = require("fs");
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(getPmBoardSqlitePath());
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
    _db.exec(`ALTER TABLE pm_cards ADD COLUMN approval_waiting_since TEXT`);
  } catch {
    /* column may already exist */
  }
  try {
    _db.exec(`UPDATE pm_cards SET status = 'design_approval' WHERE status = 'client_approval'`);
  } catch {
    /* ignore */
  }
  ensureOtherCard(_db);
  ensurePmSubtasksTable(_db);
  ensureTtNotificationsTable(_db);
  return _db;
}

function ensureTtNotificationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tt_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tt_notifications_user_created ON tt_notifications(user_id, created_at DESC);
  `);
}

function ensurePmSubtasksTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pm_subtasks (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      title TEXT NOT NULL,
      assignee_user_id TEXT,
      lead_user_id TEXT,
      estimated_hours REAL,
      completed_at TEXT,
      planned_start TEXT,
      planned_end TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pm_subtasks_card ON pm_subtasks(card_id);
  `);
}

function ensureOtherCard(db: Database.Database) {
  const extra = JSON.stringify({ virtual: true, kind: "other", projectType: "other" });
  const row = db.prepare(`SELECT id, extra FROM pm_cards WHERE id = ?`).get(VIRTUAL_OTHER_CARD_ID) as
    | { id: string; extra: string | null }
    | undefined;
  if (row) {
    if (!row.extra || !row.extra.includes('"virtual"')) {
      db.prepare(`UPDATE pm_cards SET extra = ?, updated_at = datetime('now') WHERE id = ?`).run(
        extra,
        VIRTUAL_OTHER_CARD_ID
      );
    }
    return;
  }
  db.prepare(
    `INSERT INTO pm_cards (id, source_project_id, source_detail_id, name, deadline, status, extra) VALUES (?, NULL, NULL, ?, NULL, ?, ?)`
  ).run(VIRTUAL_OTHER_CARD_ID, "Другое", DEFAULT_STATUS, extra);
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
  /** ISO: когда карточка вошла в статус согласования (сбрасывается при выходе). */
  approval_waiting_since: string | null;
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
  const prevApprovalSince =
    (card as { approval_waiting_since?: string | null }).approval_waiting_since ?? null;
  let approval_waiting_since = prevApprovalSince;
  if (updates.status !== undefined) {
    if (APPROVAL_WAITING_STATUS_SET.has(status)) {
      approval_waiting_since = new Date().toISOString();
    } else {
      approval_waiting_since = null;
    }
  }
  db.prepare(
    `UPDATE pm_cards SET name = ?, deadline = ?, status = ?, extra = ?, approval_waiting_since = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(name, deadline, status, extra, approval_waiting_since, id);
  return db.prepare("SELECT * FROM pm_cards WHERE id = ?").get(id) as PmCard;
}

export function deleteCard(id: string): boolean {
  const db = getDb();
  db.prepare("DELETE FROM pm_subtasks WHERE card_id = ?").run(id);
  const r = db.prepare("DELETE FROM pm_cards WHERE id = ?").run(id);
  return r.changes > 0;
}

/** Удалить все карточки из канбана (в Agency не трогаем). Возвращает количество удалённых. */
export function deleteAllCards(): number {
  const db = getDb();
  db.prepare("DELETE FROM pm_subtasks").run();
  const r = db.prepare("DELETE FROM pm_cards").run();
  return r.changes;
}

export function getCard(id: string): PmCard | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pm_cards WHERE id = ?").get(id);
  return (row as PmCard) ?? null;
}

export function getCardBySourceProjectId(sourceProjectId: string): PmCard | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pm_cards WHERE source_project_id = ? LIMIT 1").get(sourceProjectId);
  return (row as PmCard) ?? null;
}

/** Создать карточку канбана для проекта агентства, если её ещё нет. */
export function ensureCardForAgencyProject(project: {
  id: string;
  name: string;
  deadline: string | null;
}): PmCard {
  const existing = getCardBySourceProjectId(project.id);
  if (existing) return existing;
  return createCard({
    source_project_id: project.id,
    name: project.name,
    deadline: project.deadline,
    status: DEFAULT_STATUS,
  });
}
