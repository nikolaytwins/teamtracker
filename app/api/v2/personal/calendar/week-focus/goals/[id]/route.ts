import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { deleteWeekFocusGoal, updateWeekFocusGoal } from "@/lib/v2/personal/week-focus-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const goal = await updateWeekFocusGoal(auth.ctx, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      completed: typeof body.completed === "boolean" ? body.completed : undefined,
    });
    if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ goal });
  } catch (error) {
    console.error("week focus goal patch:", error);
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: msg }, { status: msg === "title required" ? 400 : 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    await deleteWeekFocusGoal(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("week focus goal delete:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
