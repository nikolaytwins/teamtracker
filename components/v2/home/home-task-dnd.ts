import { fetchJson } from "@/lib/v2/client/fetch-json";
import { canDropTaskOnHomeBucket, isoScheduleForBucket } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskBucket, V2TaskWithMeta } from "@/lib/v2/types";

export type HomeDragSource = V2TaskBucket | "unassigned";

export function homeDropZoneClass(active: boolean): string {
  return active
    ? "ring-2 ring-[var(--v2-brand-400)] ring-offset-2 bg-[var(--v2-brand-50)]/30"
    : "";
}

export async function moveHomeTaskToBucket(
  taskId: string,
  bucket: V2TaskBucket,
  findTask: (id: string) => V2TaskWithMeta | undefined
): Promise<void> {
  if (!canDropTaskOnHomeBucket(bucket)) return;
  const plannedAt = isoScheduleForBucket(bucket);
  if (!plannedAt) return;

  const task = findTask(taskId);
  if (!task || task.completed_at) return;

  const body: Record<string, unknown> = {
    plannedAt,
    inboxBucket: null,
  };
  if (!task.deadline_at) body.deadlineAt = plannedAt;

  await fetchJson(`/api/v2/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function isHomeTaskDraggable(task: V2TaskWithMeta): boolean {
  return !task.completed_at && !task.inbox_bucket;
}
