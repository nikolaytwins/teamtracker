import { fetchJson } from "@/lib/v2/client/fetch-json";
import { canDropTaskOnHomeBucket, patchForHomeBucketMove, patchForHomeDateMove } from "@/lib/v2/tasks/task-buckets";
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
  const move = patchForHomeBucketMove(bucket);
  if (!move) return;

  const task = findTask(taskId);
  if (!task || task.completed_at) return;

  const body: Record<string, unknown> = {
    homeBucket: move.homeBucket,
    plannedAt: move.plannedAt,
    inboxBucket: null,
  };

  // Старый DnD дублировал deadline_at из planned_at — сбрасываем при переносе без жёсткого срока.
  if (
    (move.homeBucket === "this_week" || move.homeBucket === "later") &&
    task.deadline_at &&
    task.planned_at &&
    task.deadline_at === task.planned_at
  ) {
    body.deadlineAt = null;
  }

  await fetchJson(`/api/v2/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function moveHomeTaskToDate(
  taskId: string,
  ymd: string,
  findTask: (id: string) => V2TaskWithMeta | undefined
): Promise<void> {
  const task = findTask(taskId);
  if (!task || task.completed_at) return;

  const move = patchForHomeDateMove(ymd);
  const body: Record<string, unknown> = {
    homeBucket: move.homeBucket,
    plannedAt: move.plannedAt,
    inboxBucket: null,
  };

  if (
    task.deadline_at &&
    task.planned_at &&
    task.deadline_at === task.planned_at &&
    move.homeBucket !== "today" &&
    move.homeBucket !== "tomorrow"
  ) {
    body.deadlineAt = null;
  }

  await fetchJson(`/api/v2/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function isHomeTaskDraggable(task: V2TaskWithMeta): boolean {
  return !task.completed_at && !task.inbox_bucket;
}
