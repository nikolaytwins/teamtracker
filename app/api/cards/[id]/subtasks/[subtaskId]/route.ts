import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { isMemberRestrictedRole } from "@/lib/roles";
import { effectiveUserRole } from "@/lib/require-role";
import { deleteSubtask, getSubtask, updateSubtask } from "@/lib/pm-subtasks";
import { notifySubtaskAssigneesChanged } from "@/lib/subtask-notifications";

type Params = { params: Promise<{ id: string; subtaskId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id, subtaskId } = await params;
    const cardId = typeof id === "string" ? id.trim() : "";
    const sid = typeof subtaskId === "string" ? subtaskId.trim() : "";
    if (!cardId || !sid) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const updates: Parameters<typeof updateSubtask>[2] = {};
    if (typeof body.title === "string") updates.title = body.title;
    if ("assigneeUserId" in body) updates.assigneeUserId = body.assigneeUserId as string | null;
    if ("leadUserId" in body) updates.leadUserId = body.leadUserId as string | null;
    if ("estimatedHours" in body) updates.estimatedHours = body.estimatedHours as number | null;
    if ("completed" in body) {
      updates.completedAt = body.completed ? new Date().toISOString() : null;
    }
    if ("completedAt" in body) updates.completedAt = body.completedAt as string | null;
    if (typeof body.plannedStart === "string" || body.plannedStart === null)
      updates.plannedStart = body.plannedStart;
    if (typeof body.plannedEnd === "string" || body.plannedEnd === null) updates.plannedEnd = body.plannedEnd;
    if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
    const prev = getSubtask(cardId, sid);
    const sub = updateSubtask(cardId, sid, updates);
    if (!sub) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    if (prev) notifySubtaskAssigneesChanged({ actorUserId: session.sub, cardId, prev, next: sub });
    return NextResponse.json({ subtask: sub });
  } catch (e) {
    console.error("PATCH subtask", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id, subtaskId } = await params;
    const cardId = typeof id === "string" ? id.trim() : "";
    const sid = typeof subtaskId === "string" ? subtaskId.trim() : "";
    if (!cardId || !sid) return NextResponse.json({ error: "id required" }, { status: 400 });
    const ok = deleteSubtask(cardId, sid);
    if (!ok) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE subtask", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
