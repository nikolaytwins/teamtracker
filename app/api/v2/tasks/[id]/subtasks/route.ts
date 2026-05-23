import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { createTask } from "@/lib/v2/tasks/task-repo";
import { getTaskById } from "@/lib/v2/tasks/task-repo";
import { listSubtasks } from "@/lib/v2/tasks/task-detail";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const subtasks = await listSubtasks(auth.ctx, id);
  return NextResponse.json({ subtasks });
}

export async function POST(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const parent = await getTaskById(auth.ctx, id);
    if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const subtask = await createTask(auth.ctx, {
      title,
      scope: parent.scope,
      projectId: parent.project_id,
      parentId: id,
      assigneeUserId: typeof body.assigneeUserId === "string" ? body.assigneeUserId : parent.assignee_user_id,
      deadlineAt: typeof body.deadlineAt === "string" ? body.deadlineAt : parent.deadline_at,
      estimateSeconds:
        typeof body.estimateHours === "number" ? Math.round(body.estimateHours * 3600) : null,
      priority: body.priority ?? parent.priority,
    });
    return NextResponse.json({ subtask });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
