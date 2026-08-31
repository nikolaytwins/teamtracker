import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import {
  computeFinanceMonthSummary,
  listFinanceGeneralExpenses,
  listFinanceProjectsForMonth,
  listUnpaidFinanceRemainders,
} from "@/lib/v2/finance/finance-repo";
import { listPersonalIncomeHistory } from "@/lib/v2/personal/income-history-repo";
import { sortFinanceCards } from "@/lib/v2/personal/finance-card-order";
import { DEFAULT_BUDGET_CATEGORIES } from "@/lib/v2/personal/formatters";
import {
  ensureFxRatesFresh,
  getFxRateMap,
  listFxRates,
  isPersonalAccountCurrency,
  isPersonalFxCurrency,
  rubFromNative,
  roundMoney,
  type FxRateRow,
  type PersonalAccountCurrency,
  type PersonalFxCurrency,
} from "@/lib/v2/personal/fx-rates";
import type {
  PersonalAccountRow,
  PersonalBudgetCategoryRow,
  PersonalBudgetMonthRow,
  PersonalCapitalRow,
  PersonalCashForecast,
  PersonalCashForecastPlannedIncome,
  PersonalFinanceDashboard,
  PersonalForecastExtraExpenseRow,
  PersonalIncomeHistoryRow,
  PersonalIncomeRow,
  PersonalMonthSnapshotRow,
  PersonalTaxAdvanceRow,
  PersonalTaxProfileRow,
  PersonalTransactionRow,
  PersonalTxnType,
  PersonalFinanceSystemRow,
  PersonalFinanceGoalRow,
  PersonalFinanceFundRow,
} from "@/lib/v2/personal/types";

export const DEFAULT_EXPECTED_EXPENSES_RUB = 180_000;
import type { V2SessionContext } from "@/lib/v2/types";

export class PersonalFinanceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalFinanceValidationError";
  }
}

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

const FINANCE_CARD_ORDER = { ascending: true } as const;

async function nextFinanceSortOrder(
  table: "v2_personal_accounts" | "v2_personal_capital_items",
  userId: string
): Promise<number> {
  const sb = getV2Supabase();
  const { data } = await sb
    .from(table)
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", FINANCE_CARD_ORDER)
    .order("id", FINANCE_CARD_ORDER)
    .limit(1)
    .maybeSingle();
  return (Number(data?.sort_order) || 0) + 1;
}

function mapAccount(
  r: Record<string, unknown>,
  rateByCode?: Map<PersonalFxCurrency, { rate: number; asOf: string }>
): PersonalAccountRow {
  const currency_code = isPersonalAccountCurrency(r.currency_code)
    ? r.currency_code
    : "RUB";
  const balance_native =
    r.balance_native != null ? Number(r.balance_native) || 0 : Number(r.balance_rub) || 0;
  const fx =
    currency_code !== "RUB" && isPersonalFxCurrency(currency_code)
      ? rateByCode?.get(currency_code)
      : undefined;
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    name: String(r.name),
    account_type: String(r.account_type) as PersonalAccountRow["account_type"],
    icon_key: String(r.icon_key),
    accent: String(r.accent),
    balance_rub: Number(r.balance_rub) || 0,
    balance_native,
    currency_code,
    fx_rate: fx?.rate ?? null,
    fx_as_of: fx?.asOf ?? null,
    note: r.note ? String(r.note) : null,
    disposable: Boolean(r.disposable),
    in_cushion: Boolean(r.in_cushion),
    goal_amount_rub: r.goal_amount_rub == null ? null : Number(r.goal_amount_rub),
    sort_order: Number(r.sort_order) || 0,
  };
}

async function loadFxRateLookup(opts?: { refresh?: boolean }): Promise<
  Map<PersonalFxCurrency, { rate: number; asOf: string }>
> {
  const rates = opts?.refresh ? (await ensureFxRatesFresh()) : await listFxRates().catch(() => []);
  if (!opts?.refresh && rates.length === 0) {
    return loadFxRateLookup({ refresh: true });
  }
  return new Map(
    rates.map((r) => [r.currency_code, { rate: r.rate_to_rub, asOf: r.as_of_date }])
  );
}

function mapCapital(r: Record<string, unknown>): PersonalCapitalRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    name: String(r.name),
    icon_key: String(r.icon_key),
    amount_rub: Number(r.amount_rub) || 0,
    meta: r.meta ? String(r.meta) : null,
    unit_label: r.unit_label ? String(r.unit_label) : null,
    tint: r.tint ? String(r.tint) : null,
    sort_order: Number(r.sort_order) || 0,
  };
}

const FUND_ACCOUNT_NAMES = new Set([
  "Подушка безопасности",
  "Фонд одежды",
  "Фонд подарков",
]);

/** Счета в блоке «Счета» — без типов cushion/goal и без перенесённых фондов */
export function filterOperatingAccounts(accounts: PersonalAccountRow[]): PersonalAccountRow[] {
  return accounts.filter(
    (a) =>
      a.account_type !== "cushion" &&
      a.account_type !== "goal" &&
      !FUND_ACCOUNT_NAMES.has(a.name)
  );
}

function mapIncome(r: Record<string, unknown>): PersonalIncomeRow {
  const status = r.status === "received" ? "received" : "expected";
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    brand_key: String(r.brand_key),
    title: String(r.title),
    amount_rub: Number(r.amount_rub) || 0,
    status,
    event_date: r.event_date ? String(r.event_date) : null,
    date_label: r.date_label ? String(r.date_label) : null,
    year: Number(r.year),
    month: Number(r.month),
  };
}

async function ensureTaxProfile(userId: string): Promise<PersonalTaxProfileRow> {
  const sb = getV2Supabase();
  const { data } = await sb.from("v2_personal_tax_profile").select("*").eq("user_id", userId).maybeSingle();
  if (data) {
    return {
      user_id: userId,
      scheme: String(data.scheme),
      year_income_rub: Number(data.year_income_rub) || 0,
      tax_rate: Number(data.tax_rate) || 0.06,
      insurance_rub: Number(data.insurance_rub) || 0,
      insurance_deduction_rub: Number(data.insurance_deduction_rub) || 0,
      paid_advances_rub: Number(data.paid_advances_rub) || 0,
      patent_cost_rub: Number(data.patent_cost_rub) || 0,
      revenue_threshold_rub: data.revenue_threshold_rub != null ? Number(data.revenue_threshold_rub) : 300000,
      revenue_rate: data.revenue_rate != null ? Number(data.revenue_rate) : 0.01,
    };
  }
  const row = {
    user_id: userId,
    scheme: "ИП · Патент (ПСН)",
    year_income_rub: 0,
    tax_rate: 0.06,
    insurance_rub: 57390,
    insurance_deduction_rub: 0,
    paid_advances_rub: 0,
    patent_cost_rub: 0,
    revenue_threshold_rub: 300000,
    revenue_rate: 0.01,
    updated_at: nowIso(),
  };
  await sb.from("v2_personal_tax_profile").insert(row);
  return row;
}

async function ensureBudgetMonth(userId: string, year: number, month: number): Promise<PersonalBudgetMonthRow> {
  const sb = getV2Supabase();
  const { data } = await sb
    .from("v2_personal_budget_months")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  if (data) {
    return {
      user_id: userId,
      year,
      month,
      limit_rub: Number(data.limit_rub) || 0,
      expected_expenses_rub:
        data.expected_expenses_rub == null
          ? DEFAULT_EXPECTED_EXPENSES_RUB
          : Number(data.expected_expenses_rub) || 0,
      daily_spend_rub: Number(data.daily_spend_rub) || 0,
    };
  }
  const limit = DEFAULT_BUDGET_CATEGORIES.reduce((s, c) => s + c.limit, 0);
  const row = {
    user_id: userId,
    year,
    month,
    limit_rub: limit,
    expected_expenses_rub: DEFAULT_EXPECTED_EXPENSES_RUB,
    updated_at: nowIso(),
  };
  const { error: insertErr } = await sb.from("v2_personal_budget_months").insert(row);
  if (insertErr) throw insertErr;
  const { data: cats } = await sb
    .from("v2_personal_budget_categories")
    .select("id")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .limit(1);
  if (!cats?.length) {
    const inserts = DEFAULT_BUDGET_CATEGORIES.map((c, i) => ({
      id: newV2Id(),
      user_id: userId,
      year,
      month,
      name: c.name,
      limit_rub: c.limit,
      spent_rub: 0,
      tint: c.tint,
      sort_order: i,
      created_at: nowIso(),
      updated_at: nowIso(),
    }));
    await sb.from("v2_personal_budget_categories").insert(inserts);
  }
  return {
    user_id: userId,
    year,
    month,
    limit_rub: limit,
    expected_expenses_rub: DEFAULT_EXPECTED_EXPENSES_RUB,
    daily_spend_rub: 0,
  };
}

function mapForecastExtra(r: Record<string, unknown>): PersonalForecastExtraExpenseRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    year: Number(r.year),
    month: Number(r.month),
    label: String(r.label || "Доп. расход"),
    amount_rub: Number(r.amount_rub) || 0,
    sort_order: Number(r.sort_order) || 0,
  };
}

async function listForecastExtras(
  userId: string,
  year: number,
  month: number
): Promise<PersonalForecastExtraExpenseRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_forecast_extra_expenses")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .order("sort_order")
    .order("created_at");
  if (error) {
    // Миграция 029 ещё не применена — не валим дашборд
    console.warn("forecast extras:", error.message);
    return [];
  }
  return (data ?? []).map((r) => mapForecastExtra(r as Record<string, unknown>));
}

