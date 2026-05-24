import type { TaskViewMode } from "@/lib/v2/task-view-mode";

export const V2_HOME_VIEW_KEY = "v2-home-view";

export function readHomeView(): TaskViewMode {
  if (typeof window === "undefined") return "day";
  try {
    const v = localStorage.getItem(V2_HOME_VIEW_KEY);
    if (v === "day" || v === "week" || v === "kanban") return v;
    return "day";
  } catch {
    return "day";
  }
}

export function writeHomeView(view: TaskViewMode): void {
  try {
    localStorage.setItem(V2_HOME_VIEW_KEY, view);
  } catch {
    /* ignore */
  }
}
