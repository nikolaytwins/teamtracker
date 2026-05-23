/** Первый день месяца в формате YYYY-MM-01 */
export type WorkMonthKey = `${number}-${string}-01`;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function currentWorkMonth(date = new Date()): WorkMonthKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-01` as WorkMonthKey;
}

/** Принимает YYYY-MM или YYYY-MM-01, возвращает YYYY-MM-01 */
export function normalizeWorkMonth(input: string | null | undefined, fallback = currentWorkMonth()): WorkMonthKey {
  if (!input?.trim()) return fallback;
  const s = input.trim();
  const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(s);
  if (!m) return fallback;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return fallback;
  return `${m[1]}-${m[2]}-01` as WorkMonthKey;
}

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function formatWorkMonthLabel(workMonth: string): string {
  const m = /^(\d{4})-(\d{2})-01$/.exec(workMonth);
  if (!m) return workMonth;
  const monthIdx = Number(m[2]) - 1;
  return `${MONTH_NAMES[monthIdx] ?? m[2]} ${m[1]}`;
}

export function shiftWorkMonth(workMonth: string, delta: number): WorkMonthKey {
  const m = /^(\d{4})-(\d{2})-01$/.exec(workMonth);
  if (!m) return currentWorkMonth();
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + delta, 1);
  return currentWorkMonth(d);
}

export function workMonthsBetween(start: string, end: string): WorkMonthKey[] {
  const a = normalizeWorkMonth(start);
  const b = normalizeWorkMonth(end);
  const out: WorkMonthKey[] = [];
  let cur = a;
  const guard = 240;
  for (let i = 0; i < guard; i++) {
    out.push(cur);
    if (cur === b) break;
    cur = shiftWorkMonth(cur, 1);
  }
  return out;
}
