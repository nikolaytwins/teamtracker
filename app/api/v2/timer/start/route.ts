import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { startTimer } from "@/lib/v2/timer/timer-service";

export async function POST(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
    const active = await startTimer(auth.ctx, taskId);
    return NextResponse.json({ active });
  } catch (e) {
    console.error("POST /api/v2/timer/start", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
