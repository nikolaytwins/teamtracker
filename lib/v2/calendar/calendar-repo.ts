import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";

export type V2CalendarEventRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  scope: "work" | "personal";
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  task_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCalendarEvents(
  ctx: V2SessionContext,
  from: string,
  to: string,
  userId?: string
): Promise<V2CalendarEventRow[]> {
  const sb = getV2Supabase();
  let q = sb
    .from("v2_calendar_events")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at");
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as V2CalendarEventRow[];
}

export async function createCalendarEvent(
  ctx: V2SessionContext,
  input: {
    title: string;
    scope: "work" | "personal";
    startAt: string;
    endAt: string;
    description?: string;
    taskId?: string;
  }
): Promise<V2CalendarEventRow> {
  const sb = getV2Supabase();
  const row: V2CalendarEventRow = {
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    user_id: ctx.userId,
    scope: input.scope,
    title: input.title.trim(),
    description: input.description ?? null,
    start_at: input.startAt,
    end_at: input.endAt,
    task_id: input.taskId ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const { error } = await sb.from("v2_calendar_events").insert(row);
  if (error) throw new Error(error.message);
  return row;
}

export async function deleteCalendarEvent(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_calendar_events").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
}
