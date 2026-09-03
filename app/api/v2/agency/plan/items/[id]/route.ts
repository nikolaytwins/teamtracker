import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { deletePlanItem, updatePlanItem, type PlanItemInput } from "@/lib/v2/agency/plan/plan-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as Partial<PlanItemInput>;
    const item = await updatePlanItem(auth.ctx, id, body);
    return NextResponse.json({ item });
  } catch (error) {
    console.error("v2/agency/plan/items PATCH:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    await deletePlanItem(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("v2/agency/plan/items DELETE:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
