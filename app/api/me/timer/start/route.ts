import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import {
  getOrCreatePhaseByTitle,
  QUICK_WORK_PHASE_TITLE,
  startTimer,
} from "@/lib/pm-phases";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
    let taskType = body.taskType != null ? String(body.taskType).trim() : "";
    const taskNoteRaw = body.taskNote != null ? String(body.taskNote).trim() : "";
    if (taskType === "custom") {
      taskType = taskNoteRaw ? `custom:${taskNoteRaw}` : "custom";
    }
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    if (!getCard(cardId)) return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    const phase = getOrCreatePhaseByTitle(cardId, QUICK_WORK_PHASE_TITLE);
    if (!phase) return NextResponse.json({ error: "Не удалось создать этап" }, { status: 500 });
    const result = startTimer(cardId, phase.id, {
      workerName: session.name,
      workerUserId: session.sub,
      taskType: taskType || null,
      taskNote: taskNoteRaw && taskType !== "custom" ? taskNoteRaw : null,
    });
    if (!result) return NextResponse.json({ error: "Не удалось запустить таймер" }, { status: 400 });
    return NextResponse.json({ ok: true, entry: result.entry });
  } catch (e) {
    console.error("POST /api/me/timer/start", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
