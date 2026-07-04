import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  PersonalIncomeHistoryValidationError,
  updatePersonalIncomeHistoryMonth,
} from "@/lib/v2/personal/income-history-repo";

type Ctx = { params: Promise<{ year: string; month: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const { year, month } = await params;
    const body = await request.json();
    const row = await updatePersonalIncomeHistoryMonth(auth.ctx, Number(year), Number(month), body);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ row });
  } catch (e) {
    if (e instanceof PersonalIncomeHistoryValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update month" }, { status: 500 });
  }
}
