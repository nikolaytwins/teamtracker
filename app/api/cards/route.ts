import { NextRequest, NextResponse } from "next/server";
import { createCard, getCard, listCards } from "@/lib/db";
import { applyProjectTemplateToCard } from "@/lib/pm-project-templates";
import { filterCardsForMemberRestrictedRole } from "@/lib/member-board-access";
import { requirePmBoardAccess } from "@/lib/require-role";
import { isValidStatus, DEFAULT_STATUS, type PmStatusKey } from "@/lib/statuses";

export async function GET() {
  try {
    const auth = await requirePmBoardAccess();
    if (!auth.ok) return auth.response;
    const cards = filterCardsForMemberRestrictedRole(auth.role, listCards());
    return NextResponse.json(cards);
  } catch (e) {
    console.error("GET /api/cards", e);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePmBoardAccess();
    if (!auth.ok) return auth.response;
    const body = await request.json();
    const name = body.name;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const status: PmStatusKey = isValidStatus(body.status) ? body.status : DEFAULT_STATUS;
    let source_project_id = body.source_project_id ?? null;
    const source_detail_id = body.source_detail_id ?? null;
    const createFinancialProject = body.createFinancialProject === true;

    // Проект в финансовой отчётности (Twinworks / agency) — только по явному запросу (например с доски «Проекты»).
    if (!source_project_id && createFinancialProject) {
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
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    if (templateId) {
      applyProjectTemplateToCard(card.id, templateId);
    }
    const fresh = getCard(card.id) ?? card;
    return NextResponse.json(fresh);
  } catch (e) {
    console.error("POST /api/cards", e);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
