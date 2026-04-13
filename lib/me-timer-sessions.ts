import { getCard } from "@/lib/db";
import { formatISOWeekParam, parseISOWeekParam } from "@/lib/iso-week";
import { listCompletedEntriesForSessionUserInRange } from "@/lib/pm-phases";
import { labelForTaskType } from "@/lib/time-task-types";

export type SessionDayGroup = {
  date: string;
  sessions: Array<{
    id: string;
    cardId: string;
    cardName: string;
    taskType: string | null;
    taskLabel: string;
    taskNote: string | null;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
  }>;
};

export function buildTimerSessionsWeekPayload(
  session: { sub: string; name: string },
  weekParam: string | null
): { week: string; weekStart: string; weekEnd: string; days: SessionDayGroup[] } | null {
  const parsed = weekParam?.trim()
    ? parseISOWeekParam(weekParam)
    : parseISOWeekParam(formatISOWeekParam(new Date()));
  if (!parsed) return null;
  const startIso = parsed.monday.toISOString();
  const endIso = parsed.nextMonday.toISOString();
  const entries = listCompletedEntriesForSessionUserInRange(session, startIso, endIso);
  const byDay = new Map<string, SessionDayGroup["sessions"]>();
  for (const e of entries) {
    const d = new Date(e.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const card = getCard(e.card_id);
    const taskType = e.task_type;
    const list = byDay.get(key) ?? [];
    list.push({
      id: e.id,
      cardId: e.card_id,
      cardName: card?.name ?? e.card_id,
      taskType,
      taskLabel: labelForTaskType(taskType),
      taskNote: e.task_note,
      startedAt: e.started_at,
      endedAt: e.ended_at!,
      durationSeconds: e.duration_seconds ?? 0,
    });
    byDay.set(key, list);
  }
  const days: SessionDayGroup[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(parsed.monday);
    x.setDate(parsed.monday.getDate() + i);
    const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    days.push({ date: key, sessions: byDay.get(key) ?? [] });
  }
  const ws = parsed.monday;
  const weekStart = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
  const sun = new Date(parsed.nextMonday);
  sun.setDate(parsed.nextMonday.getDate() - 1);
  const weekEnd = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, "0")}-${String(sun.getDate()).padStart(2, "0")}`;
  return { week: parsed.week, weekStart, weekEnd, days };
}
