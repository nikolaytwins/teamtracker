import { getISOWeekInfo } from "@/lib/iso-week";

export type SubtaskWithPlanned = {
  planned_start: string | null;
  planned_end: string | null;
  /** Даты выполнения (YYYY-MM-DD) — приоритетнее planned_* для колонок «Сегодня / Неделя». */
  executionDates?: string[];
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseIsoDate(iso: string | null): Date | null {
  if (iso == null || !String(iso).trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function effectiveRange(s: SubtaskWithPlanned): { start: Date | null; end: Date | null } {
  const dates = s.executionDates?.filter(Boolean) ?? [];
  if (dates.length > 0) {
    let minT = Infinity;
    let maxT = -Infinity;
    for (const ymd of dates) {
      const [y, m, d] = ymd.split("-").map(Number);
      if (!y || !m || !d) continue;
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      const t0 = start.getTime();
      const t1 = end.getTime();
      if (!Number.isNaN(t0) && !Number.isNaN(t1)) {
        minT = Math.min(minT, t0);
        maxT = Math.max(maxT, t1);
      }
    }
    if (minT !== Infinity && maxT !== -Infinity) {
      return { start: new Date(minT), end: new Date(maxT) };
    }
  }
  const ps = parseIsoDate(s.planned_start);
  const pe = parseIsoDate(s.planned_end);
  if (!ps && !pe) return { start: null, end: null };
  if (ps && pe) return ps.getTime() <= pe.getTime() ? { start: ps, end: pe } : { start: pe, end: ps };
  if (ps) return { start: ps, end: ps };
  return { start: pe, end: pe };
}

function intersects(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() <= bEnd.getTime() && aEnd.getTime() >= bStart.getTime();
}

/** Открытые подзадачи: сегодня (в т.ч. просрочка), текущая ISO-неделя без «сегодня», остальное — бэклог. */
export function bucketMySubtasks<T extends SubtaskWithPlanned>(items: T[], now: Date = new Date()): { today: T[]; week: T[]; backlog: T[] } {
  const startToday = startOfLocalDay(now);
  const endToday = endOfLocalDay(now);
  const monday = getISOWeekInfo(now).monday;
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const weekEnd = new Date(nextMonday);
  weekEnd.setMilliseconds(weekEnd.getMilliseconds() - 1);

  const today: T[] = [];
  const week: T[] = [];
  const backlog: T[] = [];

  for (const s of items) {
    const { start, end } = effectiveRange(s);
    if (start == null || end == null) {
      backlog.push(s);
      continue;
    }

    const overdue = end.getTime() < startToday.getTime();
    const inToday = overdue || intersects(start, end, startToday, endToday);
    if (inToday) {
      today.push(s);
      continue;
    }

    const inWeek = intersects(start, end, monday, weekEnd);
    if (inWeek) {
      week.push(s);
      continue;
    }

    backlog.push(s);
  }

  return { today, week, backlog };
}

export function sortSubtasksInColumn<T extends SubtaskWithPlanned & { title: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ae = parseIsoDate(a.planned_end)?.getTime() ?? parseIsoDate(a.planned_start)?.getTime() ?? 0;
    const be = parseIsoDate(b.planned_end)?.getTime() ?? parseIsoDate(b.planned_start)?.getTime() ?? 0;
    if (ae !== be) return ae - be;
    return a.title.localeCompare(b.title, "ru");
  });
}

export type MeSubtaskBucket = "today" | "week" | "backlog";

/** Значения для PATCH plannedStart / plannedEnd (ISO). */
export function plannedRangeForMeBucket(bucket: MeSubtaskBucket, now: Date = new Date()): { plannedStart: string | null; plannedEnd: string | null } {
  if (bucket === "backlog") return { plannedStart: null, plannedEnd: null };
  const startToday = startOfLocalDay(now);
  const endToday = endOfLocalDay(now);
  if (bucket === "today") {
    return { plannedStart: startToday.toISOString(), plannedEnd: endToday.toISOString() };
  }
  const monday = getISOWeekInfo(now).monday;
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { plannedStart: monday.toISOString(), plannedEnd: sunday.toISOString() };
}
