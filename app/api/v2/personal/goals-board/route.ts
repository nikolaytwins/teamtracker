import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { loadGoalsBoard, saveGoalsBoard } from "@/lib/v2/personal/goals-board-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const page = await loadGoalsBoard(auth.ctx);
    return NextResponse.json(page);
  } catch (error) {
    console.error("goals board:", error);
    return NextResponse.json({ error: "Не удалось открыть цели" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const saved = await saveGoalsBoard(auth.ctx, body.board ?? body);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("goals board save:", error);
    return NextResponse.json({ error: "Не удалось сохранить цели" }, { status: 500 });
  }
}
