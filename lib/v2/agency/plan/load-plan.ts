import { buildDispatchContext } from "@/lib/v2/agency/dispatch/dispatch-context";
import { listPlanDayModes, listPlanItems } from "@/lib/v2/agency/plan/plan-repo";
import type { PlanPayload, PlanProjectView } from "@/lib/v2/agency/plan/plan-types";
import {
  BUSINESS_LINE_LABEL,
  computeLoadStatus,
  loadStatusLabels,
  projectColor,
} from "@/lib/v2/agency/plan/plan-utils";
import type { V2SessionContext } from "@/lib/v2/types";

export async function buildPlanPayload(
  ctx: V2SessionContext,
  year: number,
  month: number,
  rangeFrom: string,
  rangeTo: string
): Promise<PlanPayload> {
  const dispatch = await buildDispatchContext(ctx, year, month);
  let items: Awaited<ReturnType<typeof listPlanItems>> = [];
  let dayModes: Awaited<ReturnType<typeof listPlanDayModes>> = [];
  try {
    [items, dayModes] = await Promise.all([
      listPlanItems(ctx, rangeFrom, rangeTo),
      listPlanDayModes(ctx, rangeFrom, rangeTo),
    ]);
  } catch (error) {
    console.warn("plan: calendar storage unavailable", error);
  }

  const loadStatus = computeLoadStatus(
    dispatch.finance.reliableProfitRub,
    dispatch.finance.reliableProfitMinRub,
    dispatch.rules.rules.finance.pauseProfitMinRub ?? 245_000
  );

  const allProjects = [...dispatch.plan.activeProjects, ...dispatch.plan.approvalRiskProjects];
  const doneProjects = await listDoneProjectsForPlan(ctx, year, month);

  const projects: PlanProjectView[] = [...allProjects, ...doneProjects].map((p) => ({
    id: p.id,
    name: p.name,
    clientLabel: p.name.split("·")[0]?.trim() || p.name,
    businessLine: p.businessLine,
    businessLineLabel: BUSINESS_LINE_LABEL[p.businessLine] ?? p.businessLine,
    color: projectColor(p.id),
    dispatchWorkStatus: p.dispatchWorkStatus,
    workDeadline: p.workDeadline,
    plannedHoursRemaining: p.plannedHoursRemaining,
    paymentCertainThisMonth: p.paymentCertainThisMonth,
    effectiveTotalAmount: p.effectiveTotalAmount,
    paidAmount: p.paidAmount,
    onApprovalSince:
      p.dispatchWorkStatus === "on_approval" ? p.workDeadline ?? p.financeDeadline : null,
  }));

  const backlog = items.filter((i) => !i.plan_date);

  return {
    year,
    month,
    loadStatus,
    loadStatusLabels: loadStatusLabels(loadStatus),
    reliableProfitRub: dispatch.finance.reliableProfitRub,
    plannedHoursPerDay: dispatch.plan.plannedHoursPerDay,
    items: items.filter((i) => i.plan_date),
    dayModes,
    projects,
    backlog,
  };
}

async function listDoneProjectsForPlan(ctx: V2SessionContext, year: number, month: number) {
  const dispatch = await buildDispatchContext(ctx, year, month);
  const { listDispatchProjectsForContext } = await import("@/lib/v2/agency/dispatch/dispatch-repo");
  const all = await listDispatchProjectsForContext(ctx, year, month);
  const activeIds = new Set(
    [...dispatch.plan.activeProjects, ...dispatch.plan.approvalRiskProjects].map((p) => p.id)
  );
  return all.filter((p) => p.dispatchWorkStatus === "done" && !activeIds.has(p.id));
}
