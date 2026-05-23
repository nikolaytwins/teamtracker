import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { getWeekBoard, scheduleTaskOnDate, unscheduleTaskFromDate } from "@/lib/v2/week/week-repo";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const start = request.nextUrl.searchParams.get("start") ?? undefined;
  const board = await getWeekBoard(auth.ctx, start);
  return NextResponse.json(board);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const date = typeof body.date === "string" ? body.date : "";
  const action = body.action === "remove" ? "remove" : "add";
  if (!taskId || !date) return NextResponse.json({ error: "taskId and date required" }, { status: 400 });
  if (action === "remove") await unscheduleTaskFromDate(taskId, date);
  else await scheduleTaskOnDate(taskId, date);
  return NextResponse.json({ ok: true });
}
