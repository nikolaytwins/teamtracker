import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { assertMemberCardAccess } from "@/lib/member-board-access";
import { buildCardPhasesPayload, startTimer, stopTimer } from "@/lib/pm-phases";
import { requireSessionRole } from "@/lib/require-role";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const denied = assertMemberCardAccess(auth.role, id);
    if (denied) return denied;
    const body = await request.json();
    const action = body?.action as string;
    if (action === "stop") {
      const entry = stopTimer(id);
      return NextResponse.json({
        success: true,
        entry,
        payload: buildCardPhasesPayload(id),
      });
    }
    if (action === "start") {
      const session = await getServerSession();
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const phaseId = typeof body.phaseId === "string" ? body.phaseId : "";
      const workerName = typeof body.workerName === "string" ? body.workerName : "";
      const taskType =
        body.taskType != null && String(body.taskType).trim() ? String(body.taskType).trim() : null;
      const taskNote =
        body.taskNote != null && String(body.taskNote).trim() ? String(body.taskNote).trim() : null;
      if (!phaseId) return NextResponse.json({ error: "phaseId required" }, { status: 400 });
      if (!workerName.trim()) {
        return NextResponse.json({ error: "workerName required (сотрудник)" }, { status: 400 });
      }
      const wn = workerName.trim();
      const sn = session.name.trim();
      const workerUserId =
        wn.toLowerCase() === sn.toLowerCase() ? session.sub : (typeof body.workerUserId === "string" ? body.workerUserId.trim() : "");
      const result = startTimer(id, phaseId, { workerName, workerUserId, taskType, taskNote });
      if (!result) return NextResponse.json({ error: "Invalid card or phase" }, { status: 400 });
      return NextResponse.json({
        success: true,
        ...result,
        payload: buildCardPhasesPayload(id),
      });
    }
    return NextResponse.json({ error: "action must be start or stop" }, { status: 400 });
  } catch (e) {
    console.error("POST timer", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
