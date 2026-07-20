import {
  leadSourceBucketKey,
  leadSourceLabel,
  V2_LEAD_STATUSES,
  type V2LeadRow,
  type V2LeadStatus,
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

export type LeadAllTimeSourceRow = LeadAnalyticsSourceSlice & {
  takenIntoWorkAmount: number;
  conversionRate: number;
  shareOfTaken: number;
  avgTakenCheck: number;
};

export type LeadAllTimeStatusRow = {
  key: V2LeadStatus;
  label: string;
  color: string;
  count: number;
  estimatedAmount: number;
};

export type LeadAllTimePayload = {
  totals: {
    leadsCount: number;
    estimatedAmount: number;
    takenIntoWorkCount: number;
    takenIntoWorkAmount: number;
    conversionRate: number;
    avgTakenCheck: number;
    lostCount: number;
    pauseCount: number;
    openPipelineCount: number;
    openPipelineAmount: number;
  };
  bySource: LeadAllTimeSourceRow[];
  byType: Record<V2LeadType, LeadAnalyticsSlice & { takenIntoWorkAmount: number; conversionRate: number }>;
  byStatus: LeadAllTimeStatusRow[];
  conversionSpeed: {
    sampleSize: number;
    avgDays: number;
    medianDays: number;
  } | null;
  /** Месячный ряд только по лидам (для динамики конверсии) */
  monthly: Pick<
    LeadAnalyticsMonthPoint,
    | "year"
    | "month"
    | "shortLabel"
    | "label"
    | "leadsCount"
    | "takenIntoWorkCount"
    | "conversionRate"
    | "takenIntoWorkAmount"
    | "estimatedAmount"
  >[];
  highlights: {
    bestConversionSource: LeadAllTimeSourceRow | null;
    topVolumeSource: LeadAllTimeSourceRow | null;
  };
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

function parseLocalDay(iso: string): Date | null {
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
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

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function lastNMonthKeys(n: number, from = new Date()): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

/** Месяцы от первого лида до текущего (не больше maxMonths последних). */
export function monthsSpanningLeads(
  leads: V2LeadRow[],
  opts?: { from?: Date; maxMonths?: number }
): { year: number; month: number }[] {
  const from = opts?.from ?? new Date();
  const maxMonths = opts?.maxMonths ?? 36;
  let earliest: { year: number; month: number } | null = null;
  for (const lead of leads) {
    const parsed = parseLocalMonth(lead.created_at);
    if (!parsed) continue;
    if (
      !earliest ||
      parsed.year < earliest.year ||
      (parsed.year === earliest.year && parsed.month < earliest.month)
    ) {
      earliest = parsed;
    }
  }
  if (!earliest) return lastNMonthKeys(Math.min(6, maxMonths), from);

  const out: { year: number; month: number }[] = [];
  let year = earliest.year;
  let month = earliest.month;
  const endYear = from.getFullYear();
  const endMonth = from.getMonth() + 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    out.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out.length > maxMonths ? out.slice(out.length - maxMonths) : out;
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

export function buildLeadAllTimeAnalytics(leads: V2LeadRow[]): LeadAllTimePayload {
  const totals = {
    leadsCount: 0,
    estimatedAmount: 0,
    takenIntoWorkCount: 0,
    takenIntoWorkAmount: 0,
    conversionRate: 0,
    avgTakenCheck: 0,
    lostCount: 0,
    pauseCount: 0,
    openPipelineCount: 0,
    openPipelineAmount: 0,
  };

  const byType: LeadAllTimePayload["byType"] = {
    agency: { ...emptySlice(), takenIntoWorkAmount: 0, conversionRate: 0 },
    course: { ...emptySlice(), takenIntoWorkAmount: 0, conversionRate: 0 },
  };

  const statusMap = new Map<V2LeadStatus, LeadAllTimeStatusRow>();
  for (const status of V2_LEAD_STATUSES) {
    statusMap.set(status.key, {
      key: status.key,
      label: status.label,
      color: status.dot,
      count: 0,
      estimatedAmount: 0,
    });
  }

  const sourceMap = new Map<string, LeadAnalyticsSourceSlice & { takenIntoWorkAmount: number }>();
  const convertDays: number[] = [];

  for (const lead of leads) {
    totals.leadsCount += 1;
    totals.estimatedAmount += lead.estimated_amount ?? 0;

    const typeRow = byType[lead.lead_type];
    addLeadToSlice(typeRow, lead);
    if (lead.taken_into_work_at) {
      totals.takenIntoWorkCount += 1;
      totals.takenIntoWorkAmount += lead.estimated_amount ?? 0;
      typeRow.takenIntoWorkAmount += lead.estimated_amount ?? 0;

      const created = parseLocalDay(lead.created_at);
      const taken = parseLocalDay(lead.taken_into_work_at);
      if (created && taken) {
        const days = Math.max(0, Math.round((taken.getTime() - created.getTime()) / 86400000));
        convertDays.push(days);
      }
    }

    if (lead.status === "lost") totals.lostCount += 1;
    if (lead.status === "pause") totals.pauseCount += 1;
    if (
      lead.status === "correspondence" ||
      lead.status === "thinking" ||
      lead.status === "awaiting_start"
    ) {
      totals.openPipelineCount += 1;
      totals.openPipelineAmount += lead.estimated_amount ?? 0;
    }

    const statusRow = statusMap.get(lead.status);
    if (statusRow) {
      statusRow.count += 1;
      statusRow.estimatedAmount += lead.estimated_amount ?? 0;
    }

    const bucket = leadSourceBucketKey(lead);
    let src = sourceMap.get(bucket);
    if (!src) {
      src = {
        key: bucket,
        label: leadSourceLabel(lead) ?? "Не указан",
        ...emptySlice(),
        takenIntoWorkAmount: 0,
      };
      sourceMap.set(bucket, src);
    }
    addLeadToSlice(src, lead);
    if (lead.taken_into_work_at) src.takenIntoWorkAmount += lead.estimated_amount ?? 0;
  }

  totals.conversionRate = conversionRate(totals.takenIntoWorkCount, totals.leadsCount);
  totals.avgTakenCheck =
    totals.takenIntoWorkCount > 0
      ? Math.round(totals.takenIntoWorkAmount / totals.takenIntoWorkCount)
      : 0;

  for (const key of Object.keys(byType) as V2LeadType[]) {
    const row = byType[key];
    row.conversionRate = conversionRate(row.takenIntoWorkCount, row.count);
  }

  const bySource: LeadAllTimeSourceRow[] = Array.from(sourceMap.values())
    .map((src) => ({
      ...src,
      conversionRate: conversionRate(src.takenIntoWorkCount, src.count),
      shareOfTaken:
        totals.takenIntoWorkCount > 0
          ? Math.round((src.takenIntoWorkCount / totals.takenIntoWorkCount) * 1000) / 10
          : 0,
      avgTakenCheck:
        src.takenIntoWorkCount > 0 ? Math.round(src.takenIntoWorkAmount / src.takenIntoWorkCount) : 0,
    }))
    .sort(
      (a, b) =>
        b.takenIntoWorkAmount - a.takenIntoWorkAmount ||
        b.count - a.count ||
        a.label.localeCompare(b.label, "ru")
    );

  const months = monthsSpanningLeads(leads, { maxMonths: 24 });
  const monthlyAnalytics = buildLeadAnalytics(leads, new Map(), months);

  const conversionSpeed =
    convertDays.length > 0
      ? {
          sampleSize: convertDays.length,
          avgDays: Math.round(convertDays.reduce((sum, n) => sum + n, 0) / convertDays.length),
          medianDays: Math.round(median(convertDays)),
        }
      : null;

  const eligibleSources = bySource.filter((s) => s.count >= 3);
  const bestConversionSource =
    eligibleSources.length > 0
      ? [...eligibleSources].sort(
          (a, b) => b.conversionRate - a.conversionRate || b.takenIntoWorkCount - a.takenIntoWorkCount
        )[0]!
      : (bySource.find((s) => s.takenIntoWorkCount > 0) ?? null);

  return {
    totals,
    bySource,
    byType,
    byStatus: V2_LEAD_STATUSES.map((s) => statusMap.get(s.key)!).filter(Boolean),
    conversionSpeed,
    monthly: monthlyAnalytics.series.map((row) => ({
      year: row.year,
      month: row.month,
      shortLabel: row.shortLabel,
      label: row.label,
      leadsCount: row.leadsCount,
      estimatedAmount: row.estimatedAmount,
      takenIntoWorkCount: row.takenIntoWorkCount,
      takenIntoWorkAmount: row.takenIntoWorkAmount,
      conversionRate: row.conversionRate,
    })),
    highlights: {
      bestConversionSource,
      topVolumeSource: bySource[0] ?? null,
    },
  };
}

export { monthKey as leadAnalyticsMonthKey };
