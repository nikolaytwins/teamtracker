import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { reorderPlanItemsOnDay } from "@/lib/v2/agency/plan/plan-repo";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      plan_date?: string;
      ordered_ids?: string[];
    };
    if (!body.plan_date || !Array.isArray(body.ordered_ids)) {
      return NextResponse.json({ error: "plan_date and ordered_ids required" }, { status: 400 });
    }
    await reorderPlanItemsOnDay(auth.ctx, body.plan_date, body.ordered_ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("v2/agency/plan/items/reorder PATCH:", error);
    return NextResponse.json({ error: "Failed to reorder items" }, { status: 500 });
  }
}
