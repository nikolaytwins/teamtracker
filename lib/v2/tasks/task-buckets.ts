import type { V2HomeBucket, V2TaskBucket, V2TaskRow } from "@/lib/v2/types";

const HOME_BUCKETS: V2HomeBucket[] = ["today", "tomorrow", "this_week", "later"];

function isHomeBucket(value: string | null | undefined): value is V2HomeBucket {
  return value != null && HOME_BUCKETS.includes(value as V2HomeBucket);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return endOfLocalDay(addDays(d, daysUntilSunday));
}

export function classifyTaskBucket(task: V2TaskRow, now: Date = new Date()): V2TaskBucket {
  if (task.inbox_bucket) return "inbox";

  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const tomorrowStart = startOfLocalDay(addDays(now, 1));
  const tomorrowEnd = endOfLocalDay(addDays(now, 1));
  const weekEnd = endOfWeekSunday(now);

  if (task.completed_at) {
    const completed = new Date(task.completed_at);
    if (completed >= todayStart && completed <= todayEnd) return "done_today";
    return "later";
  }

  if (task.deadline_at) {
    const hardDeadline = new Date(task.deadline_at);
    if (hardDeadline < todayStart) return "overdue";
  }

  if (isHomeBucket(task.home_bucket)) return task.home_bucket;

  if (!task.planned_at && !task.deadline_at) return "later";

  const scheduleAt = task.planned_at ?? task.deadline_at;
  const deadline = new Date(scheduleAt!);
  if (deadline < todayStart) return "overdue";
  if (deadline >= todayStart && deadline <= todayEnd) return "today";
  if (deadline >= tomorrowStart && deadline <= tomorrowEnd) return "tomorrow";
  if (deadline <= weekEnd) return "this_week";
  return "later";
}

export const BUCKET_LABELS: Record<V2TaskBucket, string> = {
  overdue: "Просрочено",
  today: "Сегодня",
  tomorrow: "Завтра",
  this_week: "На этой неделе",
  later: "Позже",
  done_today: "Готово сегодня",
  inbox: "Входящие",
};

export const BUCKET_ORDER: V2TaskBucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "later",
  "done_today",
];

export function groupTasksByBucket<T extends V2TaskRow>(
  tasks: T[],
  now?: Date
): Record<V2TaskBucket, T[]> {
  const groups: Record<V2TaskBucket, T[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
    done_today: [],
    inbox: [],
  };
  for (const t of tasks) {
    if (t.inbox_bucket) {
      groups.inbox.push(t);
      continue;
    }
    groups[classifyTaskBucket(t, now)].push(t);
  }
  return groups;
}

/** Бакеты, на которые можно перетащить задачу с главной. */
export const HOME_DROP_BUCKETS: V2TaskBucket[] = ["today", "tomorrow", "this_week", "later"];

export function canDropTaskOnHomeBucket(bucket: V2TaskBucket): boolean {
  return HOME_DROP_BUCKETS.includes(bucket);
}

function scheduleEndOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0, 0);
}

/** ISO для planned_at при переносе в «сегодня» / «завтра». */
export function isoScheduleForBucket(bucket: V2TaskBucket, now: Date = new Date()): string | null {
  if (bucket !== "today" && bucket !== "tomorrow") return null;

  const todayStart = startOfLocalDay(now);
  const tomorrow = addDays(todayStart, 1);

  switch (bucket) {
    case "today":
      return scheduleEndOfDay(now).toISOString();
    case "tomorrow":
      return scheduleEndOfDay(tomorrow).toISOString();
    default:
      return null;
  }
}

export type HomeBucketMovePatch = {
  homeBucket: V2HomeBucket;
  plannedAt: string | null;
};

/** PATCH-поля при переносе задачи между секциями главной. */
export function patchForHomeBucketMove(
  bucket: V2TaskBucket,
  now: Date = new Date()
): HomeBucketMovePatch | null {
  if (!canDropTaskOnHomeBucket(bucket)) return null;

  if (bucket === "today" || bucket === "tomorrow") {
    const plannedAt = isoScheduleForBucket(bucket, now);
    if (!plannedAt) return null;
    return { homeBucket: bucket, plannedAt };
  }

  if (bucket === "this_week" || bucket === "later") {
    return { homeBucket: bucket, plannedAt: null };
  }

  return null;
}
