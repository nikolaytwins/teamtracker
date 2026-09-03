import { buildDispatchContext } from "@/lib/v2/agency/dispatch/dispatch-context";
import type { DispatchContext } from "@/lib/v2/agency/dispatch/dispatch-types";
import {
  dayModeMap,
  findModeDate,
  nextFreeWindowDay,
  tasksOnDay,
} from "@/lib/v2/agency/plan/plan-calendar-logic";
import { listPlanDayModes, listPlanItems } from "@/lib/v2/agency/plan/plan-repo";
import type { PlanDayMode, PlanItemRow } from "@/lib/v2/agency/plan/plan-types";
import { addDays, fmtWeekday, mondayOf, monthName, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import type { SofiaContextPanel } from "@/lib/v2/agency/sofia/sofia-types";
import { formatRub } from "@/lib/v2/finance/meta";
import type { V2SessionContext } from "@/lib/v2/types";

function lastScheduledDay(items: { plan_date: string | null }[], todayKey: string): string | null {
  const keys = items
    .map((i) => i.plan_date)
    .filter((d): d is string => !!d && d >= todayKey)
    .sort();
  return keys.length ? keys.at(-1)! : null;
}

/** Календарь плана — дополнение; сбой не должен ломать контекст из агентства/финансов. */
async function loadPlanCalendarSlice(
  ctx: V2SessionContext,
  from: string,
  to: string
): Promise<{ items: PlanItemRow[]; dayModes: { plan_date: string; mode: PlanDayMode }[]; ok: boolean }> {
  try {
    const [items, dayModes] = await Promise.all([
      listPlanItems(ctx, from, to),
      listPlanDayModes(ctx, from, to),
    ]);
    return { items, dayModes, ok: true };
  } catch (error) {
    console.warn("Sofia context: plan calendar unavailable", error);
    return { items: [], dayModes: [], ok: false };
  }
}

export async function buildSofiaContextPanel(
  ctx: V2SessionContext,
  year: number,
  month: number,
  dispatchIn?: DispatchContext
): Promise<SofiaContextPanel> {
  const dispatch = dispatchIn ?? (await buildDispatchContext(ctx, year, month));
  const today = new Date();
  const todayKey = toYmd(today);
  const from = toYmd(mondayOf(today));
  const to = toYmd(addDays(mondayOf(today), 41));

  const { items, dayModes, ok: planCalendarReady } = await loadPlanCalendarSlice(ctx, from, to);
  const modes = dayModeMap(dayModes);
  const dailyCap = dispatch.plan.plannedHoursPerDay;

  const scheduledUntilKey = planCalendarReady ? lastScheduledDay(items, todayKey) : null;
  const scheduledUntil = scheduledUntilKey
    ? fmtWeekday(new Date(`${scheduledUntilKey}T12:00:00`))
    : null;

  const freeDay = planCalendarReady ? nextFreeWindowDay(items, modes, today, dailyCap) : null;
  const nextFreeWindow = freeDay ? fmtWeekday(freeDay) : null;

  const overdue = dispatch.plan.activeProjects.filter((p) => {
    if (!p.workDeadline) return false;
    return p.workDeadline < todayKey;
  });

  const deadlinesOk = overdue.length === 0;
  const deadlinesNote = deadlinesOk
    ? "Все текущие проекты помещаются"
    : overdue.length === 1
      ? `Риск по сроку: ${overdue[0]!.name}`
      : `Риск по срокам: ${overdue.length} проекта`;

  const strategyDate = planCalendarReady ? findModeDate(modes, "strategy", todayKey) : null;
  const creativeDate = planCalendarReady ? findModeDate(modes, "creative", todayKey) : null;

  const protectedDays: SofiaContextPanel["protectedDays"] = [];
  if (strategyDate) {
    protectedDays.push({ label: "Стратегия", date: fmtWeekday(strategyDate), mode: "strategy" });
  }
  if (creativeDate) {
    protectedDays.push({ label: "Творческий день", date: fmtWeekday(creativeDate), mode: "creative" });
  }

  const pricing = dispatch.rules.rules.pricing;
  const rulesUsed = [
    `Нижний порог — ${formatRub(pricing.minEffectiveRateRub)}/ч`,
    "Срочность оплачивается отдельно",
    "Резерв не используется под обычный новый проект",
  ];

  return {
    year,
    month,
    monthLabel: monthName(new Date(year, month - 1, 1)),
    workScheduledUntil: scheduledUntil,
    nextFreeWindow,
    deadlinesOk,
    deadlinesNote,
    reliableProfitRub: dispatch.finance.reliableProfitRub,
    plannedProfitRub: dispatch.finance.plannedProfitRub,
    protectedDays,
    rulesUsed,
    planCalendarReady,
  };
}

export function minimalSofiaContextPanel(
  dispatch: DispatchContext,
  year: number,
  month: number
): SofiaContextPanel {
  const todayKey = toYmd(new Date());
  const overdue = dispatch.plan.activeProjects.filter((p) => {
    if (!p.workDeadline) return false;
    return p.workDeadline < todayKey;
  });
  const pricing = dispatch.rules.rules.pricing;
  return {
    year,
    month,
    monthLabel: monthName(new Date(year, month - 1, 1)),
    workScheduledUntil: null,
    nextFreeWindow: null,
    deadlinesOk: overdue.length === 0,
    deadlinesNote:
      overdue.length === 0
        ? "Все текущие проекты помещаются"
        : overdue.length === 1
          ? `Риск по сроку: ${overdue[0]!.name}`
          : `Риск по срокам: ${overdue.length} проекта`,
    reliableProfitRub: dispatch.finance.reliableProfitRub,
    plannedProfitRub: dispatch.finance.plannedProfitRub,
    protectedDays: [],
    rulesUsed: [
      `Нижний порог — ${formatRub(pricing.minEffectiveRateRub)}/ч`,
      "Срочность оплачивается отдельно",
      "Резерв не используется под обычный новый проект",
    ],
    planCalendarReady: false,
  };
}

/** Один проход: dispatch + панель контекста для чата и GET /sofia/chat. */
export async function loadSofiaRuntimeContext(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<{ context: SofiaContextPanel; dispatch: DispatchContext }> {
  const dispatch = await buildDispatchContext(ctx, year, month);
  try {
    const context = await buildSofiaContextPanel(ctx, year, month, dispatch);
    return { context, dispatch };
  } catch (error) {
    console.warn("Sofia: context panel fallback", error);
    return { context: minimalSofiaContextPanel(dispatch, year, month), dispatch };
  }
}

/** Rough free project hours before a deadline (excluding protected low-cap days). */
export function estimateFreeHoursBefore(
  items: Awaited<ReturnType<typeof listPlanItems>>,
  modes: ReturnType<typeof dayModeMap>,
  fromKey: string,
  toKey: string,
  dailyCap: number
): number {
  let total = 0;
  let d = new Date(`${fromKey}T12:00:00`);
  const end = new Date(`${toKey}T12:00:00`);
  while (d <= end) {
    const k = toYmd(d);
    const mode = modes.get(k);
    const cap = mode === "rest" ? 0 : mode === "strategy" ? Math.max(0, dailyCap - 3) : dailyCap;
    const used = tasksOnDay(items, k).reduce((s, i) => s + (i.planned_minutes ?? 0) / 60, 0);
    total += Math.max(0, cap - used);
    d.setDate(d.getDate() + 1);
  }
  return Math.round(total * 10) / 10;
}
