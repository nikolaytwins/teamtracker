import { getAgencyRepoV2 } from "@/lib/agency-store";
import { agencyDetailLineTotal } from "@/lib/agency/detail-line-total";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { isInFinanceMonth } from "@/lib/v2/finance/meta";
import { isFinanceBusinessLine } from "@/lib/v2/finance/meta";
import type { V2FinancePaymentStatus } from "@/lib/v2/finance/types";
import {
  DEFAULT_DISPATCH_RULES,
  normalizeDispatchRules,
} from "@/lib/v2/agency/dispatch/dispatch-rules-defaults";
import {
  DEFAULT_WORK_RULES_DOCUMENT,
  normalizeWorkRulesDocument,
  rulesJsonWithWorkRules,
  syncWorkRulesToRules,
  type WorkRulesDocument,
} from "@/lib/v2/agency/dispatch/work-rules-document";
import {
  dispatchStatusMeta,
  isDispatchWorkStatus,
  isActiveDispatchStatus,
} from "@/lib/v2/agency/dispatch/dispatch-work-status";
import type {
  DispatchProjectView,
  DispatchRulesRow,
  DispatchWorkModelType,
} from "@/lib/v2/agency/dispatch/dispatch-types";
import type { V2SessionContext } from "@/lib/v2/types";

const WORK_MODEL_TYPES: DispatchWorkModelType[] = [
  "site",
  "presentation",
  "support",
  "legacy_tail",
  "course",
  "own_project",
  "other",
];

function isWorkModelType(v: unknown): v is DispatchWorkModelType {
  return WORK_MODEL_TYPES.includes(v as DispatchWorkModelType);
}

function mapPaymentStatus(raw: unknown): V2FinancePaymentStatus {
  return raw === "paid" || raw === "prepaid" ? raw : "not_paid";
}

function inferWorkModelType(serviceType: unknown, explicit: unknown): DispatchWorkModelType {
  if (isWorkModelType(explicit)) return explicit;
  if (serviceType === "site") return "site";
  if (serviceType === "presentation") return "presentation";
  if (serviceType === "support") return "support";
  return "other";
}

async function loadEffectiveTotals(
  rawProjects: Record<string, unknown>[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = rawProjects.map((p) => String(p.id));
  if (!ids.length) return out;

  const rates = new Map<string, number>();
  for (const p of rawProjects) {
    rates.set(String(p.id), Number(p.hourlyRateRub) || 0);
  }

  const details = await getAgencyRepoV2().listProjectDetails();
  for (const row of details) {
    const pid = String(row.projectId);
    if (!ids.includes(pid)) continue;
    const sum = agencyDetailLineTotal(
      {
        billingType: row.billingType as string | undefined,
        quantity: Number(row.quantity) || 0,
        unitPrice: Number(row.unitPrice) || 0,
        trackedSeconds: Number(row.trackedSeconds) || 0,
      },
      rates.get(pid) ?? 0
    );
    out.set(pid, (out.get(pid) ?? 0) + sum);
  }
  return out;
}

function mapDispatchProject(
  raw: Record<string, unknown>,
  effectiveTotals: Map<string, number>
): DispatchProjectView {
  const totalAmount = Number(raw.totalAmount) || 0;
  const paidAmount = Number(raw.paidAmount) || 0;
  const totalExpenses = Number(raw.totalExpenses) || 0;
  const detailTotal = effectiveTotals.get(String(raw.id)) ?? 0;
  const effectiveTotalAmount = detailTotal > 0 ? detailTotal : totalAmount;
  const ownerNetTotal = effectiveTotalAmount - totalExpenses;
  const unpaidOwnerNet = Math.max(0, ownerNetTotal - paidAmount);

  const dispatchRaw = raw.dispatchWorkStatus;
  const dispatchWorkStatus = isDispatchWorkStatus(dispatchRaw) ? dispatchRaw : "planned";
  const businessLine = isFinanceBusinessLine(raw.businessLine) ? raw.businessLine : "agency";

  return {
    id: String(raw.id),
    name: String(raw.name),
    businessLine,
    paymentStatus: mapPaymentStatus(raw.status),
    dispatchWorkStatus,
    workModelType: inferWorkModelType(raw.serviceType, raw.workModelType),
    workDeadline: raw.workDeadline ? String(raw.workDeadline) : null,
    financeDeadline: raw.deadline ? String(raw.deadline) : null,
    plannedHoursRemaining:
      raw.plannedHoursRemaining == null ? null : Number(raw.plannedHoursRemaining),
    paymentCertainThisMonth: raw.paymentCertainThisMonth === true,
    totalAmount,
    paidAmount,
    effectiveTotalAmount,
    totalExpenses,
    ownerNetTotal,
    unpaidOwnerNet,
    createdAt: String(raw.createdAt),
  };
}

export async function getDispatchRules(): Promise<DispatchRulesRow> {
  try {
    const sb = createSupabaseServiceClient();
    const { data, error } = await sb
      .from("agency_dispatch_rules")
      .select("id, rules_json, rules_text_md, updated_at")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.warn("dispatch rules: table unavailable, using defaults", error.message);
      return defaultDispatchRulesRow();
    }

    if (!data) {
      return defaultDispatchRulesRow();
    }

    return mapDispatchRulesRow(data);
  } catch (e) {
    console.warn("dispatch rules: fallback to defaults", e);
    return defaultDispatchRulesRow();
  }
}

