import { NextRequest, NextResponse } from "next/server";
import { getMonthlyAggregates, secondsToHours } from "@/lib/time-analytics";
import { labelForTaskType } from "@/lib/time-task-types";

export async function GET(request: NextRequest) {
  try {
    const month = new URL(request.url).searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
    }
    const data = getMonthlyAggregates(month);
    return NextResponse.json({
      month,
      totalSeconds: data.totalSeconds,
      totalHours: secondsToHours(data.totalSeconds),
      byWorker: data.byWorker.map((r) => ({
        name: r.w,
        seconds: r.s,
        hours: secondsToHours(r.s),
      })),
      byTaskType: data.byTaskType.map((r) => ({
        type: r.t || "",
        label: labelForTaskType(r.t),
        seconds: r.s,
        hours: secondsToHours(r.s),
      })),
    });
  } catch (e) {
    console.error("time-analytics/monthly", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
