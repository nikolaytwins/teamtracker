import { NextResponse } from "next/server";
import { listDistinctWorkers } from "@/lib/time-analytics";

export async function GET() {
  try {
    const workers = listDistinctWorkers();
    return NextResponse.json({ workers });
  } catch (e) {
    console.error("time-analytics/workers", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
