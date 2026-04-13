import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";
import { getCardBySourceProjectId } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const repo = getAgencyRepo();
    if (!(await repo.agencyLeadsTableExists())) {
      return NextResponse.json([]);
    }

    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "1";
    const leads = await repo.listLeadsOrdered({ includeArchived });
    const projectRows = await repo.listProjectsWithSourceLead();
    const projectByLeadId = new Map(projectRows.map((r) => [r.source_lead_id, r]));
    const enriched = (Array.isArray(leads) ? leads : []).map((lead) => {
      const project = projectByLeadId.get(String(lead.id));
      const card = project ? getCardBySourceProjectId(project.id) : null;
      return {
        ...lead,
        linkedProjectId: project?.id ?? null,
        linkedProjectName: project?.name ?? null,
        linkedCardId: card?.id ?? null,
      };
    });
    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contact, source } = body;

    if (!contact || !source) {
      return NextResponse.json({ error: "Contact and source are required" }, { status: 400 });
    }

    const lead = await getAgencyRepo().createLeadFromPost(body);
    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
