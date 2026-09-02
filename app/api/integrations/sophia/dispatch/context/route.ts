import { NextRequest, NextResponse } from "next/server";
import { resolveSophiaIntegrationContext } from "@/lib/v2/integrations/sophia-integration-context";
import {
  buildDispatchContext,
  parseDispatchYearMonth,
} from "@/lib/v2/agency/dispatch/dispatch-context";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-tt-integration-secret, Authorization, Content-Type",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...corsHeaders } });
}

/**
 * Контекст Sofia Plan поверх v2 Supabase (agency_project + finance-repo).
 * Доступ: x-tt-integration-secret или Bearer = TT_INTEGRATION_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    const { year, month } = parseDispatchYearMonth(request.nextUrl.searchParams);
    const ctx = await resolveSophiaIntegrationContext();
    const context = await buildDispatchContext(ctx, year, month);
    return NextResponse.json(context, { headers: { ...corsHeaders } });
  } catch (error) {
    console.error("integrations/sophia/dispatch/context:", error);
    return NextResponse.json(
      { error: "Failed to load dispatch context" },
      { status: 500, headers: { ...corsHeaders } }
    );
  }
}
