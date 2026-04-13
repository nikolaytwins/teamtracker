import { getDb, getCard, type PmCard } from "@/lib/db";

export interface PmProjectPhase {
  id: string;
  card_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface PmTimeEntry {
  id: string;
  card_id: string;
  phase_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  worker_name: string;
  worker_user_id: string | null;
  task_type: string | null;
  task_note: string | null;
}

/** Одна фаза для учёта из профиля (не плодим этапы вручную). */
export const QUICK_WORK_PHASE_TITLE = "Быстрый старт (профиль)";

export function ensurePhasesSchema() {
  const db = getDb();
  try {
    db.pragma("foreign_keys = ON");
  } catch {
    /* ignore */
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS pm_project_phases (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pm_phases_card ON pm_project_phases(card_id);
    CREATE TABLE IF NOT EXISTS pm_time_entries (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      phase_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_pm_time_card ON pm_time_entries(card_id);
    CREATE INDEX IF NOT EXISTS idx_pm_time_phase ON pm_time_entries(phase_id);
  `);
  try {
    db.exec(`ALTER TABLE pm_time_entries ADD COLUMN worker_name TEXT NOT NULL DEFAULT ''`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE pm_time_entries ADD COLUMN task_type TEXT`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE pm_time_entries ADD COLUMN task_note TEXT`);
  } catch {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE pm_time_entries ADD COLUMN worker_user_id TEXT`);
  } catch {
    /* exists */
  }
}

function secondsBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  return Math.max(0, Math.floor((b - a) / 1000));
}

function closeOpenEntriesForCard(cardId: string, endIso: string) {
  const db = getDb();
  const open = db
    .prepare(
      `SELECT * FROM pm_time_entries WHERE card_id = ? AND ended_at IS NULL ORDER BY started_at DESC`
    )
    .all(cardId) as PmTimeEntry[];
  for (const e of open) {
    const dur = secondsBetween(e.started_at, endIso);
    db.prepare(
      `UPDATE pm_time_entries SET ended_at = ?, duration_seconds = ? WHERE id = ?`
    ).run(endIso, dur, e.id);
  }
}

/** Закрыть все открытые сессии сотрудника по всем карточкам (один активный таймер на человека). */
export function closeOpenEntriesForWorker(workerName: string, endIso: string) {
  ensurePhasesSchema();
  const name = workerName.trim();
  if (!name) return;
  const db = getDb();
  const open = db
    .prepare(
      `SELECT * FROM pm_time_entries WHERE TRIM(worker_name) = ? AND ended_at IS NULL ORDER BY started_at ASC`
    )
    .all(name) as PmTimeEntry[];
  for (const e of open) {
    const dur = secondsBetween(e.started_at, endIso);
    db.prepare(`UPDATE pm_time_entries SET ended_at = ?, duration_seconds = ? WHERE id = ?`).run(
      endIso,
      dur,
      e.id
    );
  }
}

/** По user id (приоритет) или по имени для старых строк без worker_user_id. */
export function closeOpenEntriesForSessionUser(session: { sub: string; name: string }, endIso: string) {
  ensurePhasesSchema();
  const uid = session.sub.trim();
  const name = session.name.trim();
  if (!uid && !name) return;
  const db = getDb();
  const open = db
    .prepare(
      `SELECT * FROM pm_time_entries WHERE ended_at IS NULL AND (
        (worker_user_id IS NOT NULL AND TRIM(worker_user_id) != '' AND worker_user_id = ?)
        OR ((worker_user_id IS NULL OR TRIM(worker_user_id) = '') AND TRIM(worker_name) = ?)
      ) ORDER BY started_at ASC`
    )
    .all(uid, name) as PmTimeEntry[];
  for (const e of open) {
    const dur = secondsBetween(e.started_at, endIso);
    db.prepare(`UPDATE pm_time_entries SET ended_at = ?, duration_seconds = ? WHERE id = ?`).run(
      endIso,
      dur,
      e.id
    );
  }
}

export function getOrCreatePhaseByTitle(cardId: string, title: string): PmProjectPhase | null {
  const phases = listPhasesForCard(cardId);
  const found = phases.find((p) => p.title === title);
  if (found) return found;
  return createPhase(cardId, title);
}

export function getActiveEntryForWorker(workerName: string): PmTimeEntry | null {
  ensurePhasesSchema();
  const name = workerName.trim();
  if (!name) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM pm_time_entries WHERE TRIM(worker_name) = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`
    )
    .get(name) as PmTimeEntry | undefined;
  return row ?? null;
}

export function getActiveEntryForSessionUser(session: { sub: string; name: string }): PmTimeEntry | null {
  ensurePhasesSchema();
  const uid = session.sub.trim();
  const name = session.name.trim();
  if (!uid && !name) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM pm_time_entries WHERE ended_at IS NULL AND (
        (worker_user_id IS NOT NULL AND TRIM(worker_user_id) != '' AND worker_user_id = ?)
        OR ((worker_user_id IS NULL OR TRIM(worker_user_id) = '') AND TRIM(worker_name) = ?)
      ) ORDER BY started_at DESC LIMIT 1`
    )
    .get(uid, name) as PmTimeEntry | undefined;
  return row ?? null;
}

