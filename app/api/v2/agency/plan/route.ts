import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { buildPlanPayload, loadPlanCalendarSlice } from "@/lib/v2/agency/plan/load-plan";
import { parseDispatchYearMonth } from "@/lib/v2/agency/dispatch/dispatch-context";

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { year, month } = parseDispatchYearMonth(request.nextUrl.searchParams);
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const calendarOnly = request.nextUrl.searchParams.get("calendar") === "1";

  if (calendarOnly) {
    if (!from || !to) {
      return NextResponse.json({ error: "from and to required" }, { status: 400 });
    }
    try {
      const calendar = await loadPlanCalendarSlice(auth.ctx, from, to);
      return NextResponse.json(calendar);
    } catch (error) {
      console.error("v2/agency/plan/calendar GET:", error);
      return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 });
    }
  }

  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  try {
    const plan = await buildPlanPayload(auth.ctx, year, month, from, to);
    return NextResponse.json({ plan, storageWarning: null });
  } catch (error) {
    console.error("v2/agency/plan GET:", error);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}
