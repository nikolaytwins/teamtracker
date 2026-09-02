/** Приводим строки из Supabase (snake_case) к форме, ожидаемой текущим UI/API (camelCase). */

import type { AgencyProjectTrackedTimeRow } from "@/lib/agency/tracked-time-types";

export function mapProjectRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    totalAmount: r.total_amount,
    paidAmount: r.paid_amount,
    deadline: r.deadline,
    status: r.status,
    serviceType: r.service_type,
    businessLine: r.business_line ?? "agency",
    clientType: r.client_type,
    paymentMethod: r.payment_method,
    clientContact: r.client_contact,
    notes: r.notes,
    source_lead_id: r.source_lead_id,
    workStatus: r.work_status ?? "not_started",
    kanbanSortOrder: Number(r.kanban_sort_order) || 0,
    hourlyRateRub: Number(r.hourly_rate_rub) || 0,
    dispatchWorkStatus: r.dispatch_work_status ?? "planned",
    workDeadline: r.work_deadline ?? null,
    plannedHoursRemaining:
      r.planned_hours_remaining == null ? null : Number(r.planned_hours_remaining),
    paymentCertainThisMonth: r.payment_certain_this_month === true,
    workModelType: r.work_model_type ?? "other",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapLeadRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    contact: r.contact,
    source: r.source,
    taskDescription: r.task_description,
    status: r.status,
    nextContactDate: r.next_contact_date,
    manualDateSet: r.manual_date_set ? 1 : 0,
    isRecurring: r.is_recurring ? 1 : 0,
    archived: r.archived === true || r.archived === 1 ? 1 : 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapExpenseRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    projectId: r.project_id,
    employeeName: r.employee_name,
    employeeRole: r.employee_role,
    amount: r.amount,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapGeneralExpenseRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    employeeName: r.employee_name,
    employeeRole: r.employee_role,
    amount: r.amount,
    notes: r.notes,
    businessLine: r.business_line ?? "agency",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapDetailRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    quantity: r.quantity,
    unitPrice: r.unit_price,
    order: r.sort_order,
    billingType: r.billing_type === "hourly" ? "hourly" : "fixed",
    trackedSeconds: Number(r.tracked_seconds) || 0,
    timerStartedAt: r.timer_started_at ? String(r.timer_started_at) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapTrackedTimeRow(r: Record<string, unknown>): AgencyProjectTrackedTimeRow {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    userId: String(r.user_id),
    source: String(r.source ?? "personal_timer"),
    sourceEntryId: r.source_entry_id ? String(r.source_entry_id) : null,
    task: String(r.task ?? ""),
    activity: String(r.activity ?? ""),
    durationSeconds: Math.max(0, Math.floor(Number(r.duration_seconds) || 0)),
    trackedAt: String(r.tracked_at),
    inEstimate: r.in_estimate === true,
    detailId: r.detail_id ? String(r.detail_id) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export function mapOutreachRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    platform: r.platform,
    createdAt: r.created_at,
    cost: r.cost,
    refundAmount: r.refund_amount,
    status: r.status,
    projectAmount: r.project_amount,
    notes: r.notes,
    updatedAt: r.updated_at,
  };
}

export function projectInsertFromBody(body: {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  deadline: string | null;
  status: string;
  serviceType: string;
  businessLine?: string;
  clientType: string | null;
  paymentMethod: string | null;
  clientContact: string | null;
  notes: string | null;
  source_lead_id?: string | null;
}) {
  return {
    id: body.id,
    name: body.name,
    total_amount: body.totalAmount,
    paid_amount: body.paidAmount,
    deadline: body.deadline,
    status: body.status,
    service_type: body.serviceType,
    business_line: body.businessLine === "impulse" || body.businessLine === "qmagic" ? body.businessLine : "agency",
    client_type: body.clientType,
    payment_method: body.paymentMethod,
    client_contact: body.clientContact,
    notes: body.notes,
    source_lead_id: body.source_lead_id ?? null,
  };
}
