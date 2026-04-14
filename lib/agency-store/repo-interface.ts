import type { OutreachPlatform } from "@/lib/outreach";

export type CreateProjectBody = {
  name: string;
  totalAmount?: number;
  paidAmount?: number;
  deadline?: string | null;
  status?: string;
  serviceType: string;
  clientType?: string | null;
  paymentMethod?: string | null;
  clientContact?: string | null;
  notes?: string | null;
};

export type UpdateProjectBody = {
  name: string;
  totalAmount: number;
  paidAmount: number;
  deadline: unknown;
  status: string;
  serviceType: string;
  clientType: string | null;
  paymentMethod: string | null;
  clientContact: string | null;
  notes: string | null;
};

/** Единый доступ к данным агентства (SQLite или Supabase). */
export interface AgencyRepo {
  listProjectsWithTotalExpenses(): Promise<Record<string, unknown>[]>;
  createProject(body: CreateProjectBody): Promise<{
    id: string;
    name: string;
    deadline: string | null;
  }>;
  getProjectById(id: string): Promise<Record<string, unknown> | null>;
  updateProjectById(id: string, body: UpdateProjectBody): Promise<Record<string, unknown> | null>;
  deleteProjectById(id: string): Promise<void>;
  copyProjectToMonth(
    id: string,
    year: number,
    month: number
  ): Promise<{ id: string; name: string; deadline: string | null }>;
  moveProjectToMonth(id: string, year: number, month: number): Promise<void>;
  listProjectsForSync(): Promise<
    { id: string; name: string; deadline: string | null; createdAt?: string }[]
  >;

  agencyLeadsTableExists(): Promise<boolean>;
  listLeadsOrdered(opts?: { includeArchived?: boolean }): Promise<Record<string, unknown>[]>;
  listProjectsWithSourceLead(): Promise<Array<{ id: string; name: string; source_lead_id: string }>>;
  /** POST /api/agency/leads — contact, source, taskDescription, status, isRecurring */
  createLeadFromPost(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  getLeadById(id: string): Promise<Record<string, unknown> | undefined>;
  findProjectBySourceLeadId(leadId: string): Promise<{ id: string; name: string } | undefined>;
  /** PUT /api/agency/leads/[id] */
  updateLeadPut(id: string, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined>;
  deleteLeadById(id: string): Promise<number>;
  getLeadForConvert(
    leadId: string
  ): Promise<{ id: string; contact: string; taskDescription: string | null; status: string } | undefined>;
  findProjectRowBySourceLead(
    leadId: string
  ): Promise<{ id: string; name: string; deadline: string | null } | undefined>;
  insertProjectFromLead(input: {
    id: string;
    name: string;
    clientContact: string | null;
    leadId: string;
  }): Promise<{ id: string; name: string; deadline: string | null }>;

  listExpenses(projectId?: string | null): Promise<Record<string, unknown>[]>;
  createExpense(input: {
    id: string;
    projectId: string;
    employeeName: string;
    employeeRole: string;
    amount: number;
    notes: string | null;
  }): Promise<Record<string, unknown>>;
  updateExpenseById(
    id: string,
    employeeName: string,
    employeeRole: string,
    amount: number,
    notes: string | null
  ): Promise<Record<string, unknown> | undefined>;
  deleteExpenseById(id: string): Promise<void>;

  listGeneralExpenses(): Promise<Record<string, unknown>[]>;
  createGeneralExpense(input: {
    id: string;
    employeeName: string | null;
    employeeRole: string | null;
    amount: number;
    notes: string | null;
  }): Promise<Record<string, unknown>>;
  getGeneralExpenseById(id: string): Promise<Record<string, unknown> | undefined>;
  updateGeneralExpenseById(
    id: string,
    employeeName: string | null,
    employeeRole: string | null,
    amount: number,
    notes: string | null
  ): Promise<Record<string, unknown> | undefined>;
  deleteGeneralExpenseById(id: string): Promise<void>;
  copyGeneralExpensesBetweenMonths(input: {
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
  }): Promise<number>;

  getAgencyProfitForMonth(year: number, month: number): Promise<{
    expectedRevenue: number;
    actualRevenue: number;
    totalExpenses: number;
    expectedProfit: number;
    actualProfit: number;
  }>;

  ensureProjectDetailTable(): Promise<void>;
  listProjectDetails(projectId?: string | null): Promise<Record<string, unknown>[]>;
  createProjectDetail(input: {
    id: string;
    projectId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    order: number | null;
  }): Promise<Record<string, unknown>>;
  getProjectDetailById(id: string): Promise<
    | { title: string; quantity: number; unitPrice: number; order: number }
    | undefined
  >;
  updateProjectDetailById(
    id: string,
    title: string,
    quantity: number,
    unitPrice: number,
    order: number
  ): Promise<Record<string, unknown> | undefined>;
  deleteProjectDetailById(id: string): Promise<void>;

  revenueByClient(): Promise<{ items: unknown[]; total: number }>;
  revenueByService(): Promise<{ items: unknown[]; total: number }>;

  getProjectsByIds(ids: string[]): Promise<Array<{ id: string; name: string; totalAmount: number | null }>>;
  sumDesignerExpensesByProjects(
    projectIds: string[]
  ): Promise<Array<{ projectId: string; employeeName: string | null; employeeRole: string | null; s: number }>>;

  getSalesDashboard(startDate: string | null, endDate: string | null): Promise<Record<string, unknown>>;

  getLeadsAnalytics(startDate: string | null, endDate: string | null): Promise<{
    conversions: Array<{ label: string; count: number; percentage: number }>;
    sources: Array<{ source: string; count: number }>;
  }>;

  outreachListJson(
    platform: OutreachPlatform,
    withStats: boolean,
    opts?: { omitItems?: boolean }
  ): Promise<unknown>;
  insertOutreachResponse(
    platform: OutreachPlatform,
    params: { cost: number; notes: string | null }
  ): Promise<Record<string, unknown> | undefined>;
  getOutreachById(id: string, platform: OutreachPlatform): Promise<Record<string, unknown> | undefined>;
  patchOutreachResponse(
    id: string,
    platform: OutreachPlatform,
    body: { status?: string; refundAmount?: number; projectAmount?: number; notes?: string | null }
  ): Promise<Record<string, unknown> | undefined>;
  deleteOutreachResponse(id: string, platform: OutreachPlatform): Promise<boolean>;

  insertPlatformVisit(platform: "profi" | "threads"): Promise<void>;

  insertLeadFromProfiReminder(input: {
    leadId: string;
    contact: string;
    source: string;
    taskDescription: string;
    status: string;
    nextContactDateIso: string;
    manualDateSet: number;
  }): Promise<Record<string, unknown> | undefined>;
}
