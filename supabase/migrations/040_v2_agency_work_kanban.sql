-- 040: канбан работ по проектам агентства (статусы + внутренние карточки без финансов).

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS work_status TEXT NOT NULL DEFAULT 'not_started';

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS kanban_sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE agency_project
  DROP CONSTRAINT IF EXISTS agency_project_work_status_check;

ALTER TABLE agency_project
  ADD CONSTRAINT agency_project_work_status_check
  CHECK (work_status IN (
    'not_started',
    'waiting_info',
    'in_progress',
    'needs_pm',
    'on_approval',
    'completed'
  ));

COMMENT ON COLUMN agency_project.work_status IS 'Статус работ на канбане (не путать с оплатой status)';
COMMENT ON COLUMN agency_project.kanban_sort_order IS 'Порядок карточки внутри колонки канбана';

CREATE INDEX IF NOT EXISTS idx_agency_project_work_status
  ON agency_project (work_status, kanban_sort_order);

-- Внутренние карточки канбана без записи в «Проекты и финансы».
CREATE TABLE IF NOT EXISTS v2_agency_kanban_internal (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  work_status TEXT NOT NULL DEFAULT 'not_started',
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_agency_kanban_internal_work_status_check
    CHECK (work_status IN (
      'not_started',
      'waiting_info',
      'in_progress',
      'needs_pm',
      'on_approval',
      'completed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_v2_agency_kanban_internal_ws_status
  ON v2_agency_kanban_internal (workspace_id, work_status, sort_order);

ALTER TABLE v2_agency_kanban_internal ENABLE ROW LEVEL SECURITY;
