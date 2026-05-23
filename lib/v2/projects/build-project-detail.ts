import { getV2Supabase } from "@/lib/v2/db/client";
import { formatActivityMessage, listRecentActivity } from "@/lib/v2/activity/log";
import { listUsersPublic } from "@/lib/tt-auth-db";
import {
  DEFAULT_HOURLY_RATE,
  formatDeadlineLabel,
  formatRelativeActivity,
  gradientForUser,
  initialsFromName,
  pluralRu,
} from "@/lib/v2/projects/portfolio-utils";
import type { PortfolioHealth } from "@/lib/v2/projects/portfolio-types";
import { v2StatusToKanban } from "@/lib/v2/projects/portfolio-types";
import { listProjectFiles, listProjectLinks } from "@/lib/v2/projects/project-assets-repo";
import { listProjectPhases } from "@/lib/v2/projects/project-phases-repo";
import type {
  ProjectDetailActivity,
  ProjectDetailPhase,
  ProjectDetailPayload,
  ProjectDetailSubtask,
  ProjectDetailTask,
} from "@/lib/v2/projects/project-detail-types";
import { getProjectById } from "@/lib/v2/projects/project-repo";
import { canCreateProjectTask, canManageProjectMembers } from "@/lib/v2/auth/permissions";
import {
  currentWorkMonth,
  formatWorkMonthLabel,
  normalizeWorkMonth,
  workMonthsBetween,
} from "@/lib/v2/projects/retainer-utils";
import type { V2SessionContext, V2TaskPriority, V2TaskRow, V2TaskStatus } from "@/lib/v2/types";

const PRIORITY_RANK: Record<V2TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/лендинг/i, "Лендинг"],
  [/бренд/i, "Брендинг"],
  [/моушн|анимац/i, "Моушн"],
  [/продукт|onboarding|чек.?аут/i, "Продукт"],
];

function inferCategory(name: string): string {
  for (const [re, label] of CATEGORY_KEYWORDS) {
    if (re.test(name)) return label;
  }
  return "Проект";
}

