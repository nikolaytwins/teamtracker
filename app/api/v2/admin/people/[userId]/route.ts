import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { type TtPayType } from "@/lib/v2/admin/compensation";
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

function parseMoney(value: unknown): number | null | "invalid" {
  return parseHourlyRate(value);
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

function parsePayType(value: unknown): TtPayType | "invalid" {
  if (typeof value !== "string") return "invalid";
  const t = value.trim();
  if (t === "hourly" || t === "monthly" || t === "deal") return t;
  return "invalid";
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
  const hasPayType = Object.prototype.hasOwnProperty.call(body, "pay_type");
  const hasSalary = Object.prototype.hasOwnProperty.call(body, "monthly_salary_rub");
  const hasPaid = Object.prototype.hasOwnProperty.call(body, "monthly_paid_rub");

  if (!hasRate && !hasHours && !hasDays && !hasPayType && !hasSalary && !hasPaid) {
    return NextResponse.json(
      {
        error:
          "Укажите hourly_rate_rub, pay_type, monthly_salary_rub, monthly_paid_rub, work_hours_per_day и/или work_days",
      },
      { status: 400 }
    );
  }

  const patch: {
    hourly_rate_rub?: number | null;
    pay_type?: TtPayType;
    monthly_salary_rub?: number | null;
    monthly_paid_rub?: number | null;
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

  if (hasPayType) {
    const parsed = parsePayType(body.pay_type);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "pay_type: hourly | monthly | deal" }, { status: 400 });
    }
    patch.pay_type = parsed;
  }

  if (hasSalary) {
    const parsed = parseMoney(body.monthly_salary_rub);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "monthly_salary_rub: число или null" }, { status: 400 });
    }
    patch.monthly_salary_rub = parsed;
  }

  if (hasPaid) {
    const parsed = parseMoney(body.monthly_paid_rub);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "monthly_paid_rub: число или null" }, { status: 400 });
    }
    patch.monthly_paid_rub = parsed;
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
