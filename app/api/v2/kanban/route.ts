import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { listKanbanTasks } from "@/lib/v2/tasks/task-repo";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const assigneeUserId = request.nextUrl.searchParams.get("assignee") ?? undefined;
  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
  const columns = await listKanbanTasks(auth.ctx, { assigneeUserId, projectId });
  return NextResponse.json({ columns });
}
