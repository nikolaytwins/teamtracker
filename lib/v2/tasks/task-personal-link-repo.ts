import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { createPersonalTodo, updatePersonalTodo } from "@/lib/v2/personal/personal-todo-repo";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import { getTaskById, completeTask } from "@/lib/v2/tasks/task-repo";
import type { V2SessionContext, V2TaskPriority, V2TaskWithMeta } from "@/lib/v2/types";

export type TaskPersonalLink = {
  id: string;
  workspace_id: string;
  project_task_id: string;
  personal_todo_id: string;
  created_by: string;
  created_at: string;
};

function mapLink(r: Record<string, unknown>): TaskPersonalLink {
  return {
    id: String(r.id),
    workspace_id: String(r.workspace_id),
    project_task_id: String(r.project_task_id),
    personal_todo_id: String(r.personal_todo_id),
    created_by: String(r.created_by),
    created_at: String(r.created_at),
  };
}

export async function getLinkByProjectTaskId(taskId: string): Promise<TaskPersonalLink | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_task_personal_links")
    .select("*")
    .eq("project_task_id", taskId)
    .maybeSingle();
  if (error) {
    console.warn("getLinkByProjectTaskId:", error.message);
    return null;
  }
  return data ? mapLink(data as Record<string, unknown>) : null;
}

export async function getLinkByPersonalTodoId(todoId: string): Promise<TaskPersonalLink | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_task_personal_links")
    .select("*")
    .eq("personal_todo_id", todoId)
    .maybeSingle();
  if (error) {
    console.warn("getLinkByPersonalTodoId:", error.message);
    return null;
  }
  return data ? mapLink(data as Record<string, unknown>) : null;
}

export async function listLinksForTaskIds(taskIds: string[]): Promise<Map<string, TaskPersonalLink>> {
  const map = new Map<string, TaskPersonalLink>();
  if (!taskIds.length) return map;
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_task_personal_links").select("*").in("project_task_id", taskIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const link = mapLink(row as Record<string, unknown>);
    map.set(link.project_task_id, link);
  }
  return map;
}

async function insertLink(
  ctx: V2SessionContext,
  projectTaskId: string,
  personalTodoId: string
): Promise<TaskPersonalLink> {
  const sb = getV2Supabase();
  const row = {
    id: newV2Id(),
    workspace_id: ctx.workspaceId,
    project_task_id: projectTaskId,
    personal_todo_id: personalTodoId,
    created_by: ctx.userId,
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_task_personal_links").insert(row);
  if (error) throw new Error(error.message);
  return mapLink(row);
}

/**
 * Дублирует задачу проекта во «Входящие» личных задач и связывает их.
 * Повторный вызов возвращает уже существующую связку.
 */
export async function cloneProjectTaskToPersonal(
  ctx: V2SessionContext,
  projectTaskId: string
): Promise<{ task: V2TaskWithMeta; personalTodo: PersonalTodoRow; link: TaskPersonalLink; created: boolean }> {
  const task = await getTaskById(ctx, projectTaskId);
  if (!task) throw new Error("Task not found");
  if (!task.project_id) throw new Error("Можно перенести только задачу проекта");

  const existing = await getLinkByProjectTaskId(projectTaskId);
  if (existing) {
    const sb = getV2Supabase();
    const { data } = await sb
      .from("v2_personal_todos")
      .select("*")
      .eq("id", existing.personal_todo_id)
      .eq("user_id", ctx.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) {
      const personalTodo = {
        id: String(data.id),
        user_id: String(data.user_id),
        project_id: data.project_id ? String(data.project_id) : null,
        parent_id: data.parent_id ? String(data.parent_id) : null,
        title: String(data.title),
        description: data.description != null ? String(data.description) : null,
        priority: (data.priority as V2TaskPriority | null) ?? null,
        due_date: data.due_date ? String(data.due_date) : null,
        due_time: data.due_time ? String(data.due_time) : null,
        scheduled_date: data.scheduled_date ? String(data.scheduled_date) : null,
        completed_at: data.completed_at ? String(data.completed_at) : null,
        sort_order: Number(data.sort_order) || 0,
      } satisfies PersonalTodoRow;
      return { task, personalTodo, link: existing, created: false };
    }
    await sb.from("v2_task_personal_links").delete().eq("id", existing.id);
  }

  const dueYmd = task.deadline_at ? task.deadline_at.slice(0, 10) : null;
  const plannedYmd = task.planned_at ? task.planned_at.slice(0, 10) : null;

  const personalTodo = await createPersonalTodo(ctx, {
    title: task.title,
    description: task.description,
    priority: task.priority ?? null,
    due_date: dueYmd,
    scheduled_date: plannedYmd ?? dueYmd,
  });

  if (task.completed_at && !personalTodo.completed_at) {
    await updatePersonalTodo(ctx, personalTodo.id, { completed_at: task.completed_at }, { skipLinkSync: true });
    personalTodo.completed_at = task.completed_at;
  }

  const link = await insertLink(ctx, projectTaskId, personalTodo.id);
  return { task, personalTodo, link, created: true };
}

/** Синхронизация completed между связанными задачами. skip — чтобы не зациклиться. */
export async function syncLinkedCompletionFromProjectTask(
  ctx: V2SessionContext,
  projectTaskId: string,
  completed: boolean,
  completedAt: string | null
): Promise<void> {
  const link = await getLinkByProjectTaskId(projectTaskId);
  if (!link) return;
  try {
    await updatePersonalTodo(
      ctx,
      link.personal_todo_id,
      { completed_at: completed ? completedAt ?? nowIso() : null },
      { skipLinkSync: true }
    );
  } catch (e) {
    console.warn(
      "syncLinkedCompletionFromProjectTask:",
      e instanceof Error ? e.message : e,
      { projectTaskId, personalTodoId: link.personal_todo_id }
    );
  }
}

export async function syncLinkedCompletionFromPersonalTodo(
  ctx: V2SessionContext,
  personalTodoId: string,
  completed: boolean
): Promise<void> {
  const link = await getLinkByPersonalTodoId(personalTodoId);
  if (!link) return;
  try {
    await completeTask(ctx, link.project_task_id, completed, { skipLinkSync: true });
  } catch (e) {
    // Не блокируем личную задачу, если связанная проектная недоступна (права / удалена).
    console.warn(
      "syncLinkedCompletionFromPersonalTodo:",
      e instanceof Error ? e.message : e,
      { personalTodoId, projectTaskId: link.project_task_id }
    );
  }
}
