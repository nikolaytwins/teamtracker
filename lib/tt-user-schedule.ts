/** График работы сотрудника: часы в день и дни недели (0=вс … 6=сб, как Date.getDay). */

export const DEFAULT_WORK_DAYS: readonly number[] = [1, 2, 3, 4, 5];
export const DEFAULT_WORK_DAYS_JSON = "[1,2,3,4,5]";

export function parseWorkDaysJson(raw: string | null | undefined): number[] {
  if (raw == null || !String(raw).trim()) return [...DEFAULT_WORK_DAYS];
  try {
    const a = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(a)) return [...DEFAULT_WORK_DAYS];
    const set = new Set<number>();
    for (const x of a) {
      const n = typeof x === "number" ? x : typeof x === "string" ? parseInt(x, 10) : NaN;
      if (!Number.isInteger(n) || n < 0 || n > 6) continue;
      set.add(n);
    }
    const out = [...set].sort((x, y) => x - y);
    return out.length > 0 ? out : [...DEFAULT_WORK_DAYS];
  } catch {
    return [...DEFAULT_WORK_DAYS];
  }
}

export function serializeWorkDaysJson(days: number[]): string {
  const set = new Set<number>();
  for (const x of days) {
    if (Number.isInteger(x) && x >= 0 && x <= 6) set.add(x);
  }
  const out = [...set].sort((a, b) => a - b);
  return JSON.stringify(out.length > 0 ? out : [...DEFAULT_WORK_DAYS]);
}

export function weekYmdDates(monday: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return out;
}

export function dailyCapacityHours(params: {
  work_hours_per_day: number;
  work_days: number[];
  ymd: string;
}): number {
  const d = new Date(`${params.ymd}T12:00:00`);
  const dow = d.getDay();
  const days = params.work_days.length > 0 ? params.work_days : [...DEFAULT_WORK_DAYS];
  if (!days.includes(dow)) return 0;
  const h = params.work_hours_per_day > 0 && !Number.isNaN(params.work_hours_per_day) ? params.work_hours_per_day : 8;
  return Math.round(h * 10) / 10;
}

export function effectiveWeeklyCapacityHours(params: {
  work_hours_per_day: number;
  work_days: number[];
  weekly_capacity_hours: number;
}): number {
  const days = params.work_days.length > 0 ? params.work_days : [...DEFAULT_WORK_DAYS];
  const h = params.work_hours_per_day > 0 && !Number.isNaN(params.work_hours_per_day) ? params.work_hours_per_day : 8;
  if (days.length > 0) {
    return Math.max(0.1, Math.round(h * days.length * 10) / 10);
  }
  const w = params.weekly_capacity_hours;
  return w > 0 && !Number.isNaN(w) ? w : 40;
}
