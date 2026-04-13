import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const row = await getAgencyRepo().getOutreachById(id, "profi");
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Error fetching profi response:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, refundAmount, projectAmount, notes } = body;

    const row = await getAgencyRepo().patchOutreachResponse(id, "profi", {
      status,
      refundAmount,
      projectAmount,
      notes,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: row });
  } catch (error) {
    console.error("Error updating profi response:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ok = await getAgencyRepo().deleteOutreachResponse(id, "profi");
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting profi response:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
