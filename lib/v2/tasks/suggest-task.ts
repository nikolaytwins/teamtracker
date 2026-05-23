import { BUCKET_ORDER } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskPriority, V2TaskWithMeta } from "@/lib/v2/types";

const PRIORITY_RANK: Record<V2TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function bucketRank(bucket: V2TaskWithMeta["bucket"]): number {
  const i = BUCKET_ORDER.indexOf(bucket);
  return i === -1 ? 99 : i;
}

/** Лучшая открытая задача для предложения «начать работу». */
export function pickSuggestedTask(tasks: V2TaskWithMeta[]): V2TaskWithMeta | null {
  const open = tasks.filter((t) => !t.completed_at && !t.inbox_bucket);
  if (!open.length) return null;

  return [...open].sort((a, b) => {
    const br = bucketRank(a.bucket) - bucketRank(b.bucket);
    if (br !== 0) return br;
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    if (a.deadline_at && b.deadline_at) return a.deadline_at.localeCompare(b.deadline_at);
    if (a.deadline_at) return -1;
    if (b.deadline_at) return 1;
    return a.title.localeCompare(b.title, "ru");
  })[0]!;
}
