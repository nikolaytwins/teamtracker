import { NextRequest, NextResponse } from "next/server";
import { getEmployeeMonthly, secondsToHours } from "@/lib/time-analytics";
import { labelForTaskType } from "@/lib/time-task-types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") || "";
    const month = searchParams.get("month") || "";
    if (!name.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
    }
    const data = getEmployeeMonthly(name, month);
    return NextResponse.json({
      name: name.trim(),
      month,
      totalSeconds: data.totalSeconds,
      totalHours: secondsToHours(data.totalSeconds),
      byProject: data.byProject.map((p) => ({
        ...p,
        hours: secondsToHours(p.seconds),
      })),
      byTaskType: data.byTaskType.map((r) => ({
        type: r.type || "",
        label: labelForTaskType(r.type),
        seconds: r.seconds,
        hours: secondsToHours(r.seconds),
      })),
    });
  } catch (e) {
    console.error("time-analytics/employee", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
