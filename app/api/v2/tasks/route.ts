import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { listTasks, createTask, createTasksBulk } from "@/lib/v2/tasks/task-repo";
import { groupTasksByBucket, BUCKET_ORDER } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskScope } from "@/lib/v2/types";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const scope = request.nextUrl.searchParams.get("scope") as V2TaskScope | null;
  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
  const grouped = request.nextUrl.searchParams.get("grouped") === "1";

  const tasks = await listTasks(auth.ctx, {
    scope: scope ?? undefined,
    projectId,
    includeCompleted: true,
    activeProjectsOnly: grouped,
  });

  if (!grouped) return NextResponse.json({ tasks });

  const groups = groupTasksByBucket(tasks);
  return NextResponse.json({
    tasks,
    groups,
    bucketOrder: BUCKET_ORDER,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    if (Array.isArray(body.titles)) {
      const titles = body.titles.filter((t: unknown) => typeof t === "string") as string[];
      const tasks = await createTasksBulk(auth.ctx, titles, {
        scope: body.scope === "personal" ? "personal" : "team",
        projectId: typeof body.projectId === "string" ? body.projectId : null,
        assigneeUserId: typeof body.assigneeUserId === "string" ? body.assigneeUserId : auth.ctx.userId,
        deadlineAt: typeof body.deadlineAt === "string" ? body.deadlineAt : null,
        estimateSeconds: typeof body.estimateHours === "number" ? Math.round(body.estimateHours * 3600) : null,
        priority: body.priority,
      });
      return NextResponse.json({ tasks });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const task = await createTask(auth.ctx, {
      title,
      scope: body.scope === "personal" ? "personal" : "team",
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      assigneeUserId: typeof body.assigneeUserId === "string" ? body.assigneeUserId : auth.ctx.userId,
      deadlineAt: typeof body.deadlineAt === "string" ? body.deadlineAt : null,
      estimateSeconds:
        typeof body.estimateHours === "number"
          ? Math.round(body.estimateHours * 3600)
          : typeof body.estimateSeconds === "number"
            ? body.estimateSeconds
            : null,
      priority: body.priority,
      description: typeof body.description === "string" ? body.description : null,
      inboxBucket: body.inboxBucket ?? null,
    });

    return NextResponse.json({ task });
  } catch (e) {
    console.error("POST /api/v2/tasks", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
