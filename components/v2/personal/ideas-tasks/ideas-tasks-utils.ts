import { isPersonalTodoOverdue, personalTodoTodayYmd } from "@/lib/v2/personal/todo-date";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { IdeaPriority } from "@/lib/v2/personal/personal-ideas-repo";

export const IDEA_PRIO_LABEL: Record<IdeaPriority, string> = {
  high: "высокий",
  normal: "обычный",
  low: "низкий",
};

export const IDEA_PRIO_CLASS: Record<IdeaPriority, string> = {
  high: "hi",
  normal: "no",
  low: "lo",
};

export const TASK_PRIO_LABEL: Record<number, string> = {
  1: "важно",
  2: "средняя важность",
  3: "не важно",
};

export const PROJECT_TINT: Record<string, [string, string]> = {
  TwinLabs: ["#eef3ff", "#2d5eef"],
  Импульс: ["#f4f1ff", "#6d3bef"],
  Медийка: ["#fff5ee", "#c2410c"],
  Arkalium: ["#edfaf6", "#0e9384"],
  "": ["#f7f7f8", "#71717a"],
};

export function tintForProject(name: string): [string, string] {
  return PROJECT_TINT[name] ?? ["#f5f6f8", "#52525b"];
}

export function taskPrioNum(priority: PersonalTodoRow["priority"]): 0 | 1 | 2 | 3 {
  if (priority === "urgent" || priority === "high") return 1;
  if (priority === "medium") return 2;
  if (priority === "low") return 3;
  return 0;
}

export function dlInfo(ymd: string | null | undefined): { cls: string; text: string } | null {
  if (!ymd) return null;
  const today = personalTodoTodayYmd();
  const t = new Date(`${today}T12:00:00`);
  const x = new Date(`${ymd}T12:00:00`);
  const diff = Math.round((x.getTime() - t.getTime()) / 86400000);
  const f = x.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  if (diff < 0) return { cls: "late", text: `просрочено · ${f}` };
  if (diff === 0) return { cls: "soon", text: "сегодня" };
  if (diff === 1) return { cls: "soon", text: "завтра" };
  if (diff <= 6) return { cls: "soon", text: `через ${diff} дн. · ${f}` };
  return { cls: "dl", text: f };
}

export function dlInfoForTodo(todo: PersonalTodoRow) {
  const ymd = todo.due_date ?? todo.scheduled_date;
  if (!ymd) return null;
  const today = personalTodoTodayYmd();
  if (isPersonalTodoOverdue(todo, today)) {
    const f = new Date(`${ymd}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    return { cls: "late", text: `просрочено · ${f}` };
  }
  return dlInfo(ymd);
}

export function formatDoneYmd(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function isTodayDone(iso: string) {
  return formatDoneYmd(iso) === personalTodoTodayYmd();
}
