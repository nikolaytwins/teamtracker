import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import {
  addDaysYmd,
  personalTodoTodayYmd,
  personalTodoWeekDates,
} from "@/lib/v2/personal/todo-date";
import type {
  PersonalTodoBootstrap,
  PersonalTodoListPayload,
  PersonalTodoProjectRow,
  PersonalTodoRow,
  PersonalTodoView,
} from "@/lib/v2/personal/todo-types";
import type { V2SessionContext, V2TaskPriority } from "@/lib/v2/types";

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

const PRIORITIES: V2TaskPriority[] = ["urgent", "high", "medium", "low"];

function normPriority(p: unknown): V2TaskPriority {
  const s = String(p ?? "medium").toLowerCase();
  return PRIORITIES.includes(s as V2TaskPriority) ? (s as V2TaskPriority) : "medium";
}

function mapProject(r: Record<string, unknown>): PersonalTodoProjectRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    name: String(r.name),
    color: String(r.color ?? "#3B6FF7"),
    icon_key: String(r.icon_key ?? "folder"),
    sort_order: Number(r.sort_order) || 0,
    is_inbox: Boolean(r.is_inbox),
    archived_at: r.archived_at ? String(r.archived_at) : null,
  };
}

function mapTodo(r: Record<string, unknown>, project?: PersonalTodoProjectRow | null): PersonalTodoRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    project_id: r.project_id ? String(r.project_id) : null,
    parent_id: r.parent_id ? String(r.parent_id) : null,
    title: String(r.title),
    description: r.description ? String(r.description) : null,
    priority: normPriority(r.priority),
    due_date: r.due_date ? String(r.due_date).slice(0, 10) : null,
    due_time: r.due_time ? String(r.due_time).slice(0, 8) : null,
    scheduled_date: r.scheduled_date ? String(r.scheduled_date).slice(0, 10) : null,
    completed_at: r.completed_at ? String(r.completed_at) : null,
    sort_order: Number(r.sort_order) || 0,
    project_name: project?.name ?? null,
    project_color: project?.color ?? null,
    subtask_count: r.subtask_count != null ? Number(r.subtask_count) : undefined,
    subtask_done: r.subtask_done != null ? Number(r.subtask_done) : undefined,
  };
}

async function loadProjectsMap(userId: string): Promise<Map<string, PersonalTodoProjectRow>> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_todo_projects")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("sort_order");
  if (error) throw error;
  return new Map((data ?? []).map((r) => [String(r.id), mapProject(r as Record<string, unknown>)]));
}

export async function ensurePersonalInboxProject(ctx: V2SessionContext): Promise<PersonalTodoProjectRow> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const { data } = await sb
    .from("v2_personal_todo_projects")
    .select("*")
    .eq("user_id", userId)
    .eq("is_inbox", true)
    .maybeSingle();
  if (data) return mapProject(data as Record<string, unknown>);

  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    name: "Входящие",
    color: "#A1A1AA",
    icon_key: "inbox",
    sort_order: -1,
    is_inbox: true,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_todo_projects").insert(row);
  if (error) throw error;
  return mapProject(row);
}

async function enrichTodos(rows: Record<string, unknown>[], projects: Map<string, PersonalTodoProjectRow>) {
  const ids = rows.map((r) => String(r.id));
  const subCounts = new Map<string, { total: number; done: number }>();
  if (ids.length) {
    const sb = getV2Supabase();
    const { data: subs } = await sb
      .from("v2_personal_todos")
      .select("parent_id, completed_at")
      .in("parent_id", ids)
      .is("deleted_at", null);
    for (const s of subs ?? []) {
      const pid = String(s.parent_id);
      const cur = subCounts.get(pid) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (s.completed_at) cur.done += 1;
      subCounts.set(pid, cur);
    }
  }
  return rows.map((r) => {
    const pid = r.project_id ? String(r.project_id) : null;
    const project = pid ? projects.get(pid) : null;
    const todo = mapTodo(r, project);
    const sc = subCounts.get(todo.id);
    if (sc) {
      todo.subtask_count = sc.total;
      todo.subtask_done = sc.done;
    }
    return todo;
  });
}

