/** Помесячные средние курсы ЦБ — для пересчёта истории в USD. */

import { getV2Supabase, nowIso } from "@/lib/v2/db/client";

export type FxMonthlyRateRow = {
  year: number;
  month: number;
  currency_code: "USD";
  avg_rate_to_rub: number;
  sample_days: number;
  source: string;
  updated_at: string;
};

const CBR_USD_ID = "R01235";

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function parseCbrDecimal(raw: string): number {
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function cbrDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Дневные курсы USD из XML_dynamic ЦБ за диапазон дат. */
export async function fetchCbrUsdDailyRates(
  dateFrom: Date,
  dateTo: Date
): Promise<{ year: number; month: number; rate: number }[]> {
  const url =
    `https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${cbrDate(dateFrom)}` +
    `&date_req2=${cbrDate(dateTo)}&VAL_NM_RQ=${CBR_USD_ID}`;

  const res = await fetch(url, {
    headers: { Accept: "application/xml,text/xml" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CBR monthly fetch failed: ${res.status}`);

  const xml = await res.text();
  const out: { year: number; month: number; rate: number }[] = [];
  const recordRe =
    /<Record Date="(\d{2})\.(\d{2})\.(\d{4})"[\s\S]*?(?:<VunitRate>([\d,]+)<\/VunitRate>|<Value>([\d,]+)<\/Value>[\s\S]*?<Nominal>(\d+)<\/Nominal>)/g;

  let m: RegExpExecArray | null;
  while ((m = recordRe.exec(xml))) {
    const month = Number(m[2]);
    const year = Number(m[3]);
    let rate = NaN;
    if (m[4]) rate = parseCbrDecimal(m[4]!);
    else if (m[5] && m[6]) {
      const value = parseCbrDecimal(m[5]!);
      const nominal = Number(m[6]) || 1;
      rate = value / nominal;
    }
    if (!Number.isFinite(rate) || rate <= 0) continue;
    out.push({ year, month, rate });
  }

  if (!out.length) throw new Error("CBR returned no USD records for range");
  return out;
}

export function averageUsdRatesByMonth(
  daily: { year: number; month: number; rate: number }[]
): Map<string, { avg: number; days: number }> {
  const buckets = new Map<string, number[]>();
  for (const row of daily) {
    const key = monthKey(row.year, row.month);
    const arr = buckets.get(key) ?? [];
    arr.push(row.rate);
    buckets.set(key, arr);
  }
  const out = new Map<string, { avg: number; days: number }>();
  for (const [key, rates] of buckets) {
    const avg = rates.reduce((s, v) => s + v, 0) / rates.length;
    out.set(key, { avg, days: rates.length });
  }
  return out;
}

export async function syncUsdMonthlyRatesForYear(year: number): Promise<number> {
  const daily = await fetchCbrUsdDailyRates(new Date(year, 0, 1), new Date(year, 11, 31));
  const monthly = averageUsdRatesByMonth(daily);
  return upsertUsdMonthlyRates(monthly, year);
}

async function upsertUsdMonthlyRates(
  monthly: Map<string, { avg: number; days: number }>,
  filterYear?: number
): Promise<number> {
  const sb = getV2Supabase();
  const now = nowIso();
  let count = 0;

  for (const [key, { avg, days }] of monthly) {
    const [y, mo] = key.split("-").map(Number);
    if (filterYear != null && y !== filterYear) continue;
    const { error } = await sb.from("v2_fx_monthly_rates").upsert(
      {
        year: y,
        month: mo,
        currency_code: "USD",
        avg_rate_to_rub: Math.round(avg * 10000) / 10000,
        sample_days: days,
        source: "cbr",
        updated_at: now,
      },
      { onConflict: "year,month,currency_code" }
    );
    if (error) throw error;
    count += 1;
  }
  return count;
}

export async function listUsdMonthlyRates(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Promise<FxMonthlyRateRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_fx_monthly_rates")
    .select("*")
    .eq("currency_code", "USD")
    .gte("year", fromYear)
    .lte("year", toYear)
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .map((r) => ({
      year: Number(r.year),
      month: Number(r.month),
      currency_code: "USD" as const,
      avg_rate_to_rub: Number(r.avg_rate_to_rub) || 0,
      sample_days: Number(r.sample_days) || 0,
      source: String(r.source || "cbr"),
      updated_at: String(r.updated_at),
    }))
    .filter((r) => {
      if (r.year < fromYear || r.year > toYear) return false;
      if (r.year === fromYear && r.month < fromMonth) return false;
      if (r.year === toYear && r.month > toMonth) return false;
      return r.avg_rate_to_rub > 0;
    });
}

export async function ensureUsdMonthlyRatesForRange(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Promise<FxMonthlyRateRow[]> {
  let existing: FxMonthlyRateRow[] = [];
  try {
    existing = await listUsdMonthlyRates(fromYear, fromMonth, toYear, toMonth);
  } catch (e) {
    console.warn("ensureUsdMonthlyRatesForRange: table missing?", e);
    return [];
  }

  const have = new Set(existing.map((r) => monthKey(r.year, r.month)));
  const missingYears = new Set<number>();
  for (let y = fromYear; y <= toYear; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === fromYear && m < fromMonth) continue;
      if (y === toYear && m > toMonth) continue;
      if (!have.has(monthKey(y, m))) missingYears.add(y);
    }
  }

  for (const yr of [...missingYears].sort()) {
    try {
      await syncUsdMonthlyRatesForYear(yr);
    } catch (e) {
      console.error(`syncUsdMonthlyRatesForYear(${yr}):`, e);
    }
  }

  try {
    return await listUsdMonthlyRates(fromYear, fromMonth, toYear, toMonth);
  } catch {
    return existing;
  }
}

export function fxMonthlyRatesToMap(rows: FxMonthlyRateRow[]): Map<string, number> {
  return new Map(rows.map((r) => [monthKey(r.year, r.month), r.avg_rate_to_rub]));
}

export function rubToUsd(rub: number, rate: number | undefined): number | null {
  if (!rate || rate <= 0) return null;
  return rub / rate;
}

export function incomeHistoryMonthSpan(rows: { year: number; month: number }[]): {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
} | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => a.year - b.year || a.month - b.month);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return {
    fromYear: first.year,
    fromMonth: first.month,
    toYear: last.year,
    toMonth: last.month,
  };
}
