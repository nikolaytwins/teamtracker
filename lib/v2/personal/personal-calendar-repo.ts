import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext, V2TaskPriority } from "@/lib/v2/types";

export type PersonalCalendarItem = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  completed_at: string | null;
  priority: V2TaskPriority | null;
  category: string;
  color: string;
};

const CALENDAR_PROJECTS = [
  { name: "Курс", color: "#3B6FF7", icon_key: "book" },
  { name: "Медийка", color: "#F97316", icon_key: "spark" },
  { name: "Курс + медийка", color: "#8B5CF6", icon_key: "camera" },
] as const;

const INITIAL_DEADLINES = [
  {
    title: "Подготовительный спринт следующего модуля",
    date: "2026-07-24",
    project: "Курс",
    priority: "high",
  },
  {
    title: "Сценарий YouTube",
    date: "2026-07-24",
    project: "Медийка",
    priority: "high",
  },
  {
    title: "Общий съёмочный день: курс + YouTube",
    date: "2026-07-25",
    project: "Курс + медийка",
    priority: "urgent",
  },
  {
    title: "Второй съёмочный спринт курса",
    date: "2026-07-29",
    project: "Курс",
    priority: "high",
  },
  {
    title: "Монтаж, оформление и загрузка модуля",
    date: "2026-08-01",
    project: "Курс",
    priority: "high",
  },
] as const;

function mapItem(row: Record<string, unknown>): PersonalCalendarItem {
  return {
    id: String(row.id),
    title: String(row.title),
    date: String(row.scheduled_date ?? row.due_date).slice(0, 10),
    time: row.due_time ? String(row.due_time).slice(0, 5) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    priority: (row.priority as V2TaskPriority | null) ?? null,
    category: String(row.project_name ?? "Без категории"),
    color: String(row.project_color ?? "#A1A1AA"),
  };
}

async function ensureInitialCalendarDeadlines(ctx: V2SessionContext) {
  if (ctx.role !== "admin") return;

  const sb = getV2Supabase();
  const { data: existingProjects, error: projectsError } = await sb
    .from("v2_personal_todo_projects")
    .select("id, name")
    .eq("user_id", ctx.userId)
    .is("archived_at", null);
  if (projectsError) throw projectsError;

  const projectIds = new Map((existingProjects ?? []).map((project) => [String(project.name), String(project.id)]));
  const now = nowIso();

  for (const project of CALENDAR_PROJECTS) {
    if (projectIds.has(project.name)) continue;
    const id = newV2Id();
    const { error } = await sb.from("v2_personal_todo_projects").insert({
      id,
      user_id: ctx.userId,
      name: project.name,
      color: project.color,
      icon_key: project.icon_key,
      sort_order: Math.floor(Date.now() / 1000),
      is_inbox: false,
      archived_at: null,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    projectIds.set(project.name, id);
  }

  const { data: existingTodos, error: todosError } = await sb
    .from("v2_personal_todos")
    .select("title, due_date")
    .eq("user_id", ctx.userId)
    .in("due_date", [...new Set(INITIAL_DEADLINES.map((item) => item.date))])
    .is("deleted_at", null);
  if (todosError) throw todosError;

  const existingKeys = new Set(
    (existingTodos ?? []).map((todo) => `${String(todo.due_date).slice(0, 10)}:${String(todo.title)}`)
  );
  const rows = INITIAL_DEADLINES.filter((item) => !existingKeys.has(`${item.date}:${item.title}`)).map(
    (item, index) => ({
      id: newV2Id(),
      user_id: ctx.userId,
      project_id: projectIds.get(item.project) ?? null,
      parent_id: null,
      title: item.title,
      description: null,
      priority: item.priority,
      due_date: item.date,
      due_time: "23:59:00",
      scheduled_date: item.date,
      completed_at: null,
      sort_order: Math.floor(Date.now() / 1000) + index,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    })
  );

  if (rows.length) {
    const { error } = await sb.from("v2_personal_todos").insert(rows);
    if (error) throw error;
  }
}

export async function loadPersonalCalendar(
  ctx: V2SessionContext,
  from: string,
  to: string
): Promise<PersonalCalendarItem[]> {
  await ensureInitialCalendarDeadlines(ctx);

  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_todos")
    .select(
      "id, title, due_date, due_time, scheduled_date, completed_at, priority, project:v2_personal_todo_projects(name, color)"
    )
    .eq("user_id", ctx.userId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .or(`and(scheduled_date.gte.${from},scheduled_date.lte.${to}),and(scheduled_date.is.null,due_date.gte.${from},due_date.lte.${to})`)
    .order("scheduled_date", { ascending: true })
    .order("due_date", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const projectValue = row.project;
    const project = Array.isArray(projectValue) ? projectValue[0] : projectValue;
    return mapItem({
      ...row,
      project_name: project && typeof project === "object" && "name" in project ? project.name : null,
      project_color: project && typeof project === "object" && "color" in project ? project.color : null,
    });
  });
}
