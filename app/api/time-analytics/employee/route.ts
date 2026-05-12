import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { effectiveUserRole } from "@/lib/require-role";
import { getEmployeeMonthlyMatch, getEmployeeMonthlySessions, secondsToHours } from "@/lib/time-analytics";
import { labelForTaskType } from "@/lib/time-task-types";
import { isMemberRestrictedRole } from "@/lib/roles";
import { getUserById } from "@/lib/tt-auth-db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = effectiveUserRole(session);
    if (isMemberRestrictedRole(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "";
    const userId = searchParams.get("userId")?.trim() || "";
    const name = searchParams.get("name")?.trim() || "";

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
    }

    let match: { userId?: string; workerName: string };
    let displayName: string;

    if (userId) {
      const u = getUserById(userId);
      if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
      match = { userId, workerName: u.display_name };
      displayName = u.display_name;
    } else if (name) {
      match = { workerName: name };
      displayName = name;
    } else {
      return NextResponse.json({ error: "name or userId required" }, { status: 400 });
    }

    const data = getEmployeeMonthlyMatch(match, month);
    const sessions = getEmployeeMonthlySessions(match, month, 2000).map((s) => ({
      ...s,
      taskLabel: labelForTaskType(s.taskType),
    }));

    return NextResponse.json({
      name: displayName,
      userId: userId || null,
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
      sessions,
    });
  } catch (e) {
    console.error("time-analytics/employee", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
