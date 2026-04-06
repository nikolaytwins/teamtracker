import { NextRequest, NextResponse } from "next/server";
import { createCard, listCards } from "@/lib/db";
import { isValidStatus, DEFAULT_STATUS, type PmStatusKey } from "@/lib/statuses";

export async function GET() {
  try {
    const cards = listCards();
    return NextResponse.json(cards);
  } catch (e) {
    console.error("GET /api/cards", e);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const status: PmStatusKey = isValidStatus(body.status) ? body.status : DEFAULT_STATUS;
    let source_project_id = body.source_project_id ?? null;
    const source_detail_id = body.source_detail_id ?? null;

    // Если карточку создают из канбана (без проекта) — сначала создать проект в Twinworks (без сумм)
    if (!source_project_id) {
      const twinworksUrl = process.env.TWINWORKS_AGENCY_URL || "http://127.0.0.1:3001";
      try {
        const r = await fetch(`${twinworksUrl}/api/agency/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            totalAmount: 0,
            paidAmount: 0,
            deadline: body.deadline ?? null,
            status: "not_paid",
            serviceType: "small_task",
            clientType: null,
            paymentMethod: null,
            clientContact: null,
            notes: null,
            fromPmBoard: true,
          }),
        });
        if (r.ok) {
          const data = await r.json();
          if (data.project?.id) source_project_id = data.project.id;
        }
      } catch (e) {
        console.error("Twinworks create project from PM board:", e);
      }
    }

    const card = createCard({
      source_project_id,
      source_detail_id,
      name: name.trim(),
      deadline: body.deadline ?? null,
      status,
    });
    return NextResponse.json(card);
  } catch (e) {
    console.error("POST /api/cards", e);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
