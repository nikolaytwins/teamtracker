import {
  computeFinanceMonthSummary,
  listFinanceGeneralExpenses,
  listFinanceProjectsForMonth,
} from "@/lib/v2/finance/finance-repo";
import type { V2FinanceMonthSummary } from "@/lib/v2/finance/types";
import type { V2SessionContext } from "@/lib/v2/types";

export type HomeFinanceStripPayload = {
  year: number;
  month: number;
  summary: V2FinanceMonthSummary;
};

export async function loadHomeFinanceStrip(ctx: V2SessionContext): Promise<HomeFinanceStripPayload | null> {
  if (ctx.role !== "admin") return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [projects, generalExpenses] = await Promise.all([
    listFinanceProjectsForMonth(ctx, year, month),
    listFinanceGeneralExpenses(ctx, year, month),
  ]);

  return {
    year,
    month,
    summary: computeFinanceMonthSummary(projects, generalExpenses, year, month),
  };
}
