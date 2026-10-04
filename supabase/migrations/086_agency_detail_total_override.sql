-- Ручная сумма строки детализации: важнее qty×price и часы×ставка.

ALTER TABLE agency_project_detail
  ADD COLUMN IF NOT EXISTS total_override_rub DOUBLE PRECISION;

COMMENT ON COLUMN agency_project_detail.total_override_rub IS
  'Ручная сумма строки в ₽; если задана — важнее формулы qty×price / часы×ставка';
