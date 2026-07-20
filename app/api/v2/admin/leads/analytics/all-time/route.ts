import { NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { buildLeadAllTimeAnalytics } from "@/lib/v2/leads/lead-analytics";
import { listLeads } from "@/lib/v2/leads/lead-repo";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const leads = await listLeads(auth.ctx);
    return NextResponse.json(buildLeadAllTimeAnalytics(leads));
  } catch (e) {
    console.error("GET /api/v2/admin/leads/analytics/all-time", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
