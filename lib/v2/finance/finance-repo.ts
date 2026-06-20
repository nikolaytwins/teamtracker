import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { financeMonthRange, isInFinanceMonth } from "@/lib/v2/finance/meta";
import { FINANCE_SERVICE_META } from "@/lib/v2/finance/meta";
import type {
  V2FinanceGeneralExpenseRow,
  V2FinanceMonthSummary,
  V2FinancePaymentStatus,
  V2FinanceProjectRow,
  V2FinanceProjectView,
  V2FinanceServiceStat,
  V2FinanceServiceType,
} from "@/lib/v2/finance/types";
import type { V2SessionContext } from "@/lib/v2/types";

function mapProject(raw: Record<string, unknown>): V2FinanceProjectRow {
  const st = raw.service_type;
  const service_type: V2FinanceServiceType =
    st === "presentation" || st === "small_task" || st === "subscription" ? st : "site";
  const statusRaw = raw.status;
  const status: V2FinancePaymentStatus =
    statusRaw === "paid" || statusRaw === "prepaid" ? statusRaw : "not_paid";
  return {
    id: String(raw.id),
    workspace_id: String(raw.workspace_id),
    name: String(raw.name),
    total_amount: Number(raw.total_amount) || 0,
    paid_amount: Number(raw.paid_amount) || 0,
    deadline: raw.deadline ? String(raw.deadline) : null,
    status,
    service_type,
    client_type: raw.client_type ? String(raw.client_type) : null,
    payment_method:
      raw.payment_method === "card" || raw.payment_method === "account" ? raw.payment_method : null,
    client_contact: raw.client_contact ? String(raw.client_contact) : null,
    notes: raw.notes ? String(raw.notes) : null,
    source_lead_id: raw.source_lead_id ? String(raw.source_lead_id) : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

function mapGeneralExpense(raw: Record<string, unknown>): V2FinanceGeneralExpenseRow {
  return {
    id: String(raw.id),
    workspace_id: String(raw.workspace_id),
    employee_name: String(raw.employee_name),
    employee_role: String(raw.employee_role),
    amount: Number(raw.amount) || 0,
    notes: raw.notes ? String(raw.notes) : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

async function loadDetailsTotals(projectIds: string[]): Promise<Map<string, number>> {
  const sb = getV2Supabase();
  const out = new Map<string, number>();
  if (!projectIds.length) return out;
  const { data, error } = await sb
    .from("v2_finance_project_details")
    .select("project_id, quantity, unit_price")
    .in("project_id", projectIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const pid = row.project_id as string;
    const sum = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);
    out.set(pid, (out.get(pid) ?? 0) + sum);
  }
  return out;
}

async function loadExpenseTotals(projectIds: string[]): Promise<Map<string, number>> {
  const sb = getV2Supabase();
  const out = new Map<string, number>();
  if (!projectIds.length) return out;
  const { data, error } = await sb
    .from("v2_finance_expenses")
    .select("project_id, amount")
    .in("project_id", projectIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const pid = row.project_id as string;
    out.set(pid, (out.get(pid) ?? 0) + (Number(row.amount) || 0));
  }
  return out;
}

function enrichProject(
  p: V2FinanceProjectRow,
  expenseTotals: Map<string, number>,
  detailTotals: Map<string, number>
): V2FinanceProjectView {
  const total_details_amount = detailTotals.get(p.id) ?? 0;
  const effective_total_amount = total_details_amount > 0 ? total_details_amount : p.total_amount;
  return {
    ...p,
    total_expenses: expenseTotals.get(p.id) ?? 0,
    total_details_amount,
    effective_total_amount,
  };
}

export async function listFinanceProjects(ctx: V2SessionContext): Promise<V2FinanceProjectRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_finance_projects")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapProject(r as Record<string, unknown>));
}

export async function listFinanceProjectsForMonth(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<V2FinanceProjectView[]> {
  const all = await listFinanceProjects(ctx);
  const filtered = all.filter((p) => isInFinanceMonth(p.created_at, year, month));
  const ids = filtered.map((p) => p.id);
  const [expenseTotals, detailTotals] = await Promise.all([
    loadExpenseTotals(ids),
    loadDetailsTotals(ids),
  ]);
  return filtered
    .map((p) => enrichProject(p, expenseTotals, detailTotals))
    .sort((a, b) => {
      const order: Record<V2FinancePaymentStatus, number> = { paid: 0, prepaid: 1, not_paid: 2 };
      return order[a.status] - order[b.status];
    });
}

export async function getLatestFinanceProjectMonth(ctx: V2SessionContext): Promise<{
  year: number;
  month: number;
} | null> {
  const all = await listFinanceProjects(ctx);
  if (!all.length) return null;
  let best = all[0]!.created_at;
  for (const p of all) {
    if (p.created_at > best) best = p.created_at;
  }
  const d = new Date(best);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export async function createFinanceProject(
  ctx: V2SessionContext,
  input: {
    name: string;
    totalAmount?: number;
    paidAmount?: number;
    status?: V2FinancePaymentStatus;
    serviceType?: V2FinanceServiceType;
    clientType?: string | null;
    paymentMethod?: string | null;
    clientContact?: string | null;
    notes?: string | null;
    year?: number;
    month?: number;
  }
): Promise<V2FinanceProjectRow> {
  const sb = getV2Supabase();
  const id = newV2Id();
  const now = nowIso();
  let created_at = now;
  if (input.year && input.month) {
    created_at = `${input.year}-${String(input.month).padStart(2, "0")}-01T12:00:00.000Z`;
  }
  const row = {
    id,
    workspace_id: ctx.workspaceId,
    name: input.name.trim(),
    total_amount: input.totalAmount ?? 0,
    paid_amount: input.paidAmount ?? 0,
    deadline: null,
    status: input.status ?? "not_paid",
    service_type: input.serviceType ?? "site",
    client_type: input.clientType ?? null,
    payment_method: input.paymentMethod ?? null,
    client_contact: input.clientContact ?? null,
    notes: input.notes ?? null,
    source_lead_id: null,
    created_at,
    updated_at: now,
  };
  const { error } = await sb.from("v2_finance_projects").insert(row);
  if (error) throw error;
  return mapProject(row);
}

export async function updateFinanceProject(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<{
    name: string;
    total_amount: number;
    paid_amount: number;
    status: V2FinancePaymentStatus;
    service_type: V2FinanceServiceType;
    client_type: string | null;
    payment_method: string | null;
    client_contact: string | null;
    notes: string | null;
  }>
): Promise<V2FinanceProjectRow | null> {
  const sb = getV2Supabase();
  const { data: existing, error: e0 } = await sb
    .from("v2_finance_projects")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (e0) throw e0;
  if (!existing) return null;
  const { error } = await sb
    .from("v2_finance_projects")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw error;
  const { data, error: e1 } = await sb.from("v2_finance_projects").select("*").eq("id", id).single();
  if (e1) throw e1;
  return mapProject(data as Record<string, unknown>);
}

export async function deleteFinanceProject(ctx: V2SessionContext, id: string): Promise<boolean> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_finance_projects")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw error;
  return true;
}

export async function copyFinanceProjectToNextMonth(
  ctx: V2SessionContext,
  id: string,
  year: number,
  month: number
): Promise<V2FinanceProjectRow | null> {
  const sb = getV2Supabase();
  const { data: cur, error: e0 } = await sb
    .from("v2_finance_projects")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  if (e0) throw e0;
  if (!cur) return null;
  const newId = newV2Id();
  const created_at = `${year}-${String(month).padStart(2, "0")}-01T12:00:00.000Z`;
  const now = nowIso();
  const { error: e1 } = await sb.from("v2_finance_projects").insert({
    id: newId,
    workspace_id: ctx.workspaceId,
    name: cur.name,
    total_amount: cur.total_amount,
    paid_amount: 0,
    deadline: cur.deadline,
    status: "not_paid",
    service_type: cur.service_type,
    client_type: cur.client_type,
    payment_method: cur.payment_method,
    client_contact: cur.client_contact,
    notes: cur.notes,
    source_lead_id: null,
    created_at,
    updated_at: now,
  });
  if (e1) throw e1;
  const { data: exps, error: e2 } = await sb.from("v2_finance_expenses").select("*").eq("project_id", id);
  if (e2) throw e2;
  for (const e of exps ?? []) {
    const { error: e3 } = await sb.from("v2_finance_expenses").insert({
      id: newV2Id(),
      workspace_id: ctx.workspaceId,
      project_id: newId,
      employee_name: e.employee_name,
      employee_role: e.employee_role,
      amount: e.amount,
      notes: e.notes,
      created_at: now,
      updated_at: now,
    });
    if (e3) throw e3;
  }
  const { data, error: e4 } = await sb.from("v2_finance_projects").select("*").eq("id", newId).single();
  if (e4) throw e4;
  return mapProject(data as Record<string, unknown>);
}

export async function moveFinanceProjectToMonth(
  ctx: V2SessionContext,
  id: string,
  year: number,
  month: number
): Promise<boolean> {
  const sb = getV2Supabase();
  const created_at = `${year}-${String(month).padStart(2, "0")}-01T12:00:00.000Z`;
  const { error } = await sb
    .from("v2_finance_projects")
    .update({ created_at, updated_at: nowIso() })
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw error;
  return true;
}

export async function listFinanceGeneralExpenses(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<V2FinanceGeneralExpenseRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_finance_general_expenses")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((r) => mapGeneralExpense(r as Record<string, unknown>))
    .filter((e) => isInFinanceMonth(e.created_at, year, month));
}

export async function createFinanceGeneralExpense(
  ctx: V2SessionContext,
  input: {
    employeeName: string;
    employeeRole: string;
    amount: number;
    notes?: string | null;
    year?: number;
    month?: number;
  }
): Promise<V2FinanceGeneralExpenseRow> {
  const sb = getV2Supabase();
  const id = newV2Id();
  const now = nowIso();
  let created_at = now;
  if (input.year && input.month) {
    created_at = `${input.year}-${String(input.month).padStart(2, "0")}-15T12:00:00.000Z`;
  }
  const row = {
    id,
    workspace_id: ctx.workspaceId,
    employee_name: input.employeeName.trim(),
    employee_role: input.employeeRole.trim(),
    amount: input.amount,
    notes: input.notes ?? null,
    created_at,
    updated_at: now,
  };
  const { error } = await sb.from("v2_finance_general_expenses").insert(row);
  if (error) throw error;
  return mapGeneralExpense(row);
}

export async function deleteFinanceGeneralExpense(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_finance_general_expenses")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw error;
}

export async function copyFinanceGeneralExpensesFromMonth(
  ctx: V2SessionContext,
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Promise<number> {
  const sb = getV2Supabase();
  const { start: fromStart, end: fromEnd } = financeMonthRange(fromYear, fromMonth);
  const toDate = `${toYear}-${String(toMonth).padStart(2, "0")}-15T12:00:00.000Z`;
  const { data, error } = await sb
    .from("v2_finance_general_expenses")
    .select("*")
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw error;
  let copied = 0;
  const now = nowIso();
  for (const exp of data ?? []) {
    const ca = new Date(exp.created_at as string);
    if (ca < fromStart || ca > fromEnd) continue;
    const { error: e2 } = await sb.from("v2_finance_general_expenses").insert({
      id: newV2Id(),
      workspace_id: ctx.workspaceId,
      employee_name: exp.employee_name,
      employee_role: exp.employee_role,
      amount: exp.amount,
      notes: exp.notes,
      created_at: toDate,
      updated_at: now,
    });
    if (e2) throw e2;
    copied++;
  }
  return copied;
}

export function computeFinanceMonthSummary(
  projects: V2FinanceProjectView[],
  generalExpenses: V2FinanceGeneralExpenseRow[],
  year: number,
  month: number
): V2FinanceMonthSummary {
  const expectedRevenue = projects.reduce((s, p) => s + p.effective_total_amount, 0);
  const actualRevenue = projects.reduce((s, p) => s + p.paid_amount, 0);
  const projectExpenses = projects.reduce((s, p) => s + p.total_expenses, 0);
  const manualGeneralExpenses = generalExpenses.reduce((s, e) => s + e.amount, 0);
  const accountRevenue = projects
    .filter((p) => p.payment_method === "account" && p.status === "paid")
    .reduce((s, p) => s + p.paid_amount, 0);
  const taxAmount = 6916 + accountRevenue * 0.01;
  const totalExpenses = projectExpenses + manualGeneralExpenses + taxAmount;
  const profit = actualRevenue - totalExpenses;
  const margin = actualRevenue ? (profit / actualRevenue) * 100 : 0;
  return {
    year,
    month,
    expectedRevenue,
    actualRevenue,
    projectExpenses,
    manualGeneralExpenses,
    taxAmount,
    totalExpenses,
    profit,
    margin,
    projectCount: projects.length,
  };
}

export function computeFinanceServiceStats(projects: V2FinanceProjectView[]): V2FinanceServiceStat[] {
  const keys = Object.keys(FINANCE_SERVICE_META) as V2FinanceServiceType[];
  return keys
    .map((serviceType) => {
      const rows = projects.filter((p) => p.service_type === serviceType);
      const meta = FINANCE_SERVICE_META[serviceType];
      return {
        serviceType,
        label: meta.label,
        total: rows.reduce((s, p) => s + p.paid_amount, 0),
        count: rows.length,
        tint: meta.tint,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.total - a.total);
}
