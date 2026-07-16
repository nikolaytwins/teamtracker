import {
  leadSourceBucketKey,
  leadSourceLabel,
  type V2LeadRow,
  type V2LeadType,
} from "@/lib/v2/leads/lead-types";
import type { V2FinanceMonthSummary } from "@/lib/v2/finance/types";
import { FINANCE_MONTH_NAMES } from "@/lib/v2/finance/meta";

export type LeadAnalyticsSlice = {
  count: number;
  estimatedAmount: number;
  takenIntoWorkCount: number;
};

export type LeadAnalyticsSourceSlice = LeadAnalyticsSlice & {
  key: string;
  label: string;
};

/** Одна точка ряда — месяц. Финансы совпадают с дашбордом «Проекты и финансы». */
export type LeadAnalyticsMonthPoint = {
  year: number;
  month: number;
  /** Короткий ярлык: «июл» */
  shortLabel: string;
  /** Полный: «Июль 2026» */
  label: string;
  leadsCount: number;
  estimatedAmount: number;
  takenIntoWorkCount: number;
  /** Сумма ориентиров у лидов с «взяли в работу» — «закрыто продаж» */
  takenIntoWorkAmount: number;
  conversionRate: number;
  byType: Record<V2LeadType, LeadAnalyticsSlice>;
  bySource: LeadAnalyticsSourceSlice[];
  /** Фактические деньги из «Проекты и финансы» за тот же календарный месяц */
  finance: {
    projectCount: number;
    actualRevenue: number;
    profit: number;
  };
};

export type LeadAnalyticsPayload = {
  /** Хронологически: старые → новые (для графиков) */
  series: LeadAnalyticsMonthPoint[];
};

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Локальный календарный месяц — как isInFinanceMonth. */
function parseLocalMonth(iso: string): { year: number; month: number } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthLabel(year: number, month: number) {
  return `${FINANCE_MONTH_NAMES[month - 1] ?? month} ${year}`;
}

function shortMonthLabel(month: number) {
  const full = FINANCE_MONTH_NAMES[month - 1] ?? "";
  return full.slice(0, 3).toLowerCase();
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

export function lastNMonthKeys(n: number, from = new Date()): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

export function buildLeadAnalytics(
  leads: V2LeadRow[],
  financeByMonth: Map<string, V2FinanceMonthSummary>,
  months: { year: number; month: number }[]
): LeadAnalyticsPayload {
  const series: LeadAnalyticsMonthPoint[] = months.map(({ year, month }) => {
    const key = monthKey(year, month);
    const fin = financeByMonth.get(key);
    return {
      year,
      month,
      shortLabel: shortMonthLabel(month),
      label: monthLabel(year, month),
      leadsCount: 0,
      estimatedAmount: 0,
      takenIntoWorkCount: 0,
      takenIntoWorkAmount: 0,
      conversionRate: 0,
      byType: { agency: emptySlice(), course: emptySlice() },
      bySource: [],
      finance: {
        projectCount: fin?.projectCount ?? 0,
        actualRevenue: fin?.actualRevenue ?? 0,
        profit: fin?.profit ?? 0,
      },
    };
  });

  const byKey = new Map(series.map((row) => [monthKey(row.year, row.month), row]));
  const sourceMaps = new Map<string, Map<string, LeadAnalyticsSourceSlice>>();

  for (const lead of leads) {
    const parsed = parseLocalMonth(lead.created_at);
    if (!parsed) continue;
    const key = monthKey(parsed.year, parsed.month);
    const row = byKey.get(key);
    if (!row) continue;

    row.leadsCount += 1;
    row.estimatedAmount += lead.estimated_amount ?? 0;
    if (lead.taken_into_work_at) {
      row.takenIntoWorkCount += 1;
      row.takenIntoWorkAmount += lead.estimated_amount ?? 0;
    }
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

  for (const row of series) {
    const key = monthKey(row.year, row.month);
    row.conversionRate = conversionRate(row.takenIntoWorkCount, row.leadsCount);
    const srcMap = sourceMaps.get(key);
    row.bySource = srcMap
      ? Array.from(srcMap.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ru"))
      : [];
  }

  return { series };
}

export { monthKey as leadAnalyticsMonthKey };
