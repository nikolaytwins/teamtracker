import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalTransaction,
  PersonalFinanceValidationError,
  updatePersonalTransactionAmount,
  updatePersonalTransactionCategory,
} from "@/lib/v2/personal/personal-finance-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();

    if ("budget_category_id" in body) {
      const budget_category_id =
        body.budget_category_id == null || body.budget_category_id === ""
          ? null
          : String(body.budget_category_id);
      const transaction = await updatePersonalTransactionCategory(auth.ctx, id, budget_category_id);
      if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ transaction });
    }

    const amount_rub = Number(body.amount_rub);
    const transaction = await updatePersonalTransactionAmount(auth.ctx, id, amount_rub);
    if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ transaction });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("update personal transaction:", e);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  _context: Ctx
) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await _context.params;
    await deletePersonalTransaction(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("delete personal transaction:", e);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
