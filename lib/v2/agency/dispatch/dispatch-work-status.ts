/** Рабочие статусы Sofia Plan — отдельно от work_status канбана. */

export type DispatchWorkStatus = "planned" | "in_progress" | "on_approval" | "revisions" | "done";

export const DISPATCH_WORK_STATUSES: {
  key: DispatchWorkStatus;
  label: string;
  consumesPlanHours: boolean;
  planRiskOnly: boolean;
}[] = [
  { key: "planned", label: "Планируется", consumesPlanHours: true, planRiskOnly: false },
  { key: "in_progress", label: "В работе", consumesPlanHours: true, planRiskOnly: false },
  { key: "on_approval", label: "Согласование", consumesPlanHours: false, planRiskOnly: true },
  { key: "revisions", label: "Правки", consumesPlanHours: true, planRiskOnly: false },
  { key: "done", label: "Завершён", consumesPlanHours: false, planRiskOnly: false },
];

export function isDispatchWorkStatus(v: unknown): v is DispatchWorkStatus {
  return DISPATCH_WORK_STATUSES.some((s) => s.key === v);
}

export function dispatchStatusMeta(status: DispatchWorkStatus) {
  return DISPATCH_WORK_STATUSES.find((s) => s.key === status)!;
}

export function isActiveDispatchStatus(status: DispatchWorkStatus): boolean {
  return status !== "done";
}
