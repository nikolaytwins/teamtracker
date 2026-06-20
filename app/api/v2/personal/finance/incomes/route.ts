import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { createPersonalIncome, PersonalFinanceValidationError } from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const amount = Number(body.amount_rub ?? body.amount);
    const year = Number(body.year);
    const month = Number(body.month);
    if (!title || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "title and positive amount required" }, { status: 400 });
    }
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }
    const income = await createPersonalIncome(auth.ctx, {
      title,
      amount_rub: amount,
      brand_key: body.brand_key,
      status: body.status,
      date_label: body.date_label,
      year,
      month,
    });
    return NextResponse.json({ income });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create income" }, { status: 500 });
  }
}
