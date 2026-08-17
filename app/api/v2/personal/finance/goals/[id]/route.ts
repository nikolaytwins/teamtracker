import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  PersonalFinanceValidationError,
  deleteFinanceGoal,
  updateFinanceGoal,
} from "@/lib/v2/personal/personal-finance-repo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    const goal = await updateFinanceGoal(auth.ctx, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      hint: typeof body.hint === "string" ? body.hint : undefined,
      target_rub: typeof body.target_rub === "number" ? body.target_rub : undefined,
    });
    return NextResponse.json({ goal });
  } catch (e) {
    const message = e instanceof PersonalFinanceValidationError ? e.message : "Failed to update goal";
    const status = e instanceof PersonalFinanceValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteFinanceGoal(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
