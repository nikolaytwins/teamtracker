import type Database from "better-sqlite3";
import { ensureAgencyLeadsReady } from "@/lib/agency-leads-schema";
import {
  computeOutreachStats,
  computeOutreachStatsByMonth,
  ensureOutreachTable,
  type OutreachPlatform,
} from "@/lib/outreach";
import { getVisitAggregates } from "@/lib/platform-visits";

export function getOutreachListJson(db: Database.Database, platform: OutreachPlatform, withStats: boolean) {
  ensureOutreachTable(db);
  db.prepare(`UPDATE outreach_responses SET status = 'paid' WHERE status = 'project' AND platform = ?`).run(platform);

  const items = db
    .prepare(`SELECT * FROM outreach_responses WHERE platform = ? ORDER BY createdAt DESC`)
    .all(platform) as Array<{
      id: string;
      platform: string;
      createdAt: string;
      cost: number;
      refundAmount: number;
      status: string;
      projectAmount: number | null;
      notes: string | null;
      updatedAt: string;
    }>;

  function formatProfiDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  }

  let getReminder: (oid: string, createdAt: string) => { date: string; leadId: string } | null = () => null;
  if (platform === "profi") {
    try {
      const leadRows = db
        .prepare(
          `SELECT id, contact, nextContactDate FROM agency_leads
         WHERE source = 'Profi.ru' AND nextContactDate IS NOT NULL`
        )
        .all() as Array<{ id: string; contact: string; nextContactDate: string }>;
      const contactToLead = new Map<string, { date: string; leadId: string }>();
      for (const row of leadRows) {
        contactToLead.set(row.contact, { date: row.nextContactDate, leadId: row.id });
      }
      getReminder = (_oid: string, createdAt: string) => {
        const contact = `Profi отклик (${formatProfiDate(createdAt)})`;
        return contactToLead.get(contact) ?? null;
      };
    } catch {
      /* no leads table */
    }
  }

  const itemsWithReminder = items.map((item) => ({
    ...item,
    reminder: getReminder(item.id, item.createdAt),
  }));

  if (withStats) {
    const stats = itemsWithReminder.length > 0 ? computeOutreachStats(itemsWithReminder) : null;
    const byMonth =
      itemsWithReminder.length > 0 ? computeOutreachStatsByMonth(itemsWithReminder) : {};
    const visits = getVisitAggregates(db, platform);
    return { items: itemsWithReminder, stats, byMonth, visits };
  }
  return itemsWithReminder;
}

export function insertOutreachResponse(
  db: Database.Database,
  platform: OutreachPlatform,
  params: { cost: number; notes: string | null }
) {
  ensureOutreachTable(db);
  const prefix = platform === "threads" ? "thr" : "profi";
  const id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO outreach_responses (id, platform, createdAt, cost, refundAmount, status, projectAmount, notes, updatedAt)
     VALUES (?, ?, ?, ?, 0, 'response', NULL, ?, ?)`
  ).run(id, platform, now, params.cost, params.notes, now);

  if (platform === "profi") {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      const nextContactDateIso = tomorrow.toISOString();
      const created = new Date(now);
      const contact = `Profi отклик (${String(created.getDate()).padStart(2, "0")}.${String(created.getMonth() + 1).padStart(2, "0")}.${created.getFullYear()})`;
      const source = "Profi.ru";
      const taskDescription = params.notes ? `Напомнить заказчику. ${params.notes}` : "Напомнить заказчику";
      const leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      ensureAgencyLeadsReady(db);
      db.prepare(
        `INSERT INTO agency_leads (id, contact, source, taskDescription, status, nextContactDate, manualDateSet, isRecurring, archived, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'new', ?, 1, 0, 0, datetime('now'), datetime('now'))`
      ).run(leadId, contact, source, taskDescription, nextContactDateIso);
    } catch {
      /* ignore */
    }
  }

  return db.prepare("SELECT * FROM outreach_responses WHERE id = ?").get(id);
}

export function getOutreachById(db: Database.Database, id: string, platform: OutreachPlatform) {
  ensureOutreachTable(db);
  return db.prepare("SELECT * FROM outreach_responses WHERE id = ? AND platform = ?").get(id, platform);
}

export function patchOutreachResponse(
  db: Database.Database,
  id: string,
  platform: OutreachPlatform,
  body: { status?: string; refundAmount?: number; projectAmount?: number; notes?: string | null }
) {
  ensureOutreachTable(db);
  const current = db.prepare("SELECT * FROM outreach_responses WHERE id = ? AND platform = ?").get(id, platform) as
    | Record<string, unknown>
    | undefined;
  if (!current) return null;

  const allowed = ["response", "viewed", "conversation", "proposal", "paid", "refunded", "drain"];
  const newStatus = body.status != null && allowed.includes(body.status) ? body.status : (current.status as string);
  const newRefund =
    body.refundAmount != null ? Number(body.refundAmount) : (current.refundAmount as number);
  const newProjectAmount =
    newStatus === "paid" && body.projectAmount != null
      ? Number(body.projectAmount)
      : newStatus === "paid"
        ? (current.projectAmount as number | null)
        : null;
  const newNotes = body.notes !== undefined ? body.notes || null : (current.notes as string | null);

  db.prepare(
    `UPDATE outreach_responses
     SET status = ?, refundAmount = ?, projectAmount = ?, notes = ?, updatedAt = ?
     WHERE id = ? AND platform = ?`
  ).run(newStatus, newRefund, newProjectAmount, newNotes, new Date().toISOString(), id, platform);

  return db.prepare("SELECT * FROM outreach_responses WHERE id = ? AND platform = ?").get(id, platform);
}

export function deleteOutreachResponse(db: Database.Database, id: string, platform: OutreachPlatform): boolean {
  ensureOutreachTable(db);
  const row = db.prepare("SELECT id FROM outreach_responses WHERE id = ? AND platform = ?").get(id, platform);
  if (!row) return false;
  db.prepare("DELETE FROM outreach_responses WHERE id = ? AND platform = ?").run(id, platform);
  return true;
}
