import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { createPlanItem, type PlanItemInput } from "@/lib/v2/agency/plan/plan-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<PlanItemInput>;
    if (!body.title?.trim() || !body.kind) {
      return NextResponse.json({ error: "title and kind required" }, { status: 400 });
    }
    const item = await createPlanItem(auth.ctx, {
      kind: body.kind,
      title: body.title,
      project_id: body.project_id ?? null,
      plan_date: body.plan_date ?? null,
      planned_minutes: body.planned_minutes ?? null,
      event_time: body.event_time ?? null,
      duration_label: body.duration_label ?? null,
    });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("v2/agency/plan/items POST:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
