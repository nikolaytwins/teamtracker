import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";
import { getCardBySourceProjectId } from "@/lib/db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const repo = getAgencyRepo();
    const lead = await repo.getLeadById(id);
    const project = await repo.findProjectBySourceLeadId(id);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const card = project ? getCardBySourceProjectId(project.id) : null;
    return NextResponse.json({
      ...lead,
      linkedProjectId: project?.id ?? null,
      linkedProjectName: project?.name ?? null,
      linkedCardId: card?.id ?? null,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updatedLead = await getAgencyRepo().updateLeadPut(id, body);
    if (!updatedLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const changes = await getAgencyRepo().deleteLeadById(id);
    if (changes === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
