import { NextRequest, NextResponse } from "next/server";
import { deletePlanItem, updatePlanItem, type PlanItemInput } from "@/lib/v2/agency/plan/plan-repo";
import type { PlanItemKind } from "@/lib/v2/agency/plan/plan-types";
import { sophiaCorsHeaders } from "@/lib/v2/integrations/sophia-cors";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";

type Ctx = { params: Promise<{ id: string }> };

const KINDS = new Set<PlanItemKind>(["task", "call", "personal"]);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...sophiaCorsHeaders } });
}

/**
 * Обновить / перенести блок плана.
 * Body: Partial<{ kind, title, plan_date, planned_minutes, project_id, event_time, duration_label }>
 */
export async function PATCH(request: NextRequest, routeCtx: Ctx) {
  const { id } = await routeCtx.params;
  try {
    const body = (await request.json()) as Partial<PlanItemInput>;
    if (body.kind !== undefined && !KINDS.has(body.kind)) {
      return NextResponse.json(
        { error: "kind must be task|call|personal" },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }
    if (body.title !== undefined && !body.title.trim()) {
      return NextResponse.json(
        { error: "title cannot be empty" },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }

    const ctx = await resolveSophiaIntegrationContext();
    const item = await updatePlanItem(ctx, id, body);
    return NextResponse.json({ ok: true, item }, { headers: { ...sophiaCorsHeaders } });
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/plan/items PATCH:", error);
    return NextResponse.json(
      { error: "Failed to update plan item" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}

export async function DELETE(_request: NextRequest, routeCtx: Ctx) {
  const { id } = await routeCtx.params;
  try {
    const ctx = await resolveSophiaIntegrationContext();
    await deletePlanItem(ctx, id);
    return NextResponse.json({ ok: true }, { headers: { ...sophiaCorsHeaders } });
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/plan/items DELETE:", error);
    return NextResponse.json(
      { error: "Failed to delete plan item" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}
