import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  computeFinanceMonthSummary,
  computeFinanceServiceStats,
  getLatestFinanceProjectMonth,
  listFinanceGeneralExpenses,
  listFinanceProjectsForMonth,
} from "@/lib/v2/finance/finance-repo";

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");

  let year = yearParam ? Number(yearParam) : NaN;
  let month = monthParam ? Number(monthParam) : NaN;

  const monthValid = Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12;
  if (!monthValid) {
    const latest = await getLatestFinanceProjectMonth(auth.ctx);
    const now = new Date();
    year = latest?.year ?? now.getFullYear();
    month = latest?.month ?? now.getMonth() + 1;
  }

  const [projects, generalExpenses] = await Promise.all([
    listFinanceProjectsForMonth(auth.ctx, year, month),
    listFinanceGeneralExpenses(auth.ctx, year, month),
  ]);

  const summary = computeFinanceMonthSummary(projects, generalExpenses, year, month);
  const byService = computeFinanceServiceStats(projects);

  return NextResponse.json({ year, month, projects, generalExpenses, summary, byService });
}
