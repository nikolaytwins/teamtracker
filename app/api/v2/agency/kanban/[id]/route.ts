import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  deleteAgencyKanbanCard,
  moveAgencyKanbanCard,
  updateAgencyKanbanCard,
} from "@/lib/v2/agency/work-kanban-repo";
import { isAgencyWorkStatus } from "@/lib/v2/agency/work-kanban-types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cardId = decodeURIComponent(id);

  try {
    const body = await request.json();

    if (isAgencyWorkStatus(body.workStatus) && body.move === true) {
      const card = await moveAgencyKanbanCard(
        auth.ctx,
        cardId,
        body.workStatus,
        typeof body.sortOrder === "number" ? body.sortOrder : undefined
      );
      if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ card });
    }

    const card = await updateAgencyKanbanCard(auth.ctx, cardId, {
      title: typeof body.title === "string" ? body.title : undefined,
      note: body.note === null ? null : typeof body.note === "string" ? body.note : undefined,
      work_status: isAgencyWorkStatus(body.workStatus) ? body.workStatus : undefined,
    });
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ card });
  } catch (e) {
    console.error("agency kanban patch:", e);
    const msg = e instanceof Error ? e.message : "Failed to update";
    return NextResponse.json({ error: msg }, { status: msg === "title required" ? 400 : 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cardId = decodeURIComponent(id);

  try {
    const ok = await deleteAgencyKanbanCard(auth.ctx, cardId);
    if (!ok) {
      return NextResponse.json(
        { error: "Финансовые проекты удаляйте в разделе «Проекты и финансы»" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("agency kanban delete:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
