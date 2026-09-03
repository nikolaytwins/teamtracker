import { computeFinanceMonthSummary } from "@/lib/v2/finance/finance-repo";
import { isInFinanceMonth } from "@/lib/v2/finance/meta";
import type { V2FinanceGeneralExpenseRow, V2FinanceProjectView } from "@/lib/v2/finance/types";
import type { DispatchFinanceSnapshot, DispatchRulesPayload } from "@/lib/v2/agency/dispatch/dispatch-types";
import type { DispatchProjectView } from "@/lib/v2/agency/dispatch/dispatch-types";

/** Finance snapshot без повторной загрузки проектов из БД. */
export function buildDispatchFinanceSnapshotFromLoaded(
  workspaceId: string,
  year: number,
  month: number,
  rules: DispatchRulesPayload,
  dispatchProjects: DispatchProjectView[],
  allAgencyProjects: DispatchProjectView[],
  generalExpenses: V2FinanceGeneralExpenseRow[]
): DispatchFinanceSnapshot {
  const monthProjects: V2FinanceProjectView[] = allAgencyProjects
    .filter((p) => isInFinanceMonth(p.createdAt, year, month))
    .map((p) => ({
      id: p.id,
      workspace_id: workspaceId,
      name: p.name,
      total_amount: p.totalAmount,
      paid_amount: p.paidAmount,
      deadline: p.financeDeadline,
      status: p.paymentStatus,
      service_type: "site" as const,
      business_line: p.businessLine,
      client_type: null,
      payment_method: null,
      client_contact: null,
      notes: null,
      source_lead_id: null,
      payment_certain_this_month: p.paymentCertainThisMonth,
      created_at: p.createdAt,
      updated_at: p.createdAt,
      total_expenses: p.totalExpenses,
      total_details_amount: 0,
      effective_total_amount: p.effectiveTotalAmount,
    }));

  const summary = computeFinanceMonthSummary(monthProjects, generalExpenses, year, month);
  const actualRevenueRub = monthProjects.reduce((s, p) => s + p.paid_amount, 0);
  const totalExpensesRub = summary.totalExpenses;
  const actualProfitRub = actualRevenueRub - totalExpensesRub;

  const certainUnpaidRevenue = dispatchProjects
    .filter((p) => isInFinanceMonth(p.createdAt, year, month))
    .filter((p) => p.paymentCertainThisMonth && p.paymentStatus !== "paid")
    .reduce((s, p) => s + Math.max(0, p.effectiveTotalAmount - p.paidAmount), 0);

  const reliableRevenueRub = actualRevenueRub + certainUnpaidRevenue;
  const reliableProfitRub = reliableRevenueRub - totalExpensesRub;

  const reliableProfitMinRub = rules.finance.reliableProfitMinRub;
  const plannedProfitTargetRub = rules.finance.plannedProfitTargetRub;

  return {
    year,
    month,
    actualProfitRub: Math.round(actualProfitRub),
    reliableProfitRub: Math.round(reliableProfitRub),
    plannedProfitRub: Math.round(summary.profit),
    actualRevenueRub: Math.round(actualRevenueRub),
    certainUnpaidRevenueRub: Math.round(certainUnpaidRevenue),
    reliableRevenueRub: Math.round(reliableRevenueRub),
    expectedRevenueRub: Math.round(summary.expectedRevenue),
    totalExpensesRub: Math.round(totalExpensesRub),
    reliableProfitMinRub,
    plannedProfitTargetRub,
    thresholdsMet: {
      reliableMin: reliableProfitRub >= reliableProfitMinRub,
      plannedTarget: summary.profit >= plannedProfitTargetRub,
    },
  };
}
