import type { PortfolioKanbanStatus, PortfolioHealth } from "@/lib/v2/projects/portfolio-types";
import type { V2ProjectStatus, V2TaskPriority } from "@/lib/v2/types";

export const STATUS_META: Record<
  PortfolioKanbanStatus,
  { label: string; dot: string; soft: string; ink: string }
> = {
  not_started: { label: "Не начат", dot: "#A1A1AA", soft: "#F1F1F4", ink: "#52525B" },
  in_progress: { label: "В работе", dot: "#3B6FF7", soft: "#E6EDFF", ink: "#1F3AAF" },
  review: { label: "На согласовании", dot: "#F59E0B", soft: "#FEF3D1", ink: "#915E0B" },
  done: { label: "Готов", dot: "#10B981", soft: "#D1FAE5", ink: "#065F46" },
  paused: { label: "Пауза", dot: "#7C3AED", soft: "#EDE9FE", ink: "#5B21B6" },
};

export const STATUS_ORDER: PortfolioKanbanStatus[] = [
  "not_started",
  "in_progress",
  "review",
  "done",
  "paused",
];

export const HEALTH_META: Record<PortfolioHealth, { dot: string; label: string }> = {
  on_track: { dot: "#10B981", label: "в графике" },
  at_risk: { dot: "#F59E0B", label: "риск" },
  critical: { dot: "#EF4444", label: "критично" },
  paused: { dot: "#A1A1AA", label: "на паузе" },
  done: { dot: "#71717A", label: "завершён" },
};

export const PRIORITY_META: Record<V2TaskPriority, { label: string; dot: string }> = {
  urgent: { label: "Срочно", dot: "#EF4444" },
  high: { label: "Высокий", dot: "#F59E0B" },
  medium: { label: "Средний", dot: "#3B6FF7" },
  low: { label: "Низкий", dot: "#A1A1AA" },
};

export function kanbanStatusToV2CreateStatus(status: PortfolioKanbanStatus): V2ProjectStatus {
  switch (status) {
    case "review":
      return "approval";
    case "done":
      return "completed";
    default:
      return status;
  }
}

export const STARRED_STORAGE_KEY = "v2-starred-projects";
