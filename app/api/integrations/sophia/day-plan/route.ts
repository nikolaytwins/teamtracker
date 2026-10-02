import { NextRequest, NextResponse } from "next/server";
import { applyDayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-apply";
import { loadDayPlanContext } from "@/lib/v2/personal/finance-assistant/day-plan-context";
import {
  DAY_PLAN_RULES_TEXT,
  proposeDayWeekPlan,
  resolveWeekStart,
} from "@/lib/v2/personal/finance-assistant/day-plan-rules";
import type { DayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import { listPlanDayModes, listPlanItems } from "@/lib/v2/agency/plan/plan-repo";
import { addDays, parseYmd, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import { sophiaCorsHeaders } from "@/lib/v2/integrations/sophia-cors";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...sophiaCorsHeaders } });
}

/** Контекст недели + чеклист для OpenClaw / TG / VK. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveSophiaIntegrationContext();
    const message = request.nextUrl.searchParams.get("message") ?? "";
    const weekStartParam = request.nextUrl.searchParams.get("week_start");
    const weekStart = weekStartParam || resolveWeekStart(message || "эта неделя");
    const context = await loadDayPlanContext(ctx, { weekStart, message });

    return NextResponse.json(
      {
        ok: true,
        context,
        rules: DAY_PLAN_RULES_TEXT,
      },
      { headers: { ...sophiaCorsHeaders } }
    );
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/day-plan GET:", error);
    return NextResponse.json(
      { error: "Failed to load day plan context" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}

/**
 * POST body:
 * - { message } — предложить план недели
 * - { day_plan, apply: true } — записать в календарь
 * - { message, apply: true } — посчитать и записать
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveSophiaIntegrationContext();
    let body: {
      message?: string;
      week_start?: string;
      day_plan?: DayWeekPlan;
      apply?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }

    let plan = body.day_plan ?? null;
    if (!plan) {
      const message = body.message?.trim() || "распланируй неделю";
      const weekStart = body.week_start || resolveWeekStart(message);
      const weekEnd = toYmd(addDays(parseYmd(weekStart), 6));
      const [items, dayModes] = await Promise.all([
        listPlanItems(ctx, weekStart, weekEnd),
        listPlanDayModes(ctx, weekStart, weekEnd),
      ]);
      plan = proposeDayWeekPlan({ weekStart, items, dayModes, message });
    }

    if (!body.apply) {
      const context = await loadDayPlanContext(ctx, {
        weekStart: plan.week_start,
        message: body.message,
      });
      return NextResponse.json(
        { ok: true, day_plan: plan, context, applied: false },
        { headers: { ...sophiaCorsHeaders } }
      );
    }

    const result = await applyDayWeekPlan(ctx, plan);
    return NextResponse.json(
      {
        ok: true,
        day_plan: plan,
        applied: true,
        created_items: result.created_items,
        day_modes: result.day_modes,
        skipped: result.skipped,
      },
      { headers: { ...sophiaCorsHeaders } }
    );
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/day-plan POST:", error);
    return NextResponse.json(
      { error: "Failed to build/apply day plan" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}
