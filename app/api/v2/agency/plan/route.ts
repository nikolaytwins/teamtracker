import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { buildPlanPayload } from "@/lib/v2/agency/plan/load-plan";
import { parseDispatchYearMonth } from "@/lib/v2/agency/dispatch/dispatch-context";
import { addDays, mondayOf, toYmd } from "@/lib/v2/agency/plan/plan-utils";

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
    const plan = await buildPlanPayload(auth.ctx, year, month, from, to);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("v2/agency/plan GET:", error);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}
