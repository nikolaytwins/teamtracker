import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";
import { ensureCardForAgencyProject } from "@/lib/db";

export async function GET() {
  try {
    const projects = await getAgencyRepo().listProjectsWithTotalExpenses();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      totalAmount,
      paidAmount,
      deadline,
      status,
      serviceType,
      clientType,
      paymentMethod,
      clientContact,
      notes,
    } = body;

    const repo = getAgencyRepo();
    const created = await repo.createProject({
      name,
      totalAmount,
      paidAmount,
      deadline,
      status,
      serviceType,
      clientType,
      paymentMethod,
      clientContact,
      notes,
    });
    const project = (await repo.getProjectById(created.id)) ?? created;

    try {
      ensureCardForAgencyProject({
        id: created.id,
        name: String(project.name ?? created.name),
        deadline: (project.deadline as string | null) ?? created.deadline ?? null,
      });
    } catch (syncErr) {
      console.error("ensureCardForAgencyProject after create:", syncErr);
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
