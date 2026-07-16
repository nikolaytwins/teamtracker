-- 025 — ориентировочная сумма у лидов.

ALTER TABLE v2_leads
  ADD COLUMN IF NOT EXISTS estimated_amount INTEGER;

COMMENT ON COLUMN v2_leads.estimated_amount IS 'Ориентировочная сумма сделки, ₽';
