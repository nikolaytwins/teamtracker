import { classifyTaskBucket } from "@/lib/v2/tasks/task-buckets";
import { dailyCapacityHours } from "@/lib/tt-user-schedule";
import { gradientForUser, initialsFromName } from "@/lib/v2/projects/portfolio-utils";
import type { V2TaskRow } from "@/lib/v2/types";

export type TeamMemberSchedule = {
  userId: string;
  name: string;
  workHoursPerDay: number;
  workDays: number[];
  avatarUrl?: string | null;
};

export type DailyTeamLoadRow = {
  userId: string;
  name: string;
  initials: string;
  gradient: string;
  avatarUrl: string | null;
  /** 0…1+ (может быть >1 при перегрузе) */
  load: number;
  taskCount: number;
  estimatedSeconds: number;
  capacitySeconds: number;
  isWorkDay: boolean;
};

function toLocalYmd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isTaskForToday(t: V2TaskRow, now: Date): boolean {
  if (t.completed_at) return false;
  const bucket = classifyTaskBucket(t, now);
  return bucket === "today" || bucket === "overdue";
}

/** Загрузка на дату: сумма estimate открытых задач (сегодня + просрочено) / ёмкость рабочего дня. */
export function computeDailyTeamLoad(
  members: TeamMemberSchedule[],
  tasks: V2TaskRow[],
  now: Date = new Date()
): DailyTeamLoadRow[] {
  const ymd = toLocalYmd(now);
  const byUser = new Map<string, { taskCount: number; estimatedSeconds: number }>();

  for (const t of tasks) {
    if (!t.assignee_user_id || t.completed_at) continue;
    if (!isTaskForToday(t, now)) continue;
    const cur = byUser.get(t.assignee_user_id) ?? { taskCount: 0, estimatedSeconds: 0 };
    cur.taskCount += 1;
    cur.estimatedSeconds += t.estimate_seconds ?? 0;
    byUser.set(t.assignee_user_id, cur);
  }

  return members
    .map((m) => {
      const stats = byUser.get(m.userId) ?? { taskCount: 0, estimatedSeconds: 0 };
      const capacityHours = dailyCapacityHours({
        work_hours_per_day: m.workHoursPerDay,
        work_days: m.workDays,
        ymd,
      });
      const capacitySeconds = Math.round(capacityHours * 3600);
      const isWorkDay = capacityHours > 0;
      const load = capacitySeconds > 0 ? stats.estimatedSeconds / capacitySeconds : 0;

      return {
        userId: m.userId,
        name: m.name,
        initials: initialsFromName(m.name),
        gradient: gradientForUser(m.userId),
        avatarUrl: m.avatarUrl?.trim() ? m.avatarUrl.trim() : null,
        load,
        taskCount: stats.taskCount,
        estimatedSeconds: stats.estimatedSeconds,
        capacitySeconds,
        isWorkDay,
      };
    })
    .sort((a, b) => {
      if (a.isWorkDay !== b.isWorkDay) return a.isWorkDay ? -1 : 1;
      return b.load - a.load;
    });
}

export function fmtLoadSeconds(seconds: number): string {
  if (seconds <= 0) return "0ч";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}ч ${m}м`;
  if (h) return `${h}ч`;
  return `${m}м`;
}
