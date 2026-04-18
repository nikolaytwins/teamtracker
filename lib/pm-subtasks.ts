import { getCard, getDb, updateCard } from "@/lib/db";
import { computeSubtaskProgressStats } from "@/lib/subtask-progress";
import type { PmStatusKey } from "@/lib/statuses";

export interface PmSubtask {
  id: string;
  card_id: string;
  title: string;
  assignee_user_id: string | null;
  lead_user_id: string | null;
  estimated_hours: number | null;
  completed_at: string | null;
  planned_start: string | null;
  planned_end: string | null;
  /** Этап реализации (pm_project_phases). */
  phase_id: string | null;
  /** Дедлайн подзадачи (может отличаться от дат выполнения). */
  deadline_at: string | null;
  /** JSON-массив строк дат YYYY-MM-DD — попадают в личные задачи / календарь. */
  execution_dates_json: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function parseExecutionDatesFromJson(raw: string | null | undefined): string[] {
  if (raw == null || !String(raw).trim()) return [];
  try {
    const a = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(a)) return [];
    return a
      .filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x.trim()))
      .map((x) => x.trim().slice(0, 10));
  } catch {
    return [];
  }
}

export function serializeExecutionDates(dates: string[]): string | null {
  const norm = [...new Set(dates.map((d) => d.trim().slice(0, 10)).filter(Boolean))].sort();
  if (norm.length === 0) return null;
  return JSON.stringify(norm);
}

function rowToSubtask(row: Record<string, unknown>): PmSubtask {
  return {
    id: String(row.id),
    card_id: String(row.card_id),
    title: String(row.title),
    assignee_user_id: row.assignee_user_id != null && String(row.assignee_user_id).trim() ? String(row.assignee_user_id) : null,
    lead_user_id: row.lead_user_id != null && String(row.lead_user_id).trim() ? String(row.lead_user_id) : null,
    estimated_hours:
      row.estimated_hours != null && !Number.isNaN(Number(row.estimated_hours)) ? Number(row.estimated_hours) : null,
    completed_at: row.completed_at != null && String(row.completed_at).trim() ? String(row.completed_at) : null,
    planned_start: row.planned_start != null && String(row.planned_start).trim() ? String(row.planned_start) : null,
    planned_end: row.planned_end != null && String(row.planned_end).trim() ? String(row.planned_end) : null,
    phase_id: row.phase_id != null && String(row.phase_id).trim() ? String(row.phase_id) : null,
    deadline_at: row.deadline_at != null && String(row.deadline_at).trim() ? String(row.deadline_at) : null,
    execution_dates_json:
      row.execution_dates_json != null && String(row.execution_dates_json).trim()
        ? String(row.execution_dates_json)
        : null,
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function listSubtasksForCard(cardId: string): PmSubtask[] {
  if (!getCard(cardId)) return [];
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM pm_subtasks WHERE card_id = ? ORDER BY sort_order ASC, created_at ASC`)
    .all(cardId) as Record<string, unknown>[];
  return rows.map(rowToSubtask);
}

export type PmSubtaskWithCard = PmSubtask & {
  card_name: string;
  card_status: PmStatusKey;
  card_extra: string | null;
};

/** Открытые подзадачи пользователя (исполнитель или лид) на активных карточках. */
/** Все незавершённые подзадачи на активных карточках (доска, режим «Задачи»). */
export function listBoardOpenSubtasks(): PmSubtaskWithCard[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.*, c.name AS card_name, c.status AS card_status, c.extra AS card_extra
       FROM pm_subtasks s
       INNER JOIN pm_cards c ON c.id = s.card_id
       WHERE s.completed_at IS NULL
         AND c.status NOT IN ('done', 'pause')
       ORDER BY c.deadline ASC NULLS LAST, c.name ASC, s.sort_order ASC, s.created_at ASC`
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => {
    const sub = rowToSubtask(row);
    return {
      ...sub,
      card_name: String(row.card_name ?? ""),
      card_status: String(row.card_status) as PmStatusKey,
      card_extra: row.card_extra != null ? String(row.card_extra) : null,
    };
  });
}

export function listOpenSubtasksForUser(userId: string): PmSubtaskWithCard[] {
  const uid = userId.trim();
  if (!uid) return [];
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.*, c.name AS card_name, c.status AS card_status, c.extra AS card_extra
       FROM pm_subtasks s
       INNER JOIN pm_cards c ON c.id = s.card_id
       WHERE (s.assignee_user_id = ? OR s.lead_user_id = ?)
         AND s.completed_at IS NULL
         AND c.status NOT IN ('done', 'pause')
       ORDER BY c.deadline ASC NULLS LAST, s.sort_order ASC, s.created_at ASC`
    )
    .all(uid, uid) as Record<string, unknown>[];
  return rows.map((row) => {
    const sub = rowToSubtask(row);
    return {
      ...sub,
      card_name: String(row.card_name ?? ""),
      card_status: String(row.card_status) as PmStatusKey,
      card_extra: row.card_extra != null ? String(row.card_extra) : null,
    };
  });
}

/** Открытая подзадача с тем же названием (без учёта регистра). */
export function findOpenSubtaskByTitle(cardId: string, title: string): PmSubtask | null {
  const t = title.trim();
  if (!t || !getCard(cardId)) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM pm_subtasks WHERE card_id = ? AND completed_at IS NULL AND LOWER(TRIM(title)) = LOWER(?) LIMIT 1`
    )
    .get(cardId, t) as Record<string, unknown> | undefined;
  return row ? rowToSubtask(row) : null;
}

