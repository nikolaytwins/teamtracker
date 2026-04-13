import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const project = await getAgencyRepo().getProjectById(params.id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const name = body.name != null ? String(body.name) : "";
    const totalAmount = Number(body.totalAmount) || 0;
    const paidAmount = Number(body.paidAmount) || 0;
    const deadline = body.deadline ?? null;
    const status = body.status != null ? String(body.status) : "not_paid";
    const serviceType = body.serviceType != null ? String(body.serviceType) : "site";
    const clientType = body.clientType != null && body.clientType !== "" ? String(body.clientType) : null;
    const paymentMethod =
      body.paymentMethod != null && body.paymentMethod !== "" ? String(body.paymentMethod) : null;
    const clientContact = body.clientContact != null ? String(body.clientContact) : null;
    const notes = body.notes != null ? String(body.notes) : null;

    const project = await getAgencyRepo().updateProjectById(params.id, {
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

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error: unknown) {
    console.error("Error updating project:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to update project",
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    await getAgencyRepo().deleteProjectById(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
