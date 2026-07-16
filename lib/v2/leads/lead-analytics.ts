import {
  leadSourceBucketKey,
  leadSourceLabel,
  type V2LeadRow,
  type V2LeadType,
} from "@/lib/v2/leads/lead-types";
import type { V2FinanceMonthSummary } from "@/lib/v2/finance/types";

export type LeadAnalyticsSlice = {
  count: number;
  estimatedAmount: number;
  takenIntoWorkCount: number;
};

export type LeadAnalyticsSourceSlice = LeadAnalyticsSlice & {
  key: string;
  label: string;
};

export type LeadAnalyticsMonth = {
  year: number;
  month: number;
  label: string;
  leadsCount: number;
  estimatedAmount: number;
  takenIntoWorkCount: number;
  conversionRate: number;
  byType: Record<V2LeadType, LeadAnalyticsSlice>;
  bySource: LeadAnalyticsSourceSlice[];
  finance: {
    projectCount: number;
    /** Полная сумма проектов месяца (ожидаемая выручка) */
    closedSalesAmount: number;
    /** Фактически оплачено */
    actualRevenue: number;
    profit: number;
  } | null;
};

export type LeadAnalyticsPayload = {
  months: LeadAnalyticsMonth[];
  totals: {
    leadsCount: number;
    estimatedAmount: number;
    takenIntoWorkCount: number;
    conversionRate: number;
    closedSalesAmount: number;
    actualRevenue: number;
    profit: number;
  };
};

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseLeadMonth(iso: string): { year: number; month: number } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

function emptySlice(): LeadAnalyticsSlice {
  return { count: 0, estimatedAmount: 0, takenIntoWorkCount: 0 };
}

function addLeadToSlice(slice: LeadAnalyticsSlice, lead: V2LeadRow) {
  slice.count += 1;
  slice.estimatedAmount += lead.estimated_amount ?? 0;
  if (lead.taken_into_work_at) slice.takenIntoWorkCount += 1;
}

function conversionRate(taken: number, total: number) {
  return total > 0 ? Math.round((taken / total) * 1000) / 10 : 0;
}

/** Собирает помесячную аналитику лидов и склеивает с финансами за те же месяцы. */
export function buildLeadAnalytics(
  leads: V2LeadRow[],
  financeByMonth: Map<string, V2FinanceMonthSummary>
): LeadAnalyticsPayload {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  let startYear = endYear;
  let startMonth = endMonth;
  // По умолчанию — 12 месяцев назад
  startMonth -= 11;
  while (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  for (const lead of leads) {
    const m = parseLeadMonth(lead.created_at);
    if (!m) continue;
    const leadKey = m.year * 12 + m.month;
    const startKey = startYear * 12 + startMonth;
    if (leadKey < startKey) {
      startYear = m.year;
      startMonth = m.month;
    }
  }

  const months: LeadAnalyticsMonth[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({
      year: y,
      month: m,
      label: monthLabel(y, m),
      leadsCount: 0,
      estimatedAmount: 0,
      takenIntoWorkCount: 0,
      conversionRate: 0,
      byType: {
        agency: emptySlice(),
        course: emptySlice(),
      },
      bySource: [],
      finance: null,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  const byKey = new Map(months.map((row) => [monthKey(row.year, row.month), row]));
  const sourceMaps = new Map<string, Map<string, LeadAnalyticsSourceSlice>>();

  for (const lead of leads) {
    const parsed = parseLeadMonth(lead.created_at);
    if (!parsed) continue;
    const key = monthKey(parsed.year, parsed.month);
    const row = byKey.get(key);
    if (!row) continue;

    row.leadsCount += 1;
    row.estimatedAmount += lead.estimated_amount ?? 0;
    if (lead.taken_into_work_at) row.takenIntoWorkCount += 1;
    addLeadToSlice(row.byType[lead.lead_type], lead);

    let srcMap = sourceMaps.get(key);
    if (!srcMap) {
      srcMap = new Map();
      sourceMaps.set(key, srcMap);
    }
    const bucket = leadSourceBucketKey(lead);
    let src = srcMap.get(bucket);
    if (!src) {
      src = {
        key: bucket,
        label: leadSourceLabel(lead) ?? "Не указан",
        ...emptySlice(),
      };
      srcMap.set(bucket, src);
    }
    addLeadToSlice(src, lead);
  }

  for (const row of months) {
    const key = monthKey(row.year, row.month);
    row.conversionRate = conversionRate(row.takenIntoWorkCount, row.leadsCount);
    const srcMap = sourceMaps.get(key);
    row.bySource = srcMap
      ? Array.from(srcMap.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ru"))
      : [];
    const fin = financeByMonth.get(key);
    if (fin) {
      row.finance = {
        projectCount: fin.projectCount,
        closedSalesAmount: fin.expectedRevenue,
        actualRevenue: fin.actualRevenue,
        profit: fin.profit,
      };
    }
  }

  const totals = months.reduce(
    (acc, row) => {
      acc.leadsCount += row.leadsCount;
      acc.estimatedAmount += row.estimatedAmount;
      acc.takenIntoWorkCount += row.takenIntoWorkCount;
      acc.closedSalesAmount += row.finance?.closedSalesAmount ?? 0;
      acc.actualRevenue += row.finance?.actualRevenue ?? 0;
      acc.profit += row.finance?.profit ?? 0;
      return acc;
    },
    {
      leadsCount: 0,
      estimatedAmount: 0,
      takenIntoWorkCount: 0,
      conversionRate: 0,
      closedSalesAmount: 0,
      actualRevenue: 0,
      profit: 0,
    }
  );
  totals.conversionRate = conversionRate(totals.takenIntoWorkCount, totals.leadsCount);

  return { months: months.reverse(), totals };
}

export function collectMonthKeysFromLeads(leads: V2LeadRow[], monthsBack = 12): { year: number; month: number }[] {
  const now = new Date();
  const set = new Set<string>();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    set.add(monthKey(d.getFullYear(), d.getMonth() + 1));
  }
  for (const lead of leads) {
    const m = parseLeadMonth(lead.created_at);
    if (m) set.add(monthKey(m.year, m.month));
  }
  return Array.from(set)
    .map((k) => {
      const [ys, ms] = k.split("-");
      return { year: Number(ys), month: Number(ms) };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

export { monthKey as leadAnalyticsMonthKey };
