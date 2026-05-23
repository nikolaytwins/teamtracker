import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { canViewUnassignedQueue } from "@/lib/v2/auth/permissions";
import { listUnassignedTasks } from "@/lib/v2/tasks/task-repo";

export async function GET() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  if (!canViewUnassignedQueue(auth.ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tasks = await listUnassignedTasks(auth.ctx);
    return NextResponse.json({ tasks });
  } catch (e) {
    console.error("GET /api/v2/tasks/unassigned", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
