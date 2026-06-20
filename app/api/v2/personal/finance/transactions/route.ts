import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalTransaction,
  PersonalFinanceValidationError,
} from "@/lib/v2/personal/personal-finance-repo";
import type { PersonalTxnType } from "@/lib/v2/personal/types";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const txn_type = body.txn_type as PersonalTxnType;
    const amount_rub = Number(body.amount_rub ?? body.amount);
    const year = Number(body.year);
    const month = Number(body.month);
    if (!txn_type || !Number.isFinite(amount_rub) || amount_rub <= 0) {
      return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
    }
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }
    await createPersonalTransaction(auth.ctx, {
      txn_type,
      amount_rub,
      description: body.description ?? null,
      from_account_id: body.from_account_id ?? null,
      to_account_id: body.to_account_id ?? null,
      budget_category_id: body.budget_category_id ?? null,
      year,
      month,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal transaction:", e);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
