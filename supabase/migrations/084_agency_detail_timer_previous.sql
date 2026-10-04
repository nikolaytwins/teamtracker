-- 084 — Снимок часов до последнего старта таймера в детализации.

ALTER TABLE agency_project_detail
  ADD COLUMN IF NOT EXISTS timer_previous_seconds INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN agency_project_detail.timer_previous_seconds IS
  'tracked_seconds на момент последнего старта таймера — чтобы откатить забытый запуск';
