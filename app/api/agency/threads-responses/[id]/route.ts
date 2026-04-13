import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const row = await getAgencyRepo().getOutreachById(id, "threads");
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Error fetching threads response:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, refundAmount, projectAmount, notes } = body;

    const row = await getAgencyRepo().patchOutreachResponse(id, "threads", {
      status,
      refundAmount,
      projectAmount,
      notes,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: row });
  } catch (error) {
    console.error("Error updating threads response:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ok = await getAgencyRepo().deleteOutreachResponse(id, "threads");
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting threads response:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
