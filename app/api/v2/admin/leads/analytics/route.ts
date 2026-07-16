import { NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { listFinanceMonthSummaries } from "@/lib/v2/finance/finance-repo";
import { buildLeadAnalytics, lastNMonthKeys } from "@/lib/v2/leads/lead-analytics";
import { listLeads } from "@/lib/v2/leads/lead-repo";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const leads = await listLeads(auth.ctx);
    const months = lastNMonthKeys(12);
    const financeByMonth = await listFinanceMonthSummaries(auth.ctx, months);
    const analytics = buildLeadAnalytics(leads, financeByMonth, months);
    return NextResponse.json(analytics);
  } catch (e) {
    console.error("GET /api/v2/admin/leads/analytics", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
