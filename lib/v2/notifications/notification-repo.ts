import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { listUsersPublic } from "@/lib/tt-auth-db";
import type { V2SessionContext } from "@/lib/v2/types";

export type V2NotificationRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  actor_user_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type V2NotificationWithMeta = V2NotificationRow & {
  actor_name: string | null;
};

export async function listNotifications(
  ctx: V2SessionContext,
  limit = 30
): Promise<V2NotificationWithMeta[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_notifications")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const users = new Map(listUsersPublic().map((u) => [u.id, u.display_name]));
  return (data ?? []).map((n) => ({
    ...(n as V2NotificationRow),
    actor_name: n.actor_user_id ? (users.get(n.actor_user_id as string) ?? null) : null,
  }));
}

export async function countUnreadNotifications(ctx: V2SessionContext): Promise<number> {
  const sb = getV2Supabase();
  const { count, error } = await sb
    .from("v2_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("workspace_id", ctx.workspaceId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_notifications")
    .update({ read_at: nowIso() })
    .eq("id", id)
    .eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(ctx: V2SessionContext): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_notifications")
    .update({ read_at: nowIso() })
    .eq("user_id", ctx.userId)
    .eq("workspace_id", ctx.workspaceId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function createNotifications(
  ctx: V2SessionContext,
  rows: Array<Omit<V2NotificationRow, "id" | "workspace_id" | "read_at" | "created_at">>
): Promise<void> {
  if (!rows.length) return;
  const sb = getV2Supabase();
  const ts = nowIso();
  const payload = rows.map((r) => ({
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    read_at: null,
    created_at: ts,
    ...r,
  }));
  const { error } = await sb.from("v2_notifications").insert(payload);
  if (error) throw new Error(error.message);
}

/** Уведомить участников проекта и исполнителя о новом комментарии к задаче. */
export async function notifyTaskComment(
  ctx: V2SessionContext,
  task: { id: string; title: string; project_id: string | null; assignee_user_id: string | null },
  projectName: string | null,
  commentPreview: string
): Promise<void> {
  const recipientIds = new Set<string>();
  if (task.assignee_user_id && task.assignee_user_id !== ctx.userId) {
    recipientIds.add(task.assignee_user_id);
  }

  if (task.project_id) {
    const sb = getV2Supabase();
    const { data: members } = await sb.from("v2_project_members").select("user_id").eq("project_id", task.project_id);
    for (const m of members ?? []) {
      const uid = m.user_id as string;
      if (uid !== ctx.userId) recipientIds.add(uid);
    }
    const { data: project } = await sb.from("v2_projects").select("owner_user_id, created_by").eq("id", task.project_id).maybeSingle();
    if (project?.owner_user_id && project.owner_user_id !== ctx.userId) {
      recipientIds.add(project.owner_user_id as string);
    }
    if (project?.created_by && project.created_by !== ctx.userId) {
      recipientIds.add(project.created_by as string);
    }
  }

  if (!recipientIds.size) return;

  const actor = listUsersPublic().find((u) => u.id === ctx.userId);
  const actorName = actor?.display_name ?? ctx.userName;
  const projectPart = projectName ? ` · ${projectName}` : "";
  const preview = commentPreview.length > 120 ? `${commentPreview.slice(0, 117)}…` : commentPreview;

  await createNotifications(
    ctx,
    [...recipientIds].map((user_id) => ({
      user_id,
      type: "task.comment",
      title: `${actorName} оставил(а) комментарий`,
      body: `«${task.title}»${projectPart}: ${preview}`,
      entity_type: "task",
      entity_id: task.id,
      actor_user_id: ctx.userId,
    }))
  );
}
