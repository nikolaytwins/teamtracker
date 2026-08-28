import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalBudgetCategory,
  PersonalFinanceValidationError,
} from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const category = await createPersonalBudgetCategory(auth.ctx, {
      year: Number(body.year),
      month: Number(body.month),
      name: typeof body.name === "string" ? body.name : "",
      limit_rub: body.limit_rub !== undefined ? Number(body.limit_rub) : undefined,
    });
    return NextResponse.json({ category });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("create budget category:", e);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
