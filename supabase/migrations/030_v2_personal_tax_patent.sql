-- 030 — налоги ИП на патенте (ПСН): стоимость патента + порог/ставка налога с выручки.

ALTER TABLE v2_personal_tax_profile
  ADD COLUMN IF NOT EXISTS patent_cost_rub DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE v2_personal_tax_profile
  ADD COLUMN IF NOT EXISTS revenue_threshold_rub DOUBLE PRECISION NOT NULL DEFAULT 300000;

ALTER TABLE v2_personal_tax_profile
  ADD COLUMN IF NOT EXISTS revenue_rate DOUBLE PRECISION NOT NULL DEFAULT 0.01;

COMMENT ON COLUMN v2_personal_tax_profile.patent_cost_rub IS 'Стоимость патента за год, ₽';
COMMENT ON COLUMN v2_personal_tax_profile.revenue_threshold_rub IS 'Порог выручки, свыше которого берётся 1% (по умолчанию 300 000)';
COMMENT ON COLUMN v2_personal_tax_profile.revenue_rate IS 'Ставка налога с выручки сверх порога (по умолчанию 0.01)';

-- Переиспользуем существующие поля под ПСН:
--   year_income_rub    = выручка за год
--   insurance_rub      = фиксированные взносы за год
-- Оплаченные взносы ведём списком в v2_personal_tax_advances (label + amount + date).
