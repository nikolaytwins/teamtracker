import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { listCompletedEntriesForSessionUserInMonth } from "@/lib/pm-phases";
import { labelForTaskType } from "@/lib/time-task-types";

function workDateFromStartedAt(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso.trim());
  if (m) return m[1];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** GET ?month=YYYY-MM — все завершённые сессии текущего пользователя за календарный месяц. */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const month = request.nextUrl.searchParams.get("month")?.trim() || "";
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
    }
    const entries = listCompletedEntriesForSessionUserInMonth(session, month);
    const sessions = entries.map((e) => {
      const card = getCard(e.card_id);
      return {
        id: e.id,
        workDate: workDateFromStartedAt(e.started_at),
        cardId: e.card_id,
        cardName: card?.name ?? e.card_id,
        taskType: e.task_type,
        taskLabel: labelForTaskType(e.task_type),
        taskNote: e.task_note,
        startedAt: e.started_at,
        endedAt: e.ended_at!,
        durationSeconds: e.duration_seconds ?? 0,
      };
    });
    return NextResponse.json({ month, sessions });
  } catch (e) {
    console.error("GET /api/me/timer/sessions/month", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
