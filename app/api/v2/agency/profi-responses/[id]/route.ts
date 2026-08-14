import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const { id } = await context.params;
    const row = await getAgencyRepoV2().getOutreachById(id, "profi");
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Error fetching v2 profi response:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const { id } = await context.params;
    const body = await request.json();
    const { status, refundAmount, projectAmount, notes } = body;

    const row = await getAgencyRepoV2().patchOutreachResponse(id, "profi", {
      status,
      refundAmount,
      projectAmount,
      notes,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: row });
  } catch (error) {
    console.error("Error updating v2 profi response:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const { id } = await context.params;
    const ok = await getAgencyRepoV2().deleteOutreachResponse(id, "profi");
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting v2 profi response:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
