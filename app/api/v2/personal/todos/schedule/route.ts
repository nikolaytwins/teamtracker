import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { schedulePersonalTodo } from "@/lib/v2/personal/personal-todo-repo";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : body.todoId;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const scheduled_date = body.scheduled_date ?? body.date ?? null;
    const todo = await schedulePersonalTodo(auth.ctx, id, scheduled_date);
    if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ todo });
  } catch (e) {
    return NextResponse.json({ error: "Failed to schedule" }, { status: 500 });
  }
}
