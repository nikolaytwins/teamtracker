-- 029 — прогноз месяца: ожидаемые расходы (база + доп. строки).

ALTER TABLE v2_personal_budget_months
  ADD COLUMN IF NOT EXISTS expected_expenses_rub DOUBLE PRECISION NOT NULL DEFAULT 180000;

COMMENT ON COLUMN v2_personal_budget_months.expected_expenses_rub IS 'Базовые ожидаемые расходы месяца для прогноза, ₽';

CREATE TABLE IF NOT EXISTS v2_personal_forecast_extra_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Доп. расход',
  amount_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_forecast_extra_user_month
  ON v2_personal_forecast_extra_expenses (user_id, year, month, sort_order);

ALTER TABLE v2_personal_forecast_extra_expenses ENABLE ROW LEVEL SECURITY;
