import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { newV2Id } from "@/lib/v2/db/client";
import type { PlanDayMode, PlanItemKind, PlanItemRow } from "@/lib/v2/agency/plan/plan-types";
import type { V2SessionContext } from "@/lib/v2/types";

function mapItem(row: Record<string, unknown>): PlanItemRow {
  return {
    id: String(row.id),
    kind: row.kind as PlanItemKind,
    project_id: row.project_id ? String(row.project_id) : null,
    title: String(row.title),
    plan_date: row.plan_date ? String(row.plan_date).slice(0, 10) : null,
    planned_minutes: row.planned_minutes != null ? Number(row.planned_minutes) : null,
    event_time: row.event_time ? String(row.event_time) : null,
    duration_label: row.duration_label ? String(row.duration_label) : null,
    sort_order: Number(row.sort_order) || 0,
  };
}

export async function listPlanItems(
  ctx: V2SessionContext,
  from?: string,
  to?: string
): Promise<PlanItemRow[]> {
  const sb = createSupabaseServiceClient();
  let q = sb
    .from("agency_plan_item")
    .select("id, kind, project_id, title, plan_date, planned_minutes, event_time, duration_label, sort_order")
    .eq("user_id", ctx.userId)
    .order("plan_date", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true });

  if (from) q = q.or(`plan_date.is.null,and(plan_date.gte.${from},plan_date.lte.${to ?? from})`);
  const { data, error } = await q;
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => mapItem(r as Record<string, unknown>));
}

export async function listPlanDayModes(
  ctx: V2SessionContext,
  from: string,
  to: string
): Promise<{ plan_date: string; mode: PlanDayMode }[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("agency_plan_day_mode")
    .select("plan_date, mode")
    .eq("user_id", ctx.userId)
    .gte("plan_date", from)
    .lte("plan_date", to);
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    plan_date: String(r.plan_date).slice(0, 10),
    mode: r.mode as PlanDayMode,
  }));
}

export type PlanItemInput = {
  kind: PlanItemKind;
  project_id?: string | null;
  title: string;
  plan_date?: string | null;
  planned_minutes?: number | null;
  event_time?: string | null;
  duration_label?: string | null;
};

export async function createPlanItem(ctx: V2SessionContext, input: PlanItemInput): Promise<PlanItemRow> {
  const sb = createSupabaseServiceClient();
  const id = newV2Id();
  const row = {
    id,
    user_id: ctx.userId,
    kind: input.kind,
    project_id: input.project_id ?? null,
    title: input.title.trim(),
    plan_date: input.plan_date ?? null,
    planned_minutes: input.planned_minutes ?? null,
    event_time: input.event_time ?? null,
    duration_label: input.duration_label ?? null,
    sort_order: 0,
  };
  const { data, error } = await sb.from("agency_plan_item").insert(row).select().single();
  if (error) throw error;
  return mapItem(data as Record<string, unknown>);
}

export async function updatePlanItem(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<PlanItemInput>
): Promise<PlanItemRow> {
  const sb = createSupabaseServiceClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.kind !== undefined) body.kind = patch.kind;
  if (patch.project_id !== undefined) body.project_id = patch.project_id;
  if (patch.title !== undefined) body.title = patch.title.trim();
  if (patch.plan_date !== undefined) body.plan_date = patch.plan_date;
  if (patch.planned_minutes !== undefined) body.planned_minutes = patch.planned_minutes;
  if (patch.event_time !== undefined) body.event_time = patch.event_time;
  if (patch.duration_label !== undefined) body.duration_label = patch.duration_label;

  const { data, error } = await sb
    .from("agency_plan_item")
    .update(body)
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select()
    .single();
  if (error) throw error;
  return mapItem(data as Record<string, unknown>);
}

export async function deletePlanItem(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("agency_plan_item").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) throw error;
}

export async function upsertPlanDayMode(
  ctx: V2SessionContext,
  planDate: string,
  mode: PlanDayMode | null
): Promise<void> {
  const sb = createSupabaseServiceClient();
  if (!mode) {
    await sb.from("agency_plan_day_mode").delete().eq("user_id", ctx.userId).eq("plan_date", planDate);
    return;
  }
  const { error } = await sb.from("agency_plan_day_mode").upsert(
    {
      user_id: ctx.userId,
      plan_date: planDate,
      mode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,plan_date" }
  );
  if (error) throw error;
}

export async function clearDayModeByType(ctx: V2SessionContext, mode: PlanDayMode, fromDate: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  await sb
    .from("agency_plan_day_mode")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("mode", mode)
    .gte("plan_date", fromDate);
}
