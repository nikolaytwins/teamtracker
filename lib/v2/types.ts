import type { TtUserRole } from "@/lib/roles";

export const V2_DEFAULT_WORKSPACE_ID = "ws-default";

export type V2ProjectScope = "team" | "personal";
export type V2ProjectStatus =
  | "not_started"
  | "in_progress"
  | "approval"
  | "completed_unpaid"
  | "completed"
  | "paused";
export type V2ProjectEngagementType = "one_off" | "retainer";
export type V2ProjectKind = "site" | "presentation" | "small_task";
export type V2ProjectMemberRole = "team" | "client" | "lead";
export type V2TaskScope = "team" | "personal";
export type V2TaskStatus = "todo" | "in_progress" | "review" | "done";
export type V2TaskPriority = "urgent" | "high" | "medium" | "low";
export type V2InboxBucket = "this_week" | "this_month" | "someday";

export type V2TaskBucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "done_today"
  | "inbox";

export type V2WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type V2WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: TtUserRole;
  weekly_hours_norm: number;
  created_at: string;
};

export type V2ProjectRow = {
  id: string;
  workspace_id: string;
  scope: V2ProjectScope;
  name: string;
  short_name: string | null;
  color_tint: string | null;
  color_bg: string | null;
  color_ink: string | null;
  status: V2ProjectStatus;
  owner_user_id: string | null;
  contract_ref: string | null;
  release_at: string | null;
  budget_rub: number | null;
  paid_rub: number | null;
  project_kind: V2ProjectKind | null;
  priority: V2TaskPriority;
  engagement_type: V2ProjectEngagementType;
  client_access_enabled: boolean;
  client_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type V2ProjectPhaseRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export type V2TaskRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  phase_id: string | null;
  parent_id: string | null;
  scope: V2TaskScope;
  title: string;
  description: string | null;
  status: V2TaskStatus;
  priority: V2TaskPriority;
  assignee_user_id: string | null;
  created_by: string;
  deadline_at: string | null;
  planned_at: string | null;
  estimate_seconds: number | null;
  completed_at: string | null;
  sort_order: number;
  inbox_bucket: V2InboxBucket | null;
  work_month: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type V2TimeSessionRow = {
  id: string;
  workspace_id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_manual: boolean;
  note: string | null;
  created_at: string;
};

export type V2ActivityRow = {
  id: string;
  workspace_id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type V2TaskWithMeta = V2TaskRow & {
  logged_seconds: number;
  project_name: string | null;
  project_short_name: string | null;
  project_color_tint: string | null;
  project_color_bg: string | null;
  project_color_ink: string | null;
  assignee_name: string | null;
  comment_count: number;
  link_count: number;
  bucket: V2TaskBucket;
};

export type V2SessionContext = {
  userId: string;
  userName: string;
  role: TtUserRole;
  workspaceId: string;
};
