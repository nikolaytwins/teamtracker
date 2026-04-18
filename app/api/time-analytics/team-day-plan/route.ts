import { NextRequest, NextResponse } from "next/server";
import { getISOWeekInfo } from "@/lib/iso-week";
import { requireAgencyAccess } from "@/lib/require-role";
import { getTimeSecondsByUserDay, listSubtasksPlannedForUserDay } from "@/lib/team-week-plan";
import { dailyCapacityHours } from "@/lib/tt-user-schedule";
import { listUsersPublic } from "@/lib/tt-auth-db";
import { secondsToHours } from "@/lib/time-analytics";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

export async function GET(request: NextRequest) {
  const access = await requireAgencyAccess();
  if (!access.ok) return access.response;

  const date = new URL(request.url).searchParams.get("date")?.trim() ?? "";
  if (!isYmd(date)) {
    return NextResponse.json({ error: "Укажите date в формате YYYY-MM-DD" }, { status: 400 });
  }

  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }

  const { monday } = getISOWeekInfo(d);
  const mondayIso = monday.toISOString();
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const nextMondayIso = nextMonday.toISOString();

  const loggedMap = getTimeSecondsByUserDay(mondayIso, nextMondayIso);
  const users = listUsersPublic();

  const rows = users.map((u) => {
    const sec = loggedMap.get(`${u.id}\t${date}`) ?? 0;
    const loggedHours = secondsToHours(sec);
    const capacityHours = dailyCapacityHours({
      work_hours_per_day: u.work_hours_per_day,
      work_days: u.work_days,
      ymd: date,
    });
    const tasks = listSubtasksPlannedForUserDay(u.id, date);
    const plannedHours = Math.round(tasks.reduce((a, t) => a + t.hoursOnDay, 0) * 10) / 10;
    return {
      userId: u.id,
      name: u.display_name,
      role: u.role,
      capacityHours: Math.round(capacityHours * 10) / 10,
      loggedHours,
      plannedHours,
      tasks,
    };
  });

  return NextResponse.json({ date, users: rows });
}
