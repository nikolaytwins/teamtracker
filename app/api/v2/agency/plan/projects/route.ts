import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { ensureCardForAgencyProject } from "@/lib/db";

/**
 * Быстрое создание agency-проекта из Плана (канбан).
 * Body: {
 *   name, planned_hours_remaining?, work_deadline?,
 *   include_in_finance?, total_amount?, paid_amount?, payment_status?, service_type?
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      name?: string;
      planned_hours_remaining?: number | null;
      work_deadline?: string | null;
      include_in_finance?: boolean;
      total_amount?: number | null;
      paid_amount?: number | null;
      payment_status?: string | null;
      service_type?: string | null;
    };
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const hours =
      body.planned_hours_remaining === undefined || body.planned_hours_remaining === null
        ? null
        : Number(body.planned_hours_remaining);
    if (hours != null && (!Number.isFinite(hours) || hours < 0)) {
      return NextResponse.json({ error: "invalid planned_hours_remaining" }, { status: 400 });
    }

    const workDeadline = body.work_deadline ? String(body.work_deadline).trim() || null : null;
    const includeInFinance = body.include_in_finance === true;

    let totalAmount = 0;
    let paidAmount = 0;
    let paymentStatus = "not_paid";
    if (includeInFinance) {
      totalAmount = Number(body.total_amount);
      if (!Number.isFinite(totalAmount) || totalAmount < 0) {
        return NextResponse.json(
          { error: "total_amount required when include_in_finance" },
          { status: 400 }
        );
      }
      totalAmount = Math.round(totalAmount);
      paidAmount = body.paid_amount == null ? 0 : Number(body.paid_amount);
      if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        return NextResponse.json({ error: "invalid paid_amount" }, { status: 400 });
      }
      paidAmount = Math.round(paidAmount);
      const rawStatus = String(body.payment_status ?? "not_paid");
      paymentStatus =
        rawStatus === "paid" || rawStatus === "prepaid" || rawStatus === "not_paid"
          ? rawStatus
          : "not_paid";
      if (paymentStatus === "paid") paidAmount = totalAmount;
    }

    const serviceType = String(body.service_type ?? "other").trim() || "other";
    const id = `proj_${Date.now()}`;
    const now = new Date().toISOString();

    const sb = createSupabaseServiceClient();
    const { data, error } = await sb
      .from("agency_project")
      .insert({
        id,
        name,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        deadline: workDeadline,
        status: paymentStatus,
        service_type: serviceType,
        business_line: "agency",
        dispatch_work_status: "planned",
        work_deadline: workDeadline,
        planned_hours_remaining: hours,
        plan_hidden: false,
        created_at: now,
        updated_at: now,
      })
      .select("id, name, total_amount, status")
      .single();
    if (error) throw error;

    try {
      ensureCardForAgencyProject({
        id,
        name,
        deadline: workDeadline,
      });
    } catch (syncErr) {
      console.error("ensureCardForAgencyProject after plan create:", syncErr);
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error("v2/agency/plan/projects POST:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
