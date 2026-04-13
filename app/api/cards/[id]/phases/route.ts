import { NextRequest, NextResponse } from "next/server";
import { assertMemberCardAccess } from "@/lib/member-board-access";
import { buildCardPhasesPayload, createPhase } from "@/lib/pm-phases";
import { requireSessionRole } from "@/lib/require-role";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const denied = assertMemberCardAccess(auth.role, id);
    if (denied) return denied;
    const payload = buildCardPhasesPayload(id);
    if (!payload.card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payload);
  } catch (e) {
    console.error("GET /api/cards/[id]/phases", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const denied = assertMemberCardAccess(auth.role, id);
    if (denied) return denied;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    const phase = createPhase(id, title);
    if (!phase) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    return NextResponse.json({ success: true, phase, payload: buildCardPhasesPayload(id) });
  } catch (e) {
    console.error("POST /api/cards/[id]/phases", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
