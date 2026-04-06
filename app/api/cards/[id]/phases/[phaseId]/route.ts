import { NextRequest, NextResponse } from "next/server";
import { buildCardPhasesPayload, deletePhase, updatePhase } from "@/lib/pm-phases";

type Params = { params: Promise<{ id: string; phaseId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, phaseId } = await params;
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
    const { id, phaseId } = await params;
    const ok = deletePhase(id, phaseId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, payload: buildCardPhasesPayload(id) });
  } catch (e) {
    console.error("DELETE phase", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
