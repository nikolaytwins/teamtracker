import type { PmSubtaskWithCard } from "@/lib/pm-subtasks";
import { parseExecutionDatesFromJson } from "@/lib/pm-subtasks-shared";
import type { ImportanceKey } from "@/lib/statuses";

export function parseCardImportance(extra: string | null): ImportanceKey | null {
  if (!extra?.trim()) return null;
  try {
    const o = JSON.parse(extra) as { importance?: string };
    const k = o.importance;
    if (k === "high" || k === "medium" || k === "low") return k;
  } catch {
    /* ignore */
  }
  return null;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoToLocalDay(iso: string | null | undefined): Date | null {
  if (iso == null || !String(iso).trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : startOfLocalDay(d);
}

/** Все календарные дни (YYYY-MM-DD), на которые попадает подзадача по датам выполнения / плану / дедлайну. */
export function expandSubtaskToDayKeys(s: PmSubtaskWithCard): string[] {
  const exec = parseExecutionDatesFromJson(s.execution_dates_json);
  if (exec.length > 0) {
    return [...new Set(exec.map((x) => x.trim().slice(0, 10)).filter(Boolean))].sort();
  }
  const ps = parseIsoToLocalDay(s.planned_start);
  const pe = parseIsoToLocalDay(s.planned_end);
  if (ps || pe) {
    const a = ps ?? pe!;
    const b = pe ?? ps!;
    return eachYmdInclusive(a, b);
  }
  const dl = parseIsoToLocalDay(s.deadline_at);
  if (dl) return [toYmd(dl)];
  return [];
}

function eachYmdInclusive(a: Date, b: Date): string[] {
  const out: string[] = [];
  let d = startOfLocalDay(a);
  const end = startOfLocalDay(b);
  if (end.getTime() < d.getTime()) return eachYmdInclusive(end, d);
  while (d.getTime() <= end.getTime()) {
    out.push(toYmd(d));
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    d = next;
  }
  return out;
}

export function buildDayToSubtasksMap(subtasks: PmSubtaskWithCard[]): Map<string, PmSubtaskWithCard[]> {
  const map = new Map<string, PmSubtaskWithCard[]>();
  for (const s of subtasks) {
    const days = expandSubtaskToDayKeys(s);
    if (days.length === 0) continue;
    for (const ymd of days) {
      const arr = map.get(ymd) ?? [];
      arr.push(s);
      map.set(ymd, arr);
    }
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => {
      const ia = importanceRank(parseCardImportance(a.card_extra));
      const ib = importanceRank(parseCardImportance(b.card_extra));
      if (ia !== ib) return ia - ib;
      return a.title.localeCompare(b.title, "ru");
    });
  }
  return map;
}

function importanceRank(k: ImportanceKey | null): number {
  if (k === "high") return 0;
  if (k === "medium") return 1;
  if (k === "low") return 2;
  return 3;
}

export function startOfMonday(d: Date): Date {
  const x = startOfLocalDay(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
