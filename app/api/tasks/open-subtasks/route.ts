import { NextResponse } from "next/server";
import { listBoardOpenSubtasks, listOpenSubtasksForUser } from "@/lib/pm-subtasks";
import { canAccessPmBoard } from "@/lib/roles";
import { requireSessionRole } from "@/lib/require-role";

/** Открытые подзадачи: для ПМ/админа — все; для остальных — только где пользователь исполнитель или лид. */
export async function GET() {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const subtasks = canAccessPmBoard(auth.role)
      ? listBoardOpenSubtasks()
      : listOpenSubtasksForUser(auth.session.sub);
    return NextResponse.json({ subtasks });
  } catch (e) {
    console.error("GET /api/tasks/open-subtasks", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
