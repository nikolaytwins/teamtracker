import { getAgencyRepoV2 } from "@/lib/agency-store";
import { isInFinanceMonth } from "@/lib/v2/finance/meta";
import { FINANCE_SERVICE_META, isFinanceServiceType } from "@/lib/v2/finance/meta";
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

function repo() {
  return getAgencyRepoV2();
}

function mapAgencyProject(raw: Record<string, unknown>, workspaceId: string): V2FinanceProjectRow {
  const st = raw.serviceType;
  const service_type: V2FinanceServiceType =
    isFinanceServiceType(st) ? st : "site";
  const statusRaw = raw.status;
  const status: V2FinancePaymentStatus =
    statusRaw === "paid" || statusRaw === "prepaid" ? statusRaw : "not_paid";
  const pm = raw.paymentMethod;
  return {
    id: String(raw.id),
    workspace_id: workspaceId,
    name: String(raw.name),
    total_amount: Number(raw.totalAmount) || 0,
    paid_amount: Number(raw.paidAmount) || 0,
    deadline: raw.deadline ? String(raw.deadline) : null,
    status,
    service_type,
    client_type: raw.clientType ? String(raw.clientType) : null,
    payment_method: pm === "card" || pm === "account" ? pm : null,
    client_contact: raw.clientContact ? String(raw.clientContact) : null,
    notes: raw.notes ? String(raw.notes) : null,
    source_lead_id: raw.source_lead_id ? String(raw.source_lead_id) : null,
    created_at: String(raw.createdAt),
    updated_at: String(raw.updatedAt),
  };
}

function mapAgencyGeneralExpense(
  raw: Record<string, unknown>,
  workspaceId: string
): V2FinanceGeneralExpenseRow {
  const name = raw.employeeName ? String(raw.employeeName).trim() : "";
  const role = raw.employeeRole ? String(raw.employeeRole).trim() : "";
  return {
    id: String(raw.id),
    workspace_id: workspaceId,
    employee_name: name || String(raw.notes ?? "—"),
    employee_role: role || "custom",
    amount: Number(raw.amount) || 0,
    notes: raw.notes ? String(raw.notes) : null,
    created_at: String(raw.createdAt),
    updated_at: String(raw.updatedAt),
  };
}

async function loadDetailsTotals(projectIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!projectIds.length) return out;
  const details = await repo().listProjectDetails();
  for (const row of details) {
    const pid = String(row.projectId);
    if (!projectIds.includes(pid)) continue;
    const sum = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
    out.set(pid, (out.get(pid) ?? 0) + sum);
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
  const rows = await repo().listProjectsWithTotalExpenses();
  return rows.map((r) => mapAgencyProject(r, ctx.workspaceId));
}

async function loadEnrichedFinanceProjects(ctx: V2SessionContext): Promise<V2FinanceProjectView[]> {
  const rawProjects = await repo().listProjectsWithTotalExpenses();
  const ids = rawProjects.map((r) => String(r.id));
  const detailTotals = await loadDetailsTotals(ids);
  const expenseTotals = new Map<string, number>();
  for (const r of rawProjects) {
    expenseTotals.set(String(r.id), Number(r.totalExpenses) || 0);
  }
  return rawProjects.map((r) => enrichProject(mapAgencyProject(r, ctx.workspaceId), expenseTotals, detailTotals));
}

