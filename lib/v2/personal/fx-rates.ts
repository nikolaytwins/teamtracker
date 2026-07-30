/** Курсы валют ЦБ РФ → ₽. Источник: официальный JSON-зеркало ЦБ. */

import { getV2Supabase, nowIso } from "@/lib/v2/db/client";

export type PersonalFxCurrency = "USD" | "AED" | "GEL" | "EUR" | "GBP" | "CNY";
export type PersonalAccountCurrency = "RUB" | PersonalFxCurrency;

export type FxRateRow = {
  currency_code: PersonalFxCurrency;
  rate_to_rub: number;
  as_of_date: string;
  source: string;
  updated_at: string;
};

export const FX_CURRENCY_META: Record<
  PersonalFxCurrency,
  { label: string; short: string; symbol: string }
> = {
  USD: { label: "Доллар США", short: "USD", symbol: "$" },
  AED: { label: "Дирхам ОАЭ", short: "AED", symbol: "د.إ" },
  GEL: { label: "Лари", short: "GEL", symbol: "₾" },
  EUR: { label: "Евро", short: "EUR", symbol: "€" },
  GBP: { label: "Фунт", short: "GBP", symbol: "£" },
  CNY: { label: "Юань", short: "CNY", symbol: "¥" },
};

const TRACKED_CODES: PersonalFxCurrency[] = ["USD", "AED", "GEL", "EUR", "GBP", "CNY"];

const CBR_JSON_URL = "https://www.cbr-xml-daily.ru/daily_json.js";

export function isPersonalFxCurrency(value: unknown): value is PersonalFxCurrency {
  return typeof value === "string" && value in FX_CURRENCY_META;
}

export function isPersonalAccountCurrency(value: unknown): value is PersonalAccountCurrency {
  return value === "RUB" || isPersonalFxCurrency(value);
}

export function roundMoney(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round((Number(n) || 0) * f) / f;
}

export function rubFromNative(native: number, rateToRub: number): number {
  return Math.round(roundMoney(native) * rateToRub);
}

type CbrValute = {
  CharCode?: string;
  Nominal?: number;
  Value?: number;
};

type CbrPayload = {
  Date?: string;
  Valute?: Record<string, CbrValute>;
};

function parseCbrAsOf(raw: string | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  // "2026-07-29T11:30:00+03:00" или "29.07.2026"
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return new Date().toISOString().slice(0, 10);
}

/** Сколько ₽ за 1 единицу валюты. */
function rateFromValute(v: CbrValute | undefined): number | null {
  if (!v || v.Value == null || !v.Nominal) return null;
  const rate = Number(v.Value) / Number(v.Nominal);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function fetchCbrRates(): Promise<
  { currency_code: PersonalFxCurrency; rate_to_rub: number; as_of_date: string }[]
> {
  const res = await fetch(CBR_JSON_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CBR fetch failed: ${res.status}`);
  const data = (await res.json()) as CbrPayload;
  const asOf = parseCbrAsOf(data.Date);
  const valute = data.Valute ?? {};
  const out: { currency_code: PersonalFxCurrency; rate_to_rub: number; as_of_date: string }[] = [];

  for (const code of TRACKED_CODES) {
    const rate = rateFromValute(valute[code]);
    if (rate == null) continue;
    out.push({ currency_code: code, rate_to_rub: rate, as_of_date: asOf });
  }

  if (!out.length) throw new Error("CBR returned no tracked rates");
  return out;
}

export async function listFxRates(): Promise<FxRateRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_fx_rates").select("*").order("currency_code");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    currency_code: String(r.currency_code) as PersonalFxCurrency,
    rate_to_rub: Number(r.rate_to_rub) || 0,
    as_of_date: String(r.as_of_date).slice(0, 10),
    source: String(r.source || "cbr"),
    updated_at: String(r.updated_at),
  }));
}

export async function getFxRateMap(): Promise<Map<PersonalFxCurrency, number>> {
  const rows = await listFxRates();
  return new Map(rows.map((r) => [r.currency_code, r.rate_to_rub]));
}

/** Обновить курсы из ЦБ и пересчитать balance_rub у валютных счетов. */
export async function syncFxRatesFromCbr(opts?: {
  force?: boolean;
}): Promise<{ refreshed: boolean; rates: FxRateRow[]; revalued: number }> {
  const sb = getV2Supabase();
  const existing = await listFxRates();
  const today = new Date().toISOString().slice(0, 10);
  const allFresh =
    TRACKED_CODES.every((code) => existing.some((r) => r.currency_code === code && r.as_of_date === today)) &&
    existing.length > 0;

  if (allFresh && !opts?.force) {
    return { refreshed: false, rates: existing, revalued: 0 };
  }

  const fetched = await fetchCbrRates();
  const now = nowIso();
  for (const row of fetched) {
    const { error } = await sb.from("v2_fx_rates").upsert(
      {
        currency_code: row.currency_code,
        rate_to_rub: row.rate_to_rub,
        as_of_date: row.as_of_date,
        source: "cbr",
        updated_at: now,
      },
      { onConflict: "currency_code" }
    );
    if (error) throw error;
  }

  const rateMap = new Map(fetched.map((r) => [r.currency_code, r.rate_to_rub]));
  const revalued = await revalueFxAccountBalances(rateMap);
  const rates = await listFxRates();
  return { refreshed: true, rates, revalued };
}

/** Пересчитать balance_rub = balance_native × курс для всех нерублёвых счетов. */
export async function revalueFxAccountBalances(
  rateMap?: Map<PersonalFxCurrency, number>
): Promise<number> {
  const sb = getV2Supabase();
  const rates = rateMap ?? (await getFxRateMap());
  if (!rates.size) return 0;

  const { data, error } = await sb
    .from("v2_personal_accounts")
    .select("id, currency_code, balance_native, balance_rub")
    .neq("currency_code", "RUB");
  if (error) throw error;

  let updated = 0;
  const now = nowIso();
  for (const row of data ?? []) {
    const code = String(row.currency_code);
    if (!isPersonalFxCurrency(code)) continue;
    const rate = rates.get(code);
    if (rate == null || rate <= 0) continue;
    const native = Number(row.balance_native) || 0;
    const nextRub = rubFromNative(native, rate);
    if (nextRub === Math.round(Number(row.balance_rub) || 0)) continue;
    const { error: updErr } = await sb
      .from("v2_personal_accounts")
      .update({ balance_rub: nextRub, updated_at: now })
      .eq("id", row.id);
    if (updErr) throw updErr;
    updated += 1;
  }
  return updated;
}

/** Убедиться, что курсы за сегодня есть (ленивый суточный refresh). */
export async function ensureFxRatesFresh(): Promise<FxRateRow[]> {
  try {
    const { rates } = await syncFxRatesFromCbr();
    return rates;
  } catch (e) {
    console.error("ensureFxRatesFresh:", e);
    return listFxRates().catch(() => []);
  }
}
