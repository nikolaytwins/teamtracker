import { NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";
import { ensureCardForAgencyProject, getCardBySourceProjectId } from "@/lib/db";
import { requireAgencyAccess } from "@/lib/require-role";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAgencyAccess();
  if (!auth.ok) return auth.response;

  try {
    const { id: leadId } = await params;
    const repo = getAgencyRepo();

    const lead = await repo.getLeadForConvert(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const existing = await repo.findProjectRowBySourceLead(leadId);
    if (existing) {
      const card = getCardBySourceProjectId(existing.id);
      return NextResponse.json({
        success: true,
        created: false,
        project: existing,
        cardId: card?.id ?? null,
      });
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const name = (lead.taskDescription || "").trim() || `Проект: ${lead.contact}`;
    const project = await repo.insertProjectFromLead({
      id,
      name,
      clientContact: lead.contact || null,
      leadId,
    });

    const card = ensureCardForAgencyProject({
      id: project.id,
      name: project.name,
      deadline: project.deadline ?? null,
    });

    return NextResponse.json({
      success: true,
      created: true,
      project,
      cardId: card.id,
    });
  } catch (e) {
    console.error("lead convert", e);
    return NextResponse.json({ error: "Failed to convert lead" }, { status: 500 });
  }
}
