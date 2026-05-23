import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { getUserDaySessions } from "@/lib/v2/admin/people-stats";

type RouteCtx = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const { userId } = await params;
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const sessions = await getUserDaySessions(auth.ctx, userId, date);
  return NextResponse.json({ sessions, date });
}
