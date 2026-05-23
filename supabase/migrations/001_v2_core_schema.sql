-- 001 — Team Tracker v2: ядро (проекты, задачи, таймер, активность).
-- Cloud-only runtime для /v2/* — без SQLite.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- --- workspace ---
CREATE TABLE IF NOT EXISTS v2_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_workspace_members (
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'designer',
  weekly_hours_norm REAL NOT NULL DEFAULT 40,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_workspace_members_user ON v2_workspace_members (user_id);

-- --- projects ---
CREATE TABLE IF NOT EXISTS v2_projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('team', 'personal')),
  name TEXT NOT NULL,
  short_name TEXT,
  color_tint TEXT,
  color_bg TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('not_started', 'in_progress', 'approval', 'completed', 'paused')),
  owner_user_id TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_projects_workspace ON v2_projects (workspace_id, scope, status);
CREATE INDEX IF NOT EXISTS idx_v2_projects_owner ON v2_projects (owner_user_id);

CREATE TABLE IF NOT EXISTS v2_project_members (
  project_id TEXT NOT NULL REFERENCES v2_projects (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- --- tasks ---
CREATE TABLE IF NOT EXISTS v2_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  project_id TEXT REFERENCES v2_projects (id) ON DELETE SET NULL,
  parent_id TEXT REFERENCES v2_tasks (id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('team', 'personal')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  assignee_user_id TEXT,
  created_by TEXT NOT NULL,
  deadline_at TIMESTAMPTZ,
  estimate_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  inbox_bucket TEXT CHECK (inbox_bucket IS NULL OR inbox_bucket IN ('this_week', 'this_month', 'someday')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_tasks_workspace ON v2_tasks (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_v2_tasks_assignee ON v2_tasks (assignee_user_id, deadline_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_v2_tasks_parent ON v2_tasks (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS v2_tasks_title_trgm ON v2_tasks USING gin (title gin_trgm_ops);

-- --- time sessions ---
CREATE TABLE IF NOT EXISTS v2_time_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES v2_tasks (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_time_sessions_user ON v2_time_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_time_sessions_task ON v2_time_sessions (task_id);
CREATE INDEX IF NOT EXISTS idx_v2_time_sessions_active ON v2_time_sessions (user_id) WHERE ended_at IS NULL;

-- --- activity log ---
CREATE TABLE IF NOT EXISTS v2_activity_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_activity_workspace_created ON v2_activity_log (workspace_id, created_at DESC);

-- Default workspace (идемпотентно)
INSERT INTO v2_workspaces (id, name, slug)
VALUES ('ws-default', 'Студия Северо·Запад', 'studio-nw')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE v2_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_activity_log ENABLE ROW LEVEL SECURITY;
