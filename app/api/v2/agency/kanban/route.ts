import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  createAgencyKanbanCard,
  listAgencyKanbanCards,
} from "@/lib/v2/agency/work-kanban-repo";
import { isAgencyWorkStatus } from "@/lib/v2/agency/work-kanban-types";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  try {
    const cards = await listAgencyKanbanCards(auth.ctx);
    return NextResponse.json({ cards });
  } catch (e) {
    console.error("agency kanban list:", e);
    return NextResponse.json({ error: "Failed to load kanban" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const card = await createAgencyKanbanCard(auth.ctx, {
      title,
      work_status: isAgencyWorkStatus(body.workStatus) ? body.workStatus : undefined,
      note: typeof body.note === "string" ? body.note : null,
      include_in_finance: body.includeInFinance !== false,
      total_amount: typeof body.totalAmount === "number" ? body.totalAmount : 0,
      business_line:
        body.businessLine === "impulse" || body.businessLine === "qmagic" ? body.businessLine : "agency",
    });
    return NextResponse.json({ card });
  } catch (e) {
    console.error("agency kanban create:", e);
    const msg = e instanceof Error ? e.message : "Failed to create";
    return NextResponse.json({ error: msg }, { status: msg === "title required" ? 400 : 500 });
  }
}
