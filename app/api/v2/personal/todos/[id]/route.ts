import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalTodo,
  getPersonalTodo,
  updatePersonalTodo,
} from "@/lib/v2/personal/personal-todo-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const detail = await getPersonalTodo(auth.ctx, id);
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    const todo = await updatePersonalTodo(auth.ctx, id, body);
    if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ todo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update";
    const status = msg === "title required" || msg === "project not found" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deletePersonalTodo(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