function formatBytes(n: number | null): string {
  if (n == null || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} MB`;
  if (n >= 1000) return `${Math.round(n / 1000)} KB`;
  return `${n} B`;
}

function formatDueLabel(deadlineAt: string | null, now = new Date()): string {
  if (!deadlineAt) return "—";
  return formatDeadlineLabel(deadlineAt, now).label;
}

function formatPlannedLabel(plannedAt: string | null, now = new Date()): string {
  if (!plannedAt) return "—";
  return formatDeadlineLabel(plannedAt, now).label;
}

function mapTaskStatusToUi(status: V2TaskStatus): string {
  if (status === "todo") return "not_started";
  return status;
}

function computeHealth(
  projectStatus: string,
  openTasks: V2TaskRow[],
  now: Date
): PortfolioHealth {
  if (projectStatus === "completed") return "done";
  if (projectStatus === "paused") return "paused";
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  for (const t of openTasks) {
    if (!t.deadline_at) continue;
    const d = new Date(t.deadline_at);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((target - dayStart) / 86400000);
    if (diff < 0 || (diff <= 2 && (t.priority === "urgent" || t.priority === "high"))) return "critical";
  }
  for (const t of openTasks) {
    if (!t.deadline_at) continue;
    const d = new Date(t.deadline_at);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (Math.round((target - dayStart) / 86400000) <= 5) return "at_risk";
  }
  return "on_track";
}

function maxPriority(tasks: V2TaskRow[]): V2TaskPriority {
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

function activityTone(action: string): ProjectDetailActivity["tone"] {
  if (action.includes("comment")) return "comment";
  if (action.includes("timer") || action.includes("session")) return "timer";
  if (action.includes("completed")) return "done";
  if (action.includes("review")) return "review";
  return "edit";
}

export async function buildProjectDetail(
  ctx: V2SessionContext,
  projectId: string,
  opts?: { workMonth?: string }
): Promise<ProjectDetailPayload | null> {
  const project = await getProjectById(ctx, projectId);
  if (!project) return null;

  const sb = getV2Supabase();
  const now = new Date();
  const users = new Map(listUsersPublic().map((u) => [u.id, u.display_name]));
  const isRetainer = project.engagement_type === "retainer";
  const selectedWorkMonth = isRetainer
    ? normalizeWorkMonth(opts?.workMonth ?? currentWorkMonth(now))
    : null;

  let taskQuery = sb
    .from("v2_tasks")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("created_at");
  if (isRetainer && selectedWorkMonth) {
    taskQuery = taskQuery.eq("work_month", selectedWorkMonth);
  }
  const { data: taskRows, error: taskErr } = await taskQuery;
  if (taskErr) throw new Error(taskErr.message);

  const allTasks = (taskRows ?? []) as V2TaskRow[];
  const parentTasks = allTasks.filter((t) => !t.parent_id);
  const subtasksByParent = new Map<string, V2TaskRow[]>();
  for (const t of allTasks) {
    if (!t.parent_id) continue;
    const list = subtasksByParent.get(t.parent_id) ?? [];
    list.push(t);
    subtasksByParent.set(t.parent_id, list);
  }

  const taskIds = allTasks.map((t) => t.id);
  const loggedByTask = new Map<string, number>();
  const hoursTodayByUser = new Map<string, number>();
  const hoursByUser = new Map<string, number>();

  if (taskIds.length) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { data: sessions } = await sb
      .from("v2_time_sessions")
      .select("task_id, user_id, duration_seconds, started_at, ended_at")
      .in("task_id", taskIds);

    for (const row of sessions ?? []) {
      const taskId = row.task_id as string;
      const userId = row.user_id as string;
      let sec = row.duration_seconds as number | null;
      if (sec == null && row.ended_at == null) {
        sec = Math.max(0, Math.floor((now.getTime() - new Date(row.started_at as string).getTime()) / 1000));
      }
      loggedByTask.set(taskId, (loggedByTask.get(taskId) ?? 0) + (sec ?? 0));
      const h = (sec ?? 0) / 3600;
      hoursByUser.set(userId, (hoursByUser.get(userId) ?? 0) + h);
      if (new Date(row.started_at as string) >= todayStart) {
        hoursTodayByUser.set(userId, (hoursTodayByUser.get(userId) ?? 0) + h);
      }
    }
  }

  const commentCount = new Map<string, number>();
  const linkCount = new Map<string, number>();
  if (taskIds.length) {
    const [{ data: comments }, { data: links }] = await Promise.all([
      sb.from("v2_task_comments").select("task_id").in("task_id", taskIds),
      sb.from("v2_task_links").select("task_id").in("task_id", taskIds),
    ]);
    for (const c of comments ?? []) commentCount.set(c.task_id as string, (commentCount.get(c.task_id as string) ?? 0) + 1);
    for (const l of links ?? []) linkCount.set(l.task_id as string, (linkCount.get(l.task_id as string) ?? 0) + 1);
  }

  function mapSubtask(t: V2TaskRow): ProjectDetailSubtask {
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assigneeUserId: t.assignee_user_id,
      assigneeName: t.assignee_user_id ? (users.get(t.assignee_user_id) ?? null) : null,
      plannedAt: t.planned_at,
      plannedLabel: formatPlannedLabel(t.planned_at, now),
      deadlineLabel: formatDueLabel(t.deadline_at, now),
      completedAt: t.completed_at,
      estimateHours: t.estimate_seconds ? t.estimate_seconds / 3600 : 0,
      loggedHours: Math.round(((loggedByTask.get(t.id) ?? 0) / 3600) * 10) / 10,
      commentCount: commentCount.get(t.id) ?? 0,
      linkCount: linkCount.get(t.id) ?? 0,
    };
  }

  function mapTask(t: V2TaskRow): ProjectDetailTask {
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assigneeUserId: t.assignee_user_id,
      assigneeName: t.assignee_user_id ? (users.get(t.assignee_user_id) ?? null) : null,
      plannedAt: t.planned_at,
      plannedLabel: formatPlannedLabel(t.planned_at, now),
      deadlineLabel: formatDueLabel(t.deadline_at, now),
      completedAt: t.completed_at,
      estimateHours: t.estimate_seconds ? t.estimate_seconds / 3600 : 0,
      loggedHours: Math.round(((loggedByTask.get(t.id) ?? 0) / 3600) * 10) / 10,
      commentCount: commentCount.get(t.id) ?? 0,
      linkCount: linkCount.get(t.id) ?? 0,
      subtasks: (subtasksByParent.get(t.id) ?? []).map(mapSubtask),
    };
  }

  const tasks = parentTasks.map(mapTask);

  function buildPhasePayload(
    phaseId: string,
    meta: { title: string; description: string | null; sortOrder: number },
    phaseTasks: ProjectDetailTask[]
  ): ProjectDetailPhase {
    const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    let loggedHours = 0;
    let estimateHours = 0;
    for (const t of phaseTasks) {
      statusCounts[t.status]++;
      loggedHours += t.loggedHours;
      estimateHours += t.estimateHours;
      for (const s of t.subtasks) {
        statusCounts[s.status]++;
        loggedHours += s.loggedHours;
        estimateHours += s.estimateHours;
      }
    }
    const tasksDone = phaseTasks.filter((t) => t.status === "done" || t.completedAt).length;
    const tasksTotal = phaseTasks.length;
    let status: ProjectDetailPhase["status"] = "todo";
    if (tasksTotal > 0 && tasksDone === tasksTotal) status = "done";
    else if (phaseTasks.some((t) => t.status === "in_progress" || t.status === "review" || t.completedAt)) {
      status = "in_progress";
    }

    return {
      id: phaseId,
      title: meta.title,
      description: meta.description,
      sortOrder: meta.sortOrder,
      status,
      tasksDone,
      tasksTotal,
      statusCounts,
      loggedHours: Math.round(loggedHours * 10) / 10,
      estimateHours: Math.round(estimateHours * 10) / 10,
      tasks: phaseTasks,
    };
  }

  const phaseRows = !isRetainer ? await listProjectPhases(projectId) : [];
  const taskPhaseMap = new Map(parentTasks.map((t) => [t.id, (t as { phase_id?: string | null }).phase_id ?? null]));
  const tasksByPhaseId = new Map<string | null, ProjectDetailTask[]>();
  for (const task of tasks) {
    const pid = taskPhaseMap.get(task.id) ?? null;
    const list = tasksByPhaseId.get(pid) ?? [];
    list.push(task);
    tasksByPhaseId.set(pid, list);
  }

  const phases: ProjectDetailPhase[] = phaseRows.map((p, index) =>
    buildPhasePayload(p.id, { title: p.title, description: p.description, sortOrder: p.sort_order ?? index }, tasksByPhaseId.get(p.id) ?? [])
  );
  const unphasedTasks = tasksByPhaseId.get(null) ?? [];

  const openTasks = allTasks.filter((t) => !t.completed_at);
  const tasksDone = allTasks.filter((t) => t.completed_at).length;
  const tasksTotal = allTasks.length;

  let estimateSeconds = 0;
  for (const t of allTasks) {
    if (t.estimate_seconds) estimateSeconds += t.estimate_seconds;
  }
  const budget =
    project.budget_rub ??
    (estimateSeconds > 0 ? Math.round((estimateSeconds / 3600) * DEFAULT_HOURLY_RATE) : Math.max(tasksTotal, 1) * 8 * DEFAULT_HOURLY_RATE);

  let loggedHours = 0;
  for (const h of hoursByUser.values()) loggedHours += h;
  const spent = Math.round(loggedHours * DEFAULT_HOURLY_RATE);
  let hoursToday = 0;
  for (const h of hoursTodayByUser.values()) hoursToday += h;

  const { data: memberRows } = await sb.from("v2_project_members").select("user_id, member_role").eq("project_id", projectId);
  const memberIds = (memberRows ?? []).map((m) => m.user_id as string);
  const clientMembers = (memberRows ?? [])
    .filter((m) => m.member_role === "client")
    .map((m) => m.user_id as string);
  const myMemberRole =
    ((memberRows ?? []).find((m) => m.user_id === ctx.userId)?.member_role as import("@/lib/v2/types").V2ProjectMemberRole | undefined) ??
    null;
  const canCreateTasks = canCreateProjectTask(ctx, project, myMemberRole);
  const canManageMembers = canManageProjectMembers(ctx);

  const team = memberIds
    .filter((userId) => !clientMembers.includes(userId))
    .map((userId) => {
    const name = users.get(userId) ?? userId;
    return { userId, name, initials: initialsFromName(name), gradient: gradientForUser(userId) };
  });

  const clients = clientMembers.map((userId) => {
    const name = users.get(userId) ?? userId;
    return { userId, name, initials: initialsFromName(name), gradient: gradientForUser(userId) };
  });

  const memberHours = team
    .map((member) => {
      const hours = Math.round((hoursByUser.get(member.userId) ?? 0) * 10) / 10;
      return {
        member,
        hours,
        rub: Math.round(hours * DEFAULT_HOURLY_RATE),
        hoursToday: Math.round((hoursTodayByUser.get(member.userId) ?? 0) * 10) / 10,
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const releaseAt = project.release_at;
  const nearestDeadline = openTasks
    .filter((t) => t.deadline_at)
    .map((t) => t.deadline_at!)
    .sort()[0] ?? releaseAt;
  const { label: deadlineLabel, days: deadlineDays } = formatDeadlineLabel(nearestDeadline, now);

  const started = new Date(project.created_at);
  const durationDays = Math.max(1, Math.round((now.getTime() - started.getTime()) / 86400000));

  const [projectLinks, projectFiles] = await Promise.all([listProjectLinks(projectId), listProjectFiles(projectId)]);

  const links = projectLinks.map((l) => ({
    id: l.id,
    url: l.url,
    title: l.title || l.url,
    isPrimary: l.is_primary,
    createdBy: l.created_by,
    createdByName: users.get(l.created_by) ?? "Пользователь",
    createdAt: l.created_at,
    updatedLabel: formatRelativeActivity(l.created_at, now),
  }));

  const files = projectFiles.map((f) => ({
    id: f.id,
    name: f.name,
    url: f.url,
    sizeBytes: f.size_bytes,
    sizeLabel: formatBytes(f.size_bytes),
    kind: f.kind ?? f.name.split(".").pop()?.toLowerCase() ?? "file",
    createdBy: f.created_by,
    createdByName: users.get(f.created_by) ?? "Пользователь",
    createdAt: f.created_at,
    dateLabel: formatRelativeActivity(f.created_at, now),
  }));

  const taskIdSet = new Set(taskIds);
  const recent = await listRecentActivity(ctx, 80);
  const activity: ProjectDetailActivity[] = recent
    .filter((a) => {
      if (a.entity_type === "project" && a.entity_id === projectId) return true;
      if (a.entity_type === "task" && a.entity_id && taskIdSet.has(a.entity_id)) return true;
      return false;
    })
    .slice(0, 20)
    .map((a) => ({
      id: a.id,
      actorName: a.actor_name,
      message: formatActivityMessage(a),
      note: typeof a.payload?.note === "string" ? a.payload.note : null,
      when: formatRelativeActivity(a.created_at, now),
      tone: activityTone(a.action),
    }));

  const health = computeHealth(project.status, openTasks, now);
  const priority = maxPriority(allTasks);

  let availableMonths: string[] = [];
  if (isRetainer) {
    const { data: monthRows } = await sb
      .from("v2_tasks")
      .select("work_month")
      .eq("project_id", projectId)
      .not("work_month", "is", null)
      .is("deleted_at", null);
    const distinct = new Set(
      (monthRows ?? [])
        .map((r) => r.work_month as string | null)
        .filter((m): m is string => Boolean(m))
    );
    distinct.add(selectedWorkMonth!);
    const sorted = [...distinct].sort();
    const start = sorted[0] ?? selectedWorkMonth!;
    availableMonths = workMonthsBetween(start, currentWorkMonth(now));
  }

  return {
    id: project.id,
    name: project.name,
    shortName: project.short_name,
    colorTint: project.color_tint,
    colorBg: project.color_bg,
    colorInk: project.color_ink ?? project.color_tint,
    category: inferCategory(project.name),
    status: project.status,
    kanbanStatus: v2StatusToKanban(project.status),
    engagementType: project.engagement_type,
    clientAccessEnabled: project.client_access_enabled,
    workMonth: selectedWorkMonth,
    workMonthLabel: selectedWorkMonth ? formatWorkMonthLabel(selectedWorkMonth) : null,
    availableMonths,
    canCreateTasks,
    canManageMembers,
    clients,
    health,
    priority,
    contractRef: project.contract_ref,
    releaseAt,
    releaseLabel: releaseAt ? formatDueLabel(releaseAt, now) : "—",
    deadlineLabel,
    deadlineDays,
    startedAt: started.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
    durationDays,
    budget,
    budgetRub: project.budget_rub,
    spent,
    loggedHours: Math.round(loggedHours * 10) / 10,
    hoursToday: Math.round(hoursToday * 10) / 10,
    tasksDone,
    tasksTotal,
    team,
    memberHours,
    tasks,
    phases,
    unphasedTasks,
    links,
    files,
    activity,
  };
}

export { pluralRu, mapTaskStatusToUi };
