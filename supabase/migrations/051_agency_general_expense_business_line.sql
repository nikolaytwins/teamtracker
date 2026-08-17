-- 051 — Направление у общих расходов: агентство / импульс / qmagic.
-- Все существующие расходы остаются за агентством.

ALTER TABLE agency_general_expense
  ADD COLUMN IF NOT EXISTS business_line TEXT NOT NULL DEFAULT 'agency';

UPDATE agency_general_expense
SET business_line = 'agency'
WHERE business_line IS NULL OR business_line NOT IN ('agency', 'impulse', 'qmagic');

CREATE INDEX IF NOT EXISTS idx_agency_general_expense_business_line
  ON agency_general_expense (business_line, created_at DESC);

COMMENT ON COLUMN agency_general_expense.business_line IS 'Направление расхода: agency | impulse | qmagic';
