import type { PlanDayMode, PlanItemRow, PlanProjectView } from "@/lib/v2/agency/plan/plan-types";
import { displayHoursFromMinutes, parseYmd, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import type { DispatchWorkStatus } from "@/lib/v2/agency/dispatch/dispatch-work-status";

export const STATUS_UI: Record<
  DispatchWorkStatus,
  { label: string; css: string; color: string }
> = {
  in_progress: { label: "В работе", css: "st--work", color: "#2A56EB" },
  revisions: { label: "Правки", css: "st--edit", color: "#E5604D" },
  planned: { label: "Запланирован", css: "st--plan", color: "#A1A1AA" },
  on_approval: { label: "На согласовании", css: "st--rev", color: "#F59E0B" },
  done: { label: "Готов", css: "st--done", color: "#10B981" },
};

export const KANBAN_ORDER: DispatchWorkStatus[] = [
  "in_progress",
  "revisions",
  "planned",
  "on_approval",
];

export type DayModeKey = PlanDayMode | null;

export function itemHours(item: PlanItemRow): number {
  if (item.planned_minutes == null) return 0;
  return item.planned_minutes / 60;
}

export function dayModeMap(dayModes: { plan_date: string; mode: PlanDayMode }[]): Map<string, PlanDayMode> {
  return new Map(dayModes.map((d) => [d.plan_date, d.mode]));
}

export function dmode(modes: Map<string, PlanDayMode>, dateKey: string): DayModeKey {
  return modes.get(dateKey) ?? null;
}

export function tasksOnDay(items: PlanItemRow[], dateKey: string): PlanItemRow[] {
  return items.filter((it) => it.kind === "task" && it.plan_date === dateKey);
}

export function eventsOnDay(items: PlanItemRow[], dateKey: string): PlanItemRow[] {
  return items
    .filter((it) => (it.kind === "call" || it.kind === "personal") && it.plan_date === dateKey)
    .sort((a, b) => (a.event_time ?? "").localeCompare(b.event_time ?? ""));
}

export function dayHours(items: PlanItemRow[], dateKey: string): number {
  return tasksOnDay(items, dateKey).reduce((s, it) => s + itemHours(it), 0);
}

export function capOf(mode: DayModeKey, dailyCap: number): number {
  if (mode === "rest") return 0;
  if (mode === "creative") return 0;
  if (mode === "strategy") return 2;
  return dailyCap;
}

export function freeHours(
  items: PlanItemRow[],
  modes: Map<string, PlanDayMode>,
  dateKey: string,
  dailyCap: number
): number {
  return Math.max(0, capOf(dmode(modes, dateKey), dailyCap) - dayHours(items, dateKey));
}

export function futureProjectHours(
  items: PlanItemRow[],
  projectId: string,
  todayKey: string
): number {
  return items
    .filter(
      (it) =>
        it.kind === "task" &&
        it.project_id === projectId &&
        it.plan_date != null &&
        it.plan_date >= todayKey
    )
    .reduce((s, it) => s + itemHours(it), 0);
}

export function unplacedHours(
  project: PlanProjectView,
  items: PlanItemRow[],
  todayKey: string
): number | null {
  const est = project.plannedHoursRemaining;
  if (est == null) return null;
  return Math.max(0, est - futureProjectHours(items, project.id, todayKey));
}

export function activeProjects(projects: PlanProjectView[]): PlanProjectView[] {
  return projects.filter((p) =>
    ["planned", "in_progress", "revisions"].includes(p.dispatchWorkStatus)
  );
}

export function findModeDate(
  modes: Map<string, PlanDayMode>,
  mode: PlanDayMode,
  todayKey: string
): Date | null {
  const keys = [...modes.entries()]
    .filter(([k, v]) => v === mode && k >= todayKey)
    .map(([k]) => k)
    .sort();
  return keys.length ? parseYmd(keys[0]!) : null;
}

export function nextFreeWindowDay(
  items: PlanItemRow[],
  modes: Map<string, PlanDayMode>,
  today: Date,
  dailyCap: number
): Date | null {
  let d = new Date(today);
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 80; i++) {
    const k = toYmd(d);
    if (freeHours(items, modes, k, dailyCap) >= dailyCap) return d;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const x = n % 100;
  const y = n % 10;
  const word = x > 10 && x < 20 ? many : y === 1 ? one : y > 1 && y < 5 ? few : many;
  return `${n} ${word}`;
}

export function modeCssClass(mode: PlanDayMode | null): string {
  if (mode === "strategy") return "strat";
  if (mode === "creative") return "ark";
  if (mode === "rest") return "rest";
  return "";
}

export function hoursLabel(item: PlanItemRow): string {
  if (item.planned_minutes == null) return "";
  const h = itemHours(item);
  return Number.isInteger(h) ? `${h} ч` : `${displayHoursFromMinutes(item.planned_minutes)} ч`;
}
