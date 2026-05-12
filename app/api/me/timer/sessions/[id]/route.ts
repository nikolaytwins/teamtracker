import { NextRequest, NextResponse } from "next/server";
import { deleteTimeEntryForSessionUser, updateTimeEntryForSessionUser } from "@/lib/pm-phases";
import { validateCardForHomeTimer } from "@/lib/home-timer-projects";
import { requireSessionRole } from "@/lib/require-role";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await request.json();
    const updates: Parameters<typeof updateTimeEntryForSessionUser>[2] = {};
    if (typeof body.cardId === "string" && body.cardId.trim()) {
      const cid = body.cardId.trim();
      const denied = validateCardForHomeTimer(auth.role, auth.session.sub, cid);
      if (denied) return NextResponse.json({ error: denied }, { status: 403 });
      updates.cardId = cid;
    }
    if (typeof body.startedAt === "string" && body.startedAt.trim()) {
      updates.startedAt = body.startedAt.trim();
    }
    if (typeof body.endedAt === "string" && body.endedAt.trim()) {
      updates.endedAt = body.endedAt.trim();
    }
    if (typeof body.taskType === "string") {
      const rawN = typeof body.taskNote === "string" ? body.taskNote : "";
      const enc = encodeTaskType(body.taskType, rawN);
      updates.taskType = enc.taskType;
      updates.taskNote = enc.taskNote;
    }
    const result = updateTimeEntryForSessionUser(auth.session, id, updates);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, entry: result.entry });
  } catch (e) {
    console.error("PATCH /api/me/timer/sessions/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const ok = deleteTimeEntryForSessionUser(auth.session, id);
    if (!ok) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/me/timer/sessions/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
