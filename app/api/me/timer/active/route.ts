import { NextResponse } from "next/server";
import { getCard } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { getActiveEntryForSessionUser } from "@/lib/pm-phases";
import { labelForTaskType } from "@/lib/time-task-types";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ active: null }, { status: 200 });
    const active = getActiveEntryForSessionUser(session);
    if (!active) return NextResponse.json({ active: null });
    const card = getCard(active.card_id);
    return NextResponse.json({
      active: {
        id: active.id,
        cardId: active.card_id,
        cardName: card?.name ?? active.card_id,
        phaseId: active.phase_id,
        startedAt: active.started_at,
        taskType: active.task_type,
        taskLabel: labelForTaskType(active.task_type),
      },
    });
  } catch (e) {
    console.error("GET /api/me/timer/active", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
