import { getV2Supabase } from "@/lib/v2/db/client";
import { listUsersPublic } from "@/lib/tt-auth-db";
import { computeDailyTeamLoad } from "@/lib/v2/team/daily-team-load";
import { listWorkspaceMembers } from "@/lib/v2/workspace/bootstrap";
import type { V2SessionContext, V2TaskRow } from "@/lib/v2/types";

export type WeekSegment = {
  weekStart: string;
  loggedSeconds: number;
  normSeconds: number;
  status: "ok" | "under" | "over";
};

export type PeopleOverviewRow = {
  userId: string;
  displayName: string;
  jobTitle: string;
  weeklyHoursNorm: number;
  hourlyRateRub: number | null;
  workHoursPerDay: number;
  workDays: number[];
  todayLoad: number;
  todayTaskCount: number;
  todayEstimatedSeconds: number;
  todayCapacitySeconds: number;
  isWorkDayToday: boolean;
  weeks: WeekSegment[];
  totalLoggedSeconds: number;
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

function mondayOf(d: Date): Date {
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(d, offset);
}

export async function getPeopleOverview(ctx: V2SessionContext, weeksCount = 6): Promise<PeopleOverviewRow[]> {
  const members = await listWorkspaceMembers();
  const publicUsers = listUsersPublic();
  const userById = new Map(publicUsers.map((u) => [u.id, u]));
  const sb = getV2Supabase();

  const now = new Date();
  const endMonday = mondayOf(now);
  const weekStarts: Date[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    weekStarts.push(addDays(endMonday, -7 * i));
  }
  const rangeStart = weekStarts[0]!;
  const rangeEnd = addDays(weekStarts[weekStarts.length - 1]!, 7);

  const [{ data: sessions, error }, { data: taskRows, error: taskErr }] = await Promise.all([
    sb
      .from("v2_time_sessions")
      .select("user_id, duration_seconds, started_at, ended_at")
      .eq("workspace_id", ctx.workspaceId)
      .gte("started_at", rangeStart.toISOString())
      .lt("started_at", rangeEnd.toISOString()),
    sb
      .from("v2_tasks")
      .select("id, assignee_user_id, estimate_seconds, completed_at, planned_at, deadline_at, inbox_bucket")
      .eq("workspace_id", ctx.workspaceId)
      .eq("scope", "team")
      .is("deleted_at", null)
      .is("completed_at", null)
      .not("assignee_user_id", "is", null),
  ]);
  if (error) throw new Error(error.message);
  if (taskErr) throw new Error(taskErr.message);

  const teamMembers = members
    .filter((m) => m.role !== "client")
    .map((m) => {
      const u = userById.get(m.user_id);
      return {
        userId: m.user_id,
        name: m.display_name,
        workHoursPerDay: u?.work_hours_per_day ?? 8,
        workDays: u?.work_days ?? [1, 2, 3, 4, 5],
      };
    });

  const loadByUser = new Map(
    computeDailyTeamLoad(teamMembers, (taskRows ?? []) as V2TaskRow[], now).map((r) => [r.userId, r])
  );

  const rows: PeopleOverviewRow[] = [];

  for (const m of members.filter((x) => x.role !== "client")) {
    const u = userById.get(m.user_id);
    const normSec = (m.weekly_hours_norm ?? 40) * 3600;
    const weeks: WeekSegment[] = weekStarts.map((ws) => {
      const we = addDays(ws, 7);
      let logged = 0;
      for (const s of sessions ?? []) {
        if (s.user_id !== m.user_id) continue;
        const t = new Date(s.started_at as string);
        if (t >= ws && t < we) {
          logged += (s.duration_seconds as number) ?? 0;
        }
      }
      let status: WeekSegment["status"] = "ok";
      if (logged < normSec * 0.85) status = "under";
      else if (logged > normSec * 1.05) status = "over";
      return { weekStart: toYmd(ws), loggedSeconds: logged, normSeconds: normSec, status };
    });

    const totalLoggedSeconds = weeks.reduce((a, w) => a + w.loggedSeconds, 0);
    const load = loadByUser.get(m.user_id);
    rows.push({
      userId: m.user_id,
      displayName: m.display_name,
      jobTitle: m.job_title,
      weeklyHoursNorm: m.weekly_hours_norm,
      hourlyRateRub: u?.hourly_rate_rub ?? null,
      workHoursPerDay: u?.work_hours_per_day ?? 8,
      workDays: u?.work_days ?? [1, 2, 3, 4, 5],
      todayLoad: load?.load ?? 0,
      todayTaskCount: load?.taskCount ?? 0,
      todayEstimatedSeconds: load?.estimatedSeconds ?? 0,
      todayCapacitySeconds: load?.capacitySeconds ?? 0,
      isWorkDayToday: load?.isWorkDay ?? false,
      weeks,
      totalLoggedSeconds,
    });
  }

  rows.sort((a, b) => {
    if (a.isWorkDayToday !== b.isWorkDayToday) return a.isWorkDayToday ? -1 : 1;
    return b.todayLoad - a.todayLoad;
  });

  return rows;
}

export async function getUserDaySessions(
  ctx: V2SessionContext,
  userId: string,
  dateYmd: string
): Promise<
  Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    task_title: string;
    project_name: string | null;
  }>
> {
  const sb = getV2Supabase();
  const start = `${dateYmd}T00:00:00.000Z`;
  const end = `${dateYmd}T23:59:59.999Z`;

  const { data, error } = await sb
    .from("v2_time_sessions")
    .select("id, started_at, ended_at, duration_seconds, task_id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", userId)
    .gte("started_at", start)
    .lte("started_at", end)
    .order("started_at");
  if (error) throw new Error(error.message);

  const out = [];
  for (const s of data ?? []) {
    const { data: task } = await sb
      .from("v2_tasks")
      .select("title, project_id")
      .eq("id", s.task_id as string)
      .maybeSingle();
    let project_name: string | null = null;
    if (task?.project_id) {
      const { data: p } = await sb.from("v2_projects").select("name").eq("id", task.project_id).maybeSingle();
      project_name = (p?.name as string) ?? null;
    }
    out.push({
      id: s.id as string,
      started_at: s.started_at as string,
      ended_at: s.ended_at as string | null,
      duration_seconds: s.duration_seconds as number | null,
      task_title: (task?.title as string) ?? "—",
      project_name,
    });
  }
  return out;
}

export async function getAdminDashboard(ctx: V2SessionContext) {
  const sb = getV2Supabase();
  const [{ count: activeProjects }, { count: openTasks }, { count: overdueTasks }] = await Promise.all([
    sb
      .from("v2_projects")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId)
      .in("status", ["in_progress", "approval"]),
    sb
      .from("v2_tasks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId)
      .is("completed_at", null)
      .is("deleted_at", null),
    sb
      .from("v2_tasks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId)
      .is("completed_at", null)
      .is("deleted_at", null)
      .lt("deadline_at", new Date().toISOString()),
  ]);

  return {
    activeProjects: activeProjects ?? 0,
    openTasks: openTasks ?? 0,
    overdueTasks: overdueTasks ?? 0,
  };
}
