import { getAgencyRepoV2 } from "@/lib/agency-store";
import { buildDispatchFinanceSnapshotFromLoaded } from "@/lib/v2/agency/dispatch/dispatch-finance-summary";
import {
  getDispatchRules,
  isPlanRelevantProject,
  mapRawAgencyProjects,
  mapRawRevenueProjects,
  selectDispatchProjectsForContext,
} from "@/lib/v2/agency/dispatch/dispatch-repo";
import { listPlanDayModes, listPlanItems } from "@/lib/v2/agency/plan/plan-repo";
import type { PlanPayload, PlanProjectView } from "@/lib/v2/agency/plan/plan-types";
import {
  BUSINESS_LINE_LABEL,
  computeLoadStatus,
  loadStatusLabels,
  projectColor,
} from "@/lib/v2/agency/plan/plan-utils";
import { listFinanceGeneralExpenses } from "@/lib/v2/finance/finance-repo";
import type { V2SessionContext } from "@/lib/v2/types";

function mapPlanProject(p: {
  id: string;
  name: string;
  businessLine: PlanProjectView["businessLine"];
  dispatchWorkStatus: PlanProjectView["dispatchWorkStatus"];
  workDeadline: string | null;
  plannedHoursRemaining: number | null;
  paymentCertainThisMonth: boolean;
  effectiveTotalAmount: number;
  paidAmount: number;
  financeDeadline: string | null;
  planHidden: boolean;
  createdAt: string;
}): PlanProjectView {
  return {
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
    planHidden: p.planHidden,
    createdAt: p.createdAt,
  };
}

export async function loadPlanCalendarSlice(
  ctx: V2SessionContext,
  rangeFrom: string,
  rangeTo: string
): Promise<Pick<PlanPayload, "items" | "dayModes" | "backlog">> {
  const [items, dayModes] = await Promise.all([
    listPlanItems(ctx, rangeFrom, rangeTo),
    listPlanDayModes(ctx, rangeFrom, rangeTo),
  ]);
  return {
    items: items.filter((i) => i.plan_date),
    dayModes,
    backlog: items.filter((i) => !i.plan_date),
  };
}

export async function buildPlanPayload(
  ctx: V2SessionContext,
  year: number,
  month: number,
  rangeFrom: string,
  rangeTo: string
): Promise<PlanPayload> {
  const [rules, rawProjects, generalExpenses, calendar] = await Promise.all([
    getDispatchRules(),
    getAgencyRepoV2().listProjectsWithTotalExpenses(),
    listFinanceGeneralExpenses(ctx, year, month),
    loadPlanCalendarSlice(ctx, rangeFrom, rangeTo).catch(() => ({
      items: [],
      dayModes: [],
      backlog: [],
    })),
  ]);

  const allAgency = mapRawAgencyProjects(rawProjects, new Map());
  const revenueProjects = mapRawRevenueProjects(rawProjects, new Map());
  const contextProjects = selectDispatchProjectsForContext(allAgency, year, month);
  const finance = buildDispatchFinanceSnapshotFromLoaded(
    ctx.workspaceId,
    year,
    month,
    rules.rules,
    contextProjects,
    revenueProjects,
    generalExpenses
  );

  const rulesFinance = rules.rules.finance;
  const loadStatus = computeLoadStatus(
    finance.reliableProfitRub,
    rulesFinance.reliableProfitMinRub,
    rulesFinance.pauseProfitMinRub ?? 245_000
  );

  // Активные + завершённые (колонка «Завершён» всегда должна их видеть).
  // Раньше done из текущего месяца отфильтровывались isPlanRelevant и не возвращались
  // из-за ошибки !activeIds.has(id).
  const projects = contextProjects
    .filter((p) => isPlanRelevantProject(p, year, month) || p.dispatchWorkStatus === "done")
    .map(mapPlanProject);

  return {
    year,
    month,
    loadStatus,
    loadStatusLabels: loadStatusLabels(loadStatus),
    reliableProfitRub: finance.reliableProfitRub,
    loadStatusFinance: {
      reliableRevenueRub: finance.reliableRevenueRub,
      teamExpensesRub: finance.teamExpensesRub,
      taxAmountRub: finance.taxAmountRub,
      totalExpensesRub: finance.totalExpensesRub,
      reliableProfitRub: finance.reliableProfitRub,
      passiveMinRub: rulesFinance.reliableProfitMinRub,
      pauseMinRub: rulesFinance.pauseProfitMinRub ?? 245_000,
    },
    plannedHoursPerDay: rules.rules.capacity.plannedHoursPerDay,
    ...calendar,
    projects,
  };
}
