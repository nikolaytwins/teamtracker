import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-tt-integration-secret, Content-Type",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...corsHeaders } });
}

/**
 * Ожидаемая и фактическая выручка агентства за календарный месяц (та же логика, что /api/agency/profit).
 * Доступ: заголовок x-tt-integration-secret = process.env.TT_INTEGRATION_SECRET (мин. 16 символов).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Query params year and month (1–12) are required" },
        { status: 400, headers: { ...corsHeaders } }
      );
    }
    const r = await getAgencyRepo().getAgencyProfitForMonth(year, month);
    return NextResponse.json(
      {
        year,
        month,
        expectedRevenue: r.expectedRevenue,
        actualRevenue: r.actualRevenue,
        totalExpenses: r.totalExpenses,
        expectedProfit: r.expectedProfit,
        actualProfit: r.actualProfit,
      },
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    console.error("integrations/sophia/agency-profit:", error);
    return NextResponse.json(
      { error: "Failed to load agency profit" },
      { status: 500, headers: { ...corsHeaders } }
    );
  }
}
