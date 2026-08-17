import { NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const { id } = await context.params;
    const repo = getAgencyRepoV2();
    const rows = await repo.listProjectTrackedTime(id);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching tracked time:", error);
    return NextResponse.json({ error: "Failed to fetch tracked time" }, { status: 500 });
  }
}
