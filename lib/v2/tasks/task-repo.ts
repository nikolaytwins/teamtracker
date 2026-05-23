import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { logActivity } from "@/lib/v2/activity/log";
import { canEditTask, canViewAllTeamData, canViewTask } from "@/lib/v2/auth/permissions";
import { classifyTaskBucket } from "@/lib/v2/tasks/task-buckets";
import { listUsersPublic } from "@/lib/tt-auth-db";
import type {
  V2InboxBucket,
  V2SessionContext,
  V2TaskPriority,
  V2TaskRow,
  V2TaskScope,
  V2TaskStatus,
  V2TaskWithMeta,
} from "@/lib/v2/types";

export type CreateTaskInput = {
  title: string;
  scope?: V2TaskScope;
  projectId?: string | null;
  assigneeUserId?: string | null;
  deadlineAt?: string | null;
  estimateSeconds?: number | null;
  priority?: V2TaskPriority;
  description?: string | null;
  inboxBucket?: V2InboxBucket | null;
  parentId?: string | null;
};

export type UpdateTaskInput = Partial<{
  title: string;
  description: string | null;
  projectId: string | null;
  assigneeUserId: string | null;
  deadlineAt: string | null;
  estimateSeconds: number | null;
  priority: V2TaskPriority;
  status: V2TaskStatus;
  scope: V2TaskScope;
  inboxBucket: V2InboxBucket | null;
}>;

async function sumLoggedSeconds(taskIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (taskIds.length === 0) return map;
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_time_sessions")
    .select("task_id, duration_seconds, started_at, ended_at")
    .in("task_id", taskIds);
  if (error) throw new Error(error.message);

  const now = Date.now();
  for (const row of data ?? []) {
    const tid = row.task_id as string;
    let sec = row.duration_seconds as number | null;
    if (sec == null && row.ended_at == null) {
      sec = Math.max(0, Math.floor((now - new Date(row.started_at as string).getTime()) / 1000));
    }
    map.set(tid, (map.get(tid) ?? 0) + (sec ?? 0));
  }
  return map;
}

async function countCommentsAndLinks(
  taskIds: string[]
): Promise<{ comments: Map<string, number>; links: Map<string, number> }> {
  const comments = new Map<string, number>();
  const links = new Map<string, number>();
  if (!taskIds.length) return { comments, links };

  const sb = getV2Supabase();
  const [{ data: crows }, { data: lrows }] = await Promise.all([
    sb.from("v2_task_comments").select("task_id").in("task_id", taskIds),
    sb.from("v2_task_links").select("task_id").in("task_id", taskIds),
  ]);

  for (const row of crows ?? []) {
    const id = row.task_id as string;
    comments.set(id, (comments.get(id) ?? 0) + 1);
  }
  for (const row of lrows ?? []) {
    const id = row.task_id as string;
    links.set(id, (links.get(id) ?? 0) + 1);
  }
  return { comments, links };
}

function enrichTask(
  task: V2TaskRow,
  logged: Map<string, number>,
  projects: Map<
    string,
    {
      name: string;
      short_name: string | null;
      color_tint: string | null;
      color_bg: string | null;
      color_ink: string | null;
    }
  >,
  users: Map<string, string>,
  counts: { comments: Map<string, number>; links: Map<string, number> }
): V2TaskWithMeta {
  const p = task.project_id ? projects.get(task.project_id) : null;
  return {
    ...task,
    logged_seconds: logged.get(task.id) ?? 0,
    project_name: p?.name ?? null,
    project_short_name: p?.short_name ?? null,
    project_color_tint: p?.color_tint ?? null,
    project_color_bg: p?.color_bg ?? null,
    project_color_ink: p?.color_ink ?? p?.color_tint ?? null,
    assignee_name: task.assignee_user_id ? (users.get(task.assignee_user_id) ?? null) : null,
    comment_count: counts.comments.get(task.id) ?? 0,
    link_count: counts.links.get(task.id) ?? 0,
    bucket: classifyTaskBucket(task),
  };
}

