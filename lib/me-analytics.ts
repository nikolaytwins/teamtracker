import { getDb } from "@/lib/db";
import { ensurePhasesSchema } from "@/lib/pm-phases";
import { ANALYTICS_BUCKETS, labelForWorkPreset } from "@/lib/work-presets";

export type SessionWorkerKey = { sub: string; name: string };

export function secondsToHours(sec: number): number {
  return Math.round((sec / 3600) * 10) / 10;
}

const WORKER_MATCH_SQL = `(
  (worker_user_id IS NOT NULL AND TRIM(worker_user_id) != '' AND worker_user_id = ?)
  OR ((worker_user_id IS NULL OR TRIM(worker_user_id) = '') AND TRIM(worker_name) = ?)
)`;

/** Часы по конкретным ключам task_type за месяц */
export function getWorkerMonthlyTaskBreakdown(worker: SessionWorkerKey, monthYm: string) {
  ensurePhasesSchema();
  const db = getDb();
  const uid = worker.sub.trim();
  const name = worker.name.trim();
  if (!uid && !name) {
    return { rows: [] as Array<{ taskType: string; label: string; seconds: number }>, totalSeconds: 0 };
  }
  const sqlRows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(task_type), ''), '') as t, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE ${WORKER_MATCH_SQL} AND strftime('%Y-%m', started_at) = ?
         AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL
       GROUP BY t
       ORDER BY s DESC`
    )
    .all(uid, name, monthYm) as Array<{ t: string; s: number }>;
  const totalSeconds = sqlRows.reduce((a, r) => a + r.s, 0);
  return {
    totalSeconds,
    rows: sqlRows.map((r) => ({
      taskType: r.t || "",
      label: labelForWorkPreset(r.t || ""),
      seconds: r.s,
      hours: secondsToHours(r.s),
    })),
  };
}

/** Агрегаты по категориям (секунды по ключу task_type суммируются в подходящие ведра). */
export function getWorkerMonthlyBuckets(worker: SessionWorkerKey, monthYm: string) {
  const { rows, totalSeconds } = getWorkerMonthlyTaskBreakdown(worker, monthYm);
  const taskSeconds = new Map<string, number>();
  for (const r of rows) {
    taskSeconds.set(r.taskType, r.seconds);
  }
  const buckets: Array<{ id: string; label: string; seconds: number; hours: number }> = [];
  for (const b of ANALYTICS_BUCKETS) {
    let s = 0;
    for (const [k, sec] of taskSeconds) {
      if (b.match(k)) s += sec;
    }
    if (s > 0) buckets.push({ id: b.id, label: b.label, seconds: s, hours: secondsToHours(s) });
  }
  return { buckets, totalSeconds, rawRows: rows };
}

/** Все дни месяца YYYY-MM с суммой секунд (0 для дней без записей). */
export function getWorkerMonthlyByDaySeries(worker: SessionWorkerKey, monthYm: string) {
  ensurePhasesSchema();
  const db = getDb();
  const uid = worker.sub.trim();
  const name = worker.name.trim();
  const m = /^(\d{4})-(\d{2})$/.exec(monthYm);
  if (!m) return [] as Array<{ date: string; seconds: number; hours: number }>;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return [];
  const lastDay = new Date(y, mo, 0).getDate();

  const sparse =
    !uid && !name
      ? ([] as Array<{ d: string; s: number }>)
      : (db
          .prepare(
            `SELECT strftime('%Y-%m-%d', started_at) as d, SUM(duration_seconds) as s
             FROM pm_time_entries
             WHERE ${WORKER_MATCH_SQL} AND strftime('%Y-%m', started_at) = ?
               AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL
             GROUP BY d`
          )
          .all(uid, name, monthYm) as Array<{ d: string; s: number }>);

  const byDate = new Map<string, number>();
  for (const row of sparse) {
    if (row.d) byDate.set(row.d, Number(row.s) || 0);
  }

  const out: Array<{ date: string; seconds: number; hours: number }> = [];
  for (let day = 1; day <= lastDay; day++) {
    const date = `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const seconds = byDate.get(date) ?? 0;
    out.push({ date, seconds, hours: secondsToHours(seconds) });
  }
  return out;
}

/** Средняя длительность одной сессии по типу задачи (завершённые). */
export function getWorkerAverageSessionByTaskType(worker: SessionWorkerKey, minSessions = 1) {
  ensurePhasesSchema();
  const db = getDb();
  const uid = worker.sub.trim();
  const name = worker.name.trim();
  if (!uid && !name)
    return [] as Array<{ taskType: string; label: string; avgSeconds: number; sessions: number }>;
  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(task_type), ''), '') as t,
        AVG(duration_seconds) as avg_s,
        COUNT(*) as c
       FROM pm_time_entries
       WHERE ${WORKER_MATCH_SQL} AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL
       GROUP BY t
       HAVING c >= ?
       ORDER BY c DESC`
    )
    .all(uid, name, minSessions) as Array<{ t: string; avg_s: number; c: number }>;
  return rows.map((r) => ({
    taskType: r.t || "",
    label: labelForWorkPreset(r.t || ""),
    avgSeconds: Math.round(Number(r.avg_s) || 0),
    avgHours: secondsToHours(Number(r.avg_s) || 0),
    sessions: r.c,
  }));
}
