import { getDispatchRules } from "@/lib/v2/agency/dispatch/dispatch-repo";
import {
  capOf,
  dayHours,
  dayModeMap,
  freeHours,
  itemHours,
  nextFreeWindowDay,
  tasksOnDay,
} from "@/lib/v2/agency/plan/plan-calendar-logic";
import { buildPlanPayload } from "@/lib/v2/agency/plan/load-plan";
import { listPlanItems, updatePlanItem } from "@/lib/v2/agency/plan/plan-repo";
import type { PlanItemRow } from "@/lib/v2/agency/plan/plan-types";
import { addDays, fmtLong, fmtWeekday, mondayOf, parseYmd, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import { newV2Id } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";

import type { ReplanPreviewPayload, ReplanChangeRow } from "@/lib/v2/agency/plan/plan-replan-types";
export type { ReplanPreviewPayload, ReplanChangeRow } from "@/lib/v2/agency/plan/plan-replan-types";
export { formatChangeLine } from "@/lib/v2/agency/plan/plan-replan-types";

type SimItem = PlanItemRow & { plan_date: string | null };

function cloneItems(items: PlanItemRow[]): SimItem[] {
  return items.map((i) => ({ ...i }));
}

function projectLabel(
  projectId: string | null,
  projects: { id: string; name: string; clientLabel: string }[]
): string | null {
  if (!projectId) return null;
  const p = projects.find((x) => x.id === projectId);
  return p?.clientLabel ?? p?.name ?? null;
}

function isDeadlineDay(
  projectId: string | null,
  dateKey: string,
  projects: { id: string; workDeadline: string | null }[]
): boolean {
  if (!projectId) return false;
  const p = projects.find((x) => x.id === projectId);
  return p?.workDeadline === dateKey;
}

function findSlot(
  items: SimItem[],
  modes: Map<string, import("@/lib/v2/agency/plan/plan-types").PlanDayMode>,
  afterDateKey: string,
  hours: number,
  dailyCap: number,
  horizonDays = 56
): string | null {
  let d = parseYmd(afterDateKey);
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < horizonDays; i++) {
    const k = toYmd(d);
    if (freeHours(items, modes, k, dailyCap) >= hours) return k;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

function setItemDate(items: SimItem[], itemId: string, dateKey: string | null) {
  const it = items.find((x) => x.id === itemId);
  if (it) it.plan_date = dateKey;
}

export async function buildReplanPreview(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<ReplanPreviewPayload> {
  const today = new Date();
  const todayKey = toYmd(today);
  const from = toYmd(mondayOf(today));
  const to = toYmd(addDays(mondayOf(today), 41));

  const [plan, rulesRow] = await Promise.all([
    buildPlanPayload(ctx, year, month, from, to),
    getDispatchRules(),
  ]);
  const dailyCap = rulesRow.rules.capacity.plannedHoursPerDay;
  const modes = dayModeMap(plan.dayModes);
  const allRaw = await listPlanItems(ctx, from, to);
  const sim = cloneItems(allRaw.filter((i) => i.kind === "task"));
  const changes: ReplanChangeRow[] = [];
  const warnings: string[] = [];

  const dayKeys: string[] = [];
  let d = parseYmd(todayKey);
  const end = parseYmd(to);
  while (d <= end) {
    dayKeys.push(toYmd(d));
    d.setDate(d.getDate() + 1);
  }

  // 1) Снять перегруз: двигать задачи с конца дня на следующие окна
  for (const dayKey of dayKeys) {
    const cap = capOf(modes.get(dayKey) ?? null, dailyCap);
    if (cap <= 0) continue;

    while (dayHours(sim, dayKey) > cap + 0.01) {
      const dayTasks = tasksOnDay(sim, dayKey).sort((a, b) => b.sort_order - a.sort_order);
      const movable = dayTasks.find((t) => !isDeadlineDay(t.project_id, dayKey, plan.projects));
      if (!movable) {
        warnings.push(`Перегруз ${fmtLong(parseYmd(dayKey))}: нельзя сдвинуть без риска для дедлайна.`);
        break;
      }
      const hrs = itemHours(movable);
      const slot = findSlot(sim, modes, dayKey, hrs, dailyCap);
      if (!slot) {
        warnings.push(`Не нашла окно для «${movable.title}» (${hrs} ч).`);
        break;
      }
      changes.push({
        itemId: movable.id,
        title: movable.title,
        projectLabel: projectLabel(movable.project_id, plan.projects),
        fromDate: dayKey,
        toDate: slot,
        hours: hrs,
        changeType: "move",
      });
      setItemDate(sim, movable.id, slot);
    }
  }

  // 2) Разместить backlog
  for (const item of sim.filter((i) => !i.plan_date)) {
    const hrs = itemHours(item);
    if (hrs <= 0) continue;
    const slot = findSlot(sim, modes, todayKey, hrs, dailyCap);
    if (!slot) {
      warnings.push(`Бэклог «${item.title}» (${hrs} ч) — нет свободного дня.`);
      continue;
    }
    changes.push({
      itemId: item.id,
      title: item.title,
      projectLabel: projectLabel(item.project_id, plan.projects),
      fromDate: null,
      toDate: slot,
      hours: hrs,
      changeType: "place",
    });
    setItemDate(sim, item.id, slot);
  }

  const nextFree = nextFreeWindowDay(sim, modes, today, dailyCap);

  return {
    previewId: newV2Id(),
    changes,
    keeps: [
      "Клиентские дедлайны не изменятся",
      "Стратегия и творческий день сохранятся",
    ],
    warnings,
    nextFreeWindowAfter: nextFree ? fmtWeekday(nextFree) : null,
    balanced: changes.length === 0,
  };
}

export async function applyReplanChanges(
  ctx: V2SessionContext,
  changes: ReplanChangeRow[]
): Promise<{ applied: number; skipped: string[] }> {
  const skipped: string[] = [];
  let applied = 0;

  for (const ch of changes) {
    const items = await listPlanItems(ctx);
    const item = items.find((i) => i.id === ch.itemId);
    if (!item) {
      skipped.push(`${ch.title}: задача не найдена`);
      continue;
    }
    const current = item.plan_date;
    if (current !== ch.fromDate) {
      skipped.push(`${ch.title}: дата уже изменилась`);
      continue;
    }
    await updatePlanItem(ctx, ch.itemId, { plan_date: ch.toDate });
    applied += 1;
  }

  return { applied, skipped };
}
