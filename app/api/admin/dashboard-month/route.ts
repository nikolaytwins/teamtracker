import { NextRequest, NextResponse } from "next/server";
import { requireAgencyAccess } from "@/lib/require-role";
import { listUsersPublic } from "@/lib/tt-auth-db";
import {
  getEmployeeMonthlyHoursByDay,
  getEmployeeMonthlyMatch,
  secondsToHours,
} from "@/lib/time-analytics";

export async function GET(request: NextRequest) {
  const auth = await requireAgencyAccess();
  if (!auth.ok) return auth.response;

  const month = new URL(request.url).searchParams.get("month") || "";
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
  }

  const users = listUsersPublic();
  const payload = users.map((u) => {
    const m = { userId: u.id, workerName: u.display_name };
    const match = getEmployeeMonthlyMatch(m, month);
    const byDay = getEmployeeMonthlyHoursByDay(m, month);
    return {
      ...u,
      monthTotalSeconds: match.totalSeconds,
      monthTotalHours: secondsToHours(match.totalSeconds),
      byDay,
    };
  });

  return NextResponse.json({ month, users: payload });
}
