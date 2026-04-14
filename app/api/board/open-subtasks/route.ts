import { NextResponse } from "next/server";
import { listBoardOpenSubtasks } from "@/lib/pm-subtasks";
import { requireSessionRole } from "@/lib/require-role";

export async function GET() {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const subtasks = listBoardOpenSubtasks();
    return NextResponse.json({ subtasks });
  } catch (e) {
    console.error("GET /api/board/open-subtasks", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
