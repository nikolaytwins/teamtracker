import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import {
  updateUserAvatar,
  updateUserPasswordSelf,
  updateUserScheduleAndProfile,
} from "@/lib/tt-auth-db";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));

    if (typeof body.avatarUrl === "string" || body.avatarUrl === null) {
      const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : null;
      if (avatarUrl != null && avatarUrl.length > 2_000_000) {
        return NextResponse.json({ error: "Аватар слишком большой" }, { status: 400 });
      }
      if (Object.prototype.hasOwnProperty.call(body, "avatarUrl")) {
        const ok = updateUserAvatar(session.sub, avatarUrl);
        if (!ok) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
      }
    }

    const schedulePatch: Parameters<typeof updateUserScheduleAndProfile>[1] = {};
    if (typeof body.workHoursPerDay === "number") {
      schedulePatch.work_hours_per_day = body.workHoursPerDay;
    }
    if (Array.isArray(body.workDays)) {
      schedulePatch.work_days = body.workDays.filter((x: unknown): x is number => typeof x === "number");
    }
    if (typeof body.weeklyCapacityHours === "number") {
      schedulePatch.weekly_capacity_hours = body.weeklyCapacityHours;
    }
    if (typeof body.displayName === "string") {
      schedulePatch.display_name = body.displayName;
    }
    if (Object.prototype.hasOwnProperty.call(body, "jobTitle")) {
      schedulePatch.job_title = typeof body.jobTitle === "string" ? body.jobTitle : "";
    }

    if (Object.keys(schedulePatch).length > 0) {
      const r = updateUserScheduleAndProfile(session.sub, schedulePatch);
      if (!r.ok) {
        return NextResponse.json({ error: r.error }, { status: 400 });
      }
    }

    if (typeof body.newPassword === "string" && body.newPassword.trim()) {
      const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const pw = updateUserPasswordSelf(session.sub, current, body.newPassword);
      if (!pw.ok) {
        return NextResponse.json({ error: pw.error }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/me/profile", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
