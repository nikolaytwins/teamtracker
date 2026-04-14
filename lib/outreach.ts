import type Database from "better-sqlite3";
import { getISOWeekInfo } from "@/lib/iso-week";

export type OutreachPlatform = "profi" | "threads";

/** Строка в outreach_responses */
export type OutreachRow = {
  id: string;
  platform: OutreachPlatform;
  createdAt: string;
  cost: number;
  refundAmount: number;
  status: string;
  projectAmount: number | null;
  notes: string | null;
  updatedAt: string;
};

export function ensureOutreachTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_responses (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL DEFAULT 'profi',
      createdAt TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      refundAmount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'response',
      projectAmount REAL,
      notes TEXT,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outreach_platform ON outreach_responses(platform);
    CREATE INDEX IF NOT EXISTS idx_outreach_created ON outreach_responses(createdAt);
  `);

  try {
    const profiExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='profi_responses'")
      .get();
    if (profiExists) {
      db.prepare(`
        INSERT OR IGNORE INTO outreach_responses (id, platform, createdAt, cost, refundAmount, status, projectAmount, notes, updatedAt)
        SELECT id, 'profi', createdAt, cost, refundAmount, status, projectAmount, notes, updatedAt
        FROM profi_responses
      `).run();
    }
  } catch (e) {
    console.error("outreach migrate from profi_responses:", e);
  }
}

export function computeOutreachStats(
  itemsWithReminder: Array<Record<string, unknown> & { status?: string; cost?: number; refundAmount?: number; projectAmount?: number | null }>
) {
  if (itemsWithReminder.length === 0) return null;

  const items = itemsWithReminder;
  const totalPaid = items.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const totalRefunded = items.reduce((s, r) => s + (Number(r.refundAmount) || 0), 0);
  const netSpent = totalPaid - totalRefunded;
  const countResponse = items.filter((r) => r.status === "response").length;
  const countConversation = items.filter((r) => r.status === "conversation").length;
  const countProposal = items.filter((r) => r.status === "proposal").length;
  const countPaid = items.filter((r) => r.status === "paid").length;
  const countRefunded = items.filter((r) => r.status === "refunded").length;
  const countDrain = items.filter((r) => r.status === "drain").length;
  const totalProjectAmount = items
    .filter((r) => r.status === "paid" && r.projectAmount != null)
    .reduce((s, r) => s + (Number(r.projectAmount) || 0), 0);

  const totalResponses = items.length;
  const viewedResponses = totalResponses - countRefunded;
  const toConversation = countConversation + countProposal + countPaid;
  const toProposal = countProposal + countPaid;
  const convRate = totalResponses > 0 ? (toConversation / totalResponses) * 100 : 0;
  const proposalRate = toConversation > 0 ? (toProposal / toConversation) * 100 : 0;
  const paidRate = toProposal > 0 ? (countPaid / toProposal) * 100 : 0;
  const responseToPaidRate = totalResponses > 0 ? (countPaid / totalResponses) * 100 : 0;
  const costPerPayingClient = countPaid > 0 ? netSpent / countPaid : null;
  const avgCheckPaying = countPaid > 0 ? totalProjectAmount / countPaid : null;

  return {
    totalPaid,
    totalRefunded,
    netSpent,
    totalResponses,
    countResponse,
    countConversation,
    countProposal,
    countPaid,
    countRefunded,
    countDrain,
    totalProjectAmount,
    roi: netSpent > 0 ? ((totalProjectAmount - netSpent) / netSpent) * 100 : 0,
    costPerPayingClient,
    avgCheckPaying,
    responseToPaidRate: Math.round(responseToPaidRate * 10) / 10,
    funnel: {
      responses: totalResponses,
      viewedResponses,
      toConversation,
      toProposal,
      toPaid: countPaid,
      convRate: Math.round(convRate * 10) / 10,
      proposalRate: Math.round(proposalRate * 10) / 10,
      paidRate: Math.round(paidRate * 10) / 10,
    },
  };
}

/** Статистика по месяцам (ключ YYYY-MM), месяцы от новых к старым. */
export function computeOutreachStatsByMonth(
  itemsWithReminder: Array<Record<string, unknown> & { createdAt?: string }>
) {
  const groups = new Map<string, Array<Record<string, unknown>>>();
  for (const item of itemsWithReminder) {
    const created = item.createdAt as string | undefined;
    if (!created || created.length < 7) continue;
    const ym = created.slice(0, 7);
    if (!groups.has(ym)) groups.set(ym, []);
    groups.get(ym)!.push(item);
  }
  const keys = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  const byMonth: Record<string, NonNullable<ReturnType<typeof computeOutreachStats>>> = {};
  for (const ym of keys) {
    const list = groups.get(ym)!;
    const s = computeOutreachStats(list);
    if (s) byMonth[ym] = s;
  }
  return byMonth;
}

/** Месяцы (YYYY-MM) + внутри каждого месяца — статистика по ISO-неделям. */
export function computeOutreachByMonthWithWeeks(
  itemsWithReminder: Array<Record<string, unknown> & { createdAt?: string }>
): {
  byMonth: Record<string, NonNullable<ReturnType<typeof computeOutreachStats>>>;
  byMonthWeeks: Record<string, Record<string, NonNullable<ReturnType<typeof computeOutreachStats>>>>;
} {
  const byMonth = computeOutreachStatsByMonth(itemsWithReminder);
  const byMonthWeeks: Record<string, Record<string, NonNullable<ReturnType<typeof computeOutreachStats>>>> = {};
  const groups = new Map<string, Array<Record<string, unknown>>>();
  for (const item of itemsWithReminder) {
    const created = item.createdAt as string | undefined;
    if (!created || created.length < 7) continue;
    const ym = created.slice(0, 7);
    if (!groups.has(ym)) groups.set(ym, []);
    groups.get(ym)!.push(item);
  }
  for (const [ym, list] of groups) {
    const weekMap = new Map<string, Array<Record<string, unknown>>>();
    for (const item of list) {
      const raw = item.createdAt as string | undefined;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const { isoYear, week } = getISOWeekInfo(d);
      const wk = `${isoYear}-W${String(week).padStart(2, "0")}`;
      if (!weekMap.has(wk)) weekMap.set(wk, []);
      weekMap.get(wk)!.push(item);
    }
    const inner: Record<string, NonNullable<ReturnType<typeof computeOutreachStats>>> = {};
    const wkeys = [...weekMap.keys()].sort((a, b) => a.localeCompare(b));
    for (const wk of wkeys) {
      const s = computeOutreachStats(weekMap.get(wk)!);
      if (s) inner[wk] = s;
    }
    byMonthWeeks[ym] = inner;
  }
  return { byMonth, byMonthWeeks };
}
