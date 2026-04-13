import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const repo = getAgencyRepo();
    await repo.ensureProjectDetailTable();
    const rows = await repo.listProjectDetails(projectId || undefined);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching project details:", error);
    return NextResponse.json({ error: "Failed to fetch project details" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, title, quantity, unitPrice, order } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: "projectId and title are required" }, { status: 400 });
    }

    const repo = getAgencyRepo();
    await repo.ensureProjectDetailTable();
    const id = `pd_${Date.now()}`;

    const numericQuantity = typeof quantity === "number" ? quantity : parseFloat(quantity ?? "1");
    const numericUnitPrice = typeof unitPrice === "number" ? unitPrice : parseFloat(unitPrice ?? "0");

    const detail = await repo.createProjectDetail({
      id,
      projectId,
      title: String(title),
      quantity: Number.isNaN(numericQuantity) ? 1 : numericQuantity,
      unitPrice: Number.isNaN(numericUnitPrice) ? 0 : numericUnitPrice,
      order: typeof order === "number" ? order : null,
    });

    return NextResponse.json({ success: true, detail });
  } catch (error) {
    console.error("Error creating project detail:", error);
    return NextResponse.json({ error: "Failed to create project detail" }, { status: 500 });
  }
}
