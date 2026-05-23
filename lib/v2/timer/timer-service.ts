import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { logActivity } from "@/lib/v2/activity/log";
import { getTaskById } from "@/lib/v2/tasks/task-repo";
import type { V2SessionContext, V2TimeSessionRow, V2TaskWithMeta } from "@/lib/v2/types";

export type ActiveTimerState = {
  session: V2TimeSessionRow;
  task: V2TaskWithMeta;
  elapsedSeconds: number;
};

export async function getActiveSession(ctx: V2SessionContext): Promise<ActiveTimerState | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_time_sessions")
    .select("*")
    .eq("user_id", ctx.userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const session = data as V2TimeSessionRow;
  const task = await getTaskById(ctx, session.task_id);
  if (!task) return null;

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
  );
  return { session, task, elapsedSeconds };
}

export async function startTimer(ctx: V2SessionContext, taskId: string): Promise<ActiveTimerState> {
  const task = await getTaskById(ctx, taskId);
  if (!task) throw new Error("Task not found");

  await stopActiveTimer(ctx);

  const sb = getV2Supabase();
  const session: V2TimeSessionRow = {
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    task_id: taskId,
    user_id: ctx.userId,
    started_at: nowIso(),
    ended_at: null,
    duration_seconds: null,
    is_manual: false,
    note: null,
    created_at: nowIso(),
  };

  const { error } = await sb.from("v2_time_sessions").insert(session);
  if (error) throw new Error(error.message);

  if (task.status === "todo") {
    await sb.from("v2_tasks").update({ status: "in_progress", updated_at: nowIso() }).eq("id", taskId);
  }

  await logActivity(ctx, "timer.started", "task", taskId, { title: task.title });

  const active = await getActiveSession(ctx);
  if (!active) throw new Error("Failed to start timer");
  return active;
}

export async function stopActiveTimer(ctx: V2SessionContext): Promise<V2TimeSessionRow | null> {
  const sb = getV2Supabase();
  const { data: active } = await sb
    .from("v2_time_sessions")
    .select("*")
    .eq("user_id", ctx.userId)
    .is("ended_at", null)
    .maybeSingle();
  if (!active) return null;

  const session = active as V2TimeSessionRow;
  const endedAt = nowIso();
  const durationSeconds = Math.max(
    0,
    Math.floor((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000)
  );

  const { error } = await sb
    .from("v2_time_sessions")
    .update({ ended_at: endedAt, duration_seconds: durationSeconds })
    .eq("id", session.id);
  if (error) throw new Error(error.message);

  const task = await getTaskById(ctx, session.task_id);
  await logActivity(ctx, "timer.stopped", "task", session.task_id, {
    title: task?.title,
    duration_seconds: durationSeconds,
  });

  return { ...session, ended_at: endedAt, duration_seconds: durationSeconds };
}

export type ManualSessionInput = {
  taskId: string;
  startedAt: string;
  endedAt: string;
  note?: string;
};

export async function createManualSession(
  ctx: V2SessionContext,
  input: ManualSessionInput
): Promise<V2TimeSessionRow> {
  const task = await getTaskById(ctx, input.taskId);
  if (!task) throw new Error("Task not found");

  const start = new Date(input.startedAt);
  const end = new Date(input.endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Invalid time range");
  }

  const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  const sb = getV2Supabase();
  const session: V2TimeSessionRow = {
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    task_id: input.taskId,
    user_id: ctx.userId,
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
    duration_seconds: durationSeconds,
    is_manual: true,
    note: input.note ?? null,
    created_at: nowIso(),
  };

  const { error } = await sb.from("v2_time_sessions").insert(session);
  if (error) throw new Error(error.message);

  await logActivity(ctx, "session.manual", "task", input.taskId, {
    title: task.title,
    duration_seconds: durationSeconds,
  });

  return session;
}

export async function listSessions(
  ctx: V2SessionContext,
  opts?: { taskId?: string; userId?: string; limit?: number }
): Promise<V2TimeSessionRow[]> {
  const sb = getV2Supabase();
  let q = sb
    .from("v2_time_sessions")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("started_at", { ascending: false });

  if (opts?.taskId) q = q.eq("task_id", opts.taskId);
  if (opts?.userId) q = q.eq("user_id", opts.userId);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as V2TimeSessionRow[];
}
