-- 015 — статус проекта «завершён, не оплачен» (работа сдана, оплата ожидается).

ALTER TABLE v2_projects DROP CONSTRAINT IF EXISTS v2_projects_status_check;

ALTER TABLE v2_projects
  ADD CONSTRAINT v2_projects_status_check
  CHECK (status IN (
    'not_started',
    'in_progress',
    'approval',
    'completed_unpaid',
    'completed',
    'paused'
  ));
