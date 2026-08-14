import { NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { loadAgencyOverview } from "@/lib/v2/agency/agency-overview";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  try {
    const data = await loadAgencyOverview(auth.ctx);
    return NextResponse.json(data);
  } catch (e) {
    console.error("agency overview:", e);
    return NextResponse.json({ error: "Failed to load agency overview" }, { status: 500 });
  }
}
