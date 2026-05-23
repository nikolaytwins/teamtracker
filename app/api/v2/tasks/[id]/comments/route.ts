import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { addComment } from "@/lib/v2/tasks/task-detail";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });
    const parentCommentId =
      typeof body.parentCommentId === "string" ? body.parentCommentId : null;
    const comment = await addComment(auth.ctx, id, text, parentCommentId);
    return NextResponse.json({ comment });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
