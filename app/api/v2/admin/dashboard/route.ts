import { NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { getAdminDashboard } from "@/lib/v2/admin/people-stats";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const stats = await getAdminDashboard(auth.ctx);
  return NextResponse.json(stats);
}
