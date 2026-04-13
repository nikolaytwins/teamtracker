/**
 * Одноразовый импорт основных таблиц из agency.db (SQLite) в Supabase.
 *
 * Требуется: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Опционально: AGENCY_SQLITE_PATH (иначе data/agency.db от cwd)
 *
 * Запуск: npm run import-agency-to-supabase
 *
 * Порядок: сначала примените SQL из supabase/migrations/ в проекте Supabase.
 */

import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const BATCH = 400;

function getSqlitePath(): string {
  const override = process.env.AGENCY_SQLITE_PATH?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data", "agency.db");
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Задайте ${name}`);
  return v;
}

function parseTs(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString();
}

async function upsertBatches(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[]
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`${table}: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`);
  }
  if (rows.length) process.stdout.write(`\n`);
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const sqlitePath = getSqlitePath();

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const db = new Database(sqlitePath, { readonly: true });

  const hasTable = (name: string) =>
    Boolean(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name)
    );

  console.log("SQLite:", sqlitePath);

  if (hasTable("agency_leads")) {
    const raw = db.prepare("SELECT * FROM agency_leads").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      contact: r.contact,
      source: r.source,
      task_description: r.taskDescription ?? null,
      status: r.status,
      next_contact_date: parseTs(r.nextContactDate),
      manual_date_set: Boolean(r.manualDateSet),
      is_recurring: Boolean(r.isRecurring),
      created_at: parseTs(r.createdAt) ?? new Date().toISOString(),
      updated_at: parseTs(r.updatedAt) ?? new Date().toISOString(),
    }));
    console.log("Import agency_leads:", rows.length);
    await upsertBatches(supabase, "agency_leads", rows);
  }

  if (hasTable("lead_history")) {
    const raw = db.prepare("SELECT * FROM lead_history").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      lead_id: r.leadId,
      event_type: r.eventType,
      old_status: r.oldStatus ?? null,
      new_status: r.newStatus ?? null,
      old_source: r.oldSource ?? null,
      new_source: r.newSource ?? null,
      old_date: r.oldDate != null ? String(r.oldDate) : null,
      new_date: r.newDate != null ? String(r.newDate) : null,
      created_at: parseTs(r.createdAt) ?? new Date().toISOString(),
    }));
    console.log("Import lead_history:", rows.length);
    await upsertBatches(supabase, "lead_history", rows);
  }

  if (hasTable("AgencyProject")) {
    const raw = db.prepare("SELECT * FROM AgencyProject").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      name: r.name,
      total_amount: Number(r.totalAmount) || 0,
      paid_amount: Number(r.paidAmount) || 0,
      deadline: parseTs(r.deadline),
      status: r.status,
      service_type: r.serviceType,
      client_type: r.clientType ?? null,
      payment_method: r.paymentMethod ?? null,
      client_contact: r.clientContact ?? null,
      notes: r.notes ?? null,
      source_lead_id:
        r.source_lead_id != null && String(r.source_lead_id).trim()
          ? String(r.source_lead_id)
          : null,
      created_at: parseTs(r.createdAt) ?? new Date().toISOString(),
      updated_at: parseTs(r.updatedAt) ?? new Date().toISOString(),
    }));
    console.log("Import agency_project:", rows.length);
    await upsertBatches(supabase, "agency_project", rows);
  }

  if (hasTable("AgencyExpense")) {
    const raw = db.prepare("SELECT * FROM AgencyExpense").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      project_id: r.projectId,
      employee_name: r.employeeName,
      employee_role: r.employeeRole,
      amount: Number(r.amount) || 0,
      notes: r.notes ?? null,
      created_at: parseTs(r.createdAt) ?? new Date().toISOString(),
      updated_at: parseTs(r.updatedAt) ?? new Date().toISOString(),
    }));
    console.log("Import agency_expense:", rows.length);
    await upsertBatches(supabase, "agency_expense", rows);
  }

  if (hasTable("AgencyProjectDetail")) {
    const raw = db.prepare("SELECT * FROM AgencyProjectDetail").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      project_id: r.projectId,
      title: r.title,
      quantity: Number(r.quantity) || 0,
      unit_price: Number(r.unitPrice) || 0,
      sort_order: Number(r.order) || 0,
      created_at: parseTs(r.createdAt) ?? new Date().toISOString(),
      updated_at: parseTs(r.updatedAt) ?? new Date().toISOString(),
    }));
    console.log("Import agency_project_detail:", rows.length);
    await upsertBatches(supabase, "agency_project_detail", rows);
  }

  if (hasTable("AgencyGeneralExpense")) {
    const raw = db.prepare("SELECT * FROM AgencyGeneralExpense").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      employee_name: r.employeeName,
      employee_role: r.employeeRole,
      amount: Number(r.amount) || 0,
      notes: r.notes ?? null,
      created_at: parseTs(r.createdAt) ?? new Date().toISOString(),
      updated_at: parseTs(r.updatedAt) ?? new Date().toISOString(),
    }));
    console.log("Import agency_general_expense:", rows.length);
    await upsertBatches(supabase, "agency_general_expense", rows);
  }

  if (hasTable("outreach_responses")) {
    const raw = db.prepare("SELECT * FROM outreach_responses").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      platform: r.platform ?? "profi",
      created_at: parseTs(r.createdAt) ?? new Date().toISOString(),
      cost: Number(r.cost) || 0,
      refund_amount: Number(r.refundAmount) || 0,
      status: r.status,
      project_amount: r.projectAmount != null ? Number(r.projectAmount) : null,
      notes: r.notes ?? null,
      updated_at: parseTs(r.updatedAt) ?? new Date().toISOString(),
    }));
    console.log("Import outreach_responses:", rows.length);
    await upsertBatches(supabase, "outreach_responses", rows);
  }

  if (hasTable("platform_visits")) {
    const raw = db.prepare("SELECT * FROM platform_visits").all() as Record<string, unknown>[];
    const rows = raw.map((r) => ({
      id: r.id,
      platform: r.platform,
      visited_at: parseTs(r.visitedAt) ?? new Date().toISOString(),
    }));
    console.log("Import platform_visits:", rows.length);
    await upsertBatches(supabase, "platform_visits", rows);
  }

  db.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
