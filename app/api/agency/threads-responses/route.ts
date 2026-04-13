import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get("stats") === "1";
    const payload = await getAgencyRepo().outreachListJson("threads", withStats);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching threads responses:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cost = 0, notes } = body;
    const c = Number(cost);
    if (Number.isNaN(c) || c < 0) {
      return NextResponse.json({ error: "cost must be >= 0" }, { status: 400 });
    }

    const row = await getAgencyRepo().insertOutreachResponse("threads", { cost: c, notes: notes || null });
    return NextResponse.json({ success: true, item: row });
  } catch (error) {
    console.error("Error creating threads response:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
