import { NextRequest, NextResponse } from "next/server";
import { createPlanItem, type PlanItemInput } from "@/lib/v2/agency/plan/plan-repo";
import type { PlanItemKind } from "@/lib/v2/agency/plan/plan-types";
import { sophiaCorsHeaders } from "@/lib/v2/integrations/sophia-cors";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";

const KINDS = new Set<PlanItemKind>(["task", "call", "personal"]);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...sophiaCorsHeaders } });
}

/**
 * Создать блок плана (календарь).
 * Body: { kind, title, plan_date?, planned_minutes?, project_id?, event_time?, duration_label? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PlanItemInput>;
    const title = body.title?.trim();
    const kind = body.kind;
    if (!title || !kind || !KINDS.has(kind)) {
      return NextResponse.json(
        { error: "title and kind required (task|call|personal)" },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }

    const ctx = await resolveSophiaIntegrationContext();
    const item = await createPlanItem(ctx, {
      kind,
      title,
      project_id: body.project_id ?? null,
      plan_date: body.plan_date ?? null,
      planned_minutes: body.planned_minutes ?? null,
      event_time: body.event_time ?? null,
      duration_label: body.duration_label ?? null,
      sort_order: body.sort_order ?? null,
      priority: body.priority ?? null,
    });
    return NextResponse.json({ ok: true, item }, { headers: { ...sophiaCorsHeaders } });
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/plan/items POST:", error);
    return NextResponse.json(
      { error: "Failed to create plan item" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}
