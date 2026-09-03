import { getAgencyRepoV2 } from "@/lib/agency-store";
import { agencyDetailLineTotal } from "@/lib/agency/detail-line-total";
import { isInFinanceMonth } from "@/lib/v2/finance/meta";
import {
  FINANCE_BUSINESS_LINE_META,
  FINANCE_MONTH_NAMES,
  FINANCE_SERVICE_META,
  isFinanceBusinessLine,
  isFinanceServiceType,
} from "@/lib/v2/finance/meta";
import type {
  V2FinanceBusinessLine,
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
  const business_line: V2FinanceBusinessLine = isFinanceBusinessLine(raw.businessLine)
    ? raw.businessLine
    : "agency";
  return {
    id: String(raw.id),
    workspace_id: workspaceId,
    name: String(raw.name),
    total_amount: Number(raw.totalAmount) || 0,
    paid_amount: Number(raw.paidAmount) || 0,
    deadline: raw.deadline ? String(raw.deadline) : null,
    status,
    service_type,
    business_line,
    client_type: raw.clientType ? String(raw.clientType) : null,
    payment_method: pm === "card" || pm === "account" ? pm : null,
    client_contact: raw.clientContact ? String(raw.clientContact) : null,
    notes: raw.notes ? String(raw.notes) : null,
    source_lead_id: raw.source_lead_id ? String(raw.source_lead_id) : null,
    payment_certain_this_month: raw.paymentCertainThisMonth === true,
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
    business_line: isFinanceBusinessLine(raw.businessLine) ? raw.businessLine : "agency",
    created_at: String(raw.createdAt),
    updated_at: String(raw.updatedAt),
  };
}

