import { NextRequest, NextResponse } from "next/server";
import { updateCard, getCard, deleteCard } from "@/lib/db";
import { isValidStatus, type PmStatusKey } from "@/lib/statuses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const card = getCard(id);
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(card);
  } catch (e) {
    console.error("GET /api/cards/[id]", e);
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: { name?: string; deadline?: string | null; status?: PmStatusKey; extra?: string | null } = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (body.deadline !== undefined) updates.deadline = body.deadline == null ? null : String(body.deadline);
    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.extra !== undefined) updates.extra = body.extra == null ? null : typeof body.extra === "string" ? body.extra : JSON.stringify(body.extra);
    const card = updateCard(id, updates);
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(card);
  } catch (e) {
    console.error("PATCH /api/cards/[id]", e);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const deleted = deleteCard(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/cards/[id]", e);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
