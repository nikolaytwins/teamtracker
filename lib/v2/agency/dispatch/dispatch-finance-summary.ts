import {
  computeFinanceMonthSummary,
  listFinanceGeneralExpenses,
  listFinanceProjectsForMonth,
} from "@/lib/v2/finance/finance-repo";
import { isInFinanceMonth } from "@/lib/v2/finance/meta";
import type { DispatchFinanceSnapshot, DispatchRulesPayload } from "@/lib/v2/agency/dispatch/dispatch-types";
import type { V2SessionContext } from "@/lib/v2/types";
import type { DispatchProjectView } from "@/lib/v2/agency/dispatch/dispatch-types";

export async function buildDispatchFinanceSnapshot(
  ctx: V2SessionContext,
  year: number,
  month: number,
  rules: DispatchRulesPayload,
  dispatchProjects: DispatchProjectView[]
): Promise<DispatchFinanceSnapshot> {
  const [projects, generalExpenses] = await Promise.all([
    listFinanceProjectsForMonth(ctx, year, month),
    listFinanceGeneralExpenses(ctx, year, month),
  ]);

  const summary = computeFinanceMonthSummary(projects, generalExpenses, year, month);
  const actualRevenueRub = projects.reduce((s, p) => s + p.paid_amount, 0);
  const totalExpensesRub = summary.totalExpenses;
  const actualProfitRub = actualRevenueRub - totalExpensesRub;

  const certainUnpaidRevenue = dispatchProjects
    .filter((p) => isInFinanceMonth(p.createdAt, year, month))
    .filter((p) => p.paymentCertainThisMonth && p.paymentStatus !== "paid")
    .reduce((s, p) => s + Math.max(0, p.effectiveTotalAmount - p.paidAmount), 0);

  const reliableRevenueRub = actualRevenueRub + certainUnpaidRevenue;
  const reliableProfitRub = reliableRevenueRub - totalExpensesRub;
  const plannedProfitRub = summary.profit;

  const reliableProfitMinRub = rules.finance.reliableProfitMinRub;
  const plannedProfitTargetRub = rules.finance.plannedProfitTargetRub;

  return {
    year,
    month,
    actualProfitRub: Math.round(actualProfitRub),
    reliableProfitRub: Math.round(reliableProfitRub),
    plannedProfitRub: Math.round(plannedProfitRub),
    actualRevenueRub: Math.round(actualRevenueRub),
    reliableRevenueRub: Math.round(reliableRevenueRub),
    expectedRevenueRub: Math.round(summary.expectedRevenue),
    totalExpensesRub: Math.round(totalExpensesRub),
    reliableProfitMinRub,
    plannedProfitTargetRub,
    thresholdsMet: {
      reliableMin: reliableProfitRub >= reliableProfitMinRub,
      plannedTarget: plannedProfitRub >= plannedProfitTargetRub,
    },
  };
}
