/** Только чистые утилиты — без SQLite; безопасно импортировать из `"use client"`. */

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Оценка «контрольной даты» подзадачи для дедлайна (как на главной / в задачах). */
export function effectiveDeadlineMsForSubtask(row: {
  deadline_at: string | null;
  planned_end: string | null;
  execution_dates_json: string | null;
  planned_start: string | null;
}): number | null {
  if (row.deadline_at) {
    const t = new Date(row.deadline_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (row.planned_end) {
    const t = new Date(row.planned_end).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const dates = parseExecutionDatesFromJson(row.execution_dates_json);
  if (dates.length > 0) {
    const sorted = [...dates].sort();
    const t = new Date(sorted[sorted.length - 1] + "T23:59:59").getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (row.planned_start) {
    const t = new Date(row.planned_start).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

/**
 * Убрать с блока «Мои задачи» на главной: подзадача выполнена и календарный день дедлайна уже прошёл
 * (строго раньше сегодняшнего дня). Без даты дедлайна выполненные остаются в списке (зачёркнутые).
 */
export function shouldHideCompletedSubtaskFromHome(
  row: {
    completed_at: string | null;
    deadline_at: string | null;
    planned_end: string | null;
    execution_dates_json: string | null;
    planned_start: string | null;
  },
  now: Date = new Date()
): boolean {
  if (!row.completed_at?.trim()) return false;
  const ms = effectiveDeadlineMsForSubtask(row);
  if (ms == null) return false;
  const deadlineDayStart = startOfLocalDay(new Date(ms));
  return deadlineDayStart.getTime() < startOfLocalDay(now).getTime();
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
