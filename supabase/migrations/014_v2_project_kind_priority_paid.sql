-- 014 — вид проекта (сайт/презентация/мелкая задача), приоритет и оплаченная сумма.

ALTER TABLE v2_projects
  ADD COLUMN IF NOT EXISTS project_kind TEXT
    CHECK (project_kind IS NULL OR project_kind IN ('site', 'presentation', 'small_task'));

ALTER TABLE v2_projects
  ADD COLUMN IF NOT EXISTS paid_rub INTEGER;

ALTER TABLE v2_projects
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('urgent', 'high', 'medium', 'low'));
