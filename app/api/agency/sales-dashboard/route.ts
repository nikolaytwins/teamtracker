import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const payload = await getAgencyRepo().getSalesDashboard(startDate, endDate);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("sales-dashboard:", error);
    return NextResponse.json({ error: "Failed to build dashboard" }, { status: 500 });
  }
}
