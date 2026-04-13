/** ISO-неделя: понедельник — начало. Строка в query: `2026-W15`. */

function mondayOfDate(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** ISO-год и номер недели для даты `d`, плюс понедельник этой недели. */
export function getISOWeekInfo(d: Date): { isoYear: number; week: number; monday: Date } {
  const monday = mondayOfDate(d);
  const thu = new Date(monday);
  thu.setDate(monday.getDate() + 3);
  const isoYear = thu.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const week1Monday = mondayOfDate(jan4);
  const diffDays = Math.round((monday.getTime() - week1Monday.getTime()) / 86400000);
  const week = 1 + Math.floor(diffDays / 7);
  return { isoYear, week, monday };
}

export function formatISOWeekParam(d: Date = new Date()): string {
  const { isoYear, week } = getISOWeekInfo(d);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function shiftISOWeek(weekStr: string, deltaWeeks: number): string {
  const p = parseISOWeekParam(weekStr);
  if (!p) return formatISOWeekParam();
  const d = new Date(p.monday);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return formatISOWeekParam(d);
}

export function parseISOWeekParam(s: string): { week: string; monday: Date; nextMonday: Date } | null {
  const m = /^(\d{4})-W(\d{1,2})$/i.exec(s.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const w = parseInt(m[2], 10);
  if (w < 1 || w > 53) return null;
  const jan4 = new Date(y, 0, 4);
  const week1Monday = mondayOfDate(jan4);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (w - 1) * 7);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { week: `${y}-W${String(w).padStart(2, "0")}`, monday, nextMonday };
}