async function fetchOpenParentTodos(userId: string) {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_todos")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .is("completed_at", null)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

export async function loadPersonalTodoBootstrap(ctx: V2SessionContext): Promise<PersonalTodoBootstrap> {
  const userId = uid(ctx);
  const inbox = await ensurePersonalInboxProject(ctx);
  const projects = await loadProjectsMap(userId);
  if (!projects.has(inbox.id)) projects.set(inbox.id, inbox);

  const today = personalTodoTodayYmd();
  const sb = getV2Supabase();
  const { data: openTodos } = await sb
    .from("v2_personal_todos")
    .select("id, project_id, due_date, scheduled_date, completed_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .is("completed_at", null);

  let inboxCount = 0;
  let todayCount = 0;
  let overdue = 0;
  for (const t of openTodos ?? []) {
    const due = t.due_date ? String(t.due_date).slice(0, 10) : null;
    const sched = t.scheduled_date ? String(t.scheduled_date).slice(0, 10) : null;
    const isInbox = !due && !sched;
    if (isInbox) inboxCount += 1;
    const isOverdue = Boolean(due && due < today);
    if (isOverdue) overdue += 1;
    if (due === today || sched === today || isOverdue) todayCount += 1;
  }

  const projectList = [...projects.values()]
    .filter((p) => !p.is_inbox)
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    projects: [inbox, ...projectList],
    inboxProjectId: inbox.id,
    counts: { inbox: inboxCount, today: todayCount, overdue },
  };
}

function sortTodosForDisplay(todos: PersonalTodoRow[]): PersonalTodoRow[] {
  const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  return [...todos].sort((a, b) => {
    const pr = (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2);
    if (pr !== 0) return pr;
    return a.sort_order - b.sort_order;
  });
}

export async function loadPersonalTodoList(
  ctx: V2SessionContext,
  view: PersonalTodoView,
  opts?: { projectId?: string; from?: string; to?: string }
): Promise<PersonalTodoListPayload> {
  const userId = uid(ctx);
  const inbox = await ensurePersonalInboxProject(ctx);
  const projects = await loadProjectsMap(userId);
  const today = personalTodoTodayYmd();

  if (view === "week") {
    const dates = personalTodoWeekDates(today, 7);
    const end = dates[dates.length - 1]!;
    const rows = await fetchOpenParentTodos(userId);
    const todos = await enrichTodos(rows, projects);
    const columns: Record<string, PersonalTodoRow[]> = {};
    for (const d of dates) columns[d] = [];
    const unscheduled: PersonalTodoRow[] = [];
    for (const t of todos) {
      const due = t.due_date;
      const sched = t.scheduled_date;
      const day = sched ?? due;
      if (due && due < today) {
        columns[today]!.push(t);
      } else if (day && day >= today && day <= end && columns[day]) {
        columns[day]!.push(t);
      } else if (!sched && !due) {
        unscheduled.push(t);
      }
    }
    for (const d of dates) columns[d] = sortTodosForDisplay(columns[d] ?? []);
    return { view, todos, week: { dates, columns, unscheduled: sortTodosForDisplay(unscheduled) } };
  }

  if (view === "completed") {
    const sb = getV2Supabase();
    const { data, error } = await sb
      .from("v2_personal_todos")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .is("parent_id", null)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const todos = await enrichTodos((data ?? []) as Record<string, unknown>[], projects);
    return { view, todos };
  }

  let filtered: PersonalTodoRow[] = [];

  if (view === "inbox") {
    const rows = await fetchOpenParentTodos(userId);
    const todos = await enrichTodos(rows, projects);
    filtered = sortTodosForDisplay(
      todos.filter((t) => !t.due_date && !t.scheduled_date)
    );
  } else if (view === "today") {
    const rows = await fetchOpenParentTodos(userId);
    const todos = await enrichTodos(rows, projects);
    filtered = sortTodosForDisplay(
      todos.filter((t) => {
        const due = t.due_date;
        const sched = t.scheduled_date;
        if (sched === today || due === today) return true;
        return Boolean(due && due < today);
      })
    );
  } else if (view === "upcoming") {
    const end = addDaysYmd(today, 14);
    const rows = await fetchOpenParentTodos(userId);
    const todos = await enrichTodos(rows, projects);
    filtered = sortTodosForDisplay(
      todos.filter((t) => {
        const d = t.scheduled_date ?? t.due_date;
        return d != null && d > today && d <= end;
      })
    );
  } else if (view === "project" && opts?.projectId) {
    const rows = await fetchOpenParentTodos(userId);
    const todos = await enrichTodos(rows, projects);
    filtered = sortTodosForDisplay(todos.filter((t) => t.project_id === opts.projectId));
  }

  if (view === "upcoming") {
    const groups: PersonalTodoListPayload["groups"] = [];
    const byDate = new Map<string, PersonalTodoRow[]>();
    for (const t of filtered) {
      const d = t.scheduled_date ?? t.due_date ?? today;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(t);
    }
    for (const d of [...byDate.keys()].sort()) {
      groups.push({ date: d, label: d, todos: byDate.get(d)! });
    }
    return { view, todos: filtered, groups };
  }

  return { view, todos: filtered };
}

export async function getPersonalTodo(ctx: V2SessionContext, id: string) {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_todos")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const projects = await loadProjectsMap(uid(ctx));
  const [todo] = await enrichTodos([data as Record<string, unknown>], projects);

  const { data: subtasks } = await sb
    .from("v2_personal_todos")
    .select("*")
    .eq("parent_id", id)
    .eq("user_id", uid(ctx))
    .is("deleted_at", null)
    .order("sort_order");
  const subs = await enrichTodos((subtasks ?? []) as Record<string, unknown>[], projects);
  return { todo: todo!, subtasks: subs };
}

export async function createPersonalTodo(
  ctx: V2SessionContext,
  input: {
    title: string;
    project_id?: string | null;
    parent_id?: string | null;
    description?: string | null;
    priority?: V2TaskPriority;
    due_date?: string | null;
    due_time?: string | null;
    scheduled_date?: string | null;
  }
): Promise<PersonalTodoRow> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const inbox = await ensurePersonalInboxProject(ctx);
  const title = input.title.trim();
  if (!title) throw new Error("title required");

  let projectId = input.project_id ?? null;

  if (input.parent_id) {
    const { data: parent } = await sb
      .from("v2_personal_todos")
      .select("project_id")
      .eq("id", input.parent_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (parent?.project_id) projectId = String(parent.project_id);
  }

  if (!projectId && !input.parent_id) projectId = inbox.id;

  if (projectId) {
    const { data: p } = await sb
      .from("v2_personal_todo_projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!p) projectId = inbox.id;
  }

  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    project_id: projectId,
    parent_id: input.parent_id ?? null,
    title,
    description: input.description ?? null,
    priority: normPriority(input.priority),
    due_date: input.due_date ?? null,
    due_time: input.due_time ?? null,
    scheduled_date:
      input.scheduled_date !== undefined
        ? input.scheduled_date
        : input.due_date !== undefined
          ? input.due_date
          : null,
    completed_at: null,
    sort_order: Date.now(),
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_todos").insert(row);
  if (error) throw error;
  const projects = await loadProjectsMap(userId);
  return mapTodo(row, projectId ? projects.get(projectId) : null);
}

export async function updatePersonalTodo(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<PersonalTodoRow>
): Promise<PersonalTodoRow | null> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const safe: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.title !== undefined) {
    const title = String(patch.title).trim();
    if (!title) throw new Error("title required");
    safe.title = title;
  }
  if (patch.description !== undefined) safe.description = patch.description;
  if (patch.priority !== undefined) safe.priority = normPriority(patch.priority);
  if (patch.due_date !== undefined) safe.due_date = patch.due_date;
  if (patch.due_time !== undefined) safe.due_time = patch.due_time;
  if (patch.scheduled_date !== undefined) safe.scheduled_date = patch.scheduled_date;
  if (patch.project_id !== undefined) {
    if (patch.project_id) {
      const { data: p } = await sb
        .from("v2_personal_todo_projects")
        .select("id")
        .eq("id", patch.project_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!p) throw new Error("project not found");
    }
    safe.project_id = patch.project_id;
  }
  if (patch.sort_order !== undefined) safe.sort_order = patch.sort_order;
  if (patch.completed_at !== undefined) safe.completed_at = patch.completed_at;

  const { error } = await sb.from("v2_personal_todos").update(safe).eq("id", id).eq("user_id", userId);
  if (error) throw error;
  const detail = await getPersonalTodo(ctx, id);
  return detail?.todo ?? null;
}

