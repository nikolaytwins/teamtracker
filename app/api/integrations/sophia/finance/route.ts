import { NextRequest, NextResponse } from "next/server";
import { applyFinanceAllocation } from "@/lib/v2/personal/finance-assistant/apply";
import { loadFinanceAssistantContext } from "@/lib/v2/personal/finance-assistant/context";
import {
  allocateAvailableIncome,
  FINANCE_RULES_TEXT,
  parseAvailableRub,
} from "@/lib/v2/personal/finance-assistant/rules";
import type { FinanceAllocationPlan } from "@/lib/v2/personal/finance-assistant/types";
import { sophiaCorsHeaders } from "@/lib/v2/integrations/sophia-cors";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";
import { PersonalFinanceValidationError } from "@/lib/v2/personal/personal-finance-repo";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...sophiaCorsHeaders } });
}

/** Контекст + расчёт распределения для OpenClaw / TG / VK. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveSophiaIntegrationContext();
    const context = await loadFinanceAssistantContext(ctx);
    const availableRaw = request.nextUrl.searchParams.get("available");
    const available = availableRaw ? Number(availableRaw) : NaN;
    const plan = Number.isFinite(available) && available > 0 ? allocateAvailableIncome(available) : null;

    return NextResponse.json(
      {
        ok: true,
        context,
        rules: FINANCE_RULES_TEXT,
        plan,
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
    console.error("integrations/sophia/finance GET:", error);
    return NextResponse.json(
      { error: "Failed to load finance context" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}

/**
 * POST body:
 * - { available_rub: number } — только план
 * - { message: string } — парсит сумму из текста
 * - { plan, apply: true } — записать в фонды
 * - { available_rub, apply: true } — посчитать и записать
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveSophiaIntegrationContext();
    let body: {
      available_rub?: number;
      message?: string;
      plan?: FinanceAllocationPlan;
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

    let plan = body.plan ?? null;
    if (!plan) {
      const fromMsg = body.message ? parseAvailableRub(body.message) : null;
      const available =
        typeof body.available_rub === "number" && body.available_rub > 0
          ? Math.round(body.available_rub)
          : fromMsg;
      if (available == null) {
        return NextResponse.json(
          {
            ok: false,
            error: "Нужна сумма: available_rub или message с цифрами",
            hint: "Например: «заработал 250 тысяч»",
          },
          { status: 400, headers: { ...sophiaCorsHeaders } }
        );
      }
      plan = allocateAvailableIncome(available);
    }

    if (!body.apply) {
      const context = await loadFinanceAssistantContext(ctx);
      return NextResponse.json(
        { ok: true, plan, context, applied: false },
        { headers: { ...sophiaCorsHeaders } }
      );
    }

    const result = await applyFinanceAllocation(ctx, plan);
    return NextResponse.json(
      { ok: true, plan, applied: true, rows: result.applied, skipped: result.skipped },
      { headers: { ...sophiaCorsHeaders } }
    );
  } catch (error) {
    if (error instanceof PersonalFinanceValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { ...sophiaCorsHeaders } }
      );
    }
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } }
      );
    }
    console.error("integrations/sophia/finance POST:", error);
    return NextResponse.json(
      { error: "Failed to allocate" },
      { status: 500, headers: { ...sophiaCorsHeaders } }
    );
  }
}
