import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  PersonalFinanceValidationError,
  updateFinanceSystem,
} from "@/lib/v2/personal/personal-finance-repo";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const system = await updateFinanceSystem(auth.ctx, {
      life_expenses_rub:
        typeof body.life_expenses_rub === "number" ? body.life_expenses_rub : undefined,
      funds_rub: typeof body.funds_rub === "number" ? body.funds_rub : undefined,
      moscow_job_stable:
        typeof body.moscow_job_stable === "boolean" ? body.moscow_job_stable : undefined,
    });
    return NextResponse.json({ system });
  } catch (e) {
    const message = e instanceof PersonalFinanceValidationError ? e.message : "Failed to update system";
    const status = e instanceof PersonalFinanceValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
