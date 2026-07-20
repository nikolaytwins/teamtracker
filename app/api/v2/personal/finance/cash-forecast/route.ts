import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  loadPersonalCashForecast,
  PersonalFinanceValidationError,
  updatePersonalDailySpend,
} from "@/lib/v2/personal/personal-finance-repo";

export async function GET(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  let year = Number(request.nextUrl.searchParams.get("year"));
  let month = Number(request.nextUrl.searchParams.get("month"));
  const valid = Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12;
  if (!valid) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  try {
    const forecast = await loadPersonalCashForecast(auth.ctx, year, month);
    return NextResponse.json(forecast);
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal cash forecast:", e);
    return NextResponse.json({ error: "Failed to load forecast" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const year = Number(body.year);
    const month = Number(body.month);
    if (body.daily_spend_rub === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const budget = await updatePersonalDailySpend(
      auth.ctx,
      year,
      month,
      Number(body.daily_spend_rub)
    );
    return NextResponse.json({ budget });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("update daily spend:", e);
    return NextResponse.json({ error: "Failed to update daily spend" }, { status: 500 });
  }
}