export async function listTasks(
  ctx: V2SessionContext,
  opts?: {
    scope?: V2TaskScope;
    projectId?: string;
    includeCompleted?: boolean;
    activeProjectsOnly?: boolean;
  }
): Promise<V2TaskWithMeta[]> {
  const sb = getV2Supabase();
  let q = sb
    .from("v2_tasks")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .order("sort_order")
    .order("deadline_at", { ascending: true, nullsFirst: false });

  if (opts?.scope) q = q.eq("scope", opts.scope);
  if (opts?.projectId) q = q.eq("project_id", opts.projectId);
  if (!opts?.includeCompleted) {
    q = q.is("completed_at", null);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let tasks = (data ?? []) as V2TaskRow[];
  tasks = tasks.filter((t) => canViewTask(ctx, t));

  const projectIds = [...new Set(tasks.map((t) => t.project_id).filter(Boolean))] as string[];
  const projects = new Map<
    string,
    {
      name: string;
      short_name: string | null;
      color_tint: string | null;
      color_bg: string | null;
      color_ink: string | null;
      status: string;
    }
  >();
  if (projectIds.length) {
    const { data: prows } = await sb
      .from("v2_projects")
      .select("id, name, short_name, color_tint, color_bg, color_ink, status")
      .in("id", projectIds);
    for (const p of prows ?? []) {
      projects.set(p.id as string, {
        name: p.name as string,
        short_name: p.short_name as string | null,
        color_tint: p.color_tint as string | null,
        color_bg: p.color_bg as string | null,
        color_ink: (p.color_ink as string | null) ?? (p.color_tint as string | null),
        status: p.status as string,
      });
    }
  }

  if (opts?.activeProjectsOnly) {
    const active = new Set(["not_started", "in_progress", "approval"]);
    tasks = tasks.filter((t) => {
      if (!t.project_id) return true;
      const st = projects.get(t.project_id)?.status;
      return st != null && active.has(st);
    });
  }

  const users = new Map(listUsersPublic().map((u) => [u.id, u.display_name]));
  const taskIds = tasks.map((t) => t.id);
  const [logged, counts] = await Promise.all([sumLoggedSeconds(taskIds), countCommentsAndLinks(taskIds)]);
  return tasks.map((t) => enrichTask(t, logged, projects, users, counts));
}

export async function getTaskById(ctx: V2SessionContext, taskId: string): Promise<V2TaskWithMeta | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const task = data as V2TaskRow;
  if (!canViewTask(ctx, task)) return null;

  const projects = new Map<
    string,
    {
      name: string;
      short_name: string | null;
      color_tint: string | null;
      color_bg: string | null;
      color_ink: string | null;
    }
  >();
  if (task.project_id) {
    const { data: p } = await sb
      .from("v2_projects")
      .select("id, name, short_name, color_tint, color_bg, color_ink")
      .eq("id", task.project_id)
      .maybeSingle();
    if (p) {
      projects.set(p.id as string, {
        name: p.name as string,
        short_name: p.short_name as string | null,
        color_tint: p.color_tint as string | null,
        color_bg: p.color_bg as string | null,
        color_ink: (p.color_ink as string | null) ?? (p.color_tint as string | null),
      });
    }
  }
  const users = new Map(listUsersPublic().map((u) => [u.id, u.display_name]));
  const [logged, counts] = await Promise.all([
    sumLoggedSeconds([task.id]),
    countCommentsAndLinks([task.id]),
  ]);
  return enrichTask(task, logged, projects, users, counts);
}

export async function createTask(ctx: V2SessionContext, input: CreateTaskInput): Promise<V2TaskWithMeta> {
  const sb = getV2Supabase();
  const id = newV2Id();
  const ts = nowIso();
  const scope = input.scope ?? "team";

  const row: V2TaskRow = {
    id,
    workspace_id: ctx.workspaceId,
    project_id: input.projectId ?? null,
    parent_id: input.parentId ?? null,
    scope,
    title: input.title.trim(),
    description: input.description ?? null,
    status: "todo",
    priority: input.priority ?? "medium",
    assignee_user_id: input.assigneeUserId ?? ctx.userId,
    created_by: ctx.userId,
    deadline_at: input.deadlineAt ?? null,
    estimate_seconds: input.estimateSeconds ?? null,
    completed_at: null,
    sort_order: 0,
    inbox_bucket: input.inboxBucket ?? null,
    deleted_at: null,
    created_at: ts,
    updated_at: ts,
  };

  const { error } = await sb.from("v2_tasks").insert(row);
  if (error) throw new Error(error.message);

  await logActivity(ctx, "task.created", "task", id, {
    title: row.title,
    project_id: row.project_id,
    assignee_user_id: row.assignee_user_id,
  });

  const created = await getTaskById(ctx, id);
  if (!created) throw new Error("Task created but not readable");
  return created;
}

