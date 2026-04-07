import { getDb } from "@/lib/db";
import { ensurePhasesSchema } from "@/lib/pm-phases";
import { ANALYTICS_BUCKETS, labelForWorkPreset } from "@/lib/work-presets";

export function secondsToHours(sec: number): number {
  return Math.round((sec / 3600) * 10) / 10;
}

/** Часы по конкретным ключам task_type за месяц */
export function getWorkerMonthlyTaskBreakdown(workerName: string, monthYm: string) {
  ensurePhasesSchema();
  const db = getDb();
  const name = workerName.trim();
  if (!name) {
    return { rows: [] as Array<{ taskType: string; label: string; seconds: number }>, totalSeconds: 0 };
  }
  const sqlRows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(task_type), ''), '') as t, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE TRIM(worker_name) = ? AND strftime('%Y-%m', started_at) = ?
         AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL
       GROUP BY t
       ORDER BY s DESC`
    )
    .all(name, monthYm) as Array<{ t: string; s: number }>;
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
export function getWorkerMonthlyBuckets(workerName: string, monthYm: string) {
  const { rows, totalSeconds } = getWorkerMonthlyTaskBreakdown(workerName, monthYm);
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

/** Средняя длительность одной сессии по типу задачи (завершённые). */
export function getWorkerAverageSessionByTaskType(workerName: string, minSessions = 1) {
  ensurePhasesSchema();
  const db = getDb();
  const name = workerName.trim();
  if (!name) return [] as Array<{ taskType: string; label: string; avgSeconds: number; sessions: number }>;
  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(task_type), ''), '') as t,
        AVG(duration_seconds) as avg_s,
        COUNT(*) as c
       FROM pm_time_entries
       WHERE TRIM(worker_name) = ? AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL
       GROUP BY t
       HAVING c >= ?
       ORDER BY c DESC`
    )
    .all(name, minSessions) as Array<{ t: string; avg_s: number; c: number }>;
  return rows.map((r) => ({
    taskType: r.t || "",
    label: labelForWorkPreset(r.t || ""),
    avgSeconds: Math.round(Number(r.avg_s) || 0),
    avgHours: secondsToHours(Number(r.avg_s) || 0),
    sessions: r.c,
  }));
}
