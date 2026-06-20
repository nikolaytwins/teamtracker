import type { V2TaskPriority } from "@/lib/v2/types";

export type PersonalTodoView = "inbox" | "today" | "upcoming" | "week" | "project" | "completed";

export type PersonalTodoProjectRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon_key: string;
  sort_order: number;
  is_inbox: boolean;
  archived_at: string | null;
};

export type PersonalTodoRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  priority: V2TaskPriority;
  due_date: string | null;
  due_time: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  sort_order: number;
  project_name?: string | null;
  project_color?: string | null;
  subtask_count?: number;
  subtask_done?: number;
};

export type PersonalTodoBootstrap = {
  projects: PersonalTodoProjectRow[];
  inboxProjectId: string;
  counts: {
    inbox: number;
    today: number;
    overdue: number;
  };
};

export type PersonalTodoListPayload = {
  view: PersonalTodoView;
  todos: PersonalTodoRow[];
  groups?: { date: string; label: string; todos: PersonalTodoRow[] }[];
  week?: { dates: string[]; columns: Record<string, PersonalTodoRow[]>; unscheduled: PersonalTodoRow[] };
};
