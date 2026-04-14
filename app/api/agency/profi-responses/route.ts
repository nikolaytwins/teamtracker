import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get("stats") === "1";
    const omitItems = searchParams.get("omitItems") === "1";
    const payload = await getAgencyRepo().outreachListJson("profi", withStats, { omitItems });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching profi responses:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cost, notes } = body;

    if (cost == null || Number(cost) < 0) {
      return NextResponse.json({ error: "cost is required and must be >= 0" }, { status: 400 });
    }

    const row = await getAgencyRepo().insertOutreachResponse("profi", {
      cost: Number(cost),
      notes: notes || null,
    });

    return NextResponse.json({ success: true, item: row });
  } catch (error) {
    console.error("Error creating profi response:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
