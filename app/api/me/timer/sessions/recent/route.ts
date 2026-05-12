import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { listRecentEntriesForSessionUser } from "@/lib/pm-phases";
import { labelForTaskType } from "@/lib/time-task-types";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const raw = request.nextUrl.searchParams.get("limit");
    const limit = raw != null ? parseInt(raw, 10) : 10;
    const entries = listRecentEntriesForSessionUser(session, Number.isFinite(limit) ? limit : 10, {
      completedOnly: true,
    });
    const sessions = entries.map((e) => {
      const card = getCard(e.card_id);
      return {
        id: e.id,
        cardId: e.card_id,
        cardName: card?.name ?? e.card_id,
        taskType: e.task_type,
        taskLabel: labelForTaskType(e.task_type),
        taskNote: e.task_note,
        startedAt: e.started_at,
        endedAt: e.ended_at,
        durationSeconds: e.duration_seconds ?? 0,
      };
    });
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error("GET /api/me/timer/sessions/recent", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
