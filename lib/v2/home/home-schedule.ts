import { rollingWeekDatesFromToday, taskScheduleYmd } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskWithMeta } from "@/lib/v2/types";

export type HomeKanbanColumnKey = "unassigned" | "today" | "tomorrow" | "this_week" | "later";

export function groupTasksForWeekBoard(
  tasks: V2TaskWithMeta[],
  dates: string[] = rollingWeekDatesFromToday()
): { columns: Record<string, V2TaskWithMeta[]>; unscheduled: V2TaskWithMeta[] } {
  const columns: Record<string, V2TaskWithMeta[]> = Object.fromEntries(dates.map((d) => [d, []]));
  const unscheduled: V2TaskWithMeta[] = [];
  const todayYmd = dates[0]!;

  for (const task of tasks) {
    const ymd = taskScheduleYmd(task);
    if (!ymd) {
      unscheduled.push(task);
      continue;
    }
    if (ymd < todayYmd) {
      columns[todayYmd]!.push(task);
      continue;
    }
    if (columns[ymd]) {
      columns[ymd]!.push(task);
      continue;
    }
    unscheduled.push(task);
  }

  return { columns, unscheduled };
}

export function kanbanColumnForTask(
  task: V2TaskWithMeta,
  dates: string[] = rollingWeekDatesFromToday()
): Exclude<HomeKanbanColumnKey, "unassigned"> {
  const ymd = taskScheduleYmd(task);
  const todayYmd = dates[0]!;
  const tomorrowYmd = dates[1];

  if (ymd) {
    if (ymd <= todayYmd) return "today";
    if (tomorrowYmd && ymd === tomorrowYmd) return "tomorrow";
    if (dates.includes(ymd)) return "this_week";
    return "later";
  }

  if (task.home_bucket === "today") return "today";
  if (task.home_bucket === "tomorrow") return "tomorrow";
  if (task.home_bucket === "this_week") return "this_week";
  if (task.bucket === "overdue") return "today";
  if (task.bucket === "today") return "today";
  if (task.bucket === "tomorrow") return "tomorrow";
  if (task.bucket === "this_week") return "this_week";
  return "later";
}

export function groupTasksForKanbanBoard(
  tasks: V2TaskWithMeta[],
  unassignedTasks: V2TaskWithMeta[],
  dates: string[] = rollingWeekDatesFromToday()
): Record<HomeKanbanColumnKey, V2TaskWithMeta[]> {
  const columns: Record<HomeKanbanColumnKey, V2TaskWithMeta[]> = {
    unassigned: unassignedTasks,
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
  };

  for (const task of tasks) {
    if (task.completed_at || task.inbox_bucket) continue;
    const key = kanbanColumnForTask(task, dates);
    columns[key].push(task);
  }

  return columns;
}

const WEEKDAY = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function formatWeekColumnLabel(ymd: string, todayYmd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (ymd === todayYmd) return "Сегодня";
  const tomorrow = new Date(`${todayYmd}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYmd = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (ymd === tomorrowYmd) return "Завтра";
  const wd = WEEKDAY[d.getDay()] ?? "";
  return `${wd} ${d.getDate()}.${d.getMonth() + 1}`;
}
