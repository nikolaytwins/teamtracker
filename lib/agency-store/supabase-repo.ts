import { calculateNextContactDateForLead, isProfiRuLeadSource } from "@/lib/agency-leads-logic";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import {
  computeOutreachByMonthWithWeeks,
  computeOutreachStats,
  computeOutreachStatsByMonth,
  type OutreachPlatform,
} from "@/lib/outreach";
import type { AgencyRepo, CreateProjectBody, UpdateProjectBody } from "./repo-interface";
import {
  mapDetailRow,
  mapExpenseRow,
  mapGeneralExpenseRow,
  mapLeadRow,
  mapOutreachRow,
  mapProjectRow,
  projectInsertFromBody,
} from "./map-pg";

function visitAggregatesFromRows(rows: Array<{ visited_at: string }>) {
  const total = rows.length;
  const byMonth: Record<string, number> = {};
  for (const r of rows) {
    const d = new Date(r.visited_at);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[ym] = (byMonth[ym] ?? 0) + 1;
  }
  return { total, byMonth };
}

export class SupabaseAgencyRepo implements AgencyRepo {
  private sb = createSupabaseServiceClient();

  async listProjectsWithTotalExpenses(): Promise<Record<string, unknown>[]> {
    const { data: projects, error: e1 } = await this.sb
      .from("agency_project")
      .select("*")
      .order("created_at", { ascending: false });
    if (e1) throw e1;
    const { data: expenses, error: e2 } = await this.sb.from("agency_expense").select("project_id, amount");
    if (e2) throw e2;
    const sum = new Map<string, number>();
    for (const x of expenses ?? []) {
      const pid = x.project_id as string;
      sum.set(pid, (sum.get(pid) ?? 0) + (Number(x.amount) || 0));
    }
    return (projects ?? []).map((p) => ({
      ...mapProjectRow(p as Record<string, unknown>),
      totalExpenses: sum.get(p.id as string) ?? 0,
    }));
  }

  async createProject(body: CreateProjectBody): Promise<{
    id: string;
    name: string;
    deadline: string | null;
  }> {
    const id = `proj_${Date.now()}`;
    const row = projectInsertFromBody({
      id,
      name: body.name,
      totalAmount: body.totalAmount || 0,
      paidAmount: body.paidAmount || 0,
      deadline: (body.deadline as string) || null,
      status: body.status || "not_paid",
      serviceType: body.serviceType,
      clientType: body.clientType ?? null,
      paymentMethod: body.paymentMethod ?? null,
      clientContact: body.clientContact ?? null,
      notes: body.notes ?? null,
      source_lead_id: null,
    });
    const { error } = await this.sb.from("agency_project").insert(row);
    if (error) throw error;
    const full = await this.getProjectById(id);
    return {
      id,
      name: String(full?.name ?? body.name),
      deadline: (full?.deadline as string | null) ?? null,
    };
  }