export function listPhasesForCard(cardId: string): PmProjectPhase[] {
  ensurePhasesSchema();
  const db = getDb();
  return db
    .prepare(`SELECT * FROM pm_project_phases WHERE card_id = ? ORDER BY sort_order ASC, created_at ASC`)
    .all(cardId) as PmProjectPhase[];
}

export function createPhase(cardId: string, title: string): PmProjectPhase | null {
  if (!getCard(cardId)) return null;
  ensurePhasesSchema();
  const db = getDb();
  const maxRow = db.prepare(`SELECT MAX(sort_order) as m FROM pm_project_phases WHERE card_id = ?`).get(cardId) as {
    m: number | null;
  };
  const sortOrder = (maxRow?.m ?? -1) + 1;
  const id = `phase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO pm_project_phases (id, card_id, title, sort_order) VALUES (?, ?, ?, ?)`
  ).run(id, cardId, title.trim(), sortOrder);
  return db.prepare(`SELECT * FROM pm_project_phases WHERE id = ?`).get(id) as PmProjectPhase;
}

export function updatePhase(
  cardId: string,
  phaseId: string,
  updates: { title?: string; sort_order?: number }
): PmProjectPhase | null {
  ensurePhasesSchema();
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM pm_project_phases WHERE id = ? AND card_id = ?`)
    .get(phaseId, cardId) as PmProjectPhase | undefined;
  if (!row) return null;
  const title = updates.title !== undefined ? updates.title.trim() : row.title;
  const sort_order = updates.sort_order !== undefined ? updates.sort_order : row.sort_order;
  db.prepare(`UPDATE pm_project_phases SET title = ?, sort_order = ? WHERE id = ?`).run(
    title,
    sort_order,
    phaseId
  );
  return db.prepare(`SELECT * FROM pm_project_phases WHERE id = ?`).get(phaseId) as PmProjectPhase;
}

export function deletePhase(cardId: string, phaseId: string): boolean {
  ensurePhasesSchema();
  const db = getDb();
  const exists = db.prepare(`SELECT id FROM pm_project_phases WHERE id = ? AND card_id = ?`).get(phaseId, cardId);
  if (!exists) return false;
  db.prepare(`DELETE FROM pm_time_entries WHERE phase_id = ?`).run(phaseId);
  db.prepare(`DELETE FROM pm_project_phases WHERE id = ? AND card_id = ?`).run(phaseId, cardId);
  return true;
}

export function getActiveEntry(cardId: string): PmTimeEntry | null {
  ensurePhasesSchema();
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM pm_time_entries WHERE card_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`)
    .get(cardId) as PmTimeEntry | undefined;
  return row ?? null;
}

