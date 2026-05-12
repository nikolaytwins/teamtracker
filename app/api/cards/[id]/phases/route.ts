import { NextRequest, NextResponse } from "next/server";
import { extendCardPhasesPayload } from "@/lib/extend-card-phases-payload";
import { buildCardPhasesPayload, createPhase } from "@/lib/pm-phases";
import { requirePmBoardAccess } from "@/lib/require-role";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePmBoardAccess();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const base = buildCardPhasesPayload(id);
    if (!base.card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const payload = await extendCardPhasesPayload(id, base);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("GET /api/cards/[id]/phases", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requirePmBoardAccess();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    const phase = createPhase(id, title);
    if (!phase) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    const base = buildCardPhasesPayload(id);
    const payload = await extendCardPhasesPayload(id, base);
    return NextResponse.json({ success: true, phase, payload });
  } catch (e) {
    console.error("POST /api/cards/[id]/phases", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
