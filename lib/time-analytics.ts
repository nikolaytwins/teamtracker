import { getDb } from "@/lib/db";
import { ensurePhasesSchema, type PmTimeEntry } from "@/lib/pm-phases";
import { listUsersPublic } from "@/lib/tt-auth-db";
import { parseISOWeekParam } from "@/lib/iso-week";

const UNKNOWN_WORKER_LABEL = "(не указан)";

function ensureTimeSchema() {
  ensurePhasesSchema();
}

export function secondsToHours(sec: number): number {
  return Math.round((sec / 3600) * 10) / 10;
}

/** Завершённые сессии за календарный месяц YYYY-MM */
export function getMonthlyAggregates(monthYm: string) {
  ensureTimeSchema();
  const db = getDb();
  const byWorker = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(worker_name), ''), '(не указан)') as w, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE ended_at IS NOT NULL AND duration_seconds IS NOT NULL
         AND strftime('%Y-%m', started_at) = ?
       GROUP BY w ORDER BY s DESC`
    )
    .all(monthYm) as Array<{ w: string; s: number }>;

  const byTaskType = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(task_type), ''), '') as t, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE ended_at IS NOT NULL AND duration_seconds IS NOT NULL
         AND strftime('%Y-%m', started_at) = ?
       GROUP BY t ORDER BY s DESC`
    )
    .all(monthYm) as Array<{ t: string; s: number }>;

  const totalRow = db
    .prepare(
      `SELECT COALESCE(SUM(duration_seconds), 0) as s FROM pm_time_entries
       WHERE ended_at IS NOT NULL AND duration_seconds IS NOT NULL
         AND strftime('%Y-%m', started_at) = ?`
    )
    .get(monthYm) as { s: number };

  return {
    byWorker,
    byTaskType,
    totalSeconds: Number(totalRow?.s) || 0,
  };
}

export function searchProjectsWithTime(query: string) {
  ensureTimeSchema();
  const db = getDb();
  const q = `%${query.trim()}%`;
  const rows = db
    .prepare(
      `SELECT c.id, c.name,
        COALESCE(SUM(CASE WHEN e.ended_at IS NOT NULL AND e.duration_seconds IS NOT NULL THEN e.duration_seconds ELSE 0 END), 0) as total_seconds
       FROM pm_cards c
       LEFT JOIN pm_time_entries e ON e.card_id = c.id
       WHERE c.name LIKE ?
       GROUP BY c.id
       ORDER BY total_seconds DESC, c.name ASC`
    )
    .all(q) as Array<{ id: string; name: string; total_seconds: number }>;
  return rows;
}

export function getProjectTimeDetail(
  cardId: string,
  opts?: { activeEntry: PmTimeEntry | null; nowMs?: number }
) {
  ensureTimeSchema();
  const db = getDb();
  const card = db.prepare(`SELECT id, name FROM pm_cards WHERE id = ?`).get(cardId) as
    | { id: string; name: string }
    | undefined;
  if (!card) return null;

  const totalRow = db
    .prepare(
      `SELECT COALESCE(SUM(duration_seconds), 0) as s FROM pm_time_entries
       WHERE card_id = ? AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL`
    )
    .get(cardId) as { s: number };

  const byWorkerRows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(worker_name), ''), '(не указан)') as w, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE card_id = ? AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL
       GROUP BY w ORDER BY s DESC`
    )
    .all(cardId) as Array<{ w: string; s: number }>;

  const phases = db
    .prepare(`SELECT id, title FROM pm_project_phases WHERE card_id = ? ORDER BY sort_order ASC, created_at ASC`)
    .all(cardId) as Array<{ id: string; title: string }>;

  const raw = db
    .prepare(
      `SELECT e.phase_id, COALESCE(NULLIF(TRIM(e.worker_name), ''), '(не указан)') as w, SUM(e.duration_seconds) as s
       FROM pm_time_entries e
       WHERE e.card_id = ? AND e.ended_at IS NOT NULL AND e.duration_seconds IS NOT NULL
       GROUP BY e.phase_id, w`
    )
    .all(cardId) as Array<{ phase_id: string; w: string; s: number }>;

  let activeElapsed = 0;
  let activeWorker: string | null = null;
  let activePhaseId: string | null = null;
  const a = opts?.activeEntry;
  if (a && !a.ended_at && a.card_id === cardId) {
    const nowMs = opts?.nowMs ?? Date.now();
    activeElapsed = Math.max(0, Math.floor((nowMs - new Date(a.started_at).getTime()) / 1000));
    activeWorker = a.worker_name?.trim() ? a.worker_name.trim() : UNKNOWN_WORKER_LABEL;
    activePhaseId = a.phase_id;
  }

  const workerList = [...new Set([...byWorkerRows.map((r) => r.w), ...(activeWorker ? [activeWorker] : [])])].sort();

  const matrix = phases.map((p) => {
    const byW: Record<string, number> = {};
    for (const w of workerList) byW[w] = 0;
    for (const r of raw) {
      if (r.phase_id === p.id) byW[r.w] = (byW[r.w] || 0) + r.s;
    }
    if (activePhaseId === p.id && activeWorker && activeElapsed > 0) {
      byW[activeWorker] = (byW[activeWorker] || 0) + activeElapsed;
    }
    const phaseTotal = Object.values(byW).reduce((a, b) => a + b, 0);
    return { phaseId: p.id, phaseTitle: p.title, byWorker: byW, phaseSeconds: phaseTotal };
  });

  const byWorkerMap = Object.fromEntries(byWorkerRows.map((r) => [r.w, r.s])) as Record<string, number>;
  if (activeWorker && activeElapsed > 0) {
    byWorkerMap[activeWorker] = (byWorkerMap[activeWorker] || 0) + activeElapsed;
  }

  return {
    card,
    totalSeconds: (Number(totalRow?.s) || 0) + activeElapsed,
    byWorker: byWorkerMap,
    workerList,
    matrix,
  };
}

export function getEmployeeMonthly(workerName: string, monthYm: string) {
  ensureTimeSchema();
  const db = getDb();
  const name = workerName.trim();
  if (!name) {
    return {
      totalSeconds: 0,
      byProject: [] as Array<{ cardId: string; name: string; seconds: number }>,
      byTaskType: [] as Array<{ type: string; seconds: number }>,
    };
  }

  const isUnknown = name === UNKNOWN_WORKER_LABEL;
  const workerSql = isUnknown
    ? `(TRIM(COALESCE(e.worker_name, '')) = '')`
    : `TRIM(e.worker_name) = ?`;

  const rows = db
    .prepare(
      `SELECT c.id as cardId, c.name, SUM(e.duration_seconds) as s
       FROM pm_time_entries e
       JOIN pm_cards c ON c.id = e.card_id
       WHERE ${workerSql}
         AND strftime('%Y-%m', e.started_at) = ?
         AND e.ended_at IS NOT NULL AND e.duration_seconds IS NOT NULL
       GROUP BY c.id
       ORDER BY s DESC`
    )
    .all(...(isUnknown ? [monthYm] : [name, monthYm])) as Array<{ cardId: string; name: string; s: number }>;

  const typeRows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(e.task_type), ''), '') as t, SUM(e.duration_seconds) as s
       FROM pm_time_entries e
       WHERE ${workerSql}
         AND strftime('%Y-%m', e.started_at) = ?
         AND e.ended_at IS NOT NULL AND e.duration_seconds IS NOT NULL
       GROUP BY t
       ORDER BY s DESC`
    )
    .all(...(isUnknown ? [monthYm] : [name, monthYm])) as Array<{ t: string; s: number }>;

  const totalSeconds = rows.reduce((acc, r) => acc + r.s, 0);
  return {
    totalSeconds,
    byProject: rows.map((r) => ({ cardId: r.cardId, name: r.name, seconds: r.s })),
    byTaskType: typeRows.map((r) => ({ type: r.t || "", seconds: r.s })),
  };
}

