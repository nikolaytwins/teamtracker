import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepoV1, getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { loadPublicClientEstimate } from "@/lib/agency/load-public-client-estimate";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const repo = isSupabaseAgencyConfigured() ? getAgencyRepoV2() : getAgencyRepoV1();
    const data = await loadPublicClientEstimate(repo, token);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET public agency estimate", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