export function startTimer(
  cardId: string,
  phaseId: string,
  opts: {
    workerName: string;
    workerUserId: string;
    taskType?: string | null;
    taskNote?: string | null;
  }
): { entry: PmTimeEntry; closedPrevious: boolean } | null {
  const worker = (opts.workerName || "").trim();
  if (!worker) return null;
  const workerUserId = (opts.workerUserId || "").trim();
  if (!getCard(cardId)) return null;
  ensurePhasesSchema();
  const db = getDb();
  const phase = db
    .prepare(`SELECT id FROM pm_project_phases WHERE id = ? AND card_id = ?`)
    .get(phaseId, cardId);
  if (!phase) return null;
  const now = new Date().toISOString();
  const sessionKey = { sub: workerUserId, name: worker };
  const hadOpenBefore = Boolean(getActiveEntryForSessionUser(sessionKey));
  closeOpenEntriesForSessionUser(sessionKey, now);
  closeOpenEntriesForCard(cardId, now);
  const taskType = opts.taskType != null && String(opts.taskType).trim() ? String(opts.taskType).trim() : null;
  const taskNote =
    opts.taskNote != null && String(opts.taskNote).trim() ? String(opts.taskNote).trim() : null;
  const id = `tent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO pm_time_entries (id, card_id, phase_id, started_at, ended_at, duration_seconds, worker_name, worker_user_id, task_type, task_note) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`
  ).run(id, cardId, phaseId, now, worker, workerUserId || null, taskType, taskNote);
  const entry = db.prepare(`SELECT * FROM pm_time_entries WHERE id = ?`).get(id) as PmTimeEntry;
  return { entry, closedPrevious: hadOpenBefore };
}

export function stopTimer(cardId: string): PmTimeEntry | null {
  ensurePhasesSchema();
  const active = getActiveEntry(cardId);
  if (!active) return null;
  const now = new Date().toISOString();
  const dur = secondsBetween(active.started_at, now);
  const db = getDb();
  db.prepare(`UPDATE pm_time_entries SET ended_at = ?, duration_seconds = ? WHERE id = ?`).run(
    now,
    dur,
    active.id
  );
  return db.prepare(`SELECT * FROM pm_time_entries WHERE id = ?`).get(active.id) as PmTimeEntry;
}

export function listTimeEntriesForCard(cardId: string): PmTimeEntry[] {
  ensurePhasesSchema();
  const db = getDb();
  return db
    .prepare(`SELECT * FROM pm_time_entries WHERE card_id = ? ORDER BY started_at DESC`)
    .all(cardId) as PmTimeEntry[];
}

/** Завершённые записи пользователя за полуинтервал [startIso, endIso) по `started_at`. */
export function listCompletedEntriesForSessionUserInRange(
  session: { sub: string; name: string },
  startIso: string,
  endIso: string
): PmTimeEntry[] {
  ensurePhasesSchema();
  const uid = session.sub.trim();
  const name = session.name.trim();
  if (!uid && !name) return [];
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM pm_time_entries
       WHERE ended_at IS NOT NULL AND duration_seconds IS NOT NULL
         AND started_at >= ? AND started_at < ?
         AND (
           (worker_user_id IS NOT NULL AND TRIM(worker_user_id) != '' AND worker_user_id = ?)
           OR ((worker_user_id IS NULL OR TRIM(worker_user_id) = '') AND TRIM(worker_name) = ?)
         )
       ORDER BY started_at DESC`
    )
    .all(startIso, endIso, uid, name) as PmTimeEntry[];
}

export function sumCompletedSecondsForPhase(phaseId: string): number {
  ensurePhasesSchema();
  const db = getDb();
  const row = db
    .prepare(`SELECT COALESCE(SUM(duration_seconds), 0) as s FROM pm_time_entries WHERE phase_id = ? AND ended_at IS NOT NULL`)
    .get(phaseId) as { s: number };
  return Number(row?.s) || 0;
}

export function buildCardPhasesPayload(cardId: string): {
  card: PmCard | null;
  phases: Array<PmProjectPhase & { totalSeconds: number }>;
  entries: PmTimeEntry[];
  activeEntry: PmTimeEntry | null;
  projectTotalSeconds: number;
} {
  const card = getCard(cardId);
  const phases = listPhasesForCard(cardId);
  const entries = listTimeEntriesForCard(cardId);
  const activeEntry = getActiveEntry(cardId);
  const now = Date.now();

  let projectTotal = 0;
  const phasesWithTotals = phases.map((p) => {
    let sec = sumCompletedSecondsForPhase(p.id);
    if (activeEntry && activeEntry.phase_id === p.id && !activeEntry.ended_at) {
      sec += Math.floor((now - new Date(activeEntry.started_at).getTime()) / 1000);
    }
    projectTotal += sec;
    return { ...p, totalSeconds: sec };
  });

  return {
    card,
    phases: phasesWithTotals,
    entries,
    activeEntry,
    projectTotalSeconds: projectTotal,
  };
}
