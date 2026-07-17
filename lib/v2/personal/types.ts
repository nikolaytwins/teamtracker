export type PersonalAccountType = "card" | "cash" | "bank" | "cushion" | "goal" | "other";
export type PersonalIncomeStatus = "expected" | "received";
export type PersonalTxnType = "income" | "expense" | "transfer";

export type PersonalAccountRow = {
  id: string;
  user_id: string;
  name: string;
  account_type: PersonalAccountType;
  icon_key: string;
  accent: string;
  balance_rub: number;
  note: string | null;
  disposable: boolean;
  goal_amount_rub: number | null;
  sort_order: number;
};

export type PersonalCapitalRow = {
  id: string;
  user_id: string;
  name: string;
  icon_key: string;
  amount_rub: number;
  meta: string | null;
  unit_label: string | null;
  tint: string | null;
  sort_order: number;
};

export type PersonalIncomeRow = {
  id: string;
  user_id: string;
  brand_key: string;
  title: string;
  amount_rub: number;
  status: PersonalIncomeStatus;
  event_date: string | null;
  date_label: string | null;
  year: number;
  month: number;
};

export type PersonalTaxProfileRow = {
  user_id: string;
  scheme: string;
  /** Выручка за год, ₽ */
  year_income_rub: number;
  tax_rate: number;
  /** Фиксированные взносы за год, ₽ */
  insurance_rub: number;
  insurance_deduction_rub: number;
  paid_advances_rub: number;
  /** Стоимость патента за год, ₽ */
  patent_cost_rub: number;
  /** Порог выручки для налога 1% (по умолчанию 300 000) */
  revenue_threshold_rub: number;
  /** Ставка налога с выручки сверх порога (по умолчанию 0.01) */
  revenue_rate: number;
};

export type PersonalTaxAdvanceRow = {
  id: string;
  user_id: string;
  label: string;
  amount_rub: number;
  advance_date: string | null;
  planned: boolean;
  sort_order: number;
};

export type PersonalBudgetMonthRow = {
  user_id: string;
  year: number;
  month: number;
  limit_rub: number;
  /** Базовые ожидаемые расходы для прогноза (по умолчанию 180 000) */
  expected_expenses_rub: number;
};

export type PersonalForecastExtraExpenseRow = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  label: string;
  amount_rub: number;
  sort_order: number;
};

export type PersonalBudgetCategoryRow = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  name: string;
  limit_rub: number;
  spent_rub: number;
  tint: string;
  sort_order: number;
};

export type PersonalTransactionRow = {
  id: string;
  user_id: string;
  txn_date: string;
  txn_type: PersonalTxnType;
  amount_rub: number;
  category: string | null;
  description: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  budget_category_id: string | null;
  year: number;
  month: number;
  external_id: string | null;
  import_batch_id: string | null;
  created_at: string;
  /** Joined for UI */
  from_account_name?: string | null;
  to_account_name?: string | null;
  budget_category_name?: string | null;
  budget_category_tint?: string | null;
};

export type PersonalMonthSnapshotRow = {
  user_id: string;
  year: number;
  month: number;
  capital_total_rub: number;
  earned_rub: number;
  spent_rub: number;
};

export type PersonalIncomeHistoryRow = {
  user_id: string;
  year: number;
  month: number;
  accounts_total_rub: number;
  earned_rub: number | null;
  profit_rub: number | null;
  spent_rub: number | null;
};

export type PersonalFinanceDashboard = {
  year: number;
  month: number;
  accounts: PersonalAccountRow[];
  capital: PersonalCapitalRow[];
  incomes: PersonalIncomeRow[];
  tax: PersonalTaxProfileRow;
  taxAdvances: PersonalTaxAdvanceRow[];
  budget: PersonalBudgetMonthRow;
  budgetCategories: PersonalBudgetCategoryRow[];
  forecastExtras: PersonalForecastExtraExpenseRow[];
  /** Снапшоты для совместимости (графики/hero) */
  history: PersonalMonthSnapshotRow[];
  /** История дохода — та же, что во вкладке «История дохода» */
  incomeHistory: PersonalIncomeHistoryRow[];
  summary: {
    disposable: number;
    reserves: number;
    capitalSum: number;
    netWorth: number;
    incomeExpected: number;
    incomeReceived: number;
    incomePending: number;
    /** Выручка проектов месяца (Проекты и финансы) */
    projectExpectedRevenue: number;
    projectActualRevenue: number;
    projectCount: number;
    /** Прибыль месяца из «Проекты и финансы» / истории */
    monthProfit: number;
    /** Средняя прибыль за прошлые 6 месяцев */
    avgProfit6m: number;
    /** @deprecated — то же, что avgProfit6m */
    avgIncome6m: number;
    /** Динамика капитала с начала года, ₽ */
    capitalYearDelta: number | null;
    taxAccrued: number;
    taxRemaining: number;
    /** ПСН, шаг 1 — фиксированные взносы за год */
    taxFixedContributions: number;
    /** ПСН, шаг 1 — оплаченные взносы (сумма списка) */
    taxPaidContributions: number;
    /** ПСН, шаг 2 — налог с выручки: max(выручка − порог, 0) × ставка */
    taxRevenueTax: number;
    /** ПСН, шаг 3 — стоимость патента */
    taxPatentCost: number;
    /** ПСН, шаг 3 — остаток патента после вычета (шаг1 + шаг2), не меньше 0 */
    taxPatentRemaining: number;
    budgetSpent: number;
    budgetLeft: number;
    /** База + доп. ожидаемые расходы месяца */
    expectedExpenses: number;
    /** Ожидаемая прибыль − ожидаемые расходы */
    forecastDelta: number;
    /** Капитал после месяца: netWorth + forecastDelta */
    expectedCapital: number;
    /** @deprecated — то же, что forecastDelta */
    forecastEnd: number;
  };
};
