import { NextRequest, NextResponse } from "next/server";
import { searchProjectsWithTime, secondsToHours } from "@/lib/time-analytics";

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get("q") || "";
    if (!q.trim()) {
      return NextResponse.json({ projects: [] });
    }
    const rows = searchProjectsWithTime(q);
    return NextResponse.json({
      projects: rows.map((r) => ({
        id: r.id,
        name: r.name,
        totalSeconds: r.total_seconds,
        totalHours: secondsToHours(r.total_seconds),
      })),
    });
  } catch (e) {
    console.error("time-analytics/projects", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
