import { getV2Supabase } from "@/lib/v2/db/client";
import { listUsersPublic } from "@/lib/tt-auth-db";
import { computeDailyTeamLoad } from "@/lib/v2/team/daily-team-load";
import { listWorkspaceMembers } from "@/lib/v2/workspace/bootstrap";
import { listProjects } from "@/lib/v2/projects/project-repo";
import {
  formatDeadlineLabel,
  formatRelativeActivity,
  gradientForUser,
  initialsFromName,
  toPortfolioMember,
} from "@/lib/v2/projects/portfolio-utils";
import { computeSpentRub, hourlyRateByUserId, projectSumRub } from "@/lib/v2/projects/project-finance";
import type {
  PortfolioHealth,
  PortfolioPayload,
  PortfolioProject,
  PortfolioTeamLoadRow,
} from "@/lib/v2/projects/portfolio-types";
import { v2StatusToKanban } from "@/lib/v2/projects/portfolio-types";
import type { V2SessionContext, V2TaskPriority, V2TaskRow } from "@/lib/v2/types";

const PRIORITY_RANK: Record<V2TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

import { resolveProjectCategoryLabel } from "@/lib/v2/projects/project-kind";

function maxPriorityFromTasks(tasks: V2TaskRow[]): V2TaskPriority {
  let best: V2TaskPriority = "low";
  let rank = 0;
  for (const t of tasks) {
    if (t.completed_at) continue;
    const r = PRIORITY_RANK[t.priority];
    if (r > rank) {
      rank = r;
      best = t.priority;
    }
  }
  return best;
}

function computeHealth(
  kanbanStatus: ReturnType<typeof v2StatusToKanban>,
  openTasks: V2TaskRow[],
  now: Date
): PortfolioHealth {
  if (kanbanStatus === "done" || kanbanStatus === "done_unpaid") return "done";
  if (kanbanStatus === "paused") return "paused";

  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let hasOverdue = false;
  let urgentSoon = false;
  let deadlineSoon = false;
  let openCount = 0;

  for (const t of openTasks) {
    openCount++;
    if (!t.deadline_at) continue;
    const d = new Date(t.deadline_at);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((target - dayStart) / 86400000);
    if (diff < 0) hasOverdue = true;
    if (diff <= 2 && (t.priority === "urgent" || t.priority === "high")) urgentSoon = true;
    if (diff <= 5) deadlineSoon = true;
  }

  if (hasOverdue || urgentSoon) return "critical";
  if (deadlineSoon && openCount > 0) {
    const done = openTasks.filter((t) => t.completed_at).length;
    const total = openTasks.length;
    if (total > 0 && done / total < 0.5) return "at_risk";
    if (deadlineSoon) return "at_risk";
  }
  return "on_track";
}

function nearestDeadline(openTasks: V2TaskRow[]): string | null {
  let best: string | null = null;
  let bestTs = Infinity;
  for (const t of openTasks) {
    if (t.completed_at || !t.deadline_at) continue;
    const ts = new Date(t.deadline_at).getTime();
    if (ts < bestTs) {
      bestTs = ts;
      best = t.deadline_at;
    }
  }
  return best;
}

