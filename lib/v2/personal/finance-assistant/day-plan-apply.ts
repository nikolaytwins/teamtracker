import {
  clearDayModeByType,
  createPlanItem,
  upsertPlanDayMode,
} from "@/lib/v2/agency/plan/plan-repo";
import type { PlanDayMode } from "@/lib/v2/agency/plan/plan-types";
import { toYmd } from "@/lib/v2/agency/plan/plan-utils";
import type { DayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import type { V2SessionContext } from "@/lib/v2/types";

export type DayPlanApplyResult = {
  ok: true;
  created_items: { id: string; title: string; plan_date: string | null; kind: string }[];
  day_modes: { plan_date: string; mode: PlanDayMode }[];
  skipped: string[];
};

export async function applyDayWeekPlan(
  ctx: V2SessionContext,
  plan: DayWeekPlan
): Promise<DayPlanApplyResult> {
  if (!plan?.entries?.length) {
    return { ok: true, created_items: [], day_modes: [], skipped: ["Пустой план"] };
  }

  const today = toYmd(new Date());
  const created_items: DayPlanApplyResult["created_items"] = [];
  const day_modes: DayPlanApplyResult["day_modes"] = [];
  const skipped: string[] = [];

  for (const entry of plan.entries) {
    if (entry.type === "mode") {
      try {
        if (entry.mode !== "rest") {
          await clearDayModeByType(ctx, entry.mode, today);
        }
        await upsertPlanDayMode(ctx, entry.plan_date, entry.mode);
        day_modes.push({ plan_date: entry.plan_date, mode: entry.mode });

        if (entry.block_title && entry.planned_minutes && entry.mode !== "rest") {
          const item = await createPlanItem(ctx, {
            kind: "task",
            title: entry.block_title,
            plan_date: entry.plan_date,
            planned_minutes: entry.planned_minutes,
            priority: 1,
          });
          created_items.push({
            id: item.id,
            title: item.title,
            plan_date: item.plan_date,
            kind: item.kind,
          });
        }
      } catch (e) {
        skipped.push(
          `mode ${entry.mode}@${entry.plan_date}: ${e instanceof Error ? e.message : "error"}`
        );
      }
      continue;
    }

    if (entry.type === "event") {
      try {
        const item = await createPlanItem(ctx, {
          kind: entry.kind,
          title: entry.title,
          plan_date: entry.plan_date,
          planned_minutes: entry.planned_minutes ?? null,
          event_time: entry.event_time ?? null,
          duration_label: entry.duration_label ?? null,
          priority: 2,
        });
        created_items.push({
          id: item.id,
          title: item.title,
          plan_date: item.plan_date,
          kind: item.kind,
        });
      } catch (e) {
        skipped.push(`event ${entry.title}: ${e instanceof Error ? e.message : "error"}`);
      }
      continue;
    }

    if (entry.type === "work") {
      try {
        const item = await createPlanItem(ctx, {
          kind: "task",
          title: entry.title,
          plan_date: entry.plan_date,
          planned_minutes: entry.planned_minutes,
          project_id: entry.project_id ?? null,
          priority: entry.priority ?? 3,
        });
        created_items.push({
          id: item.id,
          title: item.title,
          plan_date: item.plan_date,
          kind: item.kind,
        });
      } catch (e) {
        skipped.push(`work ${entry.title}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  return { ok: true, created_items, day_modes, skipped };
}
