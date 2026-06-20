export type V2FinanceServiceType = "site" | "presentation" | "small_task" | "subscription";
export type V2FinancePaymentStatus = "not_paid" | "prepaid" | "paid";
export type V2FinancePaymentMethod = "card" | "account" | null;

export type V2FinanceProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  total_amount: number;
  paid_amount: number;
  deadline: string | null;
  status: V2FinancePaymentStatus;
  service_type: V2FinanceServiceType;
  client_type: string | null;
  payment_method: V2FinancePaymentMethod;
  client_contact: string | null;
  notes: string | null;
  source_lead_id: string | null;
  created_at: string;
  updated_at: string;
};

export type V2FinanceProjectView = V2FinanceProjectRow & {
  total_expenses: number;
  total_details_amount: number;
  effective_total_amount: number;
};

export type V2FinanceGeneralExpenseRow = {
  id: string;
  workspace_id: string;
  employee_name: string;
  employee_role: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type V2FinanceMonthSummary = {
  year: number;
  month: number;
  expectedRevenue: number;
  actualRevenue: number;
  projectExpenses: number;
  manualGeneralExpenses: number;
  taxAmount: number;
  totalExpenses: number;
  profit: number;
  margin: number;
  projectCount: number;
};

export type V2FinanceServiceStat = {
  serviceType: V2FinanceServiceType;
  label: string;
  total: number;
  count: number;
  tint: string;
};