/** Синхронизирует spent_rub категорий и общий budgetSpent из expense-транзакций месяца. */
function computeBudgetSpentFromTransactions(
  txns: { amount_rub: unknown; budget_category_id: unknown }[],
  budgetCategories: PersonalBudgetCategoryRow[]
): { categories: PersonalBudgetCategoryRow[]; totalSpent: number } {
  const spentByCategory = new Map<string, number>();
  let totalSpent = 0;
  for (const t of txns) {
    const amount = Number(t.amount_rub) || 0;
    totalSpent += amount;
    const catId = t.budget_category_id ? String(t.budget_category_id) : null;
    if (catId) {
      spentByCategory.set(catId, (spentByCategory.get(catId) ?? 0) + amount);
    }
  }

  const categories = budgetCategories.map((c) => ({
    ...c,
    spent_rub: spentByCategory.get(c.id) ?? 0,
  }));

  return { categories, totalSpent };
}

async function syncBudgetSpentFromTransactions(
  userId: string,
  year: number,
  month: number,
  budgetCategories: PersonalBudgetCategoryRow[]
): Promise<{ categories: PersonalBudgetCategoryRow[]; totalSpent: number }> {
  const sb = getV2Supabase();
  const { data: txns, error } = await sb
    .from("v2_personal_transactions")
    .select("amount_rub, budget_category_id")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .eq("txn_type", "expense");
  if (error) throw error;

  const { categories, totalSpent } = computeBudgetSpentFromTransactions(txns ?? [], budgetCategories);

  const now = nowIso();
  await Promise.all(
    categories.map((c) =>
      sb
        .from("v2_personal_budget_categories")
        .update({ spent_rub: c.spent_rub, updated_at: now })
        .eq("id", c.id)
        .eq("user_id", userId)
    )
  );

  return { categories, totalSpent };
}

async function syncBudgetSpentForMonth(userId: string, year: number, month: number): Promise<void> {
  await ensureBudgetMonth(userId, year, month);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_budget_categories")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .order("sort_order");
  if (error) throw error;
  const categories = (data ?? []).map((r) =>
    mapBudgetCategoryRow(r as Record<string, unknown>, userId, year, month)
  );
  await syncBudgetSpentFromTransactions(userId, year, month, categories);
}

function buildSummary(
  accounts: PersonalAccountRow[],
  capital: PersonalCapitalRow[],
  incomes: PersonalIncomeRow[],
  tax: PersonalTaxProfileRow,
  budget: PersonalBudgetMonthRow,
  budgetCategories: PersonalBudgetCategoryRow[],
  paidContributions: number,
  budgetSpentOverride?: number
) {
  const disposable = accounts.filter((a) => a.disposable).reduce((s, a) => s + a.balance_rub, 0);
  const reserves = accounts.filter((a) => !a.disposable).reduce((s, a) => s + a.balance_rub, 0);
  const capitalSum = capital.reduce((s, c) => s + c.amount_rub, 0);
  const netWorth = disposable + reserves + capitalSum;
  const incomeExpected = incomes.reduce((s, i) => s + i.amount_rub, 0);
  const incomeReceived = incomes.filter((i) => i.status === "received").reduce((s, i) => s + i.amount_rub, 0);
  const incomePending = incomeExpected - incomeReceived;

  // Налоги ИП на патенте (ПСН)
  // Шаг 1 — фиксированные взносы за год минус уже оплаченные (списком).
  // Шаг 2 — налог с выручки: max(выручка − порог, 0) × ставка (1%).
  // Шаг 3 — патент, уменьшенный на (шаг1 + шаг2), остаток не может быть меньше 0.
  const taxFixedContributions = tax.insurance_rub;
  const taxPaidContributions = paidContributions;
  const taxRevenueTax =
    Math.max(tax.year_income_rub - tax.revenue_threshold_rub, 0) * tax.revenue_rate;
  const taxPatentCost = tax.patent_cost_rub;
  const patentReduction = taxFixedContributions + taxRevenueTax;
  const taxPatentRemaining = Math.max(taxPatentCost - patentReduction, 0);
  const taxAccrued = taxFixedContributions + taxRevenueTax + taxPatentRemaining;
  const taxRemaining = Math.max(
    taxFixedContributions - taxPaidContributions + taxRevenueTax + taxPatentRemaining,
    0
  );
  const budgetSpent =
    budgetSpentOverride ?? budgetCategories.reduce((s, c) => s + c.spent_rub, 0);
  const budgetLeft = budget.limit_rub - budgetSpent;
  return {
    disposable,
    reserves,
    capitalSum,
    netWorth,
    incomeExpected,
    incomeReceived,
    incomePending,
    taxAccrued,
    taxRemaining,
    taxFixedContributions,
    taxPaidContributions,
    taxRevenueTax,
    taxPatentCost,
    taxPatentRemaining,
    budgetSpent,
    budgetLeft,
    forecastEnd: 0,
  };
}

async function upsertCurrentSnapshot(
  userId: string,
  year: number,
  month: number,
  summary: ReturnType<typeof buildSummary>
) {
  const sb = getV2Supabase();
  await sb.from("v2_personal_month_snapshots").upsert({
    user_id: userId,
    year,
    month,
    capital_total_rub: summary.netWorth,
    earned_rub: summary.incomeReceived,
    spent_rub: summary.budgetSpent,
    updated_at: nowIso(),
  });
}

