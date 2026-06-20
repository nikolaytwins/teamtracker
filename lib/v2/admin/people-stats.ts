import { getV2Supabase } from "@/lib/v2/db/client";
import { computeCompensation, normalizePayType, type TtPayType } from "@/lib/v2/admin/compensation";
import { listUsersPublic } from "@/lib/tt-auth-db";
import { computeDailyTeamLoad } from "@/lib/v2/team/daily-team-load";
import { listWorkspaceMembers } from "@/lib/v2/workspace/bootstrap";
import { localDayBoundsFromYmd, sessionSecondsInRange } from "@/lib/v2/timer/session-duration";
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
  payType: TtPayType;
  hourlyRateRub: number | null;
  monthlySalaryRub: number | null;
  monthlyPaidRub: number | null;
  workHoursPerDay: number;
  workDays: number[];
  todayLoad: number;
  todayTaskCount: number;
  todayEstimatedSeconds: number;
  todayCapacitySeconds: number;
  isWorkDayToday: boolean;
  weeks: WeekSegment[];
  totalLoggedSeconds: number;
  monthLoggedSeconds: number;
  monthCostRub: number | null;
  effectiveHourlyRub: number | null;
};

export type MonthProjectBreakdown = {
  projectId: string | null;
  projectName: string;
  loggedSeconds: number;
};

