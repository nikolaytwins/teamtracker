import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  PersonalFinanceValidationError,
  createFinanceGoal,
} from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const goal = await createFinanceGoal(auth.ctx, {
      title: typeof body.title === "string" ? body.title : "",
      hint: typeof body.hint === "string" ? body.hint : "",
      target_rub: typeof body.target_rub === "number" ? body.target_rub : Number(body.target_rub),
    });
    return NextResponse.json({ goal });
  } catch (e) {
    const message = e instanceof PersonalFinanceValidationError ? e.message : "Failed to create goal";
    const status = e instanceof PersonalFinanceValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
