import { NextResponse } from "next/server";
import { listDistinctWorkers } from "@/lib/time-analytics";
import { listUsersPublic } from "@/lib/tt-auth-db";

export async function GET() {
  try {
    const workers = listDistinctWorkers();
    const teamUsers = listUsersPublic().map((u) => ({ id: u.id, displayName: u.display_name }));
    return NextResponse.json({ workers, teamUsers });
  } catch (e) {
    console.error("time-analytics/workers", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