export function listDistinctWorkers() {
  ensureTimeSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT TRIM(worker_name) as w FROM pm_time_entries
       WHERE TRIM(worker_name) != '' ORDER BY w ASC`
    )
    .all() as Array<{ w: string }>;
  return rows.map((r) => r.w);
}

export type TeamWeekLoadRow = {
  userId: string;
  displayName: string;
  role: string;
  weeklyCapacityHours: number;
  weekSeconds: number;
  previousWeekSeconds: number;
};

export function getTeamWeekLoad(isoWeek: string): {
  week: string;
  mondayIso: string;
  nextMondayIso: string;
  rows: TeamWeekLoadRow[];
} {
  ensureTimeSchema();
  const parsed = parseISOWeekParam(isoWeek);
  if (!parsed) {
    throw new Error("invalid week");
  }
  const db = getDb();
  const users = listUsersPublic();

  const mondayIso = parsed.monday.toISOString();
  const nextMondayIso = parsed.nextMonday.toISOString();
  const prevMonday = new Date(parsed.monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevNextMonday = new Date(parsed.monday);
  const prevMondayIso = prevMonday.toISOString();
  const prevNextMondayIso = prevNextMonday.toISOString();

  const currentRows = db
    .prepare(
      `SELECT worker_user_id as uid, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE worker_user_id IS NOT NULL
         AND TRIM(worker_user_id) != ''
         AND ended_at IS NOT NULL
         AND duration_seconds IS NOT NULL
         AND started_at >= ?
         AND started_at < ?
       GROUP BY worker_user_id`
    )
    .all(mondayIso, nextMondayIso) as Array<{ uid: string; s: number }>;

  const previousRows = db
    .prepare(
      `SELECT worker_user_id as uid, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE worker_user_id IS NOT NULL
         AND TRIM(worker_user_id) != ''
         AND ended_at IS NOT NULL
         AND duration_seconds IS NOT NULL
         AND started_at >= ?
         AND started_at < ?
       GROUP BY worker_user_id`
    )
    .all(prevMondayIso, prevNextMondayIso) as Array<{ uid: string; s: number }>;

  const currentByUser = new Map<string, number>(currentRows.map((r) => [r.uid, Number(r.s) || 0]));
  const previousByUser = new Map<string, number>(previousRows.map((r) => [r.uid, Number(r.s) || 0]));

  const rows = users
    .map((u) => ({
      userId: u.id,
      displayName: u.display_name,
      role: u.role,
      weeklyCapacityHours: u.weekly_capacity_hours,
      weekSeconds: currentByUser.get(u.id) ?? 0,
      previousWeekSeconds: previousByUser.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.weekSeconds - a.weekSeconds || a.displayName.localeCompare(b.displayName, "ru"));

  return { week: parsed.week, mondayIso, nextMondayIso, rows };
}
