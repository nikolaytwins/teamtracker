-- 018 — v2 личные финансы (per user_id, отдельно от agency и v2_finance).

CREATE TABLE IF NOT EXISTS v2_personal_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'card',
  icon_key TEXT NOT NULL DEFAULT 'wallet',
  accent TEXT NOT NULL DEFAULT '#3B6FF7',
  balance_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  note TEXT,
  disposable BOOLEAN NOT NULL DEFAULT TRUE,
  goal_amount_rub DOUBLE PRECISION,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_accounts_user
  ON v2_personal_accounts (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_personal_capital_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL DEFAULT 'coin',
  amount_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  meta TEXT,
  unit_label TEXT,
  tint TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_capital_user
  ON v2_personal_capital_items (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_personal_incomes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_key TEXT NOT NULL DEFAULT 'studio',
  title TEXT NOT NULL,
  amount_rub DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'expected',
  event_date DATE,
  date_label TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_incomes_user_month
  ON v2_personal_incomes (user_id, year, month);

CREATE TABLE IF NOT EXISTS v2_personal_tax_profile (
  user_id TEXT PRIMARY KEY,
  scheme TEXT NOT NULL DEFAULT 'ИП · УСН «Доходы» 6 %',
  year_income_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0.06,
  insurance_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  insurance_deduction_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  paid_advances_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_personal_tax_advances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  amount_rub DOUBLE PRECISION NOT NULL,
  advance_date TEXT,
  planned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_tax_advances_user
  ON v2_personal_tax_advances (user_id, sort_order);

CREATE TABLE IF NOT EXISTS v2_personal_budget_months (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  limit_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year, month)
);

CREATE TABLE IF NOT EXISTS v2_personal_budget_categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  name TEXT NOT NULL,
  limit_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  spent_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  tint TEXT NOT NULL DEFAULT '#3B6FF7',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_budget_cat_user_month
  ON v2_personal_budget_categories (user_id, year, month);

CREATE TABLE IF NOT EXISTS v2_personal_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  txn_date TIMESTAMPTZ NOT NULL,
  txn_type TEXT NOT NULL,
  amount_rub DOUBLE PRECISION NOT NULL,
  category TEXT,
  description TEXT,
  from_account_id TEXT REFERENCES v2_personal_accounts (id) ON DELETE SET NULL,
  to_account_id TEXT REFERENCES v2_personal_accounts (id) ON DELETE SET NULL,
  budget_category_id TEXT REFERENCES v2_personal_budget_categories (id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_txn_user_month
  ON v2_personal_transactions (user_id, year, month);

CREATE TABLE IF NOT EXISTS v2_personal_month_snapshots (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  capital_total_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  earned_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  spent_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year, month)
);

ALTER TABLE v2_personal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_capital_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_tax_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_tax_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_budget_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_month_snapshots ENABLE ROW LEVEL SECURITY;