export async function listFinanceProjectsForMonth(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<V2FinanceProjectView[]> {
  const all = await loadEnrichedFinanceProjects(ctx);
  return all
    .filter((p) => isInFinanceMonth(p.created_at, year, month))
    .sort((a, b) => {
      const order: Record<V2FinancePaymentStatus, number> = { paid: 0, prepaid: 1, not_paid: 2 };
      return order[a.status] - order[b.status];
    });
}

/** Сводки по месяцам за один проход — те же формулы, что в дашборде финансов. */
export async function listFinanceMonthSummaries(
  ctx: V2SessionContext,
  months: { year: number; month: number }[]
): Promise<Map<string, V2FinanceMonthSummary>> {
  const out = new Map<string, V2FinanceMonthSummary>();
  if (!months.length) return out;

  const [allProjects, allExpensesRaw] = await Promise.all([
    loadEnrichedFinanceProjects(ctx),
    repo().listGeneralExpenses(),
  ]);
  const allExpenses = allExpensesRaw.map((r) => mapAgencyGeneralExpense(r, ctx.workspaceId));

  for (const { year, month } of months) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const projects = allProjects.filter((p) => isInFinanceMonth(p.created_at, year, month));
    const generalExpenses = allExpenses.filter((e) => isInFinanceMonth(e.created_at, year, month));
    out.set(key, computeFinanceMonthSummary(projects, generalExpenses, year, month));
  }
  return out;
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
  const created = await repo().createProject({
    name: input.name,
    totalAmount: input.totalAmount ?? 0,
    paidAmount: input.paidAmount ?? 0,
    status: input.status ?? "not_paid",
    serviceType: input.serviceType ?? "site",
    clientType: input.clientType ?? null,
    paymentMethod: input.paymentMethod ?? null,
    clientContact: input.clientContact ?? null,
    notes: input.notes ?? null,
  });
  if (input.year && input.month) {
    await repo().moveProjectToMonth(created.id, input.year, input.month);
  }
  const full = await repo().getProjectById(created.id);
  if (!full) throw new Error("create_failed");
  return mapAgencyProject(full, ctx.workspaceId);
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
  const cur = await repo().getProjectById(id);
  if (!cur) return null;

  const totalAmount = patch.total_amount ?? (Number(cur.totalAmount) || 0);
  let paidAmount = patch.paid_amount ?? (Number(cur.paidAmount) || 0);
  const status = (patch.status ?? String(cur.status)) as V2FinancePaymentStatus;
  if (patch.status === "paid") paidAmount = totalAmount;
  if (patch.status === "not_paid") paidAmount = 0;

  const updated = await repo().updateProjectById(id, {
    name: patch.name ?? String(cur.name),
    totalAmount,
    paidAmount,
    deadline: cur.deadline ?? null,
    status,
    serviceType: patch.service_type ?? String(cur.serviceType ?? "site"),
    clientType:
      patch.client_type !== undefined ? patch.client_type : (cur.clientType as string | null) ?? null,
    paymentMethod:
      patch.payment_method !== undefined
        ? patch.payment_method
        : (cur.paymentMethod as string | null) ?? null,
    clientContact:
      patch.client_contact !== undefined
        ? patch.client_contact
        : (cur.clientContact as string | null) ?? null,
    notes: patch.notes !== undefined ? patch.notes : (cur.notes as string | null) ?? null,
  });
  if (!updated) return null;
  return mapAgencyProject(updated, ctx.workspaceId);
}

export async function deleteFinanceProject(_ctx: V2SessionContext, id: string): Promise<boolean> {
  await repo().deleteProjectById(id);
  return true;
}

export async function copyFinanceProjectToNextMonth(
  ctx: V2SessionContext,
  id: string,
  year: number,
  month: number
): Promise<V2FinanceProjectRow | null> {
  try {
    const copied = await repo().copyProjectToMonth(id, year, month);
    const full = await repo().getProjectById(copied.id);
    if (!full) return null;
    return mapAgencyProject(full, ctx.workspaceId);
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") return null;
    throw e;
  }
}

export async function moveFinanceProjectToMonth(
  _ctx: V2SessionContext,
  id: string,
  year: number,
  month: number
): Promise<boolean> {
  try {
    await repo().moveProjectToMonth(id, year, month);
    return true;
  } catch (e) {
    if (e instanceof Error && e.message === "not_found") return false;
    throw e;
  }
}

export async function listFinanceGeneralExpenses(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<V2FinanceGeneralExpenseRow[]> {
  const rows = await repo().listGeneralExpenses();
  return rows
    .map((r) => mapAgencyGeneralExpense(r, ctx.workspaceId))
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
  const id = `agexp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row = await repo().createGeneralExpense({
    id,
    employeeName: input.employeeName.trim(),
    employeeRole: input.employeeRole.trim(),
    amount: input.amount,
    notes: input.notes ?? null,
    year: input.year,
    month: input.month,
  });
  return mapAgencyGeneralExpense(row, ctx.workspaceId);
}

export async function updateFinanceGeneralExpense(
  ctx: V2SessionContext,
  id: string,
  input: {
    employeeName: string;
    employeeRole: string;
    amount: number;
    notes?: string | null;
  }
): Promise<V2FinanceGeneralExpenseRow> {
  const existing = await repo().getGeneralExpenseById(id);
  if (!existing) throw new Error("Expense not found");

  const updated = await repo().updateGeneralExpenseById(
    id,
    input.employeeName.trim(),
    input.employeeRole.trim(),
    input.amount,
    input.notes?.trim() || null
  );
  if (!updated) throw new Error("Expense not found after update");
  return mapAgencyGeneralExpense(updated, ctx.workspaceId);
}

export async function deleteFinanceGeneralExpense(_ctx: V2SessionContext, id: string): Promise<void> {
  await repo().deleteGeneralExpenseById(id);
}

export async function copyFinanceGeneralExpensesFromMonth(
  _ctx: V2SessionContext,
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Promise<number> {
  return repo().copyGeneralExpensesBetweenMonths({
    fromYear,
    fromMonth,
    toYear,
    toMonth,
  });
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
  const profit = expectedRevenue - totalExpenses;
  const margin = expectedRevenue ? (profit / expectedRevenue) * 100 : 0;
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
