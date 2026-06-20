import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { adjacentFinanceMonth } from "@/lib/v2/finance/meta";
import { copyFinanceProjectToNextMonth } from "@/lib/v2/finance/finance-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    let year = typeof body.year === "number" ? body.year : NaN;
    let month = typeof body.month === "number" ? body.month : NaN;

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      const curYear = typeof body.currentYear === "number" ? body.currentYear : new Date().getFullYear();
      const curMonth = typeof body.currentMonth === "number" ? body.currentMonth : new Date().getMonth() + 1;
      const next = adjacentFinanceMonth(curYear, curMonth, 1);
      year = next.year;
      month = next.month;
    }

    const project = await copyFinanceProjectToNextMonth(auth.ctx, id, year, month);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ project });
  } catch (e) {
    console.error("v2 finance copy project:", e);
    return NextResponse.json({ error: "Failed to copy project" }, { status: 500 });
  }
}
