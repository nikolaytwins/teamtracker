-- 019 — v2 личный планировщик задач (Todoist-like, per user_id).

CREATE TABLE IF NOT EXISTS v2_personal_todo_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B6FF7',
  icon_key TEXT NOT NULL DEFAULT 'folder',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_inbox BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_todo_projects_user
  ON v2_personal_todo_projects (user_id, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_personal_todo_projects_inbox
  ON v2_personal_todo_projects (user_id)
  WHERE is_inbox = TRUE;

CREATE TABLE IF NOT EXISTS v2_personal_todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT REFERENCES v2_personal_todo_projects (id) ON DELETE SET NULL,
  parent_id TEXT REFERENCES v2_personal_todos (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  due_time TIME,
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_personal_todos_user_active
  ON v2_personal_todos (user_id, sort_order)
  WHERE deleted_at IS NULL AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_personal_todos_user_scheduled
  ON v2_personal_todos (user_id, scheduled_date)
  WHERE deleted_at IS NULL AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_personal_todos_user_due
  ON v2_personal_todos (user_id, due_date)
  WHERE deleted_at IS NULL AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_personal_todos_project
  ON v2_personal_todos (project_id, sort_order)
  WHERE deleted_at IS NULL AND parent_id IS NULL;

ALTER TABLE v2_personal_todo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_personal_todos ENABLE ROW LEVEL SECURITY;
