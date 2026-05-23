-- Этапы проекта (только для разовых one_off; постоянные без этапов).

CREATE TABLE IF NOT EXISTS v2_project_phases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES v2_projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_project_phases_project ON v2_project_phases (project_id, sort_order);

ALTER TABLE v2_tasks
  ADD COLUMN IF NOT EXISTS phase_id TEXT REFERENCES v2_project_phases (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_v2_tasks_phase ON v2_tasks (phase_id) WHERE phase_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE v2_project_phases ENABLE ROW LEVEL SECURITY;
