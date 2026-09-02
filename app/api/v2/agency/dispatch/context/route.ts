import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  buildDispatchContext,
  parseDispatchYearMonth,
} from "@/lib/v2/agency/dispatch/dispatch-context";

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { year, month } = parseDispatchYearMonth(request.nextUrl.searchParams);

  try {
    const context = await buildDispatchContext(auth.ctx, year, month);
    return NextResponse.json(context);
  } catch (error) {
    console.error("v2/agency/dispatch/context:", error);
    return NextResponse.json({ error: "Failed to load dispatch context" }, { status: 500 });
  }
}
