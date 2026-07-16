import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { getTaskById, updateTask, completeTask, deleteTask } from "@/lib/v2/tasks/task-repo";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const task = await getTaskById(auth.ctx, id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const task = await updateTask(auth.ctx, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: body.description !== undefined ? body.description : undefined,
      projectId: body.projectId !== undefined ? body.projectId : undefined,
      phaseId: body.phaseId !== undefined ? body.phaseId : undefined,
      assigneeUserId: body.assigneeUserId !== undefined ? body.assigneeUserId : undefined,
      deadlineAt: body.deadlineAt !== undefined ? body.deadlineAt : undefined,
      plannedAt: body.plannedAt !== undefined ? body.plannedAt : undefined,
      estimateSeconds:
        typeof body.estimateHours === "number"
          ? Math.round(body.estimateHours * 3600)
          : body.estimateSeconds !== undefined
            ? body.estimateSeconds
            : undefined,
      priority: body.priority === null ? null : body.priority,
      status: body.status,
      scope: body.scope,
      inboxBucket: body.inboxBucket !== undefined ? body.inboxBucket : undefined,
      homeBucket: body.homeBucket !== undefined ? body.homeBucket : undefined,
    });
    return NextResponse.json({ task });
  } catch (e) {
    console.error("PATCH /api/v2/tasks/[id]", e);
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Forbidden" ? 403 : msg === "Task not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    if (body.action === "complete") {
      const task = await completeTask(auth.ctx, id, body.completed !== false);
      return NextResponse.json({ task });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/v2/tasks/[id]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    await deleteTask(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/v2/tasks/[id]", e);
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Forbidden" ? 403 : msg === "Task not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