export async function loadPersonalFinanceDashboard(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<PersonalFinanceDashboard> {
  const sb = getV2Supabase();
  const userId = uid(ctx);

  const agencyPromise =
    ctx.role === "admin"
      ? Promise.all([
          listFinanceProjectsForMonth(ctx, year, month),
          listFinanceGeneralExpenses(ctx, year, month),
        ])
      : Promise.resolve(null);

  const [
    rateLookup,
    tax,
    budget,
    systemGoals,
    batch,
    agencyPair,
    incomeHistoryRaw,
  ] = await Promise.all([
    loadFxRateLookup(),
    ensureTaxProfile(userId),
    ensureBudgetMonth(userId, year, month),
    Promise.all([ensureFinanceSystem(userId), ensureFinanceGoals(userId), ensureFinanceFunds(userId)]).catch(
      (e) => {
      console.warn("personal finance system tables unavailable — apply migration 052/064", e);
      return [
        {
          user_id: userId,
          life_expenses_rub: DEFAULT_LIFE_EXPENSES_RUB,
          funds_rub: DEFAULT_FUNDS_RUB,
          moscow_job_stable: true,
        } satisfies PersonalFinanceSystemRow,
        [] as PersonalFinanceGoalRow[],
        [] as PersonalFinanceFundRow[],
      ] as const;
    }),
    Promise.all([
      sb.from("v2_personal_accounts").select("*").eq("user_id", userId).order("sort_order", FINANCE_CARD_ORDER).order("created_at", FINANCE_CARD_ORDER).order("id", FINANCE_CARD_ORDER),
      sb.from("v2_personal_capital_items").select("*").eq("user_id", userId).order("sort_order", FINANCE_CARD_ORDER).order("created_at", FINANCE_CARD_ORDER).order("id", FINANCE_CARD_ORDER),
      sb
        .from("v2_personal_incomes")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month)
        .order("created_at", { ascending: false }),
      sb.from("v2_personal_tax_advances").select("*").eq("user_id", userId).order("sort_order"),
      sb
        .from("v2_personal_budget_categories")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month)
        .order("sort_order"),
      sb
        .from("v2_personal_month_snapshots")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .order("month"),
      sb
        .from("v2_personal_transactions")
        .select("amount_rub, budget_category_id")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month)
        .eq("txn_type", "expense"),
      listForecastExtras(userId, year, month),
    ]),
    agencyPromise,
    listPersonalIncomeHistory(ctx, { sync: false }),
  ]);

  const fxRates: FxRateRow[] = [...rateLookup.entries()].map(([currency_code, v]) => ({
    currency_code,
    rate_to_rub: v.rate,
    as_of_date: v.asOf,
    source: "cbr",
    updated_at: nowIso(),
  }));

  const [system, goals, fundsFromEnsure] = systemGoals;
  const [
    accountsRes,
    capitalRes,
    incomesRes,
    advancesRes,
    categoriesRes,
    historyRes,
    expenseTxnsRes,
    forecastExtras,
  ] = batch;

  if (accountsRes.error) throw accountsRes.error;
  if (capitalRes.error) throw capitalRes.error;
  if (incomesRes.error) throw incomesRes.error;
  if (advancesRes.error) throw advancesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (historyRes.error) throw historyRes.error;
  if (expenseTxnsRes.error) throw expenseTxnsRes.error;

  const allAccounts = sortFinanceCards(
    (accountsRes.data ?? []).map((r) => mapAccount(r as Record<string, unknown>, rateLookup))
  );
  const accountNames = new Map(allAccounts.map((a) => [a.id, a.name]));
  const accounts = filterOperatingAccounts(allAccounts);
  const capital = sortFinanceCards((capitalRes.data ?? []).map((r) => mapCapital(r as Record<string, unknown>)));
  const funds = sortFinanceCards(
    fundsFromEnsure.map((f) => ({
      ...f,
      source_account_name: f.source_account_id ? accountNames.get(f.source_account_id) ?? null : null,
    }))
  );
  const incomes = (incomesRes.data ?? []).map((r) => mapIncome(r as Record<string, unknown>));
  const taxAdvances = (advancesRes.data ?? []).map(
    (r) =>
      ({
        id: String(r.id),
        user_id: userId,
        label: String(r.label),
        amount_rub: Number(r.amount_rub) || 0,
        advance_date: r.advance_date ? String(r.advance_date) : null,
        planned: Boolean(r.planned),
        sort_order: Number(r.sort_order) || 0,
      }) satisfies PersonalTaxAdvanceRow
  );
  let budgetCategories = (categoriesRes.data ?? []).map(
    (r) =>
      ({
        id: String(r.id),
        user_id: userId,
        year,
        month,
        name: String(r.name),
        limit_rub: Number(r.limit_rub) || 0,
        spent_rub: Number(r.spent_rub) || 0,
        tint: String(r.tint),
        sort_order: Number(r.sort_order) || 0,
      }) satisfies PersonalBudgetCategoryRow
  );
  const history = (historyRes.data ?? []).map(
    (r) =>
      ({
        user_id: userId,
        year: Number(r.year),
        month: Number(r.month),
        capital_total_rub: Number(r.capital_total_rub) || 0,
        earned_rub: Number(r.earned_rub) || 0,
        spent_rub: Number(r.spent_rub) || 0,
      }) satisfies PersonalMonthSnapshotRow
  );

  const paidContributions = taxAdvances
    .filter((a) => !a.planned)
    .reduce((s, a) => s + a.amount_rub, 0);
  const syncedBudget = computeBudgetSpentFromTransactions(expenseTxnsRes.data ?? [], budgetCategories);
  budgetCategories = syncedBudget.categories;
  const summary = buildSummary(
    accounts,
    capital,
    incomes,
    tax,
    budget,
    budgetCategories,
    paidContributions,
    syncedBudget.totalSpent
  );

  // Прибыль / выручка из «Проекты и финансы» + среднее за 6 мес. из истории
  let projectExpectedRevenue = 0;
  let projectActualRevenue = 0;
  let projectCount = 0;
  let monthProfit = 0;
  let agencyTotalExpenses = 0;
  if (agencyPair) {
    try {
      const [projects, generalExpenses] = agencyPair;
      const fin = computeFinanceMonthSummary(projects, generalExpenses, year, month);
      projectExpectedRevenue = fin.expectedRevenue;
      projectActualRevenue = fin.actualRevenue;
      projectCount = fin.projectCount;
      monthProfit = fin.profit;
      agencyTotalExpenses = fin.totalExpenses;
    } catch (e) {
      console.warn("personal finance: agency month summary unavailable", e);
    }
  }

  let avgProfit6m = 0;
  let capitalYearDelta: number | null = null;
  let incomeHistory: PersonalIncomeHistoryRow[] = incomeHistoryRaw;
  try {
    const historyProfit = incomeHistory.find((r) => r.year === year && r.month === month)?.profit_rub;
    if (
      (projectCount === 0 && projectExpectedRevenue === 0 && projectActualRevenue === 0) &&
      historyProfit != null
    ) {
      monthProfit = historyProfit;
    }

    const past: number[] = [];
    for (let i = 1; i <= 6; i++) {
      let m = month - i;
      let y = year;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      const row = incomeHistory.find((r) => r.year === y && r.month === m);
      if (row?.profit_rub != null) past.push(row.profit_rub);
    }
    if (past.length > 0) {
      avgProfit6m = Math.round(past.reduce((s, v) => s + v, 0) / past.length);
    }

    const yearRows = [...incomeHistory]
      .filter((r) => r.year === year)
      .sort((a, b) => a.month - b.month);
    const yearStart = yearRows[0];
    if (yearStart) {
      capitalYearDelta = summary.netWorth - yearStart.accounts_total_rub;
    } else {
      const yearSnaps = history.filter((h) => h.year === year).sort((a, b) => a.month - b.month);
      if (yearSnaps.length > 0) {
        capitalYearDelta = summary.netWorth - yearSnaps[0]!.capital_total_rub;
      }
    }
  } catch (e) {
    console.warn("personal finance: income history unavailable", e);
  }

  // Выручка на дашборде — из «Проекты и финансы»
  if (projectCount > 0 || projectExpectedRevenue > 0 || projectActualRevenue > 0) {
    summary.incomeExpected = projectExpectedRevenue;
    summary.incomeReceived = projectActualRevenue;
    summary.incomePending = Math.max(projectExpectedRevenue - projectActualRevenue, 0);
  }

  void upsertCurrentSnapshot(userId, year, month, summary).catch((e) => {
    console.warn("personal finance: snapshot upsert failed", e);
  });

  // Для графиков: история дохода (счета) + текущий месяц из живых данных
  const chartFromIncome = incomeHistory
    .map(
      (r) =>
        ({
          user_id: r.user_id,
          year: r.year,
          month: r.month,
          capital_total_rub: r.accounts_total_rub,
          earned_rub: r.earned_rub ?? 0,
          spent_rub: r.spent_rub ?? 0,
        }) satisfies PersonalMonthSnapshotRow
    )
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const historyWithCurrent = [
    ...chartFromIncome.filter((h) => !(h.year === year && h.month === month)),
  ];
  historyWithCurrent.push({
    user_id: userId,
    year,
    month,
    capital_total_rub: summary.disposable + summary.reserves,
    earned_rub: projectExpectedRevenue || summary.incomeReceived,
    spent_rub: summary.budgetSpent,
  });
  historyWithCurrent.sort((a, b) => a.year - b.year || a.month - b.month);

  // incomeHistory для таблицы — по убыванию (как во вкладке), с актуальным текущим месяцем
  const incomeHistoryForUi = [
    ...incomeHistory.filter((r) => !(r.year === year && r.month === month)),
  ];
  incomeHistoryForUi.unshift({
    user_id: userId,
    year,
    month,
    accounts_total_rub: summary.disposable + summary.reserves,
    earned_rub: projectExpectedRevenue || summary.incomeReceived || null,
    profit_rub:
      monthProfit ||
      incomeHistory.find((r) => r.year === year && r.month === month)?.profit_rub ||
      null,
    spent_rub: summary.budgetSpent,
  });
  incomeHistoryForUi.sort((a, b) => b.year - a.year || b.month - a.month);

  const expectedExpenses = budget.expected_expenses_rub;
  const forecastDelta = monthProfit - expectedExpenses;
  const expectedCapital = summary.netWorth + forecastDelta;

  return {
    year,
    month,
    accounts,
    capital,
    funds,
    incomes,
    tax,
    taxAdvances,
    budget,
    budgetCategories,
    forecastExtras,
    fxRates,
    history: historyWithCurrent,
    incomeHistory: incomeHistoryForUi,
    system,
    goals,
    summary: {
      ...summary,
      projectExpectedRevenue,
      projectActualRevenue,
      projectCount,
      monthProfit,
      agencyTotalExpenses,
      avgProfit6m,
      avgIncome6m: avgProfit6m,
      capitalYearDelta,
      expectedExpenses,
      forecastDelta,
      expectedCapital,
      forecastEnd: forecastDelta,
    },
  };
}

export async function getLatestPersonalFinanceMonth(ctx: V2SessionContext): Promise<{
  year: number;
  month: number;
} | null> {
  const sb = getV2Supabase();
  const { data } = await sb
    .from("v2_personal_month_snapshots")
    .select("year, month")
    .eq("user_id", uid(ctx))
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { year: Number(data.year), month: Number(data.month) };
}