  async getProjectById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.sb.from("agency_project").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapProjectRow(data as Record<string, unknown>);
  }

  async updateProjectById(id: string, body: UpdateProjectBody): Promise<Record<string, unknown> | null> {
    const { error } = await this.sb
      .from("agency_project")
      .update({
        name: body.name,
        total_amount: body.totalAmount,
        paid_amount: body.paidAmount,
        deadline: body.deadline as string | null,
        status: body.status,
        service_type: body.serviceType,
        client_type: body.clientType,
        payment_method: body.paymentMethod,
        client_contact: body.clientContact,
        notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    return this.getProjectById(id);
  }

  async deleteProjectById(id: string): Promise<void> {
    const { error } = await this.sb.from("agency_project").delete().eq("id", id);
    if (error) throw error;
  }

  async copyProjectToMonth(
    id: string,
    year: number,
    month: number
  ): Promise<{ id: string; name: string; deadline: string | null }> {
    const cur = await this.getProjectById(id);
    if (!cur) throw new Error("not_found");
    const newId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
    const ins = projectInsertFromBody({
      id: newId,
      name: String(cur.name),
      totalAmount: Number(cur.totalAmount) || 0,
      paidAmount: 0,
      deadline: (cur.deadline as string) || null,
      status: "not_paid",
      serviceType: String(cur.serviceType ?? "site"),
      clientType: (cur.clientType as string) || null,
      paymentMethod: (cur.paymentMethod as string) || null,
      clientContact: (cur.clientContact as string) || null,
      notes: (cur.notes as string) || null,
      source_lead_id: null,
    });
    (ins as Record<string, unknown>).created_at = newDate;
    (ins as Record<string, unknown>).updated_at = new Date().toISOString();
    const { error: e1 } = await this.sb.from("agency_project").insert(ins);
    if (e1) throw e1;
    const { data: exps, error: e2 } = await this.sb.from("agency_expense").select("*").eq("project_id", id);
    if (e2) throw e2;
    for (const e of exps ?? []) {
      const newExpId = `agexp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const { error: e3 } = await this.sb.from("agency_expense").insert({
        id: newExpId,
        project_id: newId,
        employee_name: e.employee_name,
        employee_role: e.employee_role,
        amount: e.amount,
        notes: e.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (e3) throw e3;
    }
    const p = await this.getProjectById(newId);
    return {
      id: newId,
      name: String(p?.name ?? ""),
      deadline: (p?.deadline as string | null) ?? null,
    };
  }

  async moveProjectToMonth(id: string, year: number, month: number): Promise<void> {
    const { data, error: e0 } = await this.sb.from("agency_project").select("id").eq("id", id).maybeSingle();
    if (e0) throw e0;
    if (!data) throw new Error("not_found");
    const newDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
    const { error } = await this.sb
      .from("agency_project")
      .update({ created_at: newDate, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async listProjectsForSync(): Promise<
    { id: string; name: string; deadline: string | null; createdAt?: string }[]
  > {
    const { data, error } = await this.sb
      .from("agency_project")
      .select("id, name, deadline, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      deadline: (r.deadline as string) ?? null,
      createdAt: r.created_at as string,
    }));
  }

  async agencyLeadsTableExists(): Promise<boolean> {
    const { error } = await this.sb.from("agency_leads").select("id").limit(1);
    return !error;
  }

  async listLeadsOrdered(opts?: { includeArchived?: boolean }): Promise<Record<string, unknown>[]> {
    let q = this.sb.from("agency_leads").select("*");
    if (!opts?.includeArchived) {
      q = q.or("archived.is.null,archived.eq.false");
    }
    const { data, error } = await q;
    if (error) throw error;
    const order: Record<string, number> = {
      new: 1,
      contact_established: 2,
      commercial_proposal: 3,
      thinking: 4,
      paid: 5,
      pause: 6,
      lost: 7,
    };
    const rows = (data ?? []).map((r) => mapLeadRow(r as Record<string, unknown>));
    rows.sort((a, b) => {
      const sa = order[String(a.status)] ?? 99;
      const sb = order[String(b.status)] ?? 99;
      if (sa !== sb) return sa - sb;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return rows;
  }

  async listProjectsWithSourceLead(): Promise<Array<{ id: string; name: string; source_lead_id: string }>> {
    const { data, error } = await this.sb
      .from("agency_project")
      .select("id, name, source_lead_id")
      .not("source_lead_id", "is", null);
    if (error) throw error;
    return (data ?? [])
      .filter((r) => String(r.source_lead_id ?? "").trim())
      .map((r) => ({
        id: r.id as string,
        name: r.name as string,
        source_lead_id: r.source_lead_id as string,
      }));
  }

  async createLeadFromPost(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const contact = String(body.contact ?? "");
    const source = String(body.source ?? "");
    const taskDescription = (body.taskDescription as string) || null;
    const status = (body.status as string) || "new";
    const recurring = Boolean(body.isRecurring);
    const autoDate = isProfiRuLeadSource(source) ? null : calculateNextContactDateForLead(status);
    const nextContactDate = autoDate ? autoDate.toISOString() : null;
    const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();
    const { error: e1 } = await this.sb.from("agency_leads").insert({
      id,
      contact,
      source,
      task_description: taskDescription,
      status,
      next_contact_date: nextContactDate,
      manual_date_set: false,
      is_recurring: recurring,
      archived: false,
      created_at: now,
      updated_at: now,
    });
    if (e1) throw e1;
    const hid = `history_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const { error: e2 } = await this.sb.from("lead_history").insert({
      id: hid,
      lead_id: id,
      event_type: "created",
      new_status: status,
      new_source: source,
      created_at: now,
    });
    if (e2) throw e2;
    const { data, error: e3 } = await this.sb.from("agency_leads").select("*").eq("id", id).single();
    if (e3) throw e3;
    return mapLeadRow(data as Record<string, unknown>);
  }

  async getLeadById(id: string): Promise<Record<string, unknown> | undefined> {
    const { data, error } = await this.sb.from("agency_leads").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return mapLeadRow(data as Record<string, unknown>);
  }

  async findProjectBySourceLeadId(leadId: string): Promise<{ id: string; name: string } | undefined> {
    const { data, error } = await this.sb
      .from("agency_project")
      .select("id, name")
      .eq("source_lead_id", leadId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return { id: data.id as string, name: data.name as string };
  }

  async updateLeadPut(id: string, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const contact = body.contact as string | undefined;
    const source = body.source as string | undefined;
    const taskDescription = body.taskDescription;
    const status = body.status as string | undefined;
    const nextContactDate = body.nextContactDate;
    const isRecurring = body.isRecurring;
    const archivedBody = body.archived;

    const currentLead = await this.getLeadById(id);
    if (!currentLead) return undefined;

    let finalNext = currentLead.nextContactDate;
    let finalManual = Number(currentLead.manualDateSet) ? true : false;

    if (nextContactDate !== undefined) {
      finalNext = nextContactDate || null;
      finalManual = true;
    } else if (status && status !== currentLead.status) {
      if (!Number(currentLead.manualDateSet)) {
        const autoDate = calculateNextContactDateForLead(status);
        finalNext = autoDate ? autoDate.toISOString() : null;
        finalManual = false;
      }
    }

    const recurringVal =
      isRecurring !== undefined ? Boolean(isRecurring) : Boolean(Number(currentLead.isRecurring));

    const archivedVal =
      archivedBody !== undefined ? Boolean(archivedBody) : Boolean(Number(currentLead.archived));

    const { error: e1 } = await this.sb
      .from("agency_leads")
      .update({
        ...(contact != null ? { contact } : {}),
        ...(source != null ? { source } : {}),
        ...(taskDescription !== undefined ? { task_description: taskDescription || null } : {}),
        ...(status != null ? { status } : {}),
        next_contact_date: finalNext,
        manual_date_set: finalManual,
        is_recurring: recurringVal,
        archived: archivedVal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (e1) throw e1;

    const now = new Date().toISOString();
    if (status && status !== currentLead.status) {
      await this.sb.from("lead_history").insert({
        id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        lead_id: id,
        event_type: "status_changed",
        old_status: currentLead.status,
        new_status: status,
        created_at: now,
      });
    }
    if (source && source !== currentLead.source) {
      await this.sb.from("lead_history").insert({
        id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        lead_id: id,
        event_type: "source_changed",
        old_source: currentLead.source,
        new_source: source,
        created_at: now,
      });
    }
    if (nextContactDate !== undefined && nextContactDate !== currentLead.nextContactDate) {
      await this.sb.from("lead_history").insert({
        id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        lead_id: id,
        event_type: "date_changed",
        old_date: currentLead.nextContactDate != null ? String(currentLead.nextContactDate) : null,
        new_date: nextContactDate != null ? String(nextContactDate) : null,
        created_at: now,
      });
    }

    return this.getLeadById(id);
  }

  async deleteLeadById(id: string): Promise<number> {
    const { data, error } = await this.sb.from("agency_leads").delete().eq("id", id).select("id");
    if (error) throw error;
    return (data ?? []).length;
  }

  async getLeadForConvert(
    leadId: string
  ): Promise<{ id: string; contact: string; taskDescription: string | null; status: string } | undefined> {
    const row = await this.getLeadById(leadId);
    if (!row) return undefined;
    return {
      id: String(row.id),
      contact: String(row.contact),
      taskDescription: (row.taskDescription as string) ?? null,
      status: String(row.status),
    };
  }

  async findProjectRowBySourceLead(
    leadId: string
  ): Promise<{ id: string; name: string; deadline: string | null } | undefined> {
    const { data, error } = await this.sb
      .from("agency_project")
      .select("id, name, deadline")
      .eq("source_lead_id", leadId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return {
      id: data.id as string,
      name: data.name as string,
      deadline: (data.deadline as string) ?? null,
    };
  }

  async insertProjectFromLead(input: {
    id: string;
    name: string;
    clientContact: string | null;
    leadId: string;
  }): Promise<{ id: string; name: string; deadline: string | null }> {
    const now = new Date().toISOString();
    const { error } = await this.sb.from("agency_project").insert({
      id: input.id,
      name: input.name,
      total_amount: 0,
      paid_amount: 0,
      deadline: null,
      status: "not_paid",
      service_type: "site",
      client_type: null,
      payment_method: null,
      client_contact: input.clientContact,
      notes: null,
      source_lead_id: input.leadId,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    return { id: input.id, name: input.name, deadline: null };
  }

  async listExpenses(projectId?: string | null): Promise<Record<string, unknown>[]> {
    let q = this.sb.from("agency_expense").select("*").order("created_at", { ascending: false });
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => mapExpenseRow(r as Record<string, unknown>));
  }

  async createExpense(input: {
    id: string;
    projectId: string;
    employeeName: string;
    employeeRole: string;
    amount: number;
    notes: string | null;
  }): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const { error } = await this.sb.from("agency_expense").insert({
      id: input.id,
      project_id: input.projectId,
      employee_name: input.employeeName,
      employee_role: input.employeeRole,
      amount: input.amount,
      notes: input.notes,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    const { data, error: e2 } = await this.sb.from("agency_expense").select("*").eq("id", input.id).single();
    if (e2) throw e2;
    return mapExpenseRow(data as Record<string, unknown>);
  }

  async updateExpenseById(
    id: string,
    employeeName: string,
    employeeRole: string,
    amount: number,
    notes: string | null
  ): Promise<Record<string, unknown> | undefined> {
    const { error } = await this.sb
      .from("agency_expense")
      .update({
        employee_name: employeeName,
        employee_role: employeeRole,
        amount,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    const { data, error: e2 } = await this.sb.from("agency_expense").select("*").eq("id", id).maybeSingle();
    if (e2) throw e2;
    return data ? mapExpenseRow(data as Record<string, unknown>) : undefined;
  }

  async deleteExpenseById(id: string): Promise<void> {
    const { error } = await this.sb.from("agency_expense").delete().eq("id", id);
    if (error) throw error;
  }

  async listGeneralExpenses(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.sb
      .from("agency_general_expense")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((r) => mapGeneralExpenseRow(r as Record<string, unknown>));
  }

  async createGeneralExpense(input: {
    id: string;
    employeeName: string | null;
    employeeRole: string | null;
    amount: number;
    notes: string | null;
  }): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const { error } = await this.sb.from("agency_general_expense").insert({
      id: input.id,
      employee_name: input.employeeName,
      employee_role: input.employeeRole,
      amount: input.amount,
      notes: input.notes,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    const { data, error: e2 } = await this.sb
      .from("agency_general_expense")
      .select("*")
      .eq("id", input.id)
      .single();
    if (e2) throw e2;
    return mapGeneralExpenseRow(data as Record<string, unknown>);
  }

  async getGeneralExpenseById(id: string): Promise<Record<string, unknown> | undefined> {
    const { data, error } = await this.sb.from("agency_general_expense").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapGeneralExpenseRow(data as Record<string, unknown>) : undefined;
  }

  async updateGeneralExpenseById(
    id: string,
    employeeName: string | null,
    employeeRole: string | null,
    amount: number,
    notes: string | null
  ): Promise<Record<string, unknown> | undefined> {
    const { error } = await this.sb
      .from("agency_general_expense")
      .update({
        employee_name: employeeName,
        employee_role: employeeRole,
        amount,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    return this.getGeneralExpenseById(id);
  }

  async deleteGeneralExpenseById(id: string): Promise<void> {
    const { error } = await this.sb.from("agency_general_expense").delete().eq("id", id);
    if (error) throw error;
  }

  async copyGeneralExpensesBetweenMonths(input: {
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
  }): Promise<number> {
    const { fromYear, fromMonth, toYear, toMonth } = input;
    const fromStart = new Date(fromYear, fromMonth - 1, 1);
    const fromEnd = new Date(fromYear, fromMonth, 0, 23, 59, 59);
    const toDate = `${toYear}-${String(toMonth).padStart(2, "0")}-01T00:00:00.000Z`;
    const { data, error } = await this.sb.from("agency_general_expense").select("*");
    if (error) throw error;
    let copied = 0;
    for (const exp of data ?? []) {
      const ca = new Date(exp.created_at as string);
      if (ca < fromStart || ca > fromEnd) continue;
      const newId = `agexp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const { error: e2 } = await this.sb.from("agency_general_expense").insert({
        id: newId,
        employee_name: exp.employee_name,
        employee_role: exp.employee_role,
        amount: exp.amount,
        notes: exp.notes,
        created_at: toDate,
        updated_at: new Date().toISOString(),
      });
      if (e2) throw e2;
      copied++;
    }
    return copied;
  }

  async getAgencyProfitForMonth(year: number, month: number): Promise<{
    expectedRevenue: number;
    actualRevenue: number;
    totalExpenses: number;
    expectedProfit: number;
    actualProfit: number;
  }> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const { data: projects, error: e1 } = await this.sb.from("agency_project").select("*");
    if (e1) throw e1;
    const { data: allExp, error: e2 } = await this.sb.from("agency_expense").select("project_id, amount");
    if (e2) throw e2;
    const expByProj = new Map<string, number>();
    for (const e of allExp ?? []) {
      const pid = e.project_id as string;
      expByProj.set(pid, (expByProj.get(pid) ?? 0) + (Number(e.amount) || 0));
    }
    const agencyProjects = (projects ?? []).filter((p) => {
      const c = new Date(p.created_at as string);
      return c >= monthStart && c <= monthEnd;
    });
    let agencyGeneralExpenses: Record<string, unknown>[] = [];
    const { data: gen, error: e3 } = await this.sb.from("agency_general_expense").select("*");
    if (!e3 && gen) {
      agencyGeneralExpenses = gen.filter((e) => {
        const c = new Date(e.created_at as string);
        return c >= monthStart && c <= monthEnd;
      });
    }
    const withExp = agencyProjects.map((p) => ({
      ...p,
      totalExpenses: expByProj.get(p.id as string) ?? 0,
    }));
    const expectedRevenue = withExp.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const actualRevenue = withExp.reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0);
    const projectExpenses = withExp.reduce((sum, p) => sum + (Number((p as { totalExpenses: number }).totalExpenses) || 0), 0);
    const generalExpensesTotal = agencyGeneralExpenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );
    const accountRevenue = withExp
      .filter((p) => p.payment_method === "account" && p.status === "paid")
      .reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0);
    const taxAmount = 6916 + accountRevenue * 0.01;
    const totalExpenses = projectExpenses + generalExpensesTotal + taxAmount;
    return {
      expectedRevenue,
      actualRevenue,
      totalExpenses,
      expectedProfit: expectedRevenue - totalExpenses,
      actualProfit: actualRevenue - totalExpenses,
    };
  }

  async ensureProjectDetailTable(): Promise<void> {
    /* таблица создаётся миграцией Supabase */
  }

  async listProjectDetails(projectId?: string | null): Promise<Record<string, unknown>[]> {
    let q = this.sb.from("agency_project_detail").select("*");
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []).map((r) => mapDetailRow(r as Record<string, unknown>));
    rows.sort((a, b) => {
      const o = (Number(a.order) || 0) - (Number(b.order) || 0);
      if (o !== 0) return o;
      return String(a.createdAt).localeCompare(String(b.createdAt));
    });
    return rows;
  }

  async createProjectDetail(input: {
    id: string;
    projectId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    order: number | null;
  }): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const { error } = await this.sb.from("agency_project_detail").insert({
      id: input.id,
      project_id: input.projectId,
      title: input.title,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      sort_order: typeof input.order === "number" ? input.order : 0,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    const { data, error: e2 } = await this.sb.from("agency_project_detail").select("*").eq("id", input.id).single();
    if (e2) throw e2;
    return mapDetailRow(data as Record<string, unknown>);
  }

  async getProjectDetailById(
    id: string
  ): Promise<{ title: string; quantity: number; unitPrice: number; order: number } | undefined> {
    const { data, error } = await this.sb.from("agency_project_detail").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const m = mapDetailRow(data as Record<string, unknown>);
    return {
      title: String(m.title),
      quantity: Number(m.quantity),
      unitPrice: Number(m.unitPrice),
      order: Number(m.order),
    };
  }

  async updateProjectDetailById(
    id: string,
    title: string,
    quantity: number,
    unitPrice: number,
    order: number
  ): Promise<Record<string, unknown> | undefined> {
    const { error } = await this.sb
      .from("agency_project_detail")
      .update({
        title,
        quantity,
        unit_price: unitPrice,
        sort_order: order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    const { data, error: e2 } = await this.sb.from("agency_project_detail").select("*").eq("id", id).maybeSingle();
    if (e2) throw e2;
    return data ? mapDetailRow(data as Record<string, unknown>) : undefined;
  }

  async deleteProjectDetailById(id: string): Promise<void> {
    const { error } = await this.sb.from("agency_project_detail").delete().eq("id", id);
    if (error) throw error;
  }

  async revenueByClient(): Promise<{ items: unknown[]; total: number }> {
    const { data, error } = await this.sb.from("agency_project").select("client_type, total_amount");
    if (error) throw error;
    const map = new Map<string, { totalAmount: number; count: number }>();
    for (const r of data ?? []) {
      const k = String(r.client_type ?? "");
      const cur = map.get(k) ?? { totalAmount: 0, count: 0 };
      cur.totalAmount += Number(r.total_amount) || 0;
      cur.count += 1;
      map.set(k, cur);
    }
    const rows = [...map.entries()].map(([clientType, v]) => ({
      clientType,
      totalAmount: v.totalAmount,
      count: v.count,
    }));
    rows.sort((a, b) => b.totalAmount - a.totalAmount);
    const total = rows.reduce((s, r) => s + r.totalAmount, 0);
    const items = rows.map((r) => ({
      ...r,
      percent: total > 0 ? Math.round((r.totalAmount / total) * 1000) / 10 : 0,
    }));
    return { items, total };
  }

  async revenueByService(): Promise<{ items: unknown[]; total: number }> {
    const { data, error } = await this.sb.from("agency_project").select("service_type, total_amount");
    if (error) throw error;
    const map = new Map<string, { totalAmount: number; count: number }>();
    for (const r of data ?? []) {
      const k = String(r.service_type ?? "");
      const cur = map.get(k) ?? { totalAmount: 0, count: 0 };
      cur.totalAmount += Number(r.total_amount) || 0;
      cur.count += 1;
      map.set(k, cur);
    }
    const rows = [...map.entries()].map(([serviceType, v]) => ({
      serviceType,
      totalAmount: v.totalAmount,
      count: v.count,
    }));
    rows.sort((a, b) => b.totalAmount - a.totalAmount);
    const total = rows.reduce((s, r) => s + r.totalAmount, 0);
    const items = rows.map((r) => ({
      ...r,
      percent: total > 0 ? Math.round((r.totalAmount / total) * 1000) / 10 : 0,
    }));
    return { items, total };
  }

  async getProjectsByIds(
    ids: string[]
  ): Promise<Array<{ id: string; name: string; totalAmount: number | null }>> {
    if (ids.length === 0) return [];
    const { data, error } = await this.sb.from("agency_project").select("id, name, total_amount").in("id", ids);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      totalAmount: r.total_amount as number | null,
    }));
  }

  async sumDesignerExpensesByProjects(
    projectIds: string[]
  ): Promise<Array<{ projectId: string; employeeName: string | null; employeeRole: string | null; s: number }>> {
    if (projectIds.length === 0) return [];
    const { data, error } = await this.sb
      .from("agency_expense")
      .select("project_id, employee_name, employee_role, amount")
      .in("project_id", projectIds);
    if (error) throw error;
    const map = new Map<string, number>();
    const key = (pid: string, name: string, role: string) => `${pid}\t${name}\t${role}`;
    for (const r of data ?? []) {
      const k = key(r.project_id as string, String(r.employee_name), String(r.employee_role));
      map.set(k, (map.get(k) ?? 0) + (Number(r.amount) || 0));
    }
    return [...map.entries()].map(([k, s]) => {
      const [projectId, employeeName, employeeRole] = k.split("\t");
      return { projectId, employeeName, employeeRole, s };
    });
  }

  async getSalesDashboard(
    startDate: string | null,
    endDate: string | null
  ): Promise<Record<string, unknown>> {
    const { data: allOutreach, error: e1 } = await this.sb
      .from("outreach_responses")
      .select("*")
      .order("created_at", { ascending: false });
    if (e1) throw e1;
    const mapped = (allOutreach ?? []).map((r) => mapOutreachRow(r as Record<string, unknown>)) as Array<{
      platform: string;
      createdAt: string;
      [k: string]: unknown;
    }>;
    const filterByCreatedRange = (
      rows: typeof mapped,
      startIso: string | null,
      endIso: string | null
    ) => {
      if (!startIso && !endIso) return rows;
      return rows.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        if (startIso && t < new Date(startIso + "T00:00:00").getTime()) return false;
        if (endIso && t > new Date(endIso + "T23:59:59").getTime()) return false;
        return true;
      });
    };
    const inRange = filterByCreatedRange(mapped, startDate, endDate);
    const profiRows = inRange.filter((r) => r.platform === "profi");
    const threadsRows = inRange.filter((r) => r.platform === "threads");
    const statsProfi = profiRows.length ? computeOutreachStats(profiRows as unknown as Record<string, unknown>[]) : null;
    const statsThreads = threadsRows.length
      ? computeOutreachStats(threadsRows as unknown as Record<string, unknown>[])
      : null;
    const statsCombined = inRange.length
      ? computeOutreachStats(inRange as unknown as Record<string, unknown>[])
      : null;
    const byMonthProfi =
      profiRows.length > 0 ? computeOutreachStatsByMonth(profiRows as unknown as Record<string, unknown>[]) : {};
    const byMonthThreads =
      threadsRows.length > 0 ? computeOutreachStatsByMonth(threadsRows as unknown as Record<string, unknown>[]) : {};

    const { data: visitsProfiRows } = await this.sb.from("platform_visits").select("visited_at").eq("platform", "profi");
    const { data: visitsThreadsRows } = await this.sb
      .from("platform_visits")
      .select("visited_at")
      .eq("platform", "threads");
    const visitsProfi = visitAggregatesFromRows((visitsProfiRows ?? []) as Array<{ visited_at: string }>);
    const visitsThreads = visitAggregatesFromRows((visitsThreadsRows ?? []) as Array<{ visited_at: string }>);

    const { data: allLeads } = await this.sb.from("agency_leads").select("id, status, is_recurring, created_at");
    const leadInRange = (createdAt: string) => {
      const t = new Date(createdAt).getTime();
      if (startDate && t < new Date(startDate + "T00:00:00").getTime()) return false;
      if (endDate && t > new Date(endDate + "T23:59:59").getTime()) return false;
      return true;
    };
    let recurringContacted = 0;
    let recurringPaid = 0;
    let leadsTotal = 0;
    let leadsPaid = 0;
    for (const L of allLeads ?? []) {
      if (!leadInRange(L.created_at as string)) continue;
      leadsTotal++;
      if (L.status === "paid") leadsPaid++;
      if (L.is_recurring) {
        recurringContacted++;
        if (L.status === "paid") recurringPaid++;
      }
    }

    const { data: allProjects } = await this.sb.from("agency_project").select("paid_amount, created_at");
    let agencyPaidSum = 0;
    for (const p of allProjects ?? []) {
      if (!leadInRange(p.created_at as string)) continue;
      agencyPaidSum += Number(p.paid_amount) || 0;
    }

    return {
      period: { startDate, endDate },
      outreach: {
        profi: { stats: statsProfi, count: profiRows.length, byMonth: byMonthProfi },
        threads: { stats: statsThreads, count: threadsRows.length, byMonth: byMonthThreads },
        combined: { stats: statsCombined, count: inRange.length },
      },
      visits: { profi: visitsProfi, threads: visitsThreads },
      leads: { newInPeriod: leadsTotal, paidInPeriod: leadsPaid },
      recurring: { contactedInPeriod: recurringContacted, paidInPeriod: recurringPaid },
      agency: { paidAmountSumInPeriod: agencyPaidSum },
    };
  }

  async getLeadsAnalytics(
    startDate: string | null,
    endDate: string | null
  ): Promise<{
    conversions: Array<{ label: string; count: number; percentage: number }>;
    sources: Array<{ source: string; count: number }>;
  }> {
    let q = this.sb.from("lead_history").select("lead_id, old_status, new_status, new_source, created_at, event_type");
    if (startDate && endDate) {
      q = q
        .gte("created_at", new Date(startDate + "T00:00:00").toISOString())
        .lte("created_at", new Date(endDate + "T23:59:59").toISOString());
    } else if (startDate) {
      q = q.gte("created_at", new Date(startDate + "T00:00:00").toISOString());
    } else if (endDate) {
      q = q.lte("created_at", new Date(endDate + "T23:59:59").toISOString());
    }
    const { data: hist, error } = await q;
    if (error) throw error;
    const rows = hist ?? [];
    const statusChanges = rows
      .filter((r) => r.event_type === "status_changed")
      .map((r) => ({
        leadId: r.lead_id,
        oldStatus: r.old_status,
        newStatus: r.new_status,
        createdAt: r.created_at,
      }));
    const conversions: Record<string, { count: number; percentage: number }> = {};
    const trackedTransitions = [
      { from: "new", to: "contact_established", label: "Новые → Контакт установлен" },
      {
        from: "contact_established",
        to: "commercial_proposal",
        label: "Контакт установлен → Коммерческое предложение",
      },
      { from: "commercial_proposal", to: "paid", label: "Коммерческое предложение → Оплачен" },
      {
        from: "commercial_proposal",
        to: "thinking",
        label: "Коммерческое предложение → Думает / изучает",
      },
      { from: "thinking", to: "paid", label: "Думает / изучает → Оплачен" },
    ];
    for (const transition of trackedTransitions) {
      const uniqueLeads = new Set<string>();
      for (const change of statusChanges) {
        if (change.oldStatus === transition.from && change.newStatus === transition.to) {
          uniqueLeads.add(change.leadId as string);
        }
      }
      conversions[transition.label] = { count: uniqueLeads.size, percentage: 0 };
    }
    const pauseTransitions = statusChanges.filter((c) => c.newStatus === "pause");
    const uniquePauseLeads = new Set(pauseTransitions.map((c) => c.leadId as string));
    conversions["Любой → Пауза"] = { count: uniquePauseLeads.size, percentage: 0 };

    const newLeads = new Set(
      statusChanges.filter((c) => c.oldStatus === "new" || c.newStatus === "new").map((c) => c.leadId as string)
    );
    const createdInPeriod = rows.filter((r) => r.event_type === "created");
    createdInPeriod.forEach((c) => newLeads.add(c.lead_id as string));

    if (newLeads.size > 0 && conversions["Новые → Контакт установлен"]) {
      conversions["Новые → Контакт установлен"].percentage =
        (conversions["Новые → Контакт установлен"].count / newLeads.size) * 100;
    }
    const contactEstablishedLeads = new Set(
      statusChanges
        .filter((c) => c.oldStatus === "contact_established" || c.newStatus === "contact_established")
        .map((c) => c.leadId as string)
    );
    if (contactEstablishedLeads.size > 0 && conversions["Контакт установлен → Коммерческое предложение"]) {
      conversions["Контакт установлен → Коммерческое предложение"].percentage =
        (conversions["Контакт установлен → Коммерческое предложение"].count / contactEstablishedLeads.size) * 100;
    }
    const commercialProposalLeads = new Set(
      statusChanges
        .filter((c) => c.oldStatus === "commercial_proposal" || c.newStatus === "commercial_proposal")
        .map((c) => c.leadId as string)
    );
    if (commercialProposalLeads.size > 0 && conversions["Коммерческое предложение → Оплачен"]) {
      conversions["Коммерческое предложение → Оплачен"].percentage =
        (conversions["Коммерческое предложение → Оплачен"].count / commercialProposalLeads.size) * 100;
    }
    if (commercialProposalLeads.size > 0 && conversions["Коммерческое предложение → Думает / изучает"]) {
      conversions["Коммерческое предложение → Думает / изучает"].percentage =
        (conversions["Коммерческое предложение → Думает / изучает"].count / commercialProposalLeads.size) * 100;
    }
    const thinkingLeads = new Set(
      statusChanges.filter((c) => c.oldStatus === "thinking" || c.newStatus === "thinking").map((c) => c.leadId as string)
    );
    if (thinkingLeads.size > 0 && conversions["Думает / изучает → Оплачен"]) {
      conversions["Думает / изучает → Оплачен"].percentage =
        (conversions["Думает / изучает → Оплачен"].count / thinkingLeads.size) * 100;
    }

    const createdEvents = rows.filter((r) => r.event_type === "created");
    const sourcesMap: Record<string, Set<string>> = {};
    for (const event of createdEvents) {
      const ns = event.new_source as string | null;
      if (ns) {
        if (!sourcesMap[ns]) sourcesMap[ns] = new Set();
        sourcesMap[ns].add(event.lead_id as string);
      }
    }
    const sourcesResult = Object.entries(sourcesMap).map(([source, leadSet]) => ({
      source,
      count: leadSet.size,
    }));

    return {
      conversions: Object.entries(conversions).map(([label, data]) => ({
        label,
        count: data.count,
        percentage: Math.round(data.percentage * 10) / 10,
      })),
      sources: sourcesResult,
    };
  }

  private async profiReminderMap(): Promise<Map<string, { date: string; leadId: string }>> {
    const { data } = await this.sb
      .from("agency_leads")
      .select("id, contact, next_contact_date")
      .eq("source", "Profi.ru")
      .not("next_contact_date", "is", null);
    const m = new Map<string, { date: string; leadId: string }>();
    for (const row of data ?? []) {
      m.set(row.contact as string, {
        date: row.next_contact_date as string,
        leadId: row.id as string,
      });
    }
    return m;
  }

  private formatProfiDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }

  async outreachListJson(
    platform: OutreachPlatform,
    withStats: boolean,
    opts?: { omitItems?: boolean }
  ): Promise<unknown> {
    await this.sb.from("outreach_responses").update({ status: "paid" }).eq("status", "project").eq("platform", platform);

    const { data: itemsRaw, error } = await this.sb
      .from("outreach_responses")
      .select("*")
      .eq("platform", platform)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const items = (itemsRaw ?? []).map((r) => mapOutreachRow(r as Record<string, unknown>)) as Array<{
      id: string;
      createdAt: string;
      [k: string]: unknown;
    }>;

    let contactToLead = new Map<string, { date: string; leadId: string }>();
    if (platform === "profi") {
      try {
        contactToLead = await this.profiReminderMap();
      } catch {
        /* */
      }
    }
    const getReminder = (oid: string, createdAt: string) => {
      void oid;
      if (platform !== "profi") return null;
      const contact = `Profi отклик (${this.formatProfiDate(createdAt)})`;
      return contactToLead.get(contact) ?? null;
    };
    const itemsWithReminder = items.map((item) => ({
      ...item,
      reminder: getReminder(item.id, item.createdAt),
    }));

    if (withStats) {
      const stats =
        itemsWithReminder.length > 0 ? computeOutreachStats(itemsWithReminder as unknown as Record<string, unknown>[]) : null;
      const { byMonth, byMonthWeeks } =
        itemsWithReminder.length > 0
          ? computeOutreachByMonthWithWeeks(itemsWithReminder as unknown as Record<string, unknown>[])
          : { byMonth: {}, byMonthWeeks: {} };
      const { data: vrows } = await this.sb.from("platform_visits").select("visited_at").eq("platform", platform);
      const visits = visitAggregatesFromRows((vrows ?? []) as Array<{ visited_at: string }>);
      const omitItems = Boolean(opts?.omitItems);
      return {
        ...(omitItems ? {} : { items: itemsWithReminder }),
        stats,
        byMonth,
        byMonthWeeks,
        visits,
      };
    }
    return itemsWithReminder;
  }

  async insertOutreachResponse(
    platform: OutreachPlatform,
    params: { cost: number; notes: string | null }
  ): Promise<Record<string, unknown> | undefined> {
    const prefix = platform === "threads" ? "thr" : "profi";
    const id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const { error } = await this.sb.from("outreach_responses").insert({
      id,
      platform,
      created_at: now,
      cost: params.cost,
      refund_amount: 0,
      status: "response",
      project_amount: null,
      notes: params.notes,
      updated_at: now,
    });
    if (error) throw error;

    if (platform === "profi") {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        const nextContactDateIso = tomorrow.toISOString();
        const created = new Date(now);
        const contact = `Profi отклик (${String(created.getDate()).padStart(2, "0")}.${String(created.getMonth() + 1).padStart(2, "0")}.${created.getFullYear()})`;
        const leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await this.sb.from("agency_leads").insert({
          id: leadId,
          contact,
          source: "Profi.ru",
          task_description: params.notes ? `Напомнить заказчику. ${params.notes}` : "Напомнить заказчику",
          status: "new",
          next_contact_date: nextContactDateIso,
          manual_date_set: true,
          is_recurring: false,
          archived: false,
          created_at: now,
          updated_at: now,
        });
      } catch {
        /* */
      }
    }

    const { data, error: e2 } = await this.sb.from("outreach_responses").select("*").eq("id", id).single();
    if (e2) throw e2;
    return mapOutreachRow(data as Record<string, unknown>);
  }

  async getOutreachById(
    id: string,
    platform: OutreachPlatform
  ): Promise<Record<string, unknown> | undefined> {
    const { data, error } = await this.sb
      .from("outreach_responses")
      .select("*")
      .eq("id", id)
      .eq("platform", platform)
      .maybeSingle();
    if (error) throw error;
    return data ? mapOutreachRow(data as Record<string, unknown>) : undefined;
  }

  async patchOutreachResponse(
    id: string,
    platform: OutreachPlatform,
    body: { status?: string; refundAmount?: number; projectAmount?: number; notes?: string | null }
  ): Promise<Record<string, unknown> | undefined> {
    const current = await this.getOutreachById(id, platform);
    if (!current) return undefined;
    const allowed = ["response", "viewed", "conversation", "proposal", "paid", "refunded", "drain"];
    const newStatus =
      body.status != null && allowed.includes(body.status) ? body.status : (current.status as string);
    const newRefund =
      body.refundAmount != null ? Number(body.refundAmount) : (Number(current.refundAmount) || 0);
    const newProjectAmount =
      newStatus === "paid" && body.projectAmount != null
        ? Number(body.projectAmount)
        : newStatus === "paid"
          ? (current.projectAmount as number | null)
          : null;
    const newNotes = body.notes !== undefined ? body.notes || null : (current.notes as string | null);
    const { error } = await this.sb
      .from("outreach_responses")
      .update({
        status: newStatus,
        refund_amount: newRefund,
        project_amount: newProjectAmount,
        notes: newNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("platform", platform);
    if (error) throw error;
    return this.getOutreachById(id, platform);
  }

  async deleteOutreachResponse(id: string, platform: OutreachPlatform): Promise<boolean> {
    const row = await this.getOutreachById(id, platform);
    if (!row) return false;
    const { error } = await this.sb.from("outreach_responses").delete().eq("id", id).eq("platform", platform);
    if (error) throw error;
    return true;
  }

  async insertPlatformVisit(platform: "profi" | "threads"): Promise<void> {
    const id = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const visitedAt = new Date().toISOString();
    const { error } = await this.sb.from("platform_visits").insert({
      id,
      platform,
      visited_at: visitedAt,
    });
    if (error) throw error;
  }

  async insertLeadFromProfiReminder(input: {
    leadId: string;
    contact: string;
    source: string;
    taskDescription: string;
    status: string;
    nextContactDateIso: string;
    manualDateSet: number;
  }): Promise<Record<string, unknown> | undefined> {
    const now = new Date().toISOString();
    const { error } = await this.sb.from("agency_leads").insert({
      id: input.leadId,
      contact: input.contact,
      source: input.source,
      task_description: input.taskDescription,
      status: input.status,
      next_contact_date: input.nextContactDateIso,
      manual_date_set: Boolean(input.manualDateSet),
      is_recurring: false,
      archived: false,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    return this.getLeadById(input.leadId);
  }
}
