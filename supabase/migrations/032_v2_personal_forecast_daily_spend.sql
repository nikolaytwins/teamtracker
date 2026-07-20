-- 032 — дневной лимит трат для кассового прогноза до конца месяца.

ALTER TABLE v2_personal_budget_months
  ADD COLUMN IF NOT EXISTS daily_spend_rub DOUBLE PRECISION NOT NULL DEFAULT 0;

COMMENT ON COLUMN v2_personal_budget_months.daily_spend_rub IS 'Планируемые траты в день для прогноза остатка к концу месяца, ₽';
