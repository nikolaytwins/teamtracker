import { NextRequest, NextResponse } from "next/server";
import { parseDispatchYearMonth } from "@/lib/v2/agency/dispatch/dispatch-context";
import { buildSofiaContextPanel } from "@/lib/v2/agency/sofia/sofia-context";
import { buildStaleChecks, respondSofia } from "@/lib/v2/agency/sofia/sofia-respond";
import type { SofiaChatTurn } from "@/lib/v2/agency/sofia/sofia-types";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { buildDispatchContext } from "@/lib/v2/agency/dispatch/dispatch-context";

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { year, month } = parseDispatchYearMonth(request.nextUrl.searchParams);
  try {
    const context = await buildSofiaContextPanel(auth.ctx, year, month);
    const dispatch = await buildDispatchContext(auth.ctx, year, month);
    const staleChecks = buildStaleChecks(dispatch.plan.activeProjects);
    return NextResponse.json({ context, staleChecks });
  } catch (error) {
    console.error("v2/agency/sofia/context GET:", error);
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  let body: {
    message?: string;
    history?: SofiaChatTurn[];
    year?: number;
    month?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const { year, month } =
    body.year && body.month
      ? { year: body.year, month: body.month }
      : parseDispatchYearMonth(new URLSearchParams());

  try {
    const result = await respondSofia(auth.ctx, {
      message,
      history: body.history,
      year,
      month,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("v2/agency/sofia/chat POST:", error);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
