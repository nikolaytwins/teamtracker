import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  clearDayModeByType,
  upsertPlanDayMode,
} from "@/lib/v2/agency/plan/plan-repo";
import type { PlanDayMode } from "@/lib/v2/agency/plan/plan-types";
import { toYmd } from "@/lib/v2/agency/plan/plan-utils";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      plan_date: string;
      mode: PlanDayMode | "normal" | null;
    };
    if (!body.plan_date) {
      return NextResponse.json({ error: "plan_date required" }, { status: 400 });
    }

    const today = toYmd(new Date());
    if (body.mode === "normal" || body.mode === null) {
      await upsertPlanDayMode(auth.ctx, body.plan_date, null);
    } else {
      if (body.mode !== "rest") {
        await clearDayModeByType(auth.ctx, body.mode, today);
      }
      await upsertPlanDayMode(auth.ctx, body.plan_date, body.mode);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("v2/agency/plan/day-mode PATCH:", error);
    return NextResponse.json({ error: "Failed to update day mode" }, { status: 500 });
  }
}
