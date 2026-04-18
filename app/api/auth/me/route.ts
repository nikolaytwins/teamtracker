import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { getUserById, syncUsersFromEnv, toTtUserPublic } from "@/lib/tt-auth-db";

export async function GET() {
  try {
    syncUsersFromEnv();
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const row = getUserById(session.sub);
    const pub = row ? toTtUserPublic(row) : null;
    return NextResponse.json({
      user: row
        ? {
            id: row.id,
            login: row.login,
            name: row.display_name,
            title: row.job_title,
            avatarUrl: row.avatar_url,
            role: row.role,
            workHoursPerDay: pub!.work_hours_per_day,
            workDays: pub!.work_days,
            weeklyCapacityHours: pub!.weekly_capacity_hours,
          }
        : {
            id: session.sub,
            login: session.login,
            name: session.name,
            title: session.title,
            avatarUrl: null as string | null,
            role: session.role ?? "admin",
          },
    });
  } catch (e) {
    console.error("GET /api/auth/me", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