export async function completePersonalTodo(ctx: V2SessionContext, id: string, completed: boolean) {
  return updatePersonalTodo(ctx, id, { completed_at: completed ? nowIso() : null });
}

export async function deletePersonalTodo(ctx: V2SessionContext, id: string) {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const now = nowIso();
  const { error } = await sb
    .from("v2_personal_todos")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  await sb
    .from("v2_personal_todos")
    .update({ deleted_at: now, updated_at: now })
    .eq("parent_id", id)
    .eq("user_id", userId);
}

export async function schedulePersonalTodo(ctx: V2SessionContext, id: string, scheduled_date: string | null) {
  if (scheduled_date) {
    return updatePersonalTodo(ctx, id, { scheduled_date, due_date: scheduled_date });
  }
  return updatePersonalTodo(ctx, id, { scheduled_date: null, due_date: null });
}

export async function listPersonalTodoProjects(ctx: V2SessionContext): Promise<PersonalTodoProjectRow[]> {
  await ensurePersonalInboxProject(ctx);
  const projects = await loadProjectsMap(uid(ctx));
  return [...projects.values()].filter((p) => !p.is_inbox && !p.archived_at).sort((a, b) => a.sort_order - b.sort_order);
}

export async function createPersonalTodoProject(
  ctx: V2SessionContext,
  input: { name: string; color?: string; icon_key?: string }
): Promise<PersonalTodoProjectRow> {
  const sb = getV2Supabase();
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: uid(ctx),
    name: input.name.trim() || "Проект",
    color: input.color ?? "#3B6FF7",
    icon_key: input.icon_key ?? "folder",
    sort_order: Date.now(),
    is_inbox: false,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_todo_projects").insert(row);
  if (error) throw error;
  return mapProject(row);
}

