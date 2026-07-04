import { getV2Supabase, nowIso } from "@/lib/v2/db/client";
import type { PersonalIncomeHistoryRow } from "@/lib/v2/personal/types";
import type { V2SessionContext } from "@/lib/v2/types";

export class PersonalIncomeHistoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalIncomeHistoryValidationError";
  }
}

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function mapRow(r: Record<string, unknown>): PersonalIncomeHistoryRow {
  return {
    user_id: String(r.user_id),
    year: Number(r.year),
    month: Number(r.month),
    accounts_total_rub: Number(r.accounts_total_rub) || 0,
    earned_rub: r.earned_rub == null ? null : Number(r.earned_rub),
    profit_rub: r.profit_rub == null ? null : Number(r.profit_rub),
    spent_rub: r.spent_rub == null ? null : Number(r.spent_rub),
  };
}

/** Данные из Sophia: earned = общая выручка, profit = прибыль, spent не в архиве. */
const SEED_ROWS: Omit<PersonalIncomeHistoryRow, "user_id">[] = [
  // 2026
  { year: 2026, month: 7, accounts_total_rub: 326_123, earned_rub: 0, profit_rub: null, spent_rub: 0 },
  { year: 2026, month: 6, accounts_total_rub: 543_273, earned_rub: 403_744, profit_rub: 19_284, spent_rub: 0 },
  { year: 2026, month: 5, accounts_total_rub: 291_123, earned_rub: 92_000, profit_rub: 49_624, spent_rub: 0 },
  { year: 2026, month: 4, accounts_total_rub: 578_000, earned_rub: 448_550, profit_rub: 356_234, spent_rub: null },
  { year: 2026, month: 3, accounts_total_rub: 372_572, earned_rub: 465_500, profit_rub: 174_109, spent_rub: null },
  { year: 2026, month: 2, accounts_total_rub: 427_532, earned_rub: 493_700, profit_rub: 211_352, spent_rub: null },
  { year: 2026, month: 1, accounts_total_rub: 423_088, earned_rub: 432_700, profit_rub: 157_867, spent_rub: null },
  // 2025
  { year: 2025, month: 12, accounts_total_rub: 552_653, earned_rub: 752_900, profit_rub: 422_616, spent_rub: null },
  { year: 2025, month: 11, accounts_total_rub: 440_000, earned_rub: 440_660, profit_rub: 175_790, spent_rub: null },
  { year: 2025, month: 10, accounts_total_rub: 490_000, earned_rub: 485_700, profit_rub: 209_000, spent_rub: null },
  { year: 2025, month: 9, accounts_total_rub: 537_000, earned_rub: 626_900, profit_rub: 287_277, spent_rub: null },
  { year: 2025, month: 8, accounts_total_rub: 514_378, earned_rub: 471_000, profit_rub: 205_740, spent_rub: null },
  { year: 2025, month: 7, accounts_total_rub: 535_378, earned_rub: 469_000, profit_rub: 241_240, spent_rub: null },
  { year: 2025, month: 6, accounts_total_rub: 774_838, earned_rub: 551_000, profit_rub: 297_270, spent_rub: null },
  { year: 2025, month: 5, accounts_total_rub: 798_442, earned_rub: 395_870, profit_rub: 88_810, spent_rub: null },
  { year: 2025, month: 4, accounts_total_rub: 953_771, earned_rub: 632_000, profit_rub: 420_772, spent_rub: null },
  { year: 2025, month: 3, accounts_total_rub: 721_619, earned_rub: 336_850, profit_rub: 168_500, spent_rub: null },
  { year: 2025, month: 2, accounts_total_rub: 824_000, earned_rub: 575_450, profit_rub: 408_450, spent_rub: null },
  { year: 2025, month: 1, accounts_total_rub: 680_006, earned_rub: 382_200, profit_rub: 267_000, spent_rub: null },
  // 2024
  { year: 2024, month: 12, accounts_total_rub: 716_406, earned_rub: 516_000, profit_rub: 364_000, spent_rub: null },
  { year: 2024, month: 11, accounts_total_rub: 579_741, earned_rub: 596_950, profit_rub: 394_238, spent_rub: null },
  { year: 2024, month: 10, accounts_total_rub: 421_766, earned_rub: 494_587, profit_rub: 311_052, spent_rub: null },
  { year: 2024, month: 9, accounts_total_rub: 355_359, earned_rub: 464_800, profit_rub: 265_873, spent_rub: null },
  { year: 2024, month: 8, accounts_total_rub: 328_488, earned_rub: 420_050, profit_rub: 151_690, spent_rub: null },
  { year: 2024, month: 7, accounts_total_rub: 410_032, earned_rub: 484_727, profit_rub: 266_827, spent_rub: null },
  { year: 2024, month: 6, accounts_total_rub: 405_000, earned_rub: 523_250, profit_rub: 275_592, spent_rub: null },
  { year: 2024, month: 5, accounts_total_rub: 447_000, earned_rub: 385_700, profit_rub: 250_000, spent_rub: null },
  { year: 2024, month: 4, accounts_total_rub: 528_888, earned_rub: 508_175, profit_rub: 365_000, spent_rub: null },
  { year: 2024, month: 3, accounts_total_rub: 476_000, earned_rub: 304_933, profit_rub: 132_000, spent_rub: null },
  { year: 2024, month: 2, accounts_total_rub: 743_445, earned_rub: 557_000, profit_rub: 398_000, spent_rub: null },
  { year: 2024, month: 1, accounts_total_rub: 517_034, earned_rub: 243_000, profit_rub: 155_250, spent_rub: null },
];