async function ownAccountId(userId: string, accountId: string | null | undefined): Promise<boolean> {
  if (!accountId) return false;
  const sb = getV2Supabase();
  const { data } = await sb
    .from("v2_personal_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function ownBudgetCategoryId(
  userId: string,
  categoryId: string | null | undefined,
  year: number,
  month: number
): Promise<boolean> {
  if (!categoryId) return true;
  const sb = getV2Supabase();
  const { data } = await sb
    .from("v2_personal_budget_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return Boolean(data);
}

function accountPatch(patch: Partial<PersonalAccountRow>): Partial<PersonalAccountRow> {
  const out: Partial<PersonalAccountRow> = {};
  if (patch.name !== undefined) out.name = String(patch.name).trim() || "Счёт";
  if (patch.account_type !== undefined) out.account_type = patch.account_type;
  if (patch.icon_key !== undefined) out.icon_key = patch.icon_key;
  if (patch.accent !== undefined) out.accent = patch.accent;
  if (patch.note !== undefined) out.note = patch.note;
  if (patch.disposable !== undefined) out.disposable = patch.disposable;
  if (patch.in_cushion !== undefined) out.in_cushion = patch.in_cushion;
  if (patch.goal_amount_rub !== undefined) out.goal_amount_rub = patch.goal_amount_rub;
  if (patch.sort_order !== undefined) out.sort_order = patch.sort_order;
  if (patch.currency_code !== undefined && isPersonalAccountCurrency(patch.currency_code)) {
    out.currency_code = patch.currency_code;
  }
  if (patch.balance_native !== undefined) {
    out.balance_native = roundMoney(Number(patch.balance_native) || 0);
  }
  if (patch.balance_rub !== undefined) {
    out.balance_rub = Math.round(Number(patch.balance_rub) || 0);
  }
  return out;
}

async function resolveRubBalance(
  currency: PersonalAccountCurrency,
  balanceNative: number,
  balanceRubHint?: number
): Promise<{ balance_native: number; balance_rub: number }> {
  const native = roundMoney(balanceNative);
  if (currency === "RUB") {
    const rub = Math.round(balanceRubHint ?? native);
    return { balance_native: rub, balance_rub: rub };
  }
  const rates = await getFxRateMap();
  const rate = rates.get(currency);
  if (rate == null || rate <= 0) {
    return { balance_native: native, balance_rub: Math.round(native) };
  }
  return { balance_native: native, balance_rub: rubFromNative(native, rate) };
}

function capitalPatch(patch: Partial<PersonalCapitalRow>): Partial<PersonalCapitalRow> {
  const out: Partial<PersonalCapitalRow> = {};
  if (patch.name !== undefined) out.name = String(patch.name).trim() || "Актив";
  if (patch.icon_key !== undefined) out.icon_key = patch.icon_key;
  if (patch.amount_rub !== undefined) out.amount_rub = Math.round(Number(patch.amount_rub) || 0);
  if (patch.meta !== undefined) out.meta = patch.meta;
  if (patch.unit_label !== undefined) out.unit_label = patch.unit_label;
  if (patch.tint !== undefined) out.tint = patch.tint;
  if (patch.sort_order !== undefined) out.sort_order = patch.sort_order;
  return out;
}

function incomePatch(patch: Partial<PersonalIncomeRow>): Partial<PersonalIncomeRow> {
  const out: Partial<PersonalIncomeRow> = {};
  if (patch.brand_key !== undefined) out.brand_key = patch.brand_key;
  if (patch.title !== undefined) out.title = String(patch.title).trim();
  if (patch.amount_rub !== undefined) out.amount_rub = patch.amount_rub;
  if (patch.status !== undefined) out.status = patch.status === "received" ? "received" : "expected";
  if (patch.event_date !== undefined) out.event_date = patch.event_date;
  if (patch.date_label !== undefined) out.date_label = patch.date_label;
  return out;
}

function taxPatch(patch: Partial<PersonalTaxProfileRow>): Partial<PersonalTaxProfileRow> {
  const out: Partial<PersonalTaxProfileRow> = {};
  if (patch.scheme !== undefined) out.scheme = patch.scheme;
  if (patch.year_income_rub !== undefined) out.year_income_rub = patch.year_income_rub;
  if (patch.tax_rate !== undefined) out.tax_rate = patch.tax_rate;
  if (patch.insurance_rub !== undefined) out.insurance_rub = patch.insurance_rub;
  if (patch.insurance_deduction_rub !== undefined) out.insurance_deduction_rub = patch.insurance_deduction_rub;
  if (patch.paid_advances_rub !== undefined) out.paid_advances_rub = patch.paid_advances_rub;
  if (patch.patent_cost_rub !== undefined) out.patent_cost_rub = patch.patent_cost_rub;
  if (patch.revenue_threshold_rub !== undefined) out.revenue_threshold_rub = patch.revenue_threshold_rub;
  if (patch.revenue_rate !== undefined) out.revenue_rate = patch.revenue_rate;
  return out;
}

export async function createPersonalAccount(
  ctx: V2SessionContext,
  input: Partial<PersonalAccountRow>
): Promise<PersonalAccountRow> {
  const sb = getV2Supabase();
  const id = newV2Id();
  const now = nowIso();
  const currency: PersonalAccountCurrency = isPersonalAccountCurrency(input.currency_code)
    ? input.currency_code
    : "RUB";
  const nativeInput =
    input.balance_native != null ? Number(input.balance_native) : Number(input.balance_rub ?? 0);
  const balances = await resolveRubBalance(currency, nativeInput, input.balance_rub);
  const userId = uid(ctx);
  const sort_order = input.sort_order ?? (await nextFinanceSortOrder("v2_personal_accounts", userId));
  const row = {
    id,
    user_id: userId,
    name: input.name?.trim() || "Счёт",
    account_type: input.account_type ?? "card",
    icon_key: input.icon_key ?? "wallet",
    accent: input.accent ?? "#3B6FF7",
    currency_code: currency,
    balance_native: balances.balance_native,
    balance_rub: balances.balance_rub,
    note: input.note ?? null,
    disposable: input.disposable ?? true,
    in_cushion: input.in_cushion ?? false,
    goal_amount_rub: input.goal_amount_rub ?? null,
    sort_order,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_accounts").insert(row);
  if (error) throw error;
  const rateLookup = await loadFxRateLookup();
  return mapAccount(row, rateLookup);
}

export async function updatePersonalAccount(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<PersonalAccountRow>
): Promise<PersonalAccountRow | null> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const { data: existing } = await sb
    .from("v2_personal_accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) return null;

  const safe = accountPatch(patch);
  const nextCurrency: PersonalAccountCurrency = isPersonalAccountCurrency(safe.currency_code)
    ? safe.currency_code
    : isPersonalAccountCurrency(existing.currency_code)
      ? existing.currency_code
      : "RUB";

  const touchingBalance =
    patch.balance_native !== undefined ||
    patch.balance_rub !== undefined ||
    patch.currency_code !== undefined;

  if (touchingBalance) {
    let native: number;
    if (patch.balance_native !== undefined) {
      native = Number(patch.balance_native) || 0;
    } else if (nextCurrency === "RUB" && patch.balance_rub !== undefined) {
      native = Number(patch.balance_rub) || 0;
    } else if (
      nextCurrency !== "RUB" &&
      patch.balance_rub !== undefined &&
      patch.balance_native === undefined
    ) {
      const rates = await getFxRateMap();
      const rate = rates.get(nextCurrency);
      native =
        rate && rate > 0
          ? roundMoney((Number(patch.balance_rub) || 0) / rate)
          : Number(existing.balance_native) || 0;
    } else {
      native = Number(existing.balance_native ?? existing.balance_rub) || 0;
    }
    const balances = await resolveRubBalance(nextCurrency, native, patch.balance_rub);
    safe.currency_code = nextCurrency;
    safe.balance_native = balances.balance_native;
    safe.balance_rub = balances.balance_rub;
  }

  const dbPatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(safe)) {
    if (key === "fx_rate" || key === "fx_as_of" || key === "user_id" || key === "id") continue;
    dbPatch[key] = value;
  }

  if (Object.keys(dbPatch).length === 0) {
    const rateLookup = await loadFxRateLookup();
    return mapAccount(existing as Record<string, unknown>, rateLookup);
  }

  const { error } = await sb
    .from("v2_personal_accounts")
    .update({ ...dbPatch, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  const { data } = await sb.from("v2_personal_accounts").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  const rateLookup = await loadFxRateLookup();
  return data ? mapAccount(data as Record<string, unknown>, rateLookup) : null;
}

export async function deletePersonalAccount(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_accounts").delete().eq("id", id).eq("user_id", uid(ctx));
  if (error) throw error;
}

export async function createPersonalCapital(
  ctx: V2SessionContext,
  input: Partial<PersonalCapitalRow>
): Promise<PersonalCapitalRow> {
  const sb = getV2Supabase();
  const id = newV2Id();
  const now = nowIso();
  const userId = uid(ctx);
  const sort_order = input.sort_order ?? (await nextFinanceSortOrder("v2_personal_capital_items", userId));
  const row = {
    id,
    user_id: userId,
    name: input.name?.trim() || "Актив",
    icon_key: input.icon_key ?? "coin",
    amount_rub: input.amount_rub ?? 0,
    meta: input.meta ?? null,
    unit_label: input.unit_label ?? null,
    tint: input.tint ?? null,
    sort_order,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_capital_items").insert(row);
  if (error) throw error;
  return mapCapital(row);
}

export async function updatePersonalCapital(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<PersonalCapitalRow>
): Promise<PersonalCapitalRow | null> {
  const sb = getV2Supabase();
  const safe = capitalPatch(patch);
  if (Object.keys(safe).length === 0) {
    const { data } = await sb.from("v2_personal_capital_items").select("*").eq("id", id).eq("user_id", uid(ctx)).maybeSingle();
    return data ? mapCapital(data as Record<string, unknown>) : null;
  }
  const { error } = await sb
    .from("v2_personal_capital_items")
    .update({ ...safe, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
  const { data } = await sb.from("v2_personal_capital_items").select("*").eq("id", id).eq("user_id", uid(ctx)).maybeSingle();
  return data ? mapCapital(data as Record<string, unknown>) : null;
}

export async function deletePersonalCapital(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_capital_items").delete().eq("id", id).eq("user_id", uid(ctx));
  if (error) throw error;
}

export async function createPersonalIncome(
  ctx: V2SessionContext,
  input: {
    brand_key?: string;
    title: string;
    amount_rub: number;
    status?: "expected" | "received";
    date_label?: string | null;
    year: number;
    month: number;
  }
): Promise<PersonalIncomeRow> {
  const sb = getV2Supabase();
  const id = newV2Id();
  const now = nowIso();
  const title = input.title.trim();
  if (!title) throw new PersonalFinanceValidationError("Укажите название поступления");
  if (!Number.isFinite(input.amount_rub) || input.amount_rub <= 0) {
    throw new PersonalFinanceValidationError("Сумма должна быть больше нуля");
  }
  if (!Number.isFinite(input.year) || !Number.isFinite(input.month) || input.month < 1 || input.month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц");
  }
  const row = {
    id,
    user_id: uid(ctx),
    brand_key: input.brand_key ?? "studio",
    title,
    amount_rub: input.amount_rub,
    status: input.status ?? "expected",
    event_date: null,
    date_label: input.date_label ?? null,
    year: input.year,
    month: input.month,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_incomes").insert(row);
  if (error) throw error;
  return mapIncome(row);
}

export async function updatePersonalIncome(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<PersonalIncomeRow>
): Promise<PersonalIncomeRow | null> {
  const sb = getV2Supabase();
  const safe = incomePatch(patch);
  if (Object.keys(safe).length === 0) {
    const { data } = await sb.from("v2_personal_incomes").select("*").eq("id", id).eq("user_id", uid(ctx)).maybeSingle();
    return data ? mapIncome(data as Record<string, unknown>) : null;
  }
  const { error } = await sb
    .from("v2_personal_incomes")
    .update({ ...safe, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
  const { data } = await sb.from("v2_personal_incomes").select("*").eq("id", id).eq("user_id", uid(ctx)).maybeSingle();
  return data ? mapIncome(data as Record<string, unknown>) : null;
}

export async function deletePersonalIncome(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_incomes").delete().eq("id", id).eq("user_id", uid(ctx));
  if (error) throw error;
}

export async function createPersonalTransaction(
  ctx: V2SessionContext,
  input: {
    txn_type: PersonalTxnType;
    amount_rub: number;
    description?: string | null;
    from_account_id?: string | null;
    to_account_id?: string | null;
    budget_category_id?: string | null;
    year: number;
    month: number;
    txn_date?: string | null;
    external_id?: string | null;
    import_batch_id?: string | null;
    /** When true, skip balance/spent updates if external_id already exists */
    skip_if_duplicate?: boolean;
  }
): Promise<PersonalTransactionRow | null> {
  const userId = uid(ctx);
  const { txn_type, amount_rub, year, month } = input;

  if (!["income", "expense", "transfer"].includes(txn_type)) {
    throw new PersonalFinanceValidationError("Неизвестный тип операции");
  }
  if (!Number.isFinite(amount_rub) || amount_rub <= 0) {
    throw new PersonalFinanceValidationError("Сумма должна быть больше нуля");
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц операции");
  }

  if (txn_type === "expense") {
    if (input.from_account_id && !(await ownAccountId(userId, input.from_account_id))) {
      throw new PersonalFinanceValidationError("Счёт списания не найден");
    }
    if (input.budget_category_id && !(await ownBudgetCategoryId(userId, input.budget_category_id, year, month))) {
      throw new PersonalFinanceValidationError("Категория бюджета не найдена");
    }
  }

  if (txn_type === "income") {
    if (input.to_account_id && !(await ownAccountId(userId, input.to_account_id))) {
      throw new PersonalFinanceValidationError("Счёт зачисления не найден");
    }
  }

  if (txn_type === "transfer") {
    if (!input.from_account_id || !input.to_account_id) {
      throw new PersonalFinanceValidationError("Укажите оба счёта для перевода");
    }
    if (input.from_account_id === input.to_account_id) {
      throw new PersonalFinanceValidationError("Счёт списания и зачисления должны отличаться");
    }
    if (!(await ownAccountId(userId, input.from_account_id))) {
      throw new PersonalFinanceValidationError("Счёт списания не найден");
    }
    if (!(await ownAccountId(userId, input.to_account_id))) {
      throw new PersonalFinanceValidationError("Счёт зачисления не найден");
    }
  }

  await ensureBudgetMonth(userId, year, month);

  const sb = getV2Supabase();

  if (input.external_id) {
    const { data: existing } = await sb
      .from("v2_personal_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("external_id", input.external_id)
      .maybeSingle();
    if (existing) {
      if (input.skip_if_duplicate) return null;
      throw new PersonalFinanceValidationError("Операция уже импортирована");
    }
  }

  const id = newV2Id();
  const now = nowIso();
  let txnDate = input.txn_date?.trim() || now;
  if (/^\d{4}-\d{2}-\d{2}$/.test(txnDate)) {
    txnDate = `${txnDate}T12:00:00.000Z`;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(txnDate)) {
    txnDate = `${txnDate}:00.000Z`;
  }

  const { error: insErr } = await sb.from("v2_personal_transactions").insert({
    id,
    user_id: userId,
    txn_date: txnDate,
    txn_type: input.txn_type,
    amount_rub: input.amount_rub,
    category: null,
    description: input.description ?? null,
    from_account_id: input.from_account_id ?? null,
    to_account_id: input.to_account_id ?? null,
    budget_category_id: input.budget_category_id ?? null,
    year: input.year,
    month: input.month,
    external_id: input.external_id ?? null,
    import_batch_id: input.import_batch_id ?? null,
    created_at: now,
  });
  if (insErr) {
    if (String(insErr.message || "").includes("idx_v2_personal_txn_user_external")) {
      if (input.skip_if_duplicate) return null;
      throw new PersonalFinanceValidationError("Операция уже импортирована");
    }
    throw insErr;
  }

  await syncBudgetSpentForMonth(userId, input.year, input.month);

  return {
    id,
    user_id: userId,
    txn_date: txnDate,
    txn_type: input.txn_type,
    amount_rub: input.amount_rub,
    category: null,
    description: input.description ?? null,
    from_account_id: input.from_account_id ?? null,
    to_account_id: input.to_account_id ?? null,
    budget_category_id: input.budget_category_id ?? null,
    year: input.year,
    month: input.month,
    external_id: input.external_id ?? null,
    import_batch_id: input.import_batch_id ?? null,
    created_at: now,
  };
}

function mapTransaction(
  r: Record<string, unknown>,
  accountsById: Map<string, string>,
  categoriesById: Map<string, { name: string; tint: string }>
): PersonalTransactionRow {
  const fromId = r.from_account_id ? String(r.from_account_id) : null;
  const toId = r.to_account_id ? String(r.to_account_id) : null;
  const catId = r.budget_category_id ? String(r.budget_category_id) : null;
  const cat = catId ? categoriesById.get(catId) : undefined;
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    txn_date: String(r.txn_date),
    txn_type: r.txn_type as PersonalTxnType,
    amount_rub: Number(r.amount_rub) || 0,
    category: r.category != null ? String(r.category) : null,
    description: r.description != null ? String(r.description) : null,
    from_account_id: fromId,
    to_account_id: toId,
    budget_category_id: catId,
    year: Number(r.year),
    month: Number(r.month),
    external_id: r.external_id != null ? String(r.external_id) : null,
    import_batch_id: r.import_batch_id != null ? String(r.import_batch_id) : null,
    created_at: String(r.created_at ?? ""),
    from_account_name: fromId ? accountsById.get(fromId) ?? null : null,
    to_account_name: toId ? accountsById.get(toId) ?? null : null,
    budget_category_name: cat?.name ?? null,
    budget_category_tint: cat?.tint ?? null,
  };
}

export async function listPersonalTransactions(
  ctx: V2SessionContext,
  opts: {
    year: number;
    month: number;
    txn_type?: PersonalTxnType | null;
    budget_category_id?: string | null;
    q?: string | null;
  }
): Promise<PersonalTransactionRow[]> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  let q = sb
    .from("v2_personal_transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("year", opts.year)
    .eq("month", opts.month)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts.txn_type) q = q.eq("txn_type", opts.txn_type);
  if (opts.budget_category_id) q = q.eq("budget_category_id", opts.budget_category_id);

  const { data, error } = await q;
  if (error) throw error;

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    sb.from("v2_personal_accounts").select("id, name").eq("user_id", userId),
    sb
      .from("v2_personal_budget_categories")
      .select("id, name, tint")
      .eq("user_id", userId)
      .eq("year", opts.year)
      .eq("month", opts.month),
  ]);

  const accountsById = new Map((accounts ?? []).map((a) => [String(a.id), String(a.name)]));
  const categoriesById = new Map(
    (categories ?? []).map((c) => [String(c.id), { name: String(c.name), tint: String(c.tint) }])
  );

  let rows = (data ?? []).map((r) => mapTransaction(r as Record<string, unknown>, accountsById, categoriesById));
  const needle = opts.q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter(
      (t) =>
        (t.description ?? "").toLowerCase().includes(needle) ||
        (t.budget_category_name ?? "").toLowerCase().includes(needle) ||
        (t.from_account_name ?? "").toLowerCase().includes(needle) ||
        (t.to_account_name ?? "").toLowerCase().includes(needle)
    );
  }
  return rows;
}

export async function deletePersonalTransaction(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const { data, error } = await sb
    .from("v2_personal_transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalFinanceValidationError("Операция не найдена");

  const year = Number(data.year);
  const month = Number(data.month);

  const { error: delErr } = await sb.from("v2_personal_transactions").delete().eq("id", id).eq("user_id", userId);
  if (delErr) throw delErr;

  await syncBudgetSpentForMonth(userId, year, month);
}

export async function updatePersonalTransactionAmount(
  ctx: V2SessionContext,
  id: string,
  amount_rub: number
): Promise<PersonalTransactionRow | null> {
  const sb = getV2Supabase();
  const userId = uid(ctx);

  if (!Number.isFinite(amount_rub) || amount_rub <= 0) {
    throw new PersonalFinanceValidationError("Сумма должна быть больше нуля");
  }

  const { data, error } = await sb
    .from("v2_personal_transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalFinanceValidationError("Операция не найдена");

  const oldAmount = Number(data.amount_rub) || 0;
  if (oldAmount === amount_rub) {
    return mapTransaction(data as Record<string, unknown>, new Map(), new Map());
  }

  const { data: updated, error: updErr } = await sb
    .from("v2_personal_transactions")
    .update({ amount_rub })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (updErr) throw updErr;
  if (!updated) throw new PersonalFinanceValidationError("Операция не найдена");

  await syncBudgetSpentForMonth(userId, Number(data.year), Number(data.month));

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    sb.from("v2_personal_accounts").select("id, name").eq("user_id", userId),
    sb
      .from("v2_personal_budget_categories")
      .select("id, name, tint")
      .eq("user_id", userId)
      .eq("year", Number(data.year))
      .eq("month", Number(data.month)),
  ]);

  const accountsById = new Map((accounts ?? []).map((a) => [String(a.id), String(a.name)]));
  const categoriesById = new Map(
    (categories ?? []).map((c) => [String(c.id), { name: String(c.name), tint: String(c.tint) }])
  );

  return mapTransaction(updated as Record<string, unknown>, accountsById, categoriesById);
}

export async function updatePersonalTransactionCategory(
  ctx: V2SessionContext,
  id: string,
  budget_category_id: string | null
): Promise<PersonalTransactionRow | null> {
  const sb = getV2Supabase();
  const userId = uid(ctx);

  const { data, error } = await sb
    .from("v2_personal_transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalFinanceValidationError("Операция не найдена");

  const txnType = String(data.txn_type) as PersonalTxnType;
  if (txnType !== "expense") {
    throw new PersonalFinanceValidationError("Категория доступна только для расходов");
  }

  const year = Number(data.year);
  const month = Number(data.month);
  const oldCategoryId = data.budget_category_id ? String(data.budget_category_id) : null;
  const newCategoryId = budget_category_id?.trim() ? budget_category_id.trim() : null;

  if (oldCategoryId === newCategoryId) {
    return mapTransaction(data as Record<string, unknown>, new Map(), new Map());
  }

  if (newCategoryId && !(await ownBudgetCategoryId(userId, newCategoryId, year, month))) {
    throw new PersonalFinanceValidationError("Категория бюджета не найдена");
  }

  const { data: updated, error: updErr } = await sb
    .from("v2_personal_transactions")
    .update({ budget_category_id: newCategoryId, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (updErr) throw updErr;
  if (!updated) throw new PersonalFinanceValidationError("Операция не найдена");

  await syncBudgetSpentForMonth(userId, year, month);

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    sb.from("v2_personal_accounts").select("id, name").eq("user_id", userId),
    sb
      .from("v2_personal_budget_categories")
      .select("id, name, tint")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month),
  ]);

  const accountsById = new Map((accounts ?? []).map((a) => [String(a.id), String(a.name)]));
  const categoriesById = new Map(
    (categories ?? []).map((c) => [String(c.id), { name: String(c.name), tint: String(c.tint) }])
  );

  return mapTransaction(updated as Record<string, unknown>, accountsById, categoriesById);
}

export async function importPersonalTransactions(
  ctx: V2SessionContext,
  input: {
    items: {
      txn_type: "expense" | "income";
      amount_rub: number;
      description: string;
      date: string;
      external_id: string;
      budget_category_id?: string | null;
      selected?: boolean;
    }[];
    from_account_id: string;
    to_account_id?: string | null;
  }
): Promise<{ created: number; skipped: number; batchId: string }> {
  const userId = uid(ctx);
  if (!(await ownAccountId(userId, input.from_account_id))) {
    throw new PersonalFinanceValidationError("Счёт не найден");
  }
  const toId = input.to_account_id || input.from_account_id;
  if (!(await ownAccountId(userId, toId))) {
    throw new PersonalFinanceValidationError("Счёт зачисления не найден");
  }

  const batchId = newV2Id();
  const now = nowIso();
  const sb = getV2Supabase();
  let skipped = 0;

  const selectedItems = input.items.filter((item) => {
    if (item.selected === false) {
      skipped++;
      return false;
    }
    return true;
  });

  const monthPairs = new Map<string, { year: number; month: number }>();
  for (const item of selectedItems) {
    const d = new Date(`${item.date}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    monthPairs.set(`${year}-${month}`, { year, month });
  }
  await Promise.all(
    [...monthPairs.values()].map(({ year, month }) => ensureBudgetMonth(userId, year, month))
  );

  const externalIds = [...new Set(selectedItems.map((item) => item.external_id).filter(Boolean))];
  const existingExternalIds = new Set<string>();
  for (let i = 0; i < externalIds.length; i += 400) {
    const chunk = externalIds.slice(i, i + 400);
    const { data, error } = await sb
      .from("v2_personal_transactions")
      .select("external_id")
      .eq("user_id", userId)
      .in("external_id", chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.external_id) existingExternalIds.add(String(row.external_id));
    }
  }

  const { data: categoryRows, error: catErr } = await sb
    .from("v2_personal_budget_categories")
    .select("id, year, month")
    .eq("user_id", userId);
  if (catErr) throw catErr;
  const validCategoryKeys = new Set(
    (categoryRows ?? []).map((c) => `${String(c.id)}:${Number(c.year)}:${Number(c.month)}`)
  );

  const insertRows: Record<string, unknown>[] = [];

  for (const item of selectedItems) {
    if (existingExternalIds.has(item.external_id)) {
      skipped++;
      continue;
    }
    const d = new Date(`${item.date}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      skipped++;
      continue;
    }
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;

    let budgetCategoryId = item.txn_type === "expense" ? item.budget_category_id ?? null : null;
    if (
      budgetCategoryId &&
      !validCategoryKeys.has(`${budgetCategoryId}:${year}:${month}`)
    ) {
      budgetCategoryId = null;
    }

    let txnDate = item.date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(txnDate)) {
      txnDate = `${txnDate}T12:00:00.000Z`;
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(txnDate)) {
      txnDate = `${txnDate}:00.000Z`;
    }

    insertRows.push({
      id: newV2Id(),
      user_id: userId,
      txn_date: txnDate,
      txn_type: item.txn_type,
      amount_rub: item.amount_rub,
      category: null,
      description: item.description,
      from_account_id: item.txn_type === "expense" ? input.from_account_id : null,
      to_account_id: item.txn_type === "income" ? toId : null,
      budget_category_id: budgetCategoryId,
      year,
      month,
      external_id: item.external_id,
      import_batch_id: batchId,
      created_at: now,
    });
  }

  let created = 0;
  for (let i = 0; i < insertRows.length; i += 200) {
    const chunk = insertRows.slice(i, i + 200);
    const { error } = await sb.from("v2_personal_transactions").insert(chunk);
    if (error) {
      if (String(error.message || "").includes("idx_v2_personal_txn_user_external")) {
        skipped += chunk.length;
        continue;
      }
      throw error;
    }
    created += chunk.length;
  }

  await Promise.all(
    [...monthPairs.values()].map(({ year, month }) => syncBudgetSpentForMonth(userId, year, month))
  );

  return { created, skipped, batchId };
}

export async function updatePersonalTaxProfile(
  ctx: V2SessionContext,
  patch: Partial<PersonalTaxProfileRow>
): Promise<PersonalTaxProfileRow> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  await ensureTaxProfile(userId);
  const safe = taxPatch(patch);
  if (Object.keys(safe).length > 0) {
    const { error } = await sb
      .from("v2_personal_tax_profile")
      .update({ ...safe, updated_at: nowIso() })
      .eq("user_id", userId);
    if (error) throw error;
  }
  return ensureTaxProfile(userId);
}

function mapTaxAdvance(r: Record<string, unknown>): PersonalTaxAdvanceRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    label: String(r.label ?? ""),
    amount_rub: Number(r.amount_rub) || 0,
    advance_date: r.advance_date ? String(r.advance_date) : null,
    planned: Boolean(r.planned),
    sort_order: Number(r.sort_order) || 0,
  };
}

export async function createPersonalTaxAdvance(
  ctx: V2SessionContext,
  input: { label?: string; amount_rub: number; advance_date?: string | null; planned?: boolean }
): Promise<PersonalTaxAdvanceRow> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  if (!Number.isFinite(input.amount_rub) || input.amount_rub <= 0) {
    throw new PersonalFinanceValidationError("Сумма взноса должна быть больше нуля");
  }
  const { data: last } = await sb
    .from("v2_personal_tax_advances")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    label: (input.label ?? "").trim() || "Взнос",
    amount_rub: input.amount_rub,
    advance_date: input.advance_date ?? null,
    planned: input.planned ?? false,
    sort_order: (Number(last?.sort_order) || 0) + 1,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_tax_advances").insert(row);
  if (error) throw error;
  return mapTaxAdvance(row);
}

export async function deletePersonalTaxAdvance(ctx: V2SessionContext, id: string): Promise<boolean> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_tax_advances")
    .delete()
    .eq("id", id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
  return true;
}

export async function updateBudgetCategorySpent(
  ctx: V2SessionContext,
  id: string,
  spent_rub: number
): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_budget_categories")
    .update({ spent_rub, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
}

function mapBudgetCategoryRow(
  r: Record<string, unknown>,
  userId: string,
  year: number,
  month: number
): PersonalBudgetCategoryRow {
  return {
    id: String(r.id),
    user_id: userId,
    year,
    month,
    name: String(r.name),
    limit_rub: Number(r.limit_rub) || 0,
    spent_rub: Number(r.spent_rub) || 0,
    tint: String(r.tint),
    sort_order: Number(r.sort_order) || 0,
  };
}

export async function listPersonalBudgetCategoriesForMonth(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<PersonalBudgetCategoryRow[]> {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц");
  }
  const userId = uid(ctx);
  await ensureBudgetMonth(userId, year, month);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_budget_categories")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => mapBudgetCategoryRow(r as Record<string, unknown>, userId, year, month));
}

export async function createPersonalBudgetCategory(
  ctx: V2SessionContext,
  input: { year: number; month: number; name: string; limit_rub?: number }
): Promise<PersonalBudgetCategoryRow> {
  const year = Number(input.year);
  const month = Number(input.month);
  const name = input.name.trim();
  if (!name) throw new PersonalFinanceValidationError("Укажите название категории");
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц");
  }
  const limit_rub =
    input.limit_rub !== undefined && Number.isFinite(Number(input.limit_rub))
      ? Math.max(0, Math.round(Number(input.limit_rub)))
      : 0;

  const userId = uid(ctx);
  await ensureBudgetMonth(userId, year, month);
  const sb = getV2Supabase();
  const { data: existing, error: listErr } = await sb
    .from("v2_personal_budget_categories")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .order("sort_order");
  if (listErr) throw listErr;

  const normalized = name.toLowerCase();
  const duplicate = (existing ?? []).find((c) => String(c.name).trim().toLowerCase() === normalized);
  if (duplicate) {
    return {
      id: String(duplicate.id),
      user_id: userId,
      year,
      month,
      name: String(duplicate.name),
      limit_rub: Number(duplicate.limit_rub) || 0,
      spent_rub: Number(duplicate.spent_rub) || 0,
      tint: String(duplicate.tint),
      sort_order: Number(duplicate.sort_order) || 0,
    };
  }

  const sort_order =
    (existing ?? []).reduce((max, c) => Math.max(max, Number(c.sort_order) || 0), -1) + 1;
  const tint =
    DEFAULT_BUDGET_CATEGORIES[sort_order % DEFAULT_BUDGET_CATEGORIES.length]?.tint ?? "#A1A1AA";
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    year,
    month,
    name,
    limit_rub,
    spent_rub: 0,
    tint,
    sort_order,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_budget_categories").insert(row);
  if (error) throw error;
  return {
    id: row.id,
    user_id: userId,
    year,
    month,
    name,
    limit_rub,
    spent_rub: 0,
    tint,
    sort_order,
  };
}

export async function updatePersonalExpectedExpenses(
  ctx: V2SessionContext,
  year: number,
  month: number,
  expected_expenses_rub: number
): Promise<PersonalBudgetMonthRow> {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц");
  }
  if (!Number.isFinite(expected_expenses_rub) || expected_expenses_rub < 0) {
    throw new PersonalFinanceValidationError("Сумма расходов должна быть ≥ 0");
  }
  const userId = uid(ctx);
  await ensureBudgetMonth(userId, year, month);
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_budget_months")
    .update({ expected_expenses_rub: Math.round(expected_expenses_rub), updated_at: nowIso() })
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month);
  if (error) throw error;
  return ensureBudgetMonth(userId, year, month);
}

