import { NextRequest, NextResponse } from "next/server";
import {
  clearDayModeByType,
  upsertPlanDayMode,
} from "@/lib/v2/agency/plan/plan-repo";
import type { PlanDayMode } from "@/lib/v2/agency/plan/plan-types";
import { toYmd } from "@/lib/v2/agency/plan/plan-utils";
import { sophiaCorsHeaders } from "@/lib/v2/integrations/sophia-cors";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";

const MODES = new Set(["strategy", "creative", "rest", "normal"]);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...sophiaCorsHeaders } });
}

/**
 * Назначить / снять режим дня (strategy | creative | rest | normal).
 * Body: { plan_date, mode }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      plan_date?: string;
      mode?: PlanDayMode | "normal" | null;
    };
    if (!body.plan_date?.trim()) {
      return NextResponse.json(
        { error: "plan_date required (YYYY-MM-DD)" },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }
    const mode = body.mode ?? null;
    if (mode !== null && !MODES.has(mode)) {
      return NextResponse.json(
        { error: "mode must be strategy|creative|rest|normal|null" },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }

    const ctx = await resolveSophiaIntegrationContext();
    const today = toYmd(new Date());
    if (mode === "normal" || mode === null) {
      await upsertPlanDayMode(ctx, body.plan_date, null);
    } else {
      if (mode !== "rest") {
        await clearDayModeByType(ctx, mode, today);
      }
      await upsertPlanDayMode(ctx, body.plan_date, mode);
    }
    return NextResponse.json(
      { ok: true, plan_date: body.plan_date, mode: mode === "normal" ? null : mode },
      { headers: { ...sophiaCorsHeaders } }
    );
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/plan/day-mode PATCH:", error);
    return NextResponse.json(
      { error: "Failed to update day mode" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}