function defaultDispatchRulesRow(): DispatchRulesRow {
  return {
    id: "default",
    rules: DEFAULT_DISPATCH_RULES,
    workRules: structuredClone(DEFAULT_WORK_RULES_DOCUMENT),
    rulesTextMd: null,
    updatedAt: new Date(0).toISOString(),
  };
}

function mapDispatchRulesRow(data: {
  id: unknown;
  rules_json: unknown;
  rules_text_md: unknown;
  updated_at: unknown;
}): DispatchRulesRow {
  const raw = data.rules_json as Record<string, unknown> | null;
  const workRules = normalizeWorkRulesDocument(raw?.workRules);
  return {
    id: String(data.id),
    rules: normalizeDispatchRules(raw),
    workRules,
    rulesTextMd: data.rules_text_md ? String(data.rules_text_md) : null,
    updatedAt: String(data.updated_at),
  };
}

export async function updateDispatchRules(input: {
  workRules: WorkRulesDocument;
}): Promise<DispatchRulesRow> {
  const sb = createSupabaseServiceClient();
  const current = await getDispatchRules();
  const rules = syncWorkRulesToRules(input.workRules, current.rules);
  const rules_json = rulesJsonWithWorkRules(rules, input.workRules);
  const updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from("agency_dispatch_rules")
    .upsert({ id: "default", rules_json, updated_at }, { onConflict: "id" })
    .select("id, rules_json, rules_text_md, updated_at")
    .single();

  if (error) throw error;
  return mapDispatchRulesRow(data);
}

export async function listDispatchProjects(
  _ctx: V2SessionContext,
  year: number,
  month: number
): Promise<DispatchProjectView[]> {
  const rawProjects = await getAgencyRepoV2().listProjectsWithTotalExpenses();
  const effectiveTotals = await loadEffectiveTotals(rawProjects);
  return rawProjects
    .map((r) => mapDispatchProject(r, effectiveTotals))
    .filter((p) => p.businessLine === "agency")
    .filter((p) => isInFinanceMonth(p.createdAt, year, month))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function isPlanRelevantProject(
  p: DispatchProjectView,
  year: number,
  month: number
): boolean {
  if (p.dispatchWorkStatus === "done") return false;
  if (
    p.dispatchWorkStatus === "in_progress" ||
    p.dispatchWorkStatus === "revisions" ||
    p.dispatchWorkStatus === "on_approval"
  ) {
    return true;
  }
  if (p.dispatchWorkStatus === "planned") {
    return isInFinanceMonth(p.createdAt, year, month);
  }
  return false;
}

export function splitDispatchProjectsForPlan(
  projects: DispatchProjectView[],
  year: number,
  month: number
) {
  const activeProjects = projects.filter((p) => {
    if (!isPlanRelevantProject(p, year, month)) return false;
    if (p.dispatchWorkStatus === "on_approval") return false;
    return dispatchStatusMeta(p.dispatchWorkStatus).consumesPlanHours;
  });

  const approvalRiskProjects = projects.filter((p) => p.dispatchWorkStatus === "on_approval");

  const totalPlannedHoursRemaining = activeProjects.reduce(
    (s, p) => s + Math.max(0, p.plannedHoursRemaining ?? 0),
    0
  );

  return { activeProjects, approvalRiskProjects, totalPlannedHoursRemaining };
}

/** Проекты месяца + активные in-flight из других месяцев (ещё не «Готов»). */
export async function listDispatchProjectsForContext(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<DispatchProjectView[]> {
  const rawProjects = await getAgencyRepoV2().listProjectsWithTotalExpenses();
  const effectiveTotals = await loadEffectiveTotals(rawProjects);
  const all = rawProjects
    .map((r) => mapDispatchProject(r, effectiveTotals))
    .filter((p) => p.businessLine === "agency");

  const inMonth = all.filter((p) => isInFinanceMonth(p.createdAt, year, month));
  const carryOver = all.filter(
    (p) =>
      !isInFinanceMonth(p.createdAt, year, month) &&
      (p.dispatchWorkStatus === "in_progress" ||
        p.dispatchWorkStatus === "revisions" ||
        p.dispatchWorkStatus === "on_approval")
  );

  const byId = new Map<string, DispatchProjectView>();
  for (const p of [...inMonth, ...carryOver]) byId.set(p.id, p);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
