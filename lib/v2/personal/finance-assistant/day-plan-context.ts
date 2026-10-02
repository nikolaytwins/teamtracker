import { listPlanDayModes, listPlanItems } from "@/lib/v2/agency/plan/plan-repo";
import { mondayOf, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import {
  buildDayPlanContextPayload,
  DAY_PLAN_WORK_HOURS,
  resolveWeekStart,
} from "@/lib/v2/personal/finance-assistant/day-plan-rules";
import type { DayPlanContext } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import type { V2SessionContext } from "@/lib/v2/types";

export async function loadDayPlanContext(
  ctx: V2SessionContext,
  opts?: { weekStart?: string; message?: string }
): Promise<DayPlanContext> {
  const weekStart =
    opts?.weekStart ??
    (opts?.message ? resolveWeekStart(opts.message) : toYmd(mondayOf(new Date())));
  const weekEndDate = new Date(`${weekStart}T00:00:00`);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = toYmd(weekEndDate);

  const [items, dayModes] = await Promise.all([
    listPlanItems(ctx, weekStart, weekEnd),
    listPlanDayModes(ctx, weekStart, weekEnd),
  ]);

  return buildDayPlanContextPayload(weekStart, items, dayModes, DAY_PLAN_WORK_HOURS);
}