export async function createTasksBulk(
  ctx: V2SessionContext,
  titles: string[],
  defaults?: Omit<CreateTaskInput, "title">
): Promise<V2TaskWithMeta[]> {
  const out: V2TaskWithMeta[] = [];
  for (const title of titles) {
    const t = title.trim();
    if (!t) continue;
    out.push(await createTask(ctx, { ...defaults, title: t }));
  }
  return out;
}

export async function updateTask(
  ctx: V2SessionContext,
  taskId: string,
  input: UpdateTaskInput
): Promise<V2TaskWithMeta> {
  const existing = await getTaskById(ctx, taskId);
  if (!existing) throw new Error("Task not found");
  if (!canEditTask(ctx, existing)) throw new Error("Forbidden");

  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.projectId !== undefined) patch.project_id = input.projectId;
  if (input.assigneeUserId !== undefined) patch.assignee_user_id = input.assigneeUserId;
  if (input.deadlineAt !== undefined) patch.deadline_at = input.deadlineAt;
  if (input.estimateSeconds !== undefined) patch.estimate_seconds = input.estimateSeconds;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.scope !== undefined) patch.scope = input.scope;
  if (input.inboxBucket !== undefined) patch.inbox_bucket = input.inboxBucket;

  const sb = getV2Supabase();
  const { error } = await sb.from("v2_tasks").update(patch).eq("id", taskId);
  if (error) throw new Error(error.message);

  await logActivity(ctx, "task.updated", "task", taskId, { title: input.title ?? existing.title });
  const updated = await getTaskById(ctx, taskId);
  if (!updated) throw new Error("Task not found after update");
  return updated;
}

export async function completeTask(ctx: V2SessionContext, taskId: string, completed: boolean): Promise<V2TaskWithMeta> {
  const existing = await getTaskById(ctx, taskId);
  if (!existing) throw new Error("Task not found");
  if (!canEditTask(ctx, existing)) throw new Error("Forbidden");

  const sb = getV2Supabase();
  const patch = {
    completed_at: completed ? nowIso() : null,
    status: completed ? ("done" as V2TaskStatus) : ("todo" as V2TaskStatus),
    updated_at: nowIso(),
  };
  const { error } = await sb.from("v2_tasks").update(patch).eq("id", taskId);
  if (error) throw new Error(error.message);

  await logActivity(ctx, completed ? "task.completed" : "task.reopened", "task", taskId, {
    title: existing.title,
  });

  const updated = await getTaskById(ctx, taskId);
  if (!updated) throw new Error("Task not found");
  return updated;
}

export async function listKanbanTasks(
  ctx: V2SessionContext,
  opts?: { assigneeUserId?: string; projectId?: string }
): Promise<Record<V2TaskStatus, V2TaskWithMeta[]>> {
  const tasks = await listTasks(ctx, { includeCompleted: false });
  let filtered = tasks.filter((t) => !t.inbox_bucket);
  if (opts?.assigneeUserId) filtered = filtered.filter((t) => t.assignee_user_id === opts.assigneeUserId);
  if (opts?.projectId) filtered = filtered.filter((t) => t.project_id === opts.projectId);

  const columns: Record<V2TaskStatus, V2TaskWithMeta[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
  for (const t of filtered) {
    columns[t.status]?.push(t);
  }
  return columns;
}

export async function postponeIncompleteToday(ctx: V2SessionContext): Promise<number> {
  const sb = getV2Supabase();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const { data } = await sb
    .from("v2_tasks")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .is("completed_at", null)
    .is("deleted_at", null)
    .is("parent_id", null);

  let count = 0;
  for (const row of (data ?? []) as V2TaskRow[]) {
    if (!canEditTask(ctx, row)) continue;
    const bucket = classifyTaskBucket(row);
    if (bucket !== "today" && bucket !== "overdue") continue;
    await sb
      .from("v2_tasks")
      .update({ deadline_at: tomorrow.toISOString(), updated_at: nowIso(), inbox_bucket: null })
      .eq("id", row.id);
    count++;
  }
  return count;
}
