import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { isMemberRestrictedRole } from "@/lib/roles";
import { effectiveUserRole } from "@/lib/require-role";
import { listOpenSubtasksForUser } from "@/lib/pm-subtasks";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ subtasks: [] });
    }
    const subtasks = listOpenSubtasksForUser(session.sub);
    return NextResponse.json({ subtasks });
  } catch (e) {
    console.error("GET /api/me/subtasks", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
