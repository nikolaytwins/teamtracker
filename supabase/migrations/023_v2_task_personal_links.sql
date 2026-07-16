-- 023 — связь задач проекта с личными todos + nullable priority для бэклога.

ALTER TABLE v2_tasks
  ALTER COLUMN priority DROP NOT NULL,
  ALTER COLUMN priority DROP DEFAULT;

ALTER TABLE v2_tasks DROP CONSTRAINT IF EXISTS v2_tasks_priority_check;
ALTER TABLE v2_tasks
  ADD CONSTRAINT v2_tasks_priority_check
  CHECK (priority IS NULL OR priority IN ('urgent', 'high', 'medium', 'low'));

CREATE TABLE IF NOT EXISTS v2_task_personal_links (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  project_task_id TEXT NOT NULL REFERENCES v2_tasks (id) ON DELETE CASCADE,
  personal_todo_id TEXT NOT NULL REFERENCES v2_personal_todos (id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_task_personal_links_task_uid UNIQUE (project_task_id),
  CONSTRAINT v2_task_personal_links_todo_uid UNIQUE (personal_todo_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_task_personal_links_workspace
  ON v2_task_personal_links (workspace_id);

CREATE INDEX IF NOT EXISTS idx_v2_task_personal_links_todo
  ON v2_task_personal_links (personal_todo_id);

ALTER TABLE v2_task_personal_links ENABLE ROW LEVEL SECURITY;
