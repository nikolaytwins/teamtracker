import { NextRequest, NextResponse } from "next/server";
import { normalizeTtUserRole } from "@/lib/roles";
import { requireAgencyAccess } from "@/lib/require-role";
import {
  getUserById,
  resetUserPasswordByAdmin,
  toTtUserPublic,
  updateUserAuthEmail,
  updateUserRole,
  updateUserScheduleAndProfile,
} from "@/lib/tt-auth-db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAgencyAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const userId = typeof id === "string" ? id.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasRole = body.role != null && String(body.role).trim() !== "";
  const hasAuthEmail = Object.prototype.hasOwnProperty.call(body, "auth_email");
  const hasSchedule =
    body.work_hours_per_day !== undefined ||
    body.work_days !== undefined ||
    body.weekly_capacity_hours !== undefined ||
    body.display_name !== undefined ||
    body.job_title !== undefined;
  const regeneratePassword = body.regeneratePassword === true;

  if (!hasRole && !hasAuthEmail && !hasSchedule && !regeneratePassword) {
    return NextResponse.json(
      { error: "Укажите role, auth_email, график (work_hours_per_day / work_days / weekly_capacity_hours), имя или regeneratePassword" },
      { status: 400 }
    );
  }

  if (hasRole) {
    const role = normalizeTtUserRole(String(body.role));
    const result = updateUserRole(userId, role);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }
  if (hasAuthEmail) {
    let emailVal: string | null;
    if (body.auth_email === null || body.auth_email === "") {
      emailVal = null;
    } else if (typeof body.auth_email === "string") {
      emailVal = body.auth_email;
    } else {
      return NextResponse.json({ error: "auth_email: ожидается строка или null" }, { status: 400 });
    }
    const result = updateUserAuthEmail(userId, emailVal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  if (hasSchedule) {
    const patch: Parameters<typeof updateUserScheduleAndProfile>[1] = {};
    if (body.work_hours_per_day !== undefined) {
      if (typeof body.work_hours_per_day !== "number" || Number.isNaN(body.work_hours_per_day)) {
        return NextResponse.json({ error: "work_hours_per_day: число" }, { status: 400 });
      }
      patch.work_hours_per_day = body.work_hours_per_day;
    }
    if (body.work_days !== undefined) {
      if (body.work_days === null) {
        patch.work_days = null;
      } else if (Array.isArray(body.work_days)) {
        patch.work_days = body.work_days.filter((x): x is number => typeof x === "number");
      } else {
        return NextResponse.json({ error: "work_days: массив чисел 0–6 или null" }, { status: 400 });
      }
    }
    if (body.weekly_capacity_hours !== undefined) {
      if (typeof body.weekly_capacity_hours !== "number" || Number.isNaN(body.weekly_capacity_hours)) {
        return NextResponse.json({ error: "weekly_capacity_hours: число" }, { status: 400 });
      }
      patch.weekly_capacity_hours = body.weekly_capacity_hours;
    }
    if (typeof body.display_name === "string") {
      patch.display_name = body.display_name;
    }
    if (Object.prototype.hasOwnProperty.call(body, "job_title")) {
      patch.job_title = typeof body.job_title === "string" ? body.job_title : "";
    }
    const result = updateUserScheduleAndProfile(userId, patch);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  let temporaryPassword: string | undefined;
  if (regeneratePassword) {
    const pw = resetUserPasswordByAdmin(userId);
    if (!pw.ok) {
      return NextResponse.json({ error: pw.error }, { status: 400 });
    }
    temporaryPassword = pw.temporaryPassword;
  }

  const row = getUserById(userId);
  if (!row) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  return NextResponse.json({ user: toTtUserPublic(row), ...(temporaryPassword != null ? { temporaryPassword } : {}) });
}
