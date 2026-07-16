import type { PortfolioHealth, PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import { HEALTH_META, PRIORITY_META } from "@/components/v2/projects/portfolio-meta";
import type { V2InboxBucket, V2TaskPriority, V2TaskWithMeta } from "@/lib/v2/types";

export const INBOX_BUCKETS: { key: V2InboxBucket; label: string; dot: string; soft: string }[] = [
  { key: "this_week", label: "На этой неделе", dot: "#3B6FF7", soft: "#E6EDFF" },
  { key: "this_month", label: "В этом месяце", dot: "#F59E0B", soft: "#FEF3D1" },
  { key: "someday", label: "Когда-нибудь", dot: "#A1A1AA", soft: "#F1F1F4" },
];

const PRIORITY_RANK: Record<V2TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const HEALTH_RANK: Record<PortfolioHealth, number> = {
  critical: 4,
  at_risk: 3,
  on_track: 2,
  paused: 1,
  done: 0,
};

export function isBurningProject(health: PortfolioHealth | null | undefined): boolean {
  return health === "critical" || health === "at_risk";
}

export function projectForTask(
  task: V2TaskWithMeta,
  projectsById: Map<string, PortfolioProject>
): PortfolioProject | null {
  if (!task.project_id) return null;
  return projectsById.get(task.project_id) ?? null;
}

export function inboxSortScore(task: V2TaskWithMeta, project: PortfolioProject | null): number {
  let score = 0;
  if (project) {
    score += HEALTH_RANK[project.health] * 1000;
    score += PRIORITY_RANK[project.priority] * 100;
  }
  score += PRIORITY_RANK[task.priority ?? "medium"] * 10;
  return score;
}

export function sortInboxTasks(
  tasks: V2TaskWithMeta[],
  projectsById: Map<string, PortfolioProject>
): V2TaskWithMeta[] {
  return [...tasks].sort((a, b) => {
    const sa = inboxSortScore(a, projectForTask(a, projectsById));
    const sb = inboxSortScore(b, projectForTask(b, projectsById));
    return sb - sa;
  });
}

export function flattenInboxBuckets(buckets: Record<V2InboxBucket, V2TaskWithMeta[]>): V2TaskWithMeta[] {
  return INBOX_BUCKETS.flatMap(({ key }) => buckets[key] ?? []);
}

export { HEALTH_META, PRIORITY_META };