export async function updatePersonalDailySpend(
  ctx: V2SessionContext,
  year: number,
  month: number,
  daily_spend_rub: number
): Promise<PersonalBudgetMonthRow> {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц");
  }
  if (!Number.isFinite(daily_spend_rub) || daily_spend_rub < 0) {
    throw new PersonalFinanceValidationError("Сумма в день должна быть ≥ 0");
  }
  const userId = uid(ctx);
  await ensureBudgetMonth(userId, year, month);
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_budget_months")
    .update({ daily_spend_rub: Math.round(daily_spend_rub), updated_at: nowIso() })
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month);
  if (error) throw error;
  return ensureBudgetMonth(userId, year, month);
}

function remainingDaysInMonth(year: number, month: number, now = new Date()): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  const nowY = now.getFullYear();
  const nowM = now.getMonth() + 1;
  const nowD = now.getDate();
  if (year < nowY || (year === nowY && month < nowM)) return 0;
  if (year > nowY || (year === nowY && month > nowM)) return daysInMonth;
  return Math.max(0, daysInMonth - nowD + 1);
}

export async function loadPersonalCashForecast(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<PersonalCashForecast> {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц");
  }
  const userId = uid(ctx);
  const budget = await ensureBudgetMonth(userId, year, month);
  const sb = getV2Supabase();
  const [accountsRes, one_time_expenses, unpaid] = await Promise.all([
    sb.from("v2_personal_accounts").select("*").eq("user_id", userId).order("sort_order", FINANCE_CARD_ORDER).order("created_at", FINANCE_CARD_ORDER).order("id", FINANCE_CARD_ORDER),
    listForecastExtras(userId, year, month),
    listUnpaidFinanceRemainders(ctx),
  ]);
  if (accountsRes.error) throw accountsRes.error;
  const accounts = sortFinanceCards((accountsRes.data ?? []).map((r) => mapAccount(r as Record<string, unknown>)));
  const disposable = accounts.filter((a) => a.disposable).reduce((s, a) => s + a.balance_rub, 0);
  const planned_incomes: PersonalCashForecastPlannedIncome[] = unpaid.map((p) => ({
    project_id: p.project_id,
    name: p.name,
    remaining_rub: p.remaining_rub,
    status: p.status,
  }));
  const one_time_total = one_time_expenses.reduce((s, e) => s + e.amount_rub, 0);
  const planned_incomes_total = planned_incomes.reduce((s, p) => s + p.remaining_rub, 0);
  const days_in_month = new Date(year, month, 0).getDate();
  const days_left = remainingDaysInMonth(year, month);

  return {
    year,
    month,
    disposable,
    daily_spend_rub: budget.daily_spend_rub,
    days_in_month,
    days_left,
    one_time_expenses,
    one_time_total,
    planned_incomes,
    planned_incomes_total,
  };
}

