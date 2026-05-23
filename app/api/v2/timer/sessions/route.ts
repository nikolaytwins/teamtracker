import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { createManualSession, listSessions } from "@/lib/v2/timer/timer-service";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const taskId = request.nextUrl.searchParams.get("taskId") ?? undefined;
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");

  const sessions = await listSessions(auth.ctx, { taskId, userId, limit });
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const taskId = typeof body.taskId === "string" ? body.taskId : "";
    const startedAt = typeof body.startedAt === "string" ? body.startedAt : "";
    const endedAt = typeof body.endedAt === "string" ? body.endedAt : "";
    if (!taskId || !startedAt || !endedAt) {
      return NextResponse.json({ error: "taskId, startedAt, endedAt required" }, { status: 400 });
    }
    const session = await createManualSession(auth.ctx, {
      taskId,
      startedAt,
      endedAt,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    return NextResponse.json({ session });
  } catch (e) {
    console.error("POST /api/v2/timer/sessions", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
