import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalTransaction,
  listPersonalTransactions,
  PersonalFinanceValidationError,
} from "@/lib/v2/personal/personal-finance-repo";
import type { PersonalTxnType } from "@/lib/v2/personal/types";

export async function GET(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const sp = request.nextUrl.searchParams;
    const year = Number(sp.get("year"));
    const month = Number(sp.get("month"));
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }
    const txn_type = sp.get("txn_type") as PersonalTxnType | null;
    const budget_category_id = sp.get("budget_category_id");
    const q = sp.get("q");
    const transactions = await listPersonalTransactions(auth.ctx, {
      year,
      month,
      txn_type: txn_type || null,
      budget_category_id: budget_category_id || null,
      q: q || null,
    });
    return NextResponse.json({ transactions });
  } catch (e) {
    console.error("list personal transactions:", e);
    return NextResponse.json({ error: "Failed to list transactions" }, { status: 500 });
  }
}

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
    const transaction = await createPersonalTransaction(auth.ctx, {
      txn_type,
      amount_rub,
      description: body.description ?? null,
      from_account_id: body.from_account_id ?? null,
      to_account_id: body.to_account_id ?? null,
      budget_category_id: body.budget_category_id ?? null,
      year,
      month,
      txn_date: body.txn_date ?? null,
    });
    return NextResponse.json({ ok: true, transaction });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal transaction:", e);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
