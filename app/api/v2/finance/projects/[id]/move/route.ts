import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { moveFinanceProjectToMonth } from "@/lib/v2/finance/finance-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const body = await request.json();
    const year = Number(body.year);
    const month = Number(body.month);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return NextResponse.json({ error: "year and month required" }, { status: 400 });
    }
    await moveFinanceProjectToMonth(auth.ctx, id, year, month);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("v2 finance move project:", e);
    return NextResponse.json({ error: "Failed to move project" }, { status: 500 });
  }
}