export async function updatePersonalTodoProject(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<PersonalTodoProjectRow>
): Promise<PersonalTodoProjectRow | null> {
  const sb = getV2Supabase();
  const safe: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.name !== undefined) safe.name = String(patch.name).trim();
  if (patch.color !== undefined) safe.color = patch.color;
  if (patch.icon_key !== undefined) safe.icon_key = patch.icon_key;
  if (patch.sort_order !== undefined) safe.sort_order = patch.sort_order;
  if (patch.archived_at !== undefined) safe.archived_at = patch.archived_at;
  const { error } = await sb
    .from("v2_personal_todo_projects")
    .update(safe)
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .eq("is_inbox", false);
  if (error) throw error;
  const { data } = await sb.from("v2_personal_todo_projects").select("*").eq("id", id).maybeSingle();
  return data ? mapProject(data as Record<string, unknown>) : null;
}

export async function deletePersonalTodoProject(ctx: V2SessionContext, id: string) {
  return updatePersonalTodoProject(ctx, id, { archived_at: nowIso() });
}

export async function getPersonalTodoProject(ctx: V2SessionContext, id: string) {
  const sb = getV2Supabase();
  const { data } = await sb
    .from("v2_personal_todo_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .maybeSingle();
  return data ? mapProject(data as Record<string, unknown>) : null;
}
