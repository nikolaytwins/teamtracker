import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { DEFAULT_BUDGET_CATEGORIES } from "@/lib/v2/personal/formatters";
import type {
  PersonalAccountRow,
  PersonalBudgetCategoryRow,
  PersonalBudgetMonthRow,
  PersonalCapitalRow,
  PersonalFinanceDashboard,
  PersonalIncomeRow,
  PersonalMonthSnapshotRow,
  PersonalTaxAdvanceRow,
  PersonalTaxProfileRow,
  PersonalTxnType,
} from "@/lib/v2/personal/types";
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

function mapAccount(r: Record<string, unknown>): PersonalAccountRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    name: String(r.name),
    account_type: String(r.account_type) as PersonalAccountRow["account_type"],
    icon_key: String(r.icon_key),
    accent: String(r.accent),
    balance_rub: Number(r.balance_rub) || 0,
    note: r.note ? String(r.note) : null,
    disposable: Boolean(r.disposable),
    goal_amount_rub: r.goal_amount_rub == null ? null : Number(r.goal_amount_rub),
    sort_order: Number(r.sort_order) || 0,
  };
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
    };
  }
  const row = {
    user_id: userId,
    scheme: "ИП · УСН «Доходы» 6 %",
    year_income_rub: 0,
    tax_rate: 0.06,
    insurance_rub: 49500,
    insurance_deduction_rub: 49500,
    paid_advances_rub: 0,
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
    };
  }
  const limit = DEFAULT_BUDGET_CATEGORIES.reduce((s, c) => s + c.limit, 0);
  const row = { user_id: userId, year, month, limit_rub: limit, updated_at: nowIso() };
  await sb.from("v2_personal_budget_months").insert(row);
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
  return row;
}

