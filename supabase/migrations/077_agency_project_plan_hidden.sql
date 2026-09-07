-- 077 — Скрытие проекта из канбана/списка Плана (не удаление)

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS plan_hidden BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN agency_project.plan_hidden IS
  'Скрыт из канбана/списка на странице План; финансы и календарные слоты не трогает.';

CREATE INDEX IF NOT EXISTS idx_agency_project_plan_hidden
  ON agency_project (plan_hidden)
  WHERE plan_hidden = true;
