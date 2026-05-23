import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents } from "@/lib/v2/calendar/calendar-repo";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const from = request.nextUrl.searchParams.get("from") ?? new Date().toISOString();
  const to =
    request.nextUrl.searchParams.get("to") ??
    new Date(Date.now() + 7 * 86400000).toISOString();
  const events = await listCalendarEvents(auth.ctx, from, to);
  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const event = await createCalendarEvent(auth.ctx, {
      title: body.title,
      scope: body.scope === "personal" ? "personal" : "work",
      startAt: body.startAt,
      endAt: body.endAt,
      description: body.description,
      taskId: body.taskId,
    });
    return NextResponse.json({ event });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteCalendarEvent(auth.ctx, id);
  return NextResponse.json({ ok: true });
}
