import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { getPeopleOverview } from "@/lib/v2/admin/people-stats";

export async function GET(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const weeks = Number(request.nextUrl.searchParams.get("weeks") ?? "6");
  const people = await getPeopleOverview(auth.ctx, weeks);
  return NextResponse.json({ people });
}
