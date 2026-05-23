import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { getTaskById } from "@/lib/v2/tasks/task-repo";
import { listComments, listLinks, listSubtasks, listFiles } from "@/lib/v2/tasks/task-detail";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const task = await getTaskById(auth.ctx, id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [comments, links, subtasks, files] = await Promise.all([
    listComments(id),
    listLinks(id),
    listSubtasks(auth.ctx, id),
    listFiles(id),
  ]);

  return NextResponse.json({ task, comments, links, subtasks, files });
}
