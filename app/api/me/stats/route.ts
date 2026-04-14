import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import {
  getWorkerAverageSessionByTaskType,
  getWorkerMonthlyBuckets,
  getWorkerMonthlyByDaySeries,
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
    const worker = { sub: session.sub, name: session.name };
    const breakdown = getWorkerMonthlyTaskBreakdown(worker, month);
    const buckets = getWorkerMonthlyBuckets(worker, month);
    const byDay = getWorkerMonthlyByDaySeries(worker, month);
    const averages = getWorkerAverageSessionByTaskType(worker, 1);
    return NextResponse.json({
      month,
      totalHours: secondsToHours(breakdown.totalSeconds),
      totalSeconds: breakdown.totalSeconds,
      breakdown: breakdown.rows,
      buckets: buckets.buckets,
      byDay,
      averages,
    });
  } catch (e) {
    console.error("GET /api/me/stats", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
