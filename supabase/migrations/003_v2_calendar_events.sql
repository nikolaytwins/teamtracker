-- 003 — Календарь v2 (ручные события work/personal, заготовка под Google sync).

CREATE TABLE IF NOT EXISTS v2_calendar_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES v2_workspaces (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('work', 'personal')),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  task_id TEXT REFERENCES v2_tasks (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_calendar_user_range ON v2_calendar_events (user_id, start_at, end_at);

CREATE TABLE IF NOT EXISTS v2_calendar_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  status TEXT NOT NULL DEFAULT 'disconnected',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_calendar_integrations_user_provider
  ON v2_calendar_integrations (user_id, provider);

ALTER TABLE v2_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_calendar_integrations ENABLE ROW LEVEL SECURITY;