async function loadDetailsTotals(
  projectIds: string[],
  rawProjects?: Awaited<ReturnType<ReturnType<typeof repo>["listProjectsWithTotalExpenses"]>>
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!projectIds.length) return out;
  const projects = rawProjects ?? (await repo().listProjectsWithTotalExpenses());
  const rates = new Map<string, number>();
  for (const p of projects) {
    rates.set(String(p.id), Number(p.hourlyRateRub) || 0);
  }
  const details = await repo().listProjectDetails();
  for (const row of details) {
    const pid = String(row.projectId);
    if (!projectIds.includes(pid)) continue;
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
  const detailTotals = await loadDetailsTotals(ids, rawProjects);
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

/** Неоплаченные проекты с остатком к получению — для личного кассового прогноза. */
export async function listUnpaidFinanceRemainders(ctx: V2SessionContext): Promise<
  Array<{
    project_id: string;
    name: string;
    remaining_rub: number;
    status: V2FinancePaymentStatus;
  }>
> {
  const all = await loadEnrichedFinanceProjects(ctx);
  return all
    .filter((p) => p.status !== "paid")
    .map((p) => ({
      project_id: p.id,
      name: p.name,
      remaining_rub: Math.max(0, Math.round(p.effective_total_amount - p.paid_amount)),
      status: p.status,
    }))
    .filter((p) => p.remaining_rub > 0)
    .sort((a, b) => b.remaining_rub - a.remaining_rub || a.name.localeCompare(b.name, "ru"));
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

export type V2FinanceLineMonthPoint = {
  key: string;
  year: number;
  month: number;
  label: string;
  expectedRevenue: number;
  actualRevenue: number;
  totalExpenses: number;
  profit: number;
  projectCount: number;
};

export type V2FinanceLineAnalytics = {
  businessLine: V2FinanceBusinessLine;
  months: V2FinanceLineMonthPoint[];
  byService: V2FinanceServiceStat[];
  totals: {
    expectedRevenue: number;
    actualRevenue: number;
    totalExpenses: number;
    profit: number;
    projectCount: number;
  };
};

/**
 * Вся история по направлению: помесячная выручка/прибыль и разрез по услугам.
 * Общие расходы и налог не делятся между направлениями — считаются как накладные целиком.
 */
export async function loadFinanceLineAnalytics(
  ctx: V2SessionContext,
  businessLine: V2FinanceBusinessLine
): Promise<V2FinanceLineAnalytics> {
  const [allProjects, allExpensesRaw] = await Promise.all([
    loadEnrichedFinanceProjects(ctx),
    repo().listGeneralExpenses(),
  ]);
  const allExpenses = allExpensesRaw.map((r) => mapAgencyGeneralExpense(r, ctx.workspaceId));
  const lineProjects = allProjects.filter((p) => p.business_line === businessLine);

  const monthKeys = new Map<string, { year: number; month: number }>();
  for (const p of lineProjects) {
    const d = new Date(p.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    monthKeys.set(`${year}-${String(month).padStart(2, "0")}`, { year, month });
  }

  const months: V2FinanceLineMonthPoint[] = [...monthKeys.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, { year, month }]) => {
      const projects = lineProjects.filter((p) => isInFinanceMonth(p.created_at, year, month));
      const generalExpenses = allExpenses.filter(
        (e) => e.business_line === businessLine && isInFinanceMonth(e.created_at, year, month)
      );
      const summary = computeFinanceMonthSummary(projects, generalExpenses, year, month, {
        fixedTax: financeFixedTaxForLine(businessLine),
      });
      return {
        key,
        year,
        month,
        label: `${FINANCE_MONTH_NAMES[month - 1]?.slice(0, 3) ?? month} ${String(year).slice(2)}`,
        expectedRevenue: summary.expectedRevenue,
        actualRevenue: summary.actualRevenue,
        totalExpenses: summary.totalExpenses,
        profit: summary.profit,
        projectCount: summary.projectCount,
      };
    });

  const totals = months.reduce(
    (acc, m) => ({
      expectedRevenue: acc.expectedRevenue + m.expectedRevenue,
      actualRevenue: acc.actualRevenue + m.actualRevenue,
      totalExpenses: acc.totalExpenses + m.totalExpenses,
      profit: acc.profit + m.profit,
      projectCount: acc.projectCount + m.projectCount,
    }),
    { expectedRevenue: 0, actualRevenue: 0, totalExpenses: 0, profit: 0, projectCount: 0 }
  );

  return {
    businessLine,
    months,
    byService: computeFinanceServiceStats(lineProjects),
    totals,
  };
}

export async function createFinanceProject(
  ctx: V2SessionContext,
  input: {
    name: string;
    totalAmount?: number;
    paidAmount?: number;
    status?: V2FinancePaymentStatus;
    serviceType?: V2FinanceServiceType;
    businessLine?: V2FinanceBusinessLine;
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
    businessLine: input.businessLine ?? "agency",
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
    business_line: V2FinanceBusinessLine;
    client_type: string | null;
    payment_method: string | null;
    client_contact: string | null;
    notes: string | null;
    payment_certain_this_month?: boolean;
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
    businessLine:
      patch.business_line ??
      (isFinanceBusinessLine(cur.businessLine) ? cur.businessLine : "agency"),
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
    ...(patch.payment_certain_this_month !== undefined
      ? { paymentCertainThisMonth: patch.payment_certain_this_month }
      : {}),
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
    businessLine?: V2FinanceBusinessLine;
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
    businessLine: input.businessLine ?? "agency",
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
    businessLine?: V2FinanceBusinessLine;
  }
): Promise<V2FinanceGeneralExpenseRow> {
  const existing = await repo().getGeneralExpenseById(id);
  if (!existing) throw new Error("Expense not found");

  const updated = await repo().updateGeneralExpenseById(
    id,
    input.employeeName.trim(),
    input.employeeRole.trim(),
    input.amount,
    input.notes?.trim() || null,
    input.businessLine
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
  toMonth: number,
  businessLine?: V2FinanceBusinessLine
): Promise<number> {
  return repo().copyGeneralExpensesBetweenMonths({
    fromYear,
    fromMonth,
    toYear,
    toMonth,
    businessLine,
  });
}

/** Фиксированные страховые взносы ИП — относятся к агентству как основному направлению. */
const FIXED_MONTHLY_TAX_RUB = 6916;

export function financeFixedTaxForLine(businessLine: V2FinanceBusinessLine): number {
  return businessLine === "agency" ? FIXED_MONTHLY_TAX_RUB : 0;
}

export function computeFinanceMonthSummary(
  projects: V2FinanceProjectView[],
  generalExpenses: V2FinanceGeneralExpenseRow[],
  year: number,
  month: number,
  options?: { fixedTax?: number }
): V2FinanceMonthSummary {
  const expectedRevenue = projects.reduce((s, p) => s + p.effective_total_amount, 0);
  const actualRevenue = projects.reduce((s, p) => s + p.paid_amount, 0);
  const projectExpenses = projects.reduce((s, p) => s + p.total_expenses, 0);
  const manualGeneralExpenses = generalExpenses.reduce((s, e) => s + e.amount, 0);
  const accountRevenue = projects
    .filter((p) => p.payment_method === "account" && p.status === "paid")
    .reduce((s, p) => s + p.paid_amount, 0);
  const taxAmount = (options?.fixedTax ?? FIXED_MONTHLY_TAX_RUB) + accountRevenue * 0.01;
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

/**
 * Сводка по каждому направлению за месяц: свои проекты и свои общие расходы.
 * Фиксированные взносы ИП добавляются только агентству, чтобы не дублироваться между направлениями.
 */
export function computeFinanceSummaryByLine(
  projects: V2FinanceProjectView[],
  generalExpenses: V2FinanceGeneralExpenseRow[],
  year: number,
  month: number
): Record<V2FinanceBusinessLine, V2FinanceMonthSummary> {
  const lines = Object.keys(FINANCE_BUSINESS_LINE_META) as V2FinanceBusinessLine[];
  const out = {} as Record<V2FinanceBusinessLine, V2FinanceMonthSummary>;
  for (const line of lines) {
    out[line] = computeFinanceMonthSummary(
      projects.filter((p) => p.business_line === line),
      generalExpenses.filter((e) => e.business_line === line),
      year,
      month,
      { fixedTax: financeFixedTaxForLine(line) }
    );
  }
  return out;
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
