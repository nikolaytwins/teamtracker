import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { getUserById, syncUsersFromEnv, toTtUserPublic, updateUserBasicProfile } from "@/lib/tt-auth-db";
import { setTtSessionCookieFromUser } from "@/lib/tt-session-cookie";

function meJsonFromRow(row: NonNullable<ReturnType<typeof getUserById>>) {
  const pub = toTtUserPublic(row);
  return {
    id: pub.id,
    login: pub.login,
    name: pub.display_name,
    title: pub.job_title,
    avatarUrl: pub.avatar_url,
    role: pub.role,
    workHoursPerDay: pub.work_hours_per_day,
    workDays: pub.work_days,
    weeklyCapacityHours: pub.weekly_capacity_hours,
  };
}

export async function PATCH(request: NextRequest) {
  try {
    syncUsersFromEnv();
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const patch: Parameters<typeof updateUserBasicProfile>[1] = {};
    if (typeof body.displayName === "string") patch.display_name = body.displayName;
    if ("jobTitle" in body) {
      patch.job_title = body.jobTitle === null || body.jobTitle === undefined ? "" : String(body.jobTitle);
    }
    if ("avatarUrl" in body) {
      if (body.avatarUrl === null || body.avatarUrl === "") patch.avatar_url = null;
      else if (typeof body.avatarUrl === "string") patch.avatar_url = body.avatarUrl;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Укажите поля для сохранения" }, { status: 400 });
    }
    const r = updateUserBasicProfile(session.sub, patch);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    const row = getUserById(session.sub);
    if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    const res = NextResponse.json({ user: meJsonFromRow(row) });
    await setTtSessionCookieFromUser(res, row, request);
    return res;
  } catch (e) {
    console.error("PATCH /api/me/profile", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
