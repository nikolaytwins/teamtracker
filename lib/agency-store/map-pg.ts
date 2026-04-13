/** Приводим строки из Supabase (snake_case) к форме, ожидаемой текущим UI/API (camelCase). */

export function mapProjectRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    totalAmount: r.total_amount,
    paidAmount: r.paid_amount,
    deadline: r.deadline,
    status: r.status,
    serviceType: r.service_type,
    clientType: r.client_type,
    paymentMethod: r.payment_method,
    clientContact: r.client_contact,
    notes: r.notes,
    source_lead_id: r.source_lead_id,
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
    createdAt: r.created_at,
    updatedAt: r.updated_at,
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
    client_type: body.clientType,
    payment_method: body.paymentMethod,
    client_contact: body.clientContact,
    notes: body.notes,
    source_lead_id: body.source_lead_id ?? null,
  };
}
