import { NextRequest, NextResponse } from "next/server";
import { formatISOWeekParam } from "@/lib/iso-week";
import { requireAgencyAccess } from "@/lib/require-role";
import { listUsersPublic } from "@/lib/tt-auth-db";
import { buildTeamWeekUserDays, getTeamWeekLoad, secondsToHours } from "@/lib/time-analytics";

function loadStatus(hours: number, capacity: number): "under" | "normal" | "over" {
  const safeCapacity = capacity > 0 ? capacity : 40;
  const ratio = hours / safeCapacity;
  if (ratio < 0.9) return "under";
  if (ratio > 1.1) return "over";
  return "normal";
}

export async function GET(request: NextRequest) {
  const access = await requireAgencyAccess();
  if (!access.ok) return access.response;

  try {
    const week = new URL(request.url).searchParams.get("week")?.trim() || formatISOWeekParam();
    const data = getTeamWeekLoad(week);
    const usersById = new Map(listUsersPublic().map((u) => [u.id, u]));
    const rows = data.rows.map((r) => {
      const hours = secondsToHours(r.weekSeconds);
      const previousHours = secondsToHours(r.previousWeekSeconds);
      const pub = usersById.get(r.userId);
      const days =
        pub != null
          ? buildTeamWeekUserDays({
              monday: data.monday,
              mondayIso: data.mondayIso,
              nextMondayIso: data.nextMondayIso,
              user: pub,
            })
          : undefined;
      return {
        userId: r.userId,
        name: r.displayName,
        role: r.role,
        capacityHours: r.weeklyCapacityHours,
        hours,
        previousHours,
        deltaHours: secondsToHours(r.weekSeconds - r.previousWeekSeconds),
        status: loadStatus(hours, r.weeklyCapacityHours),
        days,
      };
    });
    const totalHours = rows.reduce((acc, r) => acc + r.hours, 0);
    const totalCapacityHours = rows.reduce((acc, r) => acc + r.capacityHours, 0);
    return NextResponse.json({
      week: data.week,
      mondayIso: data.mondayIso,
      nextMondayIso: data.nextMondayIso,
      totalHours: Math.round(totalHours * 10) / 10,
      totalCapacityHours: Math.round(totalCapacityHours * 10) / 10,
      rows,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "invalid week") {
      return NextResponse.json({ error: "week required (YYYY-Www)" }, { status: 400 });
    }
    console.error("time-analytics/team-week", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
