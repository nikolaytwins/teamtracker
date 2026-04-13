import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json({ error: "Year and month are required" }, { status: 400 });
    }

    const result = await getAgencyRepo().getAgencyProfitForMonth(Number(year), Number(month));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating agency profit:", error);
    return NextResponse.json({ error: "Failed to calculate agency profit" }, { status: 500 });
  }
}