export async function buildPortfolio(ctx: V2SessionContext): Promise<PortfolioPayload> {
  const sb = getV2Supabase();
  const now = new Date();
  const projects = await listProjects(ctx, { scope: "team", statusGroup: "all" });
  const projectIds = projects.map((p) => p.id);

  const publicUsers = listUsersPublic();
  const users = new Map(publicUsers.map((u) => [u.id, u.display_name]));
  const avatarByUser = new Map(publicUsers.map((u) => [u.id, u.avatar_url ?? null]));
  const rateByUser = hourlyRateByUserId(publicUsers);

  const emptyTasks: V2TaskRow[] = [];
  let allTasks: V2TaskRow[] = emptyTasks;
  if (projectIds.length) {
    const { data, error } = await sb
      .from("v2_tasks")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .is("parent_id", null);
    if (error) throw new Error(error.message);
    allTasks = (data ?? []) as V2TaskRow[];
  }

  const tasksByProject = new Map<string, V2TaskRow[]>();
  for (const t of allTasks) {
    if (!t.project_id) continue;
    const list = tasksByProject.get(t.project_id) ?? [];
    list.push(t);
    tasksByProject.set(t.project_id, list);
  }

  const taskIds = allTasks.map((t) => t.id);
  const loggedByTask = new Map<string, number>();
  const loggedByProjectUser = new Map<string, Record<string, number>>();

  if (taskIds.length) {
    const { data: sessions, error } = await sb
      .from("v2_time_sessions")
      .select("task_id, user_id, duration_seconds")
      .in("task_id", taskIds)
      .not("duration_seconds", "is", null);
    if (error) throw new Error(error.message);

    for (const row of sessions ?? []) {
      const taskId = row.task_id as string;
      const userId = row.user_id as string;
      const sec = (row.duration_seconds as number) ?? 0;
      loggedByTask.set(taskId, (loggedByTask.get(taskId) ?? 0) + sec);

      const task = allTasks.find((t) => t.id === taskId);
      if (!task?.project_id) continue;
      const map = loggedByProjectUser.get(task.project_id) ?? {};
      map[userId] = (map[userId] ?? 0) + sec / 3600;
      loggedByProjectUser.set(task.project_id, map);
    }
  }

  const commentCountByProject = new Map<string, number>();
  if (taskIds.length) {
    const { data: comments, error } = await sb.from("v2_task_comments").select("task_id").in("task_id", taskIds);
    if (error) throw new Error(error.message);
    const taskToProject = new Map(allTasks.map((t) => [t.id, t.project_id]));
    for (const row of comments ?? []) {
      const pid = taskToProject.get(row.task_id as string);
      if (!pid) continue;
      commentCountByProject.set(pid, (commentCountByProject.get(pid) ?? 0) + 1);
    }
  }

  const membersByProject = new Map<string, string[]>();
  if (projectIds.length) {
    const { data, error } = await sb.from("v2_project_members").select("project_id, user_id").in("project_id", projectIds);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const pid = row.project_id as string;
      const list = membersByProject.get(pid) ?? [];
      list.push(row.user_id as string);
      membersByProject.set(pid, list);
    }
  }

  const portfolioProjects: PortfolioProject[] = projects.map((p) => {
    const tasks = tasksByProject.get(p.id) ?? [];
    const openTasks = tasks.filter((t) => !t.completed_at);
    const tasksDone = tasks.filter((t) => t.completed_at).length;
    const tasksTotal = tasks.length;
    const kanbanStatus = v2StatusToKanban(p.status);
    const health = computeHealth(kanbanStatus, openTasks, now);
    const priority = p.priority ?? maxPriorityFromTasks(tasks);
    const deadlineAt = nearestDeadline(openTasks);
    const { label: deadline, days: deadlineDays } = formatDeadlineLabel(deadlineAt, now);

    const budget = projectSumRub(p.budget_rub);

    const hoursByMember = loggedByProjectUser.get(p.id) ?? {};
    let loggedHours = 0;
    for (const h of Object.values(hoursByMember)) loggedHours += h;
    const spent = computeSpentRub(hoursByMember, rateByUser);

    const memberIds = membersByProject.get(p.id) ?? [];
    const team = memberIds.map((userId) =>
      toPortfolioMember(userId, users.get(userId) ?? userId, avatarByUser.get(userId))
    );

    let lastActivityAt = p.updated_at;
    for (const t of tasks) {
      if (t.updated_at > lastActivityAt) lastActivityAt = t.updated_at;
    }

    const completedAt =
      p.status === "completed" || p.status === "completed_unpaid"
        ? tasks.reduce<string | null>((best, t) => {
            if (!t.completed_at) return best;
            if (!best || t.completed_at > best) return t.completed_at;
            return best;
          }, null) ?? p.updated_at
        : null;

    return {
      id: p.id,
      name: p.name,
      shortName: p.short_name,
      colorTint: p.color_tint,
      colorBg: p.color_bg,
      colorInk: p.color_ink ?? p.color_tint,
      category: resolveProjectCategoryLabel(p),
      engagementType: p.engagement_type,
      status: kanbanStatus,
      v2Status: p.status,
      health,
      priority,
      deadline,
      deadlineDays,
      deadlineAt,
      team,
      tasksDone,
      tasksTotal,
      budget: Math.round(budget),
      spent: Math.round(spent),
      loggedHours: Math.round(loggedHours * 10) / 10,
      hoursByMember,
      lastActivity: formatRelativeActivity(lastActivityAt, now),
      lastActivityAt,
      unread: commentCountByProject.get(p.id) ?? 0,
      pauseReason: p.status === "paused" ? "Проект приостановлен" : undefined,
      updatedAt: p.updated_at,
      completedAt,
    };
  });

  const activeStatuses = new Set(["not_started", "in_progress", "review", "paused"]);
  const active = portfolioProjects.filter((p) => activeStatuses.has(p.status));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const doneThisMonth = portfolioProjects.filter(
    (p) =>
      p.status === "done" &&
      p.completedAt &&
      new Date(p.completedAt) >= monthStart
  ).length;

  let loadTasks: V2TaskRow[] = [];
  {
    const { data, error } = await sb
      .from("v2_tasks")
      .select("id, assignee_user_id, estimate_seconds, completed_at, planned_at, deadline_at, inbox_bucket")
      .eq("workspace_id", ctx.workspaceId)
      .eq("scope", "team")
      .is("deleted_at", null)
      .is("completed_at", null)
      .not("assignee_user_id", "is", null);
    if (error) throw new Error(error.message);
    loadTasks = (data ?? []) as V2TaskRow[];
  }

  const scheduleById = new Map(publicUsers.map((u) => [u.id, u]));
  const wsMembers = await listWorkspaceMembers();
  const teamMembers = wsMembers
    .filter((m) => m.role !== "client")
    .map((m) => {
      const u = scheduleById.get(m.user_id);
      return {
        userId: m.user_id,
        name: m.display_name,
        workHoursPerDay: u?.work_hours_per_day ?? 8,
        workDays: u?.work_days ?? [1, 2, 3, 4, 5],
        avatarUrl: u?.avatar_url ?? null,
      };
    });

  const teamLoad: PortfolioTeamLoadRow[] = computeDailyTeamLoad(teamMembers, loadTasks, now)
    .filter((r) => r.isWorkDay || r.taskCount > 0)
    .slice(0, 6);

  const kpis = {
    inProgress: portfolioProjects.filter((p) => p.status === "in_progress").length,
    review: portfolioProjects.filter((p) => p.status === "review").length,
    notStarted: portfolioProjects.filter((p) => p.status === "not_started").length,
    atRisk: portfolioProjects.filter((p) => p.health === "at_risk" || p.health === "critical").length,
    critical: portfolioProjects.filter((p) => p.health === "critical").length,
    paused: portfolioProjects.filter((p) => p.status === "paused").length,
    active: active.length,
    doneThisMonth,
  };

  return { projects: portfolioProjects, teamLoad, kpis };
}
