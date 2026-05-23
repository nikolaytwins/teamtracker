import type { PortfolioHealth, PortfolioMember } from "@/lib/v2/projects/portfolio-types";
import type { V2ProjectEngagementType, V2ProjectStatus, V2TaskPriority, V2TaskStatus } from "@/lib/v2/types";

export type ProjectDetailLink = {
  id: string;
  url: string;
  title: string;
  isPrimary: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedLabel: string;
};

export type ProjectDetailFile = {
  id: string;
  name: string;
  url: string;
  sizeBytes: number | null;
  sizeLabel: string;
  kind: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  dateLabel: string;
};

export type ProjectDetailSubtask = {
  id: string;
  title: string;
  status: V2TaskStatus;
  priority: V2TaskPriority;
  assigneeUserId: string | null;
  assigneeName: string | null;
  deadlineLabel: string;
  estimateHours: number;
  loggedHours: number;
  commentCount: number;
  linkCount: number;
};

export type ProjectDetailTask = {
  id: string;
  title: string;
  status: V2TaskStatus;
  priority: V2TaskPriority;
  assigneeUserId: string | null;
  assigneeName: string | null;
  deadlineLabel: string;
  estimateHours: number;
  loggedHours: number;
  commentCount: number;
  linkCount: number;
  subtasks: ProjectDetailSubtask[];
};

export type ProjectDetailMemberHours = {
  member: PortfolioMember;
  hours: number;
  rub: number;
  hoursToday: number;
};

export type ProjectDetailActivity = {
  id: string;
  actorName: string;
  message: string;
  note: string | null;
  when: string;
  tone: "edit" | "comment" | "timer" | "attach" | "done" | "review";
};

export type ProjectDetailPayload = {
  id: string;
  name: string;
  shortName: string | null;
  colorTint: string | null;
  colorBg: string | null;
  colorInk: string | null;
  category: string;
  status: V2ProjectStatus;
  kanbanStatus: string;
  engagementType: V2ProjectEngagementType;
  clientAccessEnabled: boolean;
  workMonth: string | null;
  workMonthLabel: string | null;
  availableMonths: string[];
  canCreateTasks: boolean;
  canManageMembers: boolean;
  clients: PortfolioMember[];
  health: PortfolioHealth;
  priority: V2TaskPriority;
  contractRef: string | null;
  releaseAt: string | null;
  releaseLabel: string;
  deadlineLabel: string;
  deadlineDays: number | null;
  startedAt: string;
  durationDays: number;
  budget: number;
  spent: number;
  loggedHours: number;
  hoursToday: number;
  tasksDone: number;
  tasksTotal: number;
  team: PortfolioMember[];
  memberHours: ProjectDetailMemberHours[];
  tasks: ProjectDetailTask[];
  links: ProjectDetailLink[];
  files: ProjectDetailFile[];
  activity: ProjectDetailActivity[];
};
