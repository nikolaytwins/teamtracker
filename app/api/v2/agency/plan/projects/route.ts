import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { ensureCardForAgencyProject } from "@/lib/db";

/**
 * Быстрое создание agency-проекта из Плана (канбан).
 * Body: { name, planned_hours_remaining?, work_deadline? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      name?: string;
      planned_hours_remaining?: number | null;
      work_deadline?: string | null;
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
    const id = `proj_${Date.now()}`;
    const now = new Date().toISOString();

    const sb = createSupabaseServiceClient();
    const { data, error } = await sb
      .from("agency_project")
      .insert({
        id,
        name,
        total_amount: 0,
        paid_amount: 0,
        deadline: workDeadline,
        status: "not_paid",
        service_type: "other",
        business_line: "agency",
        dispatch_work_status: "planned",
        work_deadline: workDeadline,
        planned_hours_remaining: hours,
        plan_hidden: false,
        created_at: now,
        updated_at: now,
      })
      .select("id, name")
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
