import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platform = body?.platform as string;
    if (platform !== "profi" && platform !== "threads") {
      return NextResponse.json({ error: "platform must be profi or threads" }, { status: 400 });
    }
    await getAgencyRepo().insertPlatformVisit(platform);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("platform-visits POST:", error);
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }
}
