import { NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { loadV2Dashboard } from "@/lib/v2/dashboard/load-dashboard";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  try {
    const dashboard = await loadV2Dashboard(auth.ctx);
    return NextResponse.json(dashboard);
  } catch (e) {
    console.error("v2 dashboard:", e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
