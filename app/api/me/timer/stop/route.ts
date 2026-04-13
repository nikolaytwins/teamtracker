import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { getActiveEntryForSessionUser, stopTimer } from "@/lib/pm-phases";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const active = getActiveEntryForSessionUser(session);
    if (!active) return NextResponse.json({ error: "Нет активной сессии" }, { status: 400 });
    const entry = stopTimer(active.card_id);
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    console.error("POST /api/me/timer/stop", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
