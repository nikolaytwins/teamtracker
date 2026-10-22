-- 095 — Постоянные проекты выручки: автокопирование по месяцам + общая клиентская ссылка

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN agency_project.is_recurring IS
  'Постоянный проект: при открытии следующего месяца создаётся копия; client_share_token общий для серии месяцев.';

CREATE INDEX IF NOT EXISTS idx_agency_project_is_recurring
  ON agency_project (is_recurring)
  WHERE is_recurring = TRUE;
