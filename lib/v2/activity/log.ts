import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2ActivityRow, V2SessionContext } from "@/lib/v2/types";

export async function logActivity(
  ctx: V2SessionContext,
  action: string,
  entityType: string,
  entityId: string | null,
  payload?: Record<string, unknown>
): Promise<V2ActivityRow> {
  const sb = getV2Supabase();
  const row = {
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    actor_user_id: ctx.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload: payload ?? null,
    created_at: nowIso(),
  };
  const { data, error } = await sb.from("v2_activity_log").insert(row).select("*").single();
  if (error) throw new Error(`logActivity: ${error.message}`);
  return data as V2ActivityRow;
}

export async function listRecentActivity(
  ctx: V2SessionContext,
  limit = 50
): Promise<Array<V2ActivityRow & { actor_name: string }>> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_activity_log")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const { listUsersPublic } = await import("@/lib/tt-auth-db");
  const users = listUsersPublic();
  const byId = new Map(users.map((u) => [u.id, u.display_name]));

  return (data ?? []).map((a) => ({
    ...(a as V2ActivityRow),
    actor_name: byId.get(a.actor_user_id as string) ?? "Пользователь",
  }));
}

export function formatActivityMessage(
  row: V2ActivityRow & { actor_name: string }
): string {
  const p = row.payload ?? {};
  switch (row.action) {
    case "task.created":
      return `${row.actor_name} создал(а) задачу «${p.title ?? ""}»`;
    case "task.updated":
      return `${row.actor_name} обновил(а) задачу «${p.title ?? ""}»`;
    case "task.completed":
      return `${row.actor_name} завершил(а) «${p.title ?? ""}»`;
    case "task.comment":
      return `${row.actor_name} прокомментировал(а) «${p.title ?? ""}»`;
    case "task.reopened":
      return `${row.actor_name} вернул(а) в работу «${p.title ?? ""}»`;
    case "task.deleted":
      return `${row.actor_name} удалил(а) задачу «${p.title ?? ""}»`;
    case "project.created":
      return `${row.actor_name} создал(а) проект «${p.name ?? ""}»`;
    case "project.deleted":
      return `${row.actor_name} удалил(а) проект «${p.name ?? ""}»`;
    case "timer.started":
      return `${row.actor_name} запустил(а) таймер на «${p.title ?? ""}»`;
    case "timer.stopped":
      return `${row.actor_name} остановил(а) таймер (${formatDuration(Number(p.duration_seconds ?? 0))})`;
    case "session.manual":
      return `${row.actor_name} добавил(а) время вручную (${formatDuration(Number(p.duration_seconds ?? 0))})`;
    default:
      return `${row.actor_name}: ${row.action}`;
  }
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}с`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h && m) return `${h}ч ${m}м`;
  if (h) return `${h}ч`;
  return `${m}м`;
}
