import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PlanDayMode, PlanItemKind, PlanPayload, PlanItemRow } from "@/lib/v2/agency/plan/plan-types";
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

export async function createPlanItemApi(body: {
  kind: PlanItemKind;
  title: string;
  project_id?: string | null;
  plan_date?: string | null;
  planned_minutes?: number | null;
  event_time?: string | null;
  duration_label?: string | null;
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
  }>
) {
  const data = await fetchJson<{ item: PlanItemRow }>(`/api/v2/agency/plan/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.item;
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
  }>
) {
  await fetchJson(`/api/v2/agency/plan/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
