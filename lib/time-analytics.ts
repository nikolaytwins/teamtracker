import { getDb } from "@/lib/db";
import { ensurePhasesSchema, type PmTimeEntry } from "@/lib/pm-phases";
import { listUsersPublic, type TtUserPublic } from "@/lib/tt-auth-db";
import { parseISOWeekParam } from "@/lib/iso-week";
import { getPlannedHoursByUserDayForWeek, getTimeSecondsByUserDay } from "@/lib/team-week-plan";
import { dailyCapacityHours } from "@/lib/tt-user-schedule";

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

export type EmployeeMonthMatch = {
  /** Если задан — строки с этим worker_user_id и строки без id с тем же worker_name (имя из профиля). */
  userId?: string | null;
  workerName: string;
};

/** Фильтр завершённых записей за месяц по сотруднику (имя и/или user id). */
export function buildEmployeeMonthEntryWhere(
  monthYm: string,
  m: EmployeeMonthMatch
): { fragment: string; args: unknown[] } {
  const parts = [
    `strftime('%Y-%m', e.started_at) = ?`,
    `e.ended_at IS NOT NULL`,
    `e.duration_seconds IS NOT NULL`,
  ];
  const args: unknown[] = [monthYm.trim()];
  const name = m.workerName.trim();
  const uid = m.userId?.trim() || "";

  if (uid) {
    parts.push(
      `((TRIM(COALESCE(e.worker_user_id,'')) != '' AND e.worker_user_id = ?) OR ((e.worker_user_id IS NULL OR TRIM(e.worker_user_id) = '') AND TRIM(e.worker_name) = ?))`
    );
    args.push(uid, name);
  } else if (!name) {
    parts.push("1 = 0");
  } else if (name === UNKNOWN_WORKER_LABEL) {
    parts.push(`TRIM(COALESCE(e.worker_name, '')) = ''`);
  } else {
    parts.push(`TRIM(e.worker_name) = ?`);
    args.push(name);
  }
  return { fragment: parts.join(" AND "), args };
}

export function getEmployeeMonthlyMatch(m: EmployeeMonthMatch, monthYm: string) {
  ensureTimeSchema();
  const db = getDb();
  const { fragment, args } = buildEmployeeMonthEntryWhere(monthYm, m);

  const rows = db
    .prepare(
      `SELECT c.id as cardId, c.name, SUM(e.duration_seconds) as s
       FROM pm_time_entries e
       JOIN pm_cards c ON c.id = e.card_id
       WHERE ${fragment}
       GROUP BY c.id
       ORDER BY s DESC`
    )
    .all(...args) as Array<{ cardId: string; name: string; s: number }>;

  const typeRows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(e.task_type), ''), '') as t, SUM(e.duration_seconds) as s
       FROM pm_time_entries e
       WHERE ${fragment}
       GROUP BY t
       ORDER BY s DESC`
    )
    .all(...args) as Array<{ t: string; s: number }>;

  const totalSeconds = rows.reduce((acc, r) => acc + r.s, 0);
  return {
    totalSeconds,
    byProject: rows.map((r) => ({ cardId: r.cardId, name: r.name, seconds: r.s })),
    byTaskType: typeRows.map((r) => ({ type: r.t || "", seconds: r.s })),
  };
}

export function getEmployeeMonthly(workerName: string, monthYm: string) {
  return getEmployeeMonthlyMatch({ workerName }, monthYm);
}

export type EmployeeMonthlySessionRow = {
  id: string;
  cardId: string;
  cardName: string;
  taskType: string | null;
  taskNote: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  /** Календарная дата начала (SQLite `strftime` по полю started_at). */
  workDate: string;
};

export function getEmployeeMonthlySessions(
  m: EmployeeMonthMatch,
  monthYm: string,
  limit = 2000
): EmployeeMonthlySessionRow[] {
  ensureTimeSchema();
  const db = getDb();
  const { fragment, args } = buildEmployeeMonthEntryWhere(monthYm, m);
  const lim = Math.min(5000, Math.max(1, Math.floor(limit)));
  const rows = db
    .prepare(
      `SELECT e.id as id, e.card_id as cardId, c.name as cardName,
              e.task_type as taskType, e.task_note as taskNote,
              e.started_at as startedAt, e.ended_at as endedAt, e.duration_seconds as durationSeconds,
              strftime('%Y-%m-%d', e.started_at) as workDate
       FROM pm_time_entries e
       JOIN pm_cards c ON c.id = e.card_id
       WHERE ${fragment}
       ORDER BY e.started_at DESC
       LIMIT ?`
    )
    .all(...args, lim) as Array<{
    id: string;
    cardId: string;
    cardName: string;
    taskType: string | null;
    taskNote: string | null;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    workDate: string;
  }>;
  return rows.map((r) => ({
    id: String(r.id),
    cardId: String(r.cardId),
    cardName: String(r.cardName ?? ""),
    taskType: r.taskType != null ? String(r.taskType) : null,
    taskNote: r.taskNote != null ? String(r.taskNote) : null,
    startedAt: String(r.startedAt),
    endedAt: String(r.endedAt),
    durationSeconds: Number(r.durationSeconds) || 0,
    workDate: String(r.workDate ?? ""),
  }));
}

/** Завершённые секунды по календарным дням (YYYY-MM-DD) внутри месяца YYYY-MM. */
export function getEmployeeMonthlyHoursByDay(
  m: EmployeeMonthMatch,
  monthYm: string
): Array<{ date: string; seconds: number; hours: number }> {
  ensureTimeSchema();
  const db = getDb();
  const { fragment, args } = buildEmployeeMonthEntryWhere(monthYm, m);
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', e.started_at) as d, SUM(e.duration_seconds) as s
       FROM pm_time_entries e
       WHERE ${fragment}
       GROUP BY d
       HAVING d IS NOT NULL AND TRIM(d) != ''
       ORDER BY d ASC`
    )
    .all(...args) as Array<{ d: string; s: number }>;
  return rows.map((r) => {
    const s = Number(r.s) || 0;
    return { date: String(r.d ?? ""), seconds: s, hours: secondsToHours(s) };
  });
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
  monday: Date;
  rows: TeamWeekLoadRow[];
} {
  ensureTimeSchema();
  const parsed = parseISOWeekParam(isoWeek);
  if (!parsed) {
    throw new Error("invalid week");
  }
  const db = getDb();
  const users = listUsersPublic();
  const monday = parsed.monday;

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

  return { week: parsed.week, mondayIso, nextMondayIso, monday, rows };
}

