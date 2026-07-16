import { NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  computeFinanceMonthSummary,
  listFinanceGeneralExpenses,
  listFinanceProjectsForMonth,
} from "@/lib/v2/finance/finance-repo";
import type { V2FinanceMonthSummary } from "@/lib/v2/finance/types";
import {
  buildLeadAnalytics,
  collectMonthKeysFromLeads,
  leadAnalyticsMonthKey,
} from "@/lib/v2/leads/lead-analytics";
import { listLeads } from "@/lib/v2/leads/lead-repo";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const leads = await listLeads(auth.ctx);
    const months = collectMonthKeysFromLeads(leads, 12);
    const financeByMonth = new Map<string, V2FinanceMonthSummary>();

    await Promise.all(
      months.map(async ({ year, month }) => {
        const [projects, generalExpenses] = await Promise.all([
          listFinanceProjectsForMonth(auth.ctx, year, month),
          listFinanceGeneralExpenses(auth.ctx, year, month),
        ]);
        financeByMonth.set(
          leadAnalyticsMonthKey(year, month),
          computeFinanceMonthSummary(projects, generalExpenses, year, month)
        );
      })
    );

    const analytics = buildLeadAnalytics(leads, financeByMonth);
    return NextResponse.json(analytics);
  } catch (e) {
    console.error("GET /api/v2/admin/leads/analytics", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
