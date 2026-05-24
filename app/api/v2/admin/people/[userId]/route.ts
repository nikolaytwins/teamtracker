import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { getUserById, toTtUserPublic, updateUserScheduleAndProfile } from "@/lib/tt-auth-db";

type Params = { params: Promise<{ userId: string }> };

function parseHourlyRate(value: unknown): number | null | "invalid" {
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? n : "invalid";
  }
  return "invalid";
}

function parseWorkHours(value: unknown): number | "invalid" {
  if (typeof value !== "number" || !Number.isFinite(value)) return "invalid";
  return value;
}

function parseWorkDays(value: unknown): number[] | "invalid" {
  if (!Array.isArray(value)) return "invalid";
  const out: number[] = [];
  for (const x of value) {
    const n = typeof x === "number" ? x : typeof x === "string" ? parseInt(x, 10) : NaN;
    if (!Number.isInteger(n) || n < 0 || n > 6) return "invalid";
    out.push(n);
  }
  return out;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const id = typeof userId === "string" ? userId.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasRate = Object.prototype.hasOwnProperty.call(body, "hourly_rate_rub");
  const hasHours = Object.prototype.hasOwnProperty.call(body, "work_hours_per_day");
  const hasDays = Object.prototype.hasOwnProperty.call(body, "work_days");

  if (!hasRate && !hasHours && !hasDays) {
    return NextResponse.json(
      { error: "Укажите hourly_rate_rub, work_hours_per_day и/или work_days" },
      { status: 400 }
    );
  }

  const patch: {
    hourly_rate_rub?: number | null;
    work_hours_per_day?: number;
    work_days?: number[];
  } = {};

  if (hasRate) {
    const parsed = parseHourlyRate(body.hourly_rate_rub);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "hourly_rate_rub: число или null" }, { status: 400 });
    }
    patch.hourly_rate_rub = parsed;
  }

  if (hasHours) {
    const parsed = parseWorkHours(body.work_hours_per_day);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "work_hours_per_day: число" }, { status: 400 });
    }
    patch.work_hours_per_day = parsed;
  }

  if (hasDays) {
    const parsed = parseWorkDays(body.work_days);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "work_days: массив 0–6" }, { status: 400 });
    }
    patch.work_days = parsed;
  }

  const result = updateUserScheduleAndProfile(id, patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const row = getUserById(id);
  if (!row) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({ user: toTtUserPublic(row) });
}
