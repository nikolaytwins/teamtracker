import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const data = await getAgencyRepo().getLeadsAnalytics(startDate, endDate);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
