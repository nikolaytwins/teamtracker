import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalIncomeHistoryMonth,
  listPersonalIncomeHistory,
  PersonalIncomeHistoryValidationError,
} from "@/lib/v2/personal/income-history-repo";

export async function GET() {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const rows = await listPersonalIncomeHistory(auth.ctx);
    return NextResponse.json({ rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load income history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const row = await createPersonalIncomeHistoryMonth(auth.ctx, body);
    return NextResponse.json({ row });
  } catch (e) {
    if (e instanceof PersonalIncomeHistoryValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create month" }, { status: 500 });
  }
}
