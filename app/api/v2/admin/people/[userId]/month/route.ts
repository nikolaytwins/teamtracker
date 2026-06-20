import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { getUserMonthStats } from "@/lib/v2/admin/people-stats";

type RouteCtx = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const { userId } = await params;
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const stats = await getUserMonthStats(auth.ctx, userId, month ?? undefined);
  return NextResponse.json({ stats });
}