function buildSummary(
  accounts: PersonalAccountRow[],
  capital: PersonalCapitalRow[],
  incomes: PersonalIncomeRow[],
  tax: PersonalTaxProfileRow,
  budget: PersonalBudgetMonthRow,
  budgetCategories: PersonalBudgetCategoryRow[]
) {
  const disposable = accounts.filter((a) => a.disposable).reduce((s, a) => s + a.balance_rub, 0);
  const reserves = accounts.filter((a) => !a.disposable).reduce((s, a) => s + a.balance_rub, 0);
  const capitalSum = capital.reduce((s, c) => s + c.amount_rub, 0);
  const netWorth = disposable + reserves + capitalSum;
  const incomeExpected = incomes.reduce((s, i) => s + i.amount_rub, 0);
  const incomeReceived = incomes.filter((i) => i.status === "received").reduce((s, i) => s + i.amount_rub, 0);
  const incomePending = incomeExpected - incomeReceived;
  const taxAccrued = tax.year_income_rub * tax.tax_rate;
  const taxRemaining = Math.max(taxAccrued - tax.insurance_deduction_rub - tax.paid_advances_rub, 0);
  const budgetSpent = budgetCategories.reduce((s, c) => s + c.spent_rub, 0);
  const budgetLeft = budget.limit_rub - budgetSpent;
  const forecastEnd = disposable + incomePending - budgetLeft;
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
    budgetSpent,
    budgetLeft,
    forecastEnd,
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

  const tax = await ensureTaxProfile(userId);
  const budget = await ensureBudgetMonth(userId, year, month);

  const [
    accountsRes,
    capitalRes,
    incomesRes,
    advancesRes,
    categoriesRes,
    historyRes,
  ] = await Promise.all([
    sb.from("v2_personal_accounts").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_personal_capital_items").select("*").eq("user_id", userId).order("sort_order"),
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
      .order("year")
      .order("month"),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (capitalRes.error) throw capitalRes.error;
  if (incomesRes.error) throw incomesRes.error;
  if (advancesRes.error) throw advancesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (historyRes.error) throw historyRes.error;

  const accounts = (accountsRes.data ?? []).map((r) => mapAccount(r as Record<string, unknown>));
  const capital = (capitalRes.data ?? []).map((r) => mapCapital(r as Record<string, unknown>));
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
  const budgetCategories = (categoriesRes.data ?? []).map(
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

  const summary = buildSummary(accounts, capital, incomes, tax, budget, budgetCategories);
  await upsertCurrentSnapshot(userId, year, month, summary);

  const historyWithCurrent = [...history.filter((h) => !(h.year === year && h.month === month))];
  historyWithCurrent.push({
    user_id: userId,
    year,
    month,
    capital_total_rub: summary.netWorth,
    earned_rub: summary.incomeReceived,
    spent_rub: summary.budgetSpent,
  });
  historyWithCurrent.sort((a, b) => a.year - b.year || a.month - b.month);

  return {
    year,
    month,
    accounts,
    capital,
    incomes,
    tax,
    taxAdvances,
    budget,
    budgetCategories,
    history: historyWithCurrent,
    summary,
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
  if (patch.goal_amount_rub !== undefined) out.goal_amount_rub = patch.goal_amount_rub;
  if (patch.sort_order !== undefined) out.sort_order = patch.sort_order;
  return out;
}

function capitalPatch(patch: Partial<PersonalCapitalRow>): Partial<PersonalCapitalRow> {
  const out: Partial<PersonalCapitalRow> = {};
  if (patch.name !== undefined) out.name = String(patch.name).trim() || "Актив";
  if (patch.icon_key !== undefined) out.icon_key = patch.icon_key;
  if (patch.amount_rub !== undefined) out.amount_rub = patch.amount_rub;
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
  return out;
}

export async function createPersonalAccount(
  ctx: V2SessionContext,
  input: Partial<PersonalAccountRow>
): Promise<PersonalAccountRow> {
  const sb = getV2Supabase();
  const id = newV2Id();
  const now = nowIso();
  const row = {
    id,
    user_id: uid(ctx),
    name: input.name?.trim() || "Счёт",
    account_type: input.account_type ?? "card",
    icon_key: input.icon_key ?? "wallet",
    accent: input.accent ?? "#3B6FF7",
    balance_rub: input.balance_rub ?? 0,
    note: input.note ?? null,
    disposable: input.disposable ?? true,
    goal_amount_rub: input.goal_amount_rub ?? null,
    sort_order: input.sort_order ?? 0,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_accounts").insert(row);
  if (error) throw error;
  return mapAccount(row);
}

export async function updatePersonalAccount(
  ctx: V2SessionContext,
  id: string,
  patch: Partial<PersonalAccountRow>
): Promise<PersonalAccountRow | null> {
  const sb = getV2Supabase();
  const safe = accountPatch(patch);
  if (Object.keys(safe).length === 0) {
    const { data } = await sb.from("v2_personal_accounts").select("*").eq("id", id).eq("user_id", uid(ctx)).maybeSingle();
    return data ? mapAccount(data as Record<string, unknown>) : null;
  }
  const { error } = await sb
    .from("v2_personal_accounts")
    .update({ ...safe, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
  const { data } = await sb.from("v2_personal_accounts").select("*").eq("id", id).eq("user_id", uid(ctx)).maybeSingle();
  return data ? mapAccount(data as Record<string, unknown>) : null;
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
  const row = {
    id,
    user_id: uid(ctx),
    name: input.name?.trim() || "Актив",
    icon_key: input.icon_key ?? "coin",
    amount_rub: input.amount_rub ?? 0,
    meta: input.meta ?? null,
    unit_label: input.unit_label ?? null,
    tint: input.tint ?? null,
    sort_order: input.sort_order ?? 0,
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
  }
): Promise<void> {
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
    if (!input.from_account_id) throw new PersonalFinanceValidationError("Укажите счёт списания");
    if (!(await ownAccountId(userId, input.from_account_id))) {
      throw new PersonalFinanceValidationError("Счёт списания не найден");
    }
    if (input.budget_category_id && !(await ownBudgetCategoryId(userId, input.budget_category_id, year, month))) {
      throw new PersonalFinanceValidationError("Категория бюджета не найдена");
    }
  }

  if (txn_type === "income") {
    if (!input.to_account_id) throw new PersonalFinanceValidationError("Укажите счёт зачисления");
    if (!(await ownAccountId(userId, input.to_account_id))) {
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
  const id = newV2Id();
  const now = nowIso();
  const { error: insErr } = await sb.from("v2_personal_transactions").insert({
    id,
    user_id: uid(ctx),
    txn_date: now,
    txn_type: input.txn_type,
    amount_rub: input.amount_rub,
    category: null,
    description: input.description ?? null,
    from_account_id: input.from_account_id ?? null,
    to_account_id: input.to_account_id ?? null,
    budget_category_id: input.budget_category_id ?? null,
    year: input.year,
    month: input.month,
    created_at: now,
  });
  if (insErr) throw insErr;

  if (input.txn_type === "expense" && input.from_account_id) {
    const { data: acc } = await sb
      .from("v2_personal_accounts")
      .select("balance_rub")
      .eq("id", input.from_account_id)
      .eq("user_id", uid(ctx))
      .maybeSingle();
    if (acc) {
      await sb
        .from("v2_personal_accounts")
        .update({ balance_rub: Number(acc.balance_rub) - input.amount_rub, updated_at: now })
        .eq("id", input.from_account_id);
    }
    if (input.budget_category_id) {
      const { data: cat } = await sb
        .from("v2_personal_budget_categories")
        .select("spent_rub")
        .eq("id", input.budget_category_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (cat) {
        await sb
          .from("v2_personal_budget_categories")
          .update({ spent_rub: Number(cat.spent_rub) + input.amount_rub, updated_at: now })
          .eq("id", input.budget_category_id)
          .eq("user_id", userId);
      }
    }
  }

  if (input.txn_type === "income" && input.to_account_id) {
    const { data: acc } = await sb
      .from("v2_personal_accounts")
      .select("balance_rub")
      .eq("id", input.to_account_id)
      .eq("user_id", uid(ctx))
      .maybeSingle();
    if (acc) {
      await sb
        .from("v2_personal_accounts")
        .update({ balance_rub: Number(acc.balance_rub) + input.amount_rub, updated_at: now })
        .eq("id", input.to_account_id);
    }
  }

  if (input.txn_type === "transfer" && input.from_account_id && input.to_account_id) {
    const [{ data: fromAcc }, { data: toAcc }] = await Promise.all([
      sb
        .from("v2_personal_accounts")
        .select("balance_rub")
        .eq("id", input.from_account_id)
        .eq("user_id", userId)
        .maybeSingle(),
      sb
        .from("v2_personal_accounts")
        .select("balance_rub")
        .eq("id", input.to_account_id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (fromAcc) {
      await sb
        .from("v2_personal_accounts")
        .update({ balance_rub: Number(fromAcc.balance_rub) - input.amount_rub, updated_at: now })
        .eq("id", input.from_account_id);
    }
    if (toAcc) {
      await sb
        .from("v2_personal_accounts")
        .update({ balance_rub: Number(toAcc.balance_rub) + input.amount_rub, updated_at: now })
        .eq("id", input.to_account_id);
    }
  }
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
