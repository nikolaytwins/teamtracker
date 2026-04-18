import { getDb } from "@/lib/db";
import { ensurePhasesSchema } from "@/lib/pm-phases";
import { parseExecutionDatesFromJson } from "@/lib/pm-subtasks-shared";
import { weekYmdDates } from "@/lib/tt-user-schedule";

function ymdSlice(iso: string | null | undefined): string | null {
  if (iso == null || !String(iso).trim()) return null;
  const s = String(iso).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1]! : null;
}

function enumerateYmdInclusive(a: string, b: string): string[] {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return [];
  const start = da <= db ? da : db;
  const end = da <= db ? db : da;
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return out;
}

/** Секунды по ключу `userId\tYYYY-MM-DD` за интервал [mondayIso, nextMondayIso). */
export function getTimeSecondsByUserDay(mondayIso: string, nextMondayIso: string): Map<string, number> {
  ensurePhasesSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT worker_user_id as uid, substr(started_at, 1, 10) as d, SUM(duration_seconds) as s
       FROM pm_time_entries
       WHERE worker_user_id IS NOT NULL AND TRIM(worker_user_id) != ''
         AND ended_at IS NOT NULL AND duration_seconds IS NOT NULL
         AND started_at >= ? AND started_at < ?
       GROUP BY worker_user_id, substr(started_at, 1, 10)`
    )
    .all(mondayIso, nextMondayIso) as Array<{ uid: string; d: string; s: number }>;
  const m = new Map<string, number>();
  for (const r of rows) {
    const uid = String(r.uid).trim();
    const d = String(r.d).trim();
    if (!uid || !d) continue;
    m.set(`${uid}\t${d}`, Number(r.s) || 0);
  }
  return m;
}

/** Часы плана (подзадачи) по ключу `userId\tYYYY-MM-DD` в пределах календарной недели от monday. */
export function getPlannedHoursByUserDayForWeek(monday: Date): Map<string, number> {
  ensurePhasesSchema();
  const db = getDb();
  const weekSet = new Set(weekYmdDates(monday));
  const rows = db
    .prepare(
      `SELECT assignee_user_id as uid, estimated_hours, execution_dates_json, planned_start, planned_end
       FROM pm_subtasks
       WHERE assignee_user_id IS NOT NULL AND TRIM(assignee_user_id) != ''
         AND completed_at IS NULL`
    )
    .all() as Array<{
    uid: string;
    estimated_hours: number | null;
    execution_dates_json: string | null;
    planned_start: string | null;
    planned_end: string | null;
  }>;

  const add = (m: Map<string, number>, uid: string, ymd: string, h: number) => {
    if (!weekSet.has(ymd) || h <= 0) return;
    const k = `${uid}\t${ymd}`;
    m.set(k, (m.get(k) ?? 0) + h);
  };

  const out = new Map<string, number>();

  for (const r of rows) {
    const uid = String(r.uid).trim();
    if (!uid) continue;
    const est =
      r.estimated_hours != null && !Number.isNaN(Number(r.estimated_hours)) ? Math.max(0, Number(r.estimated_hours)) : 0;
    if (est <= 0) continue;

    const allExec = parseExecutionDatesFromJson(r.execution_dates_json);
    if (allExec.length > 0) {
      const per = est / allExec.length;
      for (const ymd of allExec) {
        if (weekSet.has(ymd)) add(out, uid, ymd, per);
      }
      continue;
    }

    const ps = ymdSlice(r.planned_start);
    const pe = ymdSlice(r.planned_end);
    if (ps && pe) {
      const range = enumerateYmdInclusive(ps, pe).filter((d) => weekSet.has(d));
      if (range.length > 0) {
        const per = est / range.length;
        for (const ymd of range) {
          add(out, uid, ymd, per);
        }
      }
      continue;
    }
    if (pe && weekSet.has(pe)) {
      add(out, uid, pe, est);
      continue;
    }
    if (ps && weekSet.has(ps)) {
      add(out, uid, ps, est);
    }
  }

  return out;
}

export type SubtaskDayPlanRow = {
  subtaskId: string;
  cardId: string;
  cardName: string;
  title: string;
  /** Часы, отнесённые к этому дню (доля оценки). */
  hoursOnDay: number;
};

function hoursForUserOnDayFromRow(
  uid: string,
  ymd: string,
  row: {
    uid: string;
    estimated_hours: number | null;
    execution_dates_json: string | null;
    planned_start: string | null;
    planned_end: string | null;
  }
): number {
  if (String(row.uid).trim() !== uid) return 0;
  const est =
    row.estimated_hours != null && !Number.isNaN(Number(row.estimated_hours))
      ? Math.max(0, Number(row.estimated_hours))
      : 0;
  if (est <= 0) return 0;

  const execDates = parseExecutionDatesFromJson(row.execution_dates_json);
  if (execDates.length > 0) {
    if (!execDates.includes(ymd)) return 0;
    return est / execDates.length;
  }

  const ps = ymdSlice(row.planned_start);
  const pe = ymdSlice(row.planned_end);
  if (ps && pe) {
    const range = enumerateYmdInclusive(ps, pe);
    if (!range.includes(ymd)) return 0;
    return est / range.length;
  }
  if (pe === ymd) return est;
  if (ps === ymd) return est;
  return 0;
}

export function listSubtasksPlannedForUserDay(uid: string, ymd: string): SubtaskDayPlanRow[] {
  ensurePhasesSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id as sid, s.card_id as card_id, s.title as title, s.estimated_hours, s.execution_dates_json, s.planned_start, s.planned_end,
              c.name as card_name, s.assignee_user_id as uid
       FROM pm_subtasks s
       JOIN pm_cards c ON c.id = s.card_id
       WHERE s.assignee_user_id = ? AND s.completed_at IS NULL`
    )
    .all(uid) as Array<{
    sid: string;
    card_id: string;
    title: string;
    estimated_hours: number | null;
    execution_dates_json: string | null;
    planned_start: string | null;
    planned_end: string | null;
    card_name: string;
    uid: string;
  }>;

  const out: SubtaskDayPlanRow[] = [];
  for (const r of rows) {
    const h = hoursForUserOnDayFromRow(uid, ymd, {
      uid: r.uid,
      estimated_hours: r.estimated_hours,
      execution_dates_json: r.execution_dates_json,
      planned_start: r.planned_start,
      planned_end: r.planned_end,
    });
    if (h <= 0) continue;
    out.push({
      subtaskId: String(r.sid),
      cardId: String(r.card_id),
      cardName: String(r.card_name ?? ""),
      title: String(r.title ?? ""),
      hoursOnDay: Math.round(h * 10) / 10,
    });
  }
  return out;
}
