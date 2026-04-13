import { NextRequest, NextResponse } from "next/server";
import { assertMemberCardAccess } from "@/lib/member-board-access";
import { buildCardPhasesPayload, deletePhase, updatePhase } from "@/lib/pm-phases";
import { requireSessionRole } from "@/lib/require-role";

type Params = { params: Promise<{ id: string; phaseId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id, phaseId } = await params;
    const denied = assertMemberCardAccess(auth.role, id);
    if (denied) return denied;
    const body = await request.json();
    const updates: { title?: string; sort_order?: number } = {};
    if (typeof body.title === "string") updates.title = body.title;
    if (body.sort_order != null) updates.sort_order = Number(body.sort_order);
    const phase = updatePhase(id, phaseId, updates);
    if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, phase, payload: buildCardPhasesPayload(id) });
  } catch (e) {
    console.error("PATCH phase", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id, phaseId } = await params;
    const denied = assertMemberCardAccess(auth.role, id);
    if (denied) return denied;
    const ok = deletePhase(id, phaseId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, payload: buildCardPhasesPayload(id) });
  } catch (e) {
    console.error("DELETE phase", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
