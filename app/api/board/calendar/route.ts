import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseISOWeekParam } from "@/lib/iso-week";
import { requireSession } from "@/lib/require-role";

type TimeEventRow = {
  id: string;
  card_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  worker_user_id: string | null;
  worker_name: string;
  task_note: string | null;
  task_type: string | null;
  card_name: string;
};

type PlanEventRow = {
  id: string;
  card_id: string;
  title: string;
  planned_start: string | null;
  planned_end: string | null;
  estimated_hours: number | null;
  assignee_user_id: string | null;
  lead_user_id: string | null;
  card_name: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const sp = new URL(request.url).searchParams;
    const week = (sp.get("week") || "").trim();
    const userId = (sp.get("userId") || "").trim();
    const cardId = (sp.get("cardId") || "").trim();

    const parsed = parseISOWeekParam(week);
    if (!parsed) {
      return NextResponse.json({ error: "week required (YYYY-Www)" }, { status: 400 });
    }

    const mondayIso = parsed.monday.toISOString();
    const nextMondayIso = parsed.nextMonday.toISOString();
    const db = getDb();

    const cards = db
      .prepare(`SELECT id, name, status FROM pm_cards ORDER BY name COLLATE NOCASE ASC`)
      .all() as Array<{ id: string; name: string; status: string }>;

    const timeRows = db
      .prepare(
        `SELECT e.id, e.card_id, e.started_at, e.ended_at, e.duration_seconds, e.worker_user_id, e.worker_name, e.task_note, e.task_type, c.name as card_name
         FROM pm_time_entries e
         JOIN pm_cards c ON c.id = e.card_id
         WHERE e.started_at >= ? AND e.started_at < ?
           AND (? = '' OR e.card_id = ?)
           AND (? = '' OR e.worker_user_id = ?)
         ORDER BY e.started_at ASC`
      )
      .all(mondayIso, nextMondayIso, cardId, cardId, userId, userId) as TimeEventRow[];

    const planRows = db
      .prepare(
        `SELECT s.id, s.card_id, s.title, s.planned_start, s.planned_end, s.estimated_hours, s.assignee_user_id, s.lead_user_id, c.name as card_name
         FROM pm_subtasks s
         JOIN pm_cards c ON c.id = s.card_id
         WHERE s.planned_start IS NOT NULL
           AND s.planned_end IS NOT NULL
           AND s.planned_start < ?
           AND s.planned_end >= ?
           AND (? = '' OR s.card_id = ?)
           AND (? = '' OR s.assignee_user_id = ? OR s.lead_user_id = ?)
         ORDER BY s.planned_start ASC, s.sort_order ASC`
      )
      .all(nextMondayIso.slice(0, 10), mondayIso.slice(0, 10), cardId, cardId, userId, userId, userId) as PlanEventRow[];

    const timeEvents = timeRows.map((r) => ({
      id: `time:${r.id}`,
      kind: "actual" as const,
      cardId: r.card_id,
      cardName: r.card_name,
      userId: r.worker_user_id,
      workerName: r.worker_name,
      title: r.task_note?.trim() || r.task_type?.trim() || "Сессия",
      startAt: r.started_at,
      endAt: r.ended_at,
      durationSeconds: r.duration_seconds,
    }));

    const planEvents = planRows.map((r) => ({
      id: `plan:${r.id}`,
      kind: "planned" as const,
      cardId: r.card_id,
      cardName: r.card_name,
      userId: r.assignee_user_id ?? r.lead_user_id ?? null,
      workerName: null,
      title: r.title,
      startAt: `${r.planned_start}T00:00:00.000Z`,
      endAt: `${r.planned_end}T23:59:59.000Z`,
      durationSeconds:
        r.estimated_hours != null && !Number.isNaN(Number(r.estimated_hours))
          ? Math.round(Number(r.estimated_hours) * 3600)
          : null,
    }));

    return NextResponse.json({
      week: parsed.week,
      mondayIso,
      nextMondayIso,
      cards,
      events: [...timeEvents, ...planEvents].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    });
  } catch (e) {
    console.error("GET /api/board/calendar", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
