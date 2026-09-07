import { NextRequest, NextResponse } from "next/server";
import { parseDispatchYearMonth } from "@/lib/v2/agency/dispatch/dispatch-context";
import { buildPlanPayload, loadPlanCalendarSlice } from "@/lib/v2/agency/plan/load-plan";
import { sophiaCorsHeaders } from "@/lib/v2/integrations/sophia-cors";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...sophiaCorsHeaders } });
}

/**
 * Календарь / план для Софии (чтение).
 * Query: from&to (обязательны) | calendar=1&from&to | year&month&from&to
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveSophiaIntegrationContext();
    const sp = request.nextUrl.searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to required (YYYY-MM-DD)" },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }

    if (sp.get("calendar") === "1") {
      const calendar = await loadPlanCalendarSlice(ctx, from, to);
      return NextResponse.json({ ok: true, ...calendar }, { headers: { ...sophiaCorsHeaders } });
    }

    const { year, month } = parseDispatchYearMonth(sp);
    const plan = await buildPlanPayload(ctx, year, month, from, to);
    return NextResponse.json({ ok: true, plan }, { headers: { ...sophiaCorsHeaders } });
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/plan GET:", error);
    return NextResponse.json(
      { error: "Failed to load plan" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}