export function getSubtask(cardId: string, subtaskId: string): PmSubtask | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM pm_subtasks WHERE id = ? AND card_id = ?`).get(subtaskId, cardId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return rowToSubtask(row);
}

/** Кэш в `pm_cards.extra.derivedSubtaskProgress` для отображения на канбане без лишних запросов. */
export function syncDerivedSubtaskProgressToCard(cardId: string): void {
  const card = getCard(cardId);
  if (!card) return;
  const subtasks = listSubtasksForCard(cardId);
  const stats = computeSubtaskProgressStats(subtasks);
  let extraObj: Record<string, unknown> = {};
  try {
    extraObj = card.extra ? (JSON.parse(card.extra) as Record<string, unknown>) : {};
  } catch {
    extraObj = {};
  }
  extraObj.derivedSubtaskProgress = {
    percent: stats.percent,
    completed: stats.completed,
    total: stats.total,
    byHours: stats.byHours,
    updatedAt: new Date().toISOString(),
  };
  updateCard(cardId, { extra: JSON.stringify(extraObj) });
}

export function createSubtask(params: {
  cardId: string;
  title: string;
  assigneeUserId?: string | null;
  leadUserId?: string | null;
  estimatedHours?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  phaseId?: string | null;
  deadlineAt?: string | null;
  executionDatesJson?: string | null;
}): PmSubtask | null {
  if (!getCard(params.cardId)) return null;
  const title = params.title.trim();
  if (!title) return null;
  const db = getDb();
  const maxRow = db.prepare(`SELECT MAX(sort_order) as m FROM pm_subtasks WHERE card_id = ?`).get(params.cardId) as {
    m: number | null;
  };
  const sortOrder = (maxRow?.m ?? -1) + 1;
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO pm_subtasks (id, card_id, title, assignee_user_id, lead_user_id, estimated_hours, completed_at, planned_start, planned_end, phase_id, deadline_at, execution_dates_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.cardId,
    title,
    params.assigneeUserId?.trim() || null,
    params.leadUserId?.trim() || null,
    params.estimatedHours != null && !Number.isNaN(Number(params.estimatedHours)) ? Number(params.estimatedHours) : null,
    params.plannedStart?.trim() || null,
    params.plannedEnd?.trim() || null,
    params.phaseId?.trim() || null,
    params.deadlineAt?.trim() || null,
    params.executionDatesJson?.trim() || null,
    sortOrder
  );
  const row = db.prepare(`SELECT * FROM pm_subtasks WHERE id = ?`).get(id) as Record<string, unknown>;
  syncDerivedSubtaskProgressToCard(params.cardId);
  return rowToSubtask(row);
}

export function updateSubtask(
  cardId: string,
  subtaskId: string,
  updates: {
    title?: string;
    assigneeUserId?: string | null;
    leadUserId?: string | null;
    estimatedHours?: number | null;
    completedAt?: string | null;
    plannedStart?: string | null;
    plannedEnd?: string | null;
    phaseId?: string | null;
    deadlineAt?: string | null;
    executionDatesJson?: string | null;
    sortOrder?: number;
  }
): PmSubtask | null {
  const db = getDb();
  const cur = db.prepare(`SELECT * FROM pm_subtasks WHERE id = ? AND card_id = ?`).get(subtaskId, cardId) as
    | Record<string, unknown>
    | undefined;
  if (!cur) return null;
  const title = updates.title !== undefined ? updates.title.trim() : String(cur.title);
  if (!title) return null;
  const assignee_user_id =
    updates.assigneeUserId !== undefined
      ? updates.assigneeUserId?.trim() || null
      : (cur.assignee_user_id as string | null);
  const lead_user_id =
    updates.leadUserId !== undefined ? updates.leadUserId?.trim() || null : (cur.lead_user_id as string | null);
  const estimated_hours =
    updates.estimatedHours !== undefined
      ? updates.estimatedHours != null && !Number.isNaN(Number(updates.estimatedHours))
        ? Number(updates.estimatedHours)
        : null
      : cur.estimated_hours != null
        ? Number(cur.estimated_hours)
        : null;
  const completed_at =
    updates.completedAt !== undefined ? updates.completedAt : (cur.completed_at as string | null);
  const planned_start =
    updates.plannedStart !== undefined ? updates.plannedStart?.trim() || null : (cur.planned_start as string | null);
  const planned_end =
    updates.plannedEnd !== undefined ? updates.plannedEnd?.trim() || null : (cur.planned_end as string | null);
  const phase_id =
    updates.phaseId !== undefined ? updates.phaseId?.trim() || null : ((cur.phase_id as string | null) ?? null);
  const deadline_at =
    updates.deadlineAt !== undefined ? updates.deadlineAt?.trim() || null : ((cur.deadline_at as string | null) ?? null);
  const execution_dates_json =
    updates.executionDatesJson !== undefined
      ? updates.executionDatesJson?.trim() || null
      : ((cur.execution_dates_json as string | null) ?? null);
  const sort_order = updates.sortOrder !== undefined ? updates.sortOrder : Number(cur.sort_order) || 0;
  db.prepare(
    `UPDATE pm_subtasks SET title = ?, assignee_user_id = ?, lead_user_id = ?, estimated_hours = ?, completed_at = ?, planned_start = ?, planned_end = ?, phase_id = ?, deadline_at = ?, execution_dates_json = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ? AND card_id = ?`
  ).run(
    title,
    assignee_user_id,
    lead_user_id,
    estimated_hours,
    completed_at,
    planned_start,
    planned_end,
    phase_id,
    deadline_at,
    execution_dates_json,
    sort_order,
    subtaskId,
    cardId
  );
  const row = db.prepare(`SELECT * FROM pm_subtasks WHERE id = ?`).get(subtaskId) as Record<string, unknown>;
  syncDerivedSubtaskProgressToCard(cardId);
  return rowToSubtask(row);
}

export function deleteSubtask(cardId: string, subtaskId: string): boolean {
  const db = getDb();
  const r = db.prepare(`DELETE FROM pm_subtasks WHERE id = ? AND card_id = ?`).run(subtaskId, cardId);
  if (r.changes > 0) syncDerivedSubtaskProgressToCard(cardId);
  return r.changes > 0;
}
