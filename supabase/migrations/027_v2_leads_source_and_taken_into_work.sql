-- 027 — источник лида и дата «взяли в работу» для аналитики.

ALTER TABLE v2_leads
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT '';

ALTER TABLE v2_leads
  ADD COLUMN IF NOT EXISTS source_custom TEXT;

ALTER TABLE v2_leads
  ADD COLUMN IF NOT EXISTS taken_into_work_at DATE;

COMMENT ON COLUMN v2_leads.source IS 'Источник: regular | referral | profi_ru | custom | пусто';
COMMENT ON COLUMN v2_leads.source_custom IS 'Свой источник, если source = custom';
COMMENT ON COLUMN v2_leads.taken_into_work_at IS 'Дата, когда лид взяли в работу (конверсия)';

CREATE INDEX IF NOT EXISTS idx_v2_leads_workspace_created
  ON v2_leads (workspace_id, created_at)
  WHERE archived_at IS NULL;
