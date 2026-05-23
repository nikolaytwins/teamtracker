import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { formatActivityMessage, listRecentActivity } from "@/lib/v2/activity/log";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "40");
  const rows = await listRecentActivity(auth.ctx, limit);
  return NextResponse.json({
    activity: rows.map((r) => ({
      ...r,
      message: formatActivityMessage(r),
    })),
  });
}
