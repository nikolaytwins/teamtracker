import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { loadFinanceLineAnalytics } from "@/lib/v2/finance/finance-repo";
import { isFinanceBusinessLine } from "@/lib/v2/finance/meta";

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const lineParam = request.nextUrl.searchParams.get("line");
  const businessLine = isFinanceBusinessLine(lineParam) ? lineParam : "agency";

  try {
    const data = await loadFinanceLineAnalytics(auth.ctx, businessLine);
    return NextResponse.json(data);
  } catch (e) {
    console.error("agency analytics:", e);
    return NextResponse.json({ error: "Failed to load agency analytics" }, { status: 500 });
  }
}
