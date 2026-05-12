import { NextRequest, NextResponse } from "next/server";
import { createManualCompletedTimeEntry } from "@/lib/pm-phases";
import { validateCardForHomeTimer } from "@/lib/home-timer-projects";
import { requireSessionRole } from "@/lib/require-role";

function encodeTaskType(rawTaskType: string, taskNoteRaw: string): { taskType: string | null; taskNote: string | null } {
  const taskNoteTrim = taskNoteRaw.trim();
  let taskType = rawTaskType.trim();
  if (taskType === "custom") {
    const encoded = taskNoteTrim ? `custom:${taskNoteTrim}` : "custom";
    return { taskType: encoded, taskNote: null };
  }
  return {
    taskType: taskType || null,
    taskNote: taskNoteTrim || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const body = await request.json();
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
    const startedAt = typeof body.startedAt === "string" ? body.startedAt.trim() : "";
    const endedAt = typeof body.endedAt === "string" ? body.endedAt.trim() : "";
    const rawTask = typeof body.taskType === "string" ? body.taskType : "";
    const rawNote = typeof body.taskNote === "string" ? body.taskNote : "";
    if (!cardId || !startedAt || !endedAt) {
      return NextResponse.json({ error: "Нужны проект, время начала и окончания" }, { status: 400 });
    }
    const denied = validateCardForHomeTimer(auth.role, auth.session.sub, cardId);
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    const { taskType, taskNote } = encodeTaskType(rawTask, rawNote);
    const result = createManualCompletedTimeEntry(auth.session, {
      cardId,
      taskType,
      taskNote,
      startedAt,
      endedAt,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, entry: result.entry });
  } catch (e) {
    console.error("POST /api/me/timer/sessions/manual", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