export async function createForecastExtraExpense(
  ctx: V2SessionContext,
  input: { year: number; month: number; label?: string; amount_rub: number }
): Promise<PersonalForecastExtraExpenseRow> {
  const { year, month } = input;
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new PersonalFinanceValidationError("Некорректный месяц");
  }
  const amount = Number(input.amount_rub);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PersonalFinanceValidationError("Укажите сумму доп. расхода");
  }
  const userId = uid(ctx);
  await ensureBudgetMonth(userId, year, month);
  const sb = getV2Supabase();
  const existing = await listForecastExtras(userId, year, month);
  const row = {
    id: newV2Id(),
    user_id: userId,
    year,
    month,
    label: (input.label ?? "").trim() || "Доп. расход",
    amount_rub: Math.round(amount),
    sort_order: existing.length,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const { error } = await sb.from("v2_personal_forecast_extra_expenses").insert(row);
  if (error) {
    const msg = error.message || "";
    if (/does not exist|schema cache|Could not find the table/i.test(msg)) {
      throw new PersonalFinanceValidationError(
        "Таблица разовых трат ещё не создана в БД. Примените миграцию 029_v2_personal_forecast_expenses.sql в Supabase."
      );
    }
    throw error;
  }
  return mapForecastExtra(row);
}

export async function updateForecastExtraExpense(
  ctx: V2SessionContext,
  id: string,
  patch: { label?: string; amount_rub?: number }
): Promise<PersonalForecastExtraExpenseRow> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const safe: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.label !== undefined) safe.label = patch.label.trim() || "Доп. расход";
  if (patch.amount_rub !== undefined) {
    if (!Number.isFinite(patch.amount_rub) || patch.amount_rub < 0) {
      throw new PersonalFinanceValidationError("Некорректная сумма");
    }
    safe.amount_rub = Math.round(patch.amount_rub);
  }
  const { data, error } = await sb
    .from("v2_personal_forecast_extra_expenses")
    .update(safe)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalFinanceValidationError("Расход не найден");
  return mapForecastExtra(data as Record<string, unknown>);
}

