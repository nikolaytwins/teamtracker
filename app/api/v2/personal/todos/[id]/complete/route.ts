import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { completePersonalTodo } from "@/lib/v2/personal/personal-todo-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const completed = body.completed !== false;
    const todo = await completePersonalTodo(auth.ctx, id, completed);
    if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ todo });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
