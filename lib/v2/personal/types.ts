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
  year_income_rub: number;
  tax_rate: number;
  insurance_rub: number;
  insurance_deduction_rub: number;
  paid_advances_rub: number;
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
  history: PersonalMonthSnapshotRow[];
  summary: {
    disposable: number;
    reserves: number;
    capitalSum: number;
    netWorth: number;
    incomeExpected: number;
    incomeReceived: number;
    incomePending: number;
    taxAccrued: number;
    taxRemaining: number;
    budgetSpent: number;
    budgetLeft: number;
    forecastEnd: number;
  };
};
