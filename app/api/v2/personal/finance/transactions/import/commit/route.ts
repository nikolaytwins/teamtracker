import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  importPersonalTransactions,
  PersonalFinanceValidationError,
} from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const from_account_id = String(body.from_account_id ?? "");
    if (!from_account_id) {
      return NextResponse.json({ error: "Укажите счёт" }, { status: 400 });
    }
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Нет операций для импорта" }, { status: 400 });
    }

    const result = await importPersonalTransactions(auth.ctx, {
      from_account_id,
      to_account_id: body.to_account_id ?? null,
      apply_balances: Boolean(body.apply_balances),
      items: items.map((it: Record<string, unknown>) => ({
        txn_type: it.txn_type === "income" ? "income" : "expense",
        amount_rub: Number(it.amount_rub),
        description: String(it.description ?? "Операция"),
        date: String(it.date),
        external_id: String(it.external_id),
        budget_category_id: (it.budget_category_id as string | null) ?? null,
        selected: it.selected !== false,
      })),
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("import transactions:", e);
    return NextResponse.json({ error: "Failed to import" }, { status: 500 });
  }
}
