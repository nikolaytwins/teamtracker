import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = body.action === "stop" ? "stop" : body.action === "start" ? "start" : null;
    if (!action) {
      return NextResponse.json({ error: "action must be start or stop" }, { status: 400 });
    }

    const repo = getAgencyRepo();
    await repo.ensureProjectDetailTable();
    try {
      const detail = await repo.setProjectDetailTimer(params.id, action);
      if (!detail) return NextResponse.json({ error: "Detail not found" }, { status: 404 });
      return NextResponse.json({ success: true, detail });
    } catch (e) {
      if (e instanceof Error && e.message === "timer_only_for_hourly") {
        return NextResponse.json({ error: "Timer only for hourly details" }, { status: 400 });
      }
      throw e;
    }
  } catch (error) {
    console.error("Error toggling project detail timer:", error);
    return NextResponse.json({ error: "Failed to toggle timer" }, { status: 500 });
  }
}
