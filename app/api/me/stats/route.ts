import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import {
  getWorkerAverageSessionByTaskType,
  getWorkerMonthlyBuckets,
  getWorkerMonthlyTaskBreakdown,
  secondsToHours,
} from "@/lib/me-analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const month = new URL(request.url).searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month=YYYY-MM required" }, { status: 400 });
    }
    const name = session.name;
    const breakdown = getWorkerMonthlyTaskBreakdown(name, month);
    const buckets = getWorkerMonthlyBuckets(name, month);
    const averages = getWorkerAverageSessionByTaskType(name, 1);
    return NextResponse.json({
      month,
      totalHours: secondsToHours(breakdown.totalSeconds),
      totalSeconds: breakdown.totalSeconds,
      breakdown: breakdown.rows,
      buckets: buckets.buckets,
      averages,
    });
  } catch (e) {
    console.error("GET /api/me/stats", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