export async function deleteForecastExtraExpense(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_forecast_extra_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
}

export const DEFAULT_LIFE_EXPENSES_RUB = 200_000;
export const DEFAULT_FUNDS_RUB = 22_000;

const DEFAULT_FINANCE_GOALS: Array<{
  goal_key: string;
  title: string;
  hint: string;
  target_rub: number;
  sort_order: number;
}> = [
  {
    goal_key: "cushion_min",
    title: "Подушка №1 (минимальная)",
    hint: "3 месяца защитной жизни",
    target_rub: 510_000,
    sort_order: 0,
  },
  {
    goal_key: "cushion_goal",
    title: "Подушка №2 (цель)",
    hint: "запас сверх минимума",
    target_rub: 1_000_000,
    sort_order: 1,
  },
  {
    goal_key: "moscow",
    title: "Москва",
    hint: "переезд: первый, последний, комиссия, логистика",
    target_rub: 250_000,
    sort_order: 2,
  },
  {
    goal_key: "china",
    title: "Китай",
    hint: "ждёт очереди, потом закрывается быстро",
    target_rub: 300_000,
    sort_order: 3,
  },
];

function mapFinanceSystem(r: Record<string, unknown>): PersonalFinanceSystemRow {
  return {
    user_id: String(r.user_id),
    life_expenses_rub: Number(r.life_expenses_rub) || 0,
    funds_rub: Number(r.funds_rub) || 0,
    moscow_job_stable: r.moscow_job_stable !== false,
  };
}

function mapFinanceGoal(r: Record<string, unknown>): PersonalFinanceGoalRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    goal_key: r.goal_key ? String(r.goal_key) : null,
    title: String(r.title),
    hint: r.hint ? String(r.hint) : "",
    target_rub: Number(r.target_rub) || 0,
    sort_order: Number(r.sort_order) || 0,
  };
}

const DEFAULT_FINANCE_FUNDS: Array<{
  fund_key: string;
  name: string;
  monthly_hint: string | null;
  icon_key: string;
  accent: string;
  sort_order: number;
}> = [
  {
    fund_key: "life",
    name: "Траты на жизнь",
    monthly_hint: "150 000 ₽ каждый месяц",
    icon_key: "wallet",
    accent: "#10B981",
    sort_order: 0,
  },
  {
    fund_key: "salary",
    name: "Фонд зарплат",
    monthly_hint: "50 000 ₽ каждый месяц",
    icon_key: "bank",
    accent: "#3B6FF7",
    sort_order: 1,
  },
  {
    fund_key: "cushion",
    name: "Подушка безопасности",
    monthly_hint: null,
    icon_key: "shield",
    accent: "#6366F1",
    sort_order: 2,
  },
  {
    fund_key: "clothing",
    name: "Фонд одежды",
    monthly_hint: "5 000 ₽ каждый месяц",
    icon_key: "target",
    accent: "#9A8CFF",
    sort_order: 3,
  },
  {
    fund_key: "gifts",
    name: "Подарки и праздники",
    monthly_hint: "10 000 ₽ каждый месяц",
    icon_key: "target",
    accent: "#FF335F",
    sort_order: 4,
  },
  {
    fund_key: "lera",
    name: "Фонд сюрпризов Лере",
    monthly_hint: null,
    icon_key: "coin",
    accent: "#F472B6",
    sort_order: 5,
  },
  {
    fund_key: "moscow",
    name: "Фонд Москва",
    monthly_hint: null,
    icon_key: "flag",
    accent: "#0EA5E9",
    sort_order: 6,
  },
  {
    fund_key: "china",
    name: "Фонд Китай",
    monthly_hint: null,
    icon_key: "coin",
    accent: "#EF4444",
    sort_order: 7,
  },
  {
    fund_key: "rent_deposit",
    name: "Фонд залог за квартиру",
    monthly_hint: null,
    icon_key: "key",
    accent: "#78716C",
    sort_order: 8,
  },
];

