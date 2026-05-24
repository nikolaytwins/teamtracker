import type { V2ProjectStatus, V2TaskPriority, V2ProjectEngagementType } from "@/lib/v2/types";

export type PortfolioKanbanStatus =
  | "not_started"
  | "in_progress"
  | "review"
  | "done_unpaid"
  | "done"
  | "paused";

export function isFinishedKanbanStatus(status: PortfolioKanbanStatus): boolean {
  return status === "done" || status === "done_unpaid";
}

export type PortfolioHealth = "on_track" | "at_risk" | "critical" | "paused" | "done";

export type PortfolioMember = {
  userId: string;
  name: string;
  initials: string;
  gradient: string;
  avatarUrl: string | null;
};

export type PortfolioProject = {
  id: string;
  name: string;
  shortName: string | null;
  colorTint: string | null;
  colorBg: string | null;
  colorInk: string | null;
  category: string;
  engagementType: V2ProjectEngagementType;
  status: PortfolioKanbanStatus;
  v2Status: V2ProjectStatus;
  health: PortfolioHealth;
  priority: V2TaskPriority;
  deadline: string;
  deadlineDays: number | null;
  deadlineAt: string | null;
  team: PortfolioMember[];
  tasksDone: number;
  tasksTotal: number;
  budget: number;
  spent: number;
  loggedHours: number;
  hoursByMember: Record<string, number>;
  lastActivity: string;
  lastActivityAt: string;
  unread: number;
  pauseReason?: string;
  updatedAt: string;
  completedAt: string | null;
};

export type PortfolioTeamLoadRow = {
  userId: string;
  name: string;
  initials: string;
  gradient: string;
  avatarUrl: string | null;
  load: number;
  taskCount: number;
  estimatedSeconds: number;
  capacitySeconds: number;
  isWorkDay: boolean;
};

export type PortfolioPayload = {
  projects: PortfolioProject[];
  teamLoad: PortfolioTeamLoadRow[];
  kpis: {
    inProgress: number;
    review: number;
    notStarted: number;
    atRisk: number;
    critical: number;
    paused: number;
    active: number;
    doneThisMonth: number;
  };
};

export function v2StatusToKanban(status: V2ProjectStatus): PortfolioKanbanStatus {
  switch (status) {
    case "approval":
      return "review";
    case "completed_unpaid":
      return "done_unpaid";
    case "completed":
      return "done";
    default:
      return status;
  }
}

export function kanbanToV2Status(status: PortfolioKanbanStatus): V2ProjectStatus {
  switch (status) {
    case "review":
      return "approval";
    case "done_unpaid":
      return "completed_unpaid";
    case "done":
      return "completed";
    default:
      return status;
  }
}