const HISTORICAL_SEED = SEED_ROWS.filter((r) => r.year <= 2025);
const SEED_2026_JAN_APR = SEED_ROWS.filter((r) => r.year === 2026 && r.month <= 4);

async function seedIfEmpty(userId: string) {
  const sb = getV2Supabase();
  const { count, error: countErr } = await sb
    .from("v2_personal_income_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return;

  const ts = nowIso();
  const rows = SEED_ROWS.map((r) => ({
    user_id: userId,
    ...r,
    created_at: ts,
    updated_at: ts,
  }));
  const { error } = await sb.from("v2_personal_income_history").insert(rows);
  if (error) throw error;
}

/** Дозаполняет 2024–2025: новые месяцы + строки без дохода/прибыли (старый частичный seed). */
async function syncHistoricalSeed(userId: string) {
  const sb = getV2Supabase();
  const ts = nowIso();

  for (const seed of HISTORICAL_SEED) {
    const { data: existing } = await sb
      .from("v2_personal_income_history")
      .select("*")
      .eq("user_id", userId)
      .eq("year", seed.year)
      .eq("month", seed.month)
      .maybeSingle();

    if (!existing) {
      await sb.from("v2_personal_income_history").insert({
        user_id: userId,
        ...seed,
        created_at: ts,
        updated_at: ts,
      });
      continue;
    }

    const earnedMissing = existing.earned_rub == null && seed.earned_rub != null;
    const profitMissing = existing.profit_rub == null && seed.profit_rub != null;
    if (!earnedMissing && !profitMissing) continue;

    await sb
      .from("v2_personal_income_history")
      .update({
        accounts_total_rub: seed.accounts_total_rub,
        earned_rub: seed.earned_rub,
        profit_rub: seed.profit_rub,
        spent_rub: seed.spent_rub,
        updated_at: ts,
      })
      .eq("user_id", userId)
      .eq("year", seed.year)
      .eq("month", seed.month);
  }
}

/** Актуализирует январь–апрель 2026 (один раз, пока апрель ещё со старыми данными). */
async function sync2026JanAprSeed(userId: string) {
  const sb = getV2Supabase();
  const { data: apr } = await sb
    .from("v2_personal_income_history")
    .select("accounts_total_rub")
    .eq("user_id", userId)
    .eq("year", 2026)
    .eq("month", 4)
    .maybeSingle();

  if (apr && Number(apr.accounts_total_rub) === 578_000) return;

  const ts = nowIso();
  for (const seed of SEED_2026_JAN_APR) {
    const { data: existing } = await sb
      .from("v2_personal_income_history")
      .select("user_id")
      .eq("user_id", userId)
      .eq("year", seed.year)
      .eq("month", seed.month)
      .maybeSingle();

    if (!existing) {
      await sb.from("v2_personal_income_history").insert({
        user_id: userId,
        ...seed,
        created_at: ts,
        updated_at: ts,
      });
      continue;
    }

    await sb
      .from("v2_personal_income_history")
      .update({
        accounts_total_rub: seed.accounts_total_rub,
        earned_rub: seed.earned_rub,
        profit_rub: seed.profit_rub,
        spent_rub: seed.spent_rub,
        updated_at: ts,
      })
      .eq("user_id", userId)
      .eq("year", seed.year)
      .eq("month", seed.month);
  }
}

export async function listPersonalIncomeHistory(ctx: V2SessionContext): Promise<PersonalIncomeHistoryRow[]> {
  const userId = uid(ctx);
  await seedIfEmpty(userId);
  await syncHistoricalSeed(userId);
  await sync2026JanAprSeed(userId);

  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_income_history")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

function parseOptionalAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new PersonalIncomeHistoryValidationError("Некорректная сумма");
  return n;
}

function parseRequiredAmount(v: unknown, field: string): number {
  if (v === null || v === undefined || v === "") {
    throw new PersonalIncomeHistoryValidationError(`${field} обязательно`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new PersonalIncomeHistoryValidationError("Некорректная сумма");
  return n;
}

function validateMonth(year: unknown, month: unknown) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new PersonalIncomeHistoryValidationError("Некорректный год");
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new PersonalIncomeHistoryValidationError("Некорректный месяц");
  }
  return { year: y, month: m };
}

export async function createPersonalIncomeHistoryMonth(
  ctx: V2SessionContext,
  input: {
    year: number;
    month: number;
    accounts_total_rub?: number;
    earned_rub?: number | null;
    profit_rub?: number | null;
    spent_rub?: number | null;
  }
): Promise<PersonalIncomeHistoryRow> {
  const { year, month } = validateMonth(input.year, input.month);
  const userId = uid(ctx);
  const sb = getV2Supabase();

  const { data: existing } = await sb
    .from("v2_personal_income_history")
    .select("user_id")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  if (existing) {
    throw new PersonalIncomeHistoryValidationError("Этот месяц уже есть в истории");
  }

  const row = {
    user_id: userId,
    year,
    month,
    accounts_total_rub: input.accounts_total_rub ?? 0,
    earned_rub: input.earned_rub ?? null,
    profit_rub: input.profit_rub ?? null,
    spent_rub: input.spent_rub ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const { error } = await sb.from("v2_personal_income_history").insert(row);
  if (error) throw error;
  return mapRow(row);
}

export async function updatePersonalIncomeHistoryMonth(
  ctx: V2SessionContext,
  year: number,
  month: number,
  patch: Partial<{
    accounts_total_rub: number;
    earned_rub: number | null;
    profit_rub: number | null;
    spent_rub: number | null;
  }>
): Promise<PersonalIncomeHistoryRow | null> {
  validateMonth(year, month);
  const userId = uid(ctx);
  const sb = getV2Supabase();

  const update: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.accounts_total_rub !== undefined) {
    update.accounts_total_rub = parseRequiredAmount(patch.accounts_total_rub, "Сумма на счетах");
  }
  if (patch.earned_rub !== undefined) update.earned_rub = parseOptionalAmount(patch.earned_rub);
  if (patch.profit_rub !== undefined) update.profit_rub = parseOptionalAmount(patch.profit_rub);
  if (patch.spent_rub !== undefined) update.spent_rub = parseOptionalAmount(patch.spent_rub);

  const { error } = await sb
    .from("v2_personal_income_history")
    .update(update)
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month);
  if (error) throw error;

  const { data } = await sb
    .from("v2_personal_income_history")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}
