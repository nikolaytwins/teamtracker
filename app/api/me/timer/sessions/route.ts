import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { buildTimerSessionsWeekPayload } from "@/lib/me-timer-sessions";

/** GET ?week=2026-W15 (ISO). Без параметра — текущая неделя. */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const week = new URL(request.url).searchParams.get("week");
    const payload = buildTimerSessionsWeekPayload(session, week);
    if (!payload) {
      return NextResponse.json({ error: "week must be YYYY-Www (e.g. 2026-W15)" }, { status: 400 });
    }
    return NextResponse.json(payload);
  } catch (e) {
    console.error("GET /api/me/timer/sessions", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
