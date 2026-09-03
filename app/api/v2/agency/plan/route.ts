import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { buildPlanPayload } from "@/lib/v2/agency/plan/load-plan";
import { parseDispatchYearMonth } from "@/lib/v2/agency/dispatch/dispatch-context";
import { addDays, mondayOf, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

async function detectPlanStorageIssue(userId: string): Promise<string | null> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("agency_plan_item").select("id").eq("user_id", userId).limit(1);
  if (error?.code === "22P02") return "migration_076_required";
  if (error?.code === "42P01") return "migration_075_required";
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { year, month } = parseDispatchYearMonth(request.nextUrl.searchParams);
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const anchor = fromParam ? new Date(`${fromParam}T00:00:00`) : mondayOf(new Date());
  const from = fromParam ?? toYmd(anchor);
  const to = toParam ?? toYmd(addDays(anchor, 41));

  try {
    const [storageWarning, plan] = await Promise.all([
      detectPlanStorageIssue(auth.ctx.userId),
      buildPlanPayload(auth.ctx, year, month, from, to),
    ]);
    return NextResponse.json({ plan, storageWarning });
  } catch (error) {
    console.error("v2/agency/plan GET:", error);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}
