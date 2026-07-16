import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { cloneProjectTaskToPersonal } from "@/lib/v2/tasks/task-personal-link-repo";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const result = await cloneProjectTaskToPersonal(auth.ctx, id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/v2/tasks/[id]/clone-to-personal", e);
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Task not found" ? 404 : msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
