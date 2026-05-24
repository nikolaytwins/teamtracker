import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { logActivity } from "@/lib/v2/activity/log";
import { notifyTaskComment } from "@/lib/v2/notifications/notification-repo";
import { getTaskById } from "@/lib/v2/tasks/task-repo";
import type { V2SessionContext, V2TaskRow } from "@/lib/v2/types";
import { listUsersPublic } from "@/lib/tt-auth-db";

export type V2TaskCommentRow = {
  id: string;
  task_id: string;
  author_user_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
};

export type V2TaskLinkRow = {
  id: string;
  task_id: string;
  url: string;
  title: string | null;
  created_by: string;
  created_at: string;
};

export type V2TaskFileRow = {
  id: string;
  task_id: string;
  name: string;
  url: string;
  size_bytes: number | null;
  kind: string | null;
  created_by: string;
  created_at: string;
};

export async function listComments(
  taskId: string
): Promise<Array<V2TaskCommentRow & { author_name: string }>> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const users = new Map(listUsersPublic().map((u) => [u.id, u.display_name]));
  return (data ?? []).map((c) => ({
    ...(c as V2TaskCommentRow),
    parent_comment_id: (c.parent_comment_id as string | null) ?? null,
    author_name: users.get(c.author_user_id as string) ?? "Пользователь",
  }));
}

export async function addComment(
  ctx: V2SessionContext,
  taskId: string,
  body: string,
  parentCommentId?: string | null
): Promise<V2TaskCommentRow & { author_name: string }> {
  const task = await getTaskById(ctx, taskId);
  if (!task) throw new Error("Task not found");

  const sb = getV2Supabase();
  const row: V2TaskCommentRow = {
    id: newV2Id(),
    task_id: taskId,
    author_user_id: ctx.userId,
    body: body.trim(),
    parent_comment_id: parentCommentId ?? null,
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_task_comments").insert(row);
  if (error) throw new Error(error.message);

  await logActivity(ctx, "task.comment", "task", taskId, { title: task.title });

  await notifyTaskComment(
    ctx,
    {
      id: task.id,
      title: task.title,
      project_id: task.project_id,
      assignee_user_id: task.assignee_user_id,
    },
    task.project_name,
    row.body
  ).catch((e) => console.error("notifyTaskComment", e));

  const users = new Map(listUsersPublic().map((u) => [u.id, u.display_name]));
  return {
    ...row,
    author_name: users.get(ctx.userId) ?? "Пользователь",
  };
}

export async function listLinks(taskId: string): Promise<V2TaskLinkRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_task_links").select("*").eq("task_id", taskId);
  if (error) throw new Error(error.message);
  return (data ?? []) as V2TaskLinkRow[];
}

export async function addLink(
  ctx: V2SessionContext,
  taskId: string,
  url: string,
  title?: string
): Promise<V2TaskLinkRow> {
  const task = await getTaskById(ctx, taskId);
  if (!task) throw new Error("Task not found");

  const sb = getV2Supabase();
  const row: V2TaskLinkRow = {
    id: newV2Id(),
    task_id: taskId,
    url: url.trim(),
    title: title?.trim() || null,
    created_by: ctx.userId,
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_task_links").insert(row);
  if (error) throw new Error(error.message);
  return row;
}

export async function listSubtasks(ctx: V2SessionContext, parentId: string) {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_tasks")
    .select("*")
    .eq("parent_id", parentId)
    .is("deleted_at", null)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as V2TaskRow[];
}

export async function listFiles(taskId: string): Promise<V2TaskFileRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_task_files")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as V2TaskFileRow[];
}

export async function addFile(
  ctx: V2SessionContext,
  taskId: string,
  input: { name: string; url: string; sizeBytes?: number | null; kind?: string | null }
): Promise<V2TaskFileRow> {
  const task = await getTaskById(ctx, taskId);
  if (!task) throw new Error("Task not found");

  const sb = getV2Supabase();
  const row: V2TaskFileRow = {
    id: newV2Id(),
    task_id: taskId,
    name: input.name.trim(),
    url: input.url.trim(),
    size_bytes: input.sizeBytes ?? null,
    kind: input.kind?.trim() || null,
    created_by: ctx.userId,
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_task_files").insert(row);
  if (error) throw new Error(error.message);
  return row;
}