function mapFinanceFundRow(r: Record<string, unknown>): PersonalFinanceFundRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    fund_key: r.fund_key ? String(r.fund_key) : null,
    name: String(r.name),
    amount_rub: Number(r.amount_rub) || 0,
    source_account_id: r.source_account_id ? String(r.source_account_id) : null,
    source_account_name: null,
    monthly_hint: r.monthly_hint ? String(r.monthly_hint) : null,
    icon_key: String(r.icon_key || "coin"),
    accent: String(r.accent || "#F59E0B"),
    sort_order: Number(r.sort_order) || 0,
  };
}

export async function ensureFinanceFunds(userId: string): Promise<PersonalFinanceFundRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_finance_funds")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", FINANCE_CARD_ORDER)
    .order("id", FINANCE_CARD_ORDER);
  if (error) throw error;

  const existingKeys = new Set((data ?? []).map((r) => String(r.fund_key ?? "")).filter(Boolean));
  const missing = DEFAULT_FINANCE_FUNDS.filter((f) => !existingKeys.has(f.fund_key));
  if (missing.length) {
    const ts = nowIso();
    const inserts = missing.map((f) => ({
      id: newV2Id(),
      user_id: userId,
      fund_key: f.fund_key,
      name: f.name,
      amount_rub: 0,
      source_account_id: null,
      monthly_hint: f.monthly_hint,
      icon_key: f.icon_key,
      accent: f.accent,
      sort_order: f.sort_order,
      created_at: ts,
      updated_at: ts,
    }));
    const { error: insErr } = await sb.from("v2_personal_finance_funds").insert(inserts);
    if (insErr && !String(insErr.message).includes("duplicate")) throw insErr;
  }

  const { data: again, error: againErr } = await sb
    .from("v2_personal_finance_funds")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", FINANCE_CARD_ORDER)
    .order("id", FINANCE_CARD_ORDER);
  if (againErr) throw againErr;
  return (again ?? []).map((r) => mapFinanceFundRow(r as Record<string, unknown>));
}

export async function updatePersonalFinanceFund(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<{
    amount_rub: number;
    source_account_id: string | null;
    name: string;
    monthly_hint: string | null;
  }>
): Promise<PersonalFinanceFundRow | null> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const safe: Record<string, unknown> = { updated_at: nowIso() };

  if (patch.amount_rub !== undefined) {
    const n = Number(patch.amount_rub);
    if (!Number.isFinite(n) || n < 0) throw new PersonalFinanceValidationError("Некорректная сумма фонда");
    safe.amount_rub = Math.round(n);
  }
  if (patch.source_account_id !== undefined) {
    if (patch.source_account_id === null || patch.source_account_id === "") {
      safe.source_account_id = null;
    } else {
      const { data: acc } = await sb
        .from("v2_personal_accounts")
        .select("id")
        .eq("id", patch.source_account_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!acc) throw new PersonalFinanceValidationError("Счёт-источник не найден");
      safe.source_account_id = patch.source_account_id;
    }
  }
  if (patch.name !== undefined) safe.name = String(patch.name).trim() || "Фонд";
  if (patch.monthly_hint !== undefined) {
    safe.monthly_hint = patch.monthly_hint?.trim() || null;
  }

  if (Object.keys(safe).length === 1) {
    const { data } = await sb
      .from("v2_personal_finance_funds")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    return data ? mapFinanceFundRow(data as Record<string, unknown>) : null;
  }

  const { error } = await sb
    .from("v2_personal_finance_funds")
    .update(safe)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;

  const { data } = await sb
    .from("v2_personal_finance_funds")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  let source_account_name: string | null = null;
  const sourceId = data.source_account_id ? String(data.source_account_id) : null;
  if (sourceId) {
    const { data: acc } = await sb.from("v2_personal_accounts").select("name").eq("id", sourceId).maybeSingle();
    source_account_name = acc?.name ? String(acc.name) : null;
  }

  return { ...mapFinanceFundRow(data as Record<string, unknown>), source_account_name };
}

export async function ensureFinanceSystem(userId: string): Promise<PersonalFinanceSystemRow> {
  const sb = getV2Supabase();
  const { data } = await sb
    .from("v2_personal_finance_system")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return mapFinanceSystem(data as Record<string, unknown>);
  const row = {
    user_id: userId,
    life_expenses_rub: DEFAULT_LIFE_EXPENSES_RUB,
    funds_rub: DEFAULT_FUNDS_RUB,
    moscow_job_stable: true,
    updated_at: nowIso(),
  };
  const { error } = await sb.from("v2_personal_finance_system").insert(row);
  if (error && !String(error.message).includes("duplicate")) throw error;
  const { data: again } = await sb
    .from("v2_personal_finance_system")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (again) return mapFinanceSystem(again as Record<string, unknown>);
  return {
    user_id: userId,
    life_expenses_rub: DEFAULT_LIFE_EXPENSES_RUB,
    funds_rub: DEFAULT_FUNDS_RUB,
    moscow_job_stable: true,
  };
}

export async function ensureFinanceGoals(userId: string): Promise<PersonalFinanceGoalRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_finance_goals")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  if (error) throw error;
  if (data && data.length > 0) {
    return data.map((r) => mapFinanceGoal(r as Record<string, unknown>));
  }
  const inserts = DEFAULT_FINANCE_GOALS.map((g) => ({
    id: newV2Id(),
    user_id: userId,
    goal_key: g.goal_key,
    title: g.title,
    hint: g.hint,
    target_rub: g.target_rub,
    sort_order: g.sort_order,
    created_at: nowIso(),
    updated_at: nowIso(),
  }));
  const { error: insErr } = await sb.from("v2_personal_finance_goals").insert(inserts);
  if (insErr && !String(insErr.message).includes("duplicate")) throw insErr;
  const { data: again } = await sb
    .from("v2_personal_finance_goals")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  return (again ?? inserts).map((r) => mapFinanceGoal(r as Record<string, unknown>));
}

export async function updateFinanceSystem(
  ctx: V2SessionContext,
  patch: Partial<{
    life_expenses_rub: number;
    funds_rub: number;
    moscow_job_stable: boolean;
  }>
): Promise<PersonalFinanceSystemRow> {
  const userId = uid(ctx);
  await ensureFinanceSystem(userId);
  const safe: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.life_expenses_rub != null) {
    const n = Number(patch.life_expenses_rub);
    if (!Number.isFinite(n) || n < 0) throw new PersonalFinanceValidationError("Проверьте сумму жизни");
    safe.life_expenses_rub = Math.round(n);
  }
  if (patch.funds_rub != null) {
    const n = Number(patch.funds_rub);
    if (!Number.isFinite(n) || n < 0) throw new PersonalFinanceValidationError("Проверьте сумму фондов");
    safe.funds_rub = Math.round(n);
  }
  if (typeof patch.moscow_job_stable === "boolean") {
    safe.moscow_job_stable = patch.moscow_job_stable;
  }
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_finance_system")
    .update(safe)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalFinanceValidationError("Настройки не найдены");
  return mapFinanceSystem(data as Record<string, unknown>);
}

export async function createFinanceGoal(
  ctx: V2SessionContext,
  input: { title: string; hint?: string; target_rub: number }
): Promise<PersonalFinanceGoalRow> {
  const title = String(input.title ?? "").trim();
  if (!title) throw new PersonalFinanceValidationError("Название цели обязательно");
  const target = Number(input.target_rub);
  if (!Number.isFinite(target) || target < 0) {
    throw new PersonalFinanceValidationError("Проверьте сумму цели");
  }
  const userId = uid(ctx);
  const existing = await ensureFinanceGoals(userId);
  const sort_order = existing.reduce((m, g) => Math.max(m, g.sort_order), -1) + 1;
  const row = {
    id: newV2Id(),
    user_id: userId,
    goal_key: null as string | null,
    title,
    hint: String(input.hint ?? "").trim(),
    target_rub: Math.round(target),
    sort_order,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_finance_goals").insert(row);
  if (error) throw error;
  return mapFinanceGoal(row);
}

export async function updateFinanceGoal(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<{ title: string; hint: string; target_rub: number }>
): Promise<PersonalFinanceGoalRow> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const safe: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.title != null) {
    const title = String(patch.title).trim();
    if (!title) throw new PersonalFinanceValidationError("Название цели обязательно");
    safe.title = title;
  }
  if (patch.hint != null) safe.hint = String(patch.hint).trim();
  if (patch.target_rub != null) {
    const n = Number(patch.target_rub);
    if (!Number.isFinite(n) || n < 0) throw new PersonalFinanceValidationError("Проверьте сумму цели");
    safe.target_rub = Math.round(n);
  }
  const { data, error } = await sb
    .from("v2_personal_finance_goals")
    .update(safe)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalFinanceValidationError("Цель не найдена");
  return mapFinanceGoal(data as Record<string, unknown>);
}

export async function deleteFinanceGoal(ctx: V2SessionContext, id: string): Promise<void> {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_finance_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
}
