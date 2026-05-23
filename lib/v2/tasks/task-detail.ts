import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { logActivity } from "@/lib/v2/activity/log";
import { getTaskById } from "@/lib/v2/tasks/task-repo";
import type { V2SessionContext } from "@/lib/v2/types";
import { listUsersPublic } from "@/lib/tt-auth-db";

export type V2TaskCommentRow = {
  id: string;
  task_id: string;
  author_user_id: string;
  body: string;
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
    author_name: users.get(c.author_user_id as string) ?? "Пользователь",
  }));
}

export async function addComment(
  ctx: V2SessionContext,
  taskId: string,
  body: string
): Promise<V2TaskCommentRow> {
  const task = await getTaskById(ctx, taskId);
  if (!task) throw new Error("Task not found");

  const sb = getV2Supabase();
  const row: V2TaskCommentRow = {
    id: newV2Id(),
    task_id: taskId,
    author_user_id: ctx.userId,
    body: body.trim(),
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_task_comments").insert(row);
  if (error) throw new Error(error.message);

  await logActivity(ctx, "task.comment", "task", taskId, { title: task.title });
  return row;
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
  return (data ?? []) as import("@/lib/v2/types").V2TaskRow[];
}
