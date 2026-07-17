import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  deleteForecastExtraExpense,
  PersonalFinanceValidationError,
  updateForecastExtraExpense,
} from "@/lib/v2/personal/personal-finance-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const extra = await updateForecastExtraExpense(auth.ctx, id, {
      label: body.label,
      amount_rub: body.amount_rub != null ? Number(body.amount_rub) : undefined,
    });
    return NextResponse.json({ extra });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("update forecast extra:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await deleteForecastExtraExpense(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("delete forecast extra:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
