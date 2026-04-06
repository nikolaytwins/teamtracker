import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { ensureAgencyLeadsColumns } from "@/lib/agency-leads-schema";
import { getAgencySqlitePath } from "@/lib/agency-sqlite";
import {
  computeOutreachStats,
  computeOutreachStatsByMonth,
  ensureOutreachTable,
  type OutreachRow,
} from "@/lib/outreach";
import { getVisitAggregates } from "@/lib/platform-visits";

function getDb() {
  return new Database(getAgencySqlitePath());
}

function filterByCreatedRange(
  rows: OutreachRow[],
  startIso: string | null,
  endIso: string | null
): OutreachRow[] {
  if (!startIso && !endIso) return rows;
  return rows.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    if (startIso && t < new Date(startIso + "T00:00:00").getTime()) return false;
    if (endIso && t > new Date(endIso + "T23:59:59").getTime()) return false;
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const db = getDb();
    ensureOutreachTable(db);
    ensureAgencyLeadsColumns(db);

    const allOutreach = db.prepare(`SELECT * FROM outreach_responses ORDER BY createdAt DESC`).all() as OutreachRow[];

    const inRange = filterByCreatedRange(
      allOutreach,
      startDate,
      endDate
    );

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
      threadsRows.length > 0 ? computeOutreachStatsByMonth(threadsRows as unknown as Record<string, unknown>[]) : {};

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
      /* no column/table */
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

    db.close();

    return NextResponse.json({
      period: { startDate, endDate },
      outreach: {
        profi: { stats: statsProfi, count: profiRows.length, byMonth: byMonthProfi },
        threads: { stats: statsThreads, count: threadsRows.length, byMonth: byMonthThreads },
        combined: { stats: statsCombined, count: combinedRows.length },
      },
      visits: {
        profi: visitsProfi,
        threads: visitsThreads,
      },
      leads: {
        newInPeriod: leadsTotal,
        paidInPeriod: leadsPaid,
      },
      recurring: {
        contactedInPeriod: recurringContacted,
        paidInPeriod: recurringPaid,
      },
      agency: {
        paidAmountSumInPeriod: agencyPaidSum,
      },
    });
  } catch (error) {
    console.error("sales-dashboard:", error);
    return NextResponse.json({ error: "Failed to build dashboard" }, { status: 500 });
  }
}
