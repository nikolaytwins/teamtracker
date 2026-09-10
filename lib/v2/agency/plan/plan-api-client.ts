import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PlanDayMode, PlanItemKind, PlanPayload, PlanItemRow, PlanPriority } from "@/lib/v2/agency/plan/plan-types";
import type { DispatchWorkStatus } from "@/lib/v2/agency/dispatch/dispatch-work-status";

export type PlanFetchResult = {
  plan: PlanPayload;
  storageWarning: string | null;
};

export async function fetchPlan(from: string, to: string, year: number, month: number) {
  const q = new URLSearchParams({ from, to, year: String(year), month: String(month) });
  const data = await fetchJson<{ plan: PlanPayload; storageWarning?: string | null }>(
    `/api/v2/agency/plan?${q}`
  );
  return { plan: data.plan, storageWarning: data.storageWarning ?? null };
}

export async function fetchPlanCalendar(from: string, to: string) {
  const q = new URLSearchParams({ from, to, calendar: "1" });
  return fetchJson<Pick<PlanPayload, "items" | "dayModes" | "backlog">>(`/api/v2/agency/plan?${q}`);
}

export async function createPlanItemApi(body: {
  kind: PlanItemKind;
  title: string;
  project_id?: string | null;
  plan_date?: string | null;
  planned_minutes?: number | null;
  event_time?: string | null;
  duration_label?: string | null;
  sort_order?: number | null;
  priority?: PlanPriority | null;
}) {
  const data = await fetchJson<{ item: PlanItemRow }>("/api/v2/agency/plan/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.item;
}

export async function updatePlanItemApi(
  id: string,
  body: Partial<{
    kind: PlanItemKind;
    title: string;
    project_id: string | null;
    plan_date: string | null;
    planned_minutes: number | null;
    event_time: string | null;
    duration_label: string | null;
    sort_order: number | null;
    priority: PlanPriority | null;
    completed_at: string | null;
  }>
) {
  const data = await fetchJson<{ item: PlanItemRow }>(`/api/v2/agency/plan/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.item;
}

export async function reorderPlanItemsApi(planDate: string, orderedIds: string[]) {
  await fetchJson("/api/v2/agency/plan/items/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_date: planDate, ordered_ids: orderedIds }),
  });
}

export async function deletePlanItemApi(id: string) {
  await fetchJson(`/api/v2/agency/plan/items/${id}`, { method: "DELETE" });
}

export async function upsertDayModeApi(planDate: string, mode: PlanDayMode | null) {
  await fetchJson("/api/v2/agency/plan/day-mode", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_date: planDate, mode }),
  });
}

export async function updateProjectApi(
  id: string,
  body: Partial<{
    dispatch_work_status: DispatchWorkStatus;
    work_deadline: string | null;
    planned_hours_remaining: number | null;
    plan_hidden: boolean;
  }>
) {
  await fetchJson(`/api/v2/agency/plan/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createPlanProjectApi(body: {
  name: string;
  planned_hours_remaining?: number | null;
  work_deadline?: string | null;
  include_in_finance?: boolean;
  total_amount?: number | null;
  paid_amount?: number | null;
  payment_status?: "not_paid" | "prepaid" | "paid" | null;
  service_type?: string | null;
}) {
  return fetchJson<{ project: { id: string; name: string } }>("/api/v2/agency/plan/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
