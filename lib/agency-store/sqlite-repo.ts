import Database from "better-sqlite3";
import {
  ensureAgencyLeadsReady,
  ensureAgencyProjectsColumns,
  ensureLeadHistoryTable,
} from "@/lib/agency-leads-schema";
import { calculateNextContactDateForLead, isProfiRuLeadSource } from "@/lib/agency-leads-logic";
import { getAgencySqlitePath } from "@/lib/agency-sqlite";
import {
  computeOutreachStats,
  computeOutreachStatsByMonth,
  ensureOutreachTable,
  type OutreachPlatform,
} from "@/lib/outreach";
import {
  deleteOutreachResponse,
  getOutreachListJson,
  getOutreachById as getOutreachRowById,
  insertOutreachResponse,
  patchOutreachResponse,
} from "@/lib/outreach-api";
import { getVisitAggregates, insertPlatformVisit, type VisitPlatform } from "@/lib/platform-visits";
import type {
  AgencyRepo,
  CreateProjectBody,
  UpdateProjectBody,
} from "./repo-interface";

function openSqlite(): Database.Database {
  const db = new Database(getAgencySqlitePath());
  // dev.db иногда шарится с другими процессами — без таймаута INSERT падает с SQLITE_BUSY.
  db.pragma("busy_timeout = 8000");
  return db;
}

function ensureDetailTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "AgencyProjectDetail" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "quantity" REAL NOT NULL DEFAULT 1,
      "unitPrice" REAL NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "AgencyProjectDetail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AgencyProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
}