const DAY_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function dayLoadStatus(loadHours: number, capacity: number): "under" | "normal" | "over" {
  const safe = capacity > 0 ? capacity : 8;
  const ratio = loadHours / safe;
  if (capacity <= 0) return loadHours > 0.1 ? "over" : "normal";
  if (ratio < 0.9) return "under";
  if (ratio > 1.1) return "over";
  return "normal";
}

export type TeamWeekUserDayRow = {
  date: string;
  shortLabel: string;
  capacityHours: number;
  loggedHours: number;
  plannedHours: number;
  loadHours: number;
  status: "under" | "normal" | "over";
};

/** Поминутная разбивка недели: факт, план по подзадачам, ёмкость по графику сотрудника. */
export function buildTeamWeekUserDays(params: {
  monday: Date;
  mondayIso: string;
  nextMondayIso: string;
  user: TtUserPublic;
}): TeamWeekUserDayRow[] {
  const loggedMap = getTimeSecondsByUserDay(params.mondayIso, params.nextMondayIso);
  const plannedMap = getPlannedHoursByUserDayForWeek(params.monday);
  const uid = params.user.id;
  const work_days = params.user.work_days ?? [];
  const work_hours_per_day = params.user.work_hours_per_day ?? 8;

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(params.monday);
    d.setDate(params.monday.getDate() + i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  return dates.map((date) => {
    const dow = new Date(`${date}T12:00:00`).getDay();
    const shortLabel = DAY_SHORT_RU[dow] ?? "?";
    const capacityHours = dailyCapacityHours({
      work_hours_per_day,
      work_days: work_days,
      ymd: date,
    });
    const sec = loggedMap.get(`${uid}\t${date}`) ?? 0;
    const loggedHours = secondsToHours(sec);
    const plannedRaw = plannedMap.get(`${uid}\t${date}`) ?? 0;
    const plannedRounded = Math.round(plannedRaw * 10) / 10;
    const loadHours = Math.round((loggedHours + plannedRounded) * 10) / 10;
    const status = dayLoadStatus(loadHours, capacityHours);
    return {
      date,
      shortLabel,
      capacityHours: Math.round(capacityHours * 10) / 10,
      loggedHours,
      plannedHours: plannedRounded,
      loadHours,
      status,
    };
  });
}
