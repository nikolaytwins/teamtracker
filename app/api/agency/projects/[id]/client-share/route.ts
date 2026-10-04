import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const token = await getAgencyRepo().ensureClientShareToken(id);
    if (!token) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ token, path: `/c/${token}` });
  } catch (error) {
    console.error("GET v1 client-share", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
