import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { loadPersonalFinanceDashboard } from "@/lib/v2/personal/personal-finance-repo";

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
    const dashboard = await loadPersonalFinanceDashboard(auth.ctx, year, month);
    return NextResponse.json(dashboard);
  } catch (e) {
    console.error("personal finance dashboard:", e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
