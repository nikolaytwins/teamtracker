import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { canViewTask } from "@/lib/v2/auth/permissions";
import { listUsersPublic } from "@/lib/tt-auth-db";
import type { V2SessionContext, V2TaskRow } from "@/lib/v2/types";

export type WeekTask = V2TaskRow & {
  project_name: string | null;
  project_color_tint: string | null;
  project_color_bg: string | null;
  assignee_name: string | null;
  scheduled_dates: string[];
};

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toYmd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekDatesFrom(start: Date = new Date()): string[] {
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(start, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => toYmd(addDays(monday, i)));
}

export async function getWeekBoard(
  ctx: V2SessionContext,
  startDate?: string
): Promise<{ dates: string[]; columns: Record<string, WeekTask[]>; unscheduled: WeekTask[] }> {
  const start = startDate ? new Date(startDate + "T12:00:00") : new Date();
  const dates = weekDatesFrom(start);
  const sb = getV2Supabase();

  const { data: tasks, error } = await sb
    .from("v2_tasks")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .is("completed_at", null)
    .is("inbox_bucket", null);
  if (error) throw new Error(error.message);

  const visible = ((tasks ?? []) as V2TaskRow[]).filter((t) => canViewTask(ctx, t));
  const ids = visible.map((t) => t.id);

  const scheduleMap = new Map<string, string[]>();
  if (ids.length) {
    const { data: sched } = await sb.from("v2_task_scheduled_days").select("*").in("task_id", ids);
    for (const row of sched ?? []) {
      const tid = row.task_id as string;
      const d = row.scheduled_date as string;
      if (!scheduleMap.has(tid)) scheduleMap.set(tid, []);
      scheduleMap.get(tid)!.push(d);
    }
  }

  const projectIds = [...new Set(visible.map((t) => t.project_id).filter(Boolean))] as string[];
  const projects = new Map<string, { name: string; color_tint: string | null; color_bg: string | null }>();
  if (projectIds.length) {
    const { data: prows } = await sb
      .from("v2_projects")
      .select("id, name, color_tint, color_bg")
      .in("id", projectIds);
    for (const p of prows ?? []) {
      projects.set(p.id as string, {
        name: p.name as string,
        color_tint: p.color_tint as string | null,
        color_bg: p.color_bg as string | null,
      });
    }
  }
  const users = new Map(listUsersPublic().map((u) => [u.id, u.display_name]));

  const enrich = (t: V2TaskRow): WeekTask => {
    const p = t.project_id ? projects.get(t.project_id) : null;
    let scheduled = scheduleMap.get(t.id) ?? [];
    if (scheduled.length === 0 && t.deadline_at) {
      scheduled = [toYmd(new Date(t.deadline_at))];
    }
    return {
      ...t,
      project_name: p?.name ?? null,
      project_color_tint: p?.color_tint ?? null,
      project_color_bg: p?.color_bg ?? null,
      assignee_name: t.assignee_user_id ? (users.get(t.assignee_user_id) ?? null) : null,
      scheduled_dates: scheduled,
    };
  };

  const columns: Record<string, WeekTask[]> = Object.fromEntries(dates.map((d) => [d, []]));
  const unscheduled: WeekTask[] = [];

  for (const t of visible) {
    const wt = enrich(t);
    const inWeek = wt.scheduled_dates.filter((d) => dates.includes(d));
    if (inWeek.length === 0) {
      unscheduled.push(wt);
      continue;
    }
    for (const d of inWeek) {
      columns[d]!.push(wt);
    }
  }

  return { dates, columns, unscheduled };
}

export async function scheduleTaskOnDate(taskId: string, date: string): Promise<void> {
  const sb = getV2Supabase();
  await sb.from("v2_task_scheduled_days").upsert(
    { task_id: taskId, scheduled_date: date, created_at: nowIso() },
    { onConflict: "task_id,scheduled_date" }
  );
}

export async function unscheduleTaskFromDate(taskId: string, date: string): Promise<void> {
  const sb = getV2Supabase();
  await sb.from("v2_task_scheduled_days").delete().eq("task_id", taskId).eq("scheduled_date", date);
}
