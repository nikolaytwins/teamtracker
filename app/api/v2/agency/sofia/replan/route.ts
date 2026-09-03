import { NextRequest, NextResponse } from "next/server";
import { parseDispatchYearMonth } from "@/lib/v2/agency/dispatch/dispatch-context";
import { applyReplanChanges, buildReplanPreview } from "@/lib/v2/agency/plan/plan-replan";
import type { ReplanChangeRow } from "@/lib/v2/agency/plan/plan-replan-types";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { year, month } = parseDispatchYearMonth(request.nextUrl.searchParams);

  try {
    const preview = await buildReplanPreview(auth.ctx, year, month);
    return NextResponse.json({ preview });
  } catch (error) {
    console.error("v2/agency/sofia/replan POST:", error);
    return NextResponse.json({ error: "Failed to build preview" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  let body: { changes?: ReplanChangeRow[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.changes?.length) {
    return NextResponse.json({ error: "changes required" }, { status: 400 });
  }

  try {
    const result = await applyReplanChanges(auth.ctx, body.changes);
    return NextResponse.json(result);
  } catch (error) {
    console.error("v2/agency/sofia/replan PUT:", error);
    return NextResponse.json({ error: "Failed to apply replan" }, { status: 500 });
  }
}