export class SqliteAgencyRepo implements AgencyRepo {
  async listProjectsWithTotalExpenses(): Promise<Record<string, unknown>[]> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      return db
        .prepare(
          `
      SELECT p.*,
        COALESCE(SUM(e.amount), 0) as totalExpenses
      FROM AgencyProject p
      LEFT JOIN AgencyExpense e ON p.id = e.projectId
      GROUP BY p.id
      ORDER BY p.createdAt DESC
    `
        )
        .all() as Record<string, unknown>[];
    } finally {
      db.close();
    }
  }

  async createProject(body: CreateProjectBody): Promise<{
    id: string;
    name: string;
    deadline: string | null;
  }> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      const id = `proj_${Date.now()}`;
      db.prepare(
        `
      INSERT INTO AgencyProject (id, name, totalAmount, paidAmount, deadline, status, serviceType, clientType, paymentMethod, clientContact, notes, source_lead_id, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))
    `
      ).run(
        id,
        body.name,
        body.totalAmount || 0,
        body.paidAmount || 0,
        body.deadline || null,
        body.status || "not_paid",
        body.serviceType,
        body.clientType || null,
        body.paymentMethod || null,
        body.clientContact || null,
        body.notes || null
      );
      const project = db.prepare("SELECT * FROM AgencyProject WHERE id = ?").get(id) as {
        id: string;
        name: string;
        deadline: string | null;
      };
      return project;
    } finally {
      db.close();
    }
  }

  async getProjectById(id: string): Promise<Record<string, unknown> | null> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      const row = db.prepare("SELECT * FROM AgencyProject WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
      return row ?? null;
    } finally {
      db.close();
    }
  }

  async updateProjectById(
    id: string,
    body: UpdateProjectBody
  ): Promise<Record<string, unknown> | null> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      db.prepare(
        `
      UPDATE AgencyProject
      SET name = ?, totalAmount = ?, paidAmount = ?, deadline = ?, status = ?, serviceType = ?, clientType = ?, paymentMethod = ?, clientContact = ?, notes = ?, updatedAt = datetime('now')
      WHERE id = ?
    `
      ).run(
        body.name,
        body.totalAmount,
        body.paidAmount,
        body.deadline,
        body.status,
        body.serviceType,
        body.clientType,
        body.paymentMethod,
        body.clientContact,
        body.notes,
        id
      );
      const project = db.prepare("SELECT * FROM AgencyProject WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
      return project ?? null;
    } finally {
      db.close();
    }
  }

  async deleteProjectById(id: string): Promise<void> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      db.prepare("DELETE FROM AgencyProject WHERE id = ?").run(id);
    } finally {
      db.close();
    }
  }

  async copyProjectToMonth(
    id: string,
    year: number,
    month: number
  ): Promise<{ id: string; name: string; deadline: string | null }> {
    const db = openSqlite();
    try {
      const project = db.prepare("SELECT * FROM AgencyProject WHERE id = ?").get(id) as any;
      if (!project) throw new Error("not_found");
      const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newDate = `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;
      db.prepare(
        `
      INSERT INTO AgencyProject (id, name, totalAmount, paidAmount, deadline, status, serviceType, clientType, paymentMethod, clientContact, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `
      ).run(
        newProjectId,
        project.name,
        project.totalAmount,
        0,
        project.deadline,
        "not_paid",
        project.serviceType,
        project.clientType,
        project.paymentMethod,
        project.clientContact,
        project.notes,
        newDate
      );
      const expenses = db.prepare("SELECT * FROM AgencyExpense WHERE projectId = ?").all(id) as any[];
      for (const exp of expenses) {
        const newExpId = `agexp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        db.prepare(
          `
        INSERT INTO AgencyExpense (id, projectId, employeeName, employeeRole, amount, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
        ).run(newExpId, newProjectId, exp.employeeName, exp.employeeRole, exp.amount, exp.notes);
      }
      return db.prepare("SELECT * FROM AgencyProject WHERE id = ?").get(newProjectId) as {
        id: string;
        name: string;
        deadline: string | null;
      };
    } finally {
      db.close();
    }
  }

  async moveProjectToMonth(id: string, year: number, month: number): Promise<void> {
    const db = openSqlite();
    try {
      const project = db.prepare("SELECT id FROM AgencyProject WHERE id = ?").get(id);
      if (!project) throw new Error("not_found");
      const newDate = `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;
      db.prepare(`UPDATE AgencyProject SET createdAt = ?, updatedAt = datetime('now') WHERE id = ?`).run(
        newDate,
        id
      );
    } finally {
      db.close();
    }
  }

  async listProjectsForSync(): Promise<
    { id: string; name: string; deadline: string | null; createdAt?: string }[]
  > {
    const db = openSqlite();
    try {
      return db
        .prepare(`SELECT id, name, deadline, createdAt FROM AgencyProject ORDER BY createdAt DESC`)
        .all() as { id: string; name: string; deadline: string | null; createdAt?: string }[];
    } finally {
      db.close();
    }
  }

  async agencyLeadsTableExists(): Promise<boolean> {
    const db = openSqlite();
    try {
      const row = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agency_leads'")
        .get();
      return Boolean(row);
    } finally {
      db.close();
    }
  }

  async listLeadsOrdered(opts?: { includeArchived?: boolean }): Promise<Record<string, unknown>[]> {
    const db = openSqlite();
    try {
      ensureAgencyLeadsReady(db);
      const where = opts?.includeArchived ? "" : " WHERE COALESCE(archived, 0) = 0 ";
      return db
        .prepare(
          `
      SELECT * FROM agency_leads
      ${where}
      ORDER BY
        CASE status
          WHEN 'new' THEN 1
          WHEN 'contact_established' THEN 2
          WHEN 'commercial_proposal' THEN 3
          WHEN 'thinking' THEN 4
          WHEN 'paid' THEN 5
          WHEN 'pause' THEN 6
          WHEN 'lost' THEN 7
        END,
        createdAt DESC
    `
        )
        .all() as Record<string, unknown>[];
    } finally {
      db.close();
    }
  }

  async listProjectsWithSourceLead(): Promise<
    Array<{ id: string; name: string; source_lead_id: string }>
  > {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      return db
        .prepare(
          `SELECT id, name, source_lead_id FROM AgencyProject WHERE source_lead_id IS NOT NULL AND TRIM(source_lead_id) != ''`
        )
        .all() as Array<{ id: string; name: string; source_lead_id: string }>;
    } finally {
      db.close();
    }
  }

  async createLeadFromPost(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const contact = String(body.contact ?? "").trim();
    const source = String(body.source ?? "").trim();
    const taskDescription = (body.taskDescription as string) || null;
    const status = (body.status as string) || "new";
    const recurring = Boolean(body.isRecurring) ? 1 : 0;
    const db = openSqlite();
    try {
      ensureAgencyLeadsReady(db);
      ensureAgencyProjectsColumns(db);
      ensureLeadHistoryTable(db);
      const autoDate = isProfiRuLeadSource(source) ? null : calculateNextContactDateForLead(status);
      const nextContactDate = autoDate ? autoDate.toISOString() : null;
      const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      const insertLead = db.prepare(
        `
      INSERT INTO agency_leads (id, contact, source, taskDescription, status, nextContactDate, manualDateSet, isRecurring, archived, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `
      );
      const insertHistory = db.prepare(
        `
      INSERT INTO lead_history (id, leadId, eventType, newStatus, newSource, createdAt)
      VALUES (?, ?, 'created', ?, ?, datetime('now'))
    `
      );
      const selectLead = db.prepare("SELECT * FROM agency_leads WHERE id = ?");

      const txn = db.transaction(() => {
        insertLead.run(id, contact, source, taskDescription, status, nextContactDate, 0, recurring);
        const historyId = `history_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        insertHistory.run(historyId, id, status, source);
      });
      txn();

      return selectLead.get(id) as Record<string, unknown>;
    } finally {
      db.close();
    }
  }

  async getLeadById(id: string): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      ensureAgencyLeadsReady(db);
      return db.prepare("SELECT * FROM agency_leads WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
    } finally {
      db.close();
    }
  }

  async findProjectBySourceLeadId(leadId: string): Promise<{ id: string; name: string } | undefined> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      return db.prepare(`SELECT id, name FROM AgencyProject WHERE source_lead_id = ? LIMIT 1`).get(leadId) as
        | { id: string; name: string }
        | undefined;
    } finally {
      db.close();
    }
  }

  async updateLeadPut(id: string, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const contact = body.contact as string | undefined;
    const source = body.source as string | undefined;
    const taskDescription = body.taskDescription;
    const status = body.status as string | undefined;
    const nextContactDate = body.nextContactDate;
    const isRecurring = body.isRecurring;
    const archivedBody = body.archived;

    const db = openSqlite();
    try {
      ensureAgencyLeadsReady(db);
      ensureAgencyProjectsColumns(db);
      ensureLeadHistoryTable(db);
      const currentLead = db.prepare("SELECT * FROM agency_leads WHERE id = ?").get(id) as any;
      if (!currentLead) return undefined;

      let finalNextContactDate = currentLead.nextContactDate;
      let finalManualDateSet = currentLead.manualDateSet ? 1 : 0;

      if (nextContactDate !== undefined) {
        finalNextContactDate = nextContactDate || null;
        finalManualDateSet = 1;
      } else if (status && status !== currentLead.status) {
        if (!currentLead.manualDateSet) {
          const autoDate = calculateNextContactDateForLead(status);
          finalNextContactDate = autoDate ? autoDate.toISOString() : null;
          finalManualDateSet = 0;
        }
      }

      const recurringVal =
        isRecurring !== undefined
          ? Boolean(isRecurring)
            ? 1
            : 0
          : currentLead.isRecurring
            ? 1
            : 0;

      const archivedVal =
        archivedBody !== undefined ? (Boolean(archivedBody) ? 1 : 0) : currentLead.archived ? 1 : 0;

      db.prepare(
        `
      UPDATE agency_leads
      SET contact = COALESCE(?, contact),
          source = COALESCE(?, source),
          taskDescription = COALESCE(?, taskDescription),
          status = COALESCE(?, status),
          nextContactDate = ?,
          manualDateSet = ?,
          isRecurring = ?,
          archived = ?,
          updatedAt = datetime('now')
      WHERE id = ?
    `
      ).run(
        contact || null,
        source || null,
        taskDescription !== undefined ? taskDescription || null : null,
        status || null,
        finalNextContactDate,
        finalManualDateSet,
        recurringVal,
        archivedVal,
        id
      );

      if (status && status !== currentLead.status) {
        const historyId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(
          `
        INSERT INTO lead_history (id, leadId, eventType, oldStatus, newStatus, createdAt)
        VALUES (?, ?, 'status_changed', ?, ?, datetime('now'))
      `
        ).run(historyId, id, currentLead.status, status);
      }
      if (source && source !== currentLead.source) {
        const sourceHistoryId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(
          `
        INSERT INTO lead_history (id, leadId, eventType, oldSource, newSource, createdAt)
        VALUES (?, ?, 'source_changed', ?, ?, datetime('now'))
      `
        ).run(sourceHistoryId, id, currentLead.source, source);
      }
      if (nextContactDate !== undefined && nextContactDate !== currentLead.nextContactDate) {
        const dateHistoryId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(
          `
        INSERT INTO lead_history (id, leadId, eventType, oldDate, newDate, createdAt)
        VALUES (?, ?, 'date_changed', ?, ?, datetime('now'))
      `
        ).run(dateHistoryId, id, currentLead.nextContactDate || null, nextContactDate || null);
      }

      return db.prepare("SELECT * FROM agency_leads WHERE id = ?").get(id) as Record<string, unknown>;
    } finally {
      db.close();
    }
  }

  async deleteLeadById(id: string): Promise<number> {
    const db = openSqlite();
    try {
      return db.prepare("DELETE FROM agency_leads WHERE id = ?").run(id).changes;
    } finally {
      db.close();
    }
  }

  async getLeadForConvert(
    leadId: string
  ): Promise<{ id: string; contact: string; taskDescription: string | null; status: string } | undefined> {
    const db = openSqlite();
    try {
      ensureAgencyLeadsReady(db);
      return db
        .prepare(`SELECT id, contact, taskDescription, status FROM agency_leads WHERE id = ?`)
        .get(leadId) as
        | { id: string; contact: string; taskDescription: string | null; status: string }
        | undefined;
    } finally {
      db.close();
    }
  }

  async findProjectRowBySourceLead(
    leadId: string
  ): Promise<{ id: string; name: string; deadline: string | null } | undefined> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      return db
        .prepare(`SELECT id, name, deadline FROM AgencyProject WHERE source_lead_id = ? LIMIT 1`)
        .get(leadId) as { id: string; name: string; deadline: string | null } | undefined;
    } finally {
      db.close();
    }
  }

  async insertProjectFromLead(input: {
    id: string;
    name: string;
    clientContact: string | null;
    leadId: string;
  }): Promise<{ id: string; name: string; deadline: string | null }> {
    const db = openSqlite();
    try {
      ensureAgencyProjectsColumns(db);
      db.prepare(
        `INSERT INTO AgencyProject
       (id, name, totalAmount, paidAmount, deadline, status, serviceType, clientType, paymentMethod, clientContact, notes, source_lead_id, createdAt, updatedAt)
       VALUES (?, ?, 0, 0, NULL, 'not_paid', 'site', NULL, NULL, ?, NULL, ?, datetime('now'), datetime('now'))`
      ).run(input.id, input.name, input.clientContact, input.leadId);
      return db.prepare(`SELECT id, name, deadline FROM AgencyProject WHERE id = ?`).get(input.id) as {
        id: string;
        name: string;
        deadline: string | null;
      };
    } finally {
      db.close();
    }
  }

  async listExpenses(projectId?: string | null): Promise<Record<string, unknown>[]> {
    const db = openSqlite();
    try {
      let query = "SELECT * FROM AgencyExpense";
      const params: (string | number)[] = [];
      if (projectId) {
        query += " WHERE projectId = ?";
        params.push(projectId);
      }
      query += " ORDER BY createdAt DESC";
      return db.prepare(query).all(...params) as Record<string, unknown>[];
    } finally {
      db.close();
    }
  }

  async createExpense(input: {
    id: string;
    projectId: string;
    employeeName: string;
    employeeRole: string;
    amount: number;
    notes: string | null;
  }): Promise<Record<string, unknown>> {
    const db = openSqlite();
    try {
      db.prepare(
        `
      INSERT INTO AgencyExpense (id, projectId, employeeName, employeeRole, amount, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
      ).run(
        input.id,
        input.projectId,
        input.employeeName,
        input.employeeRole,
        input.amount,
        input.notes
      );
      return db.prepare("SELECT * FROM AgencyExpense WHERE id = ?").get(input.id) as Record<string, unknown>;
    } finally {
      db.close();
    }
  }

  async updateExpenseById(
    id: string,
    employeeName: string,
    employeeRole: string,
    amount: number,
    notes: string | null
  ): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      db.prepare(
        `
      UPDATE AgencyExpense
      SET employeeName = ?, employeeRole = ?, amount = ?, notes = ?, updatedAt = datetime('now')
      WHERE id = ?
    `
      ).run(employeeName, employeeRole, amount, notes, id);
      return db.prepare("SELECT * FROM AgencyExpense WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    } finally {
      db.close();
    }
  }

  async deleteExpenseById(id: string): Promise<void> {
    const db = openSqlite();
    try {
      db.prepare("DELETE FROM AgencyExpense WHERE id = ?").run(id);
    } finally {
      db.close();
    }
  }

  async listGeneralExpenses(): Promise<Record<string, unknown>[]> {
    const db = openSqlite();
    try {
      return db.prepare("SELECT * FROM AgencyGeneralExpense ORDER BY createdAt DESC").all() as Record<
        string,
        unknown
      >[];
    } catch {
      return [];
    } finally {
      db.close();
    }
  }

  async createGeneralExpense(input: {
    id: string;
    employeeName: string | null;
    employeeRole: string | null;
    amount: number;
    notes: string | null;
  }): Promise<Record<string, unknown>> {
    const db = openSqlite();
    try {
      db.prepare(
        `
      INSERT INTO AgencyGeneralExpense (id, employeeName, employeeRole, amount, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
      ).run(input.id, input.employeeName, input.employeeRole, input.amount, input.notes);
      return db.prepare("SELECT * FROM AgencyGeneralExpense WHERE id = ?").get(input.id) as Record<
        string,
        unknown
      >;
    } finally {
      db.close();
    }
  }

  async getGeneralExpenseById(id: string): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      return db.prepare("SELECT * FROM AgencyGeneralExpense WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
    } finally {
      db.close();
    }
  }

  async updateGeneralExpenseById(
    id: string,
    employeeName: string | null,
    employeeRole: string | null,
    amount: number,
    notes: string | null
  ): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      db.prepare(
        `
      UPDATE AgencyGeneralExpense
      SET employeeName = ?, employeeRole = ?, amount = ?, notes = ?, updatedAt = datetime('now')
      WHERE id = ?
    `
      ).run(employeeName, employeeRole, amount, notes, id);
      return db.prepare("SELECT * FROM AgencyGeneralExpense WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
    } finally {
      db.close();
    }
  }

  async deleteGeneralExpenseById(id: string): Promise<void> {
    const db = openSqlite();
    try {
      db.prepare("DELETE FROM AgencyGeneralExpense WHERE id = ?").run(id);
    } finally {
      db.close();
    }
  }

  async copyGeneralExpensesBetweenMonths(input: {
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
  }): Promise<number> {
    const { fromYear, fromMonth, toYear, toMonth } = input;
    const db = openSqlite();
    try {
      const fromStart = `${fromYear}-${String(fromMonth).padStart(2, "0")}-01 00:00:00`;
      const fromEnd = new Date(fromYear, fromMonth, 0, 23, 59, 59);
      const fromEndStr = `${fromEnd.getFullYear()}-${String(fromEnd.getMonth() + 1).padStart(2, "0")}-${String(fromEnd.getDate()).padStart(2, "0")} 23:59:59`;
      const toDate = `${toYear}-${String(toMonth).padStart(2, "0")}-01 00:00:00`;
      const expenses = db
        .prepare(
          `
        SELECT * FROM AgencyGeneralExpense
        WHERE createdAt >= ? AND createdAt <= ?
        ORDER BY createdAt
      `
        )
        .all(fromStart, fromEndStr) as any[];
      let copied = 0;
      for (const exp of expenses) {
        const newId = `agexp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        db.prepare(
          `
        INSERT INTO AgencyGeneralExpense (id, employeeName, employeeRole, amount, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `
        ).run(newId, exp.employeeName, exp.employeeRole, exp.amount, exp.notes, toDate);
        copied++;
      }
      return copied;
    } finally {
      db.close();
    }
  }

  async getAgencyProfitForMonth(year: number, month: number): Promise<{
    expectedRevenue: number;
    actualRevenue: number;
    totalExpenses: number;
    expectedProfit: number;
    actualProfit: number;
  }> {
    const db = openSqlite();
    try {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      const agencyProjects = db
        .prepare(
          `
      SELECT p.*, COALESCE(SUM(e.amount), 0) as totalExpenses
      FROM AgencyProject p
      LEFT JOIN AgencyExpense e ON p.id = e.projectId
      WHERE date(p.createdAt) >= date(?) AND date(p.createdAt) <= date(?)
      GROUP BY p.id
    `
        )
        .all(monthStart.toISOString().split("T")[0], monthEnd.toISOString().split("T")[0]) as any[];
      let agencyGeneralExpenses: any[] = [];
      try {
        agencyGeneralExpenses = db
          .prepare(
            `
        SELECT * FROM AgencyGeneralExpense
        WHERE date(createdAt) >= date(?) AND date(createdAt) <= date(?)
      `
          )
          .all(monthStart.toISOString().split("T")[0], monthEnd.toISOString().split("T")[0]) as any[];
      } catch {
        agencyGeneralExpenses = [];
      }
      const expectedRevenue = agencyProjects.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);
      const actualRevenue = agencyProjects.reduce((sum: number, p: any) => sum + (p.paidAmount || 0), 0);
      const projectExpenses = agencyProjects.reduce((sum: number, p: any) => sum + (p.totalExpenses || 0), 0);
      const generalExpensesTotal = agencyGeneralExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const accountRevenue = agencyProjects
        .filter((p: any) => p.paymentMethod === "account" && p.status === "paid")
        .reduce((sum: number, p: any) => sum + (p.paidAmount || 0), 0);
      const taxAmount = 6916 + accountRevenue * 0.01;
      const totalExpenses = projectExpenses + generalExpensesTotal + taxAmount;
      return {
        expectedRevenue,
        actualRevenue,
        totalExpenses,
        expectedProfit: expectedRevenue - totalExpenses,
        actualProfit: actualRevenue - totalExpenses,
      };
    } finally {
      db.close();
    }
  }

  async ensureProjectDetailTable(): Promise<void> {
    const db = openSqlite();
    try {
      ensureDetailTable(db);
    } finally {
      db.close();
    }
  }

  async listProjectDetails(projectId?: string | null): Promise<Record<string, unknown>[]> {
    const db = openSqlite();
    try {
      ensureDetailTable(db);
      let query = "SELECT * FROM AgencyProjectDetail";
      const params: string[] = [];
      if (projectId) {
        query += " WHERE projectId = ?";
        params.push(projectId);
      }
      query += ' ORDER BY "order" ASC, createdAt ASC';
      return db.prepare(query).all(...params) as Record<string, unknown>[];
    } finally {
      db.close();
    }
  }

  async createProjectDetail(input: {
    id: string;
    projectId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    order: number | null;
  }): Promise<Record<string, unknown>> {
    const db = openSqlite();
    try {
      ensureDetailTable(db);
      db.prepare(
        `
      INSERT INTO AgencyProjectDetail (id, projectId, title, quantity, unitPrice, "order", createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, 0), datetime('now'), datetime('now'))
    `
      ).run(
        input.id,
        input.projectId,
        input.title,
        input.quantity,
        input.unitPrice,
        typeof input.order === "number" ? input.order : null
      );
      return db.prepare("SELECT * FROM AgencyProjectDetail WHERE id = ?").get(input.id) as Record<
        string,
        unknown
      >;
    } finally {
      db.close();
    }
  }

  async getProjectDetailById(
    id: string
  ): Promise<{ title: string; quantity: number; unitPrice: number; order: number } | undefined> {
    const db = openSqlite();
    try {
      ensureDetailTable(db);
      return db.prepare("SELECT * FROM AgencyProjectDetail WHERE id = ?").get(id) as
        | { title: string; quantity: number; unitPrice: number; order: number }
        | undefined;
    } finally {
      db.close();
    }
  }

  async updateProjectDetailById(
    id: string,
    title: string,
    quantity: number,
    unitPrice: number,
    order: number
  ): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      ensureDetailTable(db);
      db.prepare(
        `
      UPDATE AgencyProjectDetail
      SET title = ?, quantity = ?, unitPrice = ?, "order" = ?, updatedAt = datetime('now')
      WHERE id = ?
    `
      ).run(title, quantity, unitPrice, order, id);
      return db.prepare("SELECT * FROM AgencyProjectDetail WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
    } finally {
      db.close();
    }
  }

  async deleteProjectDetailById(id: string): Promise<void> {
    const db = openSqlite();
    try {
      ensureDetailTable(db);
      db.prepare("DELETE FROM AgencyProjectDetail WHERE id = ?").run(id);
    } finally {
      db.close();
    }
  }

  async revenueByClient(): Promise<{ items: unknown[]; total: number }> {
    const db = openSqlite();
    try {
      const rows = db
        .prepare(
          `
      SELECT COALESCE(clientType, '') as clientType, SUM(totalAmount) as totalAmount, COUNT(*) as count
      FROM AgencyProject
      GROUP BY COALESCE(clientType, '')
      ORDER BY totalAmount DESC
    `
        )
        .all() as Array<{ clientType: string; totalAmount: number; count: number }>;
      const total = rows.reduce((s, r) => s + r.totalAmount, 0);
      const items = rows.map((r) => ({
        clientType: r.clientType,
        totalAmount: r.totalAmount,
        count: r.count,
        percent: total > 0 ? Math.round((r.totalAmount / total) * 1000) / 10 : 0,
      }));
      return { items, total };
    } finally {
      db.close();
    }
  }

  async revenueByService(): Promise<{ items: unknown[]; total: number }> {
    const db = openSqlite();
    try {
      const rows = db
        .prepare(
          `
      SELECT serviceType, SUM(totalAmount) as totalAmount, COUNT(*) as count
      FROM AgencyProject
      GROUP BY serviceType
      ORDER BY totalAmount DESC
    `
        )
        .all() as Array<{ serviceType: string; totalAmount: number; count: number }>;
      const total = rows.reduce((s, r) => s + r.totalAmount, 0);
      const items = rows.map((r) => ({
        serviceType: r.serviceType,
        totalAmount: r.totalAmount,
        count: r.count,
        percent: total > 0 ? Math.round((r.totalAmount / total) * 1000) / 10 : 0,
      }));
      return { items, total };
    } finally {
      db.close();
    }
  }

  async getProjectsByIds(
    ids: string[]
  ): Promise<Array<{ id: string; name: string; totalAmount: number | null }>> {
    if (ids.length === 0) return [];
    const db = openSqlite();
    try {
      const ph = ids.map(() => "?").join(", ");
      return db
        .prepare(`SELECT id, name, totalAmount FROM AgencyProject WHERE id IN (${ph})`)
        .all(...ids) as Array<{ id: string; name: string; totalAmount: number | null }>;
    } finally {
      db.close();
    }
  }

  async sumDesignerExpensesByProjects(
    projectIds: string[]
  ): Promise<Array<{ projectId: string; employeeName: string | null; employeeRole: string | null; s: number }>> {
    if (projectIds.length === 0) return [];
    const db = openSqlite();
    try {
      const ph = projectIds.map(() => "?").join(", ");
      return db
        .prepare(
          `
      SELECT projectId, employeeName, employeeRole, SUM(amount) as s
      FROM AgencyExpense
      WHERE projectId IN (${ph})
      GROUP BY projectId, employeeName, employeeRole
    `
        )
        .all(...projectIds) as Array<{
        projectId: string;
        employeeName: string | null;
        employeeRole: string | null;
        s: number;
      }>;
    } finally {
      db.close();
    }
  }

  async getSalesDashboard(
    startDate: string | null,
    endDate: string | null
  ): Promise<Record<string, unknown>> {
    const db = openSqlite();
    try {
      ensureOutreachTable(db);
      ensureAgencyLeadsReady(db);

      const filterByCreatedRange = (
        rows: Array<{ createdAt: string; platform: string; [k: string]: unknown }>,
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

      const allOutreach = db.prepare(`SELECT * FROM outreach_responses ORDER BY createdAt DESC`).all() as Array<{
        platform: string;
        createdAt: string;
        [k: string]: unknown;
      }>;
      const inRange = filterByCreatedRange(allOutreach, startDate, endDate);
      const profiRows = inRange.filter((r) => r.platform === "profi");
      const threadsRows = inRange.filter((r) => r.platform === "threads");
      const combinedRows = inRange;
      const statsProfi = profiRows.length ? computeOutreachStats(profiRows as unknown as Record<string, unknown>[]) : null;
      const statsThreads = threadsRows.length
        ? computeOutreachStats(threadsRows as unknown as Record<string, unknown>[])
        : null;
      const statsCombined = combinedRows.length
        ? computeOutreachStats(combinedRows as unknown as Record<string, unknown>[])
        : null;
      const byMonthProfi =
        profiRows.length > 0 ? computeOutreachStatsByMonth(profiRows as unknown as Record<string, unknown>[]) : {};
      const byMonthThreads =
        threadsRows.length > 0
          ? computeOutreachStatsByMonth(threadsRows as unknown as Record<string, unknown>[])
          : {};
      const visitsProfi = getVisitAggregates(db, "profi");
      const visitsThreads = getVisitAggregates(db, "threads");

      let recurringContacted = 0;
      let recurringPaid = 0;
      try {
        let q = `SELECT COUNT(*) as c FROM agency_leads WHERE isRecurring = 1`;
        const params: string[] = [];
        if (startDate) {
          q += ` AND date(createdAt) >= date(?)`;
          params.push(startDate);
        }
        if (endDate) {
          q += ` AND date(createdAt) <= date(?)`;
          params.push(endDate);
        }
        recurringContacted = (db.prepare(q).get(...params) as { c: number }).c;
        let qPaid = `SELECT COUNT(*) as c FROM agency_leads WHERE isRecurring = 1 AND status = 'paid'`;
        const paramsPaid: string[] = [];
        if (startDate) {
          qPaid += ` AND date(createdAt) >= date(?)`;
          paramsPaid.push(startDate);
        }
        if (endDate) {
          qPaid += ` AND date(createdAt) <= date(?)`;
          paramsPaid.push(endDate);
        }
        recurringPaid = (db.prepare(qPaid).get(...paramsPaid) as { c: number }).c;
      } catch {
        /* */
      }

      let agencyPaidSum = 0;
      try {
        let q = `SELECT COALESCE(SUM(paidAmount), 0) as s FROM AgencyProject WHERE 1=1`;
        const params: string[] = [];
        if (startDate) {
          q += ` AND date(createdAt) >= date(?)`;
          params.push(startDate);
        }
        if (endDate) {
          q += ` AND date(createdAt) <= date(?)`;
          params.push(endDate);
        }
        agencyPaidSum = (db.prepare(q).get(...params) as { s: number }).s;
      } catch {
        /* */
      }

      const leadsTotal = (() => {
        try {
          let q = `SELECT COUNT(*) as c FROM agency_leads WHERE 1=1`;
          const params: string[] = [];
          if (startDate) {
            q += ` AND date(createdAt) >= date(?)`;
            params.push(startDate);
          }
          if (endDate) {
            q += ` AND date(createdAt) <= date(?)`;
            params.push(endDate);
          }
          return (db.prepare(q).get(...params) as { c: number }).c;
        } catch {
          return 0;
        }
      })();

      const leadsPaid = (() => {
        try {
          let q = `SELECT COUNT(*) as c FROM agency_leads WHERE status = 'paid'`;
          const params: string[] = [];
          if (startDate) {
            q += ` AND date(createdAt) >= date(?)`;
            params.push(startDate);
          }
          if (endDate) {
            q += ` AND date(createdAt) <= date(?)`;
            params.push(endDate);
          }
          return (db.prepare(q).get(...params) as { c: number }).c;
        } catch {
          return 0;
        }
      })();

      return {
        period: { startDate, endDate },
        outreach: {
          profi: { stats: statsProfi, count: profiRows.length, byMonth: byMonthProfi },
          threads: { stats: statsThreads, count: threadsRows.length, byMonth: byMonthThreads },
          combined: { stats: statsCombined, count: combinedRows.length },
        },
        visits: { profi: visitsProfi, threads: visitsThreads },
        leads: { newInPeriod: leadsTotal, paidInPeriod: leadsPaid },
        recurring: { contactedInPeriod: recurringContacted, paidInPeriod: recurringPaid },
        agency: { paidAmountSumInPeriod: agencyPaidSum },
      };
    } finally {
      db.close();
    }
  }

  async getLeadsAnalytics(
    startDate: string | null,
    endDate: string | null
  ): Promise<{
    conversions: Array<{ label: string; count: number; percentage: number }>;
    sources: Array<{ source: string; count: number }>;
  }> {
    const db = openSqlite();
    try {
      const tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='lead_history'`)
        .get();
      if (!tableExists) {
        return { conversions: [], sources: [] };
      }
      const periodStart = startDate ? new Date(startDate + "T00:00:00").toISOString() : null;
      const periodEnd = endDate ? new Date(endDate + "T23:59:59").toISOString() : null;

      const buildWhere = (base: string) => {
        const params: string[] = [];
        let sql = base;
        if (periodStart && periodEnd) {
          sql += " AND createdAt >= ? AND createdAt <= ?";
          params.push(periodStart, periodEnd);
        } else if (periodStart) {
          sql += " AND createdAt >= ?";
          params.push(periodStart);
        } else if (periodEnd) {
          sql += " AND createdAt <= ?";
          params.push(periodEnd);
        }
        return { sql, params };
      }

      const wStatus = buildWhere(`WHERE eventType = 'status_changed'`);
      const statusChanges = db
        .prepare(
          `SELECT leadId, oldStatus, newStatus, createdAt FROM lead_history ${wStatus.sql} ORDER BY createdAt ASC`
        )
        .all(...wStatus.params) as any[];

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
            uniqueLeads.add(change.leadId);
          }
        }
        conversions[transition.label] = { count: uniqueLeads.size, percentage: 0 };
      }
      const pauseTransitions = statusChanges.filter((c) => c.newStatus === "pause");
      const uniquePauseLeads = new Set(pauseTransitions.map((c) => c.leadId));
      conversions["Любой → Пауза"] = { count: uniquePauseLeads.size, percentage: 0 };

      const newLeads = new Set(
        statusChanges.filter((c) => c.oldStatus === "new" || c.newStatus === "new").map((c) => c.leadId)
      );
      const wCreated = buildWhere(`WHERE eventType = 'created'`);
      const createdInPeriod = db
        .prepare(`SELECT DISTINCT leadId FROM lead_history ${wCreated.sql}`)
        .all(...wCreated.params) as any[];
      createdInPeriod.forEach((c: any) => newLeads.add(c.leadId));

      if (newLeads.size > 0 && conversions["Новые → Контакт установлен"]) {
        conversions["Новые → Контакт установлен"].percentage =
          (conversions["Новые → Контакт установлен"].count / newLeads.size) * 100;
      }
      const contactEstablishedLeads = new Set(
        statusChanges
          .filter((c) => c.oldStatus === "contact_established" || c.newStatus === "contact_established")
          .map((c) => c.leadId)
      );
      if (contactEstablishedLeads.size > 0 && conversions["Контакт установлен → Коммерческое предложение"]) {
        conversions["Контакт установлен → Коммерческое предложение"].percentage =
          (conversions["Контакт установлен → Коммерческое предложение"].count / contactEstablishedLeads.size) * 100;
      }
      const commercialProposalLeads = new Set(
        statusChanges
          .filter((c) => c.oldStatus === "commercial_proposal" || c.newStatus === "commercial_proposal")
          .map((c) => c.leadId)
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
        statusChanges.filter((c) => c.oldStatus === "thinking" || c.newStatus === "thinking").map((c) => c.leadId)
      );
      if (thinkingLeads.size > 0 && conversions["Думает / изучает → Оплачен"]) {
        conversions["Думает / изучает → Оплачен"].percentage =
          (conversions["Думает / изучает → Оплачен"].count / thinkingLeads.size) * 100;
      }

      const createdEvents = db
        .prepare(`SELECT leadId, newSource FROM lead_history ${wCreated.sql}`)
        .all(...wCreated.params) as any[];
      const sourcesMap: Record<string, Set<string>> = {};
      for (const event of createdEvents) {
        if (event.newSource) {
          if (!sourcesMap[event.newSource]) sourcesMap[event.newSource] = new Set();
          sourcesMap[event.newSource].add(event.leadId);
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
    } finally {
      db.close();
    }
  }

  async outreachListJson(
    platform: OutreachPlatform,
    withStats: boolean,
    opts?: { omitItems?: boolean }
  ): Promise<unknown> {
    const db = openSqlite();
    try {
      return getOutreachListJson(db, platform, withStats, opts);
    } finally {
      db.close();
    }
  }

  async insertOutreachResponse(
    platform: OutreachPlatform,
    params: { cost: number; notes: string | null }
  ): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      return insertOutreachResponse(db, platform, params) as Record<string, unknown> | undefined;
    } finally {
      db.close();
    }
  }

  async getOutreachById(
    id: string,
    platform: OutreachPlatform
  ): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      return getOutreachRowById(db, id, platform) as Record<string, unknown> | undefined;
    } finally {
      db.close();
    }
  }

  async patchOutreachResponse(
    id: string,
    platform: OutreachPlatform,
    body: { status?: string; refundAmount?: number; projectAmount?: number; notes?: string | null }
  ): Promise<Record<string, unknown> | undefined> {
    const db = openSqlite();
    try {
      return patchOutreachResponse(db, id, platform, body) as Record<string, unknown> | undefined;
    } finally {
      db.close();
    }
  }

  async deleteOutreachResponse(id: string, platform: OutreachPlatform): Promise<boolean> {
    const db = openSqlite();
    try {
      return deleteOutreachResponse(db, id, platform);
    } finally {
      db.close();
    }
  }

  async insertPlatformVisit(platform: "profi" | "threads"): Promise<void> {
    const db = openSqlite();
    try {
      insertPlatformVisit(db, platform as VisitPlatform);
    } finally {
      db.close();
    }
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
    const db = openSqlite();
    try {
      ensureAgencyLeadsReady(db);
      db.prepare(
        `
      INSERT INTO agency_leads (id, contact, source, taskDescription, status, nextContactDate, manualDateSet, isRecurring, archived, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
    `
      ).run(
        input.leadId,
        input.contact,
        input.source,
        input.taskDescription,
        input.status,
        input.nextContactDateIso,
        input.manualDateSet
      );
      return db.prepare("SELECT * FROM agency_leads WHERE id = ?").get(input.leadId) as Record<
        string,
        unknown
      >;
    } finally {
      db.close();
    }
  }
}
