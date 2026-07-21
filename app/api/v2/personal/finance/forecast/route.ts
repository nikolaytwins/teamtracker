import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  createForecastExtraExpense,
  PersonalFinanceValidationError,
  updatePersonalExpectedExpenses,
} from "@/lib/v2/personal/personal-finance-repo";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const year = Number(body.year);
    const month = Number(body.month);
    if (body.expected_expenses_rub !== undefined) {
      const budget = await updatePersonalExpectedExpenses(
        auth.ctx,
        year,
        month,
        Number(body.expected_expenses_rub)
      );
      return NextResponse.json({ budget });
    }
    if (body.extra) {
      const extra = await createForecastExtraExpense(auth.ctx, {
        year,
        month,
        label: body.extra.label,
        amount_rub: Number(body.extra.amount_rub),
      });
      return NextResponse.json({ extra });
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const detail =
      e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : null;
    console.error("forecast expenses:", e);
    return NextResponse.json(
      { error: detail || "Failed to update forecast expenses" },
      { status: 500 }
    );
  }
}
