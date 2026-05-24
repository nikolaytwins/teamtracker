export const V2_INBOX_VIEW_KEY = "v2-inbox-view";

export type InboxViewMode = "day" | "week" | "kanban";

export function readInboxView(): InboxViewMode {
  if (typeof window === "undefined") return "week";
  try {
    const v = localStorage.getItem(V2_INBOX_VIEW_KEY);
    if (v === "day" || v === "week" || v === "kanban") return v;
    return "week";
  } catch {
    return "week";
  }
}

export function writeInboxView(view: InboxViewMode): void {
  try {
    localStorage.setItem(V2_INBOX_VIEW_KEY, view);
  } catch {
    /* ignore */
  }
}
