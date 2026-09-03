import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { isDispatchWorkStatus } from "@/lib/v2/agency/dispatch/dispatch-work-status";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as {
      dispatch_work_status?: string;
      work_deadline?: string | null;
      planned_hours_remaining?: number | null;
    };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.dispatch_work_status !== undefined) {
      if (!isDispatchWorkStatus(body.dispatch_work_status)) {
        return NextResponse.json({ error: "invalid dispatch_work_status" }, { status: 400 });
      }
      patch.dispatch_work_status = body.dispatch_work_status;
    }
    if (body.work_deadline !== undefined) {
      patch.work_deadline = body.work_deadline || null;
    }
    if (body.planned_hours_remaining !== undefined) {
      patch.planned_hours_remaining = body.planned_hours_remaining;
    }

    const sb = createSupabaseServiceClient();
    const { data, error } = await sb.from("agency_project").update(patch).eq("id", id).select("id").single();
    if (error) throw error;
    return NextResponse.json({ project: data });
  } catch (error) {
    console.error("v2/agency/plan/projects PATCH:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