export type UserMonthStats = {
  userId: string;
  month: string;
  loggedSeconds: number;
  payType: TtPayType;
  hourlyRateRub: number | null;
  monthlySalaryRub: number | null;
  monthlyPaidRub: number | null;
  monthCostRub: number | null;
  effectiveHourlyRub: number | null;
  byProject: MonthProjectBreakdown[];
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

function monthBounds(ym: string): { start: Date; end: Date } {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

function currentMonthYmd(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

type SessionRow = {
  user_id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
};

async function fetchOverlappingSessions(
  workspaceId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<SessionRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_time_sessions")
    .select("user_id, task_id, started_at, ended_at, duration_seconds")
    .eq("workspace_id", workspaceId)
    .lte("started_at", rangeEnd.toISOString())
    .or(`ended_at.is.null,ended_at.gte.${rangeStart.toISOString()}`);
  if (error) throw new Error(error.message);
  return (data ?? []) as SessionRow[];
}

function sumUserSecondsInRange(
  sessions: SessionRow[],
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
  now: Date
): number {
  let total = 0;
  for (const s of sessions) {
    if (s.user_id !== userId) continue;
    total += sessionSecondsInRange(s, rangeStart, rangeEnd, now);
  }
  return total;
}

export async function getPeopleOverview(ctx: V2SessionContext, weeksCount = 6): Promise<PeopleOverviewRow[]> {
  const members = await listWorkspaceMembers();
  const publicUsers = listUsersPublic();
  const userById = new Map(publicUsers.map((u) => [u.id, u]));

  const now = new Date();
  const endMonday = mondayOf(now);
  const weekStarts: Date[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    weekStarts.push(addDays(endMonday, -7 * i));
  }
  const rangeStart = weekStarts[0]!;
  const rangeEnd = addDays(weekStarts[weekStarts.length - 1]!, 7);
  const monthYm = currentMonthYmd();
  const monthRange = monthBounds(monthYm);

  const [sessions, { data: taskRows, error: taskErr }] = await Promise.all([
    fetchOverlappingSessions(ctx.workspaceId, rangeStart, rangeEnd),
    getV2Supabase()
      .from("v2_tasks")
      .select("id, assignee_user_id, estimate_seconds, completed_at, planned_at, deadline_at, inbox_bucket")
      .eq("workspace_id", ctx.workspaceId)
      .eq("scope", "team")
      .is("deleted_at", null)
      .is("completed_at", null)
      .not("assignee_user_id", "is", null),
  ]);
  if (taskErr) throw new Error(taskErr.message);

  const monthSessions = await fetchOverlappingSessions(ctx.workspaceId, monthRange.start, monthRange.end);

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
    const payType = normalizePayType(u?.pay_type);
    const hourlyRateRub = u?.hourly_rate_rub ?? null;
    const monthlySalaryRub = u?.monthly_salary_rub ?? null;
    const monthlyPaidRub = u?.monthly_paid_rub ?? null;

    const weeks: WeekSegment[] = weekStarts.map((ws) => {
      const we = addDays(ws, 7);
      const logged = sumUserSecondsInRange(sessions, m.user_id, ws, we, now);
      let status: WeekSegment["status"] = "ok";
      if (logged < normSec * 0.85) status = "under";
      else if (logged > normSec * 1.05) status = "over";
      return { weekStart: toYmd(ws), loggedSeconds: logged, normSeconds: normSec, status };
    });

    const totalLoggedSeconds = weeks.reduce((a, w) => a + w.loggedSeconds, 0);
    const monthLoggedSeconds = sumUserSecondsInRange(
      monthSessions,
      m.user_id,
      monthRange.start,
      monthRange.end,
      now
    );
    const comp = computeCompensation({
      payType,
      hourlyRateRub,
      monthlySalaryRub,
      monthlyPaidRub,
      loggedSeconds: monthLoggedSeconds,
    });

    const load = loadByUser.get(m.user_id);
    rows.push({
      userId: m.user_id,
      displayName: m.display_name,
      jobTitle: m.job_title,
      weeklyHoursNorm: m.weekly_hours_norm,
      payType,
      hourlyRateRub,
      monthlySalaryRub,
      monthlyPaidRub,
      workHoursPerDay: u?.work_hours_per_day ?? 8,
      workDays: u?.work_days ?? [1, 2, 3, 4, 5],
      todayLoad: load?.load ?? 0,
      todayTaskCount: load?.taskCount ?? 0,
      todayEstimatedSeconds: load?.estimatedSeconds ?? 0,
      todayCapacitySeconds: load?.capacitySeconds ?? 0,
      isWorkDayToday: load?.isWorkDay ?? false,
      weeks,
      totalLoggedSeconds,
      monthLoggedSeconds,
      monthCostRub: comp.monthCostRub,
      effectiveHourlyRub: comp.effectiveHourlyRub,
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
    duration_seconds: number;
    task_title: string;
    project_name: string | null;
  }>
> {
  const sb = getV2Supabase();
  const { start, end } = localDayBoundsFromYmd(dateYmd);
  const now = new Date();

  const { data, error } = await sb
    .from("v2_time_sessions")
    .select("id, started_at, ended_at, duration_seconds, task_id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", userId)
    .lte("started_at", end.toISOString())
    .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`)
    .order("started_at");
  if (error) throw new Error(error.message);

  const out = [];
  for (const s of data ?? []) {
    const seconds = sessionSecondsInRange(
      {
        started_at: s.started_at as string,
        ended_at: s.ended_at as string | null,
        duration_seconds: s.duration_seconds as number | null,
      },
      start,
      end,
      now
    );
    if (seconds <= 0) continue;

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
      duration_seconds: seconds,
      task_title: (task?.title as string) ?? "—",
      project_name,
    });
  }
  return out;
}

export async function getUserMonthStats(
  ctx: V2SessionContext,
  userId: string,
  monthYm?: string
): Promise<UserMonthStats> {
  const ym = monthYm ?? currentMonthYmd();
  const { start, end } = monthBounds(ym);
  const now = new Date();
  const sb = getV2Supabase();

  const u = listUsersPublic().find((x) => x.id === userId);
  const payType = normalizePayType(u?.pay_type);
  const hourlyRateRub = u?.hourly_rate_rub ?? null;
  const monthlySalaryRub = u?.monthly_salary_rub ?? null;
  const monthlyPaidRub = u?.monthly_paid_rub ?? null;

  const sessions = await fetchOverlappingSessions(ctx.workspaceId, start, end);
  const userSessions = sessions.filter((s) => s.user_id === userId);

  const taskIds = [...new Set(userSessions.map((s) => s.task_id))];
  const taskProject = new Map<string, { title: string; project_id: string | null }>();
  if (taskIds.length) {
    const { data: tasks } = await sb.from("v2_tasks").select("id, title, project_id").in("id", taskIds);
    for (const t of tasks ?? []) {
      taskProject.set(t.id as string, {
        title: t.title as string,
        project_id: t.project_id as string | null,
      });
    }
  }

  const projectIds = [...new Set([...taskProject.values()].map((t) => t.project_id).filter(Boolean))] as string[];
  const projectNames = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects } = await sb.from("v2_projects").select("id, name").in("id", projectIds);
    for (const p of projects ?? []) {
      projectNames.set(p.id as string, p.name as string);
    }
  }

  const byProjectMap = new Map<string | null, number>();
  let loggedSeconds = 0;

  for (const s of userSessions) {
    const sec = sessionSecondsInRange(s, start, end, now);
    if (sec <= 0) continue;
    loggedSeconds += sec;
    const task = taskProject.get(s.task_id);
    const pid = task?.project_id ?? null;
    byProjectMap.set(pid, (byProjectMap.get(pid) ?? 0) + sec);
  }

  const byProject: MonthProjectBreakdown[] = [...byProjectMap.entries()]
    .map(([projectId, sec]) => ({
      projectId,
      projectName: projectId ? (projectNames.get(projectId) ?? "Проект") : "Без проекта",
      loggedSeconds: sec,
    }))
    .sort((a, b) => b.loggedSeconds - a.loggedSeconds);

  const comp = computeCompensation({
    payType,
    hourlyRateRub,
    monthlySalaryRub,
    monthlyPaidRub,
    loggedSeconds,
  });

  return {
    userId,
    month: ym,
    loggedSeconds,
    payType,
    hourlyRateRub,
    monthlySalaryRub,
    monthlyPaidRub,
    monthCostRub: comp.monthCostRub,
    effectiveHourlyRub: comp.effectiveHourlyRub,
    byProject,
  };
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
