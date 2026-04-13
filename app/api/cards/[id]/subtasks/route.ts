import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { isMemberRestrictedRole } from "@/lib/roles";
import { effectiveUserRole } from "@/lib/require-role";
import { createSubtask, listSubtasksForCard } from "@/lib/pm-subtasks";
import { notifySubtaskCreated } from "@/lib/subtask-notifications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const cardId = typeof id === "string" ? id.trim() : "";
    if (!cardId) return NextResponse.json({ error: "id required" }, { status: 400 });
    const subtasks = listSubtasksForCard(cardId);
    return NextResponse.json({ subtasks });
  } catch (e) {
    console.error("GET subtasks", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const cardId = typeof id === "string" ? id.trim() : "";
    if (!cardId) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const sub = createSubtask({
      cardId,
      title,
      assigneeUserId: typeof body.assigneeUserId === "string" ? body.assigneeUserId : null,
      leadUserId: typeof body.leadUserId === "string" ? body.leadUserId : null,
      estimatedHours: typeof body.estimatedHours === "number" ? body.estimatedHours : null,
      plannedStart: typeof body.plannedStart === "string" ? body.plannedStart : null,
      plannedEnd: typeof body.plannedEnd === "string" ? body.plannedEnd : null,
    });
    if (!sub) return NextResponse.json({ error: "Не удалось создать" }, { status: 400 });
    notifySubtaskCreated({ actorUserId: session.sub, cardId, subtask: sub });
    return NextResponse.json({ subtask: sub });
  } catch (e) {
    console.error("POST subtasks", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
