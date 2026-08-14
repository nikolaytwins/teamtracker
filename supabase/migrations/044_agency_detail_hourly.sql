-- 044 — Почасовые строки детализации агентства + ставка часа на проекте.

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS hourly_rate_rub DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE agency_project_detail
  ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'fixed';

ALTER TABLE agency_project_detail
  ADD COLUMN IF NOT EXISTS tracked_seconds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE agency_project_detail
  ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

COMMENT ON COLUMN agency_project.hourly_rate_rub IS 'Ставка часа проекта (не показывается в клиентском списке строк)';
COMMENT ON COLUMN agency_project_detail.billing_type IS 'fixed | hourly';
