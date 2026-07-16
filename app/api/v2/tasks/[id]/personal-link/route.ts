import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { getLinkByProjectTaskId } from "@/lib/v2/tasks/task-personal-link-repo";
import { getTaskById } from "@/lib/v2/tasks/task-repo";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const task = await getTaskById(auth.ctx, id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const link = await getLinkByProjectTaskId(id);
  return NextResponse.json({
    personalTodoId: link?.personal_todo_id ?? null,
    linked: Boolean(link),
  });
}
