import { NextRequest, NextResponse } from "next/server";
import { applyDayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-apply";
import type { DayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import { applyFinanceAllocation } from "@/lib/v2/personal/finance-assistant/apply";
import type { FinanceAllocationPlan } from "@/lib/v2/personal/finance-assistant/types";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { PersonalFinanceValidationError } from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  let body: {
    plan?: FinanceAllocationPlan;
    day_plan?: DayWeekPlan;
    domain?: "finance" | "day";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.domain === "day" || body.day_plan) {
      if (!body.day_plan || !Array.isArray(body.day_plan.entries)) {
        return NextResponse.json({ error: "day_plan required" }, { status: 400 });
      }
      const result = await applyDayWeekPlan(auth.ctx, body.day_plan);
      return NextResponse.json(result);
    }

    if (!body.plan || !Array.isArray(body.plan.lines)) {
      return NextResponse.json({ error: "plan required" }, { status: 400 });
    }
    const result = await applyFinanceAllocation(auth.ctx, body.plan);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("v2/personal/finance/assistant/apply POST:", error);
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}
