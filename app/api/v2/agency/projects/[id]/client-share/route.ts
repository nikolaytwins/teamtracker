import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const { id } = await context.params;
    const token = await getAgencyRepoV2().ensureClientShareToken(id);
    if (!token) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ token, path: `/c/${token}` });
  } catch (error) {
    console.error("GET client-share", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
