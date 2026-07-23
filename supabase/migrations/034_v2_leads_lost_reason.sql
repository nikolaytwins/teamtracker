-- 034 — причина и дата слива лида (для аналитики и месячного канбана).

ALTER TABLE v2_leads
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

ALTER TABLE v2_leads
  ADD COLUMN IF NOT EXISTS lost_at DATE;

COMMENT ON COLUMN v2_leads.lost_reason IS 'Причина слива — для последующего анализа';
COMMENT ON COLUMN v2_leads.lost_at IS 'Дата перевода в статус «Слив» (фильтр канбана по месяцам)';

CREATE INDEX IF NOT EXISTS idx_v2_leads_lost_at
  ON v2_leads (workspace_id, lost_at)
  WHERE lost_at IS NOT NULL AND archived_at IS NULL;
